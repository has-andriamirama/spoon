import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { checkSlotAvailability } from "@/services/availability.service";
import { createAdminNotification } from "@/services/notification.service";
import { createReservationSchema } from "@/lib/validations";
import { formatDate } from "@/lib/utils";
import { sendAdminCreatedPaymentLink } from "@/services/email.service";

const DEPOSIT_PER_COVER = 10;
const LINK_EXPIRY_HOURS = 24;

export async function POST(request: Request) {
	try {
		const body = await request.json();
		const parsed = createReservationSchema.safeParse(body);
		if (!parsed.success) {
			return NextResponse.json(
				{ error: "Données invalides", details: parsed.error.flatten() },
				{ status: 400 }
			);
		}

		const { date, timeSlot, covers } = parsed.data;

		const available = await checkSlotAvailability(date, timeSlot, covers);
		if (!available) {
			return NextResponse.json(
				{ error: "Ce créneau n'est plus disponible. Veuillez choisir un autre créneau." },
				{ status: 409 }
			);
		}

		const reservation = await prisma.reservation.create({
			data: {
				...parsed.data,
				date: new Date(date),
				userId: null,
				status: "PENDING",
				confirmedAt: null,
				autoCancelDeadline: new Date(Date.now() + LINK_EXPIRY_HOURS * 3600 * 1000),
			},
		});

		await createAdminNotification({
			type: "new_reservation",
			title: "Réservation admin — Lien de paiement envoyé",
			message: `${reservation.guestFirstName} ${reservation.guestLastName} — ${timeSlot} · ${covers} couvert${covers > 1 ? "s" : ""} · En attente de paiement`,
			link: `/admin/reservations/${reservation.id}`,
		});

		const depositAmount = covers * DEPOSIT_PER_COVER;
		const formattedDate = formatDate(date, "EEEE d MMMM yyyy");

		const checkoutSession = await stripe.checkout.sessions.create({
			payment_method_types: ["card"],
			mode: "payment",
			line_items: [
				{
					price_data: {
						currency: "eur",
						product_data: {
							name: "Acompte de réservation — Spoon",
							description: `${covers} couvert${covers > 1 ? "s" : ""} · ${formattedDate} à ${timeSlot} · Déduit de votre addition le jour de votre venue`,
						},
						unit_amount: DEPOSIT_PER_COVER * 100,
					},
					quantity: covers,
				},
			],
			metadata: {
				reservationId: reservation.id,
				guestEmail: reservation.guestEmail,
				covers: String(covers),
			},
			customer_email: reservation.guestEmail,
			success_url: `${process.env.NEXTAUTH_URL}/reservation?payment=success&id=${reservation.id}&session_id={CHECKOUT_SESSION_ID}`,
			cancel_url: `${process.env.NEXTAUTH_URL}/reservation?payment=canceled&id=${reservation.id}`,
			expires_at: Math.floor(Date.now() / 1000) + LINK_EXPIRY_HOURS * 3600, // 24h
		});

		await prisma.payment.create({
			data: {
				reservationId: reservation.id,
				stripePaymentIntentId: checkoutSession.id,
				amount: depositAmount,
				type: "DEPOSIT",
				status: "PENDING",
			},
		});

		sendAdminCreatedPaymentLink({
			guestFirstName: reservation.guestFirstName,
			guestEmail: reservation.guestEmail,
			date: reservation.date,
			timeSlot: reservation.timeSlot,
			covers: reservation.covers,
			amount: depositAmount,
			paymentUrl: checkoutSession.url!,
		}).catch((err) =>
			console.error("[create-with-link] Erreur envoi email :", err)
		);

		return NextResponse.json({
			url: checkoutSession.url,
			reservationId: reservation.id,
		});
	} catch (error) {
		console.error("[admin/create-with-link]", error);
		return NextResponse.json(
			{ error: "Erreur lors de la création de la réservation" },
			{ status: 500 }
		);
	}
}
