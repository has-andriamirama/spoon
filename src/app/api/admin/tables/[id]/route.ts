import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/admin-auth";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await getAdminSession()) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { id } = await params;
  try {
    const table = await prisma.restaurantTable.findUnique({ where: { id } });
    if (!table) return NextResponse.json({ error: "Table introuvable" }, { status: 404 });
    return NextResponse.json({ data: table });
  } catch { return NextResponse.json({ error: "Erreur interne" }, { status: 500 }); }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await getAdminSession()) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { id } = await params;
  try {
    const body = await request.json();
    const current = await prisma.restaurantTable.findUnique({ where: { id } });
    if (!current) return NextResponse.json({ error: "Table introuvable" }, { status: 404 });

    const status = body.status ? String(body.status) : undefined;
    if (status === "OUT_OF_SERVICE") {
      const activeOrder = await prisma.orderTable.findFirst({ where: { tableId: id, releasedAt: null, order: { status: { in: ["OPEN", "SUBMITTED", "PREPARING", "READY", "SERVED"] } } } });
      if (activeOrder) return NextResponse.json({ error: "Impossible de mettre cette table hors service pendant une commande active." }, { status: 409 });
    }

    const data: Record<string, unknown> = {};
    if (body.number !== undefined) data.number = String(body.number).trim();
    if (body.name !== undefined) data.name = body.name ? String(body.name).trim() : null;
    if (body.capacity !== undefined) {
      const capacity = Number(body.capacity);
      if (!Number.isInteger(capacity) || capacity < 1 || capacity > 50) return NextResponse.json({ error: "Capacité invalide." }, { status: 400 });
      data.capacity = capacity;
    }
    if (body.zone !== undefined) {
      if (!['SALLE', 'TERRASSE', 'BAR', 'AUTRE'].includes(String(body.zone))) return NextResponse.json({ error: "Zone invalide." }, { status: 400 });
      data.zone = body.zone;
    }
    if (status !== undefined) {
      if (!['AVAILABLE', 'CLEANING', 'OUT_OF_SERVICE'].includes(status)) return NextResponse.json({ error: "Statut opérationnel invalide." }, { status: 400 });
      data.status = status;
    }
    if (body.notes !== undefined) data.notes = body.notes ? String(body.notes).trim() : null;
    if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);

    const table = await prisma.restaurantTable.update({ where: { id }, data });
    return NextResponse.json({ data: table });
  } catch (error: unknown) {
    console.error(error);
    if (typeof error === "object" && error && "code" in error && (error as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "Ce numéro de table existe déjà." }, { status: 409 });
    }
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await getAdminSession()) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { id } = await params;
  try {
    const activeOrder = await prisma.orderTable.findFirst({ where: { tableId: id, releasedAt: null, order: { status: { in: ["OPEN", "SUBMITTED", "PREPARING", "READY", "SERVED"] } } } });
    if (activeOrder) return NextResponse.json({ error: "Impossible de désactiver une table occupée." }, { status: 409 });
    await prisma.restaurantTable.update({ where: { id }, data: { isActive: false } });
    return NextResponse.json({ message: "Table désactivée" });
  } catch { return NextResponse.json({ error: "Erreur interne" }, { status: 500 }); }
}
