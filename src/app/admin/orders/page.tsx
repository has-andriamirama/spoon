import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Plus, Receipt, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDateTime, formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Commandes sur place" };

const statusInfo: Record<string, { label: string; variant: "yellow" | "green" | "red" | "gray" | "blue" | "orange" }> = {
  OPEN: { label: "En cours", variant: "yellow" }, SUBMITTED: { label: "Envoyée", variant: "blue" }, PREPARING: { label: "Préparation", variant: "orange" }, READY: { label: "Prête", variant: "green" }, SERVED: { label: "Servie", variant: "blue" }, PAID: { label: "Réglée", variant: "green" }, CANCELLED: { label: "Annulée", variant: "red" },
};

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<{ status?: string; date?: string }> }) {
  const { status, date } = await searchParams;
  const where: Record<string, unknown> = {};
  if (status && Object.keys(statusInfo).includes(status)) where.status = status;
  if (date) where.openedAt = { gte: new Date(`${date}T00:00:00`), lte: new Date(`${date}T23:59:59.999`) };
  const orders = await prisma.order.findMany({
    where,
    include: { reservation: { select: { id: true, guestFirstName: true, guestLastName: true, date: true, timeSlot: true } }, tables: { where: { releasedAt: null }, include: { table: true } }, items: { select: { quantity: true } } },
    orderBy: { openedAt: "desc" }, take: 200,
  });
  const totalOpen = orders.filter((o) => ["OPEN", "SUBMITTED", "PREPARING", "READY", "SERVED"].includes(o.status)).length;
  const totalDue = orders.filter((o) => o.status !== "CANCELLED").reduce((sum, o) => sum + o.dueAmount, 0);

  return <div>
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6"><div><p className="text-xs uppercase tracking-[0.18em] text-[#C8973A] mb-2">Service en salle</p><h1 className="font-display text-3xl text-[#F5F0EB]">Commandes sur place</h1><p className="text-sm text-[#5A5249] mt-1">Une seule addition pour les clients réservés ou arrivés directement au restaurant.</p></div><Link href="/admin/orders/new" className="inline-flex items-center justify-center gap-2 bg-[#C8973A] hover:bg-[#E8B04A] text-[#0A0A0A] font-semibold text-sm px-4 py-2.5 rounded-lg"><Plus size={16} /> Nouvelle commande</Link></div>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6"><div className="bg-[#141414] border border-[#222] rounded-xl p-4"><p className="text-xs text-[#5A5249]">Commandes affichées</p><p className="font-display text-2xl text-[#F5F0EB] mt-1">{orders.length}</p></div><div className="bg-[#141414] border border-[#222] rounded-xl p-4"><p className="text-xs text-[#5A5249]">En service</p><p className="font-display text-2xl text-yellow-400 mt-1">{totalOpen}</p></div><div className="bg-[#141414] border border-[#222] rounded-xl p-4"><p className="text-xs text-[#5A5249]">Reste à encaisser</p><p className="font-display text-2xl text-[#C8973A] mt-1">{formatPrice(totalDue)}</p></div></div>

    <div className="bg-[#141414] border border-[#222] rounded-xl p-4 mb-6"><form className="flex flex-wrap gap-3 items-end"><label className="text-xs text-[#5A5249]">Date<input type="date" name="date" defaultValue={date ?? ""} className="mt-1 h-9 rounded-lg bg-[#0A0A0A] border border-[#222] px-3 text-sm text-[#F5F0EB]" /></label><label className="text-xs text-[#5A5249]">Statut<select name="status" defaultValue={status ?? ""} className="mt-1 h-9 rounded-lg bg-[#0A0A0A] border border-[#222] px-3 text-sm text-[#F5F0EB]"><option value="">Tous</option>{Object.entries(statusInfo).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}</select></label><button className="h-9 px-4 rounded-lg bg-[#222] text-sm text-[#9A8F84] hover:text-[#F5F0EB]">Filtrer</button><Link href="/admin/orders" className="text-xs text-[#5A5249] hover:text-[#9A8F84] px-2">Réinitialiser</Link></form></div>

    <div className="bg-[#141414] border border-[#222] rounded-xl overflow-hidden"><div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b border-[#222]">{["Client / origine", "Tables", "Ouverte", "Articles", "Total", "Acompte", "Reste", "Statut", ""].map((h) => <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-[#5A5249] uppercase tracking-wider">{h}</th>)}</tr></thead><tbody className="divide-y divide-[#1a1a1a]">
      {orders.map((order) => { const st = statusInfo[order.status]; return <tr key={order.id} className="hover:bg-[#1a1a1a]"><td className="px-5 py-4"><p className="text-sm text-[#F5F0EB] font-medium">{order.guestFirstName || "Client sur place"} {order.guestLastName || ""}</p><p className="text-xs text-[#5A5249]">{order.reservation ? `Réservation · ${order.reservation.timeSlot}` : "Arrivée directe"}</p></td><td className="px-5 py-4 text-sm text-[#9A8F84]">{order.tables.map((t) => t.table.number).join(", ") || "—"}</td><td className="px-5 py-4 text-xs text-[#9A8F84] whitespace-nowrap">{formatDateTime(order.openedAt)}</td><td className="px-5 py-4 text-sm text-[#9A8F84]"><span className="inline-flex items-center gap-1"><Receipt size={13} /> {order.items.reduce((s, i) => s + i.quantity, 0)}</span></td><td className="px-5 py-4 text-sm text-[#C8973A] font-medium">{formatPrice(order.totalAmount)}</td><td className="px-5 py-4 text-sm text-emerald-400">{formatPrice(order.depositApplied)}</td><td className="px-5 py-4 text-sm text-[#F5F0EB]">{formatPrice(order.dueAmount)}</td><td className="px-5 py-4">{st ? <Badge variant={st.variant}>{st.label}</Badge> : order.status}</td><td className="px-5 py-4"><Link href={`/admin/orders/${order.id}`} className="text-xs text-[#C8973A] hover:underline">Ouvrir</Link></td></tr>; })}
    </tbody></table></div>{orders.length === 0 && <div className="py-16 text-center text-[#5A5249] flex flex-col items-center"><UserRound size={28} className="mb-2 text-[#333]" /><p>Aucune commande trouvée.</p></div>}</div>
  </div>;
}
