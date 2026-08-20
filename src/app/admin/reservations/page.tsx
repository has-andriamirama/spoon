import { prisma } from "@/lib/prisma";
import AdminReservationsRealtimeUpdater from "./realtime-updater";
import AdminReservationsClient from "./reservations-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Réservations" };

export default async function AdminReservationsPage({ searchParams }: {
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

	return (
		<>
			<AdminReservationsRealtimeUpdater />
			<AdminReservationsClient
				reservations={reservations}
				filterStatus={status}
				filterDate={date}
			/>
		</>
	);
}
