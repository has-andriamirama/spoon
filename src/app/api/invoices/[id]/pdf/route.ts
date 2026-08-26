import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateInvoicePdf } from "@/services/invoice.service";

export const maxDuration = 60;
export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	let invoice = await prisma.invoice.findUnique({ where: { id } });
	if (!invoice) return NextResponse.json({ error: "Facture introuvable" }, { status: 404 });

	if (!invoice.pdfUrl) {
		try {
			invoice = await generateInvoicePdf(id);
		} catch (error) {
			console.error(`[api/invoices/:id/pdf] génération à la volée échouée pour ${id}:`, error);
			return NextResponse.json({ error: "PDF non disponible" }, { status: 404 });
		}
	}

	if (!invoice.pdfUrl) return NextResponse.json({ error: "PDF non disponible" }, { status: 404 });
	return NextResponse.redirect(invoice.pdfUrl);
}

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	try {
		const invoice = await generateInvoicePdf(id);
		return NextResponse.json({ data: invoice });
	} catch (error) {
		console.error(`[api/invoices/:id/pdf] régénération échouée pour ${id}:`, error);
		return NextResponse.json({ error: "Échec de la génération du PDF" }, { status: 500 });
	}
}
