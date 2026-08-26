"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
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
	Mail,
	ExternalLink,
	Users,
	CreditCard,
	Percent,
	TableProperties,
	FileCode2,
} from "lucide-react";
import { cn, formatDate, formatDateTime, formatPrice } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { PAYMENT_STATUSES } from "@/lib/constants";

type InvoiceType = "DEPOSIT" | "ADDITION";

interface ReservationRef {
	id: string;
	guestFirstName: string;
	guestLastName: string;
	date: Date;
	timeSlot: string;
}

interface PaymentInfo {
	id: string;
	status: keyof typeof PAYMENT_STATUSES;
	amount: number;
	type: string;
	reservation: ReservationRef | null;
}

interface ServiceOrderInfo {
	id: string;
	guestName: string;
	paymentMethod: string | null;
	closedAt: Date | null;
	table: { numero: number };
	reservation: ReservationRef | null;
}

interface CustomerInfo {
	id: string;
	firstName: string;
	lastName: string;
	email: string;
}

interface Invoice {
	id: string;
	invoiceNumber: string;
	type: InvoiceType;
	guestEmail: string | null;
	guestName: string | null;
	amount: number;
	taxAmount: number;
	totalAmount: number;
	pdfUrl: string | null;
	issuedAt: Date;
	createdAt: Date;
	payment: PaymentInfo | null;
	serviceOrder: ServiceOrderInfo | null;
	user: CustomerInfo | null;
}

interface Props {
	invoices: Invoice[];
	initialInvoiceId?: string;
}

const BADGE_VARIANT: Record<string, "yellow" | "green" | "red" | "gray" | "orange" | "blue"> = {
	yellow: "yellow",
	green:  "green",
	red:    "red",
	gray:   "gray",
	orange: "orange",
	blue:   "blue",
};

const TYPE_META: Record<InvoiceType, { label: string; badge: "gold" | "orange" }> = {
	DEPOSIT:  { label: "Acompte réservation", badge: "gold"   },
	ADDITION: { label: "Addition",            badge: "orange" },
};

const PER_PAGE = 10;
const GRID_COLS = "grid-cols-[1fr_1.3fr_1fr_0.8fr_0.7fr_0.7fr_44px]";

type SortKey = "date" | "amount" | "number" | "client";
type SortDir = "asc" | "desc";
type TypeFilter = "ALL" | InvoiceType;

function invoiceDisplay(inv: Invoice) {
	const reservation = inv.payment?.reservation ?? inv.serviceOrder?.reservation ?? null;
	const name = reservation
		? `${reservation.guestFirstName} ${reservation.guestLastName}`
		: inv.serviceOrder?.guestName ?? inv.guestName ?? "Client";
	const email = inv.guestEmail ?? inv.user?.email ?? null;
	const tableNumero = inv.serviceOrder?.table.numero ?? null;
	return { name, email, reservation, tableNumero };
}

function getInitialsFromName(name: string): string {
	const parts = name.trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) return "?";
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
	return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
}

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

function buildPageList(current: number, total: number): (number | "...")[] {
	if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
	const pages: (number | "...")[] = [1];
	if (current > 3) pages.push("...");
	for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) {
		pages.push(p);
	}
	if (current < total - 2) pages.push("...");
	pages.push(total);
	return pages;
}

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

function LinkRow({
	href,
	icon: Icon,
	label,
	sub,
}: {
	href: string;
	icon: React.ElementType;
	label: string;
	sub?: string;
}) {
	return (
		<Link
			href={href}
			className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#0A0A0A] border border-[#1a1a1a] hover:border-[#C8973A]/30 transition-colors group"
		>
			<div className="flex items-center gap-3 min-w-0">
				<div className="w-8 h-8 rounded-lg bg-[#1a1a1a] border border-[#222] flex items-center justify-center shrink-0">
					<Icon size={14} className="text-[#9A8F84]" />
				</div>
				<div className="min-w-0">
					<p className="text-sm text-[#F5F0EB] font-medium truncate">{label}</p>
					{sub && <p className="text-xs text-[#5A5249] mt-0.5 truncate">{sub}</p>}
				</div>
			</div>
			<ExternalLink
				size={14}
				className="text-[#5A5249] group-hover:text-[#C8973A] shrink-0 transition-colors"
			/>
		</Link>
	);
}

function DetailPanel({
	invoice,
	onClose,
}: {
	invoice: Invoice | null;
	onClose: () => void;
}) {
	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [onClose]);

	useEffect(() => {
		document.body.style.overflow = invoice ? "hidden" : "";
		return () => {
			document.body.style.overflow = "";
		};
	}, [invoice]);

	const inv = invoice;
	const isOpen = !!inv;
	const display = inv ? invoiceDisplay(inv) : null;
	const initials = display ? getInitialsFromName(display.name) : "";
	const typeMeta = inv ? TYPE_META[inv.type] : null;

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
					"fixed top-0 right-0 h-full w-full sm:w-[400px] z-50 flex flex-col",
					"bg-[#141414] border-l border-[#222] shadow-2xl",
					"transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
					isOpen ? "translate-x-0" : "translate-x-full"
				)}
				aria-label="Détail de la facture"
				role="dialog"
				aria-modal="true"
			>
				{inv && display && typeMeta && (
					<>
						<div className="flex items-center justify-between p-5 border-b border-[#222] shrink-0">
							<div className="flex items-center gap-3 min-w-0">
								<div className="w-10 h-10 rounded-full bg-[#C8973A]/10 border border-[#C8973A]/20 flex items-center justify-center text-sm font-semibold text-[#C8973A] shrink-0">
									{initials}
								</div>
								<div className="min-w-0">
									<p className="text-sm font-semibold text-[#F5F0EB] truncate">
										Facture {inv.invoiceNumber}
									</p>
									<p className="text-xs text-[#5A5249] truncate">{display.name}</p>
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

						<div className="flex-1 overflow-y-auto p-5 space-y-5">
							<Badge variant={typeMeta.badge} className="text-[10px]">
								{typeMeta.label}
							</Badge>

							<div className="grid grid-cols-2 gap-3">
								{[
									{ icon: CreditCard,  label: "Total TTC",       value: formatPrice(inv.totalAmount), accent: true },
									{ icon: Receipt,     label: "Montant HT",      value: formatPrice(inv.amount) },
									{ icon: Percent,     label: "TVA",             value: formatPrice(inv.taxAmount) },
									{ icon: CalendarDays, label: "Date d'émission", value: formatDate(inv.issuedAt, "dd/MM/yyyy") },
								].map(({ icon: Icon, label, value, accent }) => (
									<div
										key={label}
										className="bg-[#0A0A0A] rounded-xl border border-[#1a1a1a] px-3 py-2.5"
									>
										<div className="flex items-center gap-1.5 mb-1">
											<Icon size={11} className="text-[#5A5249]" />
											<span className="text-[10px] font-semibold uppercase tracking-wider text-[#5A5249]">
												{label}
											</span>
										</div>
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

							<Section title="Client">
								{display.email ? (
									<div className="flex items-center gap-2 px-3 py-2.5">
										<Mail size={13} className="text-[#5A5249] shrink-0" />
										<a
											href={`mailto:${display.email}`}
											className="text-xs text-[#F5F0EB] hover:text-[#C8973A] truncate transition-colors"
										>
											{display.email}
										</a>
									</div>
								) : (
									<InfoRow label="Email" value="Client sur place — non renseigné" valueClass="italic text-[#5A5249]" />
								)}
								<InfoRow label="N° Facture" value={inv.invoiceNumber} valueClass="font-mono" />
								<InfoRow label="Créée le" value={formatDateTime(inv.createdAt)} />
								{!inv.pdfUrl && (
									<InfoRow label="PDF" value="Non disponible" valueClass="italic text-[#5A5249]" />
								)}
							</Section>

							{inv.user && (
								<LinkRow
									href={`/admin/customers/${inv.user.id}`}
									icon={Users}
									label={`${inv.user.firstName} ${inv.user.lastName}`}
									sub="Compte client — voir la fiche"
								/>
							)}

							{display.reservation && (
								<div>
									<p className="text-[10px] font-semibold uppercase tracking-widest text-[#5A5249] mb-2">
										Réservation liée
									</p>
									<LinkRow
										href={`/admin/reservations?id=${display.reservation.id}`}
										icon={CalendarDays}
										label={display.name}
										sub={`${formatDate(display.reservation.date, "dd MMMM yyyy")} · ${display.reservation.timeSlot}`}
									/>
								</div>
							)}

							{inv.type === "DEPOSIT" && inv.payment && (
								<div>
									<div className="flex items-center justify-between mb-2">
										<p className="text-[10px] font-semibold uppercase tracking-widest text-[#5A5249]">
											Paiement lié
										</p>
										<Badge
											variant={BADGE_VARIANT[PAYMENT_STATUSES[inv.payment.status].color]}
											className="text-[10px]"
										>
											{PAYMENT_STATUSES[inv.payment.status].label}
										</Badge>
									</div>
									<LinkRow
										href={`/admin/payments?id=${inv.payment.id}`}
										icon={CreditCard}
										label={formatPrice(inv.payment.amount)}
										sub="Voir le paiement"
									/>
								</div>
							)}

							{inv.type === "ADDITION" && inv.serviceOrder && (
								<div>
									<p className="text-[10px] font-semibold uppercase tracking-widest text-[#5A5249] mb-2">
										Addition liée
									</p>
									<LinkRow
										href={`/admin/payments?id=so_${inv.serviceOrder.id}`}
										icon={TableProperties}
										label={`Table ${inv.serviceOrder.table.numero}`}
										sub="Voir le paiement"
									/>
								</div>
							)}
						</div>

						{inv.pdfUrl && (
							<div className="p-5 border-t border-[#222] shrink-0">
								<a
									href={inv.pdfUrl}
									target="_blank"
									rel="noopener noreferrer"
									className="w-full flex items-center justify-center gap-2 h-9 rounded-lg bg-[#C8973A] hover:bg-[#E8B04A] text-[#0A0A0A] text-sm font-semibold transition-colors"
								>
									<Download size={14} />
									Télécharger le PDF
								</a>
							</div>
						)}
					</>
				)}
			</aside>
		</>
	);
}

export default function InvoicesClient({ invoices, initialInvoiceId }: Props) {
	const router = useRouter();

	const [search,     setSearch]     = useState("");
	const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");
	const [sortKey,    setSortKey]    = useState<SortKey>("date");
	const [sortDir,    setSortDir]    = useState<SortDir>("desc");
	const [page,       setPage]       = useState(1);
	const [selectedId, setSelectedId] = useState<string | null>(null);

	useEffect(() => {
		if (initialInvoiceId) {
			setSelectedId(initialInvoiceId);
			router.replace("/admin/invoices", { scroll: false });
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const stats = useMemo(() => ({
		total:         invoices.length,
		totalHT:       invoices.reduce((s, i) => s + i.amount, 0),
		totalTVA:      invoices.reduce((s, i) => s + i.taxAmount, 0),
		totalTTC:      invoices.reduce((s, i) => s + i.totalAmount, 0),
		depositsCount:  invoices.filter((i) => i.type === "DEPOSIT").length,
		additionsCount: invoices.filter((i) => i.type === "ADDITION").length,
	}), [invoices]);

	const filtered = useMemo(() => {
		const q = search.toLowerCase().trim();

		let result = invoices.filter((inv) => {
			if (typeFilter !== "ALL" && inv.type !== typeFilter) return false;
			if (q) {
				const { name, email } = invoiceDisplay(inv);
				const haystack = [name, email ?? "", inv.invoiceNumber]
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
				cmp = invoiceDisplay(a).name.localeCompare(invoiceDisplay(b).name, "fr");
			}
			return sortDir === "asc" ? cmp : -cmp;
		});

		return result;
	}, [invoices, search, typeFilter, sortKey, sortDir]);

	useEffect(() => { setPage(1); }, [search, typeFilter, sortKey, sortDir]);

	const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
	const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

	const handleSortClick = useCallback(
		(key: SortKey) => {
			if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
			else { setSortKey(key); setSortDir("desc"); }
		},
		[sortKey]
	);

	const handleTypeClick = useCallback((k: InvoiceType) => {
		setTypeFilter((cur) => (cur === k ? "ALL" : k));
	}, []);

	const resetFilters = useCallback(() => { setSearch(""); setTypeFilter("ALL"); }, []);
	const hasActiveFilters = !!search || typeFilter !== "ALL";

	const handleExport = useCallback(() => {
		const headers = ["N° Facture", "Type", "Client", "Email", "Date émission", "Montant HT (€)", "TVA (€)", "Total TTC (€)", "PDF"];
		const rows = filtered.map((inv) => {
			const { name, email } = invoiceDisplay(inv);
			return [
				inv.invoiceNumber,
				TYPE_META[inv.type].label,
				name,
				email ?? "",
				formatDate(inv.issuedAt, "dd/MM/yyyy"),
				inv.amount.toFixed(2),
				inv.taxAmount.toFixed(2),
				inv.totalAmount.toFixed(2),
				inv.pdfUrl ?? "",
			];
		});
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

	const selectedInvoice = invoices.find((i) => i.id === selectedId) ?? null;

	const closePanel = useCallback(() => {
		setSelectedId(null);
	}, []);

	return (
		<div className="min-h-full">

			<div className="flex items-start justify-between mb-6 gap-4">
				<div>
					<h1 className="font-display text-3xl text-[#F5F0EB] leading-tight">Factures</h1>
					<p className="text-sm text-[#5A5249] mt-1">
						{invoices.length} facture{invoices.length !== 1 ? "s" : ""} émise{invoices.length !== 1 ? "s" : ""}
					</p>
				</div>
				<div className="flex items-center gap-2 shrink-0">
					<Link
						href="/admin/invoices/templates"
						className="flex items-center gap-2 h-9 px-3 sm:px-4 rounded-lg border border-[#222] text-sm text-[#9A8F84] hover:text-[#F5F0EB] hover:bg-[#1a1a1a] transition-colors"
					>
						<FileCode2 size={14} />
						<span className="hidden sm:inline">Templates</span>
					</Link>
					<button
						onClick={handleExport}
						className="flex items-center gap-2 h-9 px-3 sm:px-4 rounded-lg border border-[#222] text-sm text-[#9A8F84] hover:text-[#F5F0EB] hover:bg-[#1a1a1a] transition-colors"
					>
						<Download size={14} />
						<span className="hidden sm:inline">Exporter</span>
					</button>
				</div>
			</div>

			<div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
				<StatCard
					label="Total factures"
					value={stats.total}
					icon={FileText}
					iconColor="bg-[#222] text-[#9A8F84]"
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

			<div className="bg-[#141414] border border-[#222] rounded-xl p-4 mb-4 space-y-3">
				<div className="relative">
					<Search
						size={15}
						className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5A5249] pointer-events-none"
					/>
					<input
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder="Rechercher par N° facture, client, email..."
						className="w-full h-9 pl-9 pr-9 rounded-lg bg-[#0A0A0A] border border-[#222] text-sm text-[#F5F0EB] placeholder:text-[#5A5249] focus:border-[#C8973A] focus:ring-1 focus:ring-[#C8973A] outline-none transition-colors"
					/>
					{search && (
						<button
							onClick={() => setSearch("")}
							className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#5A5249] hover:text-[#9A8F84] transition-colors"
							aria-label="Effacer la recherche"
						>
							<X size={14} />
						</button>
					)}
				</div>

				<div className="flex items-center gap-2 flex-wrap">
					<button
						onClick={() => handleTypeClick("DEPOSIT")}
						className={cn(
							"flex items-center gap-1.5 px-3 h-8 rounded-full border text-xs font-medium transition-all whitespace-nowrap",
							typeFilter === "DEPOSIT"
								? "bg-[#C8973A]/10 border-[#C8973A]/30 text-[#C8973A]"
								: "border-[#222] text-[#5A5249] hover:border-[#333] hover:text-[#9A8F84]"
						)}
					>
						Acomptes
						<span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-semibold", typeFilter === "DEPOSIT" ? "bg-white/10" : "bg-[#1a1a1a] text-[#5A5249]")}>
							{stats.depositsCount}
						</span>
					</button>
					<button
						onClick={() => handleTypeClick("ADDITION")}
						className={cn(
							"flex items-center gap-1.5 px-3 h-8 rounded-full border text-xs font-medium transition-all whitespace-nowrap",
							typeFilter === "ADDITION"
								? "bg-orange-500/10 border-orange-500/30 text-orange-400"
								: "border-[#222] text-[#5A5249] hover:border-[#333] hover:text-[#9A8F84]"
						)}
					>
						Additions
						<span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-semibold", typeFilter === "ADDITION" ? "bg-white/10" : "bg-[#1a1a1a] text-[#5A5249]")}>
							{stats.additionsCount}
						</span>
					</button>
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

			{/* ── Desktop ── */}
			<div className="hidden lg:block bg-[#141414] border border-[#222] rounded-xl overflow-hidden">

				<div className={cn("grid items-center px-5 py-3 border-b border-[#1a1a1a]", GRID_COLS)}>
					<SortBtn label="N° Facture" sortKey="number" current={sortKey} dir={sortDir} onClick={handleSortClick} />
					<SortBtn label="Client"     sortKey="client" current={sortKey} dir={sortDir} onClick={handleSortClick} />
					<SortBtn label="Date"       sortKey="date"   current={sortKey} dir={sortDir} onClick={handleSortClick} />
					<span className="text-xs font-semibold uppercase tracking-wider text-[#5A5249]">Type</span>
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
							const { name, email } = invoiceDisplay(inv);
							const typeMeta = TYPE_META[inv.type];
							return (
								<div
									key={inv.id}
									onClick={() => setSelectedId(inv.id)}
									role="button"
									tabIndex={0}
									onKeyDown={(e) => e.key === "Enter" && setSelectedId(inv.id)}
									className={cn(
										"group grid items-center px-5 py-3.5 cursor-pointer transition-colors",
										GRID_COLS,
										selectedId === inv.id ? "bg-[#C8973A]/5" : "hover:bg-[#1a1a1a]"
									)}
								>
									<span className="text-sm font-mono font-medium text-[#F5F0EB]">
										<Highlight text={inv.invoiceNumber} query={search} />
									</span>

									<div className="min-w-0">
										<span className="text-sm text-[#F5F0EB] block truncate">
											<Highlight text={name} query={search} />
										</span>
										<span className="text-xs text-[#5A5249] block truncate">
											{email ? <Highlight text={email} query={search} /> : "Client sur place"}
										</span>
									</div>

									<span className="text-sm text-[#9A8F84]">
										{formatDate(inv.issuedAt, "dd/MM/yyyy")}
									</span>

									<div>
										<Badge variant={typeMeta.badge} className="text-[10px]">
											{typeMeta.label}
										</Badge>
									</div>

									<div className="text-right">
										<span className="text-sm font-semibold text-[#C8973A] tabular-nums">
											{formatPrice(inv.totalAmount)}
										</span>
									</div>

									<div className="flex items-center justify-end">
										{inv.pdfUrl ? (
											<a
												href={inv.pdfUrl}
												target="_blank"
												rel="noopener noreferrer"
												onClick={(e) => e.stopPropagation()}
												className="p-1.5 rounded-lg text-[#5A5249] hover:text-[#C8973A] hover:bg-[#252525] transition-all opacity-0 group-hover:opacity-100"
												title="Télécharger PDF"
											>
												<Download size={14} />
											</a>
										) : (
											<span className="text-sm text-[#333]">—</span>
										)}
									</div>
								</div>
							);
						})}
					</div>
				)}
			</div>

			{/* ── Mobile ── */}
			<div className="lg:hidden space-y-3">
				{paginated.length === 0 ? (
					<EmptyState onReset={hasActiveFilters ? resetFilters : undefined} />
				) : (
					paginated.map((inv) => {
						const { name, email } = invoiceDisplay(inv);
						const typeMeta = TYPE_META[inv.type];
						return (
							<div
								key={inv.id}
								onClick={() => setSelectedId(inv.id)}
								role="button"
								tabIndex={0}
								onKeyDown={(e) => e.key === "Enter" && setSelectedId(inv.id)}
								className={cn(
									"bg-[#141414] border rounded-xl p-4 space-y-3 cursor-pointer transition-colors",
									selectedId === inv.id
										? "border-[#C8973A]/30 bg-[#C8973A]/5"
										: "border-[#222] hover:border-[#333] hover:bg-[#1a1a1a]"
								)}
							>
								<div className="flex items-start justify-between gap-3">
									<div className="min-w-0">
										<p className="text-xs font-mono font-medium text-[#C8973A] truncate">
											<Highlight text={inv.invoiceNumber} query={search} />
										</p>
										<p className="text-sm font-medium text-[#F5F0EB] mt-0.5 truncate">
											<Highlight text={name} query={search} />
										</p>
										<p className="text-xs text-[#5A5249] mt-0.5">
											{formatDate(inv.issuedAt, "dd/MM/yyyy")}
										</p>
									</div>
									<div className="flex flex-col items-end gap-1.5 shrink-0">
										<span className="text-base font-semibold text-[#C8973A] tabular-nums">
											{formatPrice(inv.totalAmount)}
										</span>
										<Badge variant={typeMeta.badge} className="text-[10px]">
											{typeMeta.label}
										</Badge>
									</div>
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

								{inv.pdfUrl && (
									<a
										href={inv.pdfUrl}
										target="_blank"
										rel="noopener noreferrer"
										onClick={(e) => e.stopPropagation()}
										className="flex items-center justify-center gap-2 h-8 rounded-lg border border-[#222] text-xs text-[#9A8F84] hover:text-[#C8973A] hover:border-[#C8973A]/30 transition-colors"
									>
										<Download size={12} />
										PDF
									</a>
								)}
							</div>
						);
					})
				)}
			</div>

			{/* ── Pagination ── */}
			{totalPages > 1 && (
				<div className="flex items-center justify-between gap-4 pt-4">
					<p className="text-xs text-[#5A5249] shrink-0">
						{filtered.length} résultat{filtered.length !== 1 ? "s" : ""}
					</p>
					<div className="flex items-center gap-1.5">
						<PgBtn onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
							<ChevronLeft size={14} />
						</PgBtn>
						{buildPageList(page, totalPages).map((p, i) =>
							p === "..." ? (
								<span key={`ellipsis-${i}`} className="text-xs text-[#5A5249] px-1">...</span>
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

			<DetailPanel invoice={selectedInvoice} onClose={closePanel} />
		</div>
	);
}
