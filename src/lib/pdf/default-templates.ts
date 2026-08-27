import type { InvoiceType } from "@/types";

const BASE_STYLE = `
	body { font-family: Helvetica, Arial, sans-serif; color: #1a1a1a; padding: 48px; }
	.header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #C8973A; padding-bottom: 20px; margin-bottom: 32px; }
	.brand-block { display: flex; align-items: center; gap: 14px; }
	.brand-block img { display: block; max-height: 56px; max-width: 180px; object-fit: contain; }
	.brand { font-size: 22px; font-weight: 700; letter-spacing: 0.05em; color: #1a1a1a; }
	.brand span { color: #C8973A; }
	.brand-coords { font-size: 11px; color: #999; line-height: 1.5; margin-top: 2px; }
	.doc-title { text-align: right; }
	.doc-title h1 { font-size: 18px; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 0.08em; }
	.doc-title p { margin: 0; font-size: 12px; color: #666; }
	.meta { display: flex; justify-content: space-between; margin-bottom: 32px; font-size: 13px; }
	.meta div { line-height: 1.6; }
	.meta strong { display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #999; margin-bottom: 4px; }
	table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
	th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #999; padding: 8px 0; border-bottom: 1px solid #ddd; }
	td { padding: 12px 0; border-bottom: 1px solid #eee; font-size: 13px; }
	.totals { width: 260px; margin-left: auto; }
	.totals td { border-bottom: none; padding: 6px 0; font-size: 13px; }
	.total-row td { padding-top: 12px; font-size: 15px; font-weight: 700; border-top: 1px solid #ddd; }
	.total-row .amount { color: #C8973A; }
	.footer { margin-top: 48px; font-size: 11px; color: #999; text-align: center; }
`;

const DEPOSIT_TEMPLATE = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><style>${BASE_STYLE}</style></head>
<body>
	<div class="header">
		<div class="brand-block">
			{{logoImg}}
			<div>
				<div class="brand">{{restaurantName}}<span>.</span></div>
				<div class="brand-coords">{{restaurantAddress}}<br>{{restaurantPhone}} · {{restaurantEmail}}</div>
			</div>
		</div>
		<div class="doc-title">
			<h1>Facture d'acompte</h1>
			<p>N° {{invoiceNumber}}</p>
		</div>
	</div>
	<div class="meta">
		<div><strong>Client</strong>{{customerName}}<br>{{customerEmail}}</div>
		<div><strong>Réservation</strong>{{reservationDate}}</div>
		<div><strong>Date d'émission</strong>{{issuedAt}}</div>
	</div>
	<table>
		<thead><tr><th>Désignation</th><th style="text-align:center;">Qté</th><th style="text-align:right;">Prix unitaire</th><th style="text-align:right;">Total</th></tr></thead>
		<tbody>
			{{itemsRows}}
		</tbody>
	</table>
	<table class="totals">
		<tbody>
			<tr><td>Sous-total</td><td style="text-align:right;">{{amount}}</td></tr>
			<tr><td>TVA</td><td style="text-align:right;">{{taxAmount}}</td></tr>
			<tr class="total-row"><td>Total réglé</td><td style="text-align:right;" class="amount">{{total}}</td></tr>
		</tbody>
	</table>
	<div class="footer">Merci de votre confiance — {{restaurantName}}</div>
</body>
</html>`;

const ADDITION_TEMPLATE = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><style>${BASE_STYLE}</style></head>
<body>
	<div class="header">
		<div class="brand-block">
			{{logoImg}}
			<div>
				<div class="brand">{{restaurantName}}<span>.</span></div>
				<div class="brand-coords">{{restaurantAddress}}<br>{{restaurantPhone}} · {{restaurantEmail}}</div>
			</div>
		</div>
		<div class="doc-title">
			<h1>Addition</h1>
			<p>N° {{invoiceNumber}}</p>
		</div>
	</div>
	<div class="meta">
		<div><strong>Client</strong>{{customerName}}</div>
		<div><strong>Table</strong>{{tableNumero}}</div>
		<div><strong>Date d'émission</strong>{{issuedAt}}</div>
	</div>
	<table>
		<thead><tr><th>Plat</th><th style="text-align:center;">Qté</th><th style="text-align:right;">Prix unitaire</th><th style="text-align:right;">Total</th></tr></thead>
		<tbody>
			{{itemsRows}}
		</tbody>
	</table>
	<table class="totals">
		<tbody>
			<tr><td>Sous-total</td><td style="text-align:right;">{{amount}}</td></tr>
			<tr><td>TVA</td><td style="text-align:right;">{{taxAmount}}</td></tr>
			<tr class="total-row"><td>Total à régler</td><td style="text-align:right;" class="amount">{{total}}</td></tr>
		</tbody>
	</table>
	<div class="footer">Merci de votre visite — {{restaurantName}}</div>
</body>
</html>`;

export function getDefaultTemplateHtml(type: InvoiceType): string {
	return type === "ADDITION" ? ADDITION_TEMPLATE : DEPOSIT_TEMPLATE;
}
