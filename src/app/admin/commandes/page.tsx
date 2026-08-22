import { prisma } from "@/lib/prisma";
import CommandesClient from "./commandes-client";

export const dynamic  = "force-dynamic";
export const metadata = { title: "Commandes — Spoon Admin" };

export default async function AdminCommandesPage() {
	const orders = await prisma.serviceOrder.findMany({
		include: {
			table: {
				select: { id: true, numero: true, zone: true },
			},
			reservation: {
				select: {
					id: true,
					guestFirstName: true,
					guestLastName: true,
					timeSlot: true,
				},
			},
			items: {
				orderBy: { course: "asc" },
			},
		},
		orderBy: { openedAt: "desc" },
		take: 500,
	});

	return <CommandesClient orders={orders as Parameters<typeof CommandesClient>[0]["orders"]} />;
}
