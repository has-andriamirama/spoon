import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay } from "date-fns";
import type { TableWithStatus, TableStatus, ReservationForPlan } from "@/types";
import type { Table, TableBlocage, Reservation, ZoneTable } from "../../../../../../generated/prisma/client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
	try {
		const { searchParams } = new URL(request.url);
		const dateParam = searchParams.get("date");

		const targetDate = dateParam ? new Date(dateParam) : new Date();
		const dayStart = startOfDay(targetDate);
		const dayEnd = endOfDay(targetDate);

		const tables = await prisma.table.findMany({
			orderBy: [{ zone: "asc" }, { numero: "asc" }],
		});

		const blocages = await prisma.tableBlocage.findMany({
			where: {
				date: { gte: dayStart, lte: dayEnd },
			},
		});

		const reservations = await prisma.reservation.findMany({
			where: {
				date: { gte: dayStart, lte: dayEnd },
				status: { in: ["PENDING", "CONFIRMED", "NO_SHOW"] },
			},
			include: {
				table: true,
				user: { select: { id: true, firstName: true, lastName: true, email: true } },
			},
			orderBy: { timeSlot: "asc" },
		});

		const tablesWithStatus: TableWithStatus[] = tables.map((table) => {
			if (!table.isActif) {
				return { ...table, status: "INACTIVE" as TableStatus, reservation: null, blocage: null };
			}

			const blocage = blocages.find((b) => b.tableId === table.id);
			if (blocage) {
				return {
					...table,
					status: "BLOQUEE" as TableStatus,
					reservation: null,
					blocage: {
						id: blocage.id,
						motif: blocage.motif,
						heureDebut: blocage.heureDebut,
						heureFin: blocage.heureFin,
					},
				};
			}

			const resa = reservations.find(
				(r) =>
					r.tableId === table.id &&
					["PENDING", "CONFIRMED"].includes(r.status)
			);

			if (resa) {
				const status: TableStatus =
					resa.status === "CONFIRMED" ? "CONFIRMEE" : "EN_ATTENTE";
				return {
					...table,
					status,
					reservation: {
						id: resa.id,
						guestNom: `${resa.guestFirstName} ${resa.guestLastName}`,
						heure: resa.timeSlot,
						covers: resa.covers,
						status: resa.status,
						occasion: resa.occasion,
					},
					blocage: null,
				};
			}

			return { ...table, status: "LIBRE" as TableStatus, reservation: null, blocage: null };
		});

		const pending = reservations.filter((r) => r.status === "PENDING") as ReservationForPlan[];
		const confirmed = reservations.filter((r) => r.status === "CONFIRMED") as ReservationForPlan[];
		const noShow = reservations.filter((r) => r.status === "NO_SHOW") as ReservationForPlan[];

		const libres = tablesWithStatus.filter((t) => t.status === "LIBRE" && t.isActif).length;
		const bloquees = tablesWithStatus.filter((t) => t.status === "BLOQUEE").length;
		const totalCovers = confirmed.reduce((sum, r) => sum + r.covers, 0) +
			pending.reduce((sum, r) => sum + r.covers, 0);

		return NextResponse.json({
			data: {
				tables: tablesWithStatus,
				pending,
				confirmed,
				noShow,
				stats: {
					pending: pending.length,
					confirmed: confirmed.length,
					libres,
					bloquees,
					noShow: noShow.length,
					totalCovers,
				},
			},
		});
	} catch (error) {
		console.error("[GET /api/admin/plan]", error);
		return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
	}
}
