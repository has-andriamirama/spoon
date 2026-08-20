import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";

export const dynamic = "force-dynamic";

// GET — détail d'une commande
export async function GET(
	_req: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { id } = await params;
		const order = await prisma.serviceOrder.findUnique({
			where: { id },
			include: {
				table: {
					select: { id: true, numero: true, zone: true, capaciteMax: true, description: true },
				},
				reservation: {
					select: { id: true, timeSlot: true, guestFirstName: true, guestLastName: true },
				},
				items: { orderBy: { createdAt: "asc" } },
			},
		});

		if (!order) {
			return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
		}

		return NextResponse.json({ data: order });
	} catch (error) {
		console.error("[GET /api/admin/service-orders/[id]]", error);
		return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
	}
}

// PATCH — modifier le statut (ex: demander l'addition)
export async function PATCH(
	request: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { id } = await params;
		const body = await request.json();
		const { status } = body;

		const allowed = ["OUVERTE", "ADDITION_DEMANDEE", "ANNULEE"];
		if (!allowed.includes(status)) {
			return NextResponse.json(
				{ error: `Statut invalide. Valeurs acceptées : ${allowed.join(", ")}` },
				{ status: 400 }
			);
		}

		const order = await prisma.serviceOrder.findUnique({ where: { id } });
		if (!order) {
			return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
		}

		const updated = await prisma.serviceOrder.update({
			where: { id },
			data: {
				status,
				...(status === "ANNULEE" ? { closedAt: new Date() } : {}),
			},
			include: {
				table: {
					select: { id: true, numero: true, zone: true, capaciteMax: true, description: true },
				},
				reservation: {
					select: { id: true, timeSlot: true, guestFirstName: true, guestLastName: true },
				},
				items: { orderBy: { createdAt: "asc" } },
			},
		});

		await pusherServer.trigger("admin-reservations", "service-order-updated", {
			tableId: order.tableId,
			orderId: id,
			action: "status-changed",
			status,
		});

		return NextResponse.json({ data: updated });
	} catch (error) {
		console.error("[PATCH /api/admin/service-orders/[id]]", error);
		return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
	}
}
