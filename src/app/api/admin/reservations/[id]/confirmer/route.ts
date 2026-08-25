import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay } from "date-fns";
import { sendReservationConfirmation } from "@/services/email.service";
import { createAdminNotification, broadcastReservationUpdate } from "@/services/notification.service";

export async function PATCH(
	request: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	const { id } = await params;
	try {
		const body = await request.json();
		const { tableId, adminNotes } = body;

		if (!tableId) {
			return NextResponse.json(
				{ error: "tableId est requis" },
				{ status: 400 }
			);
		}

		const reservation = await prisma.reservation.findUnique({
			where: { id },
			include: { payment: true },
		});

		if (!reservation) {
			return NextResponse.json({ error: "Réservation introuvable" }, { status: 404 });
		}

		if (reservation.status !== "PENDING") {
			return NextResponse.json(
				{ error: `Impossible de confirmer une réservation au statut ${reservation.status}` },
				{ status: 422 }
			);
		}

		const table = await prisma.table.findUnique({ where: { id: tableId } });
		if (!table || !table.isActif) {
			return NextResponse.json(
				{ error: "Table introuvable ou inactive" },
				{ status: 404 }
			);
		}

		if (reservation.covers > table.capaciteMax) {
			return NextResponse.json(
				{
					error: `Table ${table.numero} insuffisante : ${table.capaciteMax} couverts max pour ${reservation.covers} demandés`,
				},
				{ status: 422 }
			);
		}

		const dayStart = startOfDay(reservation.date);
		const dayEnd = endOfDay(reservation.date);

		const blocage = await prisma.tableBlocage.findFirst({
			where: {
				tableId,
				date: { gte: dayStart, lte: dayEnd },
			},
		});
		if (blocage) {
			return NextResponse.json(
				{ error: `Table ${table.numero} bloquée ce jour (${blocage.motif || "aucun motif"})` },
				{ status: 409 }
			);
		}

		const conflict = await prisma.reservation.findFirst({
			where: {
				tableId,
				date: { gte: dayStart, lte: dayEnd },
				status: { in: ["PENDING", "CONFIRMED"] },
				NOT: { id },
			},
		});
		if (conflict) {
			return NextResponse.json(
				{
					error: `Table ${table.numero} déjà occupée sur ce créneau (${conflict.timeSlot})`,
				},
				{ status: 409 }
			);
		}

		const updated = await prisma.reservation.update({
			where: { id },
			data: {
				status: "CONFIRMED",
				confirmedAt: new Date(),
				autoCancelDeadline: null,
				tableId,
				tableAssignedAt: new Date(),
				adminNotes: adminNotes || null,
			},
		});

		sendReservationConfirmation({
			id: updated.id,
			guestFirstName: updated.guestFirstName,
			guestLastName: updated.guestLastName,
			guestEmail: updated.guestEmail,
			date: updated.date,
			timeSlot: updated.timeSlot,
			covers: updated.covers,
			notes: updated.notes,
		});

		await createAdminNotification({
			type: "reservation_confirmed",
			title: "Réservation confirmée",
			message: `${updated.guestFirstName} ${updated.guestLastName} — Table ${table.numero} (${updated.timeSlot})`,
			link: `/admin/reservations?id=${id}`,
		});

		await broadcastReservationUpdate(id, updated.userId);

		return NextResponse.json({ data: updated });
	} catch (error) {
		console.error("[PATCH /api/admin/reservations/:id/confirmer]", error);
		return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
	}
}
