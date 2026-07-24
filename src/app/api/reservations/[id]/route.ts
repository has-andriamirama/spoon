import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendCancellationEmail } from "@/services/email.service";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    const reservation = await prisma.reservation.findFirst({
      where: { id: params.id, ...(userId ? { userId } : {}) },
      include: { payment: true, invoice: true },
    });
    if (!reservation) return NextResponse.json({ error: "Réservation introuvable" }, { status: 404 });
    return NextResponse.json({ data: reservation });
  } catch { return NextResponse.json({ error: "Erreur interne" }, { status: 500 }); }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const { status, cancellationReason, notes } = body;

    const reservation = await prisma.reservation.findUnique({ where: { id: params.id } });
    if (!reservation) return NextResponse.json({ error: "Réservation introuvable" }, { status: 404 });

    const updateData: any = {};
    if (status) {
      updateData.status = status;
      if (status === "CONFIRMED") updateData.confirmedAt = new Date();
      if (["CANCELLED_BY_CUSTOMER", "CANCELLED_BY_ADMIN"].includes(status)) {
        updateData.cancelledAt = new Date();
        updateData.cancellationReason = cancellationReason || null;
        await sendCancellationEmail({ guestFirstName: reservation.guestFirstName, guestEmail: reservation.guestEmail, date: reservation.date, timeSlot: reservation.timeSlot, cancellationReason });
      }
      if (status === "COMPLETED") updateData.completedAt = new Date();
    }
    if (notes !== undefined) updateData.notes = notes;

    const updated = await prisma.reservation.update({ where: { id: params.id }, data: updateData });
    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    await prisma.reservation.delete({ where: { id: params.id } });
    return NextResponse.json({ message: "Réservation supprimée" });
  } catch { return NextResponse.json({ error: "Erreur interne" }, { status: 500 }); }
}
