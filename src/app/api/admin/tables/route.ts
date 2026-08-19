import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
	try {
		const tables = await prisma.table.findMany({
			include: {
				blocages: { orderBy: { date: "desc" }, take: 5 },
				_count: { select: { reservations: true } },
			},
			orderBy: [{ zone: "asc" }, { numero: "asc" }],
		});
		return NextResponse.json({ data: tables });
	} catch (error) {
		console.error("[GET /api/admin/tables]", error);
		return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
	}
}

export async function POST(request: Request) {
	try {
		const body = await request.json();
		const { numero, capaciteMin, capaciteMax, zone, description } = body;

		if (!numero || !capaciteMax || !zone) {
			return NextResponse.json(
				{ error: "numero, capaciteMax et zone sont requis" },
				{ status: 400 }
			);
		}

		const existing = await prisma.table.findUnique({ where: { numero } });
		if (existing) {
			return NextResponse.json(
				{ error: `Une table avec le numéro ${numero} existe déjà` },
				{ status: 409 }
			);
		}

		const table = await prisma.table.create({
			data: {
				numero: Number(numero),
				capaciteMin: Number(capaciteMin) || 1,
				capaciteMax: Number(capaciteMax),
				zone,
				description: description || null,
			},
		});

		return NextResponse.json({ data: table }, { status: 201 });
	} catch (error) {
		console.error("[POST /api/admin/tables]", error);
		return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
	}
}
