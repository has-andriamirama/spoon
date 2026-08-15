import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { RESERVATION_STATUSES } from "@/lib/constants";
import { formatDate, formatPrice } from "@/lib/utils";
import Link from "next/link";
import { Calendar, Clock, Users } from "lucide-react";
import AccountReservationsRealtimeUpdater from "./realtime-updater";

export const metadata = { title: "Mes réservations" };
export const dynamic = "force-dynamic";

const variantMap: Record<string, "yellow" | "green" | "red" | "gray" | "orange"> = {
	yellow: "yellow",
	green: "green",
	red: "red",
	gray: "gray",
	orange: "orange",
};

export default async function AccountReservationsPage() {
	const session = await getServerSession(authOptions);
	if (!session) redirect("/auth/login");

	const reservations = await prisma.reservation.findMany({
		where: { userId: session.user.id },
		include: { payment: true },
		orderBy: { date: "desc" },
	});

	const upcoming = reservations.filter(
		(r) =>
			new Date(r.date) >= new Date() &&
			!["CANCELLED_BY_CUSTOMER", "CANCELLED_BY_ADMIN", "NO_SHOW"].includes(r.status)
	);
	const past = reservations.filter((r) => !upcoming.includes(r));

	function ReservationCard({ r }: { r: (typeof reservations)[0] }) {
		const status = RESERVATION_STATUSES[r.status];
		return (
			<Link
				href={`/account/reservations/${r.id}`}
				className="block bg-[#141414] border border-[#222] hover:border-[#C8973A]/30 rounded-xl p-5 transition-all"
			>
				<div className="flex items-start justify-between gap-4 mb-3">
					<div>
						<p className="text-[#F5F0EB] font-medium font-display text-lg">
							{formatDate(r.date)}
						</p>
						<div className="flex items-center gap-4 mt-1 text-sm text-[#9A8F84]">
							<span className="flex items-center gap-1.5">
								<Clock size={13} />
								{r.timeSlot}
							</span>
							<span className="flex items-center gap-1.5">
								<Users size={13} />
								{r.covers} couvert{r.covers > 1 ? "s" : ""}
							</span>
						</div>
					</div>
					<Badge variant={variantMap[status.color] ?? "gray"}>{status.label}</Badge>
				</div>
				{r.payment?.status === "PAID" && (
					<p className="text-xs text-[#5A5249]">
						Acompte payé : {formatPrice(r.payment.amount)}
					</p>
				)}
				{r.payment?.status === "PENDING" && (
					<p className="text-xs text-yellow-500/80">Paiement en attente</p>
				)}
				{r.payment?.status === "FAILED" && (
					<p className="text-xs text-red-400/80">Paiement échoué — action requise</p>
				)}
			</Link>
		);
	}

	return (
		<div>
			<AccountReservationsRealtimeUpdater userId={session.user.id} />

			<h1 className="font-display text-3xl text-[#F5F0EB] mb-8">Mes réservations</h1>

			{reservations.length === 0 ? (
				<div className="bg-[#141414] border border-[#222] rounded-xl p-12 text-center">
					<Calendar size={40} className="text-[#333] mx-auto mb-4" />
					<p className="text-[#9A8F84] mb-4">Aucune réservation pour le moment.</p>
					<Link
						href="/reservation"
						className="inline-flex items-center gap-2 bg-[#C8973A] hover:bg-[#E8B04A] text-[#0A0A0A] font-semibold px-5 py-2.5 rounded-lg transition-colors text-sm"
					>
						Réserver une table
					</Link>
				</div>
			) : (
				<div className="space-y-8">
					{upcoming.length > 0 && (
						<section>
							<h2 className="text-sm font-medium text-[#5A5249] uppercase tracking-wider mb-4">
								À venir ({upcoming.length})
							</h2>
							<div className="space-y-3">
								{upcoming.map((r) => (
									<ReservationCard key={r.id} r={r} />
								))}
							</div>
						</section>
					)}
					{past.length > 0 && (
						<section>
							<h2 className="text-sm font-medium text-[#5A5249] uppercase tracking-wider mb-4">
								Passées ({past.length})
							</h2>
							<div className="space-y-3">
								{past.map((r) => (
									<ReservationCard key={r.id} r={r} />
								))}
							</div>
						</section>
					)}
				</div>
			)}
		</div>
	);
}
