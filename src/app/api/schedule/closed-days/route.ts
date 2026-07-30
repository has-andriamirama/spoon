import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
	const days = await prisma.closedDay.findMany({ orderBy: { date: "asc" } });
	return NextResponse.json({ data: days });
}

export async function POST(request: Request) {
	try {
		const { date, reason } = await request.json();
		const closed = await prisma.closedDay.create({ data: { date: new Date(date), reason } });
		return NextResponse.json({ data: closed }, { status: 201 });
	} catch (e: any) {
		if (e.code === "P2002") return NextResponse.json({ error: "Ce jour est déjà fermé" }, { status: 409 });
		return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
	}
}
