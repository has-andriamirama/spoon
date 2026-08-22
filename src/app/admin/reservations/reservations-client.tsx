"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
	Search,
	Plus,
	CalendarDays,
	X,
	Eye,
	XCircle,
	Loader2,
	ChevronDown,
	ChevronUp,
	ChevronsUpDown,
	Download,
	Users,
	Clock,
	CheckCircle2,
	AlertCircle,
	ChevronLeft,
	ChevronRight,
} from "lucide-react";
import toast from "react-hot-toast";
import { cn, formatDate, getInitials } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { RESERVATION_STATUSES, PAYMENT_STATUSES, ZONE_LABELS } from "@/lib/constants";
import type { Payment, ReservationStatus, ZoneTable } from "@/types";

interface TableInfo {
	id: string;
	numero: number;
	zone: ZoneTable;
}

interface Reservation {
	id: string;
	guestFirstName: string;
	guestLastName: string;
	guestEmail: string;
	guestPhone: string;
	date: Date;
	timeSlot: string;
	covers: number;
	status: ReservationStatus;
	notes: string | null;
	allergies: string | null;
	occasion: string | null;
	adminNotes: string | null;
	cancellationReason: string | null;
	cancelledAt: Date | null;
	confirmedAt: Date | null;
	createdAt: Date;
	table: TableInfo | null;
	payment: Payment | null;
}

interface Props {
	reservations: Reservation[];
}

const BADGE_VARIANT: Record<string, "yellow" | "green" | "red" | "gray" | "orange" | "blue"> = {
	yellow: "yellow",
	green: "green",
	red: "red",
	gray: "gray",
	orange: "orange",
	blue: "blue",
};

const CANCELLABLE_STATUSES: ReservationStatus[] = ["PENDING", "CONFIRMED"];
const PER_PAGE = 10;

type SortKey = "date" | "name" | "covers" | "status";
type SortDir = "asc" | "desc";

function tableLabel(table: TableInfo): string {
	return `T${table.numero}`;
}

function tableSubLabel(table: TableInfo): string {
	return ZONE_LABELS[table.zone]?.short ?? table.zone;
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

function dateLabel(date: Date): { text: string; accent: boolean } {
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const d = new Date(date);
	d.setHours(0, 0, 0, 0);
	const diff = Math.round((d.getTime() - today.getTime()) / 86_400_000);
	if (diff === 0) return { text: "Aujourd'hui", accent: true };
	if (diff === 1) return { text: "Demain", accent: true };
	if (diff === -1) return { text: "Hier", accent: false };
	return { text: formatDate(date, "dd/MM/yyyy"), accent: false };
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
			: color === "orange"
			? "bg-orange-500/10 border-orange-500/30 text-orange-400"
			: color === "gray"
			? "bg-[#222]/50 border-[#333] text-[#9A8F84]"
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

function InfoRow({
	label,
	value,
	valueClass,
}: {
	label: string;
	value: string;
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
	reservation,
	onClose,
	onCancel,
}: {
	reservation: Reservation | null;
	onClose: () => void;
	onCancel: (r: Reservation) => void;
}) {
	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [onClose]);

	useEffect(() => {
		if (reservation) {
			document.body.style.overflow = "hidden";
		} else {
			document.body.style.overflow = "";
		}
		return () => {
			document.body.style.overflow = "";
		};
	}, [reservation]);

	const r = reservation;
	const isOpen = !!r;

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
				aria-label="Détail de la réservation"
				role="dialog"
				aria-modal="true"
			>
				{r && (
					<>
						<div className="flex items-center justify-between p-5 border-b border-[#222] shrink-0">
							<div className="flex items-center gap-3 min-w-0">
								<div className="w-10 h-10 rounded-full bg-[#C8973A]/10 border border-[#C8973A]/20 flex items-center justify-center text-sm font-semibold text-[#C8973A] shrink-0">
									{getInitials(r.guestFirstName, r.guestLastName)}
								</div>
								<div className="min-w-0">
									<p className="text-sm font-semibold text-[#F5F0EB] truncate">
										{r.guestFirstName} {r.guestLastName}
									</p>
									<p className="text-xs text-[#5A5249] truncate">{r.guestEmail}</p>
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
							<div className="flex flex-wrap gap-2">
								<Badge variant={BADGE_VARIANT[RESERVATION_STATUSES[r.status].color]}>
									{RESERVATION_STATUSES[r.status].label}
								</Badge>
								{r.payment ? (
									<Badge variant={BADGE_VARIANT[PAYMENT_STATUSES[r.payment.status].color]}>
										{PAYMENT_STATUSES[r.payment.status].label}
									</Badge>
								) : (
									<Badge variant="gray">Sans paiement</Badge>
								)}
							</div>

							<Section title="Réservation">
								<InfoRow label="Date" value={formatDate(r.date, "EEEE dd MMMM yyyy")} />
								<InfoRow label="Heure" value={r.timeSlot} />
								<InfoRow
									label="Couverts"
									value={`${r.covers} personne${r.covers > 1 ? "s" : ""}`}
								/>
								{r.occasion && <InfoRow label="Occasion" value={r.occasion} />}
								{r.table ? (
									<InfoRow
										label="Table"
										value={`T${r.table.numero} — ${ZONE_LABELS[r.table.zone]?.label ?? r.table.zone}`}
									/>
								) : (
									<InfoRow
										label="Table"
										value="Non assignée"
										valueClass="italic text-[#5A5249]"
									/>
								)}
							</Section>

							<Section title="Contact">
								<InfoRow label="Email" value={r.guestEmail} />
								<InfoRow label="Téléphone" value={r.guestPhone} />
							</Section>

							{(r.notes || r.allergies || r.adminNotes || r.cancellationReason) && (
								<Section title="Notes">
									{r.notes && <InfoRow label="Client" value={r.notes} />}
									{r.allergies && (
										<InfoRow
											label="Allergies"
											value={r.allergies}
											valueClass="text-orange-400"
										/>
									)}
									{r.adminNotes && <InfoRow label="Admin" value={r.adminNotes} />}
									{r.cancellationReason && (
										<InfoRow label="Motif annulation" value={r.cancellationReason} />
									)}
								</Section>
							)}

							<Section title="Historique">
								<InfoRow
									label="Créée le"
									value={formatDate(r.createdAt, "dd/MM/yyyy à HH:mm")}
								/>
								{r.confirmedAt && (
									<InfoRow
										label="Confirmée le"
										value={formatDate(r.confirmedAt, "dd/MM/yyyy à HH:mm")}
									/>
								)}
								{r.cancelledAt && (
									<InfoRow
										label="Annulée le"
										value={formatDate(r.cancelledAt, "dd/MM/yyyy à HH:mm")}
									/>
								)}
								<InfoRow
									label="Référence"
									value={r.id}
									valueClass="font-mono text-[10px] text-[#5A5249] break-all"
								/>
							</Section>
						</div>

						<div className="p-5 border-t border-[#222] flex gap-3 shrink-0">
							<Link
								href={`/admin/reservations/${r.id}`}
								className="flex-1 flex items-center justify-center gap-2 h-9 rounded-lg border border-[#222] text-sm text-[#9A8F84] hover:text-[#F5F0EB] hover:bg-[#1a1a1a] transition-colors"
							>
								<Eye size={14} />
								Ouvrir la fiche
							</Link>
							{CANCELLABLE_STATUSES.includes(r.status) && (
								<button
									onClick={() => onCancel(r)}
									className="flex-1 flex items-center justify-center gap-2 h-9 rounded-lg border border-red-500/20 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
								>
									<XCircle size={14} />
									Annuler
								</button>
							)}
						</div>
					</>
				)}
			</aside>
		</>
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
			<p className="text-sm text-[#5A5249]">Aucune réservation trouvée</p>
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

export default function AdminReservationsClient({ reservations }: Props) {
	const router = useRouter();

	const [search, setSearch] = useState("");
	const [activeStatus, setActiveStatus] = useState<ReservationStatus | null>(null);
	const [dateFilter, setDateFilter] = useState<string>("");
	const [coversFilter, setCoversFilter] = useState<string>("");
	const [sortKey, setSortKey] = useState<SortKey>("date");
	const [sortDir, setSortDir] = useState<SortDir>("desc");
	const [page, setPage] = useState(1);

	const [selectedId, setSelectedId] = useState<string | null>(null);

	const [cancelTarget, setCancelTarget] = useState<Reservation | null>(null);
	const [cancelReason, setCancelReason] = useState("");
	const [cancelling, setCancelling] = useState(false);

	const today = useMemo(() => {
		const d = new Date();
		d.setHours(0, 0, 0, 0);
		return d;
	}, []);

	const stats = useMemo(() => {
		const pending = reservations.filter((r) => r.status === "PENDING").length;
		const confirmed = reservations.filter((r) => r.status === "CONFIRMED").length;
		const todayCount = reservations.filter((r) => {
			const d = new Date(r.date);
			d.setHours(0, 0, 0, 0);
			return d.getTime() === today.getTime();
		}).length;
		return { total: reservations.length, pending, confirmed, todayCount };
	}, [reservations, today]);

	const statusCounts = useMemo(() => {
		const counts: Record<string, number> = {};
		reservations.forEach((r) => {
			counts[r.status] = (counts[r.status] ?? 0) + 1;
		});
		return counts;
	}, [reservations]);

	const filtered = useMemo(() => {
		const q = search.toLowerCase().trim();

		let result = reservations.filter((r) => {
			if (q) {
				const full =
					`${r.guestFirstName} ${r.guestLastName} ${r.guestEmail} ${r.guestPhone}`.toLowerCase();
				if (!full.includes(q)) return false;
			}

			if (activeStatus && r.status !== activeStatus) return false;

			if (dateFilter) {
				const rd = new Date(r.date);
				rd.setHours(0, 0, 0, 0);
				if (dateFilter === "today" && rd.getTime() !== today.getTime()) return false;
				if (dateFilter === "tomorrow") {
					const tmr = new Date(today);
					tmr.setDate(tmr.getDate() + 1);
					if (rd.getTime() !== tmr.getTime()) return false;
				}
				if (dateFilter === "week") {
					const end = new Date(today);
					end.setDate(end.getDate() + 7);
					if (rd < today || rd > end) return false;
				}
				if (dateFilter === "past" && rd >= today) return false;
			}

			if (coversFilter) {
				if (coversFilter === "1-2" && r.covers > 2) return false;
				if (coversFilter === "3-4" && (r.covers < 3 || r.covers > 4)) return false;
				if (coversFilter === "5+" && r.covers < 5) return false;
			}

			return true;
		});

		result = [...result].sort((a, b) => {
			let cmp = 0;
			if (sortKey === "date") {
				cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
				if (cmp === 0) cmp = a.timeSlot.localeCompare(b.timeSlot);
			} else if (sortKey === "name") {
				cmp = `${a.guestLastName}${a.guestFirstName}`.localeCompare(
					`${b.guestLastName}${b.guestFirstName}`
				);
			} else if (sortKey === "covers") {
				cmp = a.covers - b.covers;
			} else if (sortKey === "status") {
				cmp = a.status.localeCompare(b.status);
			}
			return sortDir === "asc" ? cmp : -cmp;
		});

		return result;
	}, [reservations, search, activeStatus, dateFilter, coversFilter, sortKey, sortDir, today]);

	useEffect(() => {
		setPage(1);
	}, [search, activeStatus, dateFilter, coversFilter, sortKey, sortDir]);

	const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
	const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

	const handleSortClick = useCallback(
		(key: SortKey) => {
			if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
			else {
				setSortKey(key);
				setSortDir("desc");
			}
		},
		[sortKey]
	);

	const handleStatusPill = useCallback(
		(s: ReservationStatus | null) => {
			setActiveStatus((prev) => (prev === s ? null : s));
		},
		[]
	);

	const openCancel = useCallback((r: Reservation) => {
		setCancelTarget(r);
		setCancelReason("");
		setSelectedId(null);
	}, []);

	const closeCancel = useCallback(() => {
		setCancelTarget(null);
		setCancelReason("");
	}, []);

	const handleCancel = async () => {
		if (!cancelTarget) return;
		setCancelling(true);
		try {
			const res = await fetch(`/api/reservations/${cancelTarget.id}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					status: "CANCELLED_BY_ADMIN",
					cancellationReason: cancelReason || undefined,
				}),
			});
			if (!res.ok) throw new Error();
			toast.success("Réservation annulée");
			closeCancel();
			router.refresh();
		} catch {
			toast.error("Erreur lors de l'annulation");
		} finally {
			setCancelling(false);
		}
	};

	const resetFilters = useCallback(() => {
		setSearch("");
		setActiveStatus(null);
		setDateFilter("");
		setCoversFilter("");
	}, []);

	const handleExport = useCallback(() => {
		const headers = [
			"Prénom", "Nom", "Email", "Téléphone",
			"Date", "Heure", "Couverts",
			"Statut", "Paiement", "Table",
		];
		const rows = filtered.map((r) => [
			r.guestFirstName,
			r.guestLastName,
			r.guestEmail,
			r.guestPhone,
			formatDate(r.date, "dd/MM/yyyy"),
			r.timeSlot,
			String(r.covers),
			RESERVATION_STATUSES[r.status].label,
			r.payment ? PAYMENT_STATUSES[r.payment.status].label : "—",
			r.table ? `T${r.table.numero}` : "—",
		]);
		const csv = [headers, ...rows]
			.map((row) => row.map((v) => `"${v}"`).join(";"))
			.join("\n");
		const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `reservations-${formatDate(new Date(), "yyyy-MM-dd")}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	}, [filtered]);

	const hasActiveFilters = !!(search || activeStatus || dateFilter || coversFilter);
	const selectedReservation = reservations.find((r) => r.id === selectedId) ?? null;

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

			<div className="flex items-start justify-between mb-6 gap-4">
				<h1 className="font-display text-3xl text-[#F5F0EB] leading-tight">Réservations</h1>
				<div className="flex items-center gap-2 shrink-0">
					<button
						onClick={handleExport}
						title="Exporter en CSV"
						className="hidden sm:flex items-center gap-2 h-9 px-3 rounded-lg border border-[#222] text-sm text-[#9A8F84] hover:text-[#F5F0EB] hover:bg-[#1a1a1a] transition-colors"
					>
						<Download size={14} />
						<span className="hidden md:inline">Exporter</span>
					</button>
					<Link
						href="/admin/reservations/calendar"
						className="hidden sm:flex items-center gap-2 h-9 px-3 rounded-lg border border-[#222] text-sm text-[#9A8F84] hover:text-[#F5F0EB] hover:bg-[#1a1a1a] transition-colors"
					>
						<CalendarDays size={14} />
						<span className="hidden md:inline">Calendrier</span>
					</Link>
					<Link
						href="/admin/reservations/new"
						className="flex items-center gap-2 h-9 px-4 bg-[#C8973A] hover:bg-[#E8B04A] text-[#0A0A0A] text-sm font-semibold rounded-lg transition-colors"
					>
						<Plus size={15} />
						Ajouter
					</Link>
				</div>
			</div>

			<div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
				<StatCard
					label="Total réservations"
					value={stats.total}
					icon={Users}
					iconColor="bg-[#222] text-[#9A8F84]"
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
					label="Confirmées"
					value={stats.confirmed}
					icon={CheckCircle2}
					iconColor="bg-green-500/10 text-green-400"
					active={activeStatus === "CONFIRMED"}
					onClick={() => handleStatusPill("CONFIRMED")}
				/>
				<StatCard
					label="Aujourd'hui"
					value={stats.todayCount}
					icon={Clock}
					iconColor="bg-[#C8973A]/10 text-[#C8973A]"
					active={dateFilter === "today"}
					onClick={() => setDateFilter((v) => (v === "today" ? "" : "today"))}
				/>
			</div>

			<div className="bg-[#141414] border border-[#222] rounded-xl p-4 mb-4 space-y-3">
				<div className="flex flex-col sm:flex-row gap-3">
					<div className="relative flex-1">
						<Search
							size={15}
							className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5A5249] pointer-events-none"
						/>
						<input
							type="text"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder="Rechercher client, email, téléphone…"
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

					<div className="relative">
						<select
							value={dateFilter}
							onChange={(e) => setDateFilter(e.target.value)}
							className="h-9 pl-3 pr-8 rounded-lg bg-[#0A0A0A] border border-[#222] text-sm text-[#F5F0EB] focus:border-[#C8973A] focus:outline-none appearance-none cursor-pointer w-full sm:w-auto"
						>
							<option value="">Toutes les dates</option>
							<option value="today">Aujourd'hui</option>
							<option value="tomorrow">Demain</option>
							<option value="week">7 prochains jours</option>
							<option value="past">Passées</option>
						</select>
						<ChevronDown
							size={13}
							className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#5A5249] pointer-events-none"
						/>
					</div>

					<div className="relative">
						<select
							value={coversFilter}
							onChange={(e) => setCoversFilter(e.target.value)}
							className="h-9 pl-3 pr-8 rounded-lg bg-[#0A0A0A] border border-[#222] text-sm text-[#F5F0EB] focus:border-[#C8973A] focus:outline-none appearance-none cursor-pointer w-full sm:w-auto"
						>
							<option value="">Tous les couverts</option>
							<option value="1-2">1 – 2 personnes</option>
							<option value="3-4">3 – 4 personnes</option>
							<option value="5+">5 personnes et +</option>
						</select>
						<ChevronDown
							size={13}
							className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#5A5249] pointer-events-none"
						/>
					</div>
				</div>

				<div className="flex items-center gap-2 flex-wrap">
					<StatusPill
						label="Toutes"
						count={reservations.length}
						active={activeStatus === null}
						onClick={() => handleStatusPill(null)}
					/>
					{(
						[
							["PENDING",               "En attente",    "yellow"],
							["CONFIRMED",             "Confirmées",    "green" ],
							["COMPLETED",             "Terminées",     "gray"  ],
							["NO_SHOW",               "Absents",       "orange"],
							["CANCELLED_BY_CUSTOMER", "Annulées",      "red"   ],
							["CANCELLED_BY_ADMIN",    "Annulées adm.", "red"   ],
						] as const
					).map(([key, label, color]) =>
						(statusCounts[key] ?? 0) > 0 ? (
							<StatusPill
								key={key}
								label={label}
								count={statusCounts[key] ?? 0}
								color={color}
								active={activeStatus === key}
								onClick={() => handleStatusPill(key as ReservationStatus)}
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

			<div className="hidden lg:block bg-[#141414] border border-[#222] rounded-xl overflow-hidden">
				<div className="grid grid-cols-[2fr_1.3fr_0.55fr_0.65fr_1fr_0.9fr_88px] items-center px-5 py-3 border-b border-[#1a1a1a]">
					<SortBtn label="Client"     sortKey="name"    current={sortKey} dir={sortDir} onClick={handleSortClick} />
					<SortBtn label="Date & heure" sortKey="date"  current={sortKey} dir={sortDir} onClick={handleSortClick} />
					<SortBtn label="Couverts"   sortKey="covers"  current={sortKey} dir={sortDir} onClick={handleSortClick} />
					<span className="text-xs font-semibold uppercase tracking-wider text-[#5A5249]">Table</span>
					<SortBtn label="Statut"     sortKey="status"  current={sortKey} dir={sortDir} onClick={handleSortClick} />
					<span className="text-xs font-semibold uppercase tracking-wider text-[#5A5249]">Paiement</span>
					<span className="text-xs font-semibold uppercase tracking-wider text-[#5A5249] text-right">Actions</span>
				</div>

				{paginated.length === 0 ? (
					<EmptyState onReset={hasActiveFilters ? resetFilters : undefined} />
				) : (
					<div className="divide-y divide-[#1a1a1a]">
						{paginated.map((r) => {
							const st  = RESERVATION_STATUSES[r.status];
							const pst = r.payment
								? PAYMENT_STATUSES[r.payment.status]
								: PAYMENT_STATUSES.NONE;
							const dl      = dateLabel(new Date(r.date));
							const isToday = dl.text === "Aujourd'hui";

							return (
								<div
									key={r.id}
									onClick={() => setSelectedId(r.id)}
									role="button"
									tabIndex={0}
									onKeyDown={(e) => e.key === "Enter" && setSelectedId(r.id)}
									className={cn(
										"group grid grid-cols-[2fr_1.3fr_0.55fr_0.65fr_1fr_0.9fr_88px] items-center px-5 py-4 cursor-pointer transition-colors",
										selectedId === r.id
											? "bg-[#C8973A]/5"
											: "hover:bg-[#1a1a1a]"
									)}
								>
									<div className="flex items-center gap-3 min-w-0">
										<div className="w-8 h-8 rounded-full bg-[#C8973A]/10 border border-[#C8973A]/20 flex items-center justify-center text-xs font-semibold text-[#C8973A] shrink-0">
											{getInitials(r.guestFirstName, r.guestLastName)}
										</div>
										<div className="min-w-0">
											<p className="text-sm font-medium text-[#F5F0EB] truncate">
												<Highlight
													text={`${r.guestFirstName} ${r.guestLastName}`}
													query={search}
												/>
											</p>
											<p className="text-xs text-[#5A5249] truncate">
												<Highlight text={r.guestEmail} query={search} />
											</p>
										</div>
									</div>

									<div>
										<span
											className={cn(
												"text-sm font-medium",
												isToday ? "text-[#C8973A]" : "text-[#9A8F84]"
											)}
										>
											{dl.text}
										</span>
										{isToday && (
											<span className="text-xs text-[#5A5249] ml-2">
												{formatDate(r.date, "dd/MM")}
											</span>
										)}
										<span className="text-xs text-[#5A5249] block">{r.timeSlot}</span>
									</div>

									<span className="text-sm text-[#9A8F84] tabular-nums">{r.covers}</span>

									<div>
										{r.table ? (
											<>
												<span className="text-sm text-[#F5F0EB] font-medium">
													{tableLabel(r.table)}
												</span>
												<span className="text-xs text-[#5A5249] block">
													{tableSubLabel(r.table)}
												</span>
											</>
										) : (
											<span className="text-sm text-[#333]">—</span>
										)}
									</div>

									<Badge variant={BADGE_VARIANT[st.color]}>{st.label}</Badge>

									<Badge variant={BADGE_VARIANT[pst.color]}>{pst.label}</Badge>

									<div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
										<Link
											href={`/admin/reservations/${r.id}`}
											onClick={(e) => e.stopPropagation()}
											title="Ouvrir la fiche"
											className="p-1.5 rounded-lg text-[#5A5249] hover:text-[#9A8F84] hover:bg-[#252525] transition-all"
										>
											<Eye size={14} />
										</Link>
										{CANCELLABLE_STATUSES.includes(r.status) && (
											<button
												onClick={(e) => {
													e.stopPropagation();
													openCancel(r);
												}}
												title="Annuler la réservation"
												className="p-1.5 rounded-lg text-[#5A5249] hover:text-red-400 hover:bg-red-950/30 transition-all"
											>
												<XCircle size={14} />
											</button>
										)}
									</div>
								</div>
							);
						})}
					</div>
				)}
			</div>

			<div className="lg:hidden space-y-3">
				{paginated.length === 0 ? (
					<EmptyState onReset={hasActiveFilters ? resetFilters : undefined} />
				) : (
					paginated.map((r) => {
						const st  = RESERVATION_STATUSES[r.status];
						const pst = r.payment
							? PAYMENT_STATUSES[r.payment.status]
							: PAYMENT_STATUSES.NONE;
						const dl = dateLabel(new Date(r.date));

						return (
							<div
								key={r.id}
								onClick={() => setSelectedId(r.id)}
								role="button"
								tabIndex={0}
								onKeyDown={(e) => e.key === "Enter" && setSelectedId(r.id)}
								className={cn(
									"bg-[#141414] border rounded-xl p-4 cursor-pointer transition-colors",
									selectedId === r.id
										? "border-[#C8973A]/30 bg-[#C8973A]/5"
										: "border-[#222] hover:border-[#333] hover:bg-[#1a1a1a]"
								)}
							>
								<div className="flex items-start justify-between gap-3 mb-3">
									<div className="flex items-center gap-3 min-w-0">
										<div className="w-9 h-9 rounded-full bg-[#C8973A]/10 border border-[#C8973A]/20 flex items-center justify-center text-xs font-semibold text-[#C8973A] shrink-0">
											{getInitials(r.guestFirstName, r.guestLastName)}
										</div>
										<div className="min-w-0">
											<p className="text-sm font-semibold text-[#F5F0EB] truncate">
												<Highlight
													text={`${r.guestFirstName} ${r.guestLastName}`}
													query={search}
												/>
											</p>
											<p className="text-xs text-[#5A5249] truncate">
												<Highlight text={r.guestEmail} query={search} />
											</p>
										</div>
									</div>
									<Badge variant={BADGE_VARIANT[st.color]} className="shrink-0">
										{st.label}
									</Badge>
								</div>

								<div className="grid grid-cols-3 gap-2 mb-3">
									<MobileInfoCell
										label="Date"
										value={dl.text}
										accent={dl.accent}
									/>
									<MobileInfoCell label="Heure"    value={r.timeSlot} />
									<MobileInfoCell label="Couverts" value={`${r.covers} pers.`} />
								</div>

								<div className="flex items-center justify-between pt-3 border-t border-[#1a1a1a]">
									<div className="flex items-center gap-2 min-w-0">
										<Badge variant={BADGE_VARIANT[pst.color]} className="text-[10px]">
											{pst.label}
										</Badge>
										{r.table ? (
											<span className="text-xs text-[#9A8F84] truncate">
												{tableLabel(r.table)} · {ZONE_LABELS[r.table.zone]?.short ?? r.table.zone}
											</span>
										) : (
											<span className="text-xs text-[#333] italic">Table non assignée</span>
										)}
									</div>
									<div className="flex items-center gap-1 shrink-0">
										<Link
											href={`/admin/reservations/${r.id}`}
											onClick={(e) => e.stopPropagation()}
											className="p-1.5 rounded-lg text-[#5A5249] hover:text-[#9A8F84] hover:bg-[#252525] transition-all"
											title="Ouvrir"
										>
											<Eye size={14} />
										</Link>
										{CANCELLABLE_STATUSES.includes(r.status) && (
											<button
												onClick={(e) => {
													e.stopPropagation();
													openCancel(r);
												}}
												title="Annuler"
												className="p-1.5 rounded-lg text-[#5A5249] hover:text-red-400 hover:bg-red-950/30 transition-all"
											>
												<XCircle size={14} />
											</button>
										)}
									</div>
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
						{filtered.length} réservation{filtered.length > 1 ? "s" : ""}
					</p>

					{totalPages > 1 && (
						<div className="flex items-center gap-1 order-1 sm:order-2">
							<PgBtn
								onClick={() => setPage((p) => Math.max(1, p - 1))}
								disabled={page === 1}
							>
								<ChevronLeft size={14} />
							</PgBtn>

							{buildPageList(page, totalPages).map((p, i) =>
								p === "…" ? (
									<span
										key={`ellipsis-${i}`}
										className="px-1 text-xs text-[#5A5249]"
									>
										…
									</span>
								) : (
									<PgBtn
										key={p}
										active={p === page}
										onClick={() => setPage(p as number)}
									>
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
					)}
				</div>
			)}

			<DetailPanel
				reservation={selectedReservation}
				onClose={() => setSelectedId(null)}
				onCancel={openCancel}
			/>

			<Modal
				open={!!cancelTarget}
				onClose={closeCancel}
				title="Annuler la réservation"
			>
				{cancelTarget && (
					<>
						<p className="text-sm text-[#9A8F84] mb-4">
							Vous allez annuler la réservation de{" "}
							<span className="text-[#F5F0EB] font-medium">
								{cancelTarget.guestFirstName} {cancelTarget.guestLastName}
							</span>{" "}
							prévue le{" "}
							<span className="text-[#F5F0EB]">
								{formatDate(cancelTarget.date, "dd/MM/yyyy")} à {cancelTarget.timeSlot}
							</span>
							.
						</p>

						<Textarea
							label="Motif d'annulation (optionnel)"
							value={cancelReason}
							onChange={(e) => setCancelReason(e.target.value)}
							placeholder="Ex : Fermeture exceptionnelle…"
						/>

						<div className="flex gap-3 mt-4">
							<Button
								variant="secondary"
								onClick={closeCancel}
								className="flex-1"
								disabled={cancelling}
							>
								Retour
							</Button>
							<Button
								variant="destructive"
								onClick={handleCancel}
								className="flex-1"
								loading={cancelling}
							>
								{cancelling ? (
									<span className="flex items-center gap-2">
										<Loader2 size={14} className="animate-spin" />
										Annulation…
									</span>
								) : (
									"Confirmer l'annulation"
								)}
							</Button>
						</div>
					</>
				)}
			</Modal>
		</div>
	);
}
