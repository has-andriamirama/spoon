import { prisma } from "@/lib/prisma";
import { generateInvoiceNumber } from "@/lib/utils";
import { uploadRawBufferToCloudinary } from "@/lib/cloudinary";
import { htmlToPdfBuffer } from "@/lib/pdf/generate-pdf";
import { getDefaultTemplateHtml } from "@/lib/pdf/default-templates";
import {
	buildInvoiceVariables,
	injectTemplateVariables,
	type InvoiceLineItem,
	type InvoiceRestaurantInfo,
} from "@/lib/pdf/template-variables";
import { getActiveInvoiceTemplate, getInvoiceTemplateHtml } from "@/services/invoice-template.service";
import type { Invoice } from "@/types";

const INVOICES_FOLDER = "spoon/invoices";

async function getRestaurantInfoForInvoice(): Promise<InvoiceRestaurantInfo | null> {
	const settings = await prisma.restaurantSettings.findFirst();
	if (!settings) return null;

	return {
		name: settings.name,
		logoUrl: settings.logoUrl,
		address: settings.address,
		phone: settings.phone,
		email: settings.email,
	};
}

export async function generateInvoicePdf(invoiceId: string): Promise<Invoice> {
	const invoice = await prisma.invoice.findUniqueOrThrow({
		where: { id: invoiceId },
		include: {
			reservation: {
				select: {
					date: true,
					timeSlot: true,
					payment: { select: { amount: true, status: true } },
				},
			},
			serviceOrder: {
				include: {
					table: { select: { numero: true } },
					items: { orderBy: { createdAt: "asc" } },
				},
			},
		},
	});

	const template = await getActiveInvoiceTemplate(invoice.type);
	const html = template ? await getInvoiceTemplateHtml(template) : getDefaultTemplateHtml(invoice.type);

	const restaurant = await getRestaurantInfoForInvoice();

	const items: InvoiceLineItem[] | undefined =
		invoice.type === "ADDITION" && invoice.serviceOrder
			? invoice.serviceOrder.items.map((item) => ({
					name: item.dishName,
					qty: item.qty,
					unitPrice: item.unitPrice,
					totalPrice: item.totalPrice,
					notes: item.notes,
				}))
			: undefined;

	const depositPaid =
		invoice.type === "ADDITION" && invoice.reservation?.payment?.status === "PAID"
			? invoice.reservation.payment.amount || 0
			: 0;

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
		items,
		restaurant,
		depositPaid,
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

async function generateInvoicePdfSafely(invoiceId: string): Promise<void> {
	try {
		await generateInvoicePdf(invoiceId);
	} catch (error) {
		const message = error instanceof Error ? error.stack ?? error.message : String(error);
		console.error(
			`[invoice.service] échec génération PDF pour la facture ${invoiceId} :\n${message}`
		);
	}
}

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
	const taxAmount = 0; // To be configured
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
	const taxAmount = 0; // To be configured
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

export const generateInvoice = generateDepositInvoice;
