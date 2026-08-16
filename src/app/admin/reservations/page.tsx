import { prisma } from "@/lib/prisma";
import { formatDate, formatPrice } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { RESERVATION_STATUSES, PAYMENT_STATUSES } from "@/lib/constants";
import Link from "next/link";
import { Search } from "lucide-react";
import AdminReservationsRealtimeUpdater from "./realtime-updater";

export const dynamic = "force-dynamic";
export const metadata = { title: "Réservations" };

export default async function AdminReservationsPage({
	searchParams,
}: {
	searchParams: Promise<{ status?: string; date?: string }>;
}) {
	const { status, date } = await searchParams;

	const where: Record<string, unknown> = {};
	if (status) where.status = status;
	if (date) {
		const d = new Date(date);
		where.date = {
			gte: new Date(new Date(d).setHours(0, 0, 0, 0)),
			lte: new Date(new Date(d).setHours(23, 59, 59, 999)),
		};
	}

	const reservations = await prisma.reservation.findMany({
		where,
		include: { payment: true },
		orderBy: [{ date: "desc" }, { timeSlot: "asc" }],
		take: 100,
	});

	const variantMap: Record<string, "yellow" | "green" | "red" | "gray" | "orange"> = {
		yellow: "yellow",
		green: "green",
		red: "red",
		gray: "gray",
		orange: "orange",
	};

	return (
		<div>
			<AdminReservationsRealtimeUpdater />

			<div className="flex items-center justify-between mb-6">
				<h1 className="font-display text-3xl text-[#F5F0EB]">Réservations</h1>
				<Link href="/admin/reservations/calendar" className="text-sm text-[#C8973A] hover:underline">
					Vue calendrier
				</Link>
			</div>

			<div className="bg-[#141414] border border-[#222] rounded-xl p-4 mb-6 flex flex-wrap gap-4">
				<form className="flex flex-wrap gap-3 items-end">
					<div>
						<label className="text-xs text-[#5A5249] block mb-1">Date</label>
						<input
							type="date"
							name="date"
							defaultValue={date}
							className="h-9 px-3 rounded-lg bg-[#0A0A0A] border border-[#222] text-sm text-[#F5F0EB] focus:border-[#C8973A] focus:outline-none"
						/>
					</div>
					<div>
						<label className="text-xs text-[#5A5249] block mb-1">Statut</label>
						<select
							name="status"
							defaultValue={status || ""}
							className="h-9 px-3 rounded-lg bg-[#0A0A0A] border border-[#222] text-sm text-[#F5F0EB] focus:border-[#C8973A] focus:outline-none"
						>
							<option value="">Tous</option>
							{Object.entries(RESERVATION_STATUSES).map(([k, v]) => (
								<option key={k} value={k}>{v.label}</option>
							))}
						</select>
					</div>
					<button
						type="submit"
						className="h-9 px-4 bg-[#222] hover:bg-[#333] text-[#9A8F84] hover:text-[#F5F0EB] rounded-lg text-sm transition-colors flex items-center gap-2"
					>
						<Search size={14} /> Filtrer
					</button>
					<Link
						href="/admin/reservations"
						className="h-9 px-4 text-[#5A5249] hover:text-[#9A8F84] rounded-lg text-sm transition-colors flex items-center"
					>
						Réinitialiser
					</Link>
				</form>
			</div>

			<div className="bg-[#141414] border border-[#222] rounded-xl overflow-hidden">
				{reservations.length === 0 ? (
					<p className="text-center py-16 text-[#5A5249]">Aucune réservation trouvée</p>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full">
							<thead>
								<tr className="border-b border-[#222]">
									{["Client", "Date", "Heure", "Couverts", "Statut", "Paiement", ""].map((h) => (
										<th
											key={h}
											className="text-left px-5 py-3.5 text-xs font-semibold text-[#5A5249] uppercase tracking-wider"
										>
											{h}
										</th>
									))}
								</tr>
							</thead>
							<tbody className="divide-y divide-[#1a1a1a]">
								{reservations.map((r) => {
									const st = RESERVATION_STATUSES[r.status];
									const pst = PAYMENT_STATUSES[r.payment ? r.payment.status : NONE];
									return (
										<tr key={r.id} className="hover:bg-[#1a1a1a] transition-colors">
											<td className="px-5 py-4">
												<p className="text-sm text-[#F5F0EB] font-medium">
													{r.guestFirstName} {r.guestLastName}
												</p>
												<p className="text-xs text-[#5A5249]">{r.guestEmail}</p>
											</td>
											<td className="px-5 py-4 text-sm text-[#9A8F84] whitespace-nowrap">
												{formatDate(r.date, "dd/MM/yyyy")}
											</td>
											<td className="px-5 py-4 text-sm text-[#9A8F84]">{r.timeSlot}</td>
											<td className="px-5 py-4 text-sm text-[#9A8F84]">{r.covers}</td>
											<td className="px-5 py-4">
												<Badge variant={variantMap[st.color]}>{st.label}</Badge>
											</td>
											<td className="px-5 py-4">
												{r.payment ? (
													<Badge variant={variantMap[pst.color]}>{pst.label}</Badge>
												) : "—"}
											</td>
											<td className="px-5 py-4">
												<Link
													href={`/admin/reservations/${r.id}`}
													className="text-xs text-[#C8973A] hover:underline"
												>
													Voir
												</Link>
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				)}
			</div>
		</div>
	);
}
