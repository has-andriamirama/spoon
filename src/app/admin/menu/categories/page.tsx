import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Edit, FolderTree, Plus, Hash, CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";
export const metadata = { title: "Catégories du menu" };

export default async function AdminMenuCategoriesPage() {
	const categories = await prisma.menuCategory.findMany({
		orderBy: { order: "asc" },
		include: { _count: { select: { dishes: true } } },
	});

	const total   = categories.length;
	const active  = categories.filter((c) => c.isActive).length;
	const inactive = total - active;
	const totalDishes = categories.reduce((sum, c) => sum + c._count.dishes, 0);

	return (
		<div>
			{/* ── Header ── */}
			<div className="flex items-start justify-between gap-4 mb-6">
				<div>
					<h1 className="font-display text-3xl text-[#F5F0EB] leading-tight">
						Catégories du menu
					</h1>
					<p className="text-sm text-[#5A5249] mt-1">
						Créez, modifiez et organisez les catégories utilisées par les plats.
					</p>
				</div>
				<Link
					href="/admin/menu/categories/new"
					className="flex items-center gap-2 h-9 px-4 bg-[#C8973A] hover:bg-[#E8B04A] text-[#0A0A0A] font-semibold text-sm rounded-lg transition-colors shrink-0"
				>
					<Plus size={15} /> Nouvelle catégorie
				</Link>
			</div>

			{/* ── Stats ── */}
			<div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
				<div className="flex items-center gap-3 p-4 rounded-xl border border-[#222] bg-[#141414]">
					<div className="p-2 rounded-lg bg-[#222] text-[#9A8F84] shrink-0">
						<FolderTree size={18} />
					</div>
					<div className="min-w-0">
						<p className="text-2xl font-semibold text-[#F5F0EB] leading-none tabular-nums">
							{total}
						</p>
						<p className="text-xs text-[#5A5249] mt-1">Total catégories</p>
					</div>
				</div>

				<div className="flex items-center gap-3 p-4 rounded-xl border border-[#222] bg-[#141414]">
					<div className="p-2 rounded-lg bg-green-500/10 text-green-400 shrink-0">
						<CheckCircle2 size={18} />
					</div>
					<div className="min-w-0">
						<p className="text-2xl font-semibold text-[#F5F0EB] leading-none tabular-nums">
							{active}
						</p>
						<p className="text-xs text-[#5A5249] mt-1">Actives</p>
					</div>
				</div>

				<div className="flex items-center gap-3 p-4 rounded-xl border border-[#222] bg-[#141414]">
					<div className="p-2 rounded-lg bg-[#222] text-[#5A5249] shrink-0">
						<XCircle size={18} />
					</div>
					<div className="min-w-0">
						<p className="text-2xl font-semibold text-[#F5F0EB] leading-none tabular-nums">
							{inactive}
						</p>
						<p className="text-xs text-[#5A5249] mt-1">Inactives</p>
					</div>
				</div>

				<div className="flex items-center gap-3 p-4 rounded-xl border border-[#222] bg-[#141414]">
					<div className="p-2 rounded-lg bg-[#C8973A]/10 text-[#C8973A] shrink-0">
						<Hash size={18} />
					</div>
					<div className="min-w-0">
						<p className="text-2xl font-semibold text-[#F5F0EB] leading-none tabular-nums">
							{totalDishes}
						</p>
						<p className="text-xs text-[#5A5249] mt-1">Plats au total</p>
					</div>
				</div>
			</div>

			{/* ── Table ── */}
			{categories.length === 0 ? (
				<div className="bg-[#141414] border border-[#222] rounded-xl py-20 text-center">
					<FolderTree size={40} className="text-[#333] mx-auto mb-4" />
					<p className="text-[#5A5249] text-sm">
						Aucune catégorie. Créez votre première catégorie !
					</p>
					<Link
						href="/admin/menu/categories/new"
						className="mt-4 inline-flex items-center gap-2 text-xs text-[#C8973A] hover:underline"
					>
						<Plus size={12} />
						Créer une catégorie
					</Link>
				</div>
			) : (
				<div className="bg-[#141414] border border-[#222] rounded-xl overflow-hidden">
					{/* Desktop table header */}
					<div className="hidden lg:grid grid-cols-[2fr_1.2fr_0.6fr_0.5fr_0.7fr_80px] items-center px-5 py-3 border-b border-[#1a1a1a]">
						{[
							"Catégorie",
							"Slug",
							"Plats",
							"Ordre",
							"Statut",
							"",
						].map((h, i) => (
							<span
								key={i}
								className={`text-xs font-semibold uppercase tracking-wider text-[#5A5249] ${i === 5 ? "text-right" : ""}`}
							>
								{h}
							</span>
						))}
					</div>

					<div className="divide-y divide-[#1a1a1a]">
						{categories.map((category) => (
							<div
								key={category.id}
								className="group hover:bg-[#1a1a1a] transition-colors"
							>
								{/* Desktop row */}
								<div className="hidden lg:grid grid-cols-[2fr_1.2fr_0.6fr_0.5fr_0.7fr_80px] items-center px-5 py-4">
									<div>
										<p className="text-sm text-[#F5F0EB] font-medium">
											{category.name}
										</p>
										{category.description && (
											<p className="text-xs text-[#5A5249] line-clamp-1 max-w-[320px] mt-0.5">
												{category.description}
											</p>
										)}
									</div>
									<span className="text-xs text-[#5A5249] font-mono">
										{category.slug}
									</span>
									<span className="text-sm text-[#9A8F84] tabular-nums">
										{category._count.dishes}
									</span>
									<span className="text-sm text-[#9A8F84] tabular-nums">
										{category.order}
									</span>
									<Badge variant={category.isActive ? "green" : "gray"}>
										{category.isActive ? "Active" : "Inactive"}
									</Badge>
									<div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
										<Link
											href={`/admin/menu/categories/${category.id}`}
											className="p-1.5 rounded-lg text-[#5A5249] hover:text-[#C8973A] hover:bg-[#252525] transition-all"
											title="Modifier"
										>
											<Edit size={14} />
										</Link>
									</div>
								</div>

								{/* Mobile card */}
								<div className="lg:hidden p-4">
									<div className="flex items-start justify-between gap-3 mb-2">
										<div className="min-w-0">
											<p className="text-sm font-semibold text-[#F5F0EB] truncate">
												{category.name}
											</p>
											<p className="text-xs text-[#5A5249] font-mono truncate">
												{category.slug}
											</p>
										</div>
										<div className="flex items-center gap-2 shrink-0">
											<Badge variant={category.isActive ? "green" : "gray"}>
												{category.isActive ? "Active" : "Inactive"}
											</Badge>
											<Link
												href={`/admin/menu/categories/${category.id}`}
												className="p-1.5 rounded-lg text-[#5A5249] hover:text-[#C8973A] hover:bg-[#252525] transition-all"
											>
												<Edit size={14} />
											</Link>
										</div>
									</div>
									{category.description && (
										<p className="text-xs text-[#5A5249] line-clamp-2 mb-2">
											{category.description}
										</p>
									)}
									<div className="flex items-center gap-3 pt-2 border-t border-[#1a1a1a]">
										<span className="text-xs text-[#5A5249]">
											<span className="text-[#9A8F84] font-medium tabular-nums">
												{category._count.dishes}
											</span>{" "}
											plat{category._count.dishes > 1 ? "s" : ""}
										</span>
										<span className="text-xs text-[#5A5249]">
											Ordre :{" "}
											<span className="text-[#9A8F84] font-medium tabular-nums">
												{category.order}
											</span>
										</span>
									</div>
								</div>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
}
