import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Edit, FolderTree, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";
export const metadata = { title: "Catégories du menu" };

export default async function AdminMenuCategoriesPage() {
	const categories = await prisma.menuCategory.findMany({
		orderBy: { order: "asc" },
		include: { _count: { select: { dishes: true } } },
	});

	return (
		<div>
			<div className="flex items-center justify-between gap-4 mb-6">
				<div>
					<h1 className="font-display text-3xl text-[#F5F0EB]">Catégories du menu</h1>
					<p className="text-sm text-[#5A5249] mt-1">Créez, modifiez et organisez les catégories utilisées par les plats.</p>
				</div>
				<Link
					href="/admin/menu/categories/new"
					className="inline-flex items-center gap-2 bg-[#C8973A] hover:bg-[#E8B04A] text-[#0A0A0A] font-semibold text-sm px-4 py-2 rounded-lg transition-colors shrink-0"
				>
					<Plus size={16} /> Nouvelle catégorie
				</Link>
			</div>

			{categories.length === 0 ? (
				<div className="bg-[#141414] border border-[#222] rounded-xl py-20 text-center">
					<FolderTree size={40} className="text-[#333] mx-auto mb-4" />
					<p className="text-[#5A5249]">Aucune catégorie. Créez votre première catégorie !</p>
				</div>
			) : (
				<div className="bg-[#141414] border border-[#222] rounded-xl overflow-hidden">
					<div className="overflow-x-auto">
						<table className="w-full">
							<thead>
								<tr className="border-b border-[#222]">
									{["Catégorie", "Slug", "Plats", "Ordre", "Statut", "Actions"].map((heading) => (
										<th key={heading} className="text-left px-5 py-3 text-xs font-semibold text-[#5A5249] uppercase tracking-wider">
											{heading}
										</th>
									))}
								</tr>
							</thead>
							<tbody className="divide-y divide-[#1a1a1a]">
								{categories.map((category) => (
									<tr key={category.id} className="hover:bg-[#1a1a1a] transition-colors">
										<td className="px-5 py-4">
											<p className="text-sm text-[#F5F0EB] font-medium">{category.name}</p>
											{category.description && <p className="text-xs text-[#5A5249] line-clamp-1 max-w-[320px] mt-0.5">{category.description}</p>}
										</td>
										<td className="px-5 py-4 text-xs text-[#5A5249] font-mono">{category.slug}</td>
										<td className="px-5 py-4 text-sm text-[#9A8F84]">{category._count.dishes}</td>
										<td className="px-5 py-4 text-sm text-[#9A8F84]">{category.order}</td>
										<td className="px-5 py-4">
											<Badge variant={category.isActive ? "green" : "gray"}>{category.isActive ? "Active" : "Inactive"}</Badge>
										</td>
										<td className="px-5 py-4">
											<Link href={`/admin/menu/categories/${category.id}`} className="inline-flex items-center gap-1 text-xs text-[#C8973A] hover:underline">
												<Edit size={12} /> Modifier
											</Link>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			)}
		</div>
	);
}
