import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/admin-auth";
import { getLiveTables } from "@/lib/table-service";

export async function GET(request: Request) {
  if (!await getAdminSession()) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
    const time = searchParams.get("time") ?? new Date().toTimeString().slice(0, 5);
    const data = await getLiveTables(date, time);
    return NextResponse.json({ data });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!await getAdminSession()) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  try {
    const body = await request.json();
    const number = String(body.number ?? "").trim();
    const name = body.name ? String(body.name).trim() : null;
    const capacity = Number(body.capacity);
    const zone = String(body.zone ?? "SALLE");
    const status = String(body.status ?? "AVAILABLE");
    const notes = body.notes ? String(body.notes).trim() : null;

    if (!number || !Number.isInteger(capacity) || capacity < 1 || capacity > 50) {
      return NextResponse.json({ error: "Numéro et capacité valides requis." }, { status: 400 });
    }
    if (!['SALLE', 'TERRASSE', 'BAR', 'AUTRE'].includes(zone)) return NextResponse.json({ error: "Zone invalide." }, { status: 400 });
    if (!['AVAILABLE', 'CLEANING', 'OUT_OF_SERVICE'].includes(status)) return NextResponse.json({ error: "Statut opérationnel invalide." }, { status: 400 });

    const table = await prisma.restaurantTable.create({
      data: { number, name, capacity, zone: zone as never, status: status as never, notes },
    });
    return NextResponse.json({ data: table }, { status: 201 });
  } catch (error: unknown) {
    console.error(error);
    if (typeof error === "object" && error && "code" in error && (error as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "Ce numéro de table existe déjà." }, { status: 409 });
    }
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
