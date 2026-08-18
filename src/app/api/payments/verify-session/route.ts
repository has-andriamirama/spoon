import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { generateInvoice } from "@/services/invoice.service";
import { sendPaymentConfirmation } from "@/services/email.service";
import { createAdminNotification, broadcastReservationUpdate } from "@/services/notification.service";
import { formatPrice } from "@/lib/utils";

export async function POST(request: Request) {
	try {
		const { sessionId, reservationId } = await request.json();

		if (!sessionId || !reservationId) {
			return NextResponse.json(
				{ error: "sessionId et reservationId requis" },
				{ status: 400 }
			);
		}

		let session;
		try {
			session = await stripe.checkout.sessions.retrieve(sessionId);
		} catch (err) {
			console.error("[verify-session] Impossible de récupérer la session Stripe:", err);
			return NextResponse.json(
				{ error: "Session Stripe introuvable" },
				{ status: 404 }
			);
		}

		if (session.metadata?.reservationId !== reservationId) {
			return NextResponse.json(
				{ error: "La session ne correspond pas à cette réservation" },
				{ status: 403 }
			);
		}

		if (session.status !== "complete" || session.payment_status !== "paid") {
			return NextResponse.json({
				status: "pending",
				message: "Paiement non encore confirmé par Stripe",
			});
		}

		const existingPayment = await prisma.payment.findUnique({
			where: { reservationId },
		});

		if (existingPayment?.status === "PAID") {
			return NextResponse.json({ status: "already_paid" });
		}

		const amount = (session.amount_total ?? 0) / 100;
		const paymentIntentId =
			typeof session.payment_intent === "string" ? session.payment_intent : null;

		await prisma.payment.update({
			where: { reservationId },
			data: {
				stripePaymentIntentId: paymentIntentId,
				status: "PAID",
				paidAt: new Date(),
				failureReason: null,
			},
		});

		const reservation = await prisma.reservation.findUnique({
			where: { id: reservationId },
		});

		if (reservation) {
			const existingInvoice = await prisma.invoice.findUnique({
				where: { reservationId },
			});

			let invoiceNumber = existingInvoice?.invoiceNumber;
			if (!existingInvoice) {
				try {
					const invoice = await generateInvoice(reservationId);
					invoiceNumber = invoice.invoiceNumber;
				} catch (err) {
					console.error("[verify-session] Erreur génération facture:", err);
				}
			}

			if (invoiceNumber) {
				sendPaymentConfirmation({
					guestFirstName: reservation.guestFirstName,
					guestEmail: reservation.guestEmail,
					amount,
					date: reservation.date,
					timeSlot: reservation.timeSlot,
					invoiceNumber,
				});
			}

			createAdminNotification({
				type: "payment_received",
				title: "Paiement reçu — à confirmer",
				message: `${reservation.guestFirstName} ${reservation.guestLastName} — ${formatPrice(amount)} · En attente de confirmation`,
				link: `/admin/reservations/${reservationId}`,
			});

			broadcastReservationUpdate(reservationId, reservation.userId);
		}

		return NextResponse.json({ status: "verified", amount });
	} catch (error) {
		console.error("[verify-session] Erreur:", error);
		return NextResponse.json(
			{ error: "Erreur interne lors de la vérification" },
			{ status: 500 }
		);
	}
}
