"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RotateCcw, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";

interface Props {
	reservationId: string;
}

export default function RetryPaymentButton({ reservationId }: Props) {
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

			if (!res.ok) {
				throw new Error(data.error || "Erreur lors de la relance du paiement");
			}

			if (data.url) {
				window.location.href = data.url;
			}
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : "Erreur inattendue";
			toast.error(message);
			setLoading(false);
		}
	};

	return (
		<div className="bg-red-500/5 border border-red-500/20 rounded-xl p-5">
			<div className="flex items-start gap-3 mb-4">
				<AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
				<div>
					<p className="text-sm font-medium text-red-400 mb-1">Paiement échoué</p>
					<p className="text-xs text-[#9A8F84] leading-relaxed">
						L&apos;acompte n&apos;a pas pu être prélevé. Votre réservation est en attente de réglement. Relancez le paiement pour la confirmer.
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
