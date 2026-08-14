import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { formatDate } from "@/lib/utils";

const DEPOSIT_PER_COVER = 10; // 10 € par personne (doit correspondre à checkout-session/route.ts)

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

		// Vérifier que la réservation appartient bien à l'utilisateur connecté
		const reservation = await prisma.reservation.findFirst({
			where: { id: reservationId, userId: session.user.id },
			include: { payment: true },
		});

		if (!reservation) {
			return NextResponse.json({ error: "Réservation introuvable" }, { status: 404 });
		}

		// Le paiement doit exister et être en statut FAILED
		if (!reservation.payment) {
			return NextResponse.json({ error: "Aucun paiement associé à cette réservation" }, { status: 400 });
		}
		if (reservation.payment.status !== "FAILED") {
			return NextResponse.json({ error: "Le paiement de cette réservation n'est pas en échec" }, { status: 400 });
		}

		// La réservation ne doit pas être annulée
		if (["CANCELLED_BY_CUSTOMER", "CANCELLED_BY_ADMIN"].includes(reservation.status)) {
			return NextResponse.json({ error: "Cette réservation est annulée" }, { status: 400 });
		}

		// Calcul du montant (identique à la session initiale)
		const depositAmount = reservation.covers * DEPOSIT_PER_COVER;
		const formattedDate = formatDate(reservation.date, "EEEE d MMMM yyyy");

		// Création d'une nouvelle Stripe Checkout Session
		const checkoutSession = await stripe.checkout.sessions.create({
			payment_method_types: ["card"],
			mode: "payment",
			line_items: [
				{
					price_data: {
						currency: "eur",
						product_data: {
							name: "Acompte de réservation — Spoon",
							description: `${reservation.covers} couvert${reservation.covers > 1 ? "s" : ""} · ${formattedDate} à ${reservation.timeSlot} · Déduit de votre addition le jour de votre venue`,
						},
						unit_amount: DEPOSIT_PER_COVER * 100, // en centimes
					},
					quantity: reservation.covers,
				},
			],
			metadata: {
				reservationId: reservation.id,
				guestEmail: reservation.guestEmail,
				covers: String(reservation.covers),
			},
			customer_email: reservation.guestEmail,
			success_url: `${process.env.NEXTAUTH_URL}/reservation?payment=success&id=${reservation.id}&session_id={CHECKOUT_SESSION_ID}`,
			cancel_url: `${process.env.NEXTAUTH_URL}/account/reservations/${reservation.id}`,
			expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // 30 minutes
		});

		// Mise à jour du paiement : nouveau session ID, retour en PENDING
		await prisma.payment.update({
			where: { reservationId: reservation.id },
			data: {
				stripePaymentIntentId: checkoutSession.id,
				status: "PENDING",
				failureReason: null,
				amount: depositAmount,
			},
		});

		return NextResponse.json({ url: checkoutSession.url });
	} catch (error) {
		console.error("Retry checkout error:", error);
		return NextResponse.json({ error: "Erreur lors de la relance du paiement" }, { status: 500 });
	}
}
