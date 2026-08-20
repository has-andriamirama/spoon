import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay } from "date-fns";
import type {
	TableWithStatus,
	TableStatus,
	ReservationForPlan,
	ServiceOrderSnapshot,
} from "@/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
	try {
		const { searchParams } = new URL(request.url);
		const dateParam = searchParams.get("date");

		const targetDate = dateParam ? new Date(dateParam) : new Date();
		const dayStart   = startOfDay(targetDate);
		const dayEnd     = endOfDay(targetDate);

		const [tables, blocages, reservations, serviceOrders] = await Promise.all([
			prisma.table.findMany({
				orderBy: [{ zone: "asc" }, { numero: "asc" }],
			}),
			prisma.tableBlocage.findMany({
				where: { date: { gte: dayStart, lte: dayEnd } },
			}),
			prisma.reservation.findMany({
				where: {
					date: { gte: dayStart, lte: dayEnd },
					status: { in: ["PENDING", "CONFIRMED", "NO_SHOW"] },
				},
				include: {
					table: true,
					user: { select: { id: true, firstName: true, lastName: true, email: true } },
					payment: { select: { amount: true, type: true, status: true } },
				},
				orderBy: { timeSlot: "asc" },
			}),
			// Commandes de service actives (ouvertes ou en attente de paiement)
			prisma.serviceOrder.findMany({
				where: {
					status: { in: ["OUVERTE", "ADDITION_DEMANDEE"] },
				},
				include: {
					_count: { select: { items: true } },
				},
			}),
		]);

		const tablesWithStatus: TableWithStatus[] = tables.map((table) => {
			if (!table.isActif) {
				return {
					...table,
					status: "INACTIVE" as TableStatus,
					reservation: null,
					blocage: null,
					serviceOrder: null,
				};
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
					serviceOrder: null,
				};
			}

			// Commande de service active sur cette table (priorité sur la réservation)
			const svcOrder = serviceOrders.find((o) => o.tableId === table.id);
			if (svcOrder) {
				const snapshot: ServiceOrderSnapshot = {
					id: svcOrder.id,
					guestName: svcOrder.guestName,
					covers: svcOrder.covers,
					totalAmount: svcOrder.totalAmount,
					depositDeducted: svcOrder.depositDeducted,
					type: svcOrder.type,
					itemCount: svcOrder._count.items,
					status: svcOrder.status,
				};
				const status: TableStatus =
					svcOrder.status === "ADDITION_DEMANDEE" ? "ADDITION" : "EN_SERVICE";
				return {
					...table,
					status,
					reservation: null,
					blocage: null,
					serviceOrder: snapshot,
				};
			}

			const resa = reservations.find(
				(r) => r.tableId === table.id && ["PENDING", "CONFIRMED"].includes(r.status)
			);

			if (resa) {
				const status: TableStatus =
					resa.status === "CONFIRMED" ? "CONFIRMEE" : "EN_ATTENTE";
				const depositAmount =
					resa.payment?.status === "PAID" ? resa.payment.amount : null;
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
						depositAmount,
					},
					blocage: null,
					serviceOrder: null,
				};
			}

			return {
				...table,
				status: "LIBRE" as TableStatus,
				reservation: null,
				blocage: null,
				serviceOrder: null,
			};
		});

		const pending   = reservations.filter((r) => r.status === "PENDING")   as unknown as ReservationForPlan[];
		const confirmed = reservations.filter((r) => r.status === "CONFIRMED") as unknown as ReservationForPlan[];
		const noShow    = reservations.filter((r) => r.status === "NO_SHOW")   as unknown as ReservationForPlan[];

		const libres    = tablesWithStatus.filter((t) => t.status === "LIBRE"       && t.isActif).length;
		const bloquees  = tablesWithStatus.filter((t) => t.status === "BLOQUEE").length;
		const enService = tablesWithStatus.filter((t) => t.status === "EN_SERVICE").length;
		const addition  = tablesWithStatus.filter((t) => t.status === "ADDITION").length;

		const totalCovers =
			confirmed.reduce((s, r) => s + r.covers, 0) +
			pending.reduce((s, r) => s + r.covers, 0);

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
					enService,
					addition,
				},
			},
		});
	} catch (error) {
		console.error("[GET /api/admin/plan]", error);
		return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
	}
}
