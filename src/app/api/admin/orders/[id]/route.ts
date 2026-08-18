import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/admin-auth";
import { ACTIVE_ORDER_STATUSES, roundMoney } from "@/lib/order-service";

const ALL_STATUSES = ["OPEN", "SUBMITTED", "PREPARING", "READY", "SERVED", "PAID", "CANCELLED"];

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await getAdminSession()) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { id } = await params;
  try {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        reservation: { include: { payment: true, tables: { where: { releasedAt: null }, include: { table: true } } } },
        tables: { where: { releasedAt: null }, include: { table: true } },
        items: { orderBy: { createdAt: "asc" } },
        payments: { orderBy: { paidAt: "asc" } },
      },
    });
    if (!order) return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
    return NextResponse.json({ data: order });
  } catch { return NextResponse.json({ error: "Erreur interne" }, { status: 500 }); }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await getAdminSession()) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { id } = await params;
  try {
    const body = await request.json();
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id }, include: { reservation: { include: { payment: true } }, items: true, payments: true, tables: { where: { releasedAt: null } } } });
      if (!order) throw new Error("ORDER_NOT_FOUND");

      const data: Record<string, unknown> = {};
      if (body.notes !== undefined) data.notes = body.notes ? String(body.notes).trim() : null;
      if (body.discountAmount !== undefined) {
        const discount = Number(body.discountAmount);
        if (!Number.isFinite(discount) || discount < 0) throw new Error("INVALID_DISCOUNT");
        data.discountAmount = discount;
      }

      if (body.status !== undefined) {
        const status = String(body.status);
        if (!ALL_STATUSES.includes(status)) throw new Error("INVALID_STATUS");
        if (status === "PAID") {
          const currentTotal = order.totalAmount;
          const paid = order.payments.reduce((sum, p) => sum + p.amount, 0) + order.depositApplied;
          if (paid + 0.001 < currentTotal) throw new Error("PAYMENT_INCOMPLETE");
          data.paidAt = new Date();
        }
        if (status === "SERVED") data.servedAt = new Date();
        if (status === "CANCELLED") data.cancelledAt = new Date();
        data.status = status;
      }

      if (body.items !== undefined) {
        if (!Array.isArray(body.items)) throw new Error("INVALID_ITEMS");
        const normalized = body.items
          .map((item: { dishId?: unknown; quantity?: unknown; notes?: unknown }) => ({ dishId: String(item.dishId ?? ""), quantity: Number(item.quantity), notes: item.notes ? String(item.notes).trim() : null }))
          .filter((item: { dishId: string; quantity: number }) => item.quantity > 0);
        if (normalized.some((item: { dishId: string; quantity: number }) => !item.dishId || !Number.isInteger(item.quantity) || item.quantity > 50)) throw new Error("INVALID_ITEMS");

        const dishes = await tx.dish.findMany({ where: { id: { in: normalized.map((i: { dishId: string }) => i.dishId) }, isAvailable: true } });
        if (dishes.length !== normalized.length) throw new Error("DISH_NOT_AVAILABLE");
        const dishById = new Map(dishes.map((dish) => [dish.id, dish]));

        await tx.orderItem.deleteMany({ where: { orderId: id } });
        await tx.orderItem.createMany({
          data: normalized.map((item: { dishId: string; quantity: number; notes: string | null }) => {
            const dish = dishById.get(item.dishId)!;
            const unitPrice = roundMoney(dish.price);
            return { orderId: id, dishId: dish.id, name: dish.name, unitPrice, quantity: item.quantity, lineTotal: roundMoney(unitPrice * item.quantity), notes: item.notes };
          }),
        });
      }

      const freshItems = await tx.orderItem.findMany({ where: { orderId: id } });
      const subtotal = roundMoney(freshItems.reduce((sum, item) => sum + item.lineTotal, 0));
      const discountAmount = roundMoney(Math.min(Math.max(Number(data.discountAmount ?? order.discountAmount), 0), subtotal));
      const totalAmount = roundMoney(Math.max(0, subtotal - discountAmount));
      const reservationId = order.reservationId;
      let depositAvailable = 0;
      if (reservationId && order.reservation?.payment?.type === "DEPOSIT" && order.reservation.payment.status === "PAID") {
        const otherOrders = await tx.order.findMany({ where: { reservationId, id: { not: id }, status: { not: "CANCELLED" } }, select: { depositApplied: true } });
        const used = otherOrders.reduce((sum, x) => sum + x.depositApplied, 0);
        depositAvailable = Math.max(0, roundMoney(order.reservation.payment.amount - used));
      }
      const depositApplied = roundMoney(Math.min(totalAmount, depositAvailable));
      const paidAmount = roundMoney(order.payments.reduce((sum, p) => sum + p.amount, 0));
      const dueAmount = roundMoney(Math.max(0, totalAmount - depositApplied - paidAmount));
      data.subtotal = subtotal;
      data.discountAmount = discountAmount;
      data.totalAmount = totalAmount;
      data.depositApplied = depositApplied;
      data.paidAmount = paidAmount;
      data.dueAmount = dueAmount;
      if (order.status !== "CANCELLED" && dueAmount === 0 && totalAmount > 0 && body.status === undefined) {
        data.status = "PAID";
        data.paidAt = order.paidAt ?? new Date();
      }

      if (Array.isArray(body.tableIds)) {
        if (!ACTIVE_ORDER_STATUSES.includes((body.status ?? order.status) as typeof ACTIVE_ORDER_STATUSES[number])) {
          throw new Error("TABLES_ONLY_ACTIVE_ORDER");
        }
        const tableIds: string[] = [...new Set(body.tableIds.map(String))];
        if (!tableIds.length) throw new Error("TABLE_REQUIRED");
        if (order.reservationId) {
          const reservationLinks = await tx.reservationTable.findMany({ where: { reservationId: order.reservationId, releasedAt: null }, select: { tableId: true } });
          const assignedToReservation = new Set(reservationLinks.map((link) => link.tableId));
          if (tableIds.some((tableId) => !assignedToReservation.has(tableId))) throw new Error("TABLE_NOT_ASSIGNED_TO_RESERVATION");
        }
        const tables = await tx.restaurantTable.findMany({ where: { id: { in: tableIds }, isActive: true } });
        if (tables.length !== tableIds.length || tables.some((t) => t.status !== "AVAILABLE")) throw new Error("TABLE_NOT_AVAILABLE");
        if (tables.reduce((sum, t) => sum + t.capacity, 0) < order.covers) throw new Error("TABLE_CAPACITY");
        const conflicts = await tx.orderTable.findMany({ where: { tableId: { in: tableIds }, orderId: { not: id }, releasedAt: null, order: { status: { in: [...ACTIVE_ORDER_STATUSES] } } } });
        if (conflicts.length) throw new Error("TABLE_OCCUPIED");
        await tx.orderTable.updateMany({ where: { orderId: id, releasedAt: null, tableId: { notIn: tableIds } }, data: { releasedAt: new Date() } });
        for (const tableId of tableIds) {
          const existing = await tx.orderTable.findUnique({ where: { orderId_tableId: { orderId: id, tableId } } });
          if (existing) {
            if (existing.releasedAt) await tx.orderTable.update({ where: { id: existing.id }, data: { releasedAt: null, assignedAt: new Date() } });
          } else {
            await tx.orderTable.create({ data: { orderId: id, tableId } });
          }
        }
      }

      if (body.status === "CANCELLED" || body.status === "PAID") {
        await tx.orderTable.updateMany({ where: { orderId: id, releasedAt: null }, data: { releasedAt: new Date() } });
      }

      return tx.order.update({ where: { id }, data });
    });
    return NextResponse.json({ data: result });
  } catch (error: unknown) {
    const messages: Record<string, string> = {
      ORDER_NOT_FOUND: "Commande introuvable.", INVALID_DISCOUNT: "Remise invalide.", INVALID_STATUS: "Statut invalide.",
      PAYMENT_INCOMPLETE: "Le total n'est pas entièrement réglé.", INVALID_ITEMS: "Les lignes de commande sont invalides.", DISH_NOT_AVAILABLE: "Un des plats n'est plus disponible.",
      TABLE_REQUIRED: "Au moins une table est requise.", TABLE_NOT_ASSIGNED_TO_RESERVATION: "Une table choisie n'est pas attribuée à la réservation.", TABLE_NOT_AVAILABLE: "Une table sélectionnée n'est pas disponible.", TABLE_CAPACITY: "Capacité de table insuffisante.", TABLE_OCCUPIED: "Une table est déjà occupée.", TABLES_ONLY_ACTIVE_ORDER: "Les tables ne peuvent être modifiées que pour une commande active.",
    };
    if (error instanceof Error && messages[error.message]) return NextResponse.json({ error: messages[error.message] }, { status: 409 });
    console.error(error);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
