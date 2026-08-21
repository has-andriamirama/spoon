import { prisma } from "@/lib/prisma";
import AdminReservationsRealtimeUpdater from "./realtime-updater";
import AdminReservationsClient from "./reservations-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Réservations — Admin" };

export default async function AdminReservationsPage() {
	const reservations = await prisma.reservation.findMany({
		include: {
			payment: true,
			table: { select: { id: true, numero: true, zone: true } },
		},
		orderBy: [{ date: "desc" }, { timeSlot: "asc" }],
		take: 500,
	});

	return (
		<>
			<AdminReservationsRealtimeUpdater />
			<AdminReservationsClient reservations={reservations} />
		</>
	);
}
