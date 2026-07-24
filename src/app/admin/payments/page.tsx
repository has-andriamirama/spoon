import { prisma } from "@/lib/prisma";
import { formatDate, formatPrice } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { PAYMENT_STATUSES } from "@/lib/constants";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = { title: "Paiements" };

export default async function AdminPaymentsPage() {
  const payments = await prisma.payment.findMany({ include: { reservation: { select: { guestFirstName: true, guestLastName: true, date: true, timeSlot: true } } }, orderBy: { createdAt: "desc" }, take: 100 });
  const total = payments.filter(p => p.status === "PAID").reduce((s, p) => s + p.amount, 0);
  const variantMap: Record<string, any> = { gray: "gray", yellow: "yellow", green: "green", blue: "blue", red: "red" };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-3xl text-[#F5F0EB]">Paiements</h1>
        <div className="bg-[#141414] border border-[#222] rounded-lg px-4 py-2 text-sm"><span className="text-[#5A5249]">Total encaissé : </span><span className="text-[#C8973A] font-semibold">{formatPrice(total)}</span></div>
      </div>
      <div className="bg-[#141414] border border-[#222] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead><tr className="border-b border-[#222]">
            {["Client","Date résv.","Montant","Type","Statut","Stripe ID","Actions"].map(h => <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-[#5A5249] uppercase tracking-wider">{h}</th>)}
          </tr></thead>
          <tbody className="divide-y divide-[#1a1a1a]">
            {payments.map(p => {
              const pStatus = PAYMENT_STATUSES[p.status];
              return (
                <tr key={p.id} className="hover:bg-[#1a1a1a] transition-colors">
                  <td className="px-5 py-4 text-sm text-[#F5F0EB]">{p.reservation.guestFirstName} {p.reservation.guestLastName}</td>
                  <td className="px-5 py-4 text-sm text-[#9A8F84]">{formatDate(p.reservation.date, "dd/MM/yyyy")} {p.reservation.timeSlot}</td>
                  <td className="px-5 py-4 text-sm font-semibold text-[#C8973A]">{formatPrice(p.amount)}</td>
                  <td className="px-5 py-4 text-xs text-[#5A5249]">{p.type === "DEPOSIT" ? "Acompte" : "Complet"}</td>
                  <td className="px-5 py-4"><Badge variant={variantMap[pStatus.color]}>{pStatus.label}</Badge></td>
                  <td className="px-5 py-4 text-xs text-[#5A5249] font-mono">{p.stripePaymentIntentId?.slice(-12) || "—"}</td>
                  <td className="px-5 py-4">
                    {p.status === "PAID" && <Link href={`/admin/payments/${p.id}`} className="text-xs text-[#C8973A] hover:underline">Rembourser</Link>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
