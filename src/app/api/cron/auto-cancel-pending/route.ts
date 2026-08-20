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
        OR: [
          { payment: { is: null } },
          {
            payment: {
              is: {
                status: { in: ["PENDING", "FAILED", "NONE"] },
              },
            },
          },
        ],
      },
      include: {
        payment: {
          select: {
            status: true,
            stripeCheckoutSessionId: true,
          },
        },
      },
    });

    if (expired.length === 0) {
      return NextResponse.json({ success: true, cancelled: 0 });
    }

    const reason =
      "Annulation automatique : l'acompte n'a pas été réglé dans le délai de 24 heures.";

    for (const reservation of expired) {
      await prisma.$transaction(async (tx) => {
        await tx.reservation.update({
          where: { id: reservation.id },
          data: {
            status: "CANCELLED_BY_ADMIN",
            cancelledAt: now,
            cancellationReason: reason,
            autoConfirmDeadline: null,
          },
        });

        if (reservation.payment && reservation.payment.status !== "FAILED") {
          await tx.payment.update({
            where: { reservationId: reservation.id },
            data: {
              status: "FAILED",
              failureReason: reason,
            },
          });
        }
      });

      sendCancellationEmail({
        guestFirstName: reservation.guestFirstName,
        guestEmail: reservation.guestEmail,
        date: reservation.date,
        timeSlot: reservation.timeSlot,
        cancellationReason: reason,
      });

      await broadcastReservationUpdate(reservation.id, reservation.userId);
    }

    return NextResponse.json({ success: true, cancelled: expired.length });
  } catch (error) {
    console.error("[cron auto-cancel-pending]", error);
    return NextResponse.json({ error: "Erreur cron" }, { status: 500 });
  }
}
