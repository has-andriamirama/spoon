"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import Link from "next/link";
import {
	Search,
	Download,
	FileText,
	Receipt,
	TrendingUp,
	CalendarDays,
	ChevronDown,
	ChevronUp,
	ChevronsUpDown,
	ChevronLeft,
	ChevronRight,
	Eye,
} from "lucide-react";
import { cn, formatDate, formatPrice } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReservationInfo {
	id: string;
	guestFirstName: string;
	guestLastName: string;
	date: Date;
	timeSlot: string;
}

interface Invoice {
	id: string;
	invoiceNumber: string;
	guestEmail: string;
	amount: number;
	taxAmount: number;
	totalAmount: number;
	pdfUrl: string | null;
	issuedAt: Date;
	createdAt: Date;
	reservation: ReservationInfo;
}

interface Props {
	invoices: Invoice[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PER_PAGE = 10;
const GRID_COLS = "grid-cols-[1fr_1.3fr_1fr_0.8fr_0.7fr_0.7fr_88px]";

type SortKey = "date" | "amount" | "number" | "client";
type SortDir = "asc" | "desc";

// ─── Highlight ────────────────────────────────────────────────────────────────

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

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({
	label,
	value,
	sub,
	icon: Icon,
	iconColor,
}: {
	label: string;
	value: string | number;
	sub?: string;
	icon: React.ElementType;
	iconColor: string;
}) {
	return (
		<div className="flex items-center gap-3 p-4 rounded-xl border border-[#222] bg-[#141414] cursor-default">
			<div className={cn("p-2 rounded-lg shrink-0", iconColor)}>
				<Icon size={18} />
			</div>
			<div className="min-w-0">
				<p className="text-2xl font-semibold text-[#F5F0EB] leading-none tabular-nums">{value}</p>
				<p className="text-xs text-[#5A5249] mt-1 truncate">{label}</p>
				{sub && <p className="text-[10px] text-[#C8973A] mt-0.5 font-medium">{sub}</p>}
			</div>
		</div>
	);
}

// ─── SortBtn ──────────────────────────────────────────────────────────────────

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

// ─── EmptyState ───────────────────────────────────────────────────────────────

function EmptyState({ onReset }: { onReset?: () => void }) {
	return (
		<div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
			<div className="w-12 h-12 rounded-full bg-[#1a1a1a] flex items-center justify-center">
				<Search size={20} className="text-[#5A5249]" />
			</div>
			<p className="text-sm text-[#5A5249]">Aucune facture trouvée</p>
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

// ─── Main Component ───────────────────────────────────────────────────────────

export default function InvoicesClient({ invoices }: Props) {
	const [search,  setSearch]  = useState("");
	const [sortKey, setSortKey] = useState<SortKey>("date");
	const [sortDir, setSortDir] = useState<SortDir>("desc");
	const [page,    setPage]    = useState(1);

	// ── Stats ──
	const stats = useMemo(() => ({
		total:    invoices.length,
		totalHT:  invoices.reduce((s, i) => s + i.amount, 0),
		totalTVA: invoices.reduce((s, i) => s + i.taxAmount, 0),
		totalTTC: invoices.reduce((s, i) => s + i.totalAmount, 0),
		hasPdf:   invoices.filter((i) => !!i.pdfUrl).length,
	}), [invoices]);

	// ── Filtered + sorted ──
	const filtered = useMemo(() => {
		const q = search.toLowerCase().trim();

		let result = invoices.filter((inv) => {
			if (q) {
				const fullName = `${inv.reservation.guestFirstName} ${inv.reservation.guestLastName}`;
				const haystack = [fullName, inv.guestEmail, inv.invoiceNumber]
					.join(" ")
					.toLowerCase();
				if (!haystack.includes(q)) return false;
			}
			return true;
		});

		result = [...result].sort((a, b) => {
			let cmp = 0;
			if (sortKey === "date")   cmp = new Date(a.issuedAt).getTime() - new Date(b.issuedAt).getTime();
			if (sortKey === "amount") cmp = a.totalAmount - b.totalAmount;
			if (sortKey === "number") cmp = a.invoiceNumber.localeCompare(b.invoiceNumber);
			if (sortKey === "client") {
				const na = `${a.reservation.guestLastName} ${a.reservation.guestFirstName}`;
				const nb = `${b.reservation.guestLastName} ${b.reservation.guestFirstName}`;
				cmp = na.localeCompare(nb, "fr");
			}
			return sortDir === "asc" ? cmp : -cmp;
		});

		return result;
	}, [invoices, search, sortKey, sortDir]);

	useEffect(() => { setPage(1); }, [search, sortKey, sortDir]);

	const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
	const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

	// ── Handlers ──
	const handleSortClick = useCallback(
		(key: SortKey) => {
			if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
			else { setSortKey(key); setSortDir("desc"); }
		},
		[sortKey]
	);

	const resetFilters = useCallback(() => { setSearch(""); }, []);

	const handleExport = useCallback(() => {
		const headers = ["N° Facture", "Client", "Email", "Date émission", "Montant HT (€)", "TVA (€)", "Total TTC (€)", "PDF"];
		const rows = filtered.map((inv) => [
			inv.invoiceNumber,
			`${inv.reservation.guestFirstName} ${inv.reservation.guestLastName}`,
			inv.guestEmail,
			formatDate(inv.issuedAt, "dd/MM/yyyy"),
			inv.amount.toFixed(2),
			inv.taxAmount.toFixed(2),
			inv.totalAmount.toFixed(2),
			inv.pdfUrl ?? "",
		]);
		const csv = [headers, ...rows]
			.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
			.join("\n");
		const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
		const url  = URL.createObjectURL(blob);
		const a    = Object.assign(document.createElement("a"), {
			href: url,
			download: `factures-${new Date().toISOString().slice(0, 10)}.csv`,
		});
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}, [filtered]);

	const hasActiveFilters = !!search;

	return (
		<div className="space-y-6">

			{/* ── Header ── */}
			<div className="flex items-center justify-between gap-4">
				<div>
					<h1 className="font-display text-2xl text-[#F5F0EB]">Factures</h1>
					<p className="text-sm text-[#5A5249] mt-0.5">
						{invoices.length} facture{invoices.length !== 1 ? "s" : ""} émise{invoices.length !== 1 ? "s" : ""}
					</p>
				</div>
				<button
					onClick={handleExport}
					className="flex items-center gap-2 px-3 sm:px-4 h-9 rounded-lg border border-[#222] text-sm text-[#9A8F84] hover:text-[#F5F0EB] hover:bg-[#1a1a1a] transition-colors shrink-0"
				>
					<Download size={14} />
					<span className="hidden sm:inline">Exporter</span>
				</button>
			</div>

			{/* ── Stats ── */}
			<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
				<StatCard
					label="Total factures"
					value={stats.total}
					icon={FileText}
					iconColor="bg-[#1a1a1a] text-[#9A8F84]"
				/>
				<StatCard
					label="Total TTC encaissé"
					value={formatPrice(stats.totalTTC)}
					icon={TrendingUp}
					iconColor="bg-green-500/10 text-green-400"
				/>
				<StatCard
					label="Total HT"
					value={formatPrice(stats.totalHT)}
					icon={Receipt}
					iconColor="bg-[#C8973A]/10 text-[#C8973A]"
				/>
				<StatCard
					label="Total TVA"
					value={formatPrice(stats.totalTVA)}
					icon={CalendarDays}
					iconColor="bg-blue-500/10 text-blue-400"
				/>
			</div>

			{/* ── Search ── */}
			<div className="relative">
				<Search
					size={14}
					className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5A5249] pointer-events-none"
				/>
				<input
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					placeholder="Rechercher par N° facture, client, email…"
					className="w-full pl-9 pr-4 h-9 bg-[#0A0A0A] border border-[#222] rounded-lg text-sm text-[#F5F0EB] placeholder-[#333] focus:border-[#C8973A] focus:ring-1 focus:ring-[#C8973A] outline-none transition-colors"
				/>
			</div>

			{/* ── Desktop Table ── */}
			<div className="hidden md:block bg-[#141414] border border-[#222] rounded-xl overflow-hidden">

				<div className={cn("grid items-center px-5 py-3 border-b border-[#222] bg-[#141414]", GRID_COLS)}>
					<SortBtn label="N° Facture" sortKey="number" current={sortKey} dir={sortDir} onClick={handleSortClick} />
					<SortBtn label="Client"     sortKey="client" current={sortKey} dir={sortDir} onClick={handleSortClick} />
					<SortBtn label="Date"       sortKey="date"   current={sortKey} dir={sortDir} onClick={handleSortClick} />
					<span className="text-xs font-semibold uppercase tracking-wider text-[#5A5249]">HT</span>
					<span className="text-xs font-semibold uppercase tracking-wider text-[#5A5249]">TVA</span>
					<div className="flex justify-end">
						<SortBtn label="TTC" sortKey="amount" current={sortKey} dir={sortDir} onClick={handleSortClick} />
					</div>
					<span className="text-xs font-semibold uppercase tracking-wider text-[#5A5249] text-right">Actions</span>
				</div>

				{paginated.length === 0 ? (
					<EmptyState onReset={hasActiveFilters ? resetFilters : undefined} />
				) : (
					<div className="divide-y divide-[#1a1a1a]">
						{paginated.map((inv) => {
							const fullName = `${inv.reservation.guestFirstName} ${inv.reservation.guestLastName}`;
							return (
								<div
									key={inv.id}
									className={cn(
										"group grid items-center px-5 py-3.5 hover:bg-[#1a1a1a] transition-colors",
										GRID_COLS
									)}
								>
									{/* N° */}
									<span className="text-sm font-mono font-medium text-[#F5F0EB]">
										<Highlight text={inv.invoiceNumber} query={search} />
									</span>

									{/* Client */}
									<div className="min-w-0">
										<span className="text-sm text-[#F5F0EB] block truncate">
											<Highlight text={fullName} query={search} />
										</span>
										<span className="text-xs text-[#5A5249] block truncate">
											<Highlight text={inv.guestEmail} query={search} />
										</span>
									</div>

									{/* Date */}
									<span className="text-sm text-[#9A8F84]">
										{formatDate(inv.issuedAt, "dd/MM/yyyy")}
									</span>

									{/* HT */}
									<span className="text-sm text-[#9A8F84] tabular-nums">
										{formatPrice(inv.amount)}
									</span>

									{/* TVA */}
									<span className="text-sm text-[#9A8F84] tabular-nums">
										{formatPrice(inv.taxAmount)}
									</span>

									{/* TTC */}
									<div className="text-right">
										<span className="text-sm font-semibold text-[#C8973A] tabular-nums">
											{formatPrice(inv.totalAmount)}
										</span>
									</div>

									{/* Actions */}
									<div className="flex items-center justify-end gap-1">
										{inv.pdfUrl && (
											<a
												href={inv.pdfUrl}
												target="_blank"
												rel="noopener noreferrer"
												className="p-1.5 rounded-lg text-[#5A5249] hover:text-[#C8973A] hover:bg-[#252525] transition-all opacity-0 group-hover:opacity-100"
												title="Télécharger PDF"
											>
												<Download size={14} />
											</a>
										)}
										<Link
											href={`/admin/invoices/${inv.id}`}
											className="p-1.5 rounded-lg text-[#5A5249] hover:text-[#9A8F84] hover:bg-[#252525] transition-all opacity-0 group-hover:opacity-100"
											title="Voir la facture"
										>
											<Eye size={14} />
										</Link>
									</div>
								</div>
							);
						})}
					</div>
				)}
			</div>

			{/* ── Mobile Cards ── */}
			<div className="md:hidden space-y-3">
				{paginated.length === 0 ? (
					<EmptyState onReset={hasActiveFilters ? resetFilters : undefined} />
				) : (
					paginated.map((inv) => {
						const fullName = `${inv.reservation.guestFirstName} ${inv.reservation.guestLastName}`;
						return (
							<div
								key={inv.id}
								className="bg-[#141414] border border-[#222] rounded-xl p-4 space-y-3"
							>
								<div className="flex items-start justify-between gap-3">
									<div className="min-w-0">
										<p className="text-xs font-mono font-medium text-[#C8973A] truncate">
											<Highlight text={inv.invoiceNumber} query={search} />
										</p>
										<p className="text-sm font-medium text-[#F5F0EB] mt-0.5 truncate">
											<Highlight text={fullName} query={search} />
										</p>
										<p className="text-xs text-[#5A5249] mt-0.5">
											{formatDate(inv.issuedAt, "dd/MM/yyyy")}
										</p>
									</div>
									<span className="text-base font-semibold text-[#C8973A] tabular-nums shrink-0">
										{formatPrice(inv.totalAmount)}
									</span>
								</div>

								<div className="grid grid-cols-2 gap-2">
									<div className="bg-[#0A0A0A] rounded-lg px-2.5 py-2">
										<p className="text-[10px] text-[#5A5249] mb-0.5">HT</p>
										<p className="text-xs font-medium text-[#F5F0EB]">{formatPrice(inv.amount)}</p>
									</div>
									<div className="bg-[#0A0A0A] rounded-lg px-2.5 py-2">
										<p className="text-[10px] text-[#5A5249] mb-0.5">TVA</p>
										<p className="text-xs font-medium text-[#F5F0EB]">{formatPrice(inv.taxAmount)}</p>
									</div>
								</div>

								<div className="flex items-center justify-end gap-2">
									<Link
										href={`/admin/invoices/${inv.id}`}
										className="p-2 rounded-lg border border-[#222] text-[#5A5249] hover:text-[#9A8F84] hover:bg-[#1a1a1a] transition-colors"
										title="Voir la facture"
									>
										<Eye size={14} />
									</Link>
									{inv.pdfUrl && (
										<a
											href={inv.pdfUrl}
											target="_blank"
											rel="noopener noreferrer"
											className="p-2 rounded-lg border border-[#222] text-[#5A5249] hover:text-[#C8973A] hover:border-[#C8973A]/30 transition-colors"
											title="Télécharger PDF"
										>
											<Download size={14} />
										</a>
									)}
								</div>
							</div>
						);
					})
				)}
			</div>

			{/* ── Pagination ── */}
			{totalPages > 1 && (
				<div className="flex items-center justify-between gap-4 pt-2">
					<p className="text-xs text-[#5A5249] shrink-0">
						{filtered.length} résultat{filtered.length !== 1 ? "s" : ""}
					</p>
					<div className="flex items-center gap-1.5">
						<PgBtn onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
							<ChevronLeft size={14} />
						</PgBtn>
						{buildPageList(page, totalPages).map((p, i) =>
							p === "…" ? (
								<span key={`ellipsis-${i}`} className="text-xs text-[#5A5249] px-1">…</span>
							) : (
								<PgBtn key={p} active={page === p} onClick={() => setPage(p as number)}>
									{p}
								</PgBtn>
							)
						)}
						<PgBtn onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
							<ChevronRight size={14} />
						</PgBtn>
					</div>
				</div>
			)}
		</div>
	);
}
