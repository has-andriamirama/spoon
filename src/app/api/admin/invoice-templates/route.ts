import { NextResponse } from "next/server";
import { createInvoiceTemplateSchema } from "@/lib/validations";
import {
	listInvoiceTemplates,
	createInvoiceTemplate,
} from "@/services/invoice-template.service";
import type { InvoiceType } from "@/types";

export async function GET(request: Request) {
	try {
		const { searchParams } = new URL(request.url);
		const typeParam = searchParams.get("type");
		const type =
			typeParam === "DEPOSIT" || typeParam === "ADDITION" ? (typeParam as InvoiceType) : undefined;

		const templates = await listInvoiceTemplates(type);
		return NextResponse.json({ data: templates });
	} catch {
		return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
	}
}

export async function POST(request: Request) {
	try {
		const body = await request.json();
		const parsed = createInvoiceTemplateSchema.safeParse(body);
		if (!parsed.success) {
			return NextResponse.json(
				{ error: "Données invalides", details: parsed.error.flatten() },
				{ status: 400 }
			);
		}

		const template = await createInvoiceTemplate(parsed.data);
		return NextResponse.json({ data: template });
	} catch (error) {
		console.error("[api/admin/invoice-templates] POST error:", error);
		return NextResponse.json(
			{ error: "Erreur lors de la création du template" },
			{ status: 500 }
		);
	}
}
