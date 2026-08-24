"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
	Plus,
	Edit,
	Trash2,
	TableProperties,
	Power,
	Check,
	X,
	Users,
	LayoutGrid,
	Search,
	CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

type Zone         = "SALLE" | "TERRASSE" | "BAR" | "PRIVE";
type StatusFilter = "all" | "active" | "inactive";

type TableRow = {
	id:          string;
	numero:      number;
	capaciteMin: number;
	capaciteMax: number;
	zone:        Zone;
	description: string | null;
	isActif:     boolean;
	_count:      { reservations: number };
};

// ─── Constants ────────────────────────────────────────────────────────────────

const ZONE_ORDER: Zone[] = ["SALLE", "TERRASSE", "BAR", "PRIVE"];

const ZONE_META: Record<
	Zone,
	{ short: string; full: string; badge: string }
> = {
	SALLE: {
		short: "Salle",
		full:  "Salle — intérieur",
		badge: "text-blue-400 bg-blue-950/30 border-blue-900/40",
	},
	TERRASSE: {
		short: "Terrasse",
		full:  "Terrasse",
		badge: "text-green-400 bg-green-950/30 border-green-900/40",
	},
	BAR: {
		short: "Bar",
		full:  "Bar",
		badge: "text-[#C8973A] bg-[#1a1200] border-[#C8973A]/20",
	},
	PRIVE: {
		short: "Espace privé",
		full:  "Espace privé",
		badge: "text-purple-400 bg-purple-950/30 border-purple-900/40",
	},
};

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({
	label,
	value,
	icon: Icon,
	iconColor,
	active,
	onClick,
}: {
	label:     string;
	value:     number;
	icon:      React.ElementType;
	iconColor: string;
	active?:   boolean;
	onClick?:  () => void;
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

// ─── ZonePill ─────────────────────────────────────────────────────────────────

function ZonePill({
	zone,
	count,
	active,
	onClick,
}: {
	zone:    Zone;
	count:   number;
	active:  boolean;
	onClick: () => void;
}) {
	const meta = ZONE_META[zone];
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
			{meta.short}
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

// ─── Main component ───────────────────────────────────────────────────────────

export default function TablesClient({
	initialTables,
}: {
	initialTables: TableRow[];
}) {
	const [tables, setTables]               = useState<TableRow[]>(initialTables);
	const [loading, setLoading]             = useState<string | null>(null);
	const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
	const [search, setSearch]               = useState("");
	const [zoneFilter, setZoneFilter]       = useState<Zone | null>(null);
	const [statusFilter, setStatusFilter]   = useState<StatusFilter>("all");

	// ── Stats ──────────────────────────────────────────────────────────────────

	const stats = useMemo(
		() => ({
			total:     tables.length,
			actives:   tables.filter((t) => t.isActif).length,
			inactives: tables.filter((t) => !t.isActif).length,
			zones:     new Set(tables.map((t) => t.zone)).size,
		}),
		[tables]
	);

	const zoneCounts = useMemo(() => {
		const c: Record<Zone, number> = { SALLE: 0, TERRASSE: 0, BAR: 0, PRIVE: 0 };
		tables.forEach((t) => { c[t.zone]++; });
		return c;
	}, [tables]);

	// ── Filtered & grouped ─────────────────────────────────────────────────────

	const filtered = useMemo(() => {
		const q = search.toLowerCase().trim();
		return tables.filter((t) => {
			if (zoneFilter && t.zone !== zoneFilter) return false;
			if (statusFilter === "active"   && !t.isActif) return false;
			if (statusFilter === "inactive" &&  t.isActif) return false;
			if (q) {
				const haystack = `T${t.numero} ${t.description ?? ""} ${ZONE_META[t.zone].full}`.toLowerCase();
				if (!haystack.includes(q)) return false;
			}
			return true;
		});
	}, [tables, zoneFilter, statusFilter, search]);

	const byZone = useMemo(() => {
		const zones = zoneFilter ? [zoneFilter] : ZONE_ORDER;
		return zones
			.map((zone) => ({ zone, rows: filtered.filter((t) => t.zone === zone) }))
			.filter(({ rows }) => rows.length > 0);
	}, [filtered, zoneFilter]);

	const hasActiveFilters = search.trim() || zoneFilter || statusFilter !== "all";

	// ── CRUD ──────────────────────────────────────────────────────────────────

	const handleDelete = async (t: TableRow) => {
		setLoading(`delete-${t.id}`);
		try {
			const res = await fetch(`/api/admin/tables/${t.id}`, {
				method: "DELETE",
			});
			if (!res.ok) throw new Error();
			setTables((prev) => prev.filter((x) => x.id !== t.id));
			toast.success(`Table ${t.numero} supprimée`);
			setDeleteConfirm(null);
		} catch {
			toast.error("Erreur lors de la suppression");
		} finally {
			setLoading(null);
		}
	};

	// ── Render ─────────────────────────────────────────────────────────────────

	return (
		<div className="min-h-full">

			{/* ── Header ──────────────────────────────────────────────────────── */}
			<div className="flex items-start justify-between mb-6 gap-4">
				<div>
					<h1 className="font-display text-3xl text-[#F5F0EB] leading-tight">
						Tables
					</h1>
					<p className="text-sm text-[#5A5249] mt-1">
						Configurez les tables physiques de votre restaurant.
					</p>
				</div>
				<div className="flex items-center gap-2 shrink-0">
					<Link
						href="/admin/reservations/plan"
						className="flex items-center gap-2 h-9 px-3 sm:px-4 rounded-lg border border-[#222] text-sm text-[#9A8F84] hover:text-[#F5F0EB] hover:bg-[#1a1a1a] transition-colors"
					>
						<LayoutGrid size={14} />
						<span className="hidden sm:inline">Plan de salle</span>
					</Link>
					<Link
						href="/admin/tables/new"
						className="flex items-center gap-2 h-9 px-3 sm:px-4 bg-[#C8973A] hover:bg-[#E8B04A] text-[#0A0A0A] text-sm font-semibold rounded-lg transition-colors"
					>
						<Plus size={15} />
						<span className="hidden sm:inline">Ajouter</span>
					</Link>
				</div>
			</div>

			{/* ── Stats ───────────────────────────────────────────────────────── */}
			<div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
				<StatCard
					label="Total tables"
					value={stats.total}
					icon={TableProperties}
					iconColor="bg-[#222] text-[#9A8F84]"
				/>
				<StatCard
					label="Actives"
					value={stats.actives}
					icon={CheckCircle2}
					iconColor="bg-green-500/10 text-green-400"
					active={statusFilter === "active"}
					onClick={() =>
						setStatusFilter((v) => (v === "active" ? "all" : "active"))
					}
				/>
				<StatCard
					label="Inactives"
					value={stats.inactives}
					icon={Power}
					iconColor="bg-[#222] text-[#5A5249]"
					active={statusFilter === "inactive"}
					onClick={() =>
						setStatusFilter((v) => (v === "inactive" ? "all" : "inactive"))
					}
				/>
				<StatCard
					label="Zones"
					value={stats.zones}
					icon={LayoutGrid}
					iconColor="bg-blue-500/10 text-blue-400"
				/>
			</div>

			{/* ── Filter bar ──────────────────────────────────────────────────── */}
			<div className="bg-[#141414] border border-[#222] rounded-xl p-4 mb-4 space-y-3">
				{/* Search */}
				<div className="relative">
					<Search
						size={15}
						className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5A5249] pointer-events-none"
					/>
					<input
						type="text"
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder="Rechercher une table…"
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

				{/* Zone pills */}
				{ZONE_ORDER.some((z) => zoneCounts[z] > 0) && (
					<div className="flex items-center gap-2 flex-wrap">
						<button
							onClick={() => setZoneFilter(null)}
							className={cn(
								"flex items-center gap-1.5 px-3 h-8 rounded-full border text-xs font-medium transition-all whitespace-nowrap",
								!zoneFilter
									? "bg-[#C8973A]/10 border-[#C8973A]/30 text-[#C8973A]"
									: "border-[#222] text-[#5A5249] hover:border-[#333] hover:text-[#9A8F84]"
							)}
						>
							Toutes les zones
							<span
								className={cn(
									"text-[10px] px-1.5 py-0.5 rounded-full font-semibold",
									!zoneFilter ? "bg-white/10" : "bg-[#1a1a1a] text-[#5A5249]"
								)}
							>
								{tables.length}
							</span>
						</button>

						{ZONE_ORDER.map((zone) =>
							zoneCounts[zone] > 0 ? (
								<ZonePill
									key={zone}
									zone={zone}
									count={zoneCounts[zone]}
									active={zoneFilter === zone}
									onClick={() =>
										setZoneFilter((v) => (v === zone ? null : zone))
									}
								/>
							) : null
						)}
					</div>
				)}
			</div>

			{/* ── Content ─────────────────────────────────────────────────────── */}

			{tables.length === 0 ? (
				/* Empty state */
				<div className="text-center py-24 border border-dashed border-[#222] rounded-xl">
					<div className="w-12 h-12 rounded-xl bg-[#141414] border border-[#222] flex items-center justify-center mx-auto mb-4">
						<TableProperties size={22} className="text-[#333]" />
					</div>
					<p className="text-sm font-medium text-[#5A5249] mb-1">
						Aucune table configurée
					</p>
					<p className="text-xs text-[#333] mb-5">
						Ajoutez vos tables pour utiliser le plan de salle dynamique
					</p>
					<Link
						href="/admin/tables/new"
						className="inline-flex items-center gap-2 h-9 px-4 bg-[#C8973A] hover:bg-[#E8B04A] text-[#0A0A0A] text-sm font-semibold rounded-lg transition-colors"
					>
						<Plus size={15} />
						Ajouter une table
					</Link>
				</div>
			) : byZone.length === 0 ? (
				/* No results after filters */
				<div className="text-center py-16 border border-dashed border-[#222] rounded-xl">
					<p className="text-sm text-[#5A5249]">
						Aucune table ne correspond à vos filtres
					</p>
					{hasActiveFilters && (
						<button
							onClick={() => {
								setSearch("");
								setZoneFilter(null);
								setStatusFilter("all");
							}}
							className="mt-3 text-xs text-[#C8973A] hover:underline"
						>
							Réinitialiser les filtres
						</button>
					)}
				</div>
			) : (
				/* Grouped by zone */
				<div className="space-y-3">
					{byZone.map(({ zone, rows }) => {
						const meta        = ZONE_META[zone];
						const activeCount = rows.filter((r) => r.isActif).length;

						return (
							<div
								key={zone}
								className="bg-[#141414] border border-[#222] rounded-xl overflow-hidden"
							>
								{/* Zone header */}
								<div className="px-4 sm:px-5 py-3 border-b border-[#1e1e1e] flex items-center gap-3">
									<span
										className={cn(
											"text-[11px] font-semibold px-2.5 py-1 rounded-lg border",
											meta.badge
										)}
									>
										{meta.full}
									</span>
									<span className="text-xs text-[#5A5249]">
										{rows.length} table{rows.length > 1 ? "s" : ""}
									</span>
									<span className="text-xs text-[#333] ml-auto">
										{activeCount}/{rows.length} actives
									</span>
								</div>

								{/* Table rows */}
								<div className="divide-y divide-[#1a1a1a]">
									{rows.map((t) => (
										<div
											key={t.id}
											className={cn(
												"group flex items-center gap-2 sm:gap-4 px-4 sm:px-5 py-3 transition-colors hover:bg-[#1a1a1a]",
												!t.isActif && "opacity-50"
											)}
										>
											{/* Status dot */}
											<div
												className={cn(
													"w-2 h-2 rounded-full shrink-0",
													t.isActif ? "bg-green-500" : "bg-[#333]"
												)}
											/>

											{/* Table number */}
											<Link
												href={`/admin/tables/${t.id}`}
												className="text-sm font-bold text-[#F5F0EB] w-8 sm:w-10 shrink-0 tabular-nums hover:text-[#C8973A] transition-colors"
											>
												T{t.numero}
											</Link>

											{/* Capacity */}
											<div className="flex items-center gap-1 sm:gap-1.5 text-xs text-[#9A8F84] shrink-0">
												<Users size={12} className="text-[#5A5249] shrink-0" />
												<span className="tabular-nums">
													{t.capaciteMin === t.capaciteMax
														? `${t.capaciteMax} cv`
														: `${t.capaciteMin}–${t.capaciteMax} cv`}
												</span>
											</div>

											{/* Description — hidden on mobile */}
											{t.description ? (
												<span className="hidden sm:block text-xs text-[#5A5249] flex-1 truncate">
													{t.description}
												</span>
											) : (
												<span className="hidden sm:block flex-1" />
											)}

											{/* Reservation count */}
											<span className="text-[11px] text-[#333] shrink-0 ml-auto sm:ml-0">
												{t._count.reservations} résa
												{t._count.reservations !== 1 ? "s" : ""}
											</span>

											{/* ── Actions ──────────────────────────────────── */}
											<div className="flex items-center gap-0.5 sm:gap-1 shrink-0">

												{/* Edit → dedicated form page */}
												<Link
													href={`/admin/tables/${t.id}`}
													title="Modifier"
													className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-[#5A5249] hover:text-[#9A8F84] hover:bg-[#252525] transition-all"
												>
													<Edit size={14} />
												</Link>

												{/* Delete with inline confirm */}
												{deleteConfirm === t.id ? (
													<div className="flex items-center gap-0.5">
														<button
															onClick={() => handleDelete(t)}
															disabled={loading === `delete-${t.id}`}
															title="Confirmer la suppression"
															className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-red-500 hover:bg-red-950/30 transition-all"
														>
															<Check size={14} />
														</button>
														<button
															onClick={() => setDeleteConfirm(null)}
															title="Annuler"
															className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-[#5A5249] hover:text-[#9A8F84] hover:bg-[#252525] transition-all"
														>
															<X size={14} />
														</button>
													</div>
												) : (
													<button
														onClick={() => setDeleteConfirm(t.id)}
														title="Supprimer"
														className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-[#5A5249] hover:text-red-400 hover:bg-red-950/30 transition-all"
													>
														<Trash2 size={14} />
													</button>
												)}
											</div>
										</div>
									))}
								</div>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}
