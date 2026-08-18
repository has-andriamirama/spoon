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
      include: { payment: true, invoice: true },
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

      // ── Confirmation par l'admin ───────────────────────────────────────────
      if (status === "CONFIRMED") {
        updateData.confirmedAt = new Date();
        updateData.autoConfirmDeadline = null;

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

      // ── Annulation volontaire (client ou admin) ────────────────────────────
      // C'est ici que le remboursement est traité — uniquement pour les
      // annulations dans la fenêtre de 24 h avant la date de réservation.
      // L'auto-annulation (cron) n'entre jamais dans ce bloc.
      if (["CANCELLED_BY_CUSTOMER", "CANCELLED_BY_ADMIN"].includes(status)) {
        updateData.cancelledAt = new Date();
        updateData.cancellationReason = cancellationReason || null;

        const payment = reservation.payment;

        if (payment?.status === "PAID" && payment.stripePaymentIntentId) {
          // Fenêtre de remboursement = freeCancellationHours (défaut 24 h)
          const settings = await prisma.restaurantSettings.findFirst();
          const freeCancelHours = settings?.freeCancellationHours ?? 24; // ← 24h

          const reservationDate = new Date(reservation.date);
          // Deadline = date de réservation − freeCancelHours
          // Si on est encore avant cette deadline → remboursement éligible
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
              // L'annulation continue même si le remboursement Stripe échoue
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

    const updated = await prisma.$transaction(async (tx) => {
      const updatedReservation = await tx.reservation.update({ where: { id }, data: updateData });
      if (["NO_SHOW", "CANCELLED_BY_CUSTOMER", "CANCELLED_BY_ADMIN", "COMPLETED"].includes(String(status))) {
        await tx.reservationTable.updateMany({ where: { reservationId: id, releasedAt: null }, data: { releasedAt: new Date() } });
      }
      return updatedReservation;
    });

    // Diffusion temps réel vers admin + client
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
