"use client";

import { useState, useEffect, useCallback } from "react";
import {
	Clock,
	CheckCircle2,
	Users,
	TableProperties,
	Lock,
	AlertTriangle,
	RefreshCw,
	ChevronRight,
	X,
	Ban,
	Eye,
	Zap,
	XCircle,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { getPusherClient } from "@/lib/pusher-client";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import Link from "next/link";
import type {
	TableWithStatus,
	ReservationForPlan,
	PlanDeSalleData,
} from "@/types";

const ZONES = ["SALLE", "TERRASSE", "BAR", "PRIVE"] as const;

const ZONE_LABELS: Record<string, { label: string; short: string }> = {
	SALLE: { label: "Salle — intérieur", short: "Salle" },
	TERRASSE: { label: "Terrasse", short: "Terrasse" },
	BAR: { label: "Bar", short: "Bar" },
	PRIVE: { label: "Espace privé", short: "Privé" },
};

const TABLE_STYLES: Record<
	string,
	{
		card: string;
		num: string;
		sub: string;
		dot: string;
		icon: string;
	}
> = {
	LIBRE: {
		card: "bg-green-950/40 border-green-900/50 hover:border-green-600 hover:bg-green-950/60 cursor-pointer",
		num: "text-green-400",
		sub: "text-green-700",
		dot: "bg-green-500",
		icon: "text-green-500",
	},
	CONFIRMEE: {
		card: "bg-blue-950/30 border-blue-900/40 cursor-pointer",
		num: "text-blue-400",
		sub: "text-blue-700",
		dot: "bg-blue-400",
		icon: "text-blue-400",
	},
	EN_ATTENTE: {
		card: "bg-yellow-950/40 border-yellow-800/50 hover:border-yellow-600 cursor-pointer",
		num: "text-yellow-400",
		sub: "text-yellow-700",
		dot: "bg-yellow-400",
		icon: "text-yellow-400",
	},
	BLOQUEE: {
		card: "bg-[#111] border-[#252525] opacity-60 cursor-pointer",
		num: "text-[#363636]",
		sub: "text-[#2a2a2a]",
		dot: "bg-[#333]",
		icon: "text-[#333]",
	},
	INACTIVE: {
		card: "border-[#1a1a1a] opacity-20 cursor-not-allowed",
		num: "text-[#222]",
		sub: "text-[#1a1a1a]",
		dot: "bg-[#222]",
		icon: "text-[#222]",
	},
};

const OCCASIONS = [
	"Anniversaire",
	"Romantique",
	"Professionnel",
	"Famille",
	"Autre",
];

interface Props {
	initialData: PlanDeSalleData;
	date: string;
}

export default function PlanDeSalleClient({ initialData, date }: Props) {
	const [data, setData] = useState<PlanDeSalleData>(initialData);
	const [selectedResaId, setSelectedResaId] = useState<string | null>(null);
	const [modalResa, setModalResa] = useState<ReservationForPlan | null>(null);
	const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
	const [adminNotes, setAdminNotes] = useState("");
	const [blocageModal, setBlocageModal] = useState<TableWithStatus | null>(null);
	const [blocageMotif, setBlocageMotif] = useState("");
	const [tableTooltip, setTableTooltip] = useState<string | null>(null);
	const [loading, setLoading] = useState<string | null>(null);
	const [refreshing, setRefreshing] = useState(false);

	const refetch = useCallback(async () => {
		setRefreshing(true);
		try {
			const res = await fetch(`/api/admin/plan?date=${date}`, {
				cache: "no-store",
			});
			if (res.ok) {
				const json = await res.json();
				setData(json.data);
			}
		} finally {
			setRefreshing(false);
		}
	}, [date]);

	useEffect(() => {
		const pusher = getPusherClient();
		const channel = pusher.subscribe("admin-reservations");
		channel.bind("reservation-updated", () => refetch());
		channel.bind("table-updated", () => refetch());
		return () => {
			channel.unbind("reservation-updated");
			channel.unbind("table-updated");
			pusher.unsubscribe("admin-reservations");
		};
	}, [refetch]);

	const handleConfirm = async () => {
		if (!modalResa || !selectedTableId) {
			toast.error("Sélectionnez une table avant de confirmer");
			return;
		}
		setLoading("confirm");
		try {
			const res = await fetch(
				`/api/admin/reservations/${modalResa.id}/confirmer`,
				{
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ tableId: selectedTableId, adminNotes }),
				}
			);
			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.error || "Erreur lors de la confirmation");
			}
			toast.success("Réservation confirmée — email envoyé au client");
			closeConfirmModal();
			await refetch();
		} catch (e: unknown) {
			toast.error(e instanceof Error ? e.message : "Erreur");
		} finally {
			setLoading(null);
		}
	};

	const handleNoShow = async (resaId: string) => {
		setLoading(`noshow-${resaId}`);
		try {
			const res = await fetch(`/api/reservations/${resaId}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ status: "NO_SHOW" }),
			});
			if (!res.ok) throw new Error();
			toast.success("Absent marqué");
			await refetch();
		} catch {
			toast.error("Erreur");
		} finally {
			setLoading(null);
		}
	};

	const handleBlock = async () => {
		if (!blocageModal) return;
		setLoading("block");
		try {
			const res = await fetch(`/api/admin/tables/${blocageModal.id}/bloquer`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					date,
					heureDebut: "00:00",
					heureFin: "23:59",
					motif: blocageMotif.trim() || "Bloquée par l'admin",
				}),
			});
			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.error || "Erreur");
			}
			toast.success(`Table ${blocageModal.numero} bloquée`);
			closeBlocageModal();
			await refetch();
		} catch (e: unknown) {
			toast.error(e instanceof Error ? e.message : "Erreur");
		} finally {
			setLoading(null);
		}
	};

	const handleUnblock = async (tableId: string, tableNum: number) => {
		setLoading(`unblock-${tableId}`);
		try {
			const res = await fetch(
				`/api/admin/tables/${tableId}/bloquer?date=${date}`,
				{ method: "DELETE" }
			);
			if (!res.ok) throw new Error();
			toast.success(`Table ${tableNum} débloquée`);
			closeBlocageModal();
			await refetch();
		} catch {
			toast.error("Erreur lors du déblocage");
		} finally {
			setLoading(null);
		}
	};

	const closeConfirmModal = () => {
		setModalResa(null);
		setSelectedResaId(null);
		setSelectedTableId(null);
		setAdminNotes("");
	};

	const closeBlocageModal = () => {
		setBlocageModal(null);
		setBlocageMotif("");
	};

	const selectResa = (resa: ReservationForPlan) => {
		setSelectedResaId(resa.id);
		setSelectedTableId(null);
		setAdminNotes("");
		setModalResa(resa);
		setTableTooltip(
			`Sélectionnez une table libre (≥ ${resa.covers} couverts) pour assigner`
		);
	};

	const onTableClick = (t: TableWithStatus) => {
		if (!t.isActif || t.status === "INACTIVE") return;

		if (t.status === "BLOQUEE") {
			setBlocageModal(t);
			return;
		}

		if (t.status === "CONFIRMEE" || t.status === "EN_ATTENTE") {
			if (t.reservation) {
				setTableTooltip(
					`T${t.numero} · ${t.reservation.guestNom} · ${t.reservation.heure} · ${t.reservation.covers} cv${t.reservation.occasion ? ` · ${t.reservation.occasion}` : ""}`
				);
			}
			return;
		}

		if (modalResa) {
			if (t.capaciteMax >= modalResa.covers) {
				setSelectedTableId(t.id);
				setTableTooltip(`Table ${t.numero} sélectionnée — confirmez dans le panneau`);
			} else {
				setTableTooltip(
					`Table ${t.numero} insuffisante — ${t.capaciteMax} cv pour ${modalResa.covers} demandés`
				);
			}
			return;
		}
		setTableTooltip(
			`Table ${t.numero} libre — zone ${ZONE_LABELS[t.zone]?.short} — ${t.capaciteMax} cv max`
		);
	};

	const { tables, pending, confirmed, noShow, stats } = data;

	const tablesByZone = ZONES.reduce(
		(acc, zone) => {
			acc[zone] = tables.filter((t) => t.zone === zone);
			return acc;
		},
		{} as Record<string, TableWithStatus[]>
	);

	const compatibleTables = modalResa
		? tables.filter(
				(t) =>
					t.status === "LIBRE" &&
					t.isActif &&
					t.capaciteMax >= modalResa.covers
			)
		: [];

	const isSelectionMode = !!modalResa;

	return (
		<div className="space-y-5">

			<div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
				{(
					[
						{
							label: "En attente",
							value: stats.pending,
							icon: Clock,
							ring: stats.pending > 0,
							cardCn: "bg-yellow-950/20 border-yellow-900/30",
							valCn: "text-yellow-400",
							iconCn: "text-yellow-500",
						},
						{
							label: "Confirmées",
							value: stats.confirmed,
							icon: CheckCircle2,
							ring: false,
							cardCn: "bg-blue-950/20 border-blue-900/30",
							valCn: "text-blue-400",
							iconCn: "text-blue-400",
						},
						{
							label: "Tables libres",
							value: stats.libres,
							icon: TableProperties,
							ring: false,
							cardCn: "bg-green-950/15 border-green-900/20",
							valCn: "text-green-400",
							iconCn: "text-green-500",
						},
						{
							label: "Bloquées",
							value: stats.bloquees,
							icon: Lock,
							ring: false,
							cardCn: "bg-[#111] border-[#222]",
							valCn: "text-[#444]",
							iconCn: "text-[#3a3a3a]",
						},
						{
							label: "Couverts prévus",
							value: stats.totalCovers,
							icon: Users,
							ring: false,
							cardCn: "bg-[#1a1200] border-[#C8973A]/20",
							valCn: "text-[#C8973A]",
							iconCn: "text-[#C8973A]",
						},
					] as const
				).map(({ label, value, icon: Icon, ring, cardCn, valCn, iconCn }) => (
					<div
						key={label}
						className={cn("relative rounded-xl border p-4", cardCn)}
					>
						{ring && value > 0 && (
							<span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-yellow-500 rounded-full text-[10px] font-bold text-[#0A0A0A] flex items-center justify-center animate-bounce">
								{value}
							</span>
						)}
						<Icon size={15} className={cn("mb-2.5", iconCn)} />
						<p className={cn("text-2xl font-bold", valCn)}>{value}</p>
						<p className="text-[11px] text-[#5A5249] mt-0.5">{label}</p>
					</div>
				))}
			</div>

			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2 text-xs text-[#5A5249]">
					<span className="flex items-center gap-1">
						<span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
						{stats.libres} libre{stats.libres > 1 ? "s" : ""}
					</span>
					<span className="text-[#1e1e1e]">·</span>
					<span>
						{tables.filter((t) => t.isActif).length} tables actives
					</span>
				</div>
				<button
					onClick={refetch}
					disabled={refreshing}
					className="flex items-center gap-1.5 text-xs text-[#5A5249] hover:text-[#9A8F84] transition-colors"
				>
					<RefreshCw
						size={12}
						className={refreshing ? "animate-spin" : ""}
					/>
					{refreshing ? "Actualisation…" : "Actualiser"}
				</button>
			</div>

			<div className="grid grid-cols-1 xl:grid-cols-[260px_1fr] gap-4 items-start">

				<div className="space-y-5">

					<div>
						<div className="flex items-center gap-2 mb-2.5">
							<span className="text-[10px] font-semibold text-[#333] uppercase tracking-widest">
								En attente
							</span>
							{stats.pending > 0 && (
								<span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-yellow-500 text-[#0A0A0A] text-[9px] font-bold animate-pulse">
									{stats.pending}
								</span>
							)}
						</div>

						{pending.length === 0 ? (
							<div className="text-center py-5 border border-dashed border-[#1e1e1e] rounded-xl">
								<p className="text-xs text-[#333]">Aucune demande en attente</p>
							</div>
						) : (
							<div className="space-y-2">
								{pending.map((r) => (
									<button
										key={r.id}
										onClick={() => selectResa(r)}
										className={cn(
											"w-full text-left rounded-xl border p-3 transition-all",
											selectedResaId === r.id
												? "bg-yellow-950/40 border-yellow-700/60 ring-1 ring-yellow-700/30"
												: "bg-[#141414] border-[#222] hover:border-[#333] hover:bg-[#1a1a1a]"
										)}
									>
										<div className="flex items-start justify-between gap-2 mb-1.5">
											<span className="text-sm font-medium text-[#F5F0EB] leading-tight">
												{r.guestFirstName} {r.guestLastName}
											</span>
											{r.table && (
												<span className="shrink-0 text-[10px] bg-blue-950/60 text-blue-400 border border-blue-900/40 px-1.5 py-0.5 rounded-md">
													T{r.table.numero}
												</span>
											)}
										</div>

										<div className="flex items-center gap-3 text-[11px] text-[#5A5249]">
											<span className="flex items-center gap-1">
												<Users size={10} />
												{r.covers} cv
											</span>
											<span className="flex items-center gap-1">
												<Clock size={10} />
												{r.timeSlot}
											</span>
											{r.occasion && (
												<span className="text-[#C8973A]/80">{r.occasion}</span>
											)}
										</div>

										{(r.notes || r.allergies) && (
											<p className="text-[10px] text-yellow-600/60 mt-1.5 truncate">
												⚠ {r.notes || r.allergies}
											</p>
										)}

										<div className="flex items-center justify-between mt-2 pt-1.5 border-t border-[#1e1e1e]">
											<span className="text-[10px] text-[#2a2a2a]">
												{formatDate(r.date, "dd/MM")}
											</span>
											<span className="text-[10px] text-yellow-600 flex items-center gap-0.5">
												<Zap size={9} />
												Assigner une table
												<ChevronRight size={9} />
											</span>
										</div>
									</button>
								))}
							</div>
						)}
					</div>

					{confirmed.length > 0 && (
						<div>
							<p className="text-[10px] font-semibold text-[#333] uppercase tracking-widest mb-2.5">
								Confirmées ({confirmed.length})
							</p>
							<div className="space-y-1.5">
								{confirmed.map((r) => (
									<div
										key={r.id}
										className="flex items-center justify-between rounded-xl border border-blue-900/30 bg-blue-950/15 px-3 py-2.5 group"
									>
										<div className="min-w-0">
											<p className="text-xs font-medium text-blue-300 truncate">
												{r.guestFirstName} {r.guestLastName}
											</p>
											<p className="text-[11px] text-[#5A5249]">
												{r.covers} cv · {r.timeSlot}
												{r.table && (
													<span className="ml-1 text-blue-600">
														· T{r.table.numero}
													</span>
												)}
											</p>
										</div>
										<div className="flex items-center gap-1 shrink-0 ml-2">
											<Link
												href={`/admin/reservations/${r.id}`}
												className="p-1 text-[#333] hover:text-[#9A8F84] opacity-0 group-hover:opacity-100 transition-all"
												title="Voir la réservation"
											>
												<Eye size={12} />
											</Link>
											<button
												onClick={() => handleNoShow(r.id)}
												disabled={loading === `noshow-${r.id}`}
												className="p-1 text-[#333] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
												title="Marquer absent (no-show)"
											>
												<Ban size={12} />
											</button>
										</div>
									</div>
								))}
							</div>
						</div>
					)}

					{noShow.length > 0 && (
						<div>
							<p className="text-[10px] font-semibold text-[#333] uppercase tracking-widest mb-2.5">
								No-show ({noShow.length})
							</p>
							<div className="space-y-1.5">
								{noShow.map((r) => (
									<div
										key={r.id}
										className="flex items-center gap-2 rounded-xl border border-red-900/20 bg-red-950/10 px-3 py-2"
									>
										<XCircle size={11} className="text-red-700 shrink-0" />
										<div className="min-w-0">
											<p className="text-xs text-red-500 truncate">
												{r.guestFirstName} {r.guestLastName}
											</p>
											<p className="text-[10px] text-[#5A5249]">
												{r.covers} cv · {r.timeSlot}
											</p>
										</div>
									</div>
								))}
							</div>
						</div>
					)}
				</div>

				<div className="space-y-3">
					<div className="flex items-baseline gap-2">
						<p className="text-[10px] font-semibold text-[#333] uppercase tracking-widest">
							Plan de salle
						</p>
						{isSelectionMode && (
							<span className="text-[11px] text-yellow-500">
								— Cliquez sur une table verte pour assigner {modalResa!.guestFirstName} ({modalResa!.covers} cv requis)
							</span>
						)}
					</div>

					<div className="space-y-2">
						{ZONES.map((zone) => {
							const zoneTables = tablesByZone[zone] || [];
							if (zoneTables.length === 0) return null;
							const freeCount = zoneTables.filter(
								(t) => t.status === "LIBRE" && t.isActif
							).length;
							return (
								<div
									key={zone}
									className="bg-[#141414] border border-[#222] rounded-xl overflow-hidden"
								>
									<div className="px-4 py-2 border-b border-[#1e1e1e] flex items-center gap-2">
										<span className="text-[10px] font-semibold text-[#444] uppercase tracking-widest">
											{ZONE_LABELS[zone]?.label}
										</span>
										<span className="text-[10px] text-[#2a2a2a]">
											{freeCount} libre{freeCount > 1 ? "s" : ""}
										</span>
									</div>

									<div className="p-3 flex flex-wrap gap-2">
										{zoneTables.map((t) => {
											const s =
												TABLE_STYLES[t.status] || TABLE_STYLES.LIBRE;
											const isSelected = selectedTableId === t.id;
											const isCompatible =
												isSelectionMode &&
												t.status === "LIBRE" &&
												t.isActif &&
												t.capaciteMax >= (modalResa?.covers ?? 0);
											const isIncompatible =
												isSelectionMode &&
												t.status === "LIBRE" &&
												t.isActif &&
												t.capaciteMax < (modalResa?.covers ?? 0);
											const isHighlighted = isCompatible && !isSelected;

											return (
												<button
													key={t.id}
													onClick={() => onTableClick(t)}
													title={
														t.status === "BLOQUEE"
															? `Bloquée · ${t.blocage?.motif || "aucun motif"}`
															: t.reservation
																? `${t.reservation.guestNom} · ${t.reservation.heure}`
																: `Table ${t.numero} libre`
													}
													className={cn(
														"w-[68px] h-[58px] rounded-xl border flex flex-col items-center justify-center gap-0.5 transition-all duration-150",
														s.card,
														isSelected &&
															"ring-2 ring-[#C8973A] ring-offset-1 ring-offset-[#141414] border-[#C8973A]",
														isHighlighted &&
															"ring-1 ring-green-500/50 border-green-600",
														isIncompatible && "opacity-25"
													)}
												>
													<span
														className={cn(
															"w-1.5 h-1.5 rounded-full",
															s.dot,
															t.status === "EN_ATTENTE" && "animate-pulse"
														)}
													/>

													<span
														className={cn(
															"text-[11px] font-bold leading-tight",
															s.num
														)}
													>
														T{t.numero}
													</span>

													{t.reservation ? (
														<span
															className={cn(
																"text-[9px] truncate max-w-[56px] text-center px-0.5",
																s.icon
															)}
														>
															{t.reservation.guestNom.split(" ")[0]}
														</span>
													) : t.status === "BLOQUEE" ? (
														<Lock size={8} className={s.icon} />
													) : (
														<span className={cn("text-[9px]", s.sub)}>
															{t.capaciteMax}cv
														</span>
													)}
												</button>
											);
										})}
									</div>
								</div>
							);
						})}
					</div>

					<div className="flex items-center gap-4 flex-wrap pt-1">
						{[
							{ dot: "bg-green-500", label: "Libre" },
							{ dot: "bg-blue-400", label: "Confirmée" },
							{
								dot: "bg-yellow-400 animate-pulse",
								label: "En attente",
							},
							{ dot: "bg-[#2a2a2a]", label: "Bloquée" },
						].map(({ dot, label }) => (
							<div key={label} className="flex items-center gap-1.5">
								<div className={cn("w-1.5 h-1.5 rounded-full", dot)} />
								<span className="text-[11px] text-[#5A5249]">{label}</span>
							</div>
						))}
					</div>

					{tableTooltip && (
						<div className="flex items-center gap-2 text-xs text-[#9A8F84] bg-[#141414] border border-[#222] rounded-xl px-3 py-2">
							<Eye size={12} className="text-[#C8973A] shrink-0" />
							<span className="flex-1">{tableTooltip}</span>
							<button
								onClick={() => setTableTooltip(null)}
								className="text-[#333] hover:text-[#9A8F84] transition-colors"
							>
								<X size={12} />
							</button>
						</div>
					)}

					{isSelectionMode && selectedTableId && (
						<div className="flex items-center justify-end gap-3 bg-[#141414] border border-[#C8973A]/20 rounded-xl p-3">
							<span className="text-xs text-[#9A8F84]">
								Table{" "}
								{
									tables.find((t) => t.id === selectedTableId)
										?.numero
								}{" "}
								sélectionnée
							</span>
							<button
								onClick={() => setModalResa(modalResa)}
								className="text-xs text-[#C8973A] hover:underline"
							>
								Ouvrir le panneau de confirmation
							</button>
						</div>
					)}
				</div>
			</div>

			<Modal
				open={!!modalResa}
				onClose={closeConfirmModal}
				title="Confirmer la réservation"
				description="Assignez une table puis confirmez pour envoyer l'email au client."
				className="max-w-xl"
			>
				{modalResa && (
					<div className="space-y-5">
						<div className="bg-[#0A0A0A] rounded-xl border border-[#1e1e1e] p-4">
							<div className="flex items-start justify-between gap-3 mb-2">
								<div>
									<p className="text-sm font-semibold text-[#F5F0EB]">
										{modalResa.guestFirstName} {modalResa.guestLastName}
									</p>
									<p className="text-xs text-[#5A5249] mt-0.5">
										{modalResa.guestEmail} · {modalResa.guestPhone}
									</p>
								</div>
								<div className="flex items-center gap-2 shrink-0">
									<span className="flex items-center gap-1 text-xs text-[#9A8F84] bg-[#1a1a1a] border border-[#222] px-2 py-1 rounded-lg">
										<Users size={11} />
										{modalResa.covers} cv
									</span>
									<span className="flex items-center gap-1 text-xs text-[#9A8F84] bg-[#1a1a1a] border border-[#222] px-2 py-1 rounded-lg">
										<Clock size={11} />
										{modalResa.timeSlot}
									</span>
								</div>
							</div>

							{modalResa.occasion && (
								<span className="inline-block text-[11px] text-[#C8973A] border border-[#C8973A]/30 bg-[#C8973A]/5 px-2 py-0.5 rounded-md mb-2">
									{modalResa.occasion}
								</span>
							)}

							{(modalResa.notes || modalResa.allergies) && (
								<div className="flex items-start gap-2 text-xs text-yellow-600/80 bg-yellow-950/20 border border-yellow-900/30 rounded-lg p-2.5">
									<AlertTriangle
										size={11}
										className="mt-0.5 shrink-0 text-yellow-500"
									/>
									<span>{modalResa.notes || modalResa.allergies}</span>
								</div>
							)}
						</div>

						<div>
							<p className="text-xs font-medium text-[#5A5249] mb-2">
								Choisir une table libre (minimum {modalResa.covers} couverts)
							</p>
							{compatibleTables.length === 0 ? (
								<div className="text-center py-4 border border-dashed border-red-900/30 rounded-xl">
									<p className="text-sm text-red-400">
										Aucune table disponible avec la capacité requise
									</p>
									<p className="text-xs text-[#5A5249] mt-1">
										Vérifiez les blocages ou combinez des tables manuellement
									</p>
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
												className={
													selectedTableId === t.id
														? "text-[#C8973A] mt-2"
														: "text-green-500 mt-2"
												}
											/>
											<span
												className={cn(
													"text-xs font-semibold",
													selectedTableId === t.id
														? "text-[#C8973A]"
														: "text-green-400"
												)}
											>
												T{t.numero}
											</span>
											<span className="text-[9px] text-[#5A5249] leading-tight">
												{t.capaciteMax}cv ·{" "}
												{ZONE_LABELS[t.zone]?.short || t.zone}
											</span>
										</button>
									))}
								</div>
							)}
						</div>

						<div>
							<label className="text-xs text-[#5A5249] block mb-1.5">
								Notes internes (facultatif, non visibles par le client)
							</label>
							<textarea
								value={adminNotes}
								onChange={(e) => setAdminNotes(e.target.value)}
								placeholder="Préférences de placement, notes de service…"
								rows={2}
								className="w-full bg-[#0A0A0A] border border-[#222] rounded-xl px-3 py-2.5 text-sm text-[#F5F0EB] placeholder-[#2a2a2a] focus:border-[#C8973A] focus:outline-none resize-none transition-colors"
							/>
						</div>

						<div className="flex items-center justify-end gap-3 pt-1 border-t border-[#1e1e1e]">
							<button
								onClick={closeConfirmModal}
								className="px-4 py-2 text-sm text-[#5A5249] hover:text-[#9A8F84] transition-colors"
							>
								Annuler
							</button>
							<button
								onClick={handleConfirm}
								disabled={!selectedTableId || loading === "confirm"}
								className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#C8973A] hover:bg-[#D4A445] active:bg-[#B8872A] text-[#0A0A0A] text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
							>
								<CheckCircle2 size={15} />
								{loading === "confirm" ? "Confirmation…" : "Confirmer & envoyer l'email"}
							</button>
						</div>
					</div>
				)}
			</Modal>

			<Modal
				open={!!blocageModal}
				onClose={closeBlocageModal}
				title={
					blocageModal
						? `Table ${blocageModal.numero} — ${ZONE_LABELS[blocageModal.zone]?.label}`
						: ""
				}
				description={
					blocageModal?.status === "BLOQUEE"
						? "Cette table est actuellement bloquée."
						: "Bloquer cette table pour toute la journée."
				}
			>
				{blocageModal && (
					<div className="space-y-4">
						{blocageModal.status === "BLOQUEE" ? (
							<>
								<div className="bg-[#0A0A0A] rounded-xl border border-[#222] p-4 space-y-1.5">
									<div className="flex items-center gap-2 text-sm">
										<Lock size={13} className="text-[#444]" />
										<span className="text-[#9A8F84]">
											Motif :{" "}
											<span className="text-[#F5F0EB]">
												{blocageModal.blocage?.motif || "Aucun"}
											</span>
										</span>
									</div>
									<p className="text-xs text-[#5A5249]">
										Plage : {blocageModal.blocage?.heureDebut} →{" "}
										{blocageModal.blocage?.heureFin}
									</p>
								</div>
								<div className="flex justify-end gap-3">
									<button
										onClick={closeBlocageModal}
										className="px-4 py-2 text-sm text-[#5A5249] hover:text-[#9A8F84] transition-colors"
									>
										Fermer
									</button>
									<button
										onClick={() =>
											handleUnblock(blocageModal.id, blocageModal.numero)
										}
										disabled={
											loading === `unblock-${blocageModal.id}`
										}
										className="px-5 py-2 rounded-xl border border-red-800/50 bg-red-950/20 text-red-400 hover:bg-red-950/40 text-sm font-medium transition-colors disabled:opacity-40"
									>
										{loading === `unblock-${blocageModal.id}`
											? "Déblocage…"
											: "Débloquer la table"}
									</button>
								</div>
							</>
						) : (
							<>
								<div>
									<label className="text-xs text-[#5A5249] block mb-1.5">
										Motif du blocage
									</label>
									<input
										value={blocageMotif}
										onChange={(e) => setBlocageMotif(e.target.value)}
										placeholder="Maintenance, VIP, Repas personnel…"
										className="w-full bg-[#0A0A0A] border border-[#222] rounded-xl px-3 py-2.5 text-sm text-[#F5F0EB] placeholder-[#2a2a2a] focus:border-[#C8973A] focus:outline-none transition-colors"
									/>
								</div>
								<p className="text-[11px] text-[#333]">
									La table sera bloquée pour toute la journée du{" "}
									{formatDate(new Date(date), "dd/MM/yyyy")}.
								</p>
								<div className="flex justify-end gap-3">
									<button
										onClick={closeBlocageModal}
										className="px-4 py-2 text-sm text-[#5A5249] hover:text-[#9A8F84] transition-colors"
									>
										Annuler
									</button>
									<button
										onClick={handleBlock}
										disabled={loading === "block"}
										className="px-5 py-2.5 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#444] text-[#9A8F84] hover:text-[#F5F0EB] text-sm font-medium transition-colors disabled:opacity-40"
									>
										{loading === "block" ? "Blocage…" : "Bloquer pour aujourd'hui"}
									</button>
								</div>
							</>
						)}
					</div>
				)}
			</Modal>
		</div>
	);
}
