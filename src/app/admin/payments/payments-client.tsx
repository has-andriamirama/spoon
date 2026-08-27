"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
	Search,
	Download,
	CreditCard,
	CheckCircle2,
	AlertCircle,
	XCircle,
	RotateCcw,
	ChevronDown,
	ChevronUp,
	ChevronsUpDown,
	ChevronLeft,
	ChevronRight,
	X,
	ExternalLink,
	Receipt,
	Wallet,
	TableProperties,
	Banknote,
} from "lucide-react";
import { cn, formatDate, formatDateTime, formatPrice } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { PaymentStatus, PaymentType, PaymentMethodService, ServiceType } from "@/types";
import RefundForm from "./[id]/refund-form";

interface InvoiceInfo {
	id: string;
	invoiceNumber: string;
	pdfUrl: string | null;
}

export type PaymentKind = "DEPOSIT" | "ADDITION";

/**
 * Une entrée unifiée du registre des paiements.
 * - kind = "DEPOSIT"  → acompte de réservation encaissé via Stripe (table `Payment`)
 * - kind = "ADDITION" → addition de commande encaissée en salle (table `ServiceOrder`, statut PAYEE)
 */
export interface UnifiedPayment {
	id: string;
	kind: PaymentKind;
	amount: number;
	currency: string;
	type: PaymentType | null;
	paymentMethod: PaymentMethodService | null;
	status: PaymentStatus;
	refundedAmount: number | null;
	/** Acompte de réservation déjà encaissé et déduit de cette addition (kind = "ADDITION" uniquement). */
	depositDeducted: number | null;
	stripePaymentIntentId: string | null;
	stripeChargeId: string | null;
	paidAt: Date | null;
	refundedAt: Date | null;
	failureReason: string | null;
	createdAt: Date;
	updatedAt: Date;
	guestName: string;
	guestEmail: string | null;
	date: Date;
	timeSlot: string | null;
	reservationId: string | null;
	invoice: InvoiceInfo | null;
	serviceOrderId: string | null;
	serviceType: ServiceType | null;
	tableNumero: number | null;
	itemsCount: number | null;
}

interface Props {
	payments: UnifiedPayment[];
	initialPaymentId?: string;
}

const PAYMENT_TYPE_LABELS: Record<string, string> = {
	DEPOSIT: "Acompte",
	FULL:    "Paiement complet",
	NONE:    "Sans paiement",
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
	CB:           "Carte bancaire",
	ESPECES:      "Espèces",
	CHEQUE:       "Chèque",
	TICKET_RESTO: "Ticket-restaurant",
};

const SERVICE_TYPE_LABELS: Record<string, string> = {
	RESERVATION: "Réservation",
	WALK_IN:     "Sur place",
};

const KIND_META: Record<PaymentKind, { label: string; badge: "gold" | "orange" }> = {
	DEPOSIT:  { label: "Acompte réservation", badge: "gold"   },
	ADDITION: { label: "Addition",            badge: "orange" },
};

const STATUS_META: Record<
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

const PER_PAGE = 10;
const GRID_COLS = "grid-cols-[1.3fr_1fr_0.8fr_1fr_0.8fr_1fr]";

type SortKey = "date" | "amount" | "status" | "client";
type SortDir = "asc" | "desc";
type KindFilter = "ALL" | PaymentKind;

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
	active,
	onClick,
}: {
	label: string;
	value: string | number;
	sub?: string;
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
				{sub && <p className="text-[10px] text-[#C8973A] mt-0.5 font-medium">{sub}</p>}
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
			: color === "orange"
			? "bg-orange-500/10 border-orange-500/30 text-orange-400"
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

function EmptyState({ onReset }: { onReset?: () => void }) {
	return (
		<div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
			<div className="w-12 h-12 rounded-full bg-[#1a1a1a] flex items-center justify-center">
				<Search size={20} className="text-[#5A5249]" />
			</div>
			<p className="text-sm text-[#5A5249]">Aucun paiement trouvé</p>
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

function Section({
	title,
	icon: Icon,
	children,
}: {
	title: string;
	icon?: React.ElementType;
	children: React.ReactNode;
}) {
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

function DetailPanel({
	payment,
	onClose,
}: {
	payment: UnifiedPayment | null;
	onClose: () => void;
}) {
	useEffect(() => {
		const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [onClose]);

	useEffect(() => {
		document.body.style.overflow = payment ? "hidden" : "";
		return () => { document.body.style.overflow = ""; };
	}, [payment]);

	const isOpen = !!payment;

	const isDeposit    = payment?.kind === "DEPOSIT";
	const initials     = payment ? getInitialsFromName(payment.guestName) : "";
	const meta         = payment ? STATUS_META[payment.status] : null;
	const kindMeta     = payment ? KIND_META[payment.kind] : null;
	const isRefundable = isDeposit && payment?.status === "PAID";
	const refundable   = payment ? payment.amount - (payment.refundedAmount ?? 0) : 0;

	// Pour une addition (kind = "ADDITION"), payment.amount est le sous-total de la commande ;
	// un éventuel acompte de réservation déjà encaissé vient s'en déduire — même logique que
	// dans le panneau de détail de la page Commandes.
	const hasDeposit = !isDeposit && payment != null && (payment.depositDeducted ?? 0) > 0;
	const amountDue  = payment ? Math.max(0, payment.amount - (payment.depositDeducted ?? 0)) : 0;

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
				aria-label="Détail du paiement"
				role="dialog"
				aria-modal="true"
			>
				{payment && (
					<>
						<div className="flex items-center justify-between p-5 border-b border-[#222] shrink-0">
							<div className="flex items-center gap-3 min-w-0">
								<div className="w-10 h-10 rounded-full bg-[#C8973A]/10 border border-[#C8973A]/20 flex items-center justify-center text-sm font-semibold text-[#C8973A] shrink-0">
									{initials}
								</div>
								<div className="min-w-0">
									<p className="text-sm font-semibold text-[#F5F0EB] truncate">{payment.guestName}</p>
									<p className="text-xs text-[#5A5249] truncate">
										{payment.guestEmail ?? "Client sur place"}
									</p>
								</div>
							</div>
							<div className="flex items-center gap-2 shrink-0 ml-2">
								<Badge variant={meta?.color ?? "gray"} className="text-[11px]">
									{meta?.label ?? payment.status}
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

							<div className="flex items-center gap-2">
								<Badge variant={kindMeta?.badge ?? "gray"} className="text-[11px]">
									{kindMeta?.label}
								</Badge>
								{payment.kind === "ADDITION" && payment.serviceType && (
									<Badge variant="default" className="text-[11px]">
										{SERVICE_TYPE_LABELS[payment.serviceType] ?? payment.serviceType}
									</Badge>
								)}
							</div>

							<div className="grid grid-cols-2 gap-2">
								{[
									{
										label:      "Montant",
										value:      formatPrice(payment.amount),
										valueClass: "text-[#C8973A] font-bold text-sm",
									},
									{
										label:      isDeposit ? "Type" : "Mode de paiement",
										value:      isDeposit
											? PAYMENT_TYPE_LABELS[payment.type ?? ""] ?? payment.type
											: PAYMENT_METHOD_LABELS[payment.paymentMethod ?? ""] ?? "—",
										valueClass: "text-[#F5F0EB]",
									},
									{
										label:      "Payé le",
										value:      payment.paidAt ? formatDateTime(payment.paidAt) : "—",
										valueClass: payment.paidAt ? "text-[#F5F0EB]" : "text-[#5A5249] italic",
									},
									{
										label:      isDeposit ? "Remboursé le" : "Table",
										value:      isDeposit
											? (payment.refundedAt ? formatDateTime(payment.refundedAt) : "—")
											: (payment.tableNumero != null ? `Table ${payment.tableNumero}` : "—"),
										valueClass: isDeposit
											? (payment.refundedAt ? "text-blue-400" : "text-[#5A5249] italic")
											: "text-[#F5F0EB]",
									},
								].map(({ label, value, valueClass }) => (
									<div
										key={label}
										className="bg-[#0A0A0A] rounded-xl border border-[#1a1a1a] px-3 py-2.5"
									>
										<p className="text-[10px] text-[#5A5249] mb-1">{label}</p>
										<p className={cn("text-xs font-medium leading-tight", valueClass)}>{value}</p>
									</div>
								))}
							</div>

							{isDeposit && payment.refundedAmount != null && payment.refundedAmount > 0 && (
								<div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-blue-500/5 border border-blue-500/10">
									<span className="text-xs text-[#5A5249]">Montant remboursé</span>
									<span className="text-xs font-semibold text-blue-400">
										−{formatPrice(payment.refundedAmount)}
									</span>
								</div>
							)}

							{isDeposit ? (
								<Section title="Informations Stripe">
									<InfoRow
										label="Référence"
										value={`#${payment.id.slice(-8).toUpperCase()}`}
										valueClass="font-mono text-[#9A8F84] text-[11px]"
									/>
									{payment.stripePaymentIntentId && (
										<InfoRow
											label="Payment Intent"
											value={`…${payment.stripePaymentIntentId.slice(-14)}`}
											valueClass="font-mono text-[11px]"
										/>
									)}
									{payment.stripeChargeId && (
										<InfoRow
											label="Charge ID"
											value={`…${payment.stripeChargeId.slice(-14)}`}
											valueClass="font-mono text-[11px]"
										/>
									)}
									{payment.failureReason && (
										<InfoRow
											label="Raison d'échec"
											value={payment.failureReason}
											valueClass="text-red-400 text-[11px]"
										/>
									)}
									<InfoRow
										label="Créé le"
										value={formatDateTime(payment.createdAt)}
										valueClass="text-[#9A8F84]"
									/>
								</Section>
							) : (
								<>
									<Section title="Addition" icon={Banknote}>
										<InfoRow label="Sous-total" value={formatPrice(payment.amount)} />
										{hasDeposit && (
											<InfoRow
												label="Acompte déjà payé"
												value={`−${formatPrice(payment.depositDeducted ?? 0)}`}
												valueClass="text-green-400"
											/>
										)}
										<InfoRow
											label={hasDeposit ? "Reste à payer" : "Total"}
											value={formatPrice(hasDeposit ? amountDue : payment.amount)}
											valueClass="font-semibold text-[#C8973A]"
										/>
										{payment.paymentMethod && (
											<InfoRow
												label="Mode de paiement"
												value={PAYMENT_METHOD_LABELS[payment.paymentMethod] ?? payment.paymentMethod}
												valueClass="text-[#9A8F84]"
											/>
										)}
										<InfoRow
											label="Encaissé le"
											value={formatDateTime(payment.createdAt)}
											valueClass="text-[#9A8F84]"
										/>
									</Section>

									<Section title="Détails de l'addition">
										<InfoRow
											label="Référence"
											value={`#${(payment.serviceOrderId ?? payment.id).slice(-8).toUpperCase()}`}
											valueClass="font-mono text-[#9A8F84] text-[11px]"
										/>
										<InfoRow
											label="Articles"
											value={payment.itemsCount != null ? `${payment.itemsCount} article${payment.itemsCount !== 1 ? "s" : ""}` : "—"}
											valueClass="text-[#9A8F84]"
										/>
									</Section>
								</>
							)}

							{payment.kind === "ADDITION" && payment.serviceOrderId && (
								<div>
									<p className="text-[10px] font-semibold uppercase tracking-widest text-[#5A5249] mb-2">
										Commande liée
									</p>
									<Link
										href={`/admin/commandes?order=${payment.serviceOrderId}`}
										className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#0A0A0A] border border-[#1a1a1a] hover:border-[#C8973A]/30 transition-colors group"
									>
										<div className="flex items-center gap-3 min-w-0">
											<div className="w-8 h-8 rounded-lg bg-[#1a1a1a] border border-[#222] flex items-center justify-center shrink-0">
												<TableProperties size={14} className="text-[#9A8F84]" />
											</div>
											<div className="min-w-0">
												<p className="text-sm text-[#F5F0EB] font-medium truncate">
													Table {payment.tableNumero ?? "—"} · {payment.guestName}
												</p>
												<p className="text-xs text-[#5A5249] mt-0.5">Voir la commande</p>
											</div>
										</div>
										<ExternalLink
											size={14}
											className="text-[#5A5249] group-hover:text-[#C8973A] shrink-0 transition-colors"
										/>
									</Link>
								</div>
							)}

							{payment.reservationId && (
								<div>
									<p className="text-[10px] font-semibold uppercase tracking-widest text-[#5A5249] mb-2">
										Réservation liée
									</p>
									<Link
										href={`/admin/reservations?id=${payment.reservationId}`}
										className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#0A0A0A] border border-[#1a1a1a] hover:border-[#C8973A]/30 transition-colors group"
									>
										<div className="min-w-0">
											<p className="text-sm text-[#F5F0EB] font-medium truncate">{payment.guestName}</p>
											<p className="text-xs text-[#5A5249] mt-0.5">
												{isDeposit
													? `${formatDate(payment.date, "dd MMMM yyyy")} · ${payment.timeSlot}`
													: formatDate(payment.date, "dd MMMM yyyy")}
											</p>
										</div>
										<ExternalLink
											size={14}
											className="text-[#5A5249] group-hover:text-[#C8973A] shrink-0 transition-colors"
										/>
									</Link>
								</div>
							)}

							{payment.invoice && (
								<div>
									<p className="text-[10px] font-semibold uppercase tracking-widest text-[#5A5249] mb-2">
										Facture associée
									</p>
									<Link
										href={`/admin/invoices?id=${payment.invoice.id}`}
										className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#0A0A0A] border border-[#1a1a1a] hover:border-[#C8973A]/30 transition-colors group"
									>
										<div className="flex items-center gap-3 min-w-0">
											<div className="w-8 h-8 rounded-lg bg-[#1a1a1a] border border-[#222] flex items-center justify-center shrink-0">
												<Receipt size={14} className="text-[#9A8F84]" />
											</div>
											<div className="min-w-0">
												<p className="text-sm text-[#F5F0EB] font-medium font-mono truncate">
													{payment.invoice.invoiceNumber}
												</p>
												<p className="text-xs text-[#5A5249]">Voir la facture</p>
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

						{isRefundable && refundable > 0 && (
							<div className="shrink-0 border-t border-[#222]">
								<RefundForm paymentId={payment.id} maxAmount={refundable} />
							</div>
						)}
					</>
				)}
			</aside>
		</>
	);
}

export default function PaymentsClient({ payments, initialPaymentId }: Props) {
	const router = useRouter();

	const [search,        setSearch]        = useState("");
	const [activeStatus,  setActiveStatus]  = useState<PaymentStatus | null>(null);
	const [kindFilter,    setKindFilter]    = useState<KindFilter>("ALL");
	const [sortKey,       setSortKey]       = useState<SortKey>("date");
	const [sortDir,       setSortDir]       = useState<SortDir>("desc");
	const [page,          setPage]          = useState(1);
	const [selectedId,    setSelectedId]    = useState<string | null>(null);

	// Deep-link support: /admin/payments?id=xxx opens the panel on load, with the slide-in
	// animation (selectedId starts at null and is only set after the first paint), then the
	// URL is cleaned up. Used by the invoice side panel instead of a dedicated route.
	useEffect(() => {
		if (initialPaymentId) {
			setSelectedId(initialPaymentId);
			router.replace("/admin/payments", { scroll: false });
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const stats = useMemo(() => {
		const paid      = payments.filter((p) => p.status === "PAID");
		const refunded  = payments.filter((p) => p.status === "REFUNDED" || p.status === "PARTIALLY_REFUNDED");
		const deposits  = payments.filter((p) => p.kind === "DEPOSIT");
		const additions = payments.filter((p) => p.kind === "ADDITION");
		return {
			total:          payments.length,
			pending:        payments.filter((p) => p.status === "PENDING").length,
			paid:           paid.length,
			refunded:       refunded.length,
			failed:         payments.filter((p) => p.status === "FAILED").length,
			totalPaid:      paid.reduce((s, p) => s + p.amount, 0),
			depositsCount:  deposits.length,
			depositsTotal:  deposits.filter((p) => p.status === "PAID").reduce((s, p) => s + p.amount, 0),
			additionsCount: additions.length,
			additionsTotal: additions.reduce((s, p) => s + p.amount, 0),
		};
	}, [payments]);

	const statusCounts = useMemo(() => {
		const c: Record<string, number> = {};
		payments.forEach((p) => { c[p.status] = (c[p.status] ?? 0) + 1; });
		return c;
	}, [payments]);

	const filtered = useMemo(() => {
		const q = search.toLowerCase().trim();

		let result = payments.filter((p) => {
			if (q) {
				const stripeId = p.stripePaymentIntentId ?? "";
				const tableRef = p.tableNumero != null ? `table ${p.tableNumero}` : "";
				const haystack = [p.guestName, p.guestEmail ?? "", stripeId, tableRef]
					.join(" ")
					.toLowerCase();
				if (!haystack.includes(q)) return false;
			}
			if (activeStatus && p.status !== activeStatus) return false;
			if (kindFilter !== "ALL" && p.kind !== kindFilter) return false;
			return true;
		});

		result = [...result].sort((a, b) => {
			let cmp = 0;
			if (sortKey === "date")   cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
			if (sortKey === "amount") cmp = a.amount - b.amount;
			if (sortKey === "status") cmp = a.status.localeCompare(b.status);
			if (sortKey === "client") cmp = a.guestName.localeCompare(b.guestName, "fr");
			return sortDir === "asc" ? cmp : -cmp;
		});

		return result;
	}, [payments, search, activeStatus, kindFilter, sortKey, sortDir]);

	useEffect(() => { setPage(1); }, [search, activeStatus, kindFilter, sortKey, sortDir]);

	const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
	const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

	const handleSortClick = useCallback(
		(key: SortKey) => {
			if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
			else { setSortKey(key); setSortDir("desc"); }
		},
		[sortKey]
	);

	const handleStatusPill = useCallback((s: PaymentStatus | null) => {
		setActiveStatus((prev) => (prev === s ? null : s));
	}, []);

	const handleKindClick = useCallback((k: KindFilter) => {
		setKindFilter((prev) => (prev === k ? "ALL" : k));
	}, []);

	const resetFilters = useCallback(() => {
		setSearch("");
		setActiveStatus(null);
		setKindFilter("ALL");
	}, []);

	const handleExport = useCallback(() => {
		const headers = [
			"Client", "Email", "Date", "Montant (€)", "Acompte déduit (€)", "Genre", "Type / Mode",
			"Statut", "Table", "Référence Stripe", "Payé le",
		];
		const rows = filtered.map((p) => [
			p.guestName,
			p.guestEmail ?? "",
			formatDate(p.date, "dd/MM/yyyy"),
			p.amount.toFixed(2),
			(p.depositDeducted ?? 0).toFixed(2),
			KIND_META[p.kind].label,
			p.kind === "DEPOSIT"
				? (PAYMENT_TYPE_LABELS[p.type ?? ""] ?? p.type ?? "")
				: (PAYMENT_METHOD_LABELS[p.paymentMethod ?? ""] ?? ""),
			STATUS_META[p.status]?.label ?? p.status,
			p.tableNumero != null ? `Table ${p.tableNumero}` : "",
			p.stripePaymentIntentId ?? "",
			p.paidAt ? formatDateTime(p.paidAt) : "",
		]);
		const csv = [headers, ...rows]
			.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
			.join("\n");
		const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
		const url  = URL.createObjectURL(blob);
		const a    = Object.assign(document.createElement("a"), {
			href: url,
			download: `paiements-${new Date().toISOString().slice(0, 10)}.csv`,
		});
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}, [filtered]);

	const hasActiveFilters  = !!(search || activeStatus || kindFilter !== "ALL");
	const selectedPayment   = payments.find((p) => p.id === selectedId) ?? null;

	return (
		<div className="min-h-full">

			<div className="flex items-center justify-between mb-6 gap-4">
				<div>
					<h1 className="font-display text-3xl text-[#F5F0EB]">Paiements</h1>
					<p className="text-sm text-[#5A5249] mt-1">
						{payments.length} paiement{payments.length !== 1 ? "s" : ""} au total
						· acomptes et additions confondus
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

			<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
				<StatCard
					label="Total encaissé"
					value={formatPrice(stats.totalPaid)}
					sub={`${stats.paid} paiement${stats.paid !== 1 ? "s" : ""}`}
					icon={CheckCircle2}
					iconColor="bg-green-500/10 text-green-400"
				/>
				<StatCard
					label="Acomptes"
					value={stats.depositsCount}
					sub={stats.depositsTotal > 0 ? formatPrice(stats.depositsTotal) : undefined}
					icon={CreditCard}
					iconColor="bg-[#C8973A]/10 text-[#C8973A]"
					active={kindFilter === "DEPOSIT"}
					onClick={() => handleKindClick("DEPOSIT")}
				/>
				<StatCard
					label="Additions"
					value={stats.additionsCount}
					sub={stats.additionsTotal > 0 ? formatPrice(stats.additionsTotal) : undefined}
					icon={Wallet}
					iconColor="bg-orange-500/10 text-orange-400"
					active={kindFilter === "ADDITION"}
					onClick={() => handleKindClick("ADDITION")}
				/>
				<StatCard
					label="En attente"
					value={stats.pending}
					icon={AlertCircle}
					iconColor="bg-yellow-500/10 text-yellow-400"
					active={activeStatus === "PENDING"}
					onClick={() => handleStatusPill("PENDING")}
				/>
				<StatCard
					label="Remboursés"
					value={stats.refunded}
					icon={RotateCcw}
					iconColor="bg-blue-500/10 text-blue-400"
					active={activeStatus === "REFUNDED"}
					onClick={() => handleStatusPill("REFUNDED")}
				/>
			</div>

			<div className="bg-[#141414] border border-[#222] rounded-xl p-4 mb-4 space-y-3">
				<div className="flex flex-col gap-3">
					<div className="relative flex-1">
						<Search
							size={14}
							className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5A5249] pointer-events-none"
						/>
						<input
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder="Rechercher par client, email, table, Stripe ID..."
							className="w-full pl-9 pr-4 h-9 bg-[#0A0A0A] border border-[#222] rounded-lg text-sm text-[#F5F0EB] placeholder-[#333] focus:border-[#C8973A] focus:ring-1 focus:ring-[#C8973A] outline-none transition-colors"
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

					<div className="flex items-center gap-2 flex-wrap">
						<StatusPill
							label="Acomptes"
							count={stats.depositsCount}
							color="gray"
							active={kindFilter === "DEPOSIT"}
							onClick={() => handleKindClick("DEPOSIT")}
						/>
						<StatusPill
							label="Additions"
							count={stats.additionsCount}
							color="orange"
							active={kindFilter === "ADDITION"}
							onClick={() => handleKindClick("ADDITION")}
						/>
						<span className="w-px h-5 bg-[#222] mx-1" />
						{(Object.entries(STATUS_META) as [PaymentStatus, typeof STATUS_META[string]][]).map(
							([status, meta]) => (
								<StatusPill
									key={status}
									label={meta.label}
									count={statusCounts[status] ?? 0}
									color={meta.color}
									active={activeStatus === status}
									onClick={() => handleStatusPill(status)}
								/>
							)
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
			</div>

			{/* ── Desktop ── */}
			<div className="hidden md:block bg-[#141414] border border-[#222] rounded-xl overflow-hidden">

				<div className={cn("grid items-center px-5 py-3 border-b border-[#222] bg-[#141414]", GRID_COLS)}>
					<SortBtn label="Client"  sortKey="client" current={sortKey} dir={sortDir} onClick={handleSortClick} />
					<SortBtn label="Date"    sortKey="date"   current={sortKey} dir={sortDir} onClick={handleSortClick} />
					<div className="flex justify-end">
						<SortBtn label="Montant" sortKey="amount" current={sortKey} dir={sortDir} onClick={handleSortClick} />
					</div>
					<span className="text-xs font-semibold uppercase tracking-wider text-[#5A5249]">Type</span>
					<SortBtn label="Statut"  sortKey="status" current={sortKey} dir={sortDir} onClick={handleSortClick} />
					<span className="text-xs font-semibold uppercase tracking-wider text-[#5A5249]">Référence</span>
				</div>

				{paginated.length === 0 ? (
					<EmptyState onReset={hasActiveFilters ? resetFilters : undefined} />
				) : (
					<div className="divide-y divide-[#1a1a1a]">
						{paginated.map((p) => {
							const meta        = STATUS_META[p.status];
							const kindMeta    = KIND_META[p.kind];
							const isSelected  = selectedId === p.id;
							return (
								<div
									key={p.id}
									onClick={() => setSelectedId(p.id)}
									role="button"
									tabIndex={0}
									onKeyDown={(e) => e.key === "Enter" && setSelectedId(p.id)}
									className={cn(
										"group grid items-center px-5 py-3.5 cursor-pointer transition-colors",
										GRID_COLS,
										isSelected ? "bg-[#C8973A]/5" : "hover:bg-[#1a1a1a]"
									)}
								>
									<div className="min-w-0">
										<span className="text-sm text-[#F5F0EB] block truncate">
											<Highlight text={p.guestName} query={search} />
										</span>
										<span className="text-xs text-[#5A5249] block truncate">
											{p.guestEmail ? <Highlight text={p.guestEmail} query={search} /> : "Client sur place"}
										</span>
									</div>

									<div>
										<span className="text-sm text-[#F5F0EB]">
											{formatDate(p.date, "dd/MM/yyyy")}
										</span>
										<span className="block text-xs text-[#5A5249]">
											{p.kind === "DEPOSIT" ? p.timeSlot : formatDateTime(p.date).split(" à ")[1]}
										</span>
									</div>

									<div className="text-right">
										<span className="text-sm font-semibold text-[#C8973A] tabular-nums">
											{formatPrice(p.amount)}
										</span>
										{p.refundedAmount != null && p.refundedAmount > 0 && (
											<span className="block text-[10px] text-blue-400 mt-0.5">
												−{formatPrice(p.refundedAmount)} remboursé
											</span>
										)}
										{p.depositDeducted != null && p.depositDeducted > 0 && (
											<span className="block text-xs text-[#5A5249]">
												−{formatPrice(p.depositDeducted)} acompte
											</span>
										)}
									</div>

									<div>
										<Badge variant={kindMeta.badge} className="text-[10px]">
											{kindMeta.label}
										</Badge>
										<span className="block text-[11px] text-[#5A5249] mt-1">
											{p.kind === "DEPOSIT"
												? (PAYMENT_TYPE_LABELS[p.type ?? ""] ?? p.type)
												: (PAYMENT_METHOD_LABELS[p.paymentMethod ?? ""] ?? "—")}
										</span>
									</div>

									<div>
										<Badge variant={meta?.color ?? "gray"} className="text-[11px]">
											{meta?.label ?? p.status}
										</Badge>
									</div>

									<span className="text-xs font-mono text-[#5A5249]">
										{p.kind === "DEPOSIT"
											? (p.stripePaymentIntentId
												? <Highlight text={`...${p.stripePaymentIntentId.slice(-10)}`} query={search} />
												: "—")
											: (p.tableNumero != null
												? <Highlight text={`Table ${p.tableNumero}`} query={search} />
												: "—")}
									</span>
								</div>
							);
						})}
					</div>
				)}
			</div>

			{/* ── Mobile ── */}
			<div className="md:hidden space-y-3">
				{paginated.length === 0 ? (
					<EmptyState onReset={hasActiveFilters ? resetFilters : undefined} />
				) : (
					paginated.map((p) => {
						const meta       = STATUS_META[p.status];
						const kindMeta   = KIND_META[p.kind];
						const isSelected = selectedId === p.id;
						return (
							<div
								key={p.id}
								onClick={() => setSelectedId(p.id)}
								role="button"
								tabIndex={0}
								onKeyDown={(e) => e.key === "Enter" && setSelectedId(p.id)}
								className={cn(
									"border rounded-xl p-4 space-y-3 cursor-pointer transition-colors",
									isSelected
										? "bg-[#C8973A]/5 border-[#C8973A]/30"
										: "bg-[#141414] border-[#222] hover:border-[#333] hover:bg-[#1a1a1a]"
								)}
							>
								<div className="flex items-start justify-between gap-2">
									<div className="min-w-0">
										<p className="text-sm font-medium text-[#F5F0EB] truncate">
											<Highlight text={p.guestName} query={search} />
										</p>
										<p className="text-xs text-[#5A5249] mt-0.5 truncate">
											{p.kind === "DEPOSIT"
												? `${formatDate(p.date, "dd/MM/yyyy")} · ${p.timeSlot}`
												: formatDateTime(p.date)}
										</p>
									</div>
									<Badge variant={kindMeta.badge} className="text-[10px] shrink-0">
										{kindMeta.label}
									</Badge>
								</div>

								<div className="grid grid-cols-3 gap-2">
									<div className="bg-[#0A0A0A] rounded-lg px-2.5 py-2">
										<p className="text-[10px] text-[#5A5249] mb-0.5">Montant</p>
										<p className="text-xs font-semibold text-[#C8973A] tabular-nums">
											{formatPrice(p.amount)}
										</p>
										{p.depositDeducted != null && p.depositDeducted > 0 && (
											<p className="text-[10px] text-[#5A5249] mt-0.5">
												−{formatPrice(p.depositDeducted)} acompte
											</p>
										)}
									</div>
									<div className="bg-[#0A0A0A] rounded-lg px-2.5 py-2">
										<p className="text-[10px] text-[#5A5249] mb-0.5">
											{p.kind === "DEPOSIT" ? "Type" : "Mode"}
										</p>
										<p className="text-xs font-medium text-[#F5F0EB] truncate">
											{p.kind === "DEPOSIT"
												? (PAYMENT_TYPE_LABELS[p.type ?? ""] ?? p.type)
												: (PAYMENT_METHOD_LABELS[p.paymentMethod ?? ""] ?? "—")}
										</p>
									</div>
									<div className="bg-[#0A0A0A] rounded-lg px-2.5 py-2">
										<p className="text-[10px] text-[#5A5249] mb-0.5">
											{p.kind === "DEPOSIT" ? "Stripe" : "Table"}
										</p>
										<p className="text-xs font-mono text-[#5A5249] truncate">
											{p.kind === "DEPOSIT"
												? (p.stripePaymentIntentId ? `…${p.stripePaymentIntentId.slice(-8)}` : "—")
												: (p.tableNumero != null ? `T${p.tableNumero}` : "—")}
										</p>
									</div>
								</div>

								<div className="flex items-center gap-2">
									<Badge variant={meta?.color ?? "gray"} className="text-[11px]">
										{meta?.label ?? p.status}
									</Badge>
									{p.refundedAmount != null && p.refundedAmount > 0 && (
										<span className="text-[10px] text-blue-400">
											−{formatPrice(p.refundedAmount)} remboursé
										</span>
									)}
								</div>
							</div>
						);
					})
				)}
			</div>

			{/* ── Pagination ── */}
			{totalPages > 1 && (
				<div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
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

			<DetailPanel payment={selectedPayment} onClose={() => setSelectedId(null)} />
		</div>
	);
}
