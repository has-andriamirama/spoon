import { prisma } from "@/lib/prisma";
import { formatPrice, formatDate } from "@/lib/utils";
import { Calendar, Users, TrendingUp, AlertCircle, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { RESERVATION_STATUSES } from "@/lib/constants";
import {
	startOfDay, endOfDay, startOfMonth, endOfMonth,
	subDays, subMonths, eachDayOfInterval, format,
} from "date-fns";
import { fr } from "date-fns/locale";
import Link from "next/link";

import StatCard from "@/components/admin/dashboard/stat-card";
import RevenueChart from "@/components/admin/dashboard/revenue-chart";
import ActivityFeed, { ActivityItem } from "@/components/admin/dashboard/activity-feed";
import HourlyPlanning from "@/components/admin/dashboard/hourly-planning";
import TopDishes from "@/components/admin/dashboard/top-dishes";
import TableOccupancyGrid, { TableOccupancyStatus } from "@/components/admin/dashboard/table-occupancy-grid";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard" };

// Créneaux affichés dans le planning du jour (adapter aux horaires réels du restaurant)
const DAY_SLOTS = ["12:00", "12:30", "13:00", "13:30", "19:00", "19:30", "20:00", "20:30", "21:00", "21:30", "22:00"];

function greeting() {
	const h = new Date().getHours();
	if (h < 12) return "Bonjour";
	if (h < 18) return "Bon après-midi";
	return "Bonsoir";
}

export default async function AdminDashboardPage() {
	const today = new Date();
	const sevenDaysAgo = subDays(today, 6);
	const thirtyDaysAgo = subDays(today, 29);
	const monthStart = startOfMonth(today);
	const monthEnd = endOfMonth(today);
	const lastMonthStart = startOfMonth(subMonths(today, 1));
	const lastMonthEnd = endOfMonth(subMonths(today, 1));
	const yesterday = subDays(today, 1);

	const [
		todayRes,
		yesterdayResCount,
		pendingRes,
		monthPayments,
		lastMonthPayments,
		totalCustomers,
		recentRes,
		last30DaysPayments,
		reservationsLast7Raw,
		topDishesRaw,
		tables,
		activeServiceOrders,
		recentPayments,
		recentServiceOrders,
	] = await Promise.all([
		prisma.reservation.findMany({
			where: { date: { gte: startOfDay(today), lte: endOfDay(today) }, status: { in: ["PENDING", "CONFIRMED"] } },
		}),
		prisma.reservation.count({
			where: { date: { gte: startOfDay(yesterday), lte: endOfDay(yesterday) }, status: { in: ["PENDING", "CONFIRMED", "COMPLETED"] } },
		}),
		prisma.reservation.count({ where: { status: "PENDING" } }),
		prisma.payment.aggregate({ where: { status: "PAID", paidAt: { gte: monthStart, lte: monthEnd } }, _sum: { amount: true } }),
		prisma.payment.aggregate({ where: { status: "PAID", paidAt: { gte: lastMonthStart, lte: lastMonthEnd } }, _sum: { amount: true } }),
		prisma.user.count({ where: { isActive: true } }),
		prisma.reservation.findMany({ orderBy: { createdAt: "desc" }, take: 6, include: { payment: true } }),
		prisma.payment.findMany({
			where: { status: "PAID", paidAt: { gte: startOfDay(thirtyDaysAgo) } },
			select: { amount: true, paidAt: true },
		}),
		prisma.reservation.findMany({
			where: { date: { gte: startOfDay(sevenDaysAgo), lte: endOfDay(today) }, status: { in: ["PENDING", "CONFIRMED", "COMPLETED"] } },
			select: { date: true },
		}),
		prisma.serviceOrderItem.groupBy({
			by: ["dishName"],
			where: { createdAt: { gte: startOfDay(thirtyDaysAgo) } },
			_sum: { qty: true },
			orderBy: { _sum: { qty: "desc" } },
			take: 5,
		}),
		prisma.table.findMany({ where: { isActif: true }, orderBy: { numero: "asc" } }),
		prisma.serviceOrder.findMany({ where: { status: { in: ["OUVERTE", "ADDITION_DEMANDEE"] } }, select: { tableId: true, status: true } }),
		prisma.payment.findMany({ where: { status: "PAID" }, orderBy: { paidAt: "desc" }, take: 4, include: { reservation: true } }),
		prisma.serviceOrder.findMany({ orderBy: { openedAt: "desc" }, take: 4, select: { id: true, guestName: true, covers: true, openedAt: true, status: true } }),
	]);

	// --- KPIs ---
	const todayCovers = todayRes.reduce((s, r) => s + r.covers, 0);
	const monthRevenue = monthPayments._sum.amount || 0;
	const lastMonthRevenue = lastMonthPayments._sum.amount || 0;
	const revenueTrend = lastMonthRevenue > 0 ? ((monthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;
	const resTrend = yesterdayResCount > 0 ? ((todayRes.length - yesterdayResCount) / yesterdayResCount) * 100 : 0;

	// --- Sparkline réservations (7 derniers jours) ---
	const days7 = eachDayOfInterval({ start: sevenDaysAgo, end: today });
	const resSparklineValues = days7.map((d) => {
		const key = format(d, "yyyy-MM-dd");
		return reservationsLast7Raw.filter((r) => format(new Date(r.date), "yyyy-MM-dd") === key).length;
	});

	// --- Graphique revenus 7j / 30j ---
	const buildRevenueSeries = (days: Date[]) =>
		days.map((d) => {
			const key = format(d, "yyyy-MM-dd");
			const sum = last30DaysPayments
				.filter((p) => p.paidAt && format(new Date(p.paidAt), "yyyy-MM-dd") === key)
				.reduce((s, p) => s + p.amount, 0);
			return { label: format(d, "EEE d", { locale: fr }), value: Math.round(sum) };
		});
	const last7Days = buildRevenueSeries(days7);
	const days30 = eachDayOfInterval({ start: thirtyDaysAgo, end: today });
	const last30Days = buildRevenueSeries(days30);

	// --- Planning du jour par créneau ---
	const slotCounts = DAY_SLOTS.map((slot) => ({
		label: slot.replace(":00", "h").replace(":30", "h30"),
		count: todayRes.filter((r) => r.timeSlot === slot).length,
	}));

	// --- Plats populaires ---
	const topDishes = topDishesRaw.map((d) => ({ name: d.dishName, qty: d._sum.qty || 0 }));

	// --- Occupation des tables ---
	const busyMap = new Map<string, TableOccupancyStatus>();
	activeServiceOrders.forEach((so) => {
		busyMap.set(so.tableId, so.status === "ADDITION_DEMANDEE" ? "addition" : "occupee");
	});
	const tableItems = tables.map((t) => ({
		id: t.id,
		numero: t.numero,
		status: busyMap.get(t.id) || ("libre" as TableOccupancyStatus),
	}));

	// --- Flux d'activité récente ---
	const activity: ActivityItem[] = [
		...recentRes.slice(0, 3).map((r) => ({
			id: `res-${r.id}`,
			type: "reservation" as const,
			text: `Nouvelle réservation — ${r.guestFirstName} ${r.guestLastName}`,
			date: r.createdAt,
		})),
		...recentPayments.slice(0, 3).map((p) => ({
			id: `pay-${p.id}`,
			type: "payment" as const,
			text: `Acompte reçu — ${p.reservation.guestFirstName} ${p.reservation.guestLastName}`,
			date: p.paidAt || p.createdAt,
		})),
		...recentServiceOrders.slice(0, 3).map((so) => ({
			id: `so-${so.id}`,
			type: "service" as const,
			text: `Table ouverte — ${so.guestName} (${so.covers} couverts)`,
			date: so.openedAt,
		})),
	]
		.sort((a, b) => b.date.getTime() - a.date.getTime())
		.slice(0, 6);

	const stats = [
		{
			label: "Réservations aujourd'hui",
			value: todayRes.length,
			sub: `${todayCovers} couverts`,
			icon: Calendar,
			color: "text-[#C8973A]",
			hex: "#C8973A",
			trend: Math.round(resTrend),
			sparkline: resSparklineValues,
		},
		{
			label: "En attente de confirmation",
			value: pendingRes,
			sub: "Nécessitent une action",
			icon: AlertCircle,
			color: "text-yellow-400",
			hex: "#EF9F27",
			progress: Math.min(100, pendingRes * 20),
		},
		{
			label: "Chiffre d'affaires (mois)",
			value: formatPrice(monthRevenue),
			sub: "Acomptes reçus",
			icon: TrendingUp,
			color: "text-green-400",
			hex: "#639922",
			trend: Math.round(revenueTrend),
			sparkline: last7Days.map((d) => d.value),
		},
		{
			label: "Clients actifs",
			value: totalCustomers,
			sub: `${tableItems.filter((t) => t.status !== "libre").length}/${tableItems.length} tables occupées`,
			icon: Users,
			color: "text-blue-400",
			hex: "#378ADD",
			progress: tableItems.length > 0 ? (tableItems.filter((t) => t.status !== "libre").length / tableItems.length) * 100 : 0,
		},
	];

	return (
		<div>
			<div className="flex items-end justify-between gap-3 flex-wrap mb-6 sm:mb-8">
				<div>
					<p className="text-[#5A5249] text-sm capitalize">{formatDate(today, "EEEE d MMMM yyyy")}</p>
					<h1 className="font-display text-2xl sm:text-3xl text-[#F5F0EB]">{greeting()} 👋</h1>
				</div>
				<Link
					href="/admin/reservations/new"
					className="inline-flex items-center gap-1.5 bg-[#C8973A] hover:bg-[#E8B04A] text-[#0A0A0A] text-sm font-medium px-3.5 py-2 rounded-lg transition-colors shrink-0"
				>
					<Plus size={16} />
					Réservation
				</Link>
			</div>

			<div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
				{stats.map((s) => (
					<StatCard key={s.label} {...s} />
				))}
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6">
				<div className="lg:col-span-2 min-w-0">
					<RevenueChart last7Days={last7Days} last30Days={last30Days} />
				</div>
				<ActivityFeed items={activity} />
			</div>

			<div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6">
				<HourlyPlanning slots={slotCounts} />
				<TopDishes dishes={topDishes} />
				<TableOccupancyGrid tables={tableItems} />
			</div>

			<div className="bg-[#141414] border border-[#222] rounded-2xl p-6">
				<div className="flex items-center justify-between mb-5">
					<h2 className="font-display text-lg text-[#F5F0EB]">Dernières réservations</h2>
					<Link href="/admin/reservations" className="text-xs text-[#C8973A] hover:underline">
						Tout voir
					</Link>
				</div>
				<div className="space-y-3">
					{recentRes.length === 0 ? (
						<p className="text-[#5A5249] text-sm py-8 text-center">Aucune réservation récente</p>
					) : (
						recentRes.map((r) => (
							<Link
								key={r.id}
								href={`/admin/reservations?id=${r.id}`}
								className="flex items-center justify-between py-2 border-b border-[#1a1a1a] last:border-0 hover:opacity-80 transition-opacity"
							>
								<div className="min-w-0">
									<p className="text-sm text-[#F5F0EB] font-medium truncate">
										{r.guestFirstName} {r.guestLastName}
									</p>
									<p className="text-xs text-[#5A5249]">
										{formatDate(r.date)} · {r.timeSlot} · {r.covers} couvert{r.covers > 1 ? "s" : ""}
									</p>
								</div>
								<Badge
									variant={r.status === "CONFIRMED" ? "green" : r.status === "PENDING" ? "yellow" : "red"}
									className="shrink-0 ml-3"
								>
									{RESERVATION_STATUSES[r.status].label}
								</Badge>
							</Link>
						))
					)}
				</div>
			</div>
		</div>
	);
}
