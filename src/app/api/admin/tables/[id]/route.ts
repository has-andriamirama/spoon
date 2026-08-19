import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
	request: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	const { id } = await params;
	try {
		const body = await request.json();
		const { numero, capaciteMin, capaciteMax, zone, description, isActif } = body;

		if (numero !== undefined) {
			const conflict = await prisma.table.findFirst({
				where: { numero: Number(numero), NOT: { id } },
			});
			if (conflict) {
				return NextResponse.json(
					{ error: `Le numéro ${numero} est déjà utilisé par une autre table` },
					{ status: 409 }
				);
			}
		}

		const table = await prisma.table.update({
			where: { id },
			data: {
				...(numero !== undefined && { numero: Number(numero) }),
				...(capaciteMin !== undefined && { capaciteMin: Number(capaciteMin) }),
				...(capaciteMax !== undefined && { capaciteMax: Number(capaciteMax) }),
				...(zone !== undefined && { zone }),
				...(description !== undefined && { description }),
				...(isActif !== undefined && { isActif }),
			},
		});

		return NextResponse.json({ data: table });
	} catch (error) {
		console.error("[PATCH /api/admin/tables/:id]", error);
		return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
	}
}

export async function DELETE(
	request: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	const { id } = await params;
	try {
		const reservationCount = await prisma.reservation.count({
			where: { tableId: id, status: { in: ["PENDING", "CONFIRMED"] } },
		});

		if (reservationCount > 0) {
			await prisma.table.update({
				where: { id },
				data: { isActif: false },
			});
			return NextResponse.json({
				message: "Table désactivée (des réservations actives lui sont liées)",
			});
		}

		await prisma.table.delete({ where: { id } });
		return NextResponse.json({ message: "Table supprimée" });
	} catch (error) {
		console.error("[DELETE /api/admin/tables/:id]", error);
		return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
	}
}
