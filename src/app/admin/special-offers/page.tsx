import { prisma } from "@/lib/prisma";
import { formatDate, formatPrice } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Plus, Tag } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Offres spéciales" };

export default async function AdminSpecialOffersPage() {
  const offers = await prisma.specialOffer.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-3xl text-[#F5F0EB]">Offres spéciales</h1>
        <Link href="/admin/special-offers/new" className="inline-flex items-center gap-2 bg-[#C8973A] hover:bg-[#E8B04A] text-[#0A0A0A] font-semibold text-sm px-4 py-2 rounded-lg transition-colors"><Plus size={16} /> Nouvelle offre</Link>
      </div>
      {offers.length === 0 ? (
        <div className="bg-[#141414] border border-[#222] rounded-xl py-20 text-center"><Tag size={40} className="text-[#333] mx-auto mb-4" /><p className="text-[#5A5249]">Aucune offre spéciale. Créez-en une !</p></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {offers.map(offer => (
            <Link key={offer.id} href={`/admin/special-offers/${offer.id}`} className="bg-[#141414] border border-[#222] hover:border-[#C8973A]/30 rounded-xl p-5 transition-all">
              <div className="flex items-start justify-between gap-2 mb-3">
                <h3 className="font-display text-lg text-[#F5F0EB]">{offer.title}</h3>
                <Badge variant={offer.isActive ? "green" : "gray"}>{offer.isActive ? "Active" : "Inactive"}</Badge>
              </div>
              <p className="text-sm text-[#9A8F84] mb-3 line-clamp-2">{offer.description}</p>
              <div className="flex items-center justify-between text-xs text-[#5A5249]">
                <span>{offer.type === "PERCENTAGE" ? `${offer.value}%` : offer.type === "FIXED_AMOUNT" ? `-${formatPrice(offer.value)}` : "Article offert"}</span>
                <span>{formatDate(offer.startDate, "dd/MM")} → {formatDate(offer.endDate, "dd/MM/yyyy")}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
