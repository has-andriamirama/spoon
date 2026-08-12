import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	try {
		await prisma.closedDay.delete({ where: { id: id } });
		return NextResponse.json({ message: "Jour supprimé" });
	} catch {
		return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
	}
}
