import { Suspense } from "react";
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
			invoice: {
				select: { id: true, invoiceNumber: true, pdfUrl: true },
			},
			user: {
				select: { id: true, firstName: true, lastName: true, email: true },
			},
			serviceOrder: {
				select: {
					id: true,
					status: true,
					totalAmount: true,
					items: { select: { id: true } },
				},
			},
		},
		orderBy: [{ date: "desc" }, { timeSlot: "asc" }],
		take: 500,
	});

	return (
		<>
			<AdminReservationsRealtimeUpdater />
			<Suspense fallback={null}>
				<AdminReservationsClient reservations={reservations} />
			</Suspense>
		</>
	);
}
