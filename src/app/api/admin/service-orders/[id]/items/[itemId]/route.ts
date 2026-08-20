import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function recalcTotal(orderId: string) {
	const allItems = await prisma.serviceOrderItem.findMany({
		where: { orderId },
		select: { totalPrice: true },
	});
	const total = allItems.reduce((s, i) => s + i.totalPrice, 0);
	await prisma.serviceOrder.update({
		where: { id: orderId },
		data: { totalAmount: total },
	});
	return total;
}

// PATCH — modifier la quantité ou les notes d'un article
export async function PATCH(
	request: Request,
	{ params }: { params: Promise<{ id: string; itemId: string }> }
) {
	try {
		const { id: orderId, itemId } = await params;
		const body = await request.json();
		const { qty, notes } = body;

		const item = await prisma.serviceOrderItem.findFirst({
			where: { id: itemId, orderId },
		});
		if (!item) {
			return NextResponse.json({ error: "Article introuvable" }, { status: 404 });
		}

		const newQty  = qty !== undefined ? Math.max(1, Number(qty)) : item.qty;
		const newTotal = item.unitPrice * newQty;

		const updated = await prisma.serviceOrderItem.update({
			where: { id: itemId },
			data: {
				qty:        newQty,
				totalPrice: newTotal,
				...(notes !== undefined ? { notes: notes || null } : {}),
			},
		});

		await recalcTotal(orderId);

		return NextResponse.json({ data: updated });
	} catch (error) {
		console.error("[PATCH /api/admin/service-orders/[id]/items/[itemId]]", error);
		return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
	}
}

// DELETE — supprimer un article
export async function DELETE(
	_req: Request,
	{ params }: { params: Promise<{ id: string; itemId: string }> }
) {
	try {
		const { id: orderId, itemId } = await params;

		const item = await prisma.serviceOrderItem.findFirst({
			where: { id: itemId, orderId },
		});
		if (!item) {
			return NextResponse.json({ error: "Article introuvable" }, { status: 404 });
		}

		await prisma.serviceOrderItem.delete({ where: { id: itemId } });
		await recalcTotal(orderId);

		return NextResponse.json({ data: { id: itemId } });
	} catch (error) {
		console.error("[DELETE /api/admin/service-orders/[id]/items/[itemId]]", error);
		return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
	}
}
