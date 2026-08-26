import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { sendCancellationEmail, sendReservationConfirmation } from "@/services/email.service";
import { broadcastReservationUpdate } from "@/services/notification.service";

export async function GET(
	request: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	const { id } = await params;
	try {
		const session = await getServerSession(authOptions);
		const userId = session?.user?.id;
		const reservation = await prisma.reservation.findFirst({
			where: { id, ...(userId ? { userId } : {}) },
			include: {
				payment: { include: { invoice: true } },
				serviceOrder: { include: { invoice: true } },
			},
		});
		if (!reservation) {
			return NextResponse.json({ error: "Réservation introuvable" }, { status: 404 });
		}
		return NextResponse.json({ data: reservation });
	} catch {
		return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
	}
}

export async function PATCH(
	request: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	const { id } = await params;
	try {
		const body = await request.json();
		const { status, cancellationReason, notes } = body;

		const reservation = await prisma.reservation.findUnique({
			where: { id },
			include: { payment: true },
		});
		if (!reservation) {
			return NextResponse.json({ error: "Réservation introuvable" }, { status: 404 });
		}

		const updateData: Record<string, unknown> = {};

		if (status) {
			updateData.status = status;

			if (status === "CONFIRMED") {
				updateData.confirmedAt = new Date();
				updateData.autoCancelDeadline = null;

				sendReservationConfirmation({
					id: reservation.id,
					guestFirstName: reservation.guestFirstName,
					guestLastName: reservation.guestLastName,
					guestEmail: reservation.guestEmail,
					date: reservation.date,
					timeSlot: reservation.timeSlot,
					covers: reservation.covers,
					notes: reservation.notes,
				});
			}

			if (["CANCELLED_BY_CUSTOMER", "CANCELLED_BY_ADMIN"].includes(status)) {
				updateData.cancelledAt = new Date();
				updateData.cancellationReason = cancellationReason || null;

				const payment = reservation.payment;

				if (payment?.status === "PAID" && payment.stripePaymentIntentId) {
					const settings = await prisma.restaurantSettings.findFirst();
					const freeCancelHours = settings?.freeCancellationHours ?? 24; // 24h

					const reservationDate = new Date(reservation.date);
					const refundDeadline = new Date(
						reservationDate.getTime() - freeCancelHours * 60 * 60 * 1000
					);
					const isEligible = new Date() < refundDeadline;

					if (isEligible) {
						try {
							const refund = await stripe.refunds.create({
								payment_intent: payment.stripePaymentIntentId,
							});
							await prisma.payment.update({
								where: { reservationId: id },
								data: {
									status: "REFUNDED",
									refundedAmount: payment.amount,
									stripeRefundId: refund.id,
									refundedAt: new Date(),
								},
							});
						} catch (refundErr) {
							console.error("[Refund] Erreur Stripe:", refundErr);
						}
					}
				}

				sendCancellationEmail({
					guestFirstName: reservation.guestFirstName,
					guestEmail: reservation.guestEmail,
					date: reservation.date,
					timeSlot: reservation.timeSlot,
					cancellationReason,
				});
			}

			if (status === "COMPLETED") updateData.completedAt = new Date();
		}

		if (notes !== undefined) updateData.notes = notes;

		const updated = await prisma.reservation.update({ where: { id }, data: updateData });

		await broadcastReservationUpdate(id, updated.userId);

		return NextResponse.json({ data: updated });
	} catch (error) {
		console.error(error);
		return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
	}
}

export async function DELETE(
	request: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	const { id } = await params;
	try {
		await prisma.reservation.delete({ where: { id } });
		return NextResponse.json({ message: "Réservation supprimée" });
	} catch {
		return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
	}
}
