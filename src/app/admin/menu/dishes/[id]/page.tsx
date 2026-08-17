import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import DishForm from "../dish-form";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminDishPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;

	const [categories, dish] = await Promise.all([
		prisma.menuCategory.findMany({ where: { isActive: true }, orderBy: { order: "asc" } }),
		id === "new"
			? Promise.resolve(null)
			: prisma.dish.findUnique({
					where: { id },
					include: {
						images: { orderBy: [{ isPrimary: "desc" }, { order: "asc" }] },
					},
				}),
	]);

	if (id !== "new" && !dish) notFound();

	return (
		<div>
			<div className="flex items-center gap-3 mb-8">
				<Link
					href="/admin/menu/dishes"
					className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-[#222] bg-[#141414] text-[#9A8F84] hover:text-[#F5F0EB] hover:border-[#C8973A]/40 transition-colors shrink-0"
					aria-label="Retour aux plats"
				>
					<ArrowLeft size={17} />
				</Link>
				<h1 className="font-display text-3xl text-[#F5F0EB]">
					{dish ? "Modifier le plat" : "Nouveau plat"}
				</h1>
			</div>
			<DishForm dish={dish} categories={categories} />
		</div>
	);
}
