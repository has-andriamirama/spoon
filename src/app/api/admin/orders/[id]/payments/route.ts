import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/admin-auth";
import { roundMoney } from "@/lib/order-service";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await getAdminSession()) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { id } = await params;
  try {
    const body = await request.json();
    const amount = Number(body.amount);
    const method = String(body.method ?? "CARD");
    if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: "Montant de règlement invalide." }, { status: 400 });
    if (!["CASH", "CARD", "CHEQUE", "OTHER"].includes(method)) return NextResponse.json({ error: "Mode de règlement invalide." }, { status: 400 });

    const order = await prisma.order.findUnique({ where: { id }, include: { payments: true } });
    if (!order) return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
    if (["PAID", "CANCELLED"].includes(order.status)) return NextResponse.json({ error: "Cette commande ne peut plus être encaissée." }, { status: 409 });

    const paidAlready = order.payments.reduce((sum, p) => sum + p.amount, 0);
    const remaining = Math.max(0, roundMoney(order.totalAmount - order.depositApplied - paidAlready));
    if (amount > remaining + 0.001) return NextResponse.json({ error: `Le montant maximum à encaisser est de ${remaining.toFixed(2)} €.` }, { status: 409 });

    const result = await prisma.$transaction(async (tx) => {
      await tx.orderPayment.create({ data: { orderId: id, amount: roundMoney(amount), method: method as never, reference: body.reference ? String(body.reference).trim() : null, note: body.note ? String(body.note).trim() : null } });
      const payments = await tx.orderPayment.findMany({ where: { orderId: id } });
      const paidAmount = roundMoney(payments.reduce((sum, p) => sum + p.amount, 0));
      const dueAmount = roundMoney(Math.max(0, order.totalAmount - order.depositApplied - paidAmount));
      return tx.order.update({ where: { id }, data: { paidAmount, dueAmount, ...(dueAmount === 0 ? { status: "PAID", paidAt: new Date() } : {}) } });
    });
    return NextResponse.json({ data: result });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
