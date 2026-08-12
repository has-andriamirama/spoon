import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
  const dish = await prisma.dish.findUnique({ where: { id: id }, include: { category: true } });
  if (!dish) return NextResponse.json({ error: "Plat introuvable" }, { status: 404 });
  return NextResponse.json({ data: dish });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
  try {
    const body = await request.json();
    if (body.name) body.slug = slugify(body.name);
    const dish = await prisma.dish.update({ where: { id: id }, data: body });
    return NextResponse.json({ data: dish });
  } catch { return NextResponse.json({ error: "Erreur interne" }, { status: 500 }); }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
  try {
    await prisma.dish.delete({ where: { id: id } });
    return NextResponse.json({ message: "Plat supprimé" });
  } catch { return NextResponse.json({ error: "Erreur interne" }, { status: 500 }); }
}
