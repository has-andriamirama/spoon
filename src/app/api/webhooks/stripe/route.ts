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
		// ─── Checkout Session complété (paiement via Stripe Checkout) ────────────
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

			// Mise à jour du paiement (on passe du cs_xxx vers le pi_xxx réel)
			await prisma.payment.update({
				where: { reservationId },
				data: {
					stripePaymentIntentId: paymentIntentId,
					status: "PAID",
					paidAt: new Date(),
				},
			});

			// Confirmation de la réservation
			await prisma.reservation.update({
				where: { id: reservationId },
				data: { status: "CONFIRMED", confirmedAt: new Date() },
			});

			const reservation = await prisma.reservation.findUnique({
				where: { id: reservationId },
			});

			if (reservation) {
				// Email de confirmation de réservation
				await sendReservationConfirmation({
					id: reservation.id,
					guestFirstName: reservation.guestFirstName,
					guestLastName: reservation.guestLastName,
					guestEmail: reservation.guestEmail,
					date: reservation.date,
					timeSlot: reservation.timeSlot,
					covers: reservation.covers,
					notes: reservation.notes,
				});

				// Email de confirmation de paiement + facture
				const invoice = await generateInvoice(reservationId);
				await sendPaymentConfirmation({
					guestFirstName: reservation.guestFirstName,
					guestEmail: reservation.guestEmail,
					amount,
					date: reservation.date,
					timeSlot: reservation.timeSlot,
					invoiceNumber: invoice.invoiceNumber,
				});

				// Notification admin
				await createAdminNotification({
					type: "payment_received",
					title: "Paiement reçu",
					message: `${reservation.guestFirstName} ${reservation.guestLastName} — ${formatPrice(amount)}`,
					link: `/admin/reservations/${reservationId}`,
				});
			}
		}

		// ─── Session expirée (le client n'a pas finalisé dans les 30 min) ────────
		if (event.type === "checkout.session.expired") {
			const session = event.data.object as Stripe.Checkout.Session;
			const { reservationId } = session.metadata ?? {};
			if (reservationId) {
				// Annulation de la réservation et du paiement
				await prisma.reservation.update({
					where: { id: reservationId },
					data: { status: "CANCELLED" },
				}).catch(() => {}); // Ignore si la réservation n'existe plus

				await prisma.payment.update({
					where: { reservationId },
					data: { status: "FAILED", failureReason: "Session de paiement expirée" },
				}).catch(() => {});
			}
		}

		// ─── Payment Intent réussi (fallback pour intégrations directes) ─────────
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

			await prisma.reservation.update({
				where: { id: reservationId },
				data: { status: "CONFIRMED", confirmedAt: new Date() },
			}).catch(() => {});

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
					title: "Paiement reçu",
					message: `${reservation.guestFirstName} ${reservation.guestLastName} — ${formatPrice(amount)}`,
					link: `/admin/reservations/${reservationId}`,
				});
			}
		}

		// ─── Payment Intent échoué ────────────────────────────────────────────────
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
