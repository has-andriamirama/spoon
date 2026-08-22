"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
	ChevronLeft,
	ChevronRight,
	Plus,
	List,
	CalendarDays,
	CheckCircle2,
	Clock,
	AlertTriangle,
	TableProperties,
	Loader2,
	Users,
	X,
} from "lucide-react";
import toast from "react-hot-toast";
import { cn, formatDate, formatPrice, getInitials } from "@/lib/utils";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { RESERVATION_STATUSES, PAYMENT_STATUSES, ZONE_LABELS } from "@/lib/constants";
import type { ReservationStatus, ZoneTable, PaymentStatus } from "@/types";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface TableInfo {
	id: string;
	numero: number;
	zone: ZoneTable;
	capaciteMin: number;
	capaciteMax: number;
	isActif: boolean;
}

interface PaymentInfo {
	id: string;
	status: PaymentStatus;
	amount: number;
	type: string;
}

interface AssignedTable {
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
	table: AssignedTable | null;
	payment: PaymentInfo | null;
}

interface Props {
	reservations: Reservation[];
	tables: TableInfo[];
}

// ─── Constants ──────────────────────────────────────────────────────────────────

const FR_DAYS_SHORT = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const FR_DAYS_FULL  = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const FR_MONTHS     = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];
const HOURS = [11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];
const HOUR_HEIGHT = 56; // px per hour slot

const BADGE_MAP: Record<string, "yellow" | "green" | "red" | "gray" | "orange" | "blue"> = {
	yellow: "yellow", green: "green", red: "red",
	gray: "gray", orange: "orange", blue: "blue",
};

// ─── Helpers ────────────────────────────────────────────────────────────────────

function sameDay(a: Date, b: Date) {
	return (
		a.getFullYear() === b.getFullYear() &&
		a.getMonth() === b.getMonth() &&
		a.getDate() === b.getDate()
	);
}

function addDays(d: Date, n: number): Date {
	const r = new Date(d);
	r.setDate(r.getDate() + n);
	return r;
}

function getMonday(d: Date): Date {
	const r = new Date(d);
	r.setHours(0, 0, 0, 0);
	const day = r.getDay();
	const diff = day === 0 ? -6 : 1 - day;
	r.setDate(r.getDate() + diff);
	return r;
}

function timeToMinutes(slot: string): number {
	const [h, m] = slot.split(":").map(Number);
	return h * 60 + (m || 0);
}

function timeToY(slot: string): number {
	const mins = timeToMinutes(slot);
	const startMins = HOURS[0] * 60;
	return ((mins - startMins) / 60) * HOUR_HEIGHT;
}

function weekRangeLabel(monday: Date): string {
	const sunday = addDays(monday, 6);
	if (monday.getMonth() === sunday.getMonth()) {
		return `${monday.getDate()} – ${sunday.getDate()} ${FR_MONTHS[sunday.getMonth()]} ${sunday.getFullYear()}`;
	}
	return `${monday.getDate()} ${FR_MONTHS[monday.getMonth()]} – ${sunday.getDate()} ${FR_MONTHS[sunday.getMonth()]} ${sunday.getFullYear()}`;
}

// ─── Sub-component: Confirm / assign modal ─────────────────────────────────────

function ConfirmModal({
	reservation,
	tables,
	onClose,
	onConfirmed,
}: {
	reservation: Reservation | null;
	tables: TableInfo[];
	onClose: () => void;
	onConfirmed: () => void;
}) {
	const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
	const [adminNotes, setAdminNotes] = useState("");
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (reservation) {
			setSelectedTableId(null);
			setAdminNotes("");
		}
	}, [reservation?.id]);

	const isPaymentBlocking =
		reservation?.payment?.status === "PENDING" ||
		reservation?.payment?.status === "FAILED";

	const compatibleTables = useMemo(
		() =>
			reservation
				? tables.filter(
						(t) => t.isActif && t.capaciteMax >= reservation.covers
				  )
				: [],
		[tables, reservation]
	);

	const handleConfirm = async () => {
		if (!reservation || !selectedTableId) return;
		setLoading(true);
		try {
			const res = await fetch(`/api/admin/reservations/${reservation.id}/confirmer`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ tableId: selectedTableId, adminNotes: adminNotes || undefined }),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error ?? "Erreur");
			toast.success("Réservation confirmée — email envoyé");
			onConfirmed();
			onClose();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Erreur lors de la confirmation");
		} finally {
			setLoading(false);
		}
	};

	return (
		<Modal
			open={!!reservation}
			onClose={onClose}
			title="Confirmer la réservation"
			description="Assignez une table puis confirmez pour envoyer l'email au client."
			className="max-w-xl"
		>
			{reservation && (
				<div className="space-y-5">
					{/* Reservation summary */}
					<div className="bg-[#0A0A0A] rounded-xl border border-[#1e1e1e] p-4">
						<div className="flex items-start justify-between gap-3 mb-2">
							<div>
								<p className="text-sm font-semibold text-[#F5F0EB]">
									{reservation.guestFirstName} {reservation.guestLastName}
								</p>
								<p className="text-xs text-[#5A5249] mt-0.5">
									{reservation.guestEmail} · {reservation.guestPhone}
								</p>
							</div>
							<div className="flex items-center gap-2 shrink-0">
								<span className="flex items-center gap-1 text-xs text-[#9A8F84] bg-[#1a1a1a] border border-[#222] px-2 py-1 rounded-lg">
									<Users size={11} /> {reservation.covers} cv
								</span>
								<span className="flex items-center gap-1 text-xs text-[#9A8F84] bg-[#1a1a1a] border border-[#222] px-2 py-1 rounded-lg">
									<Clock size={11} /> {reservation.timeSlot}
								</span>
							</div>
						</div>
						{reservation.occasion && (
							<span className="inline-block text-[11px] text-[#C8973A] border border-[#C8973A]/30 bg-[#C8973A]/5 px-2 py-0.5 rounded-md mb-2">
								{reservation.occasion}
							</span>
						)}
						{(reservation.notes || reservation.allergies) && (
							<div className="flex items-start gap-2 text-xs text-yellow-600/80 bg-yellow-950/20 border border-yellow-900/30 rounded-lg p-2.5">
								<AlertTriangle size={11} className="mt-0.5 shrink-0 text-yellow-500" />
								<span>{reservation.notes || reservation.allergies}</span>
							</div>
						)}
					</div>

					{/* Payment blocking warning */}
					{isPaymentBlocking && (
						<div className="flex items-start gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
							<Clock size={14} className="text-yellow-400 shrink-0 mt-0.5" />
							<p className="text-xs text-yellow-400 leading-relaxed">
								Le paiement est{" "}
								<strong>
									{reservation.payment?.status === "PENDING" ? "en attente de confirmation" : "en échec"}
								</strong>
								. La confirmation est désactivée tant que le paiement n'est pas résolu.
							</p>
						</div>
					)}

					{/* Table picker */}
					{!isPaymentBlocking && (
						<div>
							<p className="text-xs font-medium text-[#5A5249] mb-2">
								Choisir une table (minimum {reservation.covers} couverts)
							</p>
							{compatibleTables.length === 0 ? (
								<div className="text-center py-4 border border-dashed border-red-900/30 rounded-xl">
									<p className="text-sm text-red-400">Aucune table disponible</p>
								</div>
							) : (
								<div className="flex flex-wrap gap-2">
									{compatibleTables.map((t) => (
										<button
											key={t.id}
											onClick={() => setSelectedTableId(t.id)}
											className={cn(
												"flex flex-col items-center gap-1 w-20 h-[68px] rounded-xl border transition-all text-center px-1",
												selectedTableId === t.id
													? "bg-[#C8973A]/10 border-[#C8973A]/60 ring-1 ring-[#C8973A]/30"
													: "bg-green-950/30 border-green-900/50 hover:border-green-600"
											)}
										>
											<TableProperties
												size={13}
												className={cn(
													"mt-2",
													selectedTableId === t.id ? "text-[#C8973A]" : "text-green-500"
												)}
											/>
											<span
												className={cn(
													"text-xs font-semibold",
													selectedTableId === t.id ? "text-[#C8973A]" : "text-green-400"
												)}
											>
												T{t.numero}
											</span>
											<span className="text-[9px] text-[#5A5249] leading-tight">
												{t.capaciteMax}cv · {ZONE_LABELS[t.zone]?.short ?? t.zone}
											</span>
										</button>
									))}
								</div>
							)}
						</div>
					)}

					{/* Admin notes */}
					{!isPaymentBlocking && (
						<div>
							<label className="text-xs text-[#5A5249] block mb-1.5">
								Notes internes (facultatif)
							</label>
							<textarea
								value={adminNotes}
								onChange={(e) => setAdminNotes(e.target.value)}
								placeholder="Préférences de placement, notes de service..."
								rows={2}
								className="w-full bg-[#0A0A0A] border border-[#222] rounded-xl px-3 py-2.5 text-sm text-[#F5F0EB] placeholder:text-[#2a2a2a] focus:border-[#C8973A] focus:outline-none resize-none transition-colors"
							/>
						</div>
					)}

					{/* Actions */}
					<div className="flex items-center justify-end gap-3 pt-1 border-t border-[#1e1e1e]">
						<button
							onClick={onClose}
							className="px-4 py-2 text-sm text-[#5A5249] hover:text-[#9A8F84] transition-colors"
						>
							Annuler
						</button>
						{!isPaymentBlocking && (
							<button
								onClick={handleConfirm}
								disabled={!selectedTableId || loading}
								className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#C8973A] hover:bg-[#D4A445] text-[#0A0A0A] text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
							>
								{loading ? (
									<Loader2 size={15} className="animate-spin" />
								) : (
									<CheckCircle2 size={15} />
								)}
								{loading ? "Confirmation…" : "Confirmer & envoyer l'email"}
							</button>
						)}
					</div>
				</div>
			)}
		</Modal>
	);
}

// ─── Sub-component: Reservation block (week view) ──────────────────────────────

function ResBlock({
	r,
	onOpen,
}: {
	r: Reservation;
	onOpen: (r: Reservation) => void;
}) {
	const top    = timeToY(r.timeSlot);
	const height = Math.max(40, HOUR_HEIGHT * 1.5);
	const isPending = r.status === "PENDING";

	return (
		<div
			onClick={() => onOpen(r)}
			role="button"
			tabIndex={0}
			onKeyDown={(e) => e.key === "Enter" && onOpen(r)}
			style={{ top, height, left: 3, right: 3, position: "absolute" }}
			className={cn(
				"rounded-md px-2 py-1 cursor-pointer z-10 overflow-hidden border-l-2 transition-all",
				"hover:brightness-110 hover:scale-[1.015] hover:z-20",
				isPending
					? "bg-yellow-500/10 border-yellow-400"
					: "bg-green-500/10 border-green-400"
			)}
		>
			<p className={cn("text-[10px] font-semibold leading-none", isPending ? "text-yellow-400" : "text-green-400")}>
				{r.timeSlot}
			</p>
			<p className="text-[11px] font-medium text-[#F5F0EB] leading-tight mt-0.5 truncate">
				{r.guestLastName}
			</p>
			<p className="text-[10px] text-[#5A5249] mt-0.5">{r.covers} pers.</p>
		</div>
	);
}

// ─── Sub-component: Day card (day view) ────────────────────────────────────────

function DayResCard({
	r,
	onOpen,
	onConfirm,
}: {
	r: Reservation;
	onOpen: (r: Reservation) => void;
	onConfirm: (r: Reservation) => void;
}) {
	const st  = RESERVATION_STATUSES[r.status];
	const pst = r.payment ? PAYMENT_STATUSES[r.payment.status] : null;

	return (
		<div
			className="group flex items-center gap-4 px-4 py-3.5 border-b border-[#1a1a1a] last:border-none hover:bg-[#1a1a1a] transition-colors cursor-pointer"
			onClick={() => onOpen(r)}
		>
			{/* Time */}
			<div className="w-12 text-center shrink-0">
				<p className="text-sm font-medium text-[#F5F0EB]">{r.timeSlot}</p>
				<p className="text-[10px] text-[#5A5249]">
					{Number(r.timeSlot.split(":")[0]) < 17 ? "Midi" : "Soir"}
				</p>
			</div>

			<div className="w-px h-8 bg-[#222] shrink-0" />

			{/* Avatar + info */}
			<div className="flex items-center gap-3 flex-1 min-w-0">
				<div className="w-8 h-8 rounded-full bg-[#C8973A]/10 border border-[#C8973A]/20 flex items-center justify-center text-xs font-semibold text-[#C8973A] shrink-0">
					{getInitials(r.guestFirstName, r.guestLastName)}
				</div>
				<div className="min-w-0">
					<p className="text-sm font-medium text-[#F5F0EB] truncate">
						{r.guestFirstName} {r.guestLastName}
					</p>
					<p className="text-xs text-[#5A5249] truncate">{r.guestEmail}</p>
				</div>
			</div>

			{/* Meta chips */}
			<div className="hidden sm:flex items-center gap-2 shrink-0">
				<span className="flex items-center gap-1 text-xs text-[#9A8F84] bg-[#1a1a1a] border border-[#222] px-2 py-0.5 rounded-lg">
					<Users size={10} /> {r.covers}
				</span>
				{r.table && (
					<span className="text-xs text-[#9A8F84] bg-[#1a1a1a] border border-[#222] px-2 py-0.5 rounded-lg">
						T{r.table.numero}
					</span>
				)}
				{r.occasion && (
					<span className="text-[10px] text-[#C8973A] border border-[#C8973A]/30 bg-[#C8973A]/5 px-2 py-0.5 rounded-md">
						{r.occasion}
					</span>
				)}
			</div>

			{/* Status + actions */}
			<div className="flex items-center gap-2 shrink-0">
				<Badge variant={BADGE_MAP[st.color]} className="hidden sm:inline-flex text-[10px]">
					{st.label}
				</Badge>
				{pst && (
					<Badge variant={BADGE_MAP[pst.color]} className="hidden md:inline-flex text-[10px]">
						{pst.label}
					</Badge>
				)}

				{r.status === "PENDING" && (
					<button
						onClick={(e) => { e.stopPropagation(); onConfirm(r); }}
						className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-[11px] font-medium px-3 py-1.5 rounded-lg bg-[#C8973A] hover:bg-[#D4A445] text-[#0A0A0A] transition-all"
					>
						<CheckCircle2 size={12} />
						Confirmer
					</button>
				)}

				<Link
					href={`/admin/reservations/${r.id}`}
					onClick={(e) => e.stopPropagation()}
					className="opacity-0 group-hover:opacity-100 text-[11px] text-[#5A5249] hover:text-[#9A8F84] px-2 py-1.5 rounded-lg hover:bg-[#252525] transition-all"
				>
					Fiche →
				</Link>
			</div>
		</div>
	);
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function CalendarClient({ reservations, tables }: Props) {
	const router = useRouter();
	const today  = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);

	const [weekStart,    setWeekStart]    = useState<Date>(() => getMonday(today));
	const [view,         setView]         = useState<"week" | "day">("week");
	const [selectedDay,  setSelectedDay]  = useState<Date>(() => today);
	const [confirmResa,  setConfirmResa]  = useState<Reservation | null>(null);

	// Navigate weeks
	const navigate = useCallback((dir: -1 | 1) => {
		setWeekStart((w) => addDays(w, dir * 7));
	}, []);

	const goToday = useCallback(() => {
		setWeekStart(getMonday(today));
		setSelectedDay(today);
	}, [today]);

	// Week days array
	const weekDays = useMemo(
		() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
		[weekStart]
	);

	// Reservations indexed by day string
	const byDay = useMemo(() => {
		const map = new Map<string, Reservation[]>();
		reservations.forEach((r) => {
			const key = formatDate(r.date, "yyyy-MM-dd");
			if (!map.has(key)) map.set(key, []);
			map.get(key)!.push(r);
		});
		return map;
	}, [reservations]);

	const getDayRes = (d: Date) =>
		byDay.get(formatDate(d, "yyyy-MM-dd")) ?? [];

	// Stats for current week
	const weekStats = useMemo(() => {
		const all = weekDays.flatMap(getDayRes);
		return {
			total:    all.length,
			pending:  all.filter((r) => r.status === "PENDING").length,
			confirmed:all.filter((r) => r.status === "CONFIRMED").length,
			covers:   all.reduce((s, r) => s + r.covers, 0),
		};
	}, [weekDays, byDay]);

	// Now-line Y position
	const nowY = useMemo(() => {
		const now = new Date();
		const h = now.getHours(), m = now.getMinutes();
		if (h < HOURS[0] || h > HOURS[HOURS.length - 1] + 1) return null;
		return ((h - HOURS[0]) + m / 60) * HOUR_HEIGHT;
	}, []);

	const isThisWeek = weekDays.some((d) => sameDay(d, today));

	const handleConfirmed = useCallback(() => {
		router.refresh();
	}, [router]);

	const openDayView = useCallback((d: Date) => {
		setSelectedDay(d);
		setView("day");
	}, []);

	// ─── Render ─────────────────────────────────────────────────────────────────

	return (
		<div>
			{/* ── Header ── */}
			<div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
				<h1 className="font-display text-3xl text-[#F5F0EB] leading-tight">Calendrier</h1>
				<div className="flex items-center gap-2 flex-wrap">
					<Link
						href="/admin/reservations"
						className="hidden sm:flex items-center gap-2 h-9 px-3 rounded-lg border border-[#222] text-sm text-[#9A8F84] hover:text-[#F5F0EB] hover:bg-[#1a1a1a] transition-colors"
					>
						<List size={14} />
						<span className="hidden md:inline">Liste</span>
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

			{/* ── Toolbar: view toggle + week nav ── */}
			<div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
				<div className="flex items-center gap-3 flex-wrap">
					{/* View toggle */}
					<div className="flex border border-[#222] rounded-lg overflow-hidden">
						{(["week", "day"] as const).map((v) => (
							<button
								key={v}
								onClick={() => setView(v)}
								className={cn(
									"h-8 px-3 text-xs font-medium transition-colors",
									view === v
										? "bg-[#1a1a1a] text-[#F5F0EB]"
										: "text-[#5A5249] hover:text-[#9A8F84]"
								)}
							>
								{v === "week" ? (
									<span className="flex items-center gap-1.5"><CalendarDays size={12} />Semaine</span>
								) : (
									<span className="flex items-center gap-1.5"><List size={12} />Journée</span>
								)}
							</button>
						))}
					</div>

					{/* Week navigation */}
					<div className="flex items-center gap-2">
						<button
							onClick={() => navigate(-1)}
							className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#222] text-[#5A5249] hover:text-[#F5F0EB] hover:bg-[#1a1a1a] transition-colors"
							aria-label="Semaine précédente"
						>
							<ChevronLeft size={15} />
						</button>
						<span className="text-sm font-medium text-[#F5F0EB] min-w-[190px] text-center">
							{weekRangeLabel(weekStart)}
						</span>
						<button
							onClick={() => navigate(1)}
							className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#222] text-[#5A5249] hover:text-[#F5F0EB] hover:bg-[#1a1a1a] transition-colors"
							aria-label="Semaine suivante"
						>
							<ChevronRight size={15} />
						</button>
					</div>

					{!isThisWeek && (
						<button
							onClick={goToday}
							className="h-8 px-3 rounded-lg border border-[#222] text-xs text-[#9A8F84] hover:text-[#F5F0EB] hover:bg-[#1a1a1a] transition-colors"
						>
							Aujourd'hui
						</button>
					)}
				</div>
			</div>

			{/* ── Stats row ── */}
			<div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
				{[
					{ label: "Cette semaine",  val: weekStats.total,     color: "text-[#F5F0EB]" },
					{ label: "Confirmées",     val: weekStats.confirmed, color: "text-green-400"  },
					{ label: "En attente",     val: weekStats.pending,   color: "text-yellow-400" },
					{ label: "Couverts",       val: weekStats.covers,    color: "text-[#C8973A]"  },
				].map(({ label, val, color }) => (
					<div key={label} className="bg-[#141414] border border-[#222] rounded-xl p-4">
						<p className="text-[11px] text-[#5A5249] uppercase tracking-wider mb-1">{label}</p>
						<p className={cn("text-2xl font-medium leading-none tabular-nums", color)}>{val}</p>
					</div>
				))}
			</div>

			{/* ════════════════════════ WEEK VIEW ════════════════════════ */}
			{view === "week" && (
				<div className="bg-[#141414] border border-[#222] rounded-xl overflow-hidden">
					{/* Column headers */}
					<div className="grid grid-cols-[48px_repeat(7,minmax(0,1fr))] border-b border-[#222]">
						<div className="border-r border-[#222]" />
						{weekDays.map((d, i) => {
							const dr     = getDayRes(d);
							const isT    = sameDay(d, today);
							const nConf  = dr.filter((r) => r.status === "CONFIRMED").length;
							const nPend  = dr.filter((r) => r.status === "PENDING").length;
							return (
								<div
									key={i}
									onClick={() => openDayView(d)}
									className={cn(
										"py-3 px-1 text-center border-l border-[#1a1a1a] cursor-pointer hover:bg-[#1a1a1a] transition-colors",
										isT && "bg-[#C8973A]/5"
									)}
								>
									<p className={cn("text-[10px] font-semibold uppercase tracking-wider", isT ? "text-[#C8973A]" : "text-[#5A5249]")}>
										{FR_DAYS_SHORT[d.getDay()]}
									</p>
									{isT ? (
										<div className="w-7 h-7 rounded-full bg-[#C8973A] flex items-center justify-center mx-auto mt-1">
											<span className="text-sm font-medium text-[#0A0A0A]">{d.getDate()}</span>
										</div>
									) : (
										<p className="text-base font-medium text-[#F5F0EB] mt-1">{d.getDate()}</p>
									)}
									<div className="flex justify-center gap-1 mt-1.5 flex-wrap">
										{nConf > 0 && (
											<span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400">
												{nConf} conf.
											</span>
										)}
										{nPend > 0 && (
											<span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400">
												{nPend} att.
											</span>
										)}
									</div>
								</div>
							);
						})}
					</div>

					{/* Timeline body */}
					<div className="grid grid-cols-[48px_repeat(7,minmax(0,1fr))] overflow-y-auto" style={{ maxHeight: "60vh" }}>
						{/* Hour labels */}
						<div className="border-r border-[#1a1a1a]">
							{HOURS.map((h) => (
								<div
									key={h}
									style={{ height: HOUR_HEIGHT }}
									className="border-b border-[#1a1a1a] relative"
								>
									<span className="absolute -top-2.5 right-2 text-[10px] text-[#5A5249]">
										{h}h
									</span>
								</div>
							))}
						</div>

						{/* Day columns */}
						{weekDays.map((d, di) => {
							const dr = getDayRes(d);
							const totalH = HOURS.length * HOUR_HEIGHT;
							const isT = sameDay(d, today) && isThisWeek;
							return (
								<div
									key={di}
									className={cn(
										"border-l border-[#1a1a1a] relative",
										isT && "bg-[#C8973A]/[0.02]"
									)}
									style={{ height: totalH }}
								>
									{HOURS.map((h) => (
										<div
											key={h}
											style={{ height: HOUR_HEIGHT }}
											className="border-b border-[#1a1a1a] relative"
										>
											<div
												className="absolute top-1/2 left-0 right-0 border-t border-[#1a1a1a] opacity-40"
												style={{ borderStyle: "dashed" }}
											/>
										</div>
									))}
									{/* Now line */}
									{isT && nowY !== null && (
										<div
											className="absolute left-0 right-0 z-10 pointer-events-none"
											style={{ top: nowY }}
										>
											<div className="absolute left-0 right-0 h-px bg-[#C8973A]" />
											<div className="absolute -left-1 -top-1.5 w-3 h-3 rounded-full bg-[#C8973A]" />
										</div>
									)}
									{/* Reservations */}
									{dr.map((r) => (
										<ResBlock
											key={r.id}
											r={r}
											onOpen={(r) =>
												r.status === "PENDING"
													? setConfirmResa(r)
													: void (window.location.href = `/admin/reservations/${r.id}`)
											}
										/>
									))}
								</div>
							);
						})}
					</div>
				</div>
			)}

			{/* ════════════════════════ DAY VIEW ════════════════════════ */}
			{view === "day" && (
				<div className="bg-[#141414] border border-[#222] rounded-xl overflow-hidden">
					{/* Day picker header */}
					<div className="flex items-center justify-between px-5 py-4 border-b border-[#222] gap-4 flex-wrap">
						<div>
							<p className="text-base font-medium text-[#F5F0EB]">
								{FR_DAYS_FULL[selectedDay.getDay()]} {selectedDay.getDate()} {FR_MONTHS[selectedDay.getMonth()]} {selectedDay.getFullYear()}
							</p>
							<p className="text-xs text-[#5A5249] mt-0.5">
								{getDayRes(selectedDay).length} réservation{getDayRes(selectedDay).length > 1 ? "s" : ""} ·{" "}
								{getDayRes(selectedDay).reduce((s, r) => s + r.covers, 0)} couverts
							</p>
						</div>
						{/* Day selector pills */}
						<div className="flex gap-1.5 flex-wrap">
							{weekDays.map((d, i) => {
								const isT   = sameDay(d, today);
								const isSel = sameDay(d, selectedDay);
								const cnt   = getDayRes(d).length;
								return (
									<button
										key={i}
										onClick={() => setSelectedDay(d)}
										className={cn(
											"flex flex-col items-center w-10 h-12 rounded-xl border transition-all",
											isSel
												? "bg-[#C8973A]/10 border-[#C8973A]/40 text-[#C8973A]"
												: isT
												? "border-[#C8973A]/20 text-[#9A8F84] hover:border-[#333]"
												: "border-[#222] text-[#5A5249] hover:border-[#333] hover:text-[#9A8F84]"
										)}
									>
										<span className="text-[9px] font-semibold uppercase mt-1.5">
											{FR_DAYS_SHORT[d.getDay()]}
										</span>
										<span className={cn("text-sm font-medium", isSel ? "text-[#C8973A]" : isT ? "text-[#F5F0EB]" : "")}>
											{d.getDate()}
										</span>
										{cnt > 0 && (
											<span className="text-[8px] text-[#5A5249]">{cnt}</span>
										)}
									</button>
								);
							})}
						</div>
					</div>

					{/* Reservations list */}
					{getDayRes(selectedDay).length === 0 ? (
						<div className="flex flex-col items-center justify-center py-16 gap-3 text-[#5A5249]">
							<CalendarDays size={28} />
							<p className="text-sm">Aucune réservation ce jour</p>
						</div>
					) : (
						<>
							{/* Midi */}
							{getDayRes(selectedDay).some((r) => Number(r.timeSlot.split(":")[0]) < 17) && (
								<>
									<div className="flex items-center gap-3 px-5 py-2">
										<span className="text-[10px] font-semibold uppercase tracking-wider text-[#5A5249]">Service midi</span>
										<div className="flex-1 h-px bg-[#1a1a1a]" />
									</div>
									{getDayRes(selectedDay)
										.filter((r) => Number(r.timeSlot.split(":")[0]) < 17)
										.sort((a, b) => timeToMinutes(a.timeSlot) - timeToMinutes(b.timeSlot))
										.map((r) => (
											<DayResCard
												key={r.id}
												r={r}
												onOpen={(r) => {
													if (r.status === "PENDING") setConfirmResa(r);
													else window.location.href = `/admin/reservations/${r.id}`;
												}}
												onConfirm={setConfirmResa}
											/>
										))}
								</>
							)}

							{/* Soir */}
							{getDayRes(selectedDay).some((r) => Number(r.timeSlot.split(":")[0]) >= 17) && (
								<>
									<div className="flex items-center gap-3 px-5 py-2 mt-1">
										<span className="text-[10px] font-semibold uppercase tracking-wider text-[#5A5249]">Service soir</span>
										<div className="flex-1 h-px bg-[#1a1a1a]" />
									</div>
									{getDayRes(selectedDay)
										.filter((r) => Number(r.timeSlot.split(":")[0]) >= 17)
										.sort((a, b) => timeToMinutes(a.timeSlot) - timeToMinutes(b.timeSlot))
										.map((r) => (
											<DayResCard
												key={r.id}
												r={r}
												onOpen={(r) => {
													if (r.status === "PENDING") setConfirmResa(r);
													else window.location.href = `/admin/reservations/${r.id}`;
												}}
												onConfirm={setConfirmResa}
											/>
										))}
								</>
							)}
						</>
					)}
				</div>
			)}

			{/* ── Confirm / assign modal ── */}
			<ConfirmModal
				reservation={confirmResa}
				tables={tables}
				onClose={() => setConfirmResa(null)}
				onConfirmed={handleConfirmed}
			/>
		</div>
	);
}
