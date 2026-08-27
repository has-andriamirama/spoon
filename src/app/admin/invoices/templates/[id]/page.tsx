import { notFound } from "next/navigation";
import {
	getInvoiceTemplateById,
	getInvoiceTemplateHtml,
} from "@/services/invoice-template.service";
import TemplateEditorClient from "@/components/admin/invoice-template-editor";

export const dynamic = "force-dynamic";
export const metadata = { title: "Modifier le template — Spoon Admin" };

interface PageProps {
	params: Promise<{ id: string }>;
}

export default async function EditInvoiceTemplatePage({ params }: PageProps) {
	const { id } = await params;

	const template = await getInvoiceTemplateById(id);
	if (!template) notFound();

	const html = await getInvoiceTemplateHtml(template);

	return (
		<TemplateEditorClient
			initial={{
				id: template.id,
				type: template.type,
				name: template.name,
				html,
				isActive: template.isActive,
			}}
			isFirstOfType={false}
		/>
	);
}
