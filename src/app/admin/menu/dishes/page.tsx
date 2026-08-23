import { prisma } from "@/lib/prisma";
import DishesClient from "./dishes-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Plats" };

export default async function AdminDishesPage() {
	const [categories, dishes] = await Promise.all([
		prisma.menuCategory.findMany({
			orderBy: { order: "asc" },
			select: { id: true, name: true },
		}),
		prisma.dish.findMany({
			orderBy: [{ categoryId: "asc" }, { order: "asc" }],
			include: {
				category: {
					select: { id: true, name: true },
				},
			},
		}),
	]);

	return <DishesClient dishes={dishes} categories={categories} />;
}
