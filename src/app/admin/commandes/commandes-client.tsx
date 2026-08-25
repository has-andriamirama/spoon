"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
	Search,
	Download,
	UtensilsCrossed,
	CheckCircle2,
	AlertCircle,
	ChevronDown,
	ChevronUp,
	ChevronsUpDown,
	ChevronLeft,
	ChevronRight,
	ConciergeBell,
	TableProperties,
	X,
	Users,
	MapPin,
	CalendarDays,
	Clock,
	Banknote,
	ExternalLink,
	LinkIcon,
} from "lucide-react";
import { cn, formatDate, formatPrice } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ZONE_LABELS } from "@/lib/constants";
import type { ServiceStatus, ServiceType, ZoneTable, PaymentMethodService, CourseType } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

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
	covers: number;
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
	initialOrderId?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

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

const COURSE_LABELS: Record<string, string> = {
	ENTREE:  "Entrées",
	PLAT:    "Plats",
	DESSERT: "Desserts",
	BOISSON: "Boissons",
	EXTRA:   "Extras",
};

const COURSE_ORDER: Record<string, number> = {
	ENTREE: 1, PLAT: 2, DESSERT: 3, BOISSON: 4, EXTRA: 5,
};

const PER_PAGE = 10;
// Colonnes : Date | Table | Client | Type | Statut | Total
const GRID_COLS = "grid-cols-[1.1fr_0.7fr_1.2fr_0.75fr_1fr_0.9fr]";

type SortKey = "date" | "table" | "amount" | "status";
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

// ─── dateLabel ────────────────────────────────────────────────────────────────

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

// ─── buildPageList ────────────────────────────────────────────────────────────

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

// ─── StatCard ─────────────────────────────────────────────────────────────────

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

// ─── StatusPill ───────────────────────────────────────────────────────────────

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

// ─── MobileInfoCell ───────────────────────────────────────────────────────────

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

// ─── Section / InfoRow (detail panel building blocks) ─────────────────────────

function Section({ title, icon: Icon, children }: { title: string; icon?: React.ElementType; children: React.ReactNode }) {
	return (
		<div>
			<p className="text-[10px] font-semibold uppercase tracking-widest text-[#5A5249] mb-2 flex items-center gap-1.5">
				{Icon && <Icon size={11} />}
				{title}
			</p>
			<div className="bg-[#0A0A0A] rounded-xl border border-[#1a1a1a] divide-y divide-[#1a1a1a] overflow-hidden">
				{children}
			</div>
		</div>
	);
}

function InfoRow({
	label,
	value,
	valueClass,
}: {
	label: string;
	value: React.ReactNode;
	valueClass?: string;
}) {
	return (
		<div className="flex items-start justify-between gap-3 px-3 py-2.5">
			<span className="text-xs text-[#5A5249] shrink-0">{label}</span>
			<span className={cn("text-xs text-[#F5F0EB] text-right break-words min-w-0", valueClass)}>
				{value}
			</span>
		</div>
	);
}

// ─── DetailPanel ────────────────────────────────────────────────────────────────

function DetailPanel({
	order,
	onClose,
}: {
	order: ServiceOrder | null;
	onClose: () => void;
}) {
	useEffect(() => {
		const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [onClose]);

	useEffect(() => {
		document.body.style.overflow = order ? "hidden" : "";
		return () => { document.body.style.overflow = ""; };
	}, [order]);

	const isOpen = !!order;
	const meta   = order ? SERVICE_STATUS_META[order.status] : null;

	const courseGroups = useMemo(() => {
		if (!order) return [];
		const byCourse: Record<string, OrderItem[]> = {};
		for (const item of order.items) {
			const c = item.course ?? "PLAT";
			if (!byCourse[c]) byCourse[c] = [];
			byCourse[c].push(item);
		}
		return Object.entries(byCourse).sort(
			([a], [b]) => (COURSE_ORDER[a] ?? 9) - (COURSE_ORDER[b] ?? 9)
		);
	}, [order]);

	const subtotal  = order ? order.items.reduce((s, i) => s + i.totalPrice, 0) : 0;
	const amountDue = order ? Math.max(0, subtotal - order.depositDeducted) : 0;

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
					"fixed top-0 right-0 h-full w-full sm:w-[420px] z-50 flex flex-col",
					"bg-[#141414] border-l border-[#222] shadow-2xl",
					"transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
					isOpen ? "translate-x-0" : "translate-x-full"
				)}
				aria-label="Détail de la commande"
				role="dialog"
				aria-modal="true"
			>
				{order && (
					<>
						<div className="flex items-center justify-between p-5 border-b border-[#222] shrink-0">
							<div className="flex items-center gap-3 min-w-0">
								<div className="w-10 h-10 rounded-full bg-[#C8973A]/10 border border-[#C8973A]/20 flex items-center justify-center shrink-0">
									<TableProperties size={18} className="text-[#C8973A]" />
								</div>
								<div className="min-w-0">
									<p className="text-sm font-semibold text-[#F5F0EB] truncate">
										Table {order.table.numero} — {order.guestName}
									</p>
									<p className="text-xs text-[#5A5249] truncate">
										Réf. #{order.id.slice(-8).toUpperCase()}
									</p>
								</div>
							</div>
							<div className="flex items-center gap-2 shrink-0 ml-2">
								<Badge variant={meta?.color ?? "gray"} className="text-[11px]">
									{meta?.label ?? order.status}
								</Badge>
								<button
									onClick={onClose}
									className="p-1.5 rounded-lg text-[#5A5249] hover:text-[#F5F0EB] hover:bg-[#222] transition-colors"
									aria-label="Fermer le panneau"
								>
									<X size={16} />
								</button>
							</div>
						</div>

						<div className="flex-1 overflow-y-auto p-5 space-y-5">

							<div className="grid grid-cols-2 gap-2">
								{[
									{
										icon:  CalendarDays,
										label: "Ouvert le",
										value: formatDate(order.openedAt, "dd MMMM yyyy"),
										sub:   formatDate(order.openedAt, "HH:mm"),
									},
									{
										icon:  Clock,
										label: "Statut",
										value: order.closedAt ? `Clôturé à ${formatDate(order.closedAt, "HH:mm")}` : "En cours",
										sub:   SERVICE_TYPE_LABELS[order.type] ?? order.type,
									},
									{
										icon:  Users,
										label: "Couverts",
										value: `${order.covers} personne${order.covers > 1 ? "s" : ""}`,
									},
									{
										icon:  MapPin,
										label: "Table",
										value: `T${order.table.numero}`,
										sub:   ZONE_LABELS[order.table.zone]?.label ?? order.table.zone,
									},
								].map(({ icon: Icon, label, value, sub }) => (
									<div
										key={label}
										className="bg-[#0A0A0A] rounded-xl border border-[#1a1a1a] px-3 py-2.5"
									>
										<div className="flex items-center gap-1.5 mb-1">
											<Icon size={11} className="text-[#5A5249]" />
											<p className="text-[10px] text-[#5A5249]">{label}</p>
										</div>
										<p className="text-xs font-medium leading-tight text-[#F5F0EB]">{value}</p>
										{sub && <p className="text-[10px] text-[#5A5249] mt-0.5">{sub}</p>}
									</div>
								))}
							</div>

							{order.reservation && (
								<div>
									<p className="text-[10px] font-semibold uppercase tracking-widest text-[#5A5249] mb-2 flex items-center gap-1.5">
										<LinkIcon size={11} />
										Réservation associée
									</p>
									<Link
										href={`/admin/reservations/${order.reservation.id}`}
										className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#0A0A0A] border border-[#1a1a1a] hover:border-[#C8973A]/30 transition-colors group"
									>
										<div className="min-w-0">
											<p className="text-sm text-[#F5F0EB] font-medium truncate">
												{order.reservation.guestFirstName} {order.reservation.guestLastName}
											</p>
											<p className="text-xs text-[#5A5249] mt-0.5">
												{order.reservation.timeSlot} · {order.reservation.covers} couvert
												{order.reservation.covers > 1 ? "s" : ""}
											</p>
										</div>
										<ExternalLink
											size={14}
											className="text-[#5A5249] group-hover:text-[#C8973A] shrink-0 transition-colors"
										/>
									</Link>
								</div>
							)}

							{order.notes && (
								<div>
									<p className="text-[10px] font-semibold uppercase tracking-widest text-[#5A5249] mb-2">
										Notes
									</p>
									<p className="text-xs text-[#9A8F84] leading-relaxed bg-[#0A0A0A] rounded-xl border border-[#1a1a1a] px-3 py-2.5">
										{order.notes}
									</p>
								</div>
							)}

							<div>
								<p className="text-[10px] font-semibold uppercase tracking-widest text-[#5A5249] mb-2 flex items-center gap-1.5">
									<UtensilsCrossed size={11} />
									Plats commandés
								</p>

								{order.items.length === 0 ? (
									<p className="text-xs text-[#5A5249] italic">Aucun plat enregistré</p>
								) : (
									<div className="space-y-3">
										{courseGroups.map(([course, items]) => (
											<div key={course}>
												<p className="text-[10px] text-[#5A5249] font-semibold uppercase tracking-wider mb-1.5">
													{COURSE_LABELS[course] ?? course}
												</p>
												<div className="bg-[#0A0A0A] rounded-xl border border-[#1a1a1a] overflow-hidden">
													{items.map((item, idx) => (
														<div
															key={item.id}
															className={cn(
																"flex items-center justify-between px-3 py-2.5",
																idx < items.length - 1 && "border-b border-[#1a1a1a]"
															)}
														>
															<div className="min-w-0">
																<span className="text-xs text-[#F5F0EB] font-medium">{item.dishName}</span>
																{item.qty > 1 && (
																	<span className="text-[10px] text-[#5A5249] ml-2">×{item.qty}</span>
																)}
																{item.notes && (
																	<p className="text-[10px] text-[#9A8F84] mt-0.5 italic">{item.notes}</p>
																)}
															</div>
															<div className="text-right shrink-0 ml-3">
																<span className="text-xs text-[#9A8F84]">{formatPrice(item.totalPrice)}</span>
																{item.qty > 1 && (
																	<span className="block text-[10px] text-[#333]">
																		{formatPrice(item.unitPrice)} / u
																	</span>
																)}
															</div>
														</div>
													))}
												</div>
											</div>
										))}
									</div>
								)}
							</div>

							<Section title="Addition" icon={Banknote}>
								<InfoRow label="Sous-total" value={formatPrice(subtotal)} />
								{order.depositDeducted > 0 && (
									<InfoRow
										label="Acompte déduit"
										value={`−${formatPrice(order.depositDeducted)}`}
										valueClass="text-green-400"
									/>
								)}
								<InfoRow
									label={order.depositDeducted > 0 ? "Reste à payer" : "Total"}
									value={formatPrice(order.depositDeducted > 0 ? amountDue : subtotal)}
									valueClass="font-semibold text-[#C8973A]"
								/>
								{order.paymentMethod && (
									<InfoRow
										label="Mode de paiement"
										value={PAYMENT_METHOD_LABELS[order.paymentMethod] ?? order.paymentMethod}
										valueClass="text-[#9A8F84]"
									/>
								)}
								{order.closedAt && (
									<InfoRow
										label="Encaissé le"
										value={formatDate(order.closedAt, "dd/MM/yyyy à HH:mm")}
										valueClass="text-[#9A8F84]"
									/>
								)}
							</Section>

							<Section title="Historique">
								<InfoRow label="Ouvert le" value={formatDate(order.openedAt, "dd/MM/yyyy à HH:mm")} valueClass="text-[#9A8F84]" />
								{order.closedAt && (
									<InfoRow label="Clôturé le" value={formatDate(order.closedAt, "dd/MM/yyyy à HH:mm")} valueClass="text-[#9A8F84]" />
								)}
								<InfoRow label="Créé le" value={formatDate(order.createdAt, "dd/MM/yyyy à HH:mm")} valueClass="text-[#9A8F84]" />
								<InfoRow
									label="Référence"
									value={order.id}
									valueClass="font-mono text-[10px] text-[#5A5249] break-all"
								/>
							</Section>
						</div>
					</>
				)}
			</aside>
		</>
	);
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CommandesClient({ orders, initialOrderId }: Props) {
	const router = useRouter();

	const [search,       setSearch]       = useState("");
	const [activeStatus, setActiveStatus] = useState<ServiceStatus | null>(null);
	const [typeFilter,   setTypeFilter]   = useState<ServiceType | "">("");
	const [sortKey,      setSortKey]      = useState<SortKey>("date");
	const [sortDir,      setSortDir]      = useState<SortDir>("desc");
	const [page,         setPage]         = useState(1);
	const [selectedId,   setSelectedId]   = useState<string | null>(initialOrderId ?? null);

	// Deep-link support: ?order=<id> opens the panel on load, then the URL is cleaned up.
	useEffect(() => {
		if (initialOrderId) {
			router.replace("/admin/commandes", { scroll: false });
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// ── Stats ──
	const stats = useMemo(() => {
		return {
			total:    orders.length,
			ouverte:  orders.filter((o) => o.status === "OUVERTE").length,
			addition: orders.filter((o) => o.status === "ADDITION_DEMANDEE").length,
			payee:    orders.filter((o) => o.status === "PAYEE").length,
		};
	}, [orders]);

	// ── Status counts for pills ──
	const statusCounts = useMemo(() => {
		const c: Record<string, number> = {};
		orders.forEach((o) => { c[o.status] = (c[o.status] ?? 0) + 1; });
		return c;
	}, [orders]);

	// ── Filtered + sorted list ──
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

	// Reset page on any filter/sort change
	useEffect(() => { setPage(1); }, [search, activeStatus, typeFilter, sortKey, sortDir]);

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

	const hasActiveFilters = !!(search || activeStatus || typeFilter);
	const selectedOrder    = orders.find((o) => o.id === selectedId) ?? null;

	return (
		<div className="min-h-full">

			{/* ── Header ── */}
			<div className="flex items-start justify-between mb-6 gap-4">
				<div>
					<h1 className="font-display text-3xl text-[#F5F0EB] leading-tight">Commandes</h1>
					<p className="text-sm text-[#5A5249] mt-1">
						{orders.length} commande{orders.length !== 1 ? "s" : ""} au total
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
			<div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
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

			{/* ── Filters ── */}
			<div className="bg-[#141414] border border-[#222] rounded-xl p-4 mb-4 space-y-3">
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
							className="w-full pl-9 pr-4 h-9 bg-[#0A0A0A] border border-[#222] rounded-lg text-sm text-[#F5F0EB] placeholder-[#333] focus:border-[#C8973A] focus:ring-1 focus:ring-[#C8973A] outline-none transition-colors"
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
							{hasActiveFilters && (
								<button
									onClick={resetFilters}
									className="text-xs text-[#5A5249] hover:text-[#9A8F84] transition-colors"
								>
									Réinitialiser
								</button>
							)}
						</div>
					</div>
				</div>
			</div>

			{/* ── Desktop Grid List ── */}
			<div className="hidden md:block bg-[#141414] border border-[#222] rounded-xl overflow-hidden">

				<div className={cn("grid items-center px-5 py-3 border-b border-[#222] bg-[#141414]", GRID_COLS)}>
					<SortBtn label="Date"   sortKey="date"   current={sortKey} dir={sortDir} onClick={handleSortClick} />
					<SortBtn label="Table"  sortKey="table"  current={sortKey} dir={sortDir} onClick={handleSortClick} />
					<span className="text-xs font-semibold uppercase tracking-wider text-[#5A5249]">Client</span>
					<span className="text-xs font-semibold uppercase tracking-wider text-[#5A5249]">Type</span>
					<SortBtn label="Statut" sortKey="status" current={sortKey} dir={sortDir} onClick={handleSortClick} />
					<div className="flex justify-end">
						<SortBtn label="Total"  sortKey="amount" current={sortKey} dir={sortDir} onClick={handleSortClick} />
					</div>
				</div>

				{/* Lignes */}
				{paginated.length === 0 ? (
					<EmptyState onReset={hasActiveFilters ? resetFilters : undefined} />
				) : (
					<div className="divide-y divide-[#1a1a1a]">
						{paginated.map((o) => {
							const meta = SERVICE_STATUS_META[o.status];
							const dl   = dateLabel(new Date(o.openedAt));
							const isSelected = selectedId === o.id;
							return (
								<div
									key={o.id}
									onClick={() => setSelectedId(o.id)}
									role="button"
									tabIndex={0}
									onKeyDown={(e) => e.key === "Enter" && setSelectedId(o.id)}
									className={cn(
										"grid items-center px-5 py-3.5 cursor-pointer transition-colors",
										GRID_COLS,
										isSelected ? "bg-[#C8973A]/5" : "hover:bg-[#1a1a1a]"
									)}
								>
									{/* Date */}
									<div>
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
									</div>

									{/* Table */}
									<div>
										<span className="text-sm font-semibold text-[#F5F0EB]">
											<Highlight text={`T${o.table.numero}`} query={search} />
										</span>
										<span className="block text-xs text-[#5A5249]">
											<Highlight
												text={ZONE_LABELS[o.table.zone]?.label ?? o.table.zone}
												query={search}
											/>
										</span>
									</div>

									{/* Client */}
									<div className="min-w-0">
										<span className="text-sm text-[#F5F0EB] truncate block">
											<Highlight text={o.guestName} query={search} />
										</span>
										<span className="block text-xs text-[#5A5249]">
											{o.covers} couvert{o.covers > 1 ? "s" : ""}
										</span>
									</div>

									{/* Type */}
									<span className="text-xs text-[#9A8F84]">
										{SERVICE_TYPE_LABELS[o.type] ?? o.type}
									</span>

									{/* Statut */}
									<div>
										<Badge variant={meta?.color ?? "gray"} className="text-[11px]">
											{meta?.label ?? o.status}
										</Badge>
									</div>

									{/* Total */}
									<div className="text-right">
										<span className="text-sm font-semibold text-[#C8973A] tabular-nums">
											{o.totalAmount > 0 ? formatPrice(o.totalAmount) : "—"}
										</span>
										{o.depositDeducted > 0 && (
											<span className="block text-xs text-[#5A5249]">
												−{formatPrice(o.depositDeducted)} acompte
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
					paginated.map((o) => {
						const meta = SERVICE_STATUS_META[o.status];
						const dl   = dateLabel(new Date(o.openedAt));
						const isSelected = selectedId === o.id;
						return (
							<div
								key={o.id}
								onClick={() => setSelectedId(o.id)}
								role="button"
								tabIndex={0}
								onKeyDown={(e) => e.key === "Enter" && setSelectedId(o.id)}
								className={cn(
									"border rounded-xl p-4 cursor-pointer transition-colors",
									isSelected
										? "bg-[#C8973A]/5 border-[#C8973A]/30"
										: "bg-[#141414] border-[#222] hover:border-[#333] hover:bg-[#1a1a1a]"
								)}
							>
								{/* Ligne haute : icône + infos + badge statut */}
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

								{/* Grille de méta-infos */}
								<div className="grid grid-cols-3 gap-2 mb-3">
									<MobileInfoCell label="Date"     value={dl.text}                          accent={dl.accent} />
									<MobileInfoCell label="Heure"    value={formatDate(o.openedAt, "HH:mm")} />
									<MobileInfoCell label="Couverts" value={`${o.covers} pers.`}             />
								</div>

								{/* Pied : total */}
								<div className="flex items-center justify-between pt-3 border-t border-[#1a1a1a]">
									<span className="text-xs text-[#5A5249]">Total</span>
									<span className="text-sm font-semibold text-[#C8973A] tabular-nums">
										{o.totalAmount > 0 ? formatPrice(o.totalAmount) : "—"}
									</span>
								</div>
							</div>
						);
					})
				)}
			</div>

			{/* ── Pagination ── */}
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

			<DetailPanel order={selectedOrder} onClose={() => setSelectedId(null)} />
		</div>
	);
}
