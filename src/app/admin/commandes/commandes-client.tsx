"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import Link from "next/link";
import {
	Search,
	Eye,
	Download,
	UtensilsCrossed,
	Clock,
	CheckCircle2,
	AlertCircle,
	XCircle,
	ChevronDown,
	ChevronUp,
	ChevronsUpDown,
	ChevronLeft,
	ChevronRight,
	ConciergeBell,
	TableProperties,
} from "lucide-react";
import { cn, formatDate, formatPrice } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ZONE_LABELS } from "@/lib/constants";
import type { ServiceStatus, ServiceType, ZoneTable, PaymentMethodService, CourseType } from "@/types";

interface OrderItem {
	id: string;
	dishName: string;
	unitPrice: number;
	qty: number;
	totalPrice: number;
	notes: string | null;
	course: CourseType;
}

interface TableInfo {
	id: string;
	numero: number;
	zone: ZoneTable;
}

interface ReservationInfo {
	id: string;
	guestFirstName: string;
	guestLastName: string;
	timeSlot: string;
}

interface ServiceOrder {
	id: string;
	guestName: string;
	covers: number;
	type: ServiceType;
	status: ServiceStatus;
	notes: string | null;
	paymentMethod: PaymentMethodService | null;
	depositDeducted: number;
	totalAmount: number;
	openedAt: Date;
	closedAt: Date | null;
	createdAt: Date;
	table: TableInfo;
	reservation: ReservationInfo | null;
	items: OrderItem[];
}

interface Props {
	orders: ServiceOrder[];
}

const SERVICE_STATUS_META: Record<
	string,
	{ label: string; color: "yellow" | "green" | "red" | "gray" | "orange" | "blue" }
> = {
	OUVERTE:           { label: "En cours",          color: "blue"   },
	ADDITION_DEMANDEE: { label: "Addition demandée", color: "yellow" },
	PAYEE:             { label: "Payée",             color: "green"  },
	ANNULEE:           { label: "Annulée",           color: "red"    },
};

const SERVICE_TYPE_LABELS: Record<string, string> = {
	RESERVATION: "Réservation",
	WALK_IN:     "Sur place",
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
	CB:           "Carte bancaire",
	ESPECES:      "Espèces",
	CHEQUE:       "Chèque",
	TICKET_RESTO: "Ticket-restaurant",
};

const PER_PAGE = 10;

type SortKey = "date" | "table" | "amount" | "status";
type SortDir = "asc" | "desc";

function Highlight({ text, query }: { text: string; query: string }) {
	if (!query.trim()) return <>{text}</>;
	const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const parts = text.split(new RegExp(`(${escaped})`, "gi"));
	return (
		<>
			{parts.map((part, i) =>
				part.toLowerCase() === query.toLowerCase() ? (
					<mark key={i} className="bg-yellow-400/25 text-inherit rounded-[2px] px-0.5">
						{part}
					</mark>
				) : (
					part
				)
			)}
		</>
	);
}

function dateLabel(date: Date): { text: string; accent: boolean } {
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const d = new Date(date);
	d.setHours(0, 0, 0, 0);
	const diff = Math.round((d.getTime() - today.getTime()) / 86_400_000);
	if (diff === 0) return { text: "Aujourd'hui", accent: true };
	if (diff === 1) return { text: "Demain",       accent: true };
	if (diff === -1) return { text: "Hier",         accent: false };
	return { text: formatDate(date, "dd/MM/yyyy"), accent: false };
}

function buildPageList(current: number, total: number): (number | "…")[] {
	if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
	const pages: (number | "…")[] = [1];
	if (current > 3) pages.push("…");
	for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) {
		pages.push(p);
	}
	if (current < total - 2) pages.push("…");
	pages.push(total);
	return pages;
}

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
				<p className="text-2xl font-semibold text-[#F5F0EB] leading-none tabular-nums">{value}</p>
				<p className="text-xs text-[#5A5249] mt-1 truncate">{label}</p>
			</div>
		</button>
	);
}

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

function StatusPill({
	label,
	count,
	color,
	active,
	onClick,
}: {
	label: string;
	count: number;
	color?: string;
	active: boolean;
	onClick: () => void;
}) {
	const activeClass =
		color === "yellow"
			? "bg-yellow-500/10 border-yellow-500/30 text-yellow-400"
			: color === "green"
			? "bg-green-500/10 border-green-500/30 text-green-400"
			: color === "red"
			? "bg-red-500/10 border-red-500/30 text-red-400"
			: color === "blue"
			? "bg-blue-500/10 border-blue-500/30 text-blue-400"
			: "bg-[#C8973A]/10 border-[#C8973A]/30 text-[#C8973A]";

	return (
		<button
			onClick={onClick}
			className={cn(
				"flex items-center gap-1.5 px-3 h-8 rounded-full border text-xs font-medium transition-all whitespace-nowrap",
				active ? activeClass : "border-[#222] text-[#5A5249] hover:border-[#333] hover:text-[#9A8F84]"
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

function MobileInfoCell({
	label,
	value,
	accent,
}: {
	label: string;
	value: string;
	accent?: boolean;
}) {
	return (
		<div className="bg-[#0A0A0A] rounded-lg px-2.5 py-2">
			<p className="text-[10px] text-[#5A5249] mb-0.5">{label}</p>
			<p
				className={cn(
					"text-xs font-medium truncate",
					accent ? "text-[#C8973A]" : "text-[#F5F0EB]"
				)}
			>
				{value}
			</p>
		</div>
	);
}

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

function EmptyState({ onReset }: { onReset?: () => void }) {
	return (
		<div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
			<div className="w-12 h-12 rounded-full bg-[#1a1a1a] flex items-center justify-center">
				<Search size={20} className="text-[#5A5249]" />
			</div>
			<p className="text-sm text-[#5A5249]">Aucune commande trouvée</p>
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

export default function CommandesClient({ orders }: Props) {
	const [search,       setSearch]       = useState("");
	const [activeStatus, setActiveStatus] = useState<ServiceStatus | null>(null);
	const [typeFilter,   setTypeFilter]   = useState<ServiceType | "">("");
	const [sortKey,      setSortKey]      = useState<SortKey>("date");
	const [sortDir,      setSortDir]      = useState<SortDir>("desc");
	const [page,         setPage]         = useState(1);

	const stats = useMemo(() => {
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		return {
			total:     orders.length,
			ouverte:   orders.filter((o) => o.status === "OUVERTE").length,
			addition:  orders.filter((o) => o.status === "ADDITION_DEMANDEE").length,
			payee:     orders.filter((o) => o.status === "PAYEE").length,
			annulee:   orders.filter((o) => o.status === "ANNULEE").length,
			todayCount: orders.filter((o) => {
				const d = new Date(o.openedAt);
				d.setHours(0, 0, 0, 0);
				return d.getTime() === today.getTime();
			}).length,
		};
	}, [orders]);

	const statusCounts = useMemo(() => {
		const c: Record<string, number> = {};
		orders.forEach((o) => { c[o.status] = (c[o.status] ?? 0) + 1; });
		return c;
	}, [orders]);

	const filtered = useMemo(() => {
		const q = search.toLowerCase().trim();

		let result = orders.filter((o) => {
			if (q) {
				const haystack = [
					o.guestName,
					`T${o.table.numero}`,
					o.reservation?.guestFirstName ?? "",
					o.reservation?.guestLastName ?? "",
					ZONE_LABELS[o.table.zone]?.label ?? "",
				]
					.join(" ")
					.toLowerCase();
				if (!haystack.includes(q)) return false;
			}
			if (activeStatus && o.status !== activeStatus) return false;
			if (typeFilter && o.type !== typeFilter) return false;
			return true;
		});

		result = [...result].sort((a, b) => {
			let cmp = 0;
			if (sortKey === "date") {
				cmp = new Date(a.openedAt).getTime() - new Date(b.openedAt).getTime();
			} else if (sortKey === "table") {
				cmp = a.table.numero - b.table.numero;
			} else if (sortKey === "amount") {
				cmp = a.totalAmount - b.totalAmount;
			} else if (sortKey === "status") {
				cmp = a.status.localeCompare(b.status);
			}
			return sortDir === "asc" ? cmp : -cmp;
		});

		return result;
	}, [orders, search, activeStatus, typeFilter, sortKey, sortDir]);

	useEffect(() => { setPage(1); }, [search, activeStatus, typeFilter, sortKey, sortDir]);

	const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
	const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

	const handleSortClick = useCallback(
		(key: SortKey) => {
			if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
			else { setSortKey(key); setSortDir("desc"); }
		},
		[sortKey]
	);

	const handleStatusPill = useCallback((s: ServiceStatus | null) => {
		setActiveStatus((prev) => (prev === s ? null : s));
	}, []);

	const resetFilters = useCallback(() => {
		setSearch("");
		setActiveStatus(null);
		setTypeFilter("");
	}, []);

	const handleExport = useCallback(() => {
		const headers = [
			"Table", "Zone", "Client", "Couverts", "Type",
			"Statut", "Total (€)", "Acompte déduit (€)", "Paiement",
			"Ouvert le", "Clôturé le",
		];
		const rows = filtered.map((o) => [
			`T${o.table.numero}`,
			ZONE_LABELS[o.table.zone]?.label ?? o.table.zone,
			o.guestName,
			String(o.covers),
			SERVICE_TYPE_LABELS[o.type] ?? o.type,
			SERVICE_STATUS_META[o.status]?.label ?? o.status,
			o.totalAmount.toFixed(2),
			o.depositDeducted.toFixed(2),
			o.paymentMethod ? (PAYMENT_METHOD_LABELS[o.paymentMethod] ?? o.paymentMethod) : "",
			formatDate(o.openedAt, "dd/MM/yyyy HH:mm"),
			o.closedAt ? formatDate(o.closedAt, "dd/MM/yyyy HH:mm") : "",
		]);
		const csv = [headers, ...rows]
			.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
			.join("\n");
		const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
		const url  = URL.createObjectURL(blob);
		const a    = Object.assign(document.createElement("a"), {
			href: url,
			download: `commandes-${new Date().toISOString().slice(0, 10)}.csv`,
		});
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}, [filtered]);

	return (
		<div className="space-y-6">
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
				<div>
					<h1 className="font-display text-2xl text-[#F5F0EB]">Commandes</h1>
					<p className="text-sm text-[#5A5249] mt-0.5">
						{orders.length} commande{orders.length !== 1 ? "s" : ""} au total
					</p>
				</div>
				<button
					onClick={handleExport}
					className="flex items-center gap-2 px-4 h-9 rounded-lg border border-[#222] text-sm text-[#9A8F84] hover:text-[#F5F0EB] hover:bg-[#1a1a1a] transition-colors shrink-0"
				>
					<Download size={14} />
					Exporter
				</button>
			</div>

			<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
				<StatCard
					label="Total"
					value={stats.total}
					icon={ConciergeBell}
					iconColor="bg-[#1a1a1a] text-[#9A8F84]"
				/>
				<StatCard
					label="En cours"
					value={stats.ouverte}
					icon={UtensilsCrossed}
					iconColor="bg-blue-500/10 text-blue-400"
					active={activeStatus === "OUVERTE"}
					onClick={() => handleStatusPill("OUVERTE")}
				/>
				<StatCard
					label="Addition demandée"
					value={stats.addition}
					icon={AlertCircle}
					iconColor="bg-yellow-500/10 text-yellow-400"
					active={activeStatus === "ADDITION_DEMANDEE"}
					onClick={() => handleStatusPill("ADDITION_DEMANDEE")}
				/>
				<StatCard
					label="Payées"
					value={stats.payee}
					icon={CheckCircle2}
					iconColor="bg-green-500/10 text-green-400"
					active={activeStatus === "PAYEE"}
					onClick={() => handleStatusPill("PAYEE")}
				/>
			</div>

			<div className="flex flex-col gap-3">
				<div className="relative">
					<Search
						size={14}
						className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5A5249] pointer-events-none"
					/>
					<input
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder="Rechercher par client, table, zone…"
						className="w-full pl-9 pr-4 h-9 bg-[#0A0A0A] border border-[#222] rounded-lg text-sm text-[#F5F0EB] placeholder-[#333] focus:outline-none focus:border-[#C8973A]/50 transition-colors"
					/>
				</div>

				<div className="flex flex-wrap gap-2">
					{(
						Object.entries(SERVICE_STATUS_META) as [ServiceStatus, typeof SERVICE_STATUS_META[string]][]
					).map(([status, meta]) => (
						<StatusPill
							key={status}
							label={meta.label}
							count={statusCounts[status] ?? 0}
							color={meta.color}
							active={activeStatus === status}
							onClick={() => handleStatusPill(status)}
						/>
					))}

					<div className="ml-auto flex items-center gap-2">
						<select
							value={typeFilter}
							onChange={(e) => setTypeFilter(e.target.value as ServiceType | "")}
							className="h-8 px-2 bg-[#0A0A0A] border border-[#222] rounded-lg text-xs text-[#9A8F84] focus:outline-none focus:border-[#C8973A]/50 transition-colors"
						>
							<option value="">Tous les types</option>
							<option value="RESERVATION">Réservation</option>
							<option value="WALK_IN">Sur place</option>
						</select>
					</div>
				</div>
			</div>

			<div className="hidden md:block rounded-xl border border-[#222] overflow-hidden">
				<table className="w-full text-sm">
					<thead>
						<tr className="border-b border-[#222] bg-[#0A0A0A]">
							<th className="px-4 py-3 text-left">
								<SortBtn label="Date" sortKey="date" current={sortKey} dir={sortDir} onClick={handleSortClick} />
							</th>
							<th className="px-4 py-3 text-left">
								<SortBtn label="Table" sortKey="table" current={sortKey} dir={sortDir} onClick={handleSortClick} />
							</th>
							<th className="px-4 py-3 text-left">
								<span className="text-xs font-semibold uppercase tracking-wider text-[#5A5249]">Client</span>
							</th>
							<th className="px-4 py-3 text-left">
								<span className="text-xs font-semibold uppercase tracking-wider text-[#5A5249]">Type</span>
							</th>
							<th className="px-4 py-3 text-left">
								<SortBtn label="Statut" sortKey="status" current={sortKey} dir={sortDir} onClick={handleSortClick} />
							</th>
							<th className="px-4 py-3 text-right">
								<SortBtn label="Total" sortKey="amount" current={sortKey} dir={sortDir} onClick={handleSortClick} />
							</th>
							<th className="px-4 py-3" />
						</tr>
					</thead>
					<tbody className="divide-y divide-[#1a1a1a] bg-[#141414]">
						{paginated.length === 0 ? (
							<tr>
								<td colSpan={7}>
									<EmptyState onReset={search || activeStatus || typeFilter ? resetFilters : undefined} />
								</td>
							</tr>
						) : (
							paginated.map((o) => {
								const meta = SERVICE_STATUS_META[o.status];
								const dl   = dateLabel(new Date(o.openedAt));
								return (
									<tr
										key={o.id}
										className="hover:bg-[#1a1a1a] transition-colors group"
									>
										<td className="px-4 py-3">
											<span
												className={cn(
													"text-sm font-medium",
													dl.accent ? "text-[#C8973A]" : "text-[#F5F0EB]"
												)}
											>
												<Highlight text={dl.text} query={search} />
											</span>
											<span className="block text-xs text-[#5A5249] mt-0.5">
												{formatDate(o.openedAt, "HH:mm")}
											</span>
										</td>
										<td className="px-4 py-3">
											<span className="text-sm font-semibold text-[#F5F0EB]">
												<Highlight text={`T${o.table.numero}`} query={search} />
											</span>
											<span className="block text-xs text-[#5A5249]">
												<Highlight text={ZONE_LABELS[o.table.zone]?.label ?? o.table.zone} query={search} />
											</span>
										</td>
										<td className="px-4 py-3">
											<span className="text-sm text-[#F5F0EB]">
												<Highlight text={o.guestName} query={search} />
											</span>
											<span className="block text-xs text-[#5A5249]">
												{o.covers} couvert{o.covers > 1 ? "s" : ""}
											</span>
										</td>
										<td className="px-4 py-3">
											<span className="text-xs text-[#9A8F84]">
												{SERVICE_TYPE_LABELS[o.type] ?? o.type}
											</span>
										</td>
										<td className="px-4 py-3">
											<Badge variant={meta?.color ?? "gray"} className="text-[11px]">
												{meta?.label ?? o.status}
											</Badge>
										</td>
										<td className="px-4 py-3 text-right">
											<span className="text-sm font-semibold text-[#C8973A]">
												{o.totalAmount > 0 ? formatPrice(o.totalAmount) : "—"}
											</span>
											{o.depositDeducted > 0 && (
												<span className="block text-[10px] text-green-400 mt-0.5">
													−{formatPrice(o.depositDeducted)} acompte
												</span>
											)}
										</td>
										<td className="px-4 py-3 text-right">
											<Link
												href={`/admin/commandes/${o.id}`}
												className="inline-flex items-center gap-1.5 p-1.5 rounded-lg text-[#5A5249] hover:text-[#9A8F84] hover:bg-[#252525] transition-all opacity-0 group-hover:opacity-100"
												title="Voir la commande"
											>
												<Eye size={14} />
											</Link>
										</td>
									</tr>
								);
							})
						)}
					</tbody>
				</table>
			</div>

			<div className="md:hidden space-y-3">
				{paginated.length === 0 ? (
					<EmptyState onReset={search || activeStatus || typeFilter ? resetFilters : undefined} />
				) : (
					paginated.map((o) => {
						const meta = SERVICE_STATUS_META[o.status];
						const dl   = dateLabel(new Date(o.openedAt));
						return (
							<div
								key={o.id}
								className="bg-[#141414] border border-[#222] hover:border-[#333] hover:bg-[#1a1a1a] rounded-xl p-4 transition-colors"
							>
								<div className="flex items-start justify-between gap-3 mb-3">
									<div className="flex items-center gap-3 min-w-0">
										<div className="w-9 h-9 rounded-full bg-[#C8973A]/10 border border-[#C8973A]/20 flex items-center justify-center shrink-0">
											<TableProperties size={15} className="text-[#C8973A]" />
										</div>
										<div className="min-w-0">
											<p className="text-sm font-semibold text-[#F5F0EB] truncate">
												<Highlight text={`T${o.table.numero}`} query={search} />{" "}
												<span className="text-[#5A5249] font-normal">·</span>{" "}
												<Highlight text={o.guestName} query={search} />
											</p>
											<p className="text-xs text-[#5A5249] truncate">
												{ZONE_LABELS[o.table.zone]?.label ?? o.table.zone} ·{" "}
												{SERVICE_TYPE_LABELS[o.type] ?? o.type}
											</p>
										</div>
									</div>
									<Badge variant={meta?.color ?? "gray"} className="shrink-0">
										{meta?.label ?? o.status}
									</Badge>
								</div>

								<div className="grid grid-cols-3 gap-2 mb-3">
									<MobileInfoCell label="Date"     value={dl.text}    accent={dl.accent} />
									<MobileInfoCell label="Heure"    value={formatDate(o.openedAt, "HH:mm")} />
									<MobileInfoCell label="Couverts" value={`${o.covers} pers.`} />
								</div>

								<div className="flex items-center justify-between pt-3 border-t border-[#1a1a1a]">
									<span className="text-sm font-semibold text-[#C8973A]">
										{o.totalAmount > 0 ? formatPrice(o.totalAmount) : "—"}
									</span>
									<Link
										href={`/admin/commandes/${o.id}`}
										title="Ouvrir la commande"
										className="p-1.5 rounded-lg text-[#5A5249] hover:text-[#9A8F84] hover:bg-[#252525] transition-all"
									>
										<Eye size={14} />
									</Link>
								</div>
							</div>
						);
					})
				)}
			</div>

			{filtered.length > 0 && (
				<div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
					<p className="text-xs text-[#5A5249] order-2 sm:order-1">
						{(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} sur{" "}
						{filtered.length} commande{filtered.length > 1 ? "s" : ""}
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
		</div>
	);
}
