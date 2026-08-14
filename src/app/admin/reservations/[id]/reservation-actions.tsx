"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Clock } from "lucide-react";
import type { Payment, ReservationStatus } from "@/types";
import toast from "react-hot-toast";

interface Props {
	reservation: {
		id: string;
		status: ReservationStatus;
		payment: Payment | null;
	};
}

export default function AdminReservationActions({ reservation }: Props) {
	const router = useRouter();
	const [cancelOpen, setCancelOpen] = useState(false);
	const [cancelReason, setCancelReason] = useState("");
	const [loading, setLoading] = useState<string | null>(null);

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
			router.refresh();
		} catch {
			toast.error("Erreur lors de la mise à jour");
		} finally {
			setLoading(null);
		}
	};

	const paymentStatus = reservation.payment?.status;

	const isPaymentBlocking =
		paymentStatus === "FAILED" || paymentStatus === "PENDING";

	return (
		<div className="bg-[#141414] border border-[#222] rounded-xl p-5">
			<h3 className="font-display text-base text-[#F5F0EB] mb-4">Actions</h3>

			{paymentStatus === "PENDING" && (
				<div className="flex items-start gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-4">
					<Clock size={15} className="text-yellow-400 shrink-0 mt-0.5" />
					<p className="text-xs text-yellow-400 leading-relaxed">
						Le paiement de cette réservation est <strong>en attente de confirmation</strong>. La confirmation et le marquage « absent » sont désactivés tant que Stripe n&apos;a pas validé le paiement.
					</p>
				</div>
			)}

			{paymentStatus === "FAILED" && (
				<div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
					<AlertTriangle size={15} className="text-red-400 shrink-0 mt-0.5" />
					<p className="text-xs text-red-400 leading-relaxed">
						Le paiement de cette réservation a <strong>échoué</strong>. La confirmation et le marquage « absent » sont désactivés tant que le client n&apos;a pas réglé l&apos;acompte.
					</p>
				</div>
			)}

			<div className="flex flex-col gap-2">
				{reservation.status === "PENDING" && !isPaymentBlocking && (
					<Button
						onClick={() => updateStatus("CONFIRMED")}
						loading={loading === "CONFIRMED"}
						className="w-full"
						size="sm"
					>
						Confirmer
					</Button>
				)}

				{["PENDING", "CONFIRMED"].includes(reservation.status) && !isPaymentBlocking && (
					<Button
						onClick={() => updateStatus("NO_SHOW")}
						loading={loading === "NO_SHOW"}
						variant="secondary"
						size="sm"
						className="w-full"
					>
						Marquer absent
					</Button>
				)}

				{["PENDING", "CONFIRMED"].includes(reservation.status) && (
					<Button
						onClick={() => setCancelOpen(true)}
						variant="destructive"
						size="sm"
						className="w-full"
					>
						Annuler la réservation
					</Button>
				)}

				{reservation.status === "CONFIRMED" && (
					<Button
						onClick={() => updateStatus("COMPLETED")}
						loading={loading === "COMPLETED"}
						variant="secondary"
						size="sm"
						className="w-full"
					>
						Marquer terminée
					</Button>
				)}
			</div>

			<Modal
				open={cancelOpen}
				onClose={() => setCancelOpen(false)}
				title="Annuler la réservation"
			>
				<Textarea
					label="Motif d'annulation (optionnel)"
					value={cancelReason}
					onChange={(e) => setCancelReason(e.target.value)}
					placeholder="Ex: Fermeture exceptionnelle..."
				/>
				<div className="flex gap-3 mt-4">
					<Button
						variant="secondary"
						onClick={() => setCancelOpen(false)}
						className="flex-1"
					>
						Retour
					</Button>
					<Button
						variant="destructive"
						onClick={() => {
							updateStatus("CANCELLED_BY_ADMIN", cancelReason);
							setCancelOpen(false);
						}}
						className="flex-1"
					>
						Confirmer l&apos;annulation
					</Button>
				</div>
			</Modal>
		</div>
	);
}
