import { prisma } from "@/lib/prisma";
import { generateInvoiceNumber } from "@/lib/utils";
import { uploadRawBufferToCloudinary } from "@/lib/cloudinary";
import { htmlToPdfBuffer } from "@/lib/pdf/generate-pdf";
import { getDefaultTemplateHtml } from "@/lib/pdf/default-templates";
import { buildInvoiceVariables, injectTemplateVariables } from "@/lib/pdf/template-variables";
import { getActiveInvoiceTemplate, getInvoiceTemplateHtml } from "@/services/invoice-template.service";
import type { Invoice } from "@/types";

const INVOICES_FOLDER = "spoon/invoices";

/**
 * Génère (ou régénère) le PDF d'une facture existante : récupère le template
 * actif pour son type (ou un template par défaut codé en dur si aucun n'est
 * actif, pour ne jamais bloquer la génération), injecte les variables, rend
 * le PDF via Puppeteer et l'upload sur Cloudinary.
 *
 * Best-effort : les erreurs sont journalisées mais ne remontent pas, pour ne
 * jamais faire échouer un flux de paiement à cause d'un problème de PDF —
 * l'admin peut toujours régénérer le PDF manuellement depuis l'espace admin.
 */
export async function generateInvoicePdf(invoiceId: string): Promise<Invoice> {
	const invoice = await prisma.invoice.findUniqueOrThrow({
		where: { id: invoiceId },
		include: {
			reservation: { select: { date: true, timeSlot: true } },
			serviceOrder: { select: { table: { select: { numero: true } } } },
		},
	});

	const template = await getActiveInvoiceTemplate(invoice.type);
	const html = template ? await getInvoiceTemplateHtml(template) : getDefaultTemplateHtml(invoice.type);

	const variables = buildInvoiceVariables({
		invoiceNumber: invoice.invoiceNumber,
		amount: invoice.amount,
		taxAmount: invoice.taxAmount,
		totalAmount: invoice.totalAmount,
		issuedAt: invoice.issuedAt,
		guestName: invoice.guestName,
		guestEmail: invoice.guestEmail,
		reservation: invoice.reservation,
		tableNumero: invoice.serviceOrder?.table.numero ?? null,
	});

	const finalHtml = injectTemplateVariables(html, variables);
	const pdfBuffer = await htmlToPdfBuffer(finalHtml);
	const publicId = `${INVOICES_FOLDER}/${invoice.invoiceNumber}`;
	const uploaded = await uploadRawBufferToCloudinary(pdfBuffer, publicId);

	return prisma.invoice.update({
		where: { id: invoice.id },
		data: {
			pdfUrl: uploaded.url,
			pdfPublicId: uploaded.publicId,
			templateId: template?.id ?? null,
		},
	});
}

/** Génère le PDF sans jamais faire échouer l'appelant — journalise en cas d'erreur. */
async function generateInvoicePdfSafely(invoiceId: string): Promise<void> {
	try {
		await generateInvoicePdf(invoiceId);
	} catch (error) {
		// Best-effort assumé : on ne relance jamais l'erreur ici pour ne pas
		// casser un flux de paiement. Mais on journalise le message ET la
		// pile complète — avant ce correctif, un échec Chromium/Cloudinary
		// était totalement invisible (la facture restait avec pdfUrl = null,
		// sans aucun log exploitable). L'admin peut régénérer le PDF depuis
		// /admin/invoices une fois la cause corrigée (voir bouton
		// "Régénérer le PDF" sur les factures sans PDF).
		const message = error instanceof Error ? error.stack ?? error.message : String(error);
		console.error(
			`[invoice.service] échec génération PDF pour la facture ${invoiceId} :\n${message}`
		);
	}
}

/**
 * Génère la facture d'acompte liée à un Payment (réservation payée via Stripe).
 * Un Payment ne peut avoir qu'une seule facture (paymentId est unique côté Invoice) :
 * si une facture existe déjà pour ce paiement, elle est simplement renvoyée.
 */
export async function generateDepositInvoice(reservationId: string): Promise<Invoice> {
	const reservation = await prisma.reservation.findUniqueOrThrow({
		where: { id: reservationId },
		include: { payment: true },
	});

	if (!reservation.payment) {
		throw new Error(`Aucun paiement trouvé pour la réservation ${reservationId}`);
	}

	const existing = await prisma.invoice.findUnique({
		where: { paymentId: reservation.payment.id },
	});
	if (existing) return existing;

	const invoiceNumber = generateInvoiceNumber();
	const amount = reservation.payment.amount || 0;
	const taxAmount = 0; // TVA à configurer selon le régime fiscal
	const totalAmount = amount + taxAmount;

	const invoice = await prisma.invoice.create({
		data: {
			invoiceNumber,
			type: "DEPOSIT",
			paymentId: reservation.payment.id,
			reservationId,
			userId: reservation.userId,
			guestEmail: reservation.guestEmail,
			guestName: `${reservation.guestFirstName} ${reservation.guestLastName}`.trim(),
			amount,
			taxAmount,
			totalAmount,
		},
	});

	await generateInvoicePdfSafely(invoice.id);

	return invoice;
}

/**
 * Génère la facture d'addition liée à un ServiceOrder encaissé en salle (statut PAYEE).
 * Un ServiceOrder ne peut avoir qu'une seule facture (serviceOrderId est unique côté Invoice) :
 * si une facture existe déjà pour cette commande, elle est simplement renvoyée.
 */
export async function generateAdditionInvoice(serviceOrderId: string): Promise<Invoice> {
	const order = await prisma.serviceOrder.findUniqueOrThrow({
		where: { id: serviceOrderId },
		include: { reservation: { include: { user: true } } },
	});

	const existing = await prisma.invoice.findUnique({
		where: { serviceOrderId: order.id },
	});
	if (existing) return existing;

	const invoiceNumber = generateInvoiceNumber();
	const amount = order.totalAmount || 0;
	const taxAmount = 0; // TVA à configurer selon le régime fiscal
	const totalAmount = amount + taxAmount;

	const invoice = await prisma.invoice.create({
		data: {
			invoiceNumber,
			type: "ADDITION",
			serviceOrderId: order.id,
			reservationId: order.reservationId,
			userId: order.reservation?.userId ?? null,
			guestEmail: order.reservation?.guestEmail ?? null,
			guestName: order.guestName,
			amount,
			taxAmount,
			totalAmount,
		},
	});

	await generateInvoicePdfSafely(invoice.id);

	return invoice;
}

/** @deprecated Utiliser generateDepositInvoice — conservé pour compatibilité. */
export const generateInvoice = generateDepositInvoice;
