import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Plus, Edit, Flame } from "lucide-react";
import Image from "next/image";

export const dynamic = "force-dynamic";
export const metadata = { title: "Menu" };

export default async function AdminMenuPage() {
	const categories = await prisma.menuCategory.findMany({
		where: { isActive: true },
		include: { dishes: { orderBy: { order: "asc" } } },
		orderBy: { order: "asc" },
	});

	return (
		<div>
			<div className="flex items-center justify-between mb-6">
				<h1 className="font-display text-3xl text-[#F5F0EB]">Menu</h1>
				<div className="flex items-center gap-3">
					<Link href="/admin/menu/categories" className="text-sm text-[#9A8F84] hover:text-[#F5F0EB] border border-[#222] px-4 py-2 rounded-lg transition-colors">Catégories</Link>
					<Link href="/admin/menu/dishes/new" className="inline-flex items-center gap-2 bg-[#C8973A] hover:bg-[#E8B04A] text-[#0A0A0A] font-semibold text-sm px-4 py-2 rounded-lg transition-colors">
						<Plus size={16} /> Nouveau plat
					</Link>
				</div>
			</div>
			<div className="space-y-8">
				{categories.map(cat => (
					<section key={cat.id}>
						<div className="flex items-center gap-3 mb-4">
							<h2 className="font-display text-xl text-[#F5F0EB]">{cat.name}</h2>
							<span className="text-xs text-[#5A5249] bg-[#1a1a1a] px-2 py-0.5 rounded-full">{cat.dishes.length} plat{cat.dishes.length > 1 ? "s" : ""}</span>
						</div>
						<div className="bg-[#141414] border border-[#222] rounded-xl overflow-hidden">
							{cat.dishes.length === 0 ? (
								<p className="text-center py-8 text-[#5A5249] text-sm">Aucun plat dans cette catégorie</p>
							) : (
								<div className="overflow-x-auto">
									<table className="w-full">
										<thead><tr className="border-b border-[#222]">
											{["Plat","Prix","Disponible","Spécialité","Actions"].map(h => <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-[#5A5249] uppercase tracking-wider">{h}</th>)}
										</tr></thead>
										<tbody className="divide-y divide-[#1a1a1a]">
											{cat.dishes.map(dish => (
												<tr key={dish.id} className="hover:bg-[#1a1a1a] transition-colors">
													<td className="px-5 py-3.5">
														<div className="flex items-center gap-3">
															{dish.imageUrl ? (
																<div className="w-10 h-10 rounded-lg overflow-hidden shrink-0"><Image src={dish.imageUrl} alt={dish.name} width={40} height={40} className="object-cover w-full h-full" /></div>
															) : (
																<div className="w-10 h-10 rounded-lg bg-[#222] flex items-center justify-center shrink-0"><Flame size={16} className="text-[#333]" /></div>
															)}
															<div>
																<p className="text-sm text-[#F5F0EB] font-medium">{dish.name}</p>
																{dish.description && <p className="text-xs text-[#5A5249] line-clamp-1 max-w-[200px]">{dish.description}</p>}
															</div>
														</div>
													</td>
													<td className="px-5 py-3.5 text-sm text-[#C8973A] font-medium">{formatPrice(dish.price)}</td>
													<td className="px-5 py-3.5"><Badge variant={dish.isAvailable ? "green" : "red"}>{dish.isAvailable ? "Oui" : "Non"}</Badge></td>
													<td className="px-5 py-3.5"><Badge variant={dish.isDailySpecial ? "gold" : "default"}>{dish.isDailySpecial ? "Oui" : "Non"}</Badge></td>
													<td className="px-5 py-3.5">
														<Link href={`/admin/menu/dishes/${dish.id}`} className="inline-flex items-center gap-1 text-xs text-[#C8973A] hover:underline"><Edit size={12} /> Modifier</Link>
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							)}
						</div>
					</section>
				))}
			</div>
		</div>
	);
}
