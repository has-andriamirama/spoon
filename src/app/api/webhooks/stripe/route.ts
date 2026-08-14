import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { generateInvoice } from "@/services/invoice.service";
import {
	sendPaymentConfirmation,
	sendReservationConfirmation,
} from "@/services/email.service";
import { createAdminNotification } from "@/services/notification.service";
import { formatPrice } from "@/lib/utils";
import type Stripe from "stripe";

export async function POST(request: Request) {
	const body = await request.text();
	const signature = request.headers.get("stripe-signature")!;

	let event;
	try {
		event = stripe.webhooks.constructEvent(
			body,
			signature,
			process.env.STRIPE_WEBHOOK_SECRET!
		);
	} catch (err) {
		console.error("Webhook signature verification failed:", err);
		return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
	}

	try {
		// ── Paiement par Checkout Session réussi ─────────────────────────────────
		if (event.type === "checkout.session.completed") {
			const session = event.data.object as Stripe.Checkout.Session;
			const { reservationId } = session.metadata ?? {};
			if (!reservationId) {
				console.error("checkout.session.completed: reservationId manquant dans metadata");
				return NextResponse.json({ received: true });
			}

			const paymentIntentId =
				typeof session.payment_intent === "string" ? session.payment_intent : null;
			const amount = (session.amount_total ?? 0) / 100;

			// Mise à jour du paiement → PAID
			await prisma.payment.update({
				where: { reservationId },
				data: {
					stripePaymentIntentId: paymentIntentId,
					status: "PAID",
					paidAt: new Date(),
				},
			});

			// ⚠️ La réservation reste en PENDING : c'est l'admin qui confirme manuellement
			// (pas d'update de reservation.status ici)

			const reservation = await prisma.reservation.findUnique({
				where: { id: reservationId },
			});

			if (reservation) {
				// Génération de la facture dès réception du paiement
				const invoice = await generateInvoice(reservationId);

				// Email de confirmation de paiement au client
				await sendPaymentConfirmation({
					guestFirstName: reservation.guestFirstName,
					guestEmail: reservation.guestEmail,
					amount,
					date: reservation.date,
					timeSlot: reservation.timeSlot,
					invoiceNumber: invoice.invoiceNumber,
				});

				// Notification admin : paiement reçu, en attente de confirmation
				await createAdminNotification({
					type: "payment_received",
					title: "Paiement reçu — à confirmer",
					message: `${reservation.guestFirstName} ${reservation.guestLastName} — ${formatPrice(amount)} · En attente de votre confirmation`,
					link: `/admin/reservations/${reservationId}`,
				});
			}
		}

		// ── Session Checkout expirée sans paiement ────────────────────────────────
		if (event.type === "checkout.session.expired") {
			const session = event.data.object as Stripe.Checkout.Session;
			const { reservationId } = session.metadata ?? {};
			if (reservationId) {
				// La réservation reste en PENDING : le client peut relancer le paiement
				// On marque uniquement le paiement comme échoué
				await prisma.payment.update({
					where: { reservationId },
					data: {
						status: "FAILED",
						failureReason: "Session de paiement expirée",
					},
				}).catch(() => {});

				// Notification admin
				const reservation = await prisma.reservation.findUnique({
					where: { id: reservationId },
				}).catch(() => null);

				if (reservation) {
					await createAdminNotification({
						type: "payment_failed",
						title: "Paiement échoué",
						message: `${reservation.guestFirstName} ${reservation.guestLastName} — Session expirée`,
						link: `/admin/reservations/${reservationId}`,
					});
				}
			}
		}

		// ── Paiement par PaymentIntent réussi ────────────────────────────────────
		if (event.type === "payment_intent.succeeded") {
			const paymentIntent = event.data.object as Stripe.PaymentIntent;
			const { reservationId } = paymentIntent.metadata;
			if (!reservationId) return NextResponse.json({ received: true });

			const amount = paymentIntent.amount / 100;

			await prisma.payment.update({
				where: { stripePaymentIntentId: paymentIntent.id },
				data: {
					status: "PAID",
					stripeChargeId:
						typeof paymentIntent.latest_charge === "string"
							? paymentIntent.latest_charge
							: null,
					paidAt: new Date(),
				},
			}).catch(() => {});

			// ⚠️ Pas d'auto-confirmation : la réservation reste en PENDING
			// c'est l'admin qui confirme manuellement

			const reservation = await prisma.reservation.findUnique({
				where: { id: reservationId },
			});
			if (reservation) {
				const invoice = await generateInvoice(reservationId);
				await sendPaymentConfirmation({
					guestFirstName: reservation.guestFirstName,
					guestEmail: reservation.guestEmail,
					amount,
					date: reservation.date,
					timeSlot: reservation.timeSlot,
					invoiceNumber: invoice.invoiceNumber,
				});
				await createAdminNotification({
					type: "payment_received",
					title: "Paiement reçu — à confirmer",
					message: `${reservation.guestFirstName} ${reservation.guestLastName} — ${formatPrice(amount)} · En attente de votre confirmation`,
					link: `/admin/reservations/${reservationId}`,
				});
			}
		}

		// ── Échec de paiement (PaymentIntent) ────────────────────────────────────
		if (event.type === "payment_intent.payment_failed") {
			const paymentIntent = event.data.object as Stripe.PaymentIntent;
			await prisma.payment.update({
				where: { stripePaymentIntentId: paymentIntent.id },
				data: {
					status: "FAILED",
					failureReason: paymentIntent.last_payment_error?.message ?? null,
				},
			}).catch(() => {});
		}
	} catch (error) {
		console.error("Webhook processing error:", error);
	}

	return NextResponse.json({ received: true });
}
