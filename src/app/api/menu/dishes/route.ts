function isPrismaUniqueConstraintError(error: unknown): boolean {
	return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { createDishSchema } from "@/lib/validations";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const categorySlug = searchParams.get("category");
  const where: { categoryId?: string } = {};
  if (categorySlug) {
    const cat = await prisma.menuCategory.findUnique({ where: { slug: categorySlug } });
    if (cat) where.categoryId = cat.id;
  }
  const dishes = await prisma.dish.findMany({ where: { ...where, isAvailable: true }, include: { category: true }, orderBy: [{ category: { order: "asc" } }, { order: "asc" }] });
  return NextResponse.json({ data: dishes });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createDishSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Données invalides", details: parsed.error.flatten() }, { status: 400 });
    const dish = await prisma.dish.create({ data: { ...parsed.data, slug: slugify(parsed.data.name) } });
    return NextResponse.json({ data: dish }, { status: 201 });
  } catch (error: unknown) {
    if (isPrismaUniqueConstraintError(error)) return NextResponse.json({ error: "Un plat avec ce nom existe déjà" }, { status: 409 });
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
