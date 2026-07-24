import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { sendRefundConfirmation } from "@/services/email.service";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const { amount } = await request.json();
    const payment = await prisma.payment.findUnique({ where: { id: params.id }, include: { reservation: true } });
    if (!payment || !payment.stripePaymentIntentId) return NextResponse.json({ error: "Paiement introuvable" }, { status: 404 });
    if (payment.status !== "PAID") return NextResponse.json({ error: "Ce paiement ne peut pas être remboursé" }, { status: 400 });

    const refundAmount = amount ? Math.round(amount * 100) : undefined;
    const refund = await stripe.refunds.create({ payment_intent: payment.stripePaymentIntentId, ...(refundAmount && { amount: refundAmount }) });

    const isFullRefund = !refundAmount || refundAmount >= Math.round(payment.amount * 100);
    await prisma.payment.update({ where: { id: params.id }, data: { status: isFullRefund ? "REFUNDED" : "PARTIALLY_REFUNDED", refundedAmount: (refundAmount || Math.round(payment.amount * 100)) / 100, stripeRefundId: refund.id, refundedAt: new Date() } });

    await sendRefundConfirmation({ guestFirstName: payment.reservation.guestFirstName, guestEmail: payment.reservation.guestEmail, amount: (refundAmount || Math.round(payment.amount * 100)) / 100 });

    return NextResponse.json({ message: "Remboursement effectué" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur lors du remboursement" }, { status: 500 });
  }
}
