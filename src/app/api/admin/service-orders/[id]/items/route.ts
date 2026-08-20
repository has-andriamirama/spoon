import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// POST — ajouter un article à la commande
export async function POST(
	request: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { id: orderId } = await params;
		const body = await request.json();
		const { dishId, qty = 1, notes, course = "PLAT" } = body;

		if (!dishId) {
			return NextResponse.json({ error: "dishId est requis" }, { status: 400 });
		}

		const order = await prisma.serviceOrder.findUnique({
			where: { id: orderId },
			select: { id: true, status: true, tableId: true },
		});
		if (!order) {
			return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
		}
		if (order.status !== "OUVERTE") {
			return NextResponse.json(
				{ error: "Impossible d'ajouter des articles — la commande n'est plus ouverte" },
				{ status: 400 }
			);
		}

		const dish = await prisma.dish.findUnique({
			where: { id: dishId },
			select: { id: true, name: true, price: true, isAvailable: true },
		});
		if (!dish) {
			return NextResponse.json({ error: "Plat introuvable" }, { status: 404 });
		}
		if (!dish.isAvailable) {
			return NextResponse.json({ error: "Ce plat n'est plus disponible" }, { status: 400 });
		}

		const qtyN = Math.max(1, Number(qty));
		const totalPrice = dish.price * qtyN;

		// Vérifier si l'article existe déjà — si oui, incrémenter la quantité
		const existing = await prisma.serviceOrderItem.findFirst({
			where: { orderId, dishId, notes: notes || null },
		});

		let item;
		if (existing) {
			const newQty   = existing.qty + qtyN;
			const newTotal = dish.price * newQty;
			item = await prisma.serviceOrderItem.update({
				where: { id: existing.id },
				data: { qty: newQty, totalPrice: newTotal },
			});
		} else {
			item = await prisma.serviceOrderItem.create({
				data: {
					orderId,
					dishId,
					dishName:   dish.name,
					unitPrice:  dish.price,
					qty:        qtyN,
					totalPrice,
					notes:      notes || null,
					course,
				},
			});
		}

		// Recalculer le total de la commande
		const allItems = await prisma.serviceOrderItem.findMany({
			where: { orderId },
			select: { totalPrice: true },
		});
		const newTotal = allItems.reduce((s, i) => s + i.totalPrice, 0);

		await prisma.serviceOrder.update({
			where: { id: orderId },
			data: { totalAmount: newTotal },
		});

		return NextResponse.json({ data: item }, { status: 201 });
	} catch (error) {
		console.error("[POST /api/admin/service-orders/[id]/items]", error);
		return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
	}
}
