import { prisma } from "@/lib/prisma";
import { generateInvoiceNumber } from "@/lib/utils";
import type { Invoice } from "@/types";

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

	return invoice;
}

/** @deprecated Utiliser generateDepositInvoice — conservé pour compatibilité. */
export const generateInvoice = generateDepositInvoice;
