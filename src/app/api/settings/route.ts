import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const settings = await prisma.restaurantSettings.findFirst();
  return NextResponse.json({ data: settings });
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const existing = await prisma.restaurantSettings.findFirst();
    const settings = existing
      ? await prisma.restaurantSettings.update({ where: { id: existing.id }, data: body })
      : await prisma.restaurantSettings.create({ data: body });
    return NextResponse.json({ data: settings });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
