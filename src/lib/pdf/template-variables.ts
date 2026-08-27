import { formatDate, formatDateTime, formatPrice } from "@/lib/utils";

type TemplateVariableInvoiceType = "DEPOSIT" | "ADDITION";

interface TemplateVariableDef {
	key: string;
	label: string;
	types?: TemplateVariableInvoiceType[];
}

export const INVOICE_TEMPLATE_VARIABLES: TemplateVariableDef[] = [
	{ key: "invoiceNumber", label: "N° de facture" },
	{ key: "customerName", label: "Nom du client" },
	{ key: "customerEmail", label: "Email du client" },
	{ key: "reservationDate", label: "Date de réservation" },
	{ key: "issuedAt", label: "Date d'émission" },
	{ key: "amount", label: "Montant HT" },
	{ key: "taxAmount", label: "TVA" },
	{ key: "total", label: "Total TTC" },
	{ key: "depositAmount", label: "Acompte déjà réglé", types: ["ADDITION"] },
	{ key: "totalDue", label: "Total restant dû (après acompte)", types: ["ADDITION"] },
	{ key: "tableNumero", label: "N° de table", types: ["ADDITION"] },

	{ key: "restaurantName", label: "Nom du restaurant" },
	{ key: "restaurantAddress", label: "Adresse du restaurant" },
	{ key: "restaurantPhone", label: "Téléphone du restaurant" },
	{ key: "restaurantEmail", label: "Email du restaurant" },
	{ key: "logoUrl", label: "URL du logo" },

	{ key: "itemsRows", label: "Lignes des plats (tableau)", types: ["ADDITION"] },
	{ key: "itemsCount", label: "Nombre d'articles", types: ["ADDITION"] },
];

export type InvoiceTemplateVariables = Record<string, string>;

const DEFAULT_LOGO_SVG =
	'<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">' +
	'<rect width="64" height="64" rx="16" fill="#C8973A"/>' +
	'<g transform="translate(20,20)" fill="none" stroke="#0A0A0A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
	'<path d="m16 2-2.3 2.3a3 3 0 0 0 0 4.2l1.8 1.8a3 3 0 0 0 4.2 0L22 8" />' +
	'<path d="M15 15 3.3 3.3a4.2 4.2 0 0 0 0 6l7.3 7.3c.7.7 2 .7 2.8 0L15 15Zm0 0 7 7" />' +
	'<path d="m2.1 21.8 6.4-6.3" />' +
	'<path d="m19 5-7 7" />' +
	"</g></svg>";

export const DEFAULT_LOGO_URL = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(DEFAULT_LOGO_SVG)}`;

export interface InvoiceLineItem {
	name: string;
	qty: number;
	unitPrice: number;
	totalPrice: number;
	notes?: string | null;
}

export interface InvoiceRestaurantInfo {
	name: string;
	logoUrl?: string | null;
	address?: string | null;
	phone?: string | null;
	email?: string | null;
}

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
	items?: InvoiceLineItem[];
	restaurant?: InvoiceRestaurantInfo | null;
	depositPaid?: number;
}

export function escapeHtml(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

export function buildItemsRowsHtml(items: InvoiceLineItem[]): string {
	if (!items.length) {
		return `<tr><td colspan="4" style="text-align:center;color:#999;">Aucun article</td></tr>`;
	}

	return items
		.map((item) => {
			const name = escapeHtml(item.name);
			const notes = item.notes
				? `<br><span style="font-size:11px;color:#999;">${escapeHtml(item.notes)}</span>`
				: "";
			return `<tr>
		<td>${name}${notes}</td>
		<td style="text-align:center;">${item.qty}</td>
		<td style="text-align:right;">${formatPrice(item.unitPrice)}</td>
		<td style="text-align:right;">${formatPrice(item.totalPrice)}</td>
	</tr>`;
		})
		.join("\n");
}

export function buildInvoiceVariables(invoice: InvoiceForVariables): InvoiceTemplateVariables {
	const items = invoice.items ?? [];
	const restaurant = invoice.restaurant ?? null;
	const logoUrl = restaurant?.logoUrl?.trim() || DEFAULT_LOGO_URL;

	const depositPaid = invoice.depositPaid ?? 0;
	const totalDue = Math.max(invoice.totalAmount - depositPaid, 0);

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
		depositAmount: formatPrice(depositPaid),
		totalDue: formatPrice(totalDue),
		tableNumero: invoice.tableNumero ? `Table ${invoice.tableNumero}` : "—",
		itemsCount: String(items.reduce((sum, item) => sum + item.qty, 0)),

		restaurantName: restaurant?.name ?? "Spoon",
		restaurantAddress: restaurant?.address ?? "",
		restaurantPhone: restaurant?.phone ?? "",
		restaurantEmail: restaurant?.email ?? "",
		logoUrl,

		itemsRows: buildItemsRowsHtml(items),
	};
}

export function buildSampleVariables(): InvoiceTemplateVariables {
	const sampleItems: InvoiceLineItem[] = [
		{ name: "Rougail saucisses", qty: 2, unitPrice: 16, totalPrice: 32 },
		{ name: "Samoussas (x6)", qty: 1, unitPrice: 9, totalPrice: 9 },
		{ name: "Cari poulet coco", qty: 2, unitPrice: 18, totalPrice: 36, notes: "Sans piment" },
		{ name: "Punch maison", qty: 3, unitPrice: 7, totalPrice: 21 },
		{ name: "Tarte à la banane", qty: 2, unitPrice: 6, totalPrice: 12 },
	];

	return buildInvoiceVariables({
		invoiceNumber: "SPO-2026-04213765",
		amount: 160,
		taxAmount: 0,
		totalAmount: 160,
		issuedAt: new Date(),
		guestName: "M. et Mme Payet",
		guestEmail: "j.payet@example.re",
		reservation: { date: new Date("2026-09-12"), timeSlot: "20:00" },
		tableNumero: 8,
		items: sampleItems,
		depositPaid: 40,
		restaurant: {
			name: "Spoon Restaurant",
			address: "12 Rue des Filaos, 97400 Saint-Denis, La Réunion",
			phone: "+262 262 12 34 56",
			email: "contact@spoon-restaurant.re",
		},
	});
}

export function injectTemplateVariables(html: string, variables: InvoiceTemplateVariables): string {
	let result = html;
	for (const [key, value] of Object.entries(variables)) {
		result = result.split(`{{${key}}}`).join(value);
	}
	return result;
}
