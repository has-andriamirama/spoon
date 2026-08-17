import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import CategoryForm from "../category-form";

export const dynamic = "force-dynamic";

export default async function AdminMenuCategoryPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	const category = id === "new" ? null : await prisma.menuCategory.findUnique({ where: { id } });

	if (id !== "new" && !category) notFound();

	return (
		<div>
			<div className="flex items-center gap-3 mb-8">
				<Link
					href="/admin/menu/categories"
					className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-[#222] bg-[#141414] text-[#9A8F84] hover:text-[#F5F0EB] hover:border-[#C8973A]/40 transition-colors shrink-0"
					aria-label="Retour aux catégories"
				>
					<ArrowLeft size={17} />
				</Link>
				<h1 className="font-display text-3xl text-[#F5F0EB]">
					{category ? "Modifier la catégorie" : "Nouvelle catégorie"}
				</h1>
			</div>
			<CategoryForm category={category} />
		</div>
	);
}
