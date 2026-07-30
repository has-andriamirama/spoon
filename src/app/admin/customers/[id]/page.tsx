import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { formatDate, formatPrice } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { RESERVATION_STATUSES } from "@/lib/constants";
import Link from "next/link";
import { ArrowLeft, Calendar, Mail, Phone } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminCustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customer = await prisma.user.findUnique({
    where: { id },
    include: {
      reservations: { include: { payment: true }, orderBy: { date: "desc" }, take: 20 },
      invoices: { orderBy: { issuedAt: "desc" }, take: 10 },
    },
  });
  if (!customer) notFound();

  const totalSpent = customer.reservations.reduce((s, r) => s + (r.payment?.status === "PAID" ? r.payment.amount : 0), 0);
  const variantMap: Record<string, any> = { yellow: "yellow", green: "green", red: "red", gray: "gray", orange: "orange" };

  return (
    <div>
      <Link href="/admin/customers" className="inline-flex items-center gap-2 text-sm text-[#9A8F84] hover:text-[#F5F0EB] mb-6 transition-colors"><ArrowLeft size={16} /> Retour</Link>
      <h1 className="font-display text-3xl text-[#F5F0EB] mb-2">{customer.firstName} {customer.lastName}</h1>
      <p className="text-[#5A5249] text-sm mb-8">Client depuis le {formatDate(customer.createdAt)}</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-[#141414] border border-[#222] rounded-xl p-5">
          <p className="text-xs text-[#5A5249] mb-1">Total dépensé</p>
          <p className="font-display text-2xl text-[#C8973A]">{formatPrice(totalSpent)}</p>
        </div>
        <div className="bg-[#141414] border border-[#222] rounded-xl p-5">
          <p className="text-xs text-[#5A5249] mb-1">Réservations</p>
          <p className="font-display text-2xl text-[#F5F0EB]">{customer.reservations.length}</p>
        </div>
        <div className="bg-[#141414] border border-[#222] rounded-xl p-5 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-sm text-[#9A8F84]"><Mail size={14} className="text-[#C8973A]" />{customer.email}</div>
          {customer.phone && <div className="flex items-center gap-2 text-sm text-[#9A8F84]"><Phone size={14} className="text-[#C8973A]" />{customer.phone}</div>}
        </div>
      </div>

      <div className="bg-[#141414] border border-[#222] rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#222]"><h2 className="font-display text-lg text-[#F5F0EB]">Historique des réservations</h2></div>
        {customer.reservations.length === 0 ? (
          <p className="text-center py-10 text-[#5A5249] text-sm">Aucune réservation</p>
        ) : (
          <table className="w-full">
            <thead><tr className="border-b border-[#1a1a1a]">
              {["Date","Heure","Couverts","Statut","Paiement",""].map(h => <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-[#5A5249] uppercase tracking-wider">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-[#1a1a1a]">
              {customer.reservations.map(r => {
                const status = RESERVATION_STATUSES[r.status];
                return (
                  <tr key={r.id} className="hover:bg-[#1a1a1a] transition-colors">
                    <td className="px-5 py-3.5 text-sm text-[#F5F0EB]">{formatDate(r.date, "dd/MM/yyyy")}</td>
                    <td className="px-5 py-3.5 text-sm text-[#9A8F84]">{r.timeSlot}</td>
                    <td className="px-5 py-3.5 text-sm text-[#9A8F84]">{r.covers}</td>
                    <td className="px-5 py-3.5"><Badge variant={variantMap[status.color]}>{status.label}</Badge></td>
                    <td className="px-5 py-3.5 text-sm text-[#9A8F84]">{r.payment?.status === "PAID" ? <span className="text-green-400">{formatPrice(r.payment.amount)}</span> : "—"}</td>
                    <td className="px-5 py-3.5"><Link href={`/admin/reservations/${r.id}`} className="text-xs text-[#C8973A] hover:underline">Voir</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
