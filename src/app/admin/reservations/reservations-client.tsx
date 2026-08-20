"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { RESERVATION_STATUSES, PAYMENT_STATUSES } from "@/lib/constants";
import Link from "next/link";
import { Search, Eye, XCircle, Loader2, Plus, Copy } from "lucide-react";
import toast from "react-hot-toast";
import type { Payment, ReservationStatus } from "@/types";

interface Reservation {
	id: string;
	guestFirstName: string;
	guestLastName: string;
	guestEmail: string;
	date: Date;
	timeSlot: string;
	covers: number;
	status: ReservationStatus;
	payment: (Payment & { checkoutUrl?: string | null }) | null;
}

interface Props {
	reservations: Reservation[];
	filterStatus?: string;
	filterDate?: string;
}

const variantMap: Record<string, "yellow" | "green" | "red" | "gray" | "orange" | "blue"> = {
	yellow: "yellow",
	green: "green",
	red: "red",
	gray: "gray",
	orange: "orange",
	blue: "blue",
};

const CANCELLABLE_STATUSES: ReservationStatus[] = ["PENDING", "CONFIRMED"];

export default function AdminReservationsClient({ reservations, filterStatus, filterDate }: Props) {
	const router = useRouter();

	const [cancelTarget, setCancelTarget] = useState<Reservation | null>(null);
	const [cancelReason, setCancelReason] = useState("");
	const [cancelling, setCancelling] = useState(false);

	const openCancelModal = (r: Reservation) => {
		setCancelTarget(r);
		setCancelReason("");
	};

	const closeCancelModal = () => {
		setCancelTarget(null);
		setCancelReason("");
	};

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
			closeCancelModal();
			router.refresh();
		} catch {
			toast.error("Erreur lors de l'annulation");
		} finally {
			setCancelling(false);
		}
	};

	return (
		<div>
			<div className="flex items-center justify-between mb-6">
				<h1 className="font-display text-3xl text-[#F5F0EB]">Réservations</h1>
				<Link href="/admin/reservations/calendar" className="text-sm text-[#C8973A] hover:underline">
					Vue calendrier
				</Link>
			</div>

			<div className="bg-[#141414] border border-[#222] rounded-xl p-4 mb-6 flex flex-wrap gap-4">
				<form className="flex flex-wrap gap-3 items-end">
					<div>
						<label className="text-xs text-[#5A5249] block mb-1">Date</label>
						<input
							type="date"
							name="date"
							defaultValue={filterDate}
							className="h-9 px-3 rounded-lg bg-[#0A0A0A] border border-[#222] text-sm text-[#F5F0EB] focus:border-[#C8973A] focus:outline-none"
						/>
					</div>
					<div>
						<label className="text-xs text-[#5A5249] block mb-1">Statut</label>
						<select
							name="status"
							defaultValue={filterStatus || ""}
							className="h-9 px-3 rounded-lg bg-[#0A0A0A] border border-[#222] text-sm text-[#F5F0EB] focus:border-[#C8973A] focus:outline-none"
						>
							<option value="">Tous</option>
							{Object.entries(RESERVATION_STATUSES).map(([k, v]) => (
								<option key={k} value={k}>{v.label}</option>
							))}
						</select>
					</div>
					<button
						type="submit"
						className="h-9 px-4 bg-[#222] hover:bg-[#333] text-[#9A8F84] hover:text-[#F5F0EB] rounded-lg text-sm transition-colors flex items-center gap-2"
					>
						<Search size={14} /> Filtrer
					</button>
					<Link
						href="/admin/reservations"
						className="h-9 px-4 text-[#5A5249] hover:text-[#9A8F84] rounded-lg text-sm transition-colors flex items-center"
					>
						Réinitialiser
					</Link>
				</form>
			</div>

			<div className="bg-[#141414] border border-[#222] rounded-xl overflow-hidden">
				{reservations.length === 0 ? (
					<p className="text-center py-16 text-[#5A5249]">Aucune réservation trouvée</p>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full">
							<thead>
								<tr className="border-b border-[#222]">
									{["Client", "Date", "Heure", "Couverts", "Statut", "Paiement", "Actions"].map((h) => (
										<th
											key={h}
											className={`text-left px-5 py-3.5 text-xs font-semibold text-[#5A5249] uppercase tracking-wider${h === "Actions" ? " text-center" : ""}`}
										>
											{h}
										</th>
									))}
								</tr>
							</thead>
							<tbody className="divide-y divide-[#1a1a1a]">
								{reservations.map((r) => {
									const st = RESERVATION_STATUSES[r.status];
									const pst = r.payment ? PAYMENT_STATUSES[r.payment.status] : PAYMENT_STATUSES.NONE;
									const isCancellable = CANCELLABLE_STATUSES.includes(r.status);

									return (
										<tr key={r.id} className="group hover:bg-[#1a1a1a] transition-colors">
											<td className="px-5 py-4">
												<p className="text-sm text-[#F5F0EB] font-medium">
													{r.guestFirstName} {r.guestLastName}
												</p>
												<p className="text-xs text-[#5A5249]">{r.guestEmail}</p>
											</td>
											<td className="px-5 py-4 text-sm text-[#9A8F84] whitespace-nowrap">
												{formatDate(r.date, "dd/MM/yyyy")}
											</td>
											<td className="px-5 py-4 text-sm text-[#9A8F84]">{r.timeSlot}</td>
											<td className="px-5 py-4 text-sm text-[#9A8F84]">{r.covers}</td>
											<td className="px-5 py-4">
												<Badge variant={variantMap[st.color]}>{st.label}</Badge>
											</td>
											<td className="px-5 py-4">
												{r.payment ? (
													<div className="flex items-center gap-2">
														<Badge variant={variantMap[pst.color]}>{pst.label}</Badge>
														{r.payment.status === "PENDING" && r.payment.checkoutUrl && (
															<button
																type="button"
																onClick={() => copyPaymentLink(r.payment!.checkoutUrl!)}
																title="Copier le lien Stripe"
																className="p-1 rounded-md text-[#5A5249] hover:text-[#C8973A] hover:bg-[#252525] transition-colors"
															>
																<Copy size={13} />
															</button>
														)}
													</div>
												) : "—"}
											</td>

											<td className="px-5 py-4">
												<div className="flex items-center justify-center gap-1">
													<Link
														href={`/admin/reservations/${r.id}`}
														title="Voir la réservation"
														className="p-1.5 rounded-lg text-[#5A5249] hover:text-[#9A8F84] hover:bg-[#252525] opacity-0 group-hover:opacity-100 transition-all"
													>
														<Eye size={14} />
													</Link>

													{isCancellable ? (
														<button
															onClick={() => openCancelModal(r)}
															title="Annuler la réservation"
															className="p-1.5 rounded-lg text-[#5A5249] hover:text-red-400 hover:bg-red-950/30 opacity-0 group-hover:opacity-100 transition-all"
														>
															<XCircle size={14} />
														</button>
													) : (
														<span className="p-1.5 w-[30px]" />
													)}
												</div>
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				)}
			</div>

			<Modal
				open={!!cancelTarget}
				onClose={closeCancelModal}
				title="Annuler la réservation"
			>
				{cancelTarget && (
					<>
						<p className="text-sm text-[#9A8F84] mb-4">
							Vous allez annuler la réservation de{" "}
							<span className="text-[#F5F0EB] font-medium">
								{cancelTarget.guestFirstName} {cancelTarget.guestLastName}
							</span>{" "}
							du{" "}
							<span className="text-[#F5F0EB]">
								{formatDate(cancelTarget.date, "dd/MM/yyyy")} à {cancelTarget.timeSlot}
							</span>.
						</p>

						<Textarea
							label="Motif d'annulation (optionnel)"
							value={cancelReason}
							onChange={(e) => setCancelReason(e.target.value)}
							placeholder="Ex : Fermeture exceptionnelle..."
						/>

						<div className="flex gap-3 mt-4">
							<Button
								variant="secondary"
								onClick={closeCancelModal}
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
										Annulation...
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
