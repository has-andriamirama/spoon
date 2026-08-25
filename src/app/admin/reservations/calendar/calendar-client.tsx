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
	Sun,
	Moon,
} from "lucide-react";
import toast from "react-hot-toast";
import { cn, formatDate, formatPrice, getInitials } from "@/lib/utils";
import { Modal } from "@/components/ui/modal";
import { RESERVATION_STATUSES, PAYMENT_STATUSES, ZONE_LABELS } from "@/lib/constants";
import type { ReservationStatus, ZoneTable, PaymentStatus } from "@/types";

// ─── Types ──────────────────────────────────────────────────────────────────────

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

/** Couleurs inline par statut (pour les bordures & backgrounds dynamiques) */
const STATUS_STYLE: Record<string, { c: string; bg: string; bd: string; label: string }> = {
	CONFIRMED:             { c: "#22c55e", bg: "rgba(34,197,94,0.08)",   bd: "rgba(34,197,94,0.22)",  label: "Confirmée"  },
	PENDING:               { c: "#eab308", bg: "rgba(234,179,8,0.08)",  bd: "rgba(234,179,8,0.22)",  label: "En attente" },
	CANCELLED_BY_CUSTOMER: { c: "#ef4444", bg: "rgba(239,68,68,0.08)",  bd: "rgba(239,68,68,0.22)",  label: "Annulée"    },
	CANCELLED_BY_ADMIN:    { c: "#ef4444", bg: "rgba(239,68,68,0.08)",  bd: "rgba(239,68,68,0.22)",  label: "Annulée"    },
	COMPLETED:             { c: "#9A8F84", bg: "rgba(154,143,132,0.08)",bd: "rgba(154,143,132,0.22)",label: "Terminée"   },
	NO_SHOW:               { c: "#f97316", bg: "rgba(249,115,22,0.08)", bd: "rgba(249,115,22,0.22)", label: "Absent"     },
};

// Colonne CSS partagée entre headers et lignes horaires
const GRID_COLS = "56px repeat(7, minmax(0, 1fr))";

// ─── Helpers ────────────────────────────────────────────────────────────────────

function sameDay(a: Date, b: Date) {
	return (
		a.getFullYear() === b.getFullYear() &&
		a.getMonth()    === b.getMonth()    &&
		a.getDate()     === b.getDate()
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
	r.setDate(r.getDate() + (day === 0 ? -6 : 1 - day));
	return r;
}

function timeToMinutes(slot: string): number {
	const [h, m] = slot.split(":").map(Number);
	return h * 60 + (m || 0);
}

function isMidi(slot: string): boolean {
	return Number(slot.split(":")[0]) < 17;
}

function weekRangeLabel(monday: Date): string {
	const sunday = addDays(monday, 6);
	if (monday.getMonth() === sunday.getMonth()) {
		return `${monday.getDate()} – ${sunday.getDate()} ${FR_MONTHS[sunday.getMonth()]} ${sunday.getFullYear()}`;
	}
	return `${monday.getDate()} ${FR_MONTHS[monday.getMonth()]} – ${sunday.getDate()} ${FR_MONTHS[sunday.getMonth()]} ${sunday.getFullYear()}`;
}

// ─── Sub-component: Confirm / assign modal (inchangé) ──────────────────────────

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
				? tables.filter((t) => t.isActif && t.capaciteMax >= reservation.covers)
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
					{/* Résumé */}
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

					{/* Avertissement paiement bloquant */}
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

					{/* Sélecteur de table */}
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
												className={cn("mt-2", selectedTableId === t.id ? "text-[#C8973A]" : "text-green-500")}
											/>
											<span className={cn("text-xs font-semibold", selectedTableId === t.id ? "text-[#C8973A]" : "text-green-400")}>
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

					{/* Notes internes */}
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
						<button onClick={onClose} className="px-4 py-2 text-sm text-[#5A5249] hover:text-[#9A8F84] transition-colors">
							Annuler
						</button>
						{!isPaymentBlocking && (
							<button
								onClick={handleConfirm}
								disabled={!selectedTableId || loading}
								className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#C8973A] hover:bg-[#D4A445] text-[#0A0A0A] text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
							>
								{loading ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
								{loading ? "Confirmation…" : "Confirmer & envoyer l'email"}
							</button>
						)}
					</div>
				</div>
			)}
		</Modal>
	);
}

// ─── WeekChip : puce dans la vue semaine ────────────────────────────────────────

function WeekChip({
	r,
	onOpen,
}: {
	r: Reservation;
	onOpen: (r: Reservation) => void;
}) {
	const sc = STATUS_STYLE[r.status] ?? STATUS_STYLE.CONFIRMED;
	return (
		<button
			onClick={() => onOpen(r)}
			className="w-full text-left rounded-lg transition-[filter] hover:brightness-[1.15] block"
			style={{
				background:  sc.bg,
				border:      `1px solid ${sc.bd}`,
				borderLeft:  `3px solid ${sc.c}`,
				padding:     "5px 7px",
			}}
		>
			<div
				className="text-[9px] font-bold uppercase tracking-wider mb-1"
				style={{ color: sc.c }}
			>
				{r.timeSlot}
			</div>
			<p className="text-[11px] font-semibold text-[#F5F0EB] truncate">
				{r.guestLastName}
			</p>
			<div className="flex items-center gap-1 mt-0.5" style={{ color: "#5A5249", fontSize: 10 }}>
				<span>{r.covers}p</span>
				{r.table && (
					<>
						<span style={{ color: "#2a2a2a" }}>·</span>
						<span>T{r.table.numero}</span>
					</>
				)}
			</div>
		</button>
	);
}

// ─── DayCard : carte réservation dans la vue journée ───────────────────────────

function DayCard({
	r,
	onOpen,
	onConfirm,
}: {
	r: Reservation;
	onOpen: (r: Reservation) => void;
	onConfirm: (r: Reservation) => void;
}) {
	const sc  = STATUS_STYLE[r.status] ?? STATUS_STYLE.CONFIRMED;
	const ini = getInitials(r.guestFirstName, r.guestLastName);

	return (
		<button
			onClick={() => onOpen(r)}
			className="group w-full text-left rounded-xl transition-[background,border-color]"
			style={{
				background:  "#141414",
				border:      "1px solid #242424",
				borderLeft:  `4px solid ${sc.c}`,
				padding:     "15px 17px",
			}}
			onMouseEnter={(e) => {
				(e.currentTarget as HTMLElement).style.background = "#1c1c1c";
				(e.currentTarget as HTMLElement).style.borderColor = sc.c;
			}}
			onMouseLeave={(e) => {
				(e.currentTarget as HTMLElement).style.background = "#141414";
				(e.currentTarget as HTMLElement).style.borderColor = "#242424";
				(e.currentTarget as HTMLElement).style.borderLeftColor = sc.c;
			}}
		>
			<div className="flex items-start gap-3">
				{/* Avatar initiales */}
				<div className="w-9 h-9 rounded-full bg-[#C8973A]/10 border border-[#C8973A]/25 flex items-center justify-center text-xs font-bold text-[#C8973A] shrink-0">
					{ini}
				</div>

				{/* Infos principales */}
				<div className="flex-1 min-w-0">
					<div className="flex items-start justify-between gap-3 mb-1">
						<div className="min-w-0">
							<p className="text-sm font-semibold text-[#F5F0EB]">
								{r.guestFirstName} {r.guestLastName}
							</p>
							<p className="text-[11px] text-[#5A5249] mt-0.5">
								{r.covers} couvert{r.covers > 1 ? "s" : ""}
								{r.table
									? ` · Table ${r.table.numero} · ${ZONE_LABELS[r.table.zone]?.label ?? r.table.zone}`
									: " · Table à assigner"}
							</p>
						</div>
						{/* Badge statut */}
						<div
							className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded shrink-0 mt-0.5"
							style={{ background: sc.bg, border: `1px solid ${sc.bd}`, color: sc.c }}
						>
							{sc.label}
						</div>
					</div>

					{/* Chips occasion / allergie / note */}
					{(r.occasion || r.allergies || r.notes) && (
						<div className="flex flex-wrap gap-1.5 mt-2">
							{r.occasion && (
								<span className="inline-flex items-center gap-1 text-[10px] text-[#C8973A] bg-[#C8973A]/5 border border-[#C8973A]/20 px-1.5 py-0.5 rounded">
									🎉 {r.occasion}
								</span>
							)}
							{r.allergies && (
								<span className="inline-flex items-center gap-1 text-[10px] text-red-400 bg-red-500/5 border border-red-500/20 px-1.5 py-0.5 rounded">
									⚠ Allergie · {r.allergies}
								</span>
							)}
							{r.notes && (
								<span className="inline-flex items-center gap-1 text-[10px] text-[#9A8F84] bg-[#9A8F84]/5 border border-[#9A8F84]/15 px-1.5 py-0.5 rounded">
									✍ {r.notes}
								</span>
							)}
						</div>
					)}
				</div>

				{/* Actions au survol */}
				<div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
					{r.status === "PENDING" && (
						<button
							onClick={(e) => { e.stopPropagation(); onConfirm(r); }}
							className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-[#C8973A] hover:bg-[#D4A445] text-[#0A0A0A] transition-colors"
						>
							<CheckCircle2 size={11} />
							Confirmer
						</button>
					)}
					<Link
						href={`/admin/reservations?id=${r.id}`}
						onClick={(e) => e.stopPropagation()}
						className="text-[11px] text-[#5A5249] hover:text-[#9A8F84] px-2 py-1.5 rounded-lg hover:bg-[#252525] transition-all"
					>
						Fiche →
					</Link>
				</div>
			</div>
		</button>
	);
}

// ─── ServiceHeader : bande de séparation de service ────────────────────────────

function ServiceHeader({
	icon,
	label,
	count,
	covers,
}: {
	icon: React.ReactNode;
	label: string;
	count: number;
	covers: number;
}) {
	return (
		<div className="flex items-center gap-2.5 px-5 py-2.5 border-y border-[#1a1a1a] bg-[#C8973A]/[0.025]">
			{icon}
			<span className="text-[10px] font-bold uppercase tracking-[0.10em] text-[#C8973A]">
				{label}
			</span>
			<div className="flex-1 h-px bg-[#1a1a1a]" />
			<span className="text-[10px] text-[#5A5249]">
				{count} rés. · {covers} couverts
			</span>
		</div>
	);
}

// ─── WeekView ───────────────────────────────────────────────────────────────────

function WeekView({
	weekDays,
	getDayRes,
	today,
	onDayClick,
	onChipClick,
}: {
	weekDays: Date[];
	getDayRes: (d: Date) => Reservation[];
	today: Date;
	onDayClick: (d: Date) => void;
	onChipClick: (r: Reservation) => void;
}) {
	// Tous les créneaux uniques de la semaine
	const allRes  = weekDays.flatMap(getDayRes);
	const allSlots = [...new Set(allRes.map((r) => r.timeSlot))].sort(
		(a, b) => timeToMinutes(a) - timeToMinutes(b)
	);
	const midiSlots = allSlots.filter(isMidi);
	const soirSlots = allSlots.filter((t) => !isMidi(t));

	const maxRes = Math.max(...weekDays.map((d) => getDayRes(d).length), 1);

	const getCell = (d: Date, t: string) =>
		getDayRes(d).filter((r) => r.timeSlot === t);

	// Ligne horaire : label + 7 cellules
	const TimeRow = ({ slot }: { slot: string }) => (
		<div
			style={{ display: "grid", gridTemplateColumns: GRID_COLS }}
			className="border-b border-[#111]"
		>
			{/* Label heure */}
			<div className="flex items-start justify-end pr-2.5 pt-3 border-r border-[#111] pb-1">
				<span className="text-[9px] font-bold text-[#5A5249] tracking-wide leading-none">
					{slot}
				</span>
			</div>
			{/* Cellules par jour */}
			{weekDays.map((d) => {
				const key = formatDate(d, "yyyy-MM-dd");
				const res = getCell(d, slot);
				const isT = sameDay(d, today);
				return (
					<div
						key={key}
						className="border-l border-[#111]"
						style={{ background: isT ? "rgba(200,151,58,0.018)" : "transparent" }}
					>
						<div className="p-1.5 min-h-[70px] flex flex-col gap-1">
							{res.slice(0, 2).map((r) => (
								<WeekChip key={r.id} r={r} onOpen={onChipClick} />
							))}
							{res.length > 2 && (
								<button
									onClick={() => onDayClick(d)}
									className="text-[9px] text-[#9A8F84] border border-[#282828] rounded px-1.5 py-0.5 hover:border-[#3a3a3a] hover:text-[#F5F0EB] transition-colors text-center"
								>
									+{res.length - 2} autre{res.length - 2 > 1 ? "s" : ""}
								</button>
							)}
						</div>
					</div>
				);
			})}
		</div>
	);

	return (
		<div className="bg-[#141414] border border-[#222] rounded-xl overflow-hidden">
			<div className="overflow-x-auto">
				<div style={{ minWidth: 680 }}>
					{/* ── En-têtes des jours ── */}
					<div
						style={{ display: "grid", gridTemplateColumns: GRID_COLS }}
						className="border-b border-[#1e1e1e]"
					>
						<div className="border-r border-[#1e1e1e]" />
						{weekDays.map((d, i) => {
							const dr      = getDayRes(d);
							const isT     = sameDay(d, today);
							const conf    = dr.filter((r) => r.status === "CONFIRMED").length;
							const pend    = dr.filter((r) => r.status === "PENDING").length;
							const density = dr.length / maxRes;
							return (
								<div
									key={i}
									onClick={() => onDayClick(d)}
									className="border-l border-[#1e1e1e] py-3 px-2 text-center cursor-pointer transition-colors hover:bg-[#1a1a1a]"
									style={{ background: isT ? "rgba(200,151,58,0.04)" : "transparent" }}
								>
									{/* Jour abrégé */}
									<p className={cn(
										"text-[9px] font-bold uppercase tracking-wider mb-1.5",
										isT ? "text-[#C8973A]" : "text-[#5A5249]"
									)}>
										{FR_DAYS_SHORT[d.getDay()]}
									</p>

									{/* Numéro du jour */}
									{isT ? (
										<div className="w-[26px] h-[26px] rounded-full bg-[#C8973A] flex items-center justify-center mx-auto mb-2">
											<span className="text-[13px] font-bold text-[#0A0A0A]">{d.getDate()}</span>
										</div>
									) : (
										<p className="text-sm font-medium text-[#F5F0EB] mb-2">{d.getDate()}</p>
									)}

									{/* Barre de densité — élément signature */}
									<div className="h-[3px] rounded-full bg-[#1e1e1e] mx-auto mb-2 overflow-hidden" style={{ width: "52%" }}>
										<div
											className="h-full rounded-full transition-all duration-500 ease-out"
											style={{
												width:      `${density * 100}%`,
												background: isT ? "#C8973A" : "#555",
											}}
										/>
									</div>

									{/* Compteurs */}
									<div className="flex justify-center gap-1 flex-wrap min-h-[18px]">
										{conf > 0 && (
											<span className="text-[8px] font-bold px-1 py-0.5 rounded bg-green-500/10 border border-green-500/20 text-green-400">
												{conf}✓
											</span>
										)}
										{pend > 0 && (
											<span className="text-[8px] font-bold px-1 py-0.5 rounded bg-yellow-500/10 border border-yellow-500/20 text-yellow-400">
												{pend}⏳
											</span>
										)}
										{!conf && !pend && (
											<span className="text-[#252525] text-[9px]">—</span>
										)}
									</div>
								</div>
							);
						})}
					</div>

					{/* ── Section Midi ── */}
					{midiSlots.length > 0 && (
						<>
							<ServiceHeader
								icon={<Sun size={11} className="text-[#C8973A]" />}
								label="Service Midi"
								count={weekDays.flatMap((d) => getDayRes(d).filter((r) => isMidi(r.timeSlot))).length}
								covers={weekDays.flatMap((d) => getDayRes(d).filter((r) => isMidi(r.timeSlot))).reduce((s, r) => s + r.covers, 0)}
							/>
							{midiSlots.map((t) => <TimeRow key={t} slot={t} />)}
						</>
					)}

					{/* ── Section Soir ── */}
					{soirSlots.length > 0 && (
						<>
							<ServiceHeader
								icon={<Moon size={11} className="text-[#C8973A]" />}
								label="Service Soir"
								count={weekDays.flatMap((d) => getDayRes(d).filter((r) => !isMidi(r.timeSlot))).length}
								covers={weekDays.flatMap((d) => getDayRes(d).filter((r) => !isMidi(r.timeSlot))).reduce((s, r) => s + r.covers, 0)}
							/>
							{soirSlots.map((t) => <TimeRow key={t} slot={t} />)}
						</>
					)}

					{!midiSlots.length && !soirSlots.length && (
						<div className="flex flex-col items-center justify-center py-16 gap-3 text-[#5A5249]">
							<CalendarDays size={26} />
							<p className="text-sm">Aucune réservation cette semaine</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

// ─── DayView ────────────────────────────────────────────────────────────────────

function DayView({
	weekDays,
	getDayRes,
	today,
	selectedDay,
	onSelectDay,
	onConfirm,
}: {
	weekDays: Date[];
	getDayRes: (d: Date) => Reservation[];
	today: Date;
	selectedDay: Date;
	onSelectDay: (d: Date) => void;
	onConfirm: (r: Reservation) => void;
}) {
	const dayRes  = getDayRes(selectedDay);
	const midiRes = [...dayRes.filter((r) => isMidi(r.timeSlot))].sort(
		(a, b) => timeToMinutes(a.timeSlot) - timeToMinutes(b.timeSlot)
	);
	const soirRes = [...dayRes.filter((r) => !isMidi(r.timeSlot))].sort(
		(a, b) => timeToMinutes(a.timeSlot) - timeToMinutes(b.timeSlot)
	);
	const midiSlots = [...new Set(midiRes.map((r) => r.timeSlot))];
	const soirSlots = [...new Set(soirRes.map((r) => r.timeSlot))];

	const openRes = (r: Reservation) => {
		if (r.status === "PENDING") onConfirm(r);
		else window.location.href = `/admin/reservations?id=${r.id}`;
	};

	return (
		<div className="bg-[#141414] border border-[#222] rounded-xl overflow-hidden">
			{/* ── Sélecteur de jour ── */}
			<div className="flex items-center justify-between px-5 py-4 border-b border-[#1e1e1e] gap-4 flex-wrap">
				<div>
					<p className="text-base font-semibold text-[#F5F0EB] tracking-[-0.01em]">
						{FR_DAYS_FULL[selectedDay.getDay()]}{" "}
						{selectedDay.getDate()}{" "}
						{FR_MONTHS[selectedDay.getMonth()]}{" "}
						{selectedDay.getFullYear()}
					</p>
					<p className="text-xs text-[#5A5249] mt-1">
						{dayRes.length} réservation{dayRes.length !== 1 ? "s" : ""}{" "}
						· {dayRes.reduce((s, r) => s + r.covers, 0)} couverts
					</p>
				</div>

				{/* Pilules 7 jours */}
				<div className="flex gap-1.5 flex-wrap">
					{weekDays.map((d, i) => {
						const isT   = sameDay(d, today);
						const isSel = sameDay(d, selectedDay);
						const cnt   = getDayRes(d).length;
						return (
							<button
								key={i}
								onClick={() => onSelectDay(d)}
								className={cn(
									"flex flex-col items-center w-10 py-1.5 rounded-xl border transition-all",
									isSel
										? "bg-[#C8973A]/10 border-[#C8973A]/50"
										: isT
										? "border-[#C8973A]/20 hover:border-[#333]"
										: "border-[#1e1e1e] hover:border-[#2e2e2e]"
								)}
							>
								<span className={cn(
									"text-[8px] font-bold uppercase tracking-wider",
									isSel ? "text-[#C8973A]" : "text-[#5A5249]"
								)}>
									{FR_DAYS_SHORT[d.getDay()]}
								</span>
								<span className={cn(
									"text-sm font-semibold mt-0.5",
									isSel ? "text-[#C8973A]" : isT ? "text-[#F5F0EB]" : "text-[#9A8F84]"
								)}>
									{d.getDate()}
								</span>
								<span
									className="w-1 h-1 rounded-full mt-1 block"
									style={{
										background: cnt > 0 ? (isSel ? "#C8973A" : "#3a3a3a") : "transparent",
									}}
								/>
							</button>
						);
					})}
				</div>
			</div>

			{/* ── Contenu ── */}
			{dayRes.length === 0 ? (
				<div className="flex flex-col items-center justify-center py-16 gap-3 text-[#5A5249]">
					<CalendarDays size={26} />
					<p className="text-sm">Aucune réservation ce jour</p>
					<p className="text-xs text-[#333]">Sélectionnez un autre jour ci-dessus</p>
				</div>
			) : (
				<>
					{/* Service Midi */}
					{midiRes.length > 0 && (
						<div>
							<ServiceHeader
								icon={<Sun size={11} className="text-[#C8973A]" />}
								label="Service Midi"
								count={midiRes.length}
								covers={midiRes.reduce((s, r) => s + r.covers, 0)}
							/>
							<div className="px-6 pt-5 pb-2">
								{midiSlots.map((slot) => {
									const res = midiRes.filter((r) => r.timeSlot === slot);
									return (
										<div key={slot} className="mb-7">
											{/* Label créneau */}
											<div className="flex items-center gap-2.5 mb-3">
												<div
													className="text-[11px] font-bold tracking-wider px-2.5 py-0.5 rounded-md shrink-0"
													style={{
														color:      "#C8973A",
														background: "rgba(200,151,58,0.08)",
														border:     "1px solid rgba(200,151,58,0.20)",
													}}
												>
													{slot}
												</div>
												<div className="flex-1 h-px bg-[#1a1a1a]" />
												<span className="text-[10px] text-[#5A5249] shrink-0">
													{res.length} table{res.length > 1 ? "s" : ""}{" "}
													· {res.reduce((s, r) => s + r.covers, 0)} cv
												</span>
											</div>
											{/* Grille de cartes */}
											<div className={cn(
												"grid gap-2.5",
												res.length >= 2 ? "sm:grid-cols-2 grid-cols-1" : "grid-cols-1"
											)}>
												{res.map((r) => (
													<DayCard key={r.id} r={r} onOpen={openRes} onConfirm={onConfirm} />
												))}
											</div>
										</div>
									);
								})}
							</div>
						</div>
					)}

					{/* Service Soir */}
					{soirRes.length > 0 && (
						<div>
							<ServiceHeader
								icon={<Moon size={11} className="text-[#C8973A]" />}
								label="Service Soir"
								count={soirRes.length}
								covers={soirRes.reduce((s, r) => s + r.covers, 0)}
							/>
							<div className="px-6 pt-5 pb-2">
								{soirSlots.map((slot) => {
									const res = soirRes.filter((r) => r.timeSlot === slot);
									return (
										<div key={slot} className="mb-7">
											<div className="flex items-center gap-2.5 mb-3">
												<div
													className="text-[11px] font-bold tracking-wider px-2.5 py-0.5 rounded-md shrink-0"
													style={{
														color:      "#C8973A",
														background: "rgba(200,151,58,0.08)",
														border:     "1px solid rgba(200,151,58,0.20)",
													}}
												>
													{slot}
												</div>
												<div className="flex-1 h-px bg-[#1a1a1a]" />
												<span className="text-[10px] text-[#5A5249] shrink-0">
													{res.length} table{res.length > 1 ? "s" : ""}{" "}
													· {res.reduce((s, r) => s + r.covers, 0)} cv
												</span>
											</div>
											<div className={cn(
												"grid gap-2.5",
												res.length >= 2 ? "sm:grid-cols-2 grid-cols-1" : "grid-cols-1"
											)}>
												{res.map((r) => (
													<DayCard key={r.id} r={r} onOpen={openRes} onConfirm={onConfirm} />
												))}
											</div>
										</div>
									);
								})}
							</div>
						</div>
					)}
				</>
			)}
		</div>
	);
}

// ─── Composant principal ────────────────────────────────────────────────────────

export default function CalendarClient({ reservations, tables }: Props) {
	const router = useRouter();
	const today  = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);

	const [weekStart,   setWeekStart]   = useState<Date>(() => getMonday(today));
	const [view,        setView]        = useState<"week" | "day">("week");
	const [selectedDay, setSelectedDay] = useState<Date>(() => today);
	const [confirmResa, setConfirmResa] = useState<Reservation | null>(null);

	const navigate = useCallback((dir: -1 | 1) => setWeekStart((w) => addDays(w, dir * 7)), []);

	const goToday = useCallback(() => {
		setWeekStart(getMonday(today));
		setSelectedDay(today);
	}, [today]);

	const weekDays = useMemo(
		() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
		[weekStart]
	);

	const byDay = useMemo(() => {
		const map = new Map<string, Reservation[]>();
		reservations.forEach((r) => {
			const key = formatDate(r.date, "yyyy-MM-dd");
			if (!map.has(key)) map.set(key, []);
			map.get(key)!.push(r);
		});
		return map;
	}, [reservations]);

	const getDayRes = useCallback(
		(d: Date) => byDay.get(formatDate(d, "yyyy-MM-dd")) ?? [],
		[byDay]
	);

	const weekStats = useMemo(() => {
		const all = weekDays.flatMap(getDayRes);
		return {
			total:     all.length,
			confirmed: all.filter((r) => r.status === "CONFIRMED").length,
			pending:   all.filter((r) => r.status === "PENDING").length,
			covers:    all.reduce((s, r) => s + r.covers, 0),
		};
	}, [weekDays, getDayRes]);

	const isThisWeek = weekDays.some((d) => sameDay(d, today));

	const handleConfirmed = useCallback(() => router.refresh(), [router]);

	const openDayView = useCallback((d: Date) => {
		setSelectedDay(d);
		setView("day");
	}, []);

	// Ouvre la modal de confirmation ou redirige vers la fiche
	const handleChipClick = useCallback((r: Reservation) => {
		if (r.status === "PENDING") setConfirmResa(r);
		else window.location.href = `/admin/reservations?id=${r.id}`;
	}, []);

	// ── Rendu ──────────────────────────────────────────────────────────────────

	return (
		<div>
			{/* ── En-tête ── */}
			<div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
				<div>
					<h1 className="font-display text-3xl text-[#F5F0EB] leading-tight tracking-tight">
						Calendrier
					</h1>
					<p className="text-xs text-[#5A5249] mt-1.5">
						Réservations · semaine du {weekRangeLabel(weekStart)}
					</p>
				</div>
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
						className="flex items-center gap-2 h-9 px-4 bg-[#C8973A] hover:bg-[#D4A445] text-[#0A0A0A] text-sm font-semibold rounded-lg transition-colors"
					>
						<Plus size={15} />
						Ajouter
					</Link>
				</div>
			</div>

			{/* ── Barre d'outils ── */}
			<div className="flex items-center gap-3 mb-5 flex-wrap">
				{/* Toggle vue */}
				<div className="flex border border-[#222] rounded-lg overflow-hidden">
					{(["week", "day"] as const).map((v) => (
						<button
							key={v}
							onClick={() => setView(v)}
							className={cn(
								"h-8 px-3 text-xs font-medium transition-colors flex items-center gap-1.5",
								view === v
									? "bg-[#1a1a1a] text-[#F5F0EB]"
									: "text-[#5A5249] hover:text-[#9A8F84]"
							)}
						>
							{v === "week" ? (
								<><CalendarDays size={12} />Semaine</>
							) : (
								<><List size={12} />Journée</>
							)}
						</button>
					))}
				</div>

				{/* Navigation semaine */}
				<div className="flex items-center gap-2">
					<button
						onClick={() => navigate(-1)}
						className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#222] text-[#5A5249] hover:text-[#F5F0EB] hover:bg-[#1a1a1a] transition-colors"
						aria-label="Semaine précédente"
					>
						<ChevronLeft size={15} />
					</button>
					<span className="text-sm font-medium text-[#F5F0EB] min-w-[210px] text-center">
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

			{/* ── Statistiques semaine ── */}
			<div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
				{[
					{
						label:   "Cette semaine",
						val:     weekStats.total,
						icon:    <CalendarDays size={16} />,
						iconBg:  "bg-[#F5F0EB]/5",
						iconCol: "text-[#F5F0EB]",
						valCol:  "text-[#F5F0EB]",
					},
					{
						label:   "Confirmées",
						val:     weekStats.confirmed,
						icon:    <CheckCircle2 size={16} />,
						iconBg:  "bg-green-500/10",
						iconCol: "text-green-400",
						valCol:  "text-green-400",
					},
					{
						label:   "En attente",
						val:     weekStats.pending,
						icon:    <Clock size={16} />,
						iconBg:  "bg-yellow-500/10",
						iconCol: "text-yellow-400",
						valCol:  "text-yellow-400",
					},
					{
						label:   "Couverts",
						val:     weekStats.covers,
						icon:    <Users size={16} />,
						iconBg:  "bg-[#C8973A]/10",
						iconCol: "text-[#C8973A]",
						valCol:  "text-[#C8973A]",
					},
				].map(({ label, val, icon, iconBg, iconCol, valCol }) => (
					<div
						key={label}
						className="bg-[#141414] border border-[#222] rounded-xl p-4 flex items-center gap-3"
					>
						<div className={cn("p-2 rounded-lg shrink-0", iconBg, iconCol)}>{icon}</div>
						<div>
							<p className={cn("text-2xl font-semibold leading-none tabular-nums", valCol)}>
								{val}
							</p>
							<p className="text-[11px] text-[#5A5249] mt-1 uppercase tracking-wide">{label}</p>
						</div>
					</div>
				))}
			</div>

			{/* ════════════ VUE SEMAINE ════════════ */}
			{view === "week" && (
				<WeekView
					weekDays={weekDays}
					getDayRes={getDayRes}
					today={today}
					onDayClick={openDayView}
					onChipClick={handleChipClick}
				/>
			)}

			{/* ════════════ VUE JOURNÉE ════════════ */}
			{view === "day" && (
				<DayView
					weekDays={weekDays}
					getDayRes={getDayRes}
					today={today}
					selectedDay={selectedDay}
					onSelectDay={setSelectedDay}
					onConfirm={setConfirmResa}
				/>
			)}

			{/* ── Modal confirmation ── */}
			<ConfirmModal
				reservation={confirmResa}
				tables={tables}
				onClose={() => setConfirmResa(null)}
				onConfirmed={handleConfirmed}
			/>
		</div>
	);
}
