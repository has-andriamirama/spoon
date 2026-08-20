"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
	RefreshCw, Clock, CheckCircle2, TableProperties, Users, Lock,
	AlertTriangle, ChevronRight, Eye, Zap, Ban, XCircle,
	UtensilsCrossed, ConciergeBell, Receipt, Loader2, Plus, Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";
import { ZONE_LABELS, ZONES } from "@/lib/constants";
import { Modal } from "@/components/ui/modal";
import type {
	TableWithStatus, PlanDeSalleData, ReservationForPlan,
} from "@/types";

interface Props {
	initialData: PlanDeSalleData;
	date: string;
}

const TABLE_STYLES: Record<
	string,
	{ card: string; num: string; sub: string; dot: string; icon: string }
> = {
	LIBRE: {
		card: "bg-green-950/40 border-green-900/50 hover:border-green-600 hover:bg-green-950/60 cursor-pointer",
		num:  "text-green-400",
		sub:  "text-green-700",
		dot:  "bg-green-500",
		icon: "text-green-500",
	},
	CONFIRMEE: {
		card: "bg-blue-950/30 border-blue-900/40 hover:border-blue-700 cursor-pointer",
		num:  "text-blue-400",
		sub:  "text-blue-700",
		dot:  "bg-blue-400",
		icon: "text-blue-400",
	},
	EN_ATTENTE: {
		card: "bg-yellow-950/40 border-yellow-800/50 hover:border-yellow-600 cursor-pointer",
		num:  "text-yellow-400",
		sub:  "text-yellow-700",
		dot:  "bg-yellow-400",
		icon: "text-yellow-400",
	},
	EN_SERVICE: {
		card: "bg-[#C8973A]/8 border-[#C8973A]/35 hover:border-[#C8973A]/60 hover:bg-[#C8973A]/15 cursor-pointer",
		num:  "text-[#C8973A]",
		sub:  "text-[#C8973A]/50",
		dot:  "bg-[#C8973A]",
		icon: "text-[#C8973A]",
	},
	ADDITION: {
		card: "bg-red-950/35 border-red-800/50 hover:border-red-600 cursor-pointer",
		num:  "text-red-400",
		sub:  "text-red-700",
		dot:  "bg-red-400",
		icon: "text-red-400",
	},
	BLOQUEE: {
		card: "bg-[#111] border-[#252525] cursor-pointer",
		num:  "text-[#363636]",
		sub:  "text-[#2a2a2a]",
		dot:  "bg-[#333]",
		icon: "text-[#333]",
	},
	INACTIVE: {
		card: "border-[#1a1a1a] opacity-20 cursor-not-allowed",
		num:  "text-[#222]",
		sub:  "text-[#1a1a1a]",
		dot:  "bg-[#222]",
		icon: "text-[#222]",
	},
};

export default function PlanDeSalleClient({ initialData, date }: Props) {
	const router = useRouter();

	const [data,            setData]            = useState<PlanDeSalleData>(initialData);
	const [refreshing,      setRefreshing]       = useState(false);
	const [loading,         setLoading]          = useState<string | null>(null);
	const [hoveredResa,     setHoveredResa]      = useState<ReservationForPlan | null>(null);
	const [modalResa,       setModalResa]        = useState<ReservationForPlan | null>(null);
	const [selectedTableId, setSelectedTableId]  = useState<string | null>(null);
	const [adminNotes,      setAdminNotes]       = useState("");
	const [blocageModal,    setBlocageModal]      = useState<TableWithStatus | null>(null);
	const [blocageMotif,    setBlocageMotif]      = useState("");

	const [walkinModal,      setWalkinModal]      = useState<TableWithStatus | null>(null);
	const [walkinName,       setWalkinName]       = useState("");
	const [walkinCovers,     setWalkinCovers]     = useState(2);
	const [walkinLoading,    setWalkinLoading]    = useState(false);
	const [walkinError,      setWalkinError]      = useState<string | null>(null);

	const [openOrderModal,   setOpenOrderModal]   = useState<TableWithStatus | null>(null);
	const [openOrderLoading, setOpenOrderLoading] = useState(false);
	const [openOrderError,   setOpenOrderError]   = useState<string | null>(null);

	const refetch = useCallback(async () => {
		setRefreshing(true);
		try {
			const res = await fetch(`/api/admin/plan?date=${date}`);
			if (res.ok) {
				const json = await res.json();
				setData(json.data);
			}
		} finally {
			setRefreshing(false);
		}
	}, [date]);

	useEffect(() => {
		let pusher: InstanceType<typeof import("pusher-js").default> | null = null;

		const initPusher = async () => {
			try {
				const Pusher = (await import("pusher-js")).default;
				pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
					cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
				});
				const channel = pusher.subscribe("admin-reservations");
				const refresh = () => void refetch();
				channel.bind("reservation-updated",   refresh);
				channel.bind("service-order-updated", refresh);
			} catch {}
		};

		void initPusher();
		return () => { pusher?.disconnect(); };
	}, [refetch]);

	const handleConfirm = async () => {
		if (!modalResa || !selectedTableId) return;
		setLoading("confirm");
		try {
			const res = await fetch(`/api/admin/reservations/${modalResa.id}/confirmer`, {
				method:  "PATCH",
				headers: { "Content-Type": "application/json" },
				body:    JSON.stringify({ tableId: selectedTableId, adminNotes }),
			});
			if (res.ok) {
				await refetch();
				closeConfirmModal();
			}
		} finally {
			setLoading(null);
		}
	};

	const handleNoShow = async (id: string) => {
		setLoading(`noshow-${id}`);
		try {
			await fetch(`/api/reservations/${id}`, {
				method:  "PATCH",
				headers: { "Content-Type": "application/json" },
				body:    JSON.stringify({ status: "NO_SHOW" }),
			});
			await refetch();
		} finally {
			setLoading(null);
		}
	};

	const handleBlock = async () => {
		if (!blocageModal) return;
		setLoading("block");
		try {
			await fetch(`/api/admin/tables/${blocageModal.id}/bloquer`, {
				method:  "POST",
				headers: { "Content-Type": "application/json" },
				body:    JSON.stringify({ date, heureDebut: "00:00", heureFin: "23:59", motif: blocageMotif }),
			});
			await refetch();
			closeBlocageModal();
		} finally {
			setLoading(null);
		}
	};

	const handleUnblock = async (tableId: string) => {
		setLoading(`unblock-${tableId}`);
		try {
			await fetch(`/api/admin/tables/${tableId}/bloquer?date=${date}`, {
				method: "DELETE",
			});
			await refetch();
			closeBlocageModal();
		} finally {
			setLoading(null);
		}
	};

	const closeConfirmModal = () => {
		setModalResa(null);
		setSelectedTableId(null);
		setAdminNotes("");
	};

	const closeBlocageModal = () => {
		setBlocageModal(null);
		setBlocageMotif("");
	};

	const openAssignModal = (resa: ReservationForPlan) => {
		setHoveredResa(null);
		setSelectedTableId(null);
		setAdminNotes("");
		setModalResa(resa);
	};

	const handleWalkin = async () => {
		if (!walkinModal || !walkinName.trim()) {
			setWalkinError("Le nom du client est requis");
			return;
		}
		setWalkinLoading(true);
		setWalkinError(null);
		try {
			const res = await fetch("/api/admin/service-orders", {
				method:  "POST",
				headers: { "Content-Type": "application/json" },
				body:    JSON.stringify({
					tableId:   walkinModal.id,
					type:      "WALK_IN",
					guestName: walkinName.trim(),
					covers:    walkinCovers,
				}),
			});
			if (!res.ok) {
				const { error, orderId } = await res.json();
				if (res.status === 409 && orderId) {
					router.push(`/admin/service/${orderId}?date=${date}`);
					return;
				}
				setWalkinError(error ?? "Erreur lors de la création");
				return;
			}
			const { data: order } = await res.json();
			router.push(`/admin/service/${order.id}?date=${date}`);
		} finally {
			setWalkinLoading(false);
		}
	};

	const closeWalkinModal = () => {
		setWalkinModal(null);
		setWalkinName("");
		setWalkinCovers(2);
		setWalkinError(null);
	};

	const handleOpenOrder = async () => {
		if (!openOrderModal?.reservation) return;
		setOpenOrderLoading(true);
		setOpenOrderError(null);
		try {
			const resa = openOrderModal.reservation;
			const res = await fetch("/api/admin/service-orders", {
				method:  "POST",
				headers: { "Content-Type": "application/json" },
				body:    JSON.stringify({
					tableId:       openOrderModal.id,
					reservationId: resa.id,
					type:          "RESERVATION",
					guestName:     resa.guestNom,
					covers:        resa.covers,
				}),
			});
			if (!res.ok) {
				const { error, orderId } = await res.json();
				if (res.status === 409 && orderId) {
					router.push(`/admin/service/${orderId}?date=${date}`);
					return;
				}
				setOpenOrderError(error ?? "Erreur lors de l'ouverture");
				return;
			}
			const { data: order } = await res.json();
			router.push(`/admin/service/${order.id}?date=${date}`);
		} finally {
			setOpenOrderLoading(false);
		}
	};

	const closeOpenOrderModal = () => {
		setOpenOrderModal(null);
		setOpenOrderError(null);
	};

	const onTableClick = (t: TableWithStatus) => {
		if (!t.isActif || t.status === "INACTIVE") return;

		if (t.status === "BLOQUEE") {
			setBlocageModal(t);
			return;
		}

		if (t.status === "EN_SERVICE" || t.status === "ADDITION") {
			if (t.serviceOrder) {
				router.push(`/admin/service/${t.serviceOrder.id}?date=${date}`);
			}
			return;
		}

		if (t.status === "CONFIRMEE") {
			if (t.reservation) setOpenOrderModal(t);
			return;
		}

		if (t.status === "EN_ATTENTE") {
			return;
		}

		if (modalResa) {
			if (t.capaciteMax >= modalResa.covers) {
				setSelectedTableId(t.id);
			}
			return;
		}

		setWalkinModal(t);
		setWalkinCovers(Math.min(2, t.capaciteMax));
	};

	const { tables, pending, confirmed, noShow, stats } = data;

	const tablesByZone = ZONES.reduce((acc, zone) => {
		acc[zone] = tables.filter((t) => t.zone === zone);
		return acc;
	}, {} as Record<string, TableWithStatus[]>);

	const activeResa       = modalResa ?? hoveredResa;
	const isModalOpen      = !!modalResa;
	const compatibleTables = modalResa
		? tables.filter((t) => t.status === "LIBRE" && t.isActif && t.capaciteMax >= modalResa.covers)
		: [];

	return (
		<div className="space-y-5">

			<div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-3">
				{(
					[
						{ label: "En attente",     value: stats.pending,     icon: Clock,           ring: stats.pending > 0,  cardCn: "bg-yellow-950/20 border-yellow-900/30", valCn: "text-yellow-400", iconCn: "text-yellow-500" },
						{ label: "Confirmées",     value: stats.confirmed,   icon: CheckCircle2,    ring: false,              cardCn: "bg-blue-950/20 border-blue-900/30",    valCn: "text-blue-400",   iconCn: "text-blue-400"   },
						{ label: "En service",     value: stats.enService,   icon: UtensilsCrossed, ring: false,              cardCn: "bg-[#1a1200] border-[#C8973A]/20",     valCn: "text-[#C8973A]",  iconCn: "text-[#C8973A]"  },
						{ label: "Addition",       value: stats.addition,    icon: Receipt,         ring: stats.addition > 0, cardCn: "bg-red-950/20 border-red-900/30",      valCn: "text-red-400",    iconCn: "text-red-400"    },
						{ label: "Tables libres",  value: stats.libres,      icon: TableProperties, ring: false,              cardCn: "bg-green-950/15 border-green-900/20",  valCn: "text-green-400",  iconCn: "text-green-500"  },
						{ label: "Bloquées",       value: stats.bloquees,    icon: Lock,            ring: false,              cardCn: "bg-[#111] border-[#222]",              valCn: "text-[#444]",     iconCn: "text-[#3a3a3a]"  },
						{ label: "Couverts prév.", value: stats.totalCovers, icon: Users,           ring: false,              cardCn: "bg-[#111] border-[#222]",              valCn: "text-[#9A8F84]",  iconCn: "text-[#5A5249]"  },
					] as const
				).map(({ label, value, icon: Icon, ring, cardCn, valCn, iconCn }) => (
					<div key={label} className={cn("relative rounded-xl border p-3", cardCn)}>
						{ring && value > 0 && (
							<span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#C8973A] text-[#0A0A0A] text-[10px] flex items-center justify-center animate-pulse">
								{value}
							</span>
						)}
						<Icon size={14} className={cn("mb-2", iconCn)} />
						<p className={cn("text-xl font-bold leading-none", valCn)}>{value}</p>
						<p className="text-[10px] text-[#5A5249] mt-1 leading-tight">{label}</p>
					</div>
				))}
			</div>

			<div className="flex items-center justify-between">
				<p className="text-xs text-[#5A5249]">
					{stats.libres} table{stats.libres > 1 ? "s" : ""} libre{stats.libres > 1 ? "s" : ""} ·{" "}
					{tables.filter((t) => t.isActif).length} actives au total
				</p>
				<button
					onClick={refetch}
					disabled={refreshing}
					className="flex items-center gap-1.5 text-xs text-[#5A5249] hover:text-[#9A8F84] transition-colors"
				>
					<RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
					{refreshing ? "Actualisation..." : "Actualiser"}
				</button>
			</div>

			<div className="grid grid-cols-1 xl:grid-cols-[260px_1fr] gap-4 items-start">

				<div className="space-y-5">

					<div>
						<div className="flex items-center gap-2 mb-2.5">
							<p className="text-[10px] font-semibold text-[#333] uppercase tracking-widest">
								En attente ({pending.length})
							</p>
						</div>

						{pending.length === 0 ? (
							<div className="text-center py-5 border border-dashed border-[#1e1e1e] rounded-xl">
								<p className="text-xs text-[#333]">Aucune demande en attente</p>
							</div>
						) : (
							<div className="space-y-2">
								{pending.map((r) => {
									const isHovered = hoveredResa?.id === r.id;
									return (
										<div
											key={r.id}
											onMouseEnter={() => setHoveredResa(r)}
											onMouseLeave={() => setHoveredResa(null)}
											className={cn(
												"rounded-xl border p-3 transition-all select-none",
												isHovered
													? "bg-yellow-950/30 border-yellow-700/50"
													: "bg-[#141414] border-[#222] hover:border-[#2a2a2a]"
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
												<span className="flex items-center gap-1"><Users size={10} /> {r.covers} cv</span>
												<span className="flex items-center gap-1"><Clock size={10} /> {r.timeSlot}</span>
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
												<button
													onClick={() => openAssignModal(r)}
													className="flex items-center gap-0.5 text-[10px] text-yellow-600 hover:text-yellow-400 transition-colors font-medium"
												>
													<Zap size={9} />
													Assigner une table
													<ChevronRight size={9} />
												</button>
											</div>
										</div>
									);
								})}
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
													<span className="ml-1 text-blue-600">· T{r.table.numero}</span>
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
												title="Marquer absent"
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

				<div className="space-y-2">
					<div className="flex items-baseline gap-2 min-h-[20px]">
						<p className="text-[10px] font-semibold text-[#333] uppercase tracking-widest">
							Plan de salle
						</p>
						{isModalOpen && modalResa && (
							<span className="text-[11px] text-yellow-500 animate-fade-in">
								— Cliquez sur une table verte pour assigner{" "}
								<strong className="text-yellow-400">{modalResa.guestFirstName}</strong>{" "}
								({modalResa.covers} cv requis)
							</span>
						)}
						{!isModalOpen && hoveredResa && (
							<span className="text-[11px] text-green-600 animate-fade-in">
								— Tables compatibles pour{" "}
								<strong className="text-green-400">{hoveredResa.guestFirstName}</strong>{" "}
								({hoveredResa.covers} cv) mises en évidence
							</span>
						)}
					</div>

					<div className="space-y-2">
						{ZONES.map((zone) => {
							const zoneTables = tablesByZone[zone] || [];
							if (zoneTables.length === 0) return null;
							const freeCount = zoneTables.filter((t) => t.status === "LIBRE" && t.isActif).length;

							return (
								<div key={zone} className="bg-[#141414] border border-[#222] rounded-xl overflow-hidden">
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
											const s            = TABLE_STYLES[t.status] || TABLE_STYLES.LIBRE;
											const isSelected   = selectedTableId === t.id;
											const isCompatible =
												activeResa !== null &&
												t.status === "LIBRE" &&
												t.isActif &&
												t.capaciteMax >= (activeResa?.covers ?? 0);
											const isIncompatible =
												activeResa !== null &&
												t.status === "LIBRE" &&
												t.isActif &&
												t.capaciteMax < (activeResa?.covers ?? 0);

											return (
												<button
													key={t.id}
													onClick={() => onTableClick(t)}
													className={cn(
														"w-[90px] h-[80px] rounded-xl border flex flex-col items-center justify-center gap-0.5 transition-all duration-150 px-1.5",
														s.card,
														isSelected && "ring-2 ring-[#C8973A] ring-offset-1 ring-offset-[#141414] border-[#C8973A]",
														isCompatible && isModalOpen && !isSelected && "ring-1 ring-green-500/60 border-green-600",
														isCompatible && !isModalOpen && "animate-pulse-subtle border-green-400 bg-green-900/60",
														isIncompatible && "opacity-20",
														t.status === "ADDITION" && "animate-pulse-subtle",
													)}
												>
													<span className={cn(
														"w-1.5 h-1.5 rounded-full shrink-0",
														s.dot,
														t.status === "EN_ATTENTE" && "animate-pulse",
														t.status === "ADDITION"   && "animate-pulse",
														isCompatible && !isModalOpen && "bg-green-300"
													)} />

													<span className={cn(
														"text-[12px] font-bold leading-tight",
														s.num,
														isCompatible && !isModalOpen && "text-green-300"
													)}>
														T{t.numero}
													</span>

													<TableCardInfo
														table={t}
														styles={s}
														isCompatible={isCompatible}
														isModalOpen={isModalOpen}
													/>
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
							{ dot: "bg-green-500",                      label: "Libre"       },
							{ dot: "bg-blue-400",                       label: "Confirmée"   },
							{ dot: "bg-yellow-400 animate-pulse",       label: "En attente"  },
							{ dot: "bg-[#C8973A]",                      label: "En service"  },
							{ dot: "bg-red-400 animate-pulse",          label: "Addition"    },
							{ dot: "bg-[#2a2a2a]",                      label: "Bloquée"     },
							{ dot: "bg-green-300 animate-pulse-subtle", label: "Compatible" },
						].map(({ dot, label }) => (
							<div key={label} className="flex items-center gap-1.5">
								<div className={cn("w-1.5 h-1.5 rounded-full", dot)} />
								<span className="text-[11px] text-[#5A5249]">{label}</span>
							</div>
						))}
					</div>
				</div>
			</div>

			<Modal
				open={isModalOpen}
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
										<Users size={11} /> {modalResa.covers} cv
									</span>
									<span className="flex items-center gap-1 text-xs text-[#9A8F84] bg-[#1a1a1a] border border-[#222] px-2 py-1 rounded-lg">
										<Clock size={11} /> {modalResa.timeSlot}
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
									<AlertTriangle size={11} className="mt-0.5 shrink-0 text-yellow-500" />
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
												className={selectedTableId === t.id ? "text-[#C8973A] mt-2" : "text-green-500 mt-2"}
											/>
											<span className={cn("text-xs font-semibold",
												selectedTableId === t.id ? "text-[#C8973A]" : "text-green-400"
											)}>
												T{t.numero}
											</span>
											<span className="text-[9px] text-[#5A5249] leading-tight">
												{t.capaciteMax}cv · {ZONE_LABELS[t.zone]?.short || t.zone}
											</span>
										</button>
									))}
								</div>
							)}
						</div>

						<div>
							<label className="text-xs text-[#5A5249] block mb-1.5">
								Notes internes (facultatif)
							</label>
							<textarea
								value={adminNotes}
								onChange={(e) => setAdminNotes(e.target.value)}
								placeholder="Préférences de placement, notes de service..."
								rows={2}
								className="w-full bg-[#0A0A0A] border border-[#222] rounded-xl px-3 py-2.5 text-sm text-[#F5F0EB] placeholder-[#2a2a2a] focus:border-[#C8973A] focus:outline-none resize-none transition-colors"
							/>
						</div>

						<div className="flex items-center justify-end gap-3 pt-1 border-t border-[#1e1e1e]">
							<button onClick={closeConfirmModal} className="px-4 py-2 text-sm text-[#5A5249] hover:text-[#9A8F84] transition-colors">
								Annuler
							</button>
							<button
								onClick={handleConfirm}
								disabled={!selectedTableId || loading === "confirm"}
								className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#C8973A] hover:bg-[#D4A445] text-[#0A0A0A] text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
							>
								{loading === "confirm" ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
								{loading === "confirm" ? "Confirmation..." : "Confirmer & envoyer l'email"}
							</button>
						</div>
					</div>
				)}
			</Modal>

			<Modal
				open={!!blocageModal}
				onClose={closeBlocageModal}
				title={blocageModal ? `Table ${blocageModal.numero} — ${ZONE_LABELS[blocageModal.zone]?.label}` : ""}
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
											Motif : <span className="text-[#F5F0EB]">{blocageModal.blocage?.motif || "Aucun"}</span>
										</span>
									</div>
									<p className="text-xs text-[#5A5249]">
										Plage : {blocageModal.blocage?.heureDebut} → {blocageModal.blocage?.heureFin}
									</p>
								</div>
								<div className="flex justify-end gap-3">
									<button onClick={closeBlocageModal} className="px-4 py-2 text-sm text-[#5A5249] hover:text-[#9A8F84] transition-colors">
										Fermer
									</button>
									<button
										onClick={() => handleUnblock(blocageModal.id)}
										disabled={loading === `unblock-${blocageModal.id}`}
										className="px-5 py-2 rounded-xl border border-red-800/50 bg-red-950/20 text-red-400 hover:bg-red-950/40 text-sm font-medium transition-colors disabled:opacity-40"
									>
										{loading === `unblock-${blocageModal.id}` ? "Déblocage..." : "Débloquer la table"}
									</button>
								</div>
							</>
						) : (
							<>
								<div>
									<label className="text-xs text-[#5A5249] block mb-1.5">Motif du blocage</label>
									<input
										value={blocageMotif}
										onChange={(e) => setBlocageMotif(e.target.value)}
										placeholder="Maintenance, VIP, Repas personnel..."
										className="w-full bg-[#0A0A0A] border border-[#222] rounded-xl px-3 py-2.5 text-sm text-[#F5F0EB] placeholder-[#2a2a2a] focus:border-[#C8973A] focus:outline-none transition-colors"
									/>
								</div>
								<p className="text-[11px] text-[#333]">
									La table sera bloquée pour toute la journée du {formatDate(new Date(date), "dd/MM/yyyy")}.
								</p>
								<div className="flex justify-end gap-3">
									<button onClick={closeBlocageModal} className="px-4 py-2 text-sm text-[#5A5249] hover:text-[#9A8F84] transition-colors">
										Annuler
									</button>
									<button
										onClick={handleBlock}
										disabled={loading === "block"}
										className="px-5 py-2.5 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#444] text-[#9A8F84] hover:text-[#F5F0EB] text-sm font-medium transition-colors disabled:opacity-40"
									>
										{loading === "block" ? "Blocage..." : "Bloquer pour aujourd'hui"}
									</button>
								</div>
							</>
						)}
					</div>
				)}
			</Modal>

			<Modal
				open={!!walkinModal}
				onClose={closeWalkinModal}
				title={walkinModal ? `Walk-in · Table ${walkinModal.numero} · ${ZONE_LABELS[walkinModal.zone]?.label}` : ""}
				description="Aucun acompte pour les walk-ins — l'addition sera soldée en fin de repas."
			>
				{walkinModal && (
					<div className="space-y-4">
						{walkinError && (
							<div className="flex items-center gap-2 text-sm text-red-400 bg-red-950/20 border border-red-900/30 rounded-xl px-3 py-2.5">
								<AlertTriangle size={13} className="shrink-0" />
								{walkinError}
							</div>
						)}

						<div>
							<label className="text-xs text-[#5A5249] block mb-1.5">Nom du client *</label>
							<input
								autoFocus
								value={walkinName}
								onChange={(e) => setWalkinName(e.target.value)}
								onKeyDown={(e) => e.key === "Enter" && handleWalkin()}
								placeholder="Ex : Famille Martin"
								className="w-full bg-[#0A0A0A] border border-[#222] rounded-xl px-3 py-2.5 text-sm text-[#F5F0EB] placeholder-[#2a2a2a] focus:border-[#C8973A] focus:outline-none transition-colors"
							/>
						</div>

						<div>
							<label className="text-xs text-[#5A5249] block mb-2">
								Nombre de couverts (max {walkinModal.capaciteMax})
							</label>
							<div className="flex items-center gap-3">
								<button
									onClick={() => setWalkinCovers((c) => Math.max(1, c - 1))}
									className="w-8 h-8 rounded-full border border-[#2a2a2a] bg-[#1a1a1a] hover:border-[#444] text-[#5A5249] hover:text-[#F5F0EB] transition-colors flex items-center justify-center"
								>
									<Minus size={13} />
								</button>
								<span className="text-lg font-bold text-[#F5F0EB] w-8 text-center">
									{walkinCovers}
								</span>
								<button
									onClick={() => setWalkinCovers((c) => Math.min(walkinModal.capaciteMax, c + 1))}
									className="w-8 h-8 rounded-full border border-[#2a2a2a] bg-[#1a1a1a] hover:border-[#444] text-[#5A5249] hover:text-[#F5F0EB] transition-colors flex items-center justify-center"
								>
									<Plus size={13} />
								</button>
							</div>
						</div>

						<div className="flex items-center justify-end gap-3 pt-1 border-t border-[#1e1e1e]">
							<button onClick={closeWalkinModal} className="px-4 py-2 text-sm text-[#5A5249] hover:text-[#9A8F84] transition-colors">
								Annuler
							</button>
							<button
								onClick={handleWalkin}
								disabled={walkinLoading || !walkinName.trim()}
								className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#C8973A] hover:bg-[#D4A445] text-[#0A0A0A] text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
							>
								{walkinLoading ? <Loader2 size={15} className="animate-spin" /> : <ConciergeBell size={15} />}
								{walkinLoading ? "Ouverture..." : "Ouvrir la commande"}
							</button>
						</div>
					</div>
				)}
			</Modal>

			<Modal
				open={!!openOrderModal}
				onClose={closeOpenOrderModal}
				title={openOrderModal ? `Table ${openOrderModal.numero} · ${ZONE_LABELS[openOrderModal.zone]?.label}` : ""}
				description="Ouvrir la prise de commande pour cette réservation confirmée."
			>
				{openOrderModal?.reservation && (
					<div className="space-y-4">
						{openOrderError && (
							<div className="flex items-center gap-2 text-sm text-red-400 bg-red-950/20 border border-red-900/30 rounded-xl px-3 py-2.5">
								<AlertTriangle size={13} className="shrink-0" />
								{openOrderError}
							</div>
						)}

						<div className="bg-[#0A0A0A] rounded-xl border border-[#1e1e1e] p-4 space-y-3">
							<div className="flex items-start justify-between gap-3">
								<div>
									<p className="text-sm font-semibold text-[#F5F0EB]">
										{openOrderModal.reservation.guestNom}
									</p>
									{openOrderModal.reservation.occasion && (
										<span className="inline-block mt-1 text-[11px] text-[#C8973A] border border-[#C8973A]/30 bg-[#C8973A]/5 px-2 py-0.5 rounded-md">
											{openOrderModal.reservation.occasion}
										</span>
									)}
								</div>
								<div className="flex items-center gap-2 shrink-0">
									<span className="flex items-center gap-1 text-xs text-[#9A8F84] bg-[#1a1a1a] border border-[#222] px-2 py-1 rounded-lg">
										<Users size={11} /> {openOrderModal.reservation.covers} cv
									</span>
									<span className="flex items-center gap-1 text-xs text-[#9A8F84] bg-[#1a1a1a] border border-[#222] px-2 py-1 rounded-lg">
										<Clock size={11} /> {openOrderModal.reservation.heure}
									</span>
								</div>
							</div>

							{openOrderModal.reservation.depositAmount !== null &&
							 openOrderModal.reservation.depositAmount !== undefined &&
							 openOrderModal.reservation.depositAmount > 0 && (
								<div className="flex items-center gap-2 text-sm text-green-400 bg-green-950/20 border border-green-900/30 rounded-lg px-3 py-2">
									<CheckCircle2 size={13} className="shrink-0" />
									Acompte encaissé : {openOrderModal.reservation.depositAmount.toFixed(2)} €
									<span className="text-xs text-green-700 ml-1">(sera déduit de l&apos;addition)</span>
								</div>
							)}
						</div>

						<p className="text-xs text-[#5A5249]">
							Le client est arrivé — ouvrez la commande pour commencer la prise des plats.
							L&apos;acompte sera automatiquement déduit de l&apos;addition finale.
						</p>

						<div className="flex items-center justify-end gap-3 pt-1 border-t border-[#1e1e1e]">
							<button onClick={closeOpenOrderModal} className="px-4 py-2 text-sm text-[#5A5249] hover:text-[#9A8F84] transition-colors">
								Annuler
							</button>
							<button
								onClick={handleOpenOrder}
								disabled={openOrderLoading}
								className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#C8973A] hover:bg-[#D4A445] text-[#0A0A0A] text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
							>
								{openOrderLoading ? <Loader2 size={15} className="animate-spin" /> : <UtensilsCrossed size={15} />}
								{openOrderLoading ? "Ouverture..." : "Ouvrir la commande"}
							</button>
						</div>
					</div>
				)}
			</Modal>
		</div>
	);
}

function TableCardInfo({
	table,
	styles,
	isCompatible,
	isModalOpen,
}: {
	table: TableWithStatus;
	styles: { icon: string; sub: string };
	isCompatible: boolean;
	isModalOpen: boolean;
}) {
	const { status, reservation, serviceOrder } = table;

	if (status === "EN_SERVICE" && serviceOrder) {
		return (
			<>
				<span className={cn("text-[9px] truncate max-w-[78px] text-center leading-tight", styles.icon)}>
					{serviceOrder.guestName.split(" ")[0]}
				</span>
				<span className={cn("text-[9px] text-center leading-tight", styles.sub)}>
					{serviceOrder.totalAmount > 0 ? `${serviceOrder.totalAmount.toFixed(0)} €` : `${serviceOrder.covers} cv`}
				</span>
			</>
		);
	}

	if (status === "ADDITION" && serviceOrder) {
		return (
			<>
				<span className={cn("text-[9px] truncate max-w-[78px] text-center leading-tight", styles.icon)}>
					{serviceOrder.guestName.split(" ")[0]}
				</span>
				<span className="text-[9px] text-red-400 font-semibold text-center leading-tight">
					{serviceOrder.totalAmount.toFixed(0)} €
				</span>
			</>
		);
	}

	if ((status === "CONFIRMEE" || status === "EN_ATTENTE") && reservation) {
		return (
			<>
				<span className={cn("text-[9px] truncate max-w-[78px] text-center leading-tight px-0.5", styles.icon)}>
					{reservation.guestNom.split(" ")[0]}
				</span>
				<span className={cn("text-[9px] text-center leading-tight", styles.sub)}>
					{reservation.covers} cv · {reservation.heure}
				</span>
				{reservation.depositAmount != null && reservation.depositAmount > 0 && (
					<span className="text-[8px] text-green-600 text-center leading-tight">
						{reservation.depositAmount.toFixed(0)} € payé
					</span>
				)}
			</>
		);
	}

	if (status === "BLOQUEE") {
		return <Lock size={10} className={styles.icon} />;
	}

	return (
		<span className={cn(
			"text-[9px]",
			styles.sub,
			isCompatible && !isModalOpen && "text-green-600"
		)}>
			{table.capaciteMax} cv
		</span>
	);
}
