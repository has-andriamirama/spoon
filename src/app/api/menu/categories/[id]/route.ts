import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	try {
		const body = await request.json();
		const category = await prisma.menuCategory.update({ where: { id: id }, data: body });
		return NextResponse.json({ data: category });
	} catch { return NextResponse.json({ error: "Erreur interne" }, { status: 500 }); }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	try {
		await prisma.menuCategory.update({ where: { id: id }, data: { isActive: false } });
		return NextResponse.json({ message: "Catégorie désactivée" });
	} catch { return NextResponse.json({ error: "Erreur interne" }, { status: 500 }); }
}
