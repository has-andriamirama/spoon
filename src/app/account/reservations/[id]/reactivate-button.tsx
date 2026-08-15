"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { RotateCcw, CreditCard } from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

interface Props {
	reservationId: string;
}

export default function ReactivateReservationButton({ reservationId }: Props) {
	const [open, setOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const router = useRouter();

	const handleReactivate = async () => {
		setLoading(true);
		try {
			const res = await fetch(`/api/reservations/${reservationId}/reactivate`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
			});
			const data = await res.json();

			if (!res.ok) throw new Error(data.error || "Erreur lors de la réactivation");

			if (data.url) {
				toast.success("Réservation réactivée ! Redirection vers le paiement…");
				window.location.href = data.url;
			} else {
				toast.success("Réservation réactivée avec succès !");
				setOpen(false);
				router.refresh();
			}
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : "Erreur inattendue";
			toast.error(message);
			setLoading(false);
		}
	};

	return (
		<>
			<div className="bg-[#141414] border border-[#222] rounded-xl p-5">
				<div className="flex items-start gap-3 mb-4">
					<RotateCcw size={17} className="text-[#C8973A] shrink-0 mt-0.5" />
					<div>
						<p className="text-sm font-medium text-[#F5F0EB] mb-1">
							Réactiver cette réservation
						</p>
						<p className="text-xs text-[#9A8F84] leading-relaxed">
							Vous pouvez réactiver cette réservation annulée. Un nouveau délai de confirmation
							de 24 h sera lancé, et un nouvel acompte vous sera demandé si nécessaire.
						</p>
					</div>
				</div>
				<Button onClick={() => setOpen(true)} className="w-full" size="sm">
					<RotateCcw size={14} className="mr-2" />
					Réactiver
				</Button>
			</div>

			<Modal
				open={open}
				onClose={() => !loading && setOpen(false)}
				title="Réactiver la réservation"
			>
				<div className="space-y-4">
					<p className="text-sm text-[#9A8F84]">
						En réactivant cette réservation :
					</p>
					<ul className="space-y-2 text-sm text-[#9A8F84]">
						<li className="flex items-start gap-2">
							<RotateCcw size={13} className="text-[#C8973A] shrink-0 mt-1" />
							<span>
								La réservation repassera en statut{" "}
								<strong className="text-[#F5F0EB]">En attente</strong> et devra être confirmée
								par notre équipe dans les 24 heures.
							</span>
						</li>
						<li className="flex items-start gap-2">
							<CreditCard size={13} className="text-[#C8973A] shrink-0 mt-1" />
							<span>
								Si votre acompte précédent a été remboursé, vous serez redirigé vers une
								nouvelle page de paiement pour régler l&apos;acompte.
							</span>
						</li>
					</ul>
				</div>

				<div className="flex gap-3 mt-6">
					<Button
						variant="secondary"
						onClick={() => setOpen(false)}
						disabled={loading}
						className="flex-1"
					>
						Annuler
					</Button>
					<Button
						onClick={handleReactivate}
						loading={loading}
						className="flex-1"
					>
						Confirmer la réactivation
					</Button>
				</div>
			</Modal>
		</>
	);
}
