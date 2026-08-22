import { prisma } from "@/lib/prisma";
import CalendarClient from "./calendar-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Calendrier — Admin" };

export default async function AdminReservationsCalendarPage() {
	// Charge toutes les réservations actives des 60 prochains jours
	// La navigation semaine/jour est 100% client-side
	const from = new Date();
	from.setDate(from.getDate() - 7);
	from.setHours(0, 0, 0, 0);

	const to = new Date();
	to.setDate(to.getDate() + 60);
	to.setHours(23, 59, 59, 999);

	const [reservations, tables] = await Promise.all([
		prisma.reservation.findMany({
			where: {
				date: { gte: from, lte: to },
				status: { in: ["PENDING", "CONFIRMED"] },
			},
			include: {
				table: { select: { id: true, numero: true, zone: true } },
				payment: { select: { id: true, status: true, amount: true, type: true } },
			},
			orderBy: [{ date: "asc" }, { timeSlot: "asc" }],
		}),
		// Tables needed for the confirm/assign modal
		prisma.table.findMany({
			where: { isActif: true },
			orderBy: [{ zone: "asc" }, { numero: "asc" }],
		}),
	]);

	return <CalendarClient reservations={reservations} tables={tables} />;
}
