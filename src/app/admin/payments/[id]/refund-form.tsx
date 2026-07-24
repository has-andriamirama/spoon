"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";
import toast from "react-hot-toast";

export default function RefundForm({ paymentId, maxAmount }: { paymentId: string; maxAmount: number }) {
  const [amount, setAmount] = useState(maxAmount.toString());
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRefund = async () => {
    if (!confirm(`Rembourser ${formatPrice(parseFloat(amount))} ?`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/payments/${paymentId}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: parseFloat(amount) }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Remboursement initié !");
      router.push("/admin/payments");
    } catch (err: any) { toast.error(err.message || "Erreur"); }
    finally { setLoading(false); }
  };

  return (
    <div className="bg-[#141414] border border-red-500/20 rounded-xl p-6 space-y-4">
      <h2 className="font-display text-xl text-red-400">Initier un remboursement</h2>
      <p className="text-sm text-[#9A8F84]">Montant maximum remboursable : <span className="text-[#F5F0EB] font-medium">{formatPrice(maxAmount)}</span></p>
      <Input label="Montant à rembourser (€)" type="number" step="0.01" min="0.01" max={maxAmount} value={amount} onChange={e => setAmount(e.target.value)} />
      <Button variant="destructive" onClick={handleRefund} loading={loading} className="w-full">Rembourser {formatPrice(parseFloat(amount) || 0)}</Button>
    </div>
  );
}
