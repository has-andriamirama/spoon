import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/admin-auth";
import { ACTIVE_ORDER_STATUSES, roundMoney } from "@/lib/order-service";

async function getDepositAvailable(reservationId: string, excludeOrderId?: string) {
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: { payment: true, orders: { where: { status: { not: "CANCELLED" } }, select: { id: true, depositApplied: true } } },
  });
  if (!reservation?.payment || reservation.payment.type !== "DEPOSIT" || reservation.payment.status !== "PAID") return 0;
  const used = reservation.orders.filter((x) => x.id !== excludeOrderId).reduce((sum, x) => sum + x.depositApplied, 0);
  return Math.max(0, roundMoney(reservation.payment.amount - used));
}

export async function GET(request: Request) {
  if (!await getAdminSession()) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const date = searchParams.get("date");
    const where: Record<string, unknown> = {};
    if (status && ["OPEN", "SUBMITTED", "PREPARING", "READY", "SERVED", "PAID", "CANCELLED"].includes(status)) where.status = status;
    if (date) {
      const start = new Date(`${date}T00:00:00`);
      const end = new Date(`${date}T23:59:59.999`);
      where.openedAt = { gte: start, lte: end };
    }
    const orders = await prisma.order.findMany({
      where,
      include: {
        reservation: { select: { id: true, guestFirstName: true, guestLastName: true, date: true, timeSlot: true } },
        tables: { where: { releasedAt: null }, include: { table: true } },
        items: { select: { id: true, quantity: true, lineTotal: true } },
      },
      orderBy: { openedAt: "desc" },
      take: 200,
    });
    return NextResponse.json({ data: orders });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!await getAdminSession()) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  try {
    const body = await request.json();
    const reservationId = body.reservationId ? String(body.reservationId) : null;
    const tableIds = Array.isArray(body.tableIds) ? [...new Set(body.tableIds.map(String))] : [];
    const covers = Number(body.covers ?? 1);
    if (!Number.isInteger(covers) || covers < 1 || covers > 50) return NextResponse.json({ error: "Nombre de couverts invalide." }, { status: 400 });

    const created = await prisma.$transaction(async (tx) => {
      let reservation = null;
      if (reservationId) {
        reservation = await tx.reservation.findUnique({
          where: { id: reservationId },
          include: { tables: { where: { releasedAt: null }, include: { table: true } } },
        });
        if (!reservation) throw new Error("RESERVATION_NOT_FOUND");
        if (!["PENDING", "CONFIRMED"].includes(reservation.status)) throw new Error("RESERVATION_INACTIVE");
      }

      let resolvedTableIds = tableIds;
      if (resolvedTableIds.length === 0 && reservation) resolvedTableIds = reservation.tables.map((x) => x.tableId);
      if (resolvedTableIds.length === 0) throw new Error("TABLE_REQUIRED");

      const tables = await tx.restaurantTable.findMany({ where: { id: { in: resolvedTableIds }, isActive: true } });
      if (tables.length !== resolvedTableIds.length) throw new Error("TABLE_NOT_FOUND");
      if (tables.some((t) => t.status !== "AVAILABLE")) throw new Error("TABLE_NOT_AVAILABLE");
      if (tables.reduce((sum, t) => sum + t.capacity, 0) < covers) throw new Error("TABLE_CAPACITY");

      if (reservation) {
        const assigned = new Set(reservation.tables.map((x) => x.tableId));
        if (resolvedTableIds.some((id: string) => !assigned.has(id))) throw new Error("TABLE_NOT_ASSIGNED_TO_RESERVATION");
      }

      const activeOrderTables = await tx.orderTable.findMany({
        where: { tableId: { in: resolvedTableIds }, releasedAt: null, order: { status: { in: [...ACTIVE_ORDER_STATUSES] } } },
      });
      if (activeOrderTables.length) throw new Error("TABLE_OCCUPIED");

      const order = await tx.order.create({
        data: {
          reservationId,
          guestFirstName: body.guestFirstName ? String(body.guestFirstName).trim() : reservation?.guestFirstName ?? null,
          guestLastName: body.guestLastName ? String(body.guestLastName).trim() : reservation?.guestLastName ?? null,
          guestPhone: body.guestPhone ? String(body.guestPhone).trim() : reservation?.guestPhone ?? null,
          covers: reservation?.covers ?? covers,
          notes: body.notes ? String(body.notes).trim() : null,
        },
      });

      await tx.orderTable.createMany({ data: resolvedTableIds.map((tableId: string) => ({ orderId: order.id, tableId })) });

      const payment = reservation?.payment;
      const availableDeposit = reservationId && payment?.type === "DEPOSIT" && payment.status === "PAID" ? payment.amount : 0;
      const depositApplied = roundMoney(Math.min(0, availableDeposit));
      await tx.order.update({ where: { id: order.id }, data: { depositApplied, dueAmount: 0 } });
      return order.id;
    });

    return NextResponse.json({ data: { id: created } }, { status: 201 });
  } catch (error: unknown) {
    const messages: Record<string, string> = {
      RESERVATION_NOT_FOUND: "Réservation introuvable.",
      RESERVATION_INACTIVE: "Cette réservation n'est plus active.",
      TABLE_REQUIRED: "Une commande sur place doit être rattachée à au moins une table.",
      TABLE_NOT_FOUND: "Une ou plusieurs tables sont introuvables.",
      TABLE_NOT_AVAILABLE: "Une ou plusieurs tables ne sont pas disponibles.",
      TABLE_CAPACITY: "La capacité des tables sélectionnées est insuffisante.",
      TABLE_NOT_ASSIGNED_TO_RESERVATION: "La table sélectionnée n'est pas attribuée à cette réservation.",
      TABLE_OCCUPIED: "Une table sélectionnée est déjà occupée par une commande active.",
    };
    if (error instanceof Error && messages[error.message]) return NextResponse.json({ error: messages[error.message] }, { status: 409 });
    console.error(error);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
