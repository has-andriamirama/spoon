import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/admin-auth";
import { hasReservationConflict } from "@/lib/table-service";

const ACTIVE_STATUSES = ["PENDING", "CONFIRMED"] as const;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await getAdminSession()) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { id } = await params;
  try {
    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: { tables: { where: { releasedAt: null }, include: { table: true } } },
    });
    if (!reservation) return NextResponse.json({ error: "Réservation introuvable" }, { status: 404 });
    const allTables = await prisma.restaurantTable.findMany({ where: { isActive: true }, orderBy: [{ zone: "asc" }, { number: "asc" }] });
    return NextResponse.json({ data: { reservation, tables: allTables, assignedTableIds: reservation.tables.map((x) => x.tableId) } });
  } catch { return NextResponse.json({ error: "Erreur interne" }, { status: 500 }); }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await getAdminSession()) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { id } = await params;
  try {
    const body = await request.json();
    const tableIds: string[] = Array.isArray(body.tableIds) ? [...new Set(body.tableIds.map(String))] : [];
    const reservation = await prisma.reservation.findUnique({ where: { id }, include: { tables: { where: { releasedAt: null } } } });
    if (!reservation) return NextResponse.json({ error: "Réservation introuvable" }, { status: 404 });
    if (!ACTIVE_STATUSES.includes(reservation.status as typeof ACTIVE_STATUSES[number])) return NextResponse.json({ error: "Cette réservation n'est plus active." }, { status: 409 });

    const tables = await prisma.restaurantTable.findMany({ where: { id: { in: tableIds }, isActive: true } });
    if (tables.length !== tableIds.length) return NextResponse.json({ error: "Une ou plusieurs tables sont introuvables ou inactives." }, { status: 400 });
    if (tables.some((table) => table.status === "OUT_OF_SERVICE")) return NextResponse.json({ error: "Une table sélectionnée est hors service." }, { status: 409 });
    if (tables.reduce((sum, table) => sum + table.capacity, 0) < reservation.covers) return NextResponse.json({ error: `Capacité insuffisante : ${reservation.covers} couverts requis.` }, { status: 409 });

    const settings = await prisma.restaurantSettings.findFirst({ select: { reservationDurationMinutes: true } });
    const durationMinutes = settings?.reservationDurationMinutes ?? 120;

    const conflictingLinks = await prisma.reservationTable.findMany({
      where: {
        tableId: { in: tableIds },
        releasedAt: null,
        reservationId: { not: reservation.id },
        reservation: { date: reservation.date, status: { in: ACTIVE_STATUSES } },
      },
      include: { reservation: { select: { id: true, timeSlot: true, guestFirstName: true, guestLastName: true } } },
    });
    const conflict = conflictingLinks.find((link) => hasReservationConflict(reservation.timeSlot, link.reservation.timeSlot, durationMinutes));
    if (conflict) return NextResponse.json({ error: `La table ${tables.find((t) => t.id === conflict.tableId)?.number ?? "sélectionnée"} est déjà réservée sur un créneau qui se chevauche.` }, { status: 409 });

    const activeOrders = await prisma.orderTable.findMany({
      where: { tableId: { in: tableIds }, releasedAt: null, order: { status: { in: ["OPEN", "SUBMITTED", "PREPARING", "READY", "SERVED"] } } },
      include: { order: { select: { id: true } } },
    });
    if (activeOrders.length) return NextResponse.json({ error: "Une table sélectionnée est actuellement occupée par une commande active." }, { status: 409 });

    await prisma.$transaction(async (tx) => {
      await tx.reservationTable.updateMany({ where: { reservationId: id, releasedAt: null, tableId: { notIn: tableIds } }, data: { releasedAt: new Date() } });
      for (const tableId of tableIds) {
        const existing = await tx.reservationTable.findUnique({ where: { reservationId_tableId: { reservationId: id, tableId } } });
        if (existing) {
          if (existing.releasedAt) await tx.reservationTable.update({ where: { id: existing.id }, data: { releasedAt: null, assignedAt: new Date() } });
        } else {
          await tx.reservationTable.create({ data: { reservationId: id, tableId } });
        }
      }
    });

    return NextResponse.json({ message: "Tables attribuées" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
