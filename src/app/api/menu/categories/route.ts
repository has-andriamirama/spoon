import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

export async function GET() {
  const categories = await prisma.menuCategory.findMany({ where: { isActive: true }, include: { dishes: { where: { isAvailable: true }, orderBy: { order: "asc" } } }, orderBy: { order: "asc" } });
  return NextResponse.json({ data: categories });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description, iconName, order } = body;
    if (!name) return NextResponse.json({ error: "Nom requis" }, { status: 400 });
    const category = await prisma.menuCategory.create({ data: { name, slug: slugify(name), description, iconName, order: order ?? 0 } });
    return NextResponse.json({ data: category }, { status: 201 });
  } catch (e: any) {
    if (e.code === "P2002") return NextResponse.json({ error: "Une catégorie avec ce nom existe déjà" }, { status: 409 });
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
