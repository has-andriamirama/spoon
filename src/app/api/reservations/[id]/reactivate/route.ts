import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { broadcastReservationUpdate } from "@/services/notification.service";
import { formatDate } from "@/lib/utils";

const AUTO_CONFIRM_HOURS = 24;

const DEPOSIT_PER_COVER = 10;

export async function POST(
	request: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	const { id } = await params;
	try {
		const session = await getServerSession(authOptions);
		if (!session?.user?.id) {
			return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
		}

		const reservation = await prisma.reservation.findFirst({
			where: { id, userId: session.user.id },
			include: { payment: true },
		});

		if (!reservation) {
			return NextResponse.json({ error: "Réservation introuvable" }, { status: 404 });
		}

		if (!["CANCELLED_BY_CUSTOMER", "CANCELLED_BY_ADMIN"].includes(reservation.status)) {
			return NextResponse.json(
				{ error: "Seule une réservation annulée peut être réactivée" },
				{ status: 400 }
			);
		}

		if (new Date(reservation.date) <= new Date()) {
			return NextResponse.json(
				{ error: "La date de réservation est déjà passée" },
				{ status: 400 }
			);
		}

		const newDeadline = new Date(Date.now() + AUTO_CONFIRM_HOURS * 60 * 60 * 1000);

		if (reservation.payment?.status === "PAID") {
			await prisma.reservation.update({
				where: { id },
				data: {
					status: "PENDING",
					cancelledAt: null,
					cancellationReason: null,
					autoConfirmDeadline: newDeadline,
				},
			});
			await broadcastReservationUpdate(id, reservation.userId);
			return NextResponse.json({ status: "reactivated", url: null });
		}

		const depositAmount =
			reservation.payment?.amount ?? reservation.covers * DEPOSIT_PER_COVER;

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
			metadata: { reservationId: id, guestEmail: reservation.guestEmail },
			customer_email: reservation.guestEmail,
			success_url: `${process.env.NEXTAUTH_URL}/account/reservations/${id}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
			cancel_url: `${process.env.NEXTAUTH_URL}/account/reservations/${id}?payment=canceled`,
			expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
		});

		await prisma.reservation.update({
			where: { id },
			data: {
				status: "PENDING",
				cancelledAt: null,
				cancellationReason: null,
				autoConfirmDeadline: newDeadline,
			},
		});

		if (reservation.payment) {
			await prisma.payment.update({
				where: { reservationId: id },
				data: {
					stripePaymentIntentId: checkoutSession.id,
					status: "PENDING",
					failureReason: null,
					paidAt: null,
					refundedAt: null,
					refundedAmount: null,
					stripeRefundId: null,
					stripeChargeId: null,
				},
			});
		} else {
			await prisma.payment.create({
				data: {
					reservationId: id,
					stripePaymentIntentId: checkoutSession.id,
					amount: depositAmount,
					type: "DEPOSIT",
					status: "PENDING",
				},
			});
		}

		await broadcastReservationUpdate(id, reservation.userId);

		return NextResponse.json({ status: "reactivated", url: checkoutSession.url });
	} catch (error) {
		console.error("[reactivate]", error);
		return NextResponse.json({ error: "Erreur lors de la réactivation" }, { status: 500 });
	}
}
