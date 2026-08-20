import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay, format } from "date-fns";
import { fr } from "date-fns/locale";
import Link from "next/link";
import { ChevronLeft, ChevronRight, List, TableProperties } from "lucide-react";
import PlanDeSalleClient from "@/components/admin/plan-de-salle-client";
import PlanDatePicker from "@/components/admin/plan-date-picker";
import type {
	TableWithStatus, TableStatus, PlanDeSalleData,
	ReservationForPlan, ServiceOrderSnapshot,
} from "@/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Plan de salle — Spoon Admin" };

function offsetDate(dateStr: string, days: number): string {
	const d = new Date(dateStr);
	d.setDate(d.getDate() + days);
	return d.toISOString().split("T")[0];
}

export default async function PlanDeSallePage({
	searchParams,
}: {
	searchParams: Promise<{ date?: string }>;
}) {
	const { date: dateParam } = await searchParams;

	const today   = new Date().toISOString().split("T")[0];
	const dateStr = dateParam || today;
	const targetDate = new Date(dateStr);
	const dayStart   = startOfDay(targetDate);
	const dayEnd     = endOfDay(targetDate);

	const datePrev = offsetDate(dateStr, -1);
	const dateNext = offsetDate(dateStr, 1);

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
		prisma.serviceOrder.findMany({
			where: { status: { in: ["OUVERTE", "ADDITION_DEMANDEE"] } },
			include: { _count: { select: { items: true } } },
		}),
	]);

	const tablesWithStatus: TableWithStatus[] = tables.map((table) => {
		if (!table.isActif) {
			return { ...table, status: "INACTIVE" as TableStatus, reservation: null, blocage: null, serviceOrder: null };
		}

		const blocage = blocages.find((b) => b.tableId === table.id);
		if (blocage) {
			return {
				...table,
				status: "BLOQUEE" as TableStatus,
				reservation: null,
				blocage: { id: blocage.id, motif: blocage.motif, heureDebut: blocage.heureDebut, heureFin: blocage.heureFin },
				serviceOrder: null,
			};
		}

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
			const status: TableStatus = svcOrder.status === "ADDITION_DEMANDEE" ? "ADDITION" : "EN_SERVICE";
			return { ...table, status, reservation: null, blocage: null, serviceOrder: snapshot };
		}

		const resa = reservations.find(
			(r) => r.tableId === table.id && ["PENDING", "CONFIRMED"].includes(r.status)
		);
		if (resa) {
			const status: TableStatus = resa.status === "CONFIRMED" ? "CONFIRMEE" : "EN_ATTENTE";
			const depositAmount = resa.payment?.status === "PAID" ? resa.payment.amount : null;
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

		return { ...table, status: "LIBRE" as TableStatus, reservation: null, blocage: null, serviceOrder: null };
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

	const initialData: PlanDeSalleData = {
		tables: tablesWithStatus,
		pending,
		confirmed,
		noShow,
		stats: { pending: pending.length, confirmed: confirmed.length, libres, bloquees, noShow: noShow.length, totalCovers, enService, addition },
	};

	const dateLabel = format(targetDate, "EEEE d MMMM yyyy", { locale: fr });
	const noTables  = tables.length === 0;

	return (
		<div>
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
				<div>
					<h1 className="font-display text-3xl text-[#F5F0EB]">Plan de salle</h1>
					<p className="text-sm text-[#5A5249] mt-0.5 capitalize">{dateLabel}</p>
				</div>

				<div className="flex items-center gap-3 flex-wrap">
					<div className="flex items-center gap-0 bg-[#141414] border border-[#222] rounded-xl overflow-hidden">
						<Link
							href={`/admin/reservations/plan?date=${datePrev}`}
							className="p-2.5 text-[#5A5249] hover:text-[#F5F0EB] hover:bg-[#1e1e1e] transition-colors"
						>
							<ChevronLeft size={16} />
						</Link>
						<Link
							href={`/admin/reservations/plan?date=${today}`}
							className="px-3 py-2 text-xs text-[#9A8F84] hover:text-[#C8973A] transition-colors font-medium border-x border-[#222]"
						>
							Aujourd&apos;hui
						</Link>
						<Link
							href={`/admin/reservations/plan?date=${dateNext}`}
							className="p-2.5 text-[#5A5249] hover:text-[#F5F0EB] hover:bg-[#1e1e1e] transition-colors"
						>
							<ChevronRight size={16} />
						</Link>
					</div>

					<PlanDatePicker value={dateStr} />

					<div className="flex items-center gap-3">
						<Link
							href="/admin/reservations"
							className="flex items-center gap-1.5 text-xs text-[#5A5249] hover:text-[#C8973A] transition-colors"
						>
							<List size={14} />
							Liste
						</Link>
						<Link
							href="/admin/tables"
							className="flex items-center gap-1.5 text-xs text-[#5A5249] hover:text-[#C8973A] transition-colors"
						>
							<TableProperties size={14} />
							Tables
						</Link>
					</div>
				</div>
			</div>

			{noTables && (
				<div className="mb-6 bg-yellow-950/20 border border-yellow-900/40 rounded-xl p-4 flex items-start gap-3">
					<TableProperties size={18} className="text-yellow-500 shrink-0 mt-0.5" />
					<div>
						<p className="text-sm font-medium text-yellow-400">Aucune table configurée</p>
						<p className="text-xs text-yellow-600/70 mt-1">
							Commencez par créer vos tables physiques pour utiliser le plan de salle.
						</p>
						<Link
							href="/admin/tables"
							className="inline-flex items-center gap-1 mt-2 text-xs text-[#C8973A] hover:underline"
						>
							Gérer les tables <ChevronRight size={12} />
						</Link>
					</div>
				</div>
			)}

			<PlanDeSalleClient initialData={initialData} date={dateStr} />
		</div>
	);
}
