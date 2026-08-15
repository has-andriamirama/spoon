import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Catégories du menu" };

export default async function AdminMenuCategoriesPage() {
	const categories = await prisma.menuCategory.findMany({ orderBy: { order: "asc" }, include: { _count: { select: { dishes: true } } } });
	return (
		<div>
			<div className="flex items-center gap-4 mb-6">
				<Link href="/admin/menu" className="inline-flex items-center gap-2 text-sm text-[#9A8F84] hover:text-[#F5F0EB] transition-colors"><ArrowLeft size={16} /> Retour au menu</Link>
				<h1 className="font-display text-3xl text-[#F5F0EB]">Catégories</h1>
			</div>
			<div className="bg-[#141414] border border-[#222] rounded-xl overflow-hidden">
				<table className="w-full">
					<thead><tr className="border-b border-[#222]">
						{["Catégorie","Slug","Plats","Ordre","Statut"].map(h => <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-[#5A5249] uppercase tracking-wider">{h}</th>)}
					</tr></thead>
					<tbody className="divide-y divide-[#1a1a1a]">
						{categories.map(cat => (
							<tr key={cat.id} className="hover:bg-[#1a1a1a] transition-colors">
								<td className="px-5 py-4 text-sm text-[#F5F0EB] font-medium">{cat.name}</td>
								<td className="px-5 py-4 text-xs text-[#5A5249] font-mono">{cat.slug}</td>
								<td className="px-5 py-4 text-sm text-[#9A8F84]">{cat._count.dishes}</td>
								<td className="px-5 py-4 text-sm text-[#9A8F84]">{cat.order}</td>
								<td className="px-5 py-4 text-sm text-[#9A8F84]">{cat.isActive ? "✅" : "❌"}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}
