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
	X,
	ExternalLink,
	CreditCard,
	Mail,
} from "lucide-react";
import { cn, formatDate, formatPrice, getInitials } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PaymentRef {
	id:     string;
	status: string;
	amount: number;
	type:   string;
}

interface ReservationInfo {
	id:             string;
	guestFirstName: string;
	guestLastName:  string;
	date:           Date;
	timeSlot:       string;
	payment:        PaymentRef | null;
}

interface Invoice {
	id:            string;
	invoiceNumber: string;
	guestEmail:    string;
	amount:        number;
	taxAmount:     number;
	totalAmount:   number;
	pdfUrl:        string | null;
	issuedAt:      Date;
	createdAt:     Date;
	reservation:   ReservationInfo;
}

interface Props {
	invoices: Invoice[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PAYMENT_STATUS_META: Record<
	string,
	{ label: string; color: "gray" | "yellow" | "green" | "blue" | "red" }
> = {
	NONE:               { label: "Aucun",                    color: "gray"   },
	PENDING:            { label: "En attente",               color: "yellow" },
	PAID:               { label: "Payé",                     color: "green"  },
	REFUNDED:           { label: "Remboursé",                color: "blue"   },
	PARTIALLY_REFUNDED: { label: "Partiellement remboursé",  color: "blue"   },
	FAILED:             { label: "Échoué",                   color: "red"    },
};

const PAYMENT_TYPE_LABELS: Record<string, string> = {
	DEPOSIT: "Acompte",
	FULL:    "Paiement complet",
	NONE:    "Sans paiement",
};

const PER_PAGE  = 10;
// Keep Download column (52px), Eye removed
const GRID_COLS = "grid-cols-[1fr_1.3fr_1fr_0.8fr_0.7fr_0.7fr_52px]";

type SortKey = "date" | "amount" | "number" | "client";
type SortDir = "asc" | "desc";

// ─── Highlight ────────────────────────────────────────────────────────────────

function Highlight({ text, query }: { text: string; query: string }) {
	if (!query.trim()) return <>{text}</>;
	const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const parts    = text.split(new RegExp(`(${escaped})`, "gi"));
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
	label:     string;
	value:     string | number;
	sub?:      string;
	icon:      React.ElementType;
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
	label:   string;
	sortKey: SortKey;
	current: SortKey;
	dir:     SortDir;
	onClick: (k: SortKey) => void;
}) {
	const active = current === sortKey;
	const Icon   = active ? (dir === "asc" ? ChevronUp : ChevronDown) : ChevronsUpDown;
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
	children:  React.ReactNode;
	active?:   boolean;
	disabled?: boolean;
	onClick:   () => void;
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

// ─── InfoRow ─────────────────────────────────────────────────────────────────

function InfoRow({
	label,
	value,
}: {
	label: string;
	value: React.ReactNode;
}) {
	return (
		<div className="flex items-start justify-between gap-3 px-3 py-2.5">
			<span className="text-xs text-[#5A5249] shrink-0">{label}</span>
			<span className="text-xs text-[#F5F0EB] text-right break-words min-w-0">{value}</span>
		</div>
	);
}

// ─── DetailPanel ─────────────────────────────────────────────────────────────

function DetailPanel({
	invoice,
	onClose,
}: {
	invoice: Invoice | null;
	onClose: () => void;
}) {
	// ESC key
	useEffect(() => {
		const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [onClose]);

	// Body scroll lock
	useEffect(() => {
		document.body.style.overflow = invoice ? "hidden" : "";
		return () => { document.body.style.overflow = ""; };
	}, [invoice]);

	const isOpen    = !!invoice;
	const fullName  = invoice
		? `${invoice.reservation.guestFirstName} ${invoice.reservation.guestLastName}`
		: "";
	const initials  = invoice
		? getInitials(invoice.reservation.guestFirstName, invoice.reservation.guestLastName)
		: "";
	const payMeta   = invoice?.reservation.payment
		? PAYMENT_STATUS_META[invoice.reservation.payment.status]
		: null;

	return (
		<>
			{/* ── Overlay ── */}
			<div
				onClick={onClose}
				aria-hidden="true"
				className={cn(
					"fixed inset-0 bg-black/60 z-40 transition-opacity duration-200",
					isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
				)}
			/>

			{/* ── Slide panel ── */}
			<aside
				aria-label="Détail de la facture"
				role="dialog"
				aria-modal="true"
				className={cn(
					"fixed top-0 right-0 h-full w-full sm:w-[440px] z-50 flex flex-col",
					"bg-[#141414] border-l border-[#222] shadow-2xl",
					"transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
					isOpen ? "translate-x-0" : "translate-x-full"
				)}
			>
				{invoice && (
					<>
						{/* Header */}
						<div className="flex items-center justify-between p-5 border-b border-[#222] shrink-0 gap-3">
							<div className="flex items-center gap-3 min-w-0">
								<div className="w-10 h-10 rounded-full bg-[#C8973A]/10 border border-[#C8973A]/20 flex items-center justify-center text-sm font-semibold text-[#C8973A] shrink-0">
									{initials}
								</div>
								<div className="min-w-0">
									<p className="text-sm font-semibold font-mono text-[#C8973A] truncate">
										{invoice.invoiceNumber}
									</p>
									<p className="text-xs text-[#5A5249] truncate">{fullName}</p>
								</div>
							</div>
							<button
								onClick={onClose}
								aria-label="Fermer le panneau"
								className="p-1.5 rounded-lg text-[#5A5249] hover:text-[#F5F0EB] hover:bg-[#222] transition-colors shrink-0"
							>
								<X size={16} />
							</button>
						</div>

						{/* Body */}
						<div className="flex-1 overflow-y-auto p-5 space-y-5">

							{/* ── Métriques clés ── */}
							<div className="grid grid-cols-2 gap-2">
								{[
									{ label: "Total TTC", value: formatPrice(invoice.totalAmount), accent: true },
									{ label: "Montant HT", value: formatPrice(invoice.amount) },
									{ label: "TVA", value: formatPrice(invoice.taxAmount) },
									{ label: "Date d'émission", value: formatDate(invoice.issuedAt, "dd/MM/yyyy") },
								].map(({ label, value, accent }) => (
									<div
										key={label}
										className="bg-[#0A0A0A] rounded-xl border border-[#1a1a1a] px-3 py-2.5"
									>
										<p className="text-[10px] font-semibold uppercase tracking-wider text-[#5A5249] mb-1">
											{label}
										</p>
										<p
											className={cn(
												"text-sm font-medium leading-tight",
												accent ? "text-[#C8973A]" : "text-[#F5F0EB]"
											)}
										>
											{value}
										</p>
									</div>
								))}
							</div>

							{/* ── Téléchargement PDF ── */}
							{invoice.pdfUrl ? (
								<a
									href={invoice.pdfUrl}
									target="_blank"
									rel="noopener noreferrer"
									className="flex items-center justify-center gap-2 w-full h-10 bg-[#C8973A] hover:bg-[#E8B04A] text-[#0A0A0A] font-semibold text-sm rounded-xl transition-colors"
								>
									<Download size={15} />
									Télécharger le PDF
								</a>
							) : (
								<div className="flex items-center gap-2 w-full h-10 px-4 border border-[#222] rounded-xl text-sm text-[#5A5249]">
									<FileText size={15} />
									PDF non disponible
								</div>
							)}

							{/* ── Client ── */}
							<div>
								<p className="text-[10px] font-semibold uppercase tracking-widest text-[#5A5249] mb-2">
									Client
								</p>
								<div className="bg-[#0A0A0A] rounded-xl border border-[#1a1a1a] divide-y divide-[#1a1a1a] overflow-hidden">
									<InfoRow
										label="Nom"
										value={<span className="font-medium">{fullName}</span>}
									/>
									<InfoRow
										label="Email"
										value={
											<span className="flex items-center gap-1 justify-end">
												<Mail size={10} className="text-[#5A5249] shrink-0" />
												{invoice.guestEmail}
											</span>
										}
									/>
									<InfoRow
										label="N° Facture"
										value={
											<span className="font-mono text-[#C8973A]">
												{invoice.invoiceNumber}
											</span>
										}
									/>
								</div>
							</div>

							{/* ── Réservation liée ── */}
							<div>
								<p className="text-[10px] font-semibold uppercase tracking-widest text-[#5A5249] mb-2">
									Réservation liée
								</p>
								<Link
									href={`/admin/reservations/${invoice.reservation.id}`}
									className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#0A0A0A] border border-[#1a1a1a] hover:border-[#C8973A]/30 transition-colors group"
								>
									<div className="flex items-center gap-3 min-w-0">
										<div className="w-8 h-8 rounded-full bg-[#C8973A]/10 border border-[#C8973A]/20 flex items-center justify-center text-xs font-semibold text-[#C8973A] shrink-0">
											{initials}
										</div>
										<div className="min-w-0">
											<p className="text-sm text-[#F5F0EB] font-medium truncate">{fullName}</p>
											<p className="text-xs text-[#5A5249]">
												{formatDate(invoice.reservation.date, "dd/MM/yyyy")} ·{" "}
												{invoice.reservation.timeSlot}
											</p>
										</div>
									</div>
									<ExternalLink
										size={14}
										className="text-[#5A5249] group-hover:text-[#C8973A] shrink-0 transition-colors"
									/>
								</Link>
							</div>

							{/* ── Paiement lié ── */}
							{invoice.reservation.payment && (
								<div>
									<p className="text-[10px] font-semibold uppercase tracking-widest text-[#5A5249] mb-2">
										Paiement lié
									</p>
									<Link
										href={`/admin/payments/${invoice.reservation.payment.id}`}
										className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#0A0A0A] border border-[#1a1a1a] hover:border-[#C8973A]/30 transition-colors group"
									>
										<div className="flex items-center gap-3 min-w-0">
											<div className="w-8 h-8 rounded-lg bg-[#1a1a1a] border border-[#222] flex items-center justify-center shrink-0">
												<CreditCard size={14} className="text-[#9A8F84]" />
											</div>
											<div className="min-w-0">
												<p className="text-sm text-[#F5F0EB] font-medium">
													{formatPrice(invoice.reservation.payment.amount)}
												</p>
												<div className="flex items-center gap-2 mt-0.5">
													<span className="text-xs text-[#5A5249]">
														{PAYMENT_TYPE_LABELS[invoice.reservation.payment.type] ??
															invoice.reservation.payment.type}
													</span>
													{payMeta && (
														<Badge variant={payMeta.color} className="text-[10px] py-0">
															{payMeta.label}
														</Badge>
													)}
												</div>
											</div>
										</div>
										<ExternalLink
											size={14}
											className="text-[#5A5249] group-hover:text-[#C8973A] shrink-0 transition-colors"
										/>
									</Link>
								</div>
							)}
						</div>
					</>
				)}
			</aside>
		</>
	);
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function InvoicesClient({ invoices }: Props) {
	const [search,     setSearch]     = useState("");
	const [sortKey,    setSortKey]    = useState<SortKey>("date");
	const [sortDir,    setSortDir]    = useState<SortDir>("desc");
	const [page,       setPage]       = useState(1);
	const [selectedId, setSelectedId] = useState<string | null>(null);

	const selectedInvoice = invoices.find((inv) => inv.id === selectedId) ?? null;

	// ── Stats ──
	const stats = useMemo(
		() => ({
			total:    invoices.length,
			totalHT:  invoices.reduce((s, i) => s + i.amount, 0),
			totalTVA: invoices.reduce((s, i) => s + i.taxAmount, 0),
			totalTTC: invoices.reduce((s, i) => s + i.totalAmount, 0),
			hasPdf:   invoices.filter((i) => !!i.pdfUrl).length,
		}),
		[invoices]
	);

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
		const headers = [
			"N° Facture", "Client", "Email", "Date émission",
			"Montant HT (€)", "TVA (€)", "Total TTC (€)", "PDF",
		];
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
			href:     url,
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

				{/* Header row */}
				<div className={cn("grid items-center px-5 py-3 border-b border-[#222] bg-[#141414]", GRID_COLS)}>
					<SortBtn label="N° Facture" sortKey="number" current={sortKey} dir={sortDir} onClick={handleSortClick} />
					<SortBtn label="Client"     sortKey="client" current={sortKey} dir={sortDir} onClick={handleSortClick} />
					<SortBtn label="Date"       sortKey="date"   current={sortKey} dir={sortDir} onClick={handleSortClick} />
					<span className="text-xs font-semibold uppercase tracking-wider text-[#5A5249]">HT</span>
					<span className="text-xs font-semibold uppercase tracking-wider text-[#5A5249]">TVA</span>
					<div className="flex justify-end">
						<SortBtn label="TTC" sortKey="amount" current={sortKey} dir={sortDir} onClick={handleSortClick} />
					</div>
					<span className="text-xs font-semibold uppercase tracking-wider text-[#5A5249] text-right">PDF</span>
				</div>

				{paginated.length === 0 ? (
					<EmptyState onReset={hasActiveFilters ? resetFilters : undefined} />
				) : (
					<div className="divide-y divide-[#1a1a1a]">
						{paginated.map((inv) => {
							const fullName   = `${inv.reservation.guestFirstName} ${inv.reservation.guestLastName}`;
							const isSelected = selectedId === inv.id;
							return (
								<div
									key={inv.id}
									onClick={() => setSelectedId(inv.id)}
									className={cn(
										"group grid items-center px-5 py-3.5 cursor-pointer transition-colors",
										GRID_COLS,
										isSelected ? "bg-[#1e1a15]" : "hover:bg-[#1a1a1a]"
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

									{/* PDF Download — stop propagation so click doesn't open panel */}
									<div
										className="flex items-center justify-end"
										onClick={(e) => e.stopPropagation()}
									>
										{inv.pdfUrl ? (
											<a
												href={inv.pdfUrl}
												target="_blank"
												rel="noopener noreferrer"
												title="Télécharger PDF"
												className="p-1.5 rounded-lg text-[#5A5249] hover:text-[#C8973A] hover:bg-[#252525] transition-all opacity-0 group-hover:opacity-100"
											>
												<Download size={14} />
											</a>
										) : (
											<span className="p-1.5 opacity-0" aria-hidden="true">
												<Download size={14} />
											</span>
										)}
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
								onClick={() => setSelectedId(inv.id)}
								className="bg-[#141414] border border-[#222] rounded-xl p-4 space-y-3 cursor-pointer hover:border-[#333] transition-colors active:bg-[#1a1a1a]"
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

								{/* PDF download on mobile */}
								{inv.pdfUrl && (
									<div onClick={(e) => e.stopPropagation()}>
										<a
											href={inv.pdfUrl}
											target="_blank"
											rel="noopener noreferrer"
											className="flex items-center justify-center gap-2 w-full h-8 rounded-lg border border-[#222] text-xs text-[#5A5249] hover:text-[#C8973A] hover:border-[#C8973A]/30 transition-colors"
										>
											<Download size={12} />
											Télécharger PDF
										</a>
									</div>
								)}
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
								<span key={`ellipsis-${i}`} className="text-xs text-[#5A5249] px-1">
									…
								</span>
							) : (
								<PgBtn key={p} active={page === p} onClick={() => setPage(p as number)}>
									{p}
								</PgBtn>
							)
						)}
						<PgBtn
							onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
							disabled={page === totalPages}
						>
							<ChevronRight size={14} />
						</PgBtn>
					</div>
				</div>
			)}

			{/* ── Detail Panel ── */}
			<DetailPanel
				invoice={selectedInvoice}
				onClose={() => setSelectedId(null)}
			/>
		</div>
	);
}