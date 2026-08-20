import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import type { ServiceOrderFull, MenuCategoryForService } from "@/types";
import OrderClient from "./order-client";

export const dynamic = "force-dynamic";

export async function generateMetadata({
	params,
}: {
	params: Promise<{ orderId: string }>;
}) {
	const { orderId } = await params;
	const order = await prisma.serviceOrder.findUnique({
		where: { id: orderId },
		include: { table: { select: { numero: true } } },
	});
	if (!order) return { title: "Commande introuvable" };
	return { title: `T${order.table.numero} — ${order.guestName} · Spoon Admin` };
}

export default async function ServiceOrderPage({
	params,
	searchParams,
}: {
	params: Promise<{ orderId: string }>;
	searchParams: Promise<{ date?: string }>;
}) {
	const { orderId } = await params;
	const { date }    = await searchParams;

	const [rawOrder, categories] = await Promise.all([
		prisma.serviceOrder.findUnique({
			where: { id: orderId },
			include: {
				table: {
					select: {
						id: true,
						numero: true,
						zone: true,
						capaciteMax: true,
						description: true,
					},
				},
				reservation: {
					select: {
						id: true,
						timeSlot: true,
						guestFirstName: true,
						guestLastName: true,
					},
				},
				items: { orderBy: { createdAt: "asc" } },
			},
		}),
		prisma.menuCategory.findMany({
			where: { isActive: true },
			include: {
				dishes: {
					where: { isAvailable: true },
					orderBy: { order: "asc" },
					select: {
						id: true,
						name: true,
						price: true,
						isAvailable: true,
						categoryId: true,
					},
				},
			},
			orderBy: { order: "asc" },
		}),
	]);

	if (!rawOrder) notFound();

	// Rediriger si la commande est déjà payée ou annulée
	if (rawOrder.status === "PAYEE" || rawOrder.status === "ANNULEE") {
		const planUrl = `/admin/reservations/plan${date ? `?date=${date}` : ""}`;
		redirect(planUrl);
	}

	const order = rawOrder as unknown as ServiceOrderFull;
	const menu  = categories as MenuCategoryForService[];

	return (
		<OrderClient
			order={order}
			menu={menu}
			date={date ?? new Date().toISOString().split("T")[0]}
		/>
	);
}
