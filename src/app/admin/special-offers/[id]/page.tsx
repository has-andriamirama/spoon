import { prisma } from "@/lib/prisma";
import SpecialOfferForm from "./special-offer-form";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminSpecialOfferPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const [dishes, offer] = await Promise.all([
		prisma.dish.findMany({ where: { isAvailable: true }, include: { category: true }, orderBy: [{ category: { order: "asc" } }, { order: "asc" }] }),
		id !== "new" ? prisma.specialOffer.findUnique({ where: { id }, include: { items: { include: { dish: true } }, targets: { include: { user: true } } } }) : null,
	]);
	return (
		<div>
			<div className="flex items-center gap-3 mb-8">
				<Link
					href="/admin/special-offers"
					className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-[#222] bg-[#141414] text-[#9A8F84] hover:text-[#F5F0EB] hover:border-[#C8973A]/40 transition-colors shrink-0"
					aria-label="Retour aux offres spéciales"
				>
					<ArrowLeft size={17} />
				</Link>
				<h1 className="font-display text-3xl text-[#F5F0EB]">{offer ? "Modifier l'offre" : "Nouvelle offre spéciale"}</h1>
			</div>
			<SpecialOfferForm offer={offer} dishes={dishes} />
		</div>
	);
}
