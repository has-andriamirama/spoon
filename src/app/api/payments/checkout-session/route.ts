import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkSlotAvailability } from "@/services/availability.service";
import { createAdminNotification } from "@/services/notification.service";
import { createReservationSchema } from "@/lib/validations";
import { formatDate } from "@/lib/utils";

const DEPOSIT_PER_COVER = 10; // 10 € par personne

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

		// Vérification disponibilité
		const available = await checkSlotAvailability(date, timeSlot, covers);
		if (!available) {
			return NextResponse.json(
				{ error: "Ce créneau n'est plus disponible. Veuillez choisir un autre créneau." },
				{ status: 409 }
			);
		}

		const session = await getServerSession(authOptions);

		// Création de la réservation en statut PENDING (pas encore d'email de confirmation)
		const reservation = await prisma.reservation.create({
			data: {
				...parsed.data,
				date: new Date(date),
				userId: session?.user?.id || null,
				status: "PENDING",
				confirmedAt: null,
			},
		});

		// Notification admin
		await createAdminNotification({
			type: "new_reservation",
			title: "Nouvelle réservation (paiement en cours)",
			message: `${reservation.guestFirstName} ${reservation.guestLastName} — ${timeSlot} (${covers} couvert${covers > 1 ? "s" : ""})`,
			link: `/admin/reservations/${reservation.id}`,
		});

		// Création de la session Stripe Checkout
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
						unit_amount: DEPOSIT_PER_COVER * 100, // en centimes
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
			expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // 30 minutes
		});

		// Sauvegarde du paiement en attente (ID session Stripe temporaire, mis à jour par le webhook)
		await prisma.payment.create({
			data: {
				reservationId: reservation.id,
				stripePaymentIntentId: checkoutSession.id,
				amount: depositAmount,
				type: "DEPOSIT",
				status: "PENDING",
			},
		});

		return NextResponse.json({
			url: checkoutSession.url,
			reservationId: reservation.id,
		});
	} catch (error) {
		console.error("Checkout session error:", error);
		return NextResponse.json(
			{ error: "Erreur lors de la création du paiement" },
			{ status: 500 }
		);
	}
}
