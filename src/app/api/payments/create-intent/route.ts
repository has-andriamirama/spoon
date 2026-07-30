import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export async function POST(request: Request) {
	try {
		const { reservationId } = await request.json();
		const reservation = await prisma.reservation.findUnique({ where: { id: reservationId } });
		if (!reservation) return NextResponse.json({ error: "Réservation introuvable" }, { status: 404 });

		const settings = await prisma.restaurantSettings.findFirst();
		const amountPerCover = settings?.depositAmountPerCover || 20;
		const amount = Math.round(reservation.covers * amountPerCover * 100); // Stripe uses cents

		const paymentIntent = await stripe.paymentIntents.create({
			amount,
			currency: "eur",
			metadata: { reservationId, guestEmail: reservation.guestEmail, covers: String(reservation.covers) },
			description: `Acompte réservation Spoon — ${reservation.guestFirstName} ${reservation.guestLastName}`,
		});

		// Save pending payment
		await prisma.payment.upsert({
			where: { reservationId },
			create: { reservationId, stripePaymentIntentId: paymentIntent.id, amount: amount / 100, type: "DEPOSIT", status: "PENDING" },
			update: { stripePaymentIntentId: paymentIntent.id, amount: amount / 100, status: "PENDING" },
		});

		return NextResponse.json({ clientSecret: paymentIntent.client_secret, amount: amount / 100 });
	} catch (error) {
		console.error(error);
		return NextResponse.json({ error: "Erreur lors de la création du paiement" }, { status: 500 });
	}
}
