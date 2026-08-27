import { prisma } from "@/lib/prisma";
import TemplateEditorClient from "@/components/admin/invoice-template-editor";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nouveau template — Spoon Admin" };

interface PageProps {
	searchParams: Promise<{ type?: string }>;
}

export default async function NewInvoiceTemplatePage({ searchParams }: PageProps) {
	const { type: typeParam } = await searchParams;
	const type = typeParam === "ADDITION" ? "ADDITION" : "DEPOSIT";

	const existingCount = await prisma.invoiceTemplate.count({ where: { type } });

	return (
		<TemplateEditorClient
			initial={{ id: null, type, name: "", html: "", isActive: false }}
			isFirstOfType={existingCount === 0}
		/>
	);
}
