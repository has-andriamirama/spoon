import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { generateDepositInvoice } from "@/services/invoice.service";
import {
	sendPaymentConfirmation,
} from "@/services/email.service";
import { createAdminNotification } from "@/services/notification.service";
import { formatPrice } from "@/lib/utils";
import type Stripe from "stripe";

const TERMINAL_PAID_STATUSES = ["PAID", "REFUNDED", "PARTIALLY_REFUNDED"] as const;

export async function POST(request: Request) {
	const body = await request.text();
	const signature = request.headers.get("stripe-signature")!;

	let event: Stripe.Event;
	try {
		event = stripe.webhooks.constructEvent(
			body,
			signature,
			process.env.STRIPE_WEBHOOK_SECRET!
		);
	} catch (err) {
		console.error("[stripe/webhook] Signature invalide :", err);
		return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
	}

	try {
		if (event.type === "checkout.session.completed") {
			const session = event.data.object as Stripe.Checkout.Session;
			const { reservationId } = session.metadata ?? {};

			if (!reservationId) {
				console.error("[stripe/webhook] checkout.session.completed : reservationId manquant");
				return NextResponse.json({ received: true });
			}

			const existingPayment = await prisma.payment.findUnique({
				where: { reservationId },
				select: { status: true },
			});

			if (existingPayment?.status === "PAID") {
				console.log(`[stripe/webhook] checkout.session.completed ignoré — déjà PAID (${reservationId})`);
				return NextResponse.json({ received: true });
			}

			const paymentIntentId =
				typeof session.payment_intent === "string" ? session.payment_intent : null;
			const amount = (session.amount_total ?? 0) / 100;

			await prisma.payment.update({
				where: { reservationId },
				data: {
					stripePaymentIntentId: paymentIntentId,
					status: "PAID",
					paidAt: new Date(),
					failureReason: null,
				},
			});

			await prisma.reservation.update({
				where: { id: reservationId },
				data: { autoCancelDeadline: null },
			}).catch(() => {});

			const reservation = await prisma.reservation.findUnique({
				where: { id: reservationId },
			});

			if (reservation) {
				let invoiceNumber: string | undefined;
				try {
					const invoice = await generateDepositInvoice(reservationId);
					invoiceNumber = invoice.invoiceNumber;
				} catch (err) {
					console.error("[stripe/webhook] Erreur génération facture :", err);
				}

				if (invoiceNumber) {
					await sendPaymentConfirmation({
						guestFirstName: reservation.guestFirstName,
						guestEmail: reservation.guestEmail,
						amount,
						date: reservation.date,
						timeSlot: reservation.timeSlot,
						invoiceNumber,
					});
				}

				await createAdminNotification({
					type: "payment_received",
					title: "Paiement reçu — à confirmer",
					message: `${reservation.guestFirstName} ${reservation.guestLastName} — ${formatPrice(amount)} · En attente de votre confirmation`,
					link: `/admin/reservations?id=${reservationId}`,
				});
			}
		}

		if (event.type === "checkout.session.expired") {
			const session = event.data.object as Stripe.Checkout.Session;
			const { reservationId } = session.metadata ?? {};

			if (!reservationId) {
				return NextResponse.json({ received: true });
			}

			const currentPayment = await prisma.payment.findUnique({
				where: { reservationId },
				select: { status: true, stripePaymentIntentId: true },
			}).catch(() => null);

			if (!currentPayment) {
				return NextResponse.json({ received: true });
			}

			if ((TERMINAL_PAID_STATUSES as readonly string[]).includes(currentPayment.status)) {
				console.log(
					`[stripe/webhook] checkout.session.expired IGNORÉ — ` +
					`réservation ${reservationId} déjà en statut ${currentPayment.status} ` +
					`(session expirée : ${session.id})`
				);
				return NextResponse.json({ received: true });
			}

			if (
				currentPayment.stripePaymentIntentId &&
				currentPayment.stripePaymentIntentId !== session.id
			) {
				console.log(
					`[stripe/webhook] checkout.session.expired IGNORÉ — ` +
					`session périmée ${session.id} (actuelle : ${currentPayment.stripePaymentIntentId}) ` +
					`pour réservation ${reservationId}`
				);
				return NextResponse.json({ received: true });
			}

			await prisma.payment.update({
				where: { reservationId },
				data: {
					status: "FAILED",
					failureReason: "Session de paiement expirée",
				},
			}).catch(() => {});

			console.log(
				`[stripe/webhook] checkout.session.expired — ` +
				`paiement marqué FAILED pour réservation ${reservationId} (session : ${session.id})`
			);

			const reservation = await prisma.reservation.findUnique({
				where: { id: reservationId },
			}).catch(() => null);

			if (reservation) {
				await createAdminNotification({
					type: "payment_failed",
					title: "Paiement échoué — session expirée",
					message: `${reservation.guestFirstName} ${reservation.guestLastName} — Session expirée sans paiement`,
					link: `/admin/reservations?id=${reservationId}`,
				});
			}
		}

		if (event.type === "payment_intent.succeeded") {
			const paymentIntent = event.data.object as Stripe.PaymentIntent;
			const { reservationId } = paymentIntent.metadata;
			if (!reservationId) return NextResponse.json({ received: true });

			const existing = await prisma.payment.findFirst({
				where: { stripePaymentIntentId: paymentIntent.id },
				select: { status: true, reservationId: true },
			}).catch(() => null);

			if (existing?.status === "PAID") {
				console.log(`[stripe/webhook] payment_intent.succeeded ignoré — déjà PAID`);
				return NextResponse.json({ received: true });
			}

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
					failureReason: null,
				},
			}).catch(() => {});

			const reservation = await prisma.reservation.findUnique({
				where: { id: reservationId },
			});

			if (reservation) {
				let invoiceNumber: string | undefined;
				try {
					const invoice = await generateDepositInvoice(reservationId);
					invoiceNumber = invoice.invoiceNumber;
				} catch (err) {
					console.error("[stripe/webhook] Erreur génération facture (payment_intent.succeeded) :", err);
				}

				if (invoiceNumber) {
					await sendPaymentConfirmation({
						guestFirstName: reservation.guestFirstName,
						guestEmail: reservation.guestEmail,
						amount,
						date: reservation.date,
						timeSlot: reservation.timeSlot,
						invoiceNumber,
					});
				}

				await createAdminNotification({
					type: "payment_received",
					title: "Paiement reçu — à confirmer",
					message: `${reservation.guestFirstName} ${reservation.guestLastName} — ${formatPrice(amount)} · En attente de votre confirmation`,
					link: `/admin/reservations?id=${reservationId}`,
				});
			}
		}

		if (event.type === "payment_intent.payment_failed") {
			const paymentIntent = event.data.object as Stripe.PaymentIntent;

			const existingPayment = await prisma.payment.findFirst({
				where: { stripePaymentIntentId: paymentIntent.id },
				select: { status: true },
			}).catch(() => null);

			if (
				existingPayment &&
				(TERMINAL_PAID_STATUSES as readonly string[]).includes(existingPayment.status)
			) {
				console.log(
					`[stripe/webhook] payment_intent.payment_failed IGNORÉ — ` +
					`statut actuel : ${existingPayment.status} (intent : ${paymentIntent.id})`
				);
				return NextResponse.json({ received: true });
			}

			await prisma.payment.update({
				where: { stripePaymentIntentId: paymentIntent.id },
				data: {
					status: "FAILED",
					failureReason: paymentIntent.last_payment_error?.message ?? null,
				},
			}).catch(() => {});
		}

	} catch (error) {
		console.error("[stripe/webhook] Erreur de traitement :", error);
	}

	return NextResponse.json({ received: true });
}
