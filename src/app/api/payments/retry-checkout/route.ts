import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { formatDate } from "@/lib/utils";

const AUTO_CONFIRM_HOURS = 24;

export async function POST(request: Request) {
	try {
		const session = await getServerSession(authOptions);
		if (!session?.user?.id) {
			return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
		}

		const { reservationId } = await request.json();
		if (!reservationId) {
			return NextResponse.json({ error: "reservationId manquant" }, { status: 400 });
		}

		const reservation = await prisma.reservation.findFirst({
			where: { id: reservationId, userId: session.user.id },
			include: { payment: true },
		});

		if (!reservation) {
			return NextResponse.json({ error: "Réservation introuvable" }, { status: 404 });
		}

		if (!reservation.payment) {
			return NextResponse.json({ error: "Aucun paiement associé" }, { status: 400 });
		}

		if (!["FAILED", "PENDING"].includes(reservation.payment.status)) {
			return NextResponse.json(
				{ error: "Le paiement de cette réservation ne peut pas être relancé" },
				{ status: 400 }
			);
		}

		if (["CANCELLED_BY_CUSTOMER", "CANCELLED_BY_ADMIN"].includes(reservation.status)) {
			return NextResponse.json({ error: "Cette réservation est annulée" }, { status: 400 });
		}

		const depositAmount = reservation.payment.amount;

		const formattedDate = formatDate(reservation.date, "EEEE d MMMM yyyy");

		const checkoutSession = await stripe.checkout.sessions.create({
			payment_method_types: ["card"],
			mode: "payment",
			line_items: [
				{
					price_data: {
						currency: "eur",
						product_data: {
							name: "Acompte de réservation — Spoon",
							description: `${reservation.covers} couvert${reservation.covers > 1 ? "s" : ""} · ${formattedDate} à ${reservation.timeSlot} · Déduit de votre addition`,
						},
						unit_amount: Math.round(depositAmount * 100),
					},
					quantity: 1,
				},
			],
			metadata: { reservationId: reservation.id, guestEmail: reservation.guestEmail },
			customer_email: reservation.guestEmail,
			success_url: `${process.env.NEXTAUTH_URL}/reservation?payment=success&id=${reservation.id}&session_id={CHECKOUT_SESSION_ID}`,
			cancel_url: `${process.env.NEXTAUTH_URL}/account/reservations/${reservation.id}`,
			expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
		});

		await prisma.payment.update({
			where: { reservationId: reservation.id },
			data: {
				stripePaymentIntentId: checkoutSession.id,
				status: "PENDING",
				failureReason: null,
			},
		});

		await prisma.reservation.update({
			where: { id: reservation.id },
			data: {
				autoConfirmDeadline: new Date(Date.now() + AUTO_CONFIRM_HOURS * 60 * 60 * 1000),
			},
		});

		return NextResponse.json({ url: checkoutSession.url });
	} catch (error) {
		console.error("[retry-checkout]", error);
		return NextResponse.json(
			{ error: "Erreur lors de la relance du paiement" },
			{ status: 500 }
		);
	}
}
