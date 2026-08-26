import { NextResponse } from "next/server";
import { updateInvoiceTemplateSchema } from "@/lib/validations";
import {
	getInvoiceTemplateById,
	getInvoiceTemplateHtml,
	updateInvoiceTemplate,
	deleteInvoiceTemplate,
} from "@/services/invoice-template.service";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	try {
		const template = await getInvoiceTemplateById(id);
		if (!template) {
			return NextResponse.json({ error: "Template introuvable" }, { status: 404 });
		}
		const html = await getInvoiceTemplateHtml(template);
		return NextResponse.json({ data: { ...template, html } });
	} catch (error) {
		console.error("[api/admin/invoice-templates/:id] GET error:", error);
		return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
	}
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	try {
		const body = await request.json();
		const parsed = updateInvoiceTemplateSchema.safeParse(body);
		if (!parsed.success) {
			return NextResponse.json(
				{ error: "Données invalides", details: parsed.error.flatten() },
				{ status: 400 }
			);
		}

		const template = await updateInvoiceTemplate(id, parsed.data);
		return NextResponse.json({ data: template });
	} catch (error) {
		console.error("[api/admin/invoice-templates/:id] PATCH error:", error);
		return NextResponse.json(
			{ error: "Erreur lors de la mise à jour du template" },
			{ status: 500 }
		);
	}
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	try {
		await deleteInvoiceTemplate(id);
		return NextResponse.json({ message: "Template supprimé" });
	} catch (error) {
		console.error("[api/admin/invoice-templates/:id] DELETE error:", error);
		return NextResponse.json(
			{ error: "Erreur lors de la suppression du template" },
			{ status: 500 }
		);
	}
}
