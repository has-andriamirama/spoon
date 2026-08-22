"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
	CheckCircle2,
	XCircle,
	UserX,
	Flag,
	Clock,
	AlertTriangle,
	Loader2,
	TableProperties,
} from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ZONE_LABELS } from "@/lib/constants";
import type { ReservationStatus, ZoneTable, PaymentStatus } from "@/types";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface TableInfo {
	id: string;
	numero: number;
	zone: ZoneTable;
	capaciteMax: number;
	isActif: boolean;
}

interface PaymentInfo {
	id: string;
	status: PaymentStatus;
	amount: number;
	type: string;
}

interface Props {
	reservation: {
		id: string;
		status: ReservationStatus;
		covers: number;
		payment: PaymentInfo | null;
	};
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function ReservationActions({ reservation }: Props) {
	const router = useRouter();

	// Modal states
	const [confirmOpen,  setConfirmOpen]  = useState(false);
	const [cancelOpen,   setCancelOpen]   = useState(false);

	// Form state for confirm modal
	const [tables,          setTables]          = useState<TableInfo[]>([]);
	const [tablesLoading,   setTablesLoading]   = useState(false);
	const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
	const [adminNotes,      setAdminNotes]       = useState("");
	const [cancelReason,    setCancelReason]     = useState("");

	// Loading states
	const [loading, setLoading] = useState<string | null>(null);

	// ── Helpers ──

	const isPaymentBlocking =
		reservation.payment?.status === "PENDING" ||
		reservation.payment?.status === "FAILED";

	const isPending   = reservation.status === "PENDING";
	const isConfirmed = reservation.status === "CONFIRMED";

	// ── Fetch available tables when confirm modal opens ──
	const openConfirmModal = useCallback(async () => {
		setConfirmOpen(true);
		setSelectedTableId(null);
		setAdminNotes("");
		setTablesLoading(true);
		try {
			const res = await fetch("/api/admin/tables");
			const data = await res.json();
			const all: TableInfo[] = data.data ?? [];
			// Only show active tables with enough capacity
			setTables(all.filter((t) => t.isActif && t.capaciteMax >= reservation.covers));
		} catch {
			toast.error("Impossible de charger les tables");
		} finally {
			setTablesLoading(false);
		}
	}, [reservation.covers]);

	// ── Confirm + assign table ──
	const handleConfirm = async () => {
		if (!selectedTableId) return;
		setLoading("confirm");
		try {
			const res = await fetch(`/api/admin/reservations/${reservation.id}/confirmer`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					tableId:    selectedTableId,
					adminNotes: adminNotes || undefined,
				}),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error ?? "Erreur");
			toast.success("Réservation confirmée — email envoyé au client");
			setConfirmOpen(false);
			router.refresh();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Erreur lors de la confirmation");
		} finally {
			setLoading(null);
		}
	};

	// ── Generic status update (NO_SHOW, COMPLETED, CANCELLED_BY_ADMIN) ──
	const updateStatus = async (status: string, reason?: string) => {
		setLoading(status);
		try {
			const res = await fetch(`/api/reservations/${reservation.id}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ status, cancellationReason: reason }),
			});
			if (!res.ok) throw new Error();
			toast.success("Statut mis à jour");
			setCancelOpen(false);
			router.refresh();
		} catch {
			toast.error("Erreur lors de la mise à jour");
		} finally {
			setLoading(null);
		}
	};

	// ─── Render ───────────────────────────────────────────────────────────────

	return (
		<>
			{/* ── Payment blocking warnings ── */}
			{reservation.payment?.status === "PENDING" && (
				<div className="flex items-start gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3.5 mb-4">
					<Clock size={14} className="text-yellow-400 shrink-0 mt-0.5" />
					<p className="text-xs text-yellow-400 leading-relaxed">
						Le paiement est{" "}
						<strong>en attente de confirmation Stripe</strong>. La confirmation et
						le marquage « absent » sont désactivés.
					</p>
				</div>
			)}
			{reservation.payment?.status === "FAILED" && (
				<div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3.5 mb-4">
					<AlertTriangle size={14} className="text-red-400 shrink-0 mt-0.5" />
					<p className="text-xs text-red-400 leading-relaxed">
						Le paiement a <strong>échoué</strong>. La confirmation et le marquage
						« absent » sont désactivés tant que le client n'a pas réglé l'acompte.
					</p>
				</div>
			)}

			{/* ── Action buttons ── */}
			<div className="flex flex-col sm:flex-row gap-2">
				{/* Confirm + assign table (PENDING only) */}
				{isPending && !isPaymentBlocking && (
					<button
						onClick={openConfirmModal}
						disabled={loading === "confirm"}
						className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl bg-[#C8973A] hover:bg-[#D4A445] text-[#0A0A0A] text-sm font-semibold transition-colors disabled:opacity-40"
					>
						{loading === "confirm" ? (
							<Loader2 size={14} className="animate-spin" />
						) : (
							<CheckCircle2 size={14} />
						)}
						Confirmer
					</button>
				)}

				{/* Mark no-show */}
				{(isPending || isConfirmed) && !isPaymentBlocking && (
					<button
						onClick={() => updateStatus("NO_SHOW")}
						disabled={!!loading}
						className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl border border-[#333] bg-transparent text-sm text-[#9A8F84] hover:text-[#F5F0EB] hover:bg-[#1a1a1a] transition-colors disabled:opacity-40"
					>
						{loading === "NO_SHOW" ? (
							<Loader2 size={14} className="animate-spin" />
						) : (
							<UserX size={14} />
						)}
						Marquer absent
					</button>
				)}

				{/* Mark completed */}
				{isConfirmed && (
					<button
						onClick={() => updateStatus("COMPLETED")}
						disabled={!!loading}
						className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl border border-[#333] bg-transparent text-sm text-[#9A8F84] hover:text-[#F5F0EB] hover:bg-[#1a1a1a] transition-colors disabled:opacity-40"
					>
						{loading === "COMPLETED" ? (
							<Loader2 size={14} className="animate-spin" />
						) : (
							<Flag size={14} />
						)}
						Marquer terminée
					</button>
				)}

				{/* Cancel */}
				{(isPending || isConfirmed) && (
					<button
						onClick={() => { setCancelReason(""); setCancelOpen(true); }}
						disabled={!!loading}
						className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl border border-red-500/20 bg-transparent text-sm text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40"
					>
						{loading === "CANCELLED_BY_ADMIN" ? (
							<Loader2 size={14} className="animate-spin" />
						) : (
							<XCircle size={14} />
						)}
						Annuler
					</button>
				)}
			</div>

			{/* ── Confirm + assign table modal ── */}
			<Modal
				open={confirmOpen}
				onClose={() => setConfirmOpen(false)}
				title="Confirmer la réservation"
				description="Assignez une table puis confirmez pour envoyer l'email au client."
				className="max-w-xl"
			>
				<div className="space-y-5">
					{/* Table picker */}
					<div>
						<p className="text-xs font-medium text-[#5A5249] mb-2">
							Choisir une table (minimum {reservation.covers} couverts requis)
						</p>

						{tablesLoading ? (
							<div className="flex items-center justify-center py-8">
								<Loader2 size={18} className="animate-spin text-[#5A5249]" />
							</div>
						) : tables.length === 0 ? (
							<div className="text-center py-5 border border-dashed border-red-900/30 rounded-xl">
								<p className="text-sm text-red-400">
									Aucune table disponible avec {reservation.covers} couverts
								</p>
							</div>
						) : (
							<div className="flex flex-wrap gap-2">
								{tables.map((t) => {
									const isSelected = selectedTableId === t.id;
									return (
										<button
											key={t.id}
											onClick={() => setSelectedTableId(t.id)}
											className={cn(
												"flex flex-col items-center gap-1 w-20 h-[68px] rounded-xl border transition-all text-center px-1",
												isSelected
													? "bg-[#C8973A]/10 border-[#C8973A]/60 ring-1 ring-[#C8973A]/30"
													: "bg-green-950/30 border-green-900/50 hover:border-green-600"
											)}
										>
											<TableProperties
												size={13}
												className={cn("mt-2", isSelected ? "text-[#C8973A]" : "text-green-500")}
											/>
											<span
												className={cn(
													"text-xs font-semibold",
													isSelected ? "text-[#C8973A]" : "text-green-400"
												)}
											>
												T{t.numero}
											</span>
											<span className="text-[9px] text-[#5A5249] leading-tight">
												{t.capaciteMax}cv · {ZONE_LABELS[t.zone]?.short ?? t.zone}
											</span>
										</button>
									);
								})}
							</div>
						)}
					</div>

					{/* Admin notes */}
					<div>
						<label className="text-xs text-[#5A5249] block mb-1.5">
							Notes internes (facultatif)
						</label>
						<textarea
							value={adminNotes}
							onChange={(e) => setAdminNotes(e.target.value)}
							placeholder="Préférences de placement, notes de service…"
							rows={2}
							className="w-full bg-[#0A0A0A] border border-[#222] rounded-xl px-3 py-2.5 text-sm text-[#F5F0EB] placeholder:text-[#2a2a2a] focus:border-[#C8973A] focus:outline-none resize-none transition-colors"
						/>
					</div>

					{/* Modal actions */}
					<div className="flex items-center justify-end gap-3 pt-1 border-t border-[#1e1e1e]">
						<button
							onClick={() => setConfirmOpen(false)}
							className="px-4 py-2 text-sm text-[#5A5249] hover:text-[#9A8F84] transition-colors"
						>
							Annuler
						</button>
						<button
							onClick={handleConfirm}
							disabled={!selectedTableId || loading === "confirm"}
							className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#C8973A] hover:bg-[#D4A445] text-[#0A0A0A] text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
						>
							{loading === "confirm" ? (
								<Loader2 size={15} className="animate-spin" />
							) : (
								<CheckCircle2 size={15} />
							)}
							{loading === "confirm" ? "Confirmation…" : "Confirmer & envoyer l'email"}
						</button>
					</div>
				</div>
			</Modal>

			{/* ── Cancel modal ── */}
			<Modal
				open={cancelOpen}
				onClose={() => setCancelOpen(false)}
				title="Annuler la réservation"
			>
				<Textarea
					label="Motif d'annulation (optionnel)"
					value={cancelReason}
					onChange={(e) => setCancelReason(e.target.value)}
					placeholder="Ex : Fermeture exceptionnelle…"
				/>
				<div className="flex gap-3 mt-4">
					<Button
						variant="secondary"
						onClick={() => setCancelOpen(false)}
						className="flex-1"
						disabled={loading === "CANCELLED_BY_ADMIN"}
					>
						Retour
					</Button>
					<Button
						variant="destructive"
						onClick={() => updateStatus("CANCELLED_BY_ADMIN", cancelReason)}
						className="flex-1"
						loading={loading === "CANCELLED_BY_ADMIN"}
					>
						Confirmer l&apos;annulation
					</Button>
				</div>
			</Modal>
		</>
	);
}
