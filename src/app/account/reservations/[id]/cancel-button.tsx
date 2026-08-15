"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/utils";
import { RefreshCcw, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";

interface Props {
	reservationId: string;
	refundEligible: boolean;
	depositAmount?: number;
}

export default function CancelReservationButton({
	reservationId,
	refundEligible,
	depositAmount,
}: Props) {
	const [open, setOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const router = useRouter();

	const handleCancel = async () => {
		setLoading(true);
		try {
			const res = await fetch(`/api/reservations/${reservationId}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ status: "CANCELLED_BY_CUSTOMER" }),
			});
			if (!res.ok) throw new Error();
			toast.success(
				refundEligible
					? "Réservation annulée. Votre acompte sera remboursé sous 5 à 10 jours ouvrés."
					: "Réservation annulée."
			);
			setOpen(false);
			router.refresh();
		} catch {
			toast.error("Erreur lors de l'annulation.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<>
			<Button variant="destructive" onClick={() => setOpen(true)} className="w-full">
				Annuler la réservation
			</Button>

			<Modal
				open={open}
				onClose={() => setOpen(false)}
				title="Confirmer l'annulation"
			>
				{refundEligible && depositAmount ? (
					<div className="space-y-4">
						<div className="flex items-start gap-3 bg-green-500/10 border border-green-500/20 rounded-lg p-3">
							<RefreshCcw size={15} className="text-green-400 shrink-0 mt-0.5" />
							<div>
								<p className="text-sm font-medium text-green-400 mb-0.5">
									Remboursement automatique
								</p>
								<p className="text-xs text-[#9A8F84]">
									Votre acompte de{" "}
									<span className="text-green-400 font-semibold">
										{formatPrice(depositAmount)}
									</span>{" "}
									sera remboursé automatiquement sur votre carte bancaire sous 5 à 10 jours ouvrés.
								</p>
							</div>
						</div>
						<p className="text-sm text-[#9A8F84]">
							Êtes-vous sûr de vouloir annuler cette réservation ?
						</p>
					</div>
				) : (
					<div className="space-y-4">
						<div className="flex items-start gap-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
							<AlertTriangle size={15} className="text-yellow-400 shrink-0 mt-0.5" />
							<p className="text-xs text-[#9A8F84]">
								{depositAmount
									? `Le délai de remboursement est dépassé. L'acompte de ${formatPrice(depositAmount)} ne sera pas remboursé.`
									: "Êtes-vous sûr de vouloir annuler cette réservation ?"}
							</p>
						</div>
					</div>
				)}

				<div className="flex gap-3 mt-4">
					<Button
						variant="secondary"
						onClick={() => setOpen(false)}
						className="flex-1"
					>
						Retour
					</Button>
					<Button
						variant="destructive"
						onClick={handleCancel}
						loading={loading}
						className="flex-1"
					>
						Confirmer l&apos;annulation
					</Button>
				</div>
			</Modal>
		</>
	);
}
