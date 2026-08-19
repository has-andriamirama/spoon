import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";
import { startOfDay, endOfDay } from "date-fns";

export async function POST(
	request: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	const { id } = await params;
	try {
		const body = await request.json();
		const { date, heureDebut, heureFin, motif } = body;

		if (!date || !heureDebut || !heureFin) {
			return NextResponse.json(
				{ error: "date, heureDebut et heureFin sont requis" },
				{ status: 400 }
			);
		}

		const targetDate = new Date(date);

		const table = await prisma.table.findUnique({ where: { id } });
		if (!table) {
			return NextResponse.json({ error: "Table introuvable" }, { status: 404 });
		}

		const existing = await prisma.tableBlocage.findFirst({
			where: {
				tableId: id,
				date: { gte: startOfDay(targetDate), lte: endOfDay(targetDate) },
			},
		});
		if (existing) {
			return NextResponse.json(
				{ error: "Un blocage existe déjà sur cette table pour cette date" },
				{ status: 409 }
			);
		}

		const blocage = await prisma.tableBlocage.create({
			data: {
				tableId: id,
				date: startOfDay(targetDate),
				heureDebut,
				heureFin,
				motif: motif || null,
			},
		});

		await pusherServer.trigger("admin-reservations", "table-updated", {
			tableId: id,
			action: "blocked",
			blocageId: blocage.id,
			motif: blocage.motif,
		});

		return NextResponse.json({ data: blocage }, { status: 201 });
	} catch (error) {
		console.error("[POST /api/admin/tables/:id/bloquer]", error);
		return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
	}
}

export async function DELETE(
	request: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	const { id } = await params;
	try {
		const { searchParams } = new URL(request.url);
		const date = searchParams.get("date");
		if (!date) {
			return NextResponse.json({ error: "date requis" }, { status: 400 });
		}

		const targetDate = new Date(date);

		await prisma.tableBlocage.deleteMany({
			where: {
				tableId: id,
				date: { gte: startOfDay(targetDate), lte: endOfDay(targetDate) },
			},
		});

		await pusherServer.trigger("admin-reservations", "table-updated", {
			tableId: id,
			action: "unblocked",
		});

		return NextResponse.json({ message: "Blocage(s) supprimé(s)" });
	} catch (error) {
		console.error("[DELETE /api/admin/tables/:id/bloquer]", error);
		return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
	}
}
