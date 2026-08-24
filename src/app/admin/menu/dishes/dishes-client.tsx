"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
	Search,
	Plus,
	X,
	Edit,
	Flame,
	UtensilsCrossed,
	CheckCircle2,
	Star,
	FolderTree,
	ChevronDown,
	ChevronUp,
	ChevronsUpDown,
	ChevronLeft,
	ChevronRight,
	Trash2,
	Loader2,
} from "lucide-react";
import { cn, formatDate, formatPrice } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ALLERGENS, DIETARY_TAGS } from "@/lib/constants";
import toast from "react-hot-toast";

interface DishCategory {
	id: string;
	name: string;
}

interface Dish {
	id: string;
	name: string;
	slug: string;
	description: string | null;
	price: number;
	imageUrl: string | null;
	allergens: string[];
	dietaryTags: string[];
	isAvailable: boolean;
	isDailySpecial: boolean;
	order: number;
	createdAt: Date;
	updatedAt: Date;
	category: DishCategory;
}

interface Props {
	dishes: Dish[];
	categories: DishCategory[];
}

const PER_PAGE = 12;

type SortKey = "name" | "price" | "category";
type SortDir = "asc" | "desc";

// ─── StatCard ────────────────────────────────────────────────────────────────

function StatCard({
	label,
	value,
	icon: Icon,
	iconColor,
	active,
	onClick,
}: {
	label: string;
	value: number;
	icon: React.ElementType;
	iconColor: string;
	active?: boolean;
	onClick?: () => void;
}) {
	return (
		<button
			onClick={onClick}
			className={cn(
				"flex items-center gap-3 p-4 rounded-xl border text-left transition-all w-full",
				active
					? "border-[#C8973A]/40 bg-[#C8973A]/5"
					: "border-[#222] bg-[#141414] hover:border-[#333] hover:bg-[#1a1a1a]",
				!onClick && "cursor-default"
			)}
		>
			<div className={cn("p-2 rounded-lg shrink-0", iconColor)}>
				<Icon size={18} />
			</div>
			<div className="min-w-0">
				<p className="text-2xl font-semibold text-[#F5F0EB] leading-none tabular-nums">
					{value}
				</p>
				<p className="text-xs text-[#5A5249] mt-1 truncate">{label}</p>
			</div>
		</button>
	);
}

// ─── SortBtn ─────────────────────────────────────────────────────────────────

function SortBtn({
	label,
	sortKey,
	current,
	dir,
	onClick,
}: {
	label: string;
	sortKey: SortKey;
	current: SortKey;
	dir: SortDir;
	onClick: (k: SortKey) => void;
}) {
	const active = current === sortKey;
	const Icon = active ? (dir === "asc" ? ChevronUp : ChevronDown) : ChevronsUpDown;
	return (
		<button
			onClick={() => onClick(sortKey)}
			className={cn(
				"flex items-center gap-1 text-xs font-semibold uppercase tracking-wider transition-colors select-none",
				active ? "text-[#C8973A]" : "text-[#5A5249] hover:text-[#9A8F84]"
			)}
		>
			{label}
			<Icon size={12} />
		</button>
	);
}

// ─── CategoryPill ─────────────────────────────────────────────────────────────

function CategoryPill({
	label,
	count,
	active,
	onClick,
}: {
	label: string;
	count: number;
	active: boolean;
	onClick: () => void;
}) {
	return (
		<button
			onClick={onClick}
			className={cn(
				"flex items-center gap-1.5 px-3 h-8 rounded-full border text-xs font-medium transition-all whitespace-nowrap",
				active
					? "bg-[#C8973A]/10 border-[#C8973A]/30 text-[#C8973A]"
					: "border-[#222] text-[#5A5249] hover:border-[#333] hover:text-[#9A8F84]"
			)}
		>
			{label}
			<span
				className={cn(
					"text-[10px] px-1.5 py-0.5 rounded-full font-semibold",
					active ? "bg-white/10" : "bg-[#1a1a1a] text-[#5A5249]"
				)}
			>
				{count}
			</span>
		</button>
	);
}

// ─── PgBtn ────────────────────────────────────────────────────────────────────

function PgBtn({
	children,
	active,
	disabled,
	onClick,
}: {
	children: React.ReactNode;
	active?: boolean;
	disabled?: boolean;
	onClick: () => void;
}) {
	return (
		<button
			onClick={onClick}
			disabled={disabled}
			className={cn(
				"min-w-[32px] h-8 px-2 rounded-lg border text-xs font-medium transition-colors",
				active
					? "bg-[#C8973A] border-[#C8973A] text-[#0A0A0A]"
					: "border-[#222] text-[#5A5249] hover:border-[#333] hover:text-[#9A8F84]",
				disabled && "opacity-30 pointer-events-none"
			)}
		>
			{children}
		</button>
	);
}

// ─── EmptyState ───────────────────────────────────────────────────────────────

function EmptyState({ onReset }: { onReset?: () => void }) {
	return (
		<div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
			<div className="w-12 h-12 rounded-full bg-[#1a1a1a] flex items-center justify-center">
				<Search size={20} className="text-[#5A5249]" />
			</div>
			<p className="text-sm text-[#5A5249]">Aucun plat trouvé</p>
			{onReset && (
				<button
					onClick={onReset}
					className="text-xs text-[#C8973A] hover:underline transition-colors"
				>
					Réinitialiser les filtres
				</button>
			)}
		</div>
	);
}

// ─── DishThumbnail ─────────────────────────────────────────────────────────────

function DishThumbnail({ imageUrl, name, large = false }: { imageUrl: string | null; name: string; large?: boolean }) {
	const cls = large
		? "w-full h-40 rounded-xl overflow-hidden"
		: "w-10 h-10 rounded-lg overflow-hidden shrink-0";

	if (imageUrl) {
		return (
			<div className={cls}>
				<Image
					src={imageUrl}
					alt={name}
					width={large ? 380 : 40}
					height={large ? 160 : 40}
					className="object-cover w-full h-full"
				/>
			</div>
		);
	}
	return (
		<div className={cn(cls, "bg-[#1a1a1a] flex items-center justify-center shrink-0")}>
			<Flame size={large ? 32 : 16} className="text-[#333]" />
		</div>
	);
}

// ─── Section & InfoRow (detail panel) ────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<div>
			<p className="text-[10px] font-semibold uppercase tracking-widest text-[#5A5249] mb-2">
				{title}
			</p>
			<div className="bg-[#0A0A0A] rounded-xl border border-[#1a1a1a] divide-y divide-[#1a1a1a] overflow-hidden">
				{children}
			</div>
		</div>
	);
}

function InfoRow({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
	return (
		<div className="flex items-start justify-between gap-3 px-3 py-2.5">
			<span className="text-xs text-[#5A5249] shrink-0">{label}</span>
			<span className={cn("text-xs text-[#F5F0EB] text-right break-words min-w-0", valueClass)}>
				{value}
			</span>
		</div>
	);
}

// ─── DetailPanel ─────────────────────────────────────────────────────────────

function DetailPanel({ dish, onClose }: { dish: Dish | null; onClose: () => void }) {
	useEffect(() => {
		const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [onClose]);

	useEffect(() => {
		document.body.style.overflow = dish ? "hidden" : "";
		return () => { document.body.style.overflow = ""; };
	}, [dish]);

	const isOpen = !!dish;

	return (
		<>
			<div
				onClick={onClose}
				aria-hidden="true"
				className={cn(
					"fixed inset-0 bg-black/60 z-40 transition-opacity duration-200",
					isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
				)}
			/>
			<aside
				className={cn(
					"fixed top-0 right-0 h-full w-full sm:w-[380px] z-50 flex flex-col",
					"bg-[#141414] border-l border-[#222] shadow-2xl",
					"transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
					isOpen ? "translate-x-0" : "translate-x-full"
				)}
				aria-label="Détail du plat"
				role="dialog"
				aria-modal="true"
			>
				{dish && (
					<>
						{/* Header */}
						<div className="flex items-center justify-between p-5 border-b border-[#222] shrink-0">
							<div className="flex items-center gap-3 min-w-0">
								<DishThumbnail imageUrl={dish.imageUrl} name={dish.name} />
								<div className="min-w-0">
									<p className="text-sm font-semibold text-[#F5F0EB] truncate">{dish.name}</p>
									<p className="text-xs text-[#5A5249] truncate">{dish.category.name}</p>
								</div>
							</div>
							<button
								onClick={onClose}
								className="p-1.5 rounded-lg text-[#5A5249] hover:text-[#F5F0EB] hover:bg-[#222] transition-colors shrink-0 ml-2"
								aria-label="Fermer le panneau"
							>
								<X size={16} />
							</button>
						</div>

						{/* Body */}
						<div className="flex-1 overflow-y-auto p-5 space-y-5">

							{/* Image grande */}
							{dish.imageUrl && <DishThumbnail imageUrl={dish.imageUrl} name={dish.name} large />}

							{/* Badges statut */}
							<div className="flex flex-wrap gap-2">
								<Badge variant={dish.isAvailable ? "green" : "red"}>
									{dish.isAvailable ? "Disponible" : "Indisponible"}
								</Badge>
								{dish.isDailySpecial && <Badge variant="gold">Suggestion du chef</Badge>}
								<Badge variant="default">{dish.category.name}</Badge>
							</div>

							{/* Informations */}
							<Section title="Plat">
								<InfoRow label="Nom" value={dish.name} />
								<InfoRow
									label="Prix"
									value={formatPrice(dish.price)}
									valueClass="text-[#C8973A] font-semibold"
								/>
								{dish.description && <InfoRow label="Description" value={dish.description} />}
								<InfoRow label="Catégorie" value={dish.category.name} />
								<InfoRow label="Ordre d'affichage" value={String(dish.order)} />
							</Section>

							{/* Allergènes */}
							{dish.allergens.length > 0 && (
								<div>
									<p className="text-[10px] font-semibold uppercase tracking-widest text-[#5A5249] mb-2">
										Allergènes
									</p>
									<div className="flex flex-wrap gap-1.5">
										{dish.allergens.map((id) => {
											const label = ALLERGENS.find((a) => a.id === id)?.label ?? id;
											return (
												<span
													key={id}
													className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-yellow-500/10 border border-yellow-500/20 text-yellow-400"
												>
													{label}
												</span>
											);
										})}
									</div>
								</div>
							)}

							{/* Régimes */}
							{dish.dietaryTags.length > 0 && (
								<div>
									<p className="text-[10px] font-semibold uppercase tracking-widest text-[#5A5249] mb-2">
										Régimes
									</p>
									<div className="flex flex-wrap gap-1.5">
										{dish.dietaryTags.map((id) => {
											const label = DIETARY_TAGS.find((t) => t.id === id)?.label ?? id;
											return (
												<span
													key={id}
													className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-500/10 border border-green-500/20 text-green-400"
												>
													{label}
												</span>
											);
										})}
									</div>
								</div>
							)}

							{/* Historique */}
							<Section title="Historique">
								<InfoRow
									label="Créé le"
									value={formatDate(dish.createdAt, "dd/MM/yyyy à HH:mm")}
								/>
								<InfoRow
									label="Modifié le"
									value={formatDate(dish.updatedAt, "dd/MM/yyyy à HH:mm")}
								/>
								<InfoRow
									label="Identifiant"
									value={dish.id}
									valueClass="font-mono text-[10px] text-[#5A5249] break-all"
								/>
							</Section>
						</div>

						{/* Footer */}
						<div className="p-5 border-t border-[#222] shrink-0">
							<Link
								href={`/admin/menu/dishes/${dish.id}`}
								className="w-full flex items-center justify-center gap-2 h-9 rounded-lg bg-[#C8973A] hover:bg-[#E8B04A] text-[#0A0A0A] text-sm font-semibold transition-colors"
							>
								<Edit size={14} />
								Modifier ce plat
							</Link>
						</div>
					</>
				)}
			</aside>
		</>
	);
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DishesClient({ dishes, categories }: Props) {
	const router = useRouter();

	const [search, setSearch] = useState("");
	const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
	const [availFilter, setAvailFilter] = useState<"all" | "available" | "unavailable">("all");
	const [specialFilter, setSpecialFilter] = useState(false);
	const [sortKey, setSortKey] = useState<SortKey>("name");
	const [sortDir, setSortDir] = useState<SortDir>("asc");
	const [page, setPage] = useState(1);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [deletingId, setDeletingId] = useState<string | null>(null);

	// Stats
	const stats = useMemo(() => ({
		total: dishes.length,
		available: dishes.filter((d) => d.isAvailable).length,
		specials: dishes.filter((d) => d.isDailySpecial).length,
		totalCategories: categories.length,
	}), [dishes, categories]);

	// Counts per category
	const categoryCounts = useMemo(() => {
		const counts: Record<string, number> = {};
		dishes.forEach((d) => {
			counts[d.category.id] = (counts[d.category.id] ?? 0) + 1;
		});
		return counts;
	}, [dishes]);

	// Filtered + sorted list
	const filtered = useMemo(() => {
		const q = search.toLowerCase().trim();

		let result = dishes.filter((d) => {
			if (q) {
				const haystack = `${d.name} ${d.description ?? ""}`.toLowerCase();
				if (!haystack.includes(q)) return false;
			}
			if (activeCategoryId && d.category.id !== activeCategoryId) return false;
			if (availFilter === "available" && !d.isAvailable) return false;
			if (availFilter === "unavailable" && d.isAvailable) return false;
			if (specialFilter && !d.isDailySpecial) return false;
			return true;
		});

		result = [...result].sort((a, b) => {
			let cmp = 0;
			if (sortKey === "name") {
				cmp = a.name.localeCompare(b.name, "fr");
			} else if (sortKey === "price") {
				cmp = a.price - b.price;
			} else if (sortKey === "category") {
				cmp = a.category.name.localeCompare(b.category.name, "fr");
			}
			return sortDir === "asc" ? cmp : -cmp;
		});

		return result;
	}, [dishes, search, activeCategoryId, availFilter, specialFilter, sortKey, sortDir]);

	// Reset page on any filter change
	useEffect(() => {
		setPage(1);
	}, [search, activeCategoryId, availFilter, specialFilter, sortKey, sortDir]);

	const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
	const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

	const handleSortClick = useCallback(
		(key: SortKey) => {
			if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
			else { setSortKey(key); setSortDir("asc"); }
		},
		[sortKey]
	);

	const resetFilters = useCallback(() => {
		setSearch("");
		setActiveCategoryId(null);
		setAvailFilter("all");
		setSpecialFilter(false);
	}, []);

	// ── Delete handler ──
	const handleDelete = useCallback(
		async (dish: Dish, e: React.MouseEvent) => {
			e.stopPropagation();
			if (!confirm(`Supprimer "${dish.name}" et toutes ses images ?`)) return;
			setDeletingId(dish.id);
			try {
				const res = await fetch(`/api/menu/dishes/${dish.id}`, { method: "DELETE" });
				if (!res.ok) throw new Error((await res.json()).error ?? "Erreur");
				toast.success("Plat supprimé");
				// Fermer le panneau si le plat supprimé était sélectionné
				if (selectedId === dish.id) setSelectedId(null);
				router.refresh();
			} catch {
				toast.error("Erreur lors de la suppression");
			} finally {
				setDeletingId(null);
			}
		},
		[selectedId, router]
	);

	const hasActiveFilters = !!(search || activeCategoryId || availFilter !== "all" || specialFilter);
	const selectedDish = dishes.find((d) => d.id === selectedId) ?? null;

	function buildPageList(current: number, total: number): (number | "…")[] {
		const pages: (number | "…")[] = [];
		const nums = Array.from({ length: total }, (_, i) => i + 1).filter(
			(p) => p === 1 || p === total || Math.abs(p - current) <= 1
		);
		nums.forEach((p, i) => {
			if (i > 0 && p - (nums[i - 1] as number) > 1) pages.push("…");
			pages.push(p);
		});
		return pages;
	}

	return (
		<div className="min-h-full">

			{/* ── Header ── */}
			<div className="flex items-start justify-between mb-6 gap-4">
				<div>
					<h1 className="font-display text-3xl text-[#F5F0EB] leading-tight">Plats</h1>
					<p className="text-sm text-[#5A5249] mt-1">
						Gérez les plats affichés sur votre menu.
					</p>
				</div>
				<Link
					href="/admin/menu/dishes/new"
					className="flex items-center gap-2 h-9 px-3 sm:px-4 bg-[#C8973A] hover:bg-[#E8B04A] text-[#0A0A0A] text-sm font-semibold rounded-lg transition-colors"
				>
					<Plus size={15} />
					<span className="hidden sm:inline">Ajouter</span>
				</Link>
			</div>

			{/* ── Stats ── */}
			<div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
				<StatCard
					label="Total plats"
					value={stats.total}
					icon={UtensilsCrossed}
					iconColor="bg-[#222] text-[#9A8F84]"
				/>
				<StatCard
					label="Disponibles"
					value={stats.available}
					icon={CheckCircle2}
					iconColor="bg-green-500/10 text-green-400"
					active={availFilter === "available"}
					onClick={() => setAvailFilter((v) => (v === "available" ? "all" : "available"))}
				/>
				<StatCard
					label="Suggestions du chef"
					value={stats.specials}
					icon={Star}
					iconColor="bg-[#C8973A]/10 text-[#C8973A]"
					active={specialFilter}
					onClick={() => setSpecialFilter((v) => !v)}
				/>
				<StatCard
					label="Catégories"
					value={stats.totalCategories}
					icon={FolderTree}
					iconColor="bg-blue-500/10 text-blue-400"
				/>
			</div>

			{/* ── Filters ── */}
			<div className="bg-[#141414] border border-[#222] rounded-xl p-4 mb-4 space-y-3">
				<div className="flex flex-col sm:flex-row gap-3">
					{/* Search */}
					<div className="relative flex-1">
						<Search
							size={15}
							className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5A5249] pointer-events-none"
						/>
						<input
							type="text"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder="Rechercher un plat…"
							className="w-full h-9 pl-9 pr-9 rounded-lg bg-[#0A0A0A] border border-[#222] text-sm text-[#F5F0EB] placeholder:text-[#5A5249] focus:border-[#C8973A] focus:ring-1 focus:ring-[#C8973A] outline-none transition-colors"
						/>
						{search && (
							<button
								onClick={() => setSearch("")}
								className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#5A5249] hover:text-[#9A8F84] transition-colors"
								aria-label="Effacer"
							>
								<X size={14} />
							</button>
						)}
					</div>

					{/* Availability select */}
					<div className="relative">
						<select
							value={availFilter}
							onChange={(e) =>
								setAvailFilter(e.target.value as "all" | "available" | "unavailable")
							}
							className="h-9 pl-3 pr-8 rounded-lg bg-[#0A0A0A] border border-[#222] text-sm text-[#F5F0EB] focus:border-[#C8973A] focus:outline-none appearance-none cursor-pointer w-full sm:w-auto"
						>
							<option value="all">Toutes dispo.</option>
							<option value="available">Disponibles</option>
							<option value="unavailable">Indisponibles</option>
						</select>
						<ChevronDown
							size={13}
							className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#5A5249] pointer-events-none"
						/>
					</div>
				</div>

				{/* Category pills */}
				<div className="flex items-center gap-2 flex-wrap">
					<CategoryPill
						label="Toutes"
						count={dishes.length}
						active={activeCategoryId === null}
						onClick={() => setActiveCategoryId(null)}
					/>
					{categories.map((cat) =>
						(categoryCounts[cat.id] ?? 0) > 0 ? (
							<CategoryPill
								key={cat.id}
								label={cat.name}
								count={categoryCounts[cat.id] ?? 0}
								active={activeCategoryId === cat.id}
								onClick={() =>
									setActiveCategoryId((prev) => (prev === cat.id ? null : cat.id))
								}
							/>
						) : null
					)}
					{hasActiveFilters && (
						<button
							onClick={resetFilters}
							className="ml-auto flex items-center gap-1 text-xs text-[#5A5249] hover:text-[#9A8F84] transition-colors"
						>
							<X size={12} />
							Réinitialiser
						</button>
					)}
				</div>
			</div>

			{/* ── Desktop Table ── */}
			<div className="hidden lg:block bg-[#141414] border border-[#222] rounded-xl overflow-hidden">
				<div className="grid grid-cols-[2fr_1.1fr_0.9fr_0.7fr_0.7fr_96px] items-center px-5 py-3 border-b border-[#1a1a1a]">
					<SortBtn label="Plat"       sortKey="name"     current={sortKey} dir={sortDir} onClick={handleSortClick} />
					<SortBtn label="Catégorie"  sortKey="category" current={sortKey} dir={sortDir} onClick={handleSortClick} />
					<SortBtn label="Prix"       sortKey="price"    current={sortKey} dir={sortDir} onClick={handleSortClick} />
					<span className="text-xs font-semibold uppercase tracking-wider text-[#5A5249]">Dispo.</span>
					<span className="text-xs font-semibold uppercase tracking-wider text-[#5A5249]">Chef</span>
					<span className="text-xs font-semibold uppercase tracking-wider text-[#5A5249] text-right">Actions</span>
				</div>

				{paginated.length === 0 ? (
					<EmptyState onReset={hasActiveFilters ? resetFilters : undefined} />
				) : (
					<div className="divide-y divide-[#1a1a1a]">
						{paginated.map((dish) => (
							<div
								key={dish.id}
								onClick={() => setSelectedId(dish.id)}
								role="button"
								tabIndex={0}
								onKeyDown={(e) => e.key === "Enter" && setSelectedId(dish.id)}
								className={cn(
									"group grid grid-cols-[2fr_1.1fr_0.9fr_0.7fr_0.7fr_96px] items-center px-5 py-3.5 cursor-pointer transition-colors",
									selectedId === dish.id ? "bg-[#C8973A]/5" : "hover:bg-[#1a1a1a]"
								)}
							>
								{/* Plat */}
								<div className="flex items-center gap-3 min-w-0">
									<DishThumbnail imageUrl={dish.imageUrl} name={dish.name} />
									<div className="min-w-0">
										<p className="text-sm font-medium text-[#F5F0EB] truncate">{dish.name}</p>
										{dish.description && (
											<p className="text-xs text-[#5A5249] line-clamp-1 max-w-[200px]">
												{dish.description}
											</p>
										)}
									</div>
								</div>

								{/* Catégorie */}
								<span className="text-sm text-[#9A8F84] truncate">{dish.category.name}</span>

								{/* Prix */}
								<span className="text-sm font-semibold text-[#C8973A] tabular-nums">
									{formatPrice(dish.price)}
								</span>

								{/* Disponible */}
								<div>
									<Badge variant={dish.isAvailable ? "green" : "red"}>
										{dish.isAvailable ? "Oui" : "Non"}
									</Badge>
								</div>

								{/* Suggestion */}
								<div>
									<Badge variant={dish.isDailySpecial ? "gold" : "default"}>
										{dish.isDailySpecial ? "Oui" : "Non"}
									</Badge>
								</div>

								{/* Actions */}
								<div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
									<Link
										href={`/admin/menu/dishes/${dish.id}`}
										onClick={(e) => e.stopPropagation()}
										title="Modifier"
										className="p-1.5 rounded-lg text-[#5A5249] hover:text-[#C8973A] hover:bg-[#252525] transition-all"
									>
										<Edit size={14} />
									</Link>
									<button
										onClick={(e) => handleDelete(dish, e)}
										disabled={deletingId === dish.id}
										title="Supprimer"
										className="p-1.5 rounded-lg text-[#5A5249] hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-40"
									>
										{deletingId === dish.id
											? <Loader2 size={14} className="animate-spin" />
											: <Trash2 size={14} />
										}
									</button>
								</div>
							</div>
						))}
					</div>
				)}
			</div>

			{/* ── Mobile Cards ── */}
			<div className="lg:hidden space-y-3">
				{paginated.length === 0 ? (
					<EmptyState onReset={hasActiveFilters ? resetFilters : undefined} />
				) : (
					paginated.map((dish) => (
						<div
							key={dish.id}
							onClick={() => setSelectedId(dish.id)}
							role="button"
							tabIndex={0}
							onKeyDown={(e) => e.key === "Enter" && setSelectedId(dish.id)}
							className={cn(
								"bg-[#141414] border rounded-xl p-4 cursor-pointer transition-colors",
								selectedId === dish.id
									? "border-[#C8973A]/30 bg-[#C8973A]/5"
									: "border-[#222] hover:border-[#333] hover:bg-[#1a1a1a]"
							)}
						>
							<div className="flex items-start justify-between gap-3 mb-3">
								<div className="flex items-center gap-3 min-w-0">
									<DishThumbnail imageUrl={dish.imageUrl} name={dish.name} />
									<div className="min-w-0">
										<p className="text-sm font-semibold text-[#F5F0EB] truncate">{dish.name}</p>
										<p className="text-xs text-[#5A5249] truncate">{dish.category.name}</p>
									</div>
								</div>
								<span className="text-sm font-semibold text-[#C8973A] tabular-nums shrink-0">
									{formatPrice(dish.price)}
								</span>
							</div>

							{dish.description && (
								<p className="text-xs text-[#5A5249] line-clamp-2 mb-3">{dish.description}</p>
							)}

							<div className="flex items-center justify-between pt-3 border-t border-[#1a1a1a]">
								<div className="flex items-center gap-2 flex-wrap">
									<Badge variant={dish.isAvailable ? "green" : "red"}>
										{dish.isAvailable ? "Disponible" : "Indisponible"}
									</Badge>
									{dish.isDailySpecial && <Badge variant="gold">Chef</Badge>}
								</div>
								{/* Actions mobile */}
								<div className="flex items-center gap-1">
									<Link
										href={`/admin/menu/dishes/${dish.id}`}
										onClick={(e) => e.stopPropagation()}
										className="p-1.5 rounded-lg text-[#5A5249] hover:text-[#C8973A] hover:bg-[#252525] transition-all"
										title="Modifier"
									>
										<Edit size={14} />
									</Link>
									<button
										onClick={(e) => handleDelete(dish, e)}
										disabled={deletingId === dish.id}
										title="Supprimer"
										className="p-1.5 rounded-lg text-[#5A5249] hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-40"
									>
										{deletingId === dish.id
											? <Loader2 size={14} className="animate-spin" />
											: <Trash2 size={14} />
										}
									</button>
								</div>
							</div>
						</div>
					))
				)}
			</div>

			{/* ── Pagination ── */}
			{filtered.length > 0 && (
				<div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
					<p className="text-xs text-[#5A5249] order-2 sm:order-1">
						{(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} sur{" "}
						{filtered.length} plat{filtered.length > 1 ? "s" : ""}
					</p>

					{totalPages > 1 && (
						<div className="flex items-center gap-1 order-1 sm:order-2">
							<PgBtn onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
								<ChevronLeft size={14} />
							</PgBtn>

							{buildPageList(page, totalPages).map((p, i) =>
								p === "…" ? (
									<span key={`ellipsis-${i}`} className="px-1 text-xs text-[#5A5249]">…</span>
								) : (
									<PgBtn key={p} active={p === page} onClick={() => setPage(p as number)}>
										{p}
									</PgBtn>
								)
							)}

							<PgBtn onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
								<ChevronRight size={14} />
							</PgBtn>
						</div>
					)}
				</div>
			)}

			{/* ── Detail Panel ── */}
			<DetailPanel dish={selectedDish} onClose={() => setSelectedId(null)} />
		</div>
	);
}
