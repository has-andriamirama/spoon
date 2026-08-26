import { prisma } from "@/lib/prisma";
import TemplatesClient from "./templates-client";

export const dynamic  = "force-dynamic";
export const metadata = { title: "Templates de factures — Spoon Admin" };

export default async function InvoiceTemplatesPage() {
	const templates = await prisma.invoiceTemplate.findMany({
		orderBy: [{ type: "asc" }, { isActive: "desc" }, { updatedAt: "desc" }],
	});

	return <TemplatesClient initialTemplates={templates} />;
}
