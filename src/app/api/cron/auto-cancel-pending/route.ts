import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendCancellationEmail } from "@/services/email.service";
import { broadcastReservationUpdate } from "@/services/notification.service";

export async function GET() {
	try {
		const now = new Date();

		const expired = await prisma.reservation.findMany({
			where: {
				status: "PENDING",
				autoConfirmDeadline: { lt: now, not: null },
			},
			select: {
				id: true,
				userId: true,
				guestFirstName: true,
				guestEmail: true,
				date: true,
				timeSlot: true,
			},
		});

		if (expired.length === 0) {
			return NextResponse.json({ success: true, cancelled: 0 });
		}

		const reason = "Annulation automatique : réservation non confirmée dans les délais impartis.";

		for (const reservation of expired) {
			await prisma.reservation.update({
				where: { id: reservation.id },
				data: {
					status: "CANCELLED_BY_ADMIN",
					cancelledAt: now,
					cancellationReason: reason,
					autoConfirmDeadline: null,
				},
			});

			sendCancellationEmail({
				guestFirstName: reservation.guestFirstName,
				guestEmail: reservation.guestEmail,
				date: reservation.date,
				timeSlot: reservation.timeSlot,
				cancellationReason: reason,
			});

			broadcastReservationUpdate(reservation.id, reservation.userId);
		}

		return NextResponse.json({ success: true, cancelled: expired.length });
	} catch (error) {
		console.error("[cron auto-cancel-pending]", error);
		return NextResponse.json({ error: "Erreur cron" }, { status: 500 });
	}
}
