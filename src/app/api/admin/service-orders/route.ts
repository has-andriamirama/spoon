import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";

export const dynamic = "force-dynamic";

// GET — liste des commandes actives (pour le plan de salle temps réel)
export async function GET() {
	try {
		const orders = await prisma.serviceOrder.findMany({
			where: { status: { in: ["OUVERTE", "ADDITION_DEMANDEE"] } },
			include: {
				table: { select: { id: true, numero: true, zone: true, capaciteMax: true } },
				items: true,
				_count: { select: { items: true } },
			},
			orderBy: { openedAt: "asc" },
		});
		return NextResponse.json({ data: orders });
	} catch (error) {
		console.error("[GET /api/admin/service-orders]", error);
		return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
	}
}

// POST — créer une commande de service
export async function POST(request: Request) {
	try {
		const body = await request.json();
		const { tableId, reservationId, type, guestName, covers, notes } = body;

		if (!tableId || !type || !guestName || !covers) {
			return NextResponse.json(
				{ error: "tableId, type, guestName et covers sont requis" },
				{ status: 400 }
			);
		}

		// Vérifier que la table n'a pas déjà une commande ouverte
		const existing = await prisma.serviceOrder.findFirst({
			where: {
				tableId,
				status: { in: ["OUVERTE", "ADDITION_DEMANDEE"] },
			},
		});
		if (existing) {
			return NextResponse.json(
				{ error: "Cette table a déjà une commande en cours", orderId: existing.id },
				{ status: 409 }
			);
		}

		// Récupérer l'acompte si c'est une réservation
		let depositDeducted = 0;
		if (reservationId) {
			const payment = await prisma.payment.findUnique({
				where: { reservationId },
				select: { amount: true, status: true },
			});
			if (payment?.status === "PAID") {
				depositDeducted = payment.amount;
			}
		}

		const order = await prisma.serviceOrder.create({
			data: {
				tableId,
				reservationId: reservationId || null,
				type,
				guestName,
				covers: Number(covers),
				notes: notes || null,
				depositDeducted,
				totalAmount: 0,
			},
			include: {
				table: { select: { id: true, numero: true, zone: true, capaciteMax: true } },
				items: true,
			},
		});

		// Notification temps réel
		await pusherServer.trigger("admin-reservations", "service-order-updated", {
			tableId,
			orderId: order.id,
			action: "created",
		});

		return NextResponse.json({ data: order }, { status: 201 });
	} catch (error) {
		console.error("[POST /api/admin/service-orders]", error);
		return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
	}
}
