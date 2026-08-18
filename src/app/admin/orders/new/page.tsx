import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import OrderForm from "../order-form";

export const dynamic = "force-dynamic";

export default async function NewOrderPage({ searchParams }: { searchParams: Promise<{ reservationId?: string }> }) {
  const { reservationId: initialReservationId } = await searchParams;
  const today = new Date();
  const [todayReservations, initialReservation, tables, dishes] = await Promise.all([
    prisma.reservation.findMany({ where: { date: today, status: { in: ["PENDING", "CONFIRMED"] } }, include: { payment: true, tables: { where: { releasedAt: null }, include: { table: true } } }, orderBy: { timeSlot: "asc" }, take: 100 }),
    initialReservationId ? prisma.reservation.findUnique({ where: { id: initialReservationId }, include: { payment: true, tables: { where: { releasedAt: null }, include: { table: true } } } }) : null,
    prisma.restaurantTable.findMany({ where: { isActive: true }, orderBy: [{ zone: "asc" }, { number: "asc" }] }),
    prisma.dish.findMany({ where: { isAvailable: true }, include: { category: true }, orderBy: [{ category: { order: "asc" } }, { order: "asc" }] }),
  ]);
  const reservationMap = new Map(todayReservations.map((reservation) => [reservation.id, reservation]));
  if (initialReservation && !reservationMap.has(initialReservation.id)) reservationMap.set(initialReservation.id, initialReservation);
  const reservations = [...reservationMap.values()];
  const safeReservations = reservations.map((reservation) => ({ id: reservation.id, guestFirstName: reservation.guestFirstName, guestLastName: reservation.guestLastName, guestPhone: reservation.guestPhone, covers: reservation.covers, date: reservation.date.toISOString(), timeSlot: reservation.timeSlot, deposit: reservation.payment?.status === "PAID" && reservation.payment.type === "DEPOSIT" ? reservation.payment.amount : 0, tableIds: reservation.tables.map((x) => x.tableId), tables: reservation.tables.map((x) => ({ id: x.table.id, number: x.table.number })) }));
  const safeTables = tables.map((table) => ({ id: table.id, number: table.number, capacity: table.capacity, zone: table.zone, status: table.status }));
  const safeDishes = dishes.map((dish) => ({ id: dish.id, name: dish.name, price: dish.price, category: dish.category.name, categoryOrder: dish.category.order, order: dish.order }));
  return <div><div className="flex items-center gap-3 mb-8"><Link href="/admin/orders" className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-[#222] bg-[#141414] text-[#9A8F84] hover:text-[#F5F0EB]"><ArrowLeft size={17} /></Link><div><h1 className="font-display text-3xl text-[#F5F0EB]">Nouvelle commande</h1><p className="text-sm text-[#5A5249] mt-1">{format(today, "dd/MM/yyyy")} · service sur place</p></div></div><OrderForm reservations={safeReservations} tables={safeTables} dishes={safeDishes} initialReservationId={initialReservationId ?? ""} /></div>;
}
