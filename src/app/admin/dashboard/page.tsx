import { prisma } from "@/lib/prisma";
import { formatPrice, formatDate } from "@/lib/utils";
import { Calendar, Users, TrendingUp, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { RESERVATION_STATUSES } from "@/lib/constants";
import { startOfDay, endOfDay, startOfMonth, endOfMonth } from "date-fns";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard" };

export default async function AdminDashboardPage() {
	const today = new Date();
	const [todayRes, pendingRes, monthPayments, recentRes] = await Promise.all([
		prisma.reservation.findMany({ where: { date: { gte: startOfDay(today), lte: endOfDay(today) }, status: { in: ["PENDING","CONFIRMED"] } } }),
		prisma.reservation.count({ where: { status: "PENDING" } }),
		prisma.payment.aggregate({ where: { status: "PAID", paidAt: { gte: startOfMonth(today), lte: endOfMonth(today) } }, _sum: { amount: true } }),
		prisma.reservation.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { payment: true } }),
	]);

	const todayCovers = todayRes.reduce((s, r) => s + r.covers, 0);
	const monthRevenue = monthPayments._sum.amount || 0;

	const stats = [
		{ label: "Réservations aujourd'hui", value: todayRes.length, sub: `${todayCovers} couverts`, icon: Calendar, color: "text-[#C8973A]" },
		{ label: "En attente de confirmation", value: pendingRes, sub: "Nécessitent une action", icon: AlertCircle, color: "text-yellow-400" },
		{ label: "Chiffre d'affaires (mois)", value: formatPrice(monthRevenue), sub: "Acomptes reçus", icon: TrendingUp, color: "text-green-400" },
		{ label: "Couverts ce jour", value: todayCovers, sub: `${todayRes.length} tables`, icon: Users, color: "text-blue-400" },
	];

	return (
		<div>
			<div className="mb-8">
				<p className="text-[#5A5249] text-sm">{formatDate(today, "EEEE d MMMM yyyy")}</p>
				<h1 className="font-display text-3xl text-[#F5F0EB]">Bonjour 👋</h1>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
				{stats.map(({ label, value, sub, icon: Icon, color }) => (
					<div key={label} className="bg-[#141414] border border-[#222] rounded-xl p-5">
						<div className="flex items-start justify-between mb-4">
							<p className="text-sm text-[#5A5249]">{label}</p>
							<Icon size={18} className={color} />
						</div>
						<p className="font-display text-3xl text-[#F5F0EB] font-semibold mb-1">{value}</p>
						<p className="text-xs text-[#5A5249]">{sub}</p>
					</div>
				))}
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<div className="bg-[#141414] border border-[#222] rounded-xl p-6">
					<div className="flex items-center justify-between mb-5">
						<h2 className="font-display text-lg text-[#F5F0EB]">Planning du jour</h2>
						<Link href="/admin/reservations/calendar" className="text-xs text-[#C8973A] hover:underline">Voir le calendrier</Link>
					</div>
					{todayRes.length === 0 ? (
						<p className="text-[#5A5249] text-sm py-8 text-center">Aucune réservation aujourd'hui</p>
					) : (
						<div className="space-y-3">
							{todayRes.sort((a,b) => a.timeSlot.localeCompare(b.timeSlot)).map(r => (
								<div key={r.id} className="flex items-center justify-between py-2 border-b border-[#1a1a1a] last:border-0">
									<div>
										<p className="text-sm text-[#F5F0EB] font-medium">{r.guestFirstName} {r.guestLastName}</p>
										<p className="text-xs text-[#5A5249]">{r.timeSlot} · {r.covers} couvert{r.covers > 1 ? "s" : ""}</p>
									</div>
									<Badge variant={r.status === "CONFIRMED" ? "green" : "yellow"}>{RESERVATION_STATUSES[r.status].label}</Badge>
								</div>
							))}
						</div>
					)}
				</div>

				<div className="bg-[#141414] border border-[#222] rounded-xl p-6">
					<div className="flex items-center justify-between mb-5">
						<h2 className="font-display text-lg text-[#F5F0EB]">Dernières réservations</h2>
						<Link href="/admin/reservations" className="text-xs text-[#C8973A] hover:underline">Tout voir</Link>
					</div>
					<div className="space-y-3">
						{recentRes.map(r => (
							<Link key={r.id} href={`/admin/reservations?id=${r.id}`} className="flex items-center justify-between py-2 border-b border-[#1a1a1a] last:border-0 hover:opacity-80 transition-opacity">
								<div>
									<p className="text-sm text-[#F5F0EB] font-medium">{r.guestFirstName} {r.guestLastName}</p>
									<p className="text-xs text-[#5A5249]">{formatDate(r.date)} · {r.timeSlot} · {r.covers} couvert{r.covers > 1 ? "s" : ""}</p>
								</div>
								<Badge variant={r.status === "CONFIRMED" ? "green" : r.status === "PENDING" ? "yellow" : "red"}>{RESERVATION_STATUSES[r.status].label}</Badge>
							</Link>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}
