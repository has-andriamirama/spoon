"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatPrice, getErrorMessage } from "@/lib/utils";
import toast from "react-hot-toast";
import { RotateCcw, AlertTriangle } from "lucide-react";

export default function RefundForm({
	paymentId,
	maxAmount,
}: {
	paymentId: string;
	maxAmount: number;
}) {
	const [amount,  setAmount]  = useState(maxAmount.toString());
	const [loading, setLoading] = useState(false);
	const router = useRouter();

	const parsedAmount = parseFloat(amount) || 0;
	const isValid      = parsedAmount > 0 && parsedAmount <= maxAmount;

	const handleRefund = async () => {
		if (!isValid) return;
		if (!confirm(`Rembourser ${formatPrice(parsedAmount)} ? Cette action est irréversible.`)) return;
		setLoading(true);
		try {
			const res = await fetch(`/api/payments/${paymentId}/refund`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ amount: parsedAmount }),
			});
			if (!res.ok) throw new Error((await res.json()).error);
			toast.success("Remboursement initié avec succès !");
			router.push("/admin/payments");
		} catch (error: unknown) {
			toast.error(getErrorMessage(error));
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="pb-5 border-t border-[#222]">

			{/* Header */}
			<div className="px-6 py-4 border-b border-red-500/10 flex items-center gap-3">
				<div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
					<RotateCcw size={15} className="text-red-400" />
				</div>
				<div>
					<h2 className="font-display text-base text-red-400">Initier un remboursement</h2>
					<p className="text-xs text-[#5A5249] mt-0.5">
						Montant maximum remboursable :{" "}
						<span className="text-[#F5F0EB] font-medium">{formatPrice(maxAmount)}</span>
					</p>
				</div>
			</div>

			{/* Body */}
			<div className="px-6 py-5 space-y-4">
				<div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/5 border border-red-500/10">
					<AlertTriangle size={14} className="text-red-400 shrink-0 mt-0.5" />
					<p className="text-xs text-[#9A8F84]">
						Le remboursement est traité directement via Stripe et est <strong className="text-red-400">irréversible</strong>.
						Vérifiez le montant avant de confirmer.
					</p>
				</div>
				<Input
					label="Montant à rembourser (€)"
					type="number"
					step="0.01"
					min="0.01"
					max={maxAmount}
					value={amount}
					onChange={(e) => setAmount(e.target.value)}
				/>
				<Button
					variant="destructive"
					onClick={handleRefund}
					loading={loading}
					disabled={!isValid}
					className="w-full"
				>
					<RotateCcw size={14} />
					Rembourser {isValid ? formatPrice(parsedAmount) : ""}
				</Button>
			</div>
		</div>
	);
}
