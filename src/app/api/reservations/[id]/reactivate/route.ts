import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { broadcastReservationUpdate } from "@/services/notification.service";
import { formatDate } from "@/lib/utils";

const AUTO_CONFIRM_HOURS = 24;

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

    // Seules les réservations annulées peuvent être réactivées
    if (!["CANCELLED_BY_CUSTOMER", "CANCELLED_BY_ADMIN"].includes(reservation.status)) {
      return NextResponse.json(
        { error: "Seule une réservation annulée peut être réactivée" },
        { status: 400 }
      );
    }

    // La date doit être dans le futur
    if (new Date(reservation.date) <= new Date()) {
      return NextResponse.json(
        { error: "La date de réservation est déjà passée" },
        { status: 400 }
      );
    }

    const newDeadline = new Date(Date.now() + AUTO_CONFIRM_HOURS * 60 * 60 * 1000);

    // ── Cas 1 : paiement déjà PAID et non remboursé → réactiver sans nouveau paiement ──
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

    // ── Cas 2 : paiement absent, remboursé, échoué ou en attente → nouveau paiement ──
    const settings = await prisma.restaurantSettings.findFirst();
    const depositPerCover = settings?.depositAmountPerCover ?? 20;
    const depositAmount = reservation.covers * depositPerCover;
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
            unit_amount: Math.round(depositPerCover * 100),
          },
          quantity: reservation.covers,
        },
      ],
      metadata: { reservationId: id, guestEmail: reservation.guestEmail },
      customer_email: reservation.guestEmail,
      success_url: `${process.env.NEXTAUTH_URL}/reservation?payment=success&id=${id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXTAUTH_URL}/account/reservations/${id}`,
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    });

    // Reset réservation → PENDING + nouveau délai
    await prisma.reservation.update({
      where: { id },
      data: {
        status: "PENDING",
        cancelledAt: null,
        cancellationReason: null,
        autoConfirmDeadline: newDeadline,
      },
    });

    // Reset/créer le paiement
    if (reservation.payment) {
      await prisma.payment.update({
        where: { reservationId: id },
        data: {
          stripePaymentIntentId: checkoutSession.id,
          status: "PENDING",
          amount: depositAmount,
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
