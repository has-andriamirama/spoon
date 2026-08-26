import { formatDate, formatDateTime, formatPrice } from "@/lib/utils";

export const INVOICE_TEMPLATE_VARIABLES = [
	{ key: "invoiceNumber", label: "N° de facture" },
	{ key: "customerName", label: "Nom du client" },
	{ key: "customerEmail", label: "Email du client" },
	{ key: "reservationDate", label: "Date de réservation" },
	{ key: "issuedAt", label: "Date d'émission" },
	{ key: "amount", label: "Montant HT" },
	{ key: "taxAmount", label: "TVA" },
	{ key: "total", label: "Total TTC" },
	{ key: "tableNumero", label: "N° de table" },
] as const;

export type InvoiceTemplateVariables = Record<string, string>;

export interface InvoiceForVariables {
	invoiceNumber: string;
	amount: number;
	taxAmount: number;
	totalAmount: number;
	issuedAt: Date;
	guestName: string | null;
	guestEmail: string | null;
	reservation?: { date: Date; timeSlot: string } | null;
	tableNumero?: number | null;
}

export function buildInvoiceVariables(invoice: InvoiceForVariables): InvoiceTemplateVariables {
	return {
		invoiceNumber: invoice.invoiceNumber,
		customerName: invoice.guestName ?? "Client",
		customerEmail: invoice.guestEmail ?? "",
		reservationDate: invoice.reservation
			? `${formatDate(invoice.reservation.date, "dd MMMM yyyy")} · ${invoice.reservation.timeSlot}`
			: "—",
		issuedAt: formatDateTime(invoice.issuedAt),
		amount: formatPrice(invoice.amount),
		taxAmount: formatPrice(invoice.taxAmount),
		total: formatPrice(invoice.totalAmount),
		tableNumero: invoice.tableNumero ? `Table ${invoice.tableNumero}` : "—",
	};
}

export function buildSampleVariables(): InvoiceTemplateVariables {
	return {
		invoiceNumber: "SPO-2026-04213765",
		customerName: "M. et Mme Payet",
		customerEmail: "j.payet@example.re",
		reservationDate: "12 septembre 2026 · 20:00",
		issuedAt: formatDateTime(new Date()),
		amount: formatPrice(160),
		taxAmount: formatPrice(0),
		total: formatPrice(160),
		tableNumero: "Table 8",
	};
}

export function injectTemplateVariables(html: string, variables: InvoiceTemplateVariables): string {
	let result = html;
	for (const [key, value] of Object.entries(variables)) {
		result = result.split(`{{${key}}}`).join(value);
	}
	return result;
}
