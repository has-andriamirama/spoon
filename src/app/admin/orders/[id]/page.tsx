import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import OrderDetailClient from "./order-detail-client";

export const dynamic = "force-dynamic";

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const order = await prisma.order.findUnique({ where: { id }, include: { reservation: { include: { payment: true, tables: { where: { releasedAt: null }, include: { table: true } } } }, tables: { where: { releasedAt: null }, include: { table: true } }, items: { orderBy: { createdAt: "asc" } }, payments: { orderBy: { paidAt: "asc" } } } });
	if (!order) notFound();
	const dishes = await prisma.dish.findMany({ where: { isAvailable: true }, include: { category: true }, orderBy: [{ category: { order: "asc" } }, { order: "asc" }] });
	const tables = await prisma.restaurantTable.findMany({ where: { isActive: true }, orderBy: [{ zone: "asc" }, { number: "asc" }] });
	const safeOrder = { id: order.id, reservationId: order.reservationId, guestFirstName: order.guestFirstName, guestLastName: order.guestLastName, guestPhone: order.guestPhone, covers: order.covers, status: order.status, notes: order.notes, subtotal: order.subtotal, discountAmount: order.discountAmount, totalAmount: order.totalAmount, depositApplied: order.depositApplied, paidAmount: order.paidAmount, dueAmount: order.dueAmount, openedAt: order.openedAt.toISOString(), reservation: order.reservation ? { id: order.reservation.id, guestFirstName: order.reservation.guestFirstName, guestLastName: order.reservation.guestLastName, date: order.reservation.date.toISOString(), timeSlot: order.reservation.timeSlot, deposit: order.reservation.payment?.status === "PAID" && order.reservation.payment.type === "DEPOSIT" ? order.reservation.payment.amount : 0 } : null, tables: order.tables.map((x) => ({ id: x.table.id, number: x.table.number })), items: order.items.map((item) => ({ id: item.id, dishId: item.dishId, name: item.name, unitPrice: item.unitPrice, quantity: item.quantity, lineTotal: item.lineTotal, notes: item.notes })), payments: order.payments.map((payment) => ({ id: payment.id, amount: payment.amount, method: payment.method, reference: payment.reference, paidAt: payment.paidAt.toISOString() })) };
	const safeDishes = dishes.map((dish) => ({ id: dish.id, name: dish.name, price: dish.price, category: dish.category.name, categoryOrder: dish.category.order, order: dish.order }));
	const safeTables = tables.map((table) => ({ id: table.id, number: table.number, capacity: table.capacity, zone: table.zone, status: table.status }));
	return <div><Link href="/admin/orders" className="inline-flex items-center gap-2 text-sm text-[#9A8F84] hover:text-[#F5F0EB] mb-6"><ArrowLeft size={16} /> Retour aux commandes</Link><OrderDetailClient initialOrder={safeOrder} dishes={safeDishes} tables={safeTables} /></div>;
}
