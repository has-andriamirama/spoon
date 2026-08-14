import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
	sendCancellationEmail,
	sendReservationConfirmation,
} from "@/services/email.service";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	try {
		const session = await getServerSession(authOptions);
		const userId = session?.user?.id;
		const reservation = await prisma.reservation.findFirst({
			where: { id: id, ...(userId ? { userId } : {}) },
			include: { payment: true, invoice: true },
		});
		if (!reservation) return NextResponse.json({ error: "Réservation introuvable" }, { status: 404 });
		return NextResponse.json({ data: reservation });
	} catch { return NextResponse.json({ error: "Erreur interne" }, { status: 500 }); }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	try {
		const body = await request.json();
		const { status, cancellationReason, notes } = body;

		const reservation = await prisma.reservation.findUnique({ where: { id: id } });
		if (!reservation) return NextResponse.json({ error: "Réservation introuvable" }, { status: 404 });

		const updateData: {
			status?: "PENDING" | "CONFIRMED" | "CANCELLED_BY_CUSTOMER" | "CANCELLED_BY_ADMIN" | "COMPLETED" | "NO_SHOW";
			confirmedAt?: Date;
			cancelledAt?: Date;
			cancellationReason?: string | null;
			completedAt?: Date;
			notes?: string;
		} = {};

		if (status) {
			updateData.status = status;

			if (status === "CONFIRMED") {
				updateData.confirmedAt = new Date();

				// Envoi de l'email de confirmation au client quand l'admin confirme
				await sendReservationConfirmation({
					id: reservation.id,
					guestFirstName: reservation.guestFirstName,
					guestLastName: reservation.guestLastName,
					guestEmail: reservation.guestEmail,
					date: reservation.date,
					timeSlot: reservation.timeSlot,
					covers: reservation.covers,
					notes: reservation.notes,
				}).catch((err) => {
					// Ne pas bloquer la mise à jour si l'email échoue
					console.error("Erreur envoi email confirmation:", err);
				});
			}

			if (["CANCELLED_BY_CUSTOMER", "CANCELLED_BY_ADMIN"].includes(status)) {
				updateData.cancelledAt = new Date();
				updateData.cancellationReason = cancellationReason || null;
				await sendCancellationEmail({
					guestFirstName: reservation.guestFirstName,
					guestEmail: reservation.guestEmail,
					date: reservation.date,
					timeSlot: reservation.timeSlot,
					cancellationReason,
				});
			}

			if (status === "COMPLETED") updateData.completedAt = new Date();
		}

		if (notes !== undefined) updateData.notes = notes;

		const updated = await prisma.reservation.update({ where: { id: id }, data: updateData });
		return NextResponse.json({ data: updated });
	} catch (error) {
		console.error(error);
		return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
	}
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	try {
		await prisma.reservation.delete({ where: { id: id } });
		return NextResponse.json({ message: "Réservation supprimée" });
	} catch { return NextResponse.json({ error: "Erreur interne" }, { status: 500 }); }
}
