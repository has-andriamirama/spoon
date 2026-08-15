"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RotateCcw, AlertTriangle, Clock } from "lucide-react";
import toast from "react-hot-toast";

interface Props {
	reservationId: string;
	paymentStatus: "FAILED" | "PENDING";
}

export default function RetryPaymentButton({ reservationId, paymentStatus }: Props) {
	const [loading, setLoading] = useState(false);

	const handleRetry = async () => {
		setLoading(true);
		try {
			const res = await fetch("/api/payments/retry-checkout", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ reservationId }),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Erreur lors de la relance");
			if (data.url) window.location.href = data.url;
		} catch (err: unknown) {
			toast.error(err instanceof Error ? err.message : "Erreur inattendue");
			setLoading(false);
		}
	};

	const isPending = paymentStatus === "PENDING";

	return (
		<div
			className={`border rounded-xl p-5 ${
				isPending
					? "bg-yellow-500/5 border-yellow-500/20"
					: "bg-red-500/5 border-red-500/20"
			}`}
		>
			<div className="flex items-start gap-3 mb-4">
				{isPending ? (
					<Clock size={18} className="text-yellow-400 shrink-0 mt-0.5" />
				) : (
					<AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
				)}
				<div>
					<p
						className={`text-sm font-medium mb-1 ${
							isPending ? "text-yellow-400" : "text-red-400"
						}`}
					>
						{isPending ? "Paiement interrompu" : "Paiement échoué"}
					</p>
					<p className="text-xs text-[#9A8F84] leading-relaxed">
						{isPending
							? "Le paiement a été interrompu (problème réseau ou fermeture de la page). Relancez le paiement pour finaliser votre réservation."
							: "L'acompte n'a pas pu être prélevé. Relancez le paiement pour valider votre réservation."}
					</p>
				</div>
			</div>
			<Button
				onClick={handleRetry}
				loading={loading}
				className="w-full"
				size="sm"
			>
				<RotateCcw size={14} className="mr-2" />
				Relancer le paiement
			</Button>
		</div>
	);
}
