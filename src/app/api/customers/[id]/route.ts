import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).id !== params.id) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    const body = await request.json();
    const { firstName, lastName, phone } = body;
    const user = await prisma.user.update({ where: { id: params.id }, data: { firstName, lastName, phone } });
    return NextResponse.json({ data: { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, phone: user.phone } });
  } catch { return NextResponse.json({ error: "Erreur interne" }, { status: 500 }); }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).id !== params.id) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    // RGPD: anonymize instead of hard delete
    await prisma.user.update({ where: { id: params.id }, data: { email: `deleted_${params.id}@deleted.invalid`, firstName: "Supprimé", lastName: "", phone: null, isActive: false } });
    return NextResponse.json({ message: "Compte supprimé" });
  } catch { return NextResponse.json({ error: "Erreur interne" }, { status: 500 }); }
}
