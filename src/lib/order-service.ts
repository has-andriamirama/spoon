import { prisma } from "@/lib/prisma";

export const ACTIVE_ORDER_STATUSES = ["OPEN", "SUBMITTED", "PREPARING", "READY", "SERVED"] as const;

export function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export async function calculateReservationDepositAvailable(reservationId: string, excludeOrderId?: string) {
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: { payment: true, orders: { where: { status: { not: "CANCELLED" } }, select: { id: true, depositApplied: true } } },
  });
  if (!reservation?.payment || reservation.payment.type !== "DEPOSIT" || reservation.payment.status !== "PAID") return 0;

  const alreadyApplied = reservation.orders
    .filter((order) => order.id !== excludeOrderId)
    .reduce((sum, order) => sum + order.depositApplied, 0);

  return Math.max(0, roundMoney(reservation.payment.amount - alreadyApplied));
}

export async function recalculateOrderTotals(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) throw new Error("Commande introuvable");

  const subtotal = roundMoney(order.items.reduce((sum, item) => sum + item.lineTotal, 0));
  const discountAmount = roundMoney(Math.min(Math.max(order.discountAmount, 0), subtotal));
  const totalAmount = roundMoney(Math.max(0, subtotal - discountAmount));
  const availableDeposit = order.reservationId
    ? await calculateReservationDepositAvailable(order.reservationId, order.id)
    : 0;
  const depositApplied = roundMoney(Math.min(totalAmount, availableDeposit + order.depositApplied));
  const dueAmount = roundMoney(Math.max(0, totalAmount - depositApplied));

  return prisma.order.update({
    where: { id: orderId },
    data: { subtotal, discountAmount, totalAmount, depositApplied, dueAmount },
  });
}
