import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { generateInvoice } from "@/services/invoice.service";
import { sendPaymentConfirmation } from "@/services/email.service";
import { createAdminNotification } from "@/services/notification.service";
import { formatPrice } from "@/lib/utils";

/**
 * POST /api/payments/verify-session
 *
 * Vérifie directement auprès de Stripe qu'une Checkout Session est bien payée,
 * puis met à jour la base de données en conséquence.
 *
 * Utilisé comme FALLBACK lorsque le webhook Stripe ne reçoit pas l'événement
 * (STRIPE_WEBHOOK_SECRET manquant/invalide, réseau, etc.).
 * Appelé depuis <StepPaymentResult> dès que Stripe redirige vers la page succès.
 */
export async function POST(request: Request) {
  try {
    const { sessionId, reservationId } = await request.json();

    if (!sessionId || !reservationId) {
      return NextResponse.json(
        { error: "sessionId et reservationId requis" },
        { status: 400 }
      );
    }

    // ── 1. Vérification directe auprès de Stripe ────────────────────────────
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

    // Vérifier que la session correspond bien à cette réservation
    if (session.metadata?.reservationId !== reservationId) {
      return NextResponse.json(
        { error: "La session ne correspond pas à cette réservation" },
        { status: 403 }
      );
    }

    // La session n'est pas encore complète (paiement toujours en cours)
    if (session.status !== "complete" || session.payment_status !== "paid") {
      return NextResponse.json({
        status: "pending",
        message: "Paiement non encore confirmé par Stripe",
      });
    }

    // ── 2. Vérifier si déjà mis à jour (webhook a peut-être déjà fonctionné) ──
    const existingPayment = await prisma.payment.findUnique({
      where: { reservationId },
    });

    if (existingPayment?.status === "PAID") {
      // Déjà mis à jour, rien à faire
      return NextResponse.json({ status: "already_paid" });
    }

    const amount = (session.amount_total ?? 0) / 100;
    const paymentIntentId =
      typeof session.payment_intent === "string" ? session.payment_intent : null;

    // ── 3. Mise à jour du paiement → PAID ───────────────────────────────────
    await prisma.payment.update({
      where: { reservationId },
      data: {
        stripePaymentIntentId: paymentIntentId,
        status: "PAID",
        paidAt: new Date(),
        failureReason: null,
      },
    });

    // ── 4. Actions post-paiement ─────────────────────────────────────────────
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
    });

    if (reservation) {
      // Générer la facture si elle n'existe pas déjà
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

      // Email de confirmation de paiement (non-bloquant)
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

      // Notification admin (non-bloquante)
      createAdminNotification({
        type: "payment_received",
        title: "Paiement reçu — à confirmer",
        message: `${reservation.guestFirstName} ${reservation.guestLastName} — ${formatPrice(amount)} · En attente de confirmation`,
        link: `/admin/reservations/${reservationId}`,
      });
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
