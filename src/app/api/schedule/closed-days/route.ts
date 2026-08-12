function isPrismaUniqueConstraintError(error: unknown): boolean {
	return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

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
	} catch (error: unknown) {
		if (isPrismaUniqueConstraintError(error)) return NextResponse.json({ error: "Ce jour est déjà fermé" }, { status: 409 });
		return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
	}
}
