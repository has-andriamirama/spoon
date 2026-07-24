import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { Users } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Clients" };

export default async function AdminCustomersPage({ searchParams }: { searchParams: { q?: string } }) {
  const customers = await prisma.user.findMany({
    where: searchParams.q ? { OR: [{ email: { contains: searchParams.q, mode: "insensitive" } }, { firstName: { contains: searchParams.q, mode: "insensitive" } }, { lastName: { contains: searchParams.q, mode: "insensitive" } }] } : undefined,
    include: { _count: { select: { reservations: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-3xl text-[#F5F0EB]">Clients <span className="text-[#5A5249] text-xl">({customers.length})</span></h1>
      </div>
      <form className="mb-6">
        <input name="q" defaultValue={searchParams.q} placeholder="Rechercher par nom ou email..." className="h-10 w-full max-w-sm px-4 rounded-lg bg-[#141414] border border-[#222] text-sm text-[#F5F0EB] placeholder:text-[#5A5249] focus:border-[#C8973A] focus:outline-none" />
      </form>
      <div className="bg-[#141414] border border-[#222] rounded-xl overflow-hidden">
        {customers.length === 0 ? (
          <div className="text-center py-16"><Users size={40} className="text-[#333] mx-auto mb-4" /><p className="text-[#5A5249]">Aucun client trouvé</p></div>
        ) : (
          <table className="w-full">
            <thead><tr className="border-b border-[#222]">
              {["Client","Email","Téléphone","Réservations","Inscrit le",""].map(h => <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-[#5A5249] uppercase tracking-wider">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-[#1a1a1a]">
              {customers.map(c => (
                <tr key={c.id} className="hover:bg-[#1a1a1a] transition-colors">
                  <td className="px-5 py-4"><p className="text-sm text-[#F5F0EB] font-medium">{c.firstName} {c.lastName}</p></td>
                  <td className="px-5 py-4 text-sm text-[#9A8F84]">{c.email}</td>
                  <td className="px-5 py-4 text-sm text-[#9A8F84]">{c.phone || "—"}</td>
                  <td className="px-5 py-4 text-sm text-[#9A8F84]">{c._count.reservations}</td>
                  <td className="px-5 py-4 text-sm text-[#9A8F84]">{formatDate(c.createdAt, "dd/MM/yyyy")}</td>
                  <td className="px-5 py-4"><Link href={`/admin/customers/${c.id}`} className="text-xs text-[#C8973A] hover:underline">Voir</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
