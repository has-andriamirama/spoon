import { prisma } from "@/lib/prisma";
import SpecialOfferForm from "./special-offer-form";

export const dynamic = "force-dynamic";

export default async function AdminSpecialOfferPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [dishes, offer] = await Promise.all([
    prisma.dish.findMany({ where: { isAvailable: true }, include: { category: true }, orderBy: [{ category: { order: "asc" } }, { order: "asc" }] }),
    id !== "new" ? prisma.specialOffer.findUnique({ where: { id }, include: { items: { include: { dish: true } }, targets: { include: { user: true } } } }) : null,
  ]);
  return (
    <div>
      <h1 className="font-display text-3xl text-[#F5F0EB] mb-8">{offer ? "Modifier l'offre" : "Nouvelle offre spéciale"}</h1>
      <SpecialOfferForm offer={offer} dishes={dishes} />
    </div>
  );
}
