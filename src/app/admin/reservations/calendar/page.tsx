import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { RESERVATION_STATUSES } from "@/lib/constants";
import { addDays, startOfWeek, format } from "date-fns";
import { fr } from "date-fns/locale";

export const dynamic = "force-dynamic";
export const metadata = { title: "Calendrier des réservations" };

export default async function AdminReservationsCalendarPage({
	searchParams,
}: {
	searchParams: Promise<{ week?: string }>;
}) {
	const { week } = await searchParams;

	const baseDate = week ? new Date(week) : new Date();
	const weekStart = startOfWeek(baseDate, { weekStartsOn: 1 });
	const weekEnd = addDays(weekStart, 6);

	const reservations = await prisma.reservation.findMany({
		where: {
			date: { gte: weekStart, lte: weekEnd },
			status: { in: ["PENDING", "CONFIRMED"] },
		},
		orderBy: [{ date: "asc" }, { timeSlot: "asc" }],
	});

	const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
	const prevWeek = format(addDays(weekStart, -7), "yyyy-MM-dd");
	const nextWeek = format(addDays(weekStart, 7), "yyyy-MM-dd");
	const variantMap: Record<string, "yellow" | "green" | "red" | "gray" | "orange"> = {
		yellow: "yellow",
		green: "green",
		red: "red",
		gray: "gray",
	};

	return (
		<div>
			<div className="flex items-center justify-between mb-6">
				<h1 className="font-display text-3xl text-[#F5F0EB]">Calendrier</h1>
				<div className="flex items-center gap-3">
					<Link
						href={`/admin/reservations/calendar?week=${prevWeek}`}
						className="px-4 py-2 bg-[#141414] border border-[#222] rounded-lg text-sm text-[#9A8F84] hover:text-[#F5F0EB] transition-colors"
					>
						← Semaine précédente
					</Link>
					<Link
						href={`/admin/reservations/calendar?week=${nextWeek}`}
						className="px-4 py-2 bg-[#141414] border border-[#222] rounded-lg text-sm text-[#9A8F84] hover:text-[#F5F0EB] transition-colors"
					>
						Semaine suivante →
					</Link>
				</div>
			</div>
			<p className="text-[#5A5249] text-sm mb-6">
				Semaine du {format(weekStart, "d MMMM", { locale: fr })} au{" "}
				{format(weekEnd, "d MMMM yyyy", { locale: fr })}
			</p>
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
				{days.map((day) => {
					const dayStr = format(day, "yyyy-MM-dd");
					const dayRes = reservations.filter(
						(r) => format(new Date(r.date), "yyyy-MM-dd") === dayStr
					);
					const isToday =
						format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
					return (
						<div
							key={dayStr}
							className={`bg-[#141414] border rounded-xl p-3 min-h-[120px] ${
								isToday ? "border-[#C8973A]/40" : "border-[#222]"
							}`}
						>
							<div className="mb-2">
								<p
									className={`text-xs font-semibold uppercase tracking-wider ${
										isToday ? "text-[#C8973A]" : "text-[#5A5249]"
									}`}
								>
									{format(day, "EEE", { locale: fr })}
								</p>
								<p
									className={`text-lg font-display font-semibold ${
										isToday ? "text-[#C8973A]" : "text-[#F5F0EB]"
									}`}
								>
									{format(day, "d")}
								</p>
							</div>
							<div className="space-y-1.5">
								{dayRes.length === 0 ? (
									<p className="text-[10px] text-[#333]">Aucune résv.</p>
								) : (
									dayRes.map((r) => (
										<Link
											key={r.id}
											href={`/admin/reservations/${r.id}`}
											className="block p-1.5 bg-[#0A0A0A] rounded-lg hover:bg-[#222] transition-colors"
										>
											<p className="text-[10px] text-[#F5F0EB] font-medium leading-tight">
												{r.timeSlot} · {r.covers}cvts
											</p>
											<p className="text-[10px] text-[#5A5249] truncate">{r.guestLastName}</p>
											<Badge
												variant={variantMap[RESERVATION_STATUSES[r.status].color]}
												className="text-[9px] px-1.5 py-0 mt-0.5"
											>
												{RESERVATION_STATUSES[r.status].label}
											</Badge>
										</Link>
									))
								)}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}
