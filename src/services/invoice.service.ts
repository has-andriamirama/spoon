import { prisma } from "@/lib/prisma";
import { generateInvoiceNumber } from "@/lib/utils";
import type { Invoice } from "@/types";

export async function generateInvoice(reservationId: string): Promise<Invoice> {
	const reservation = await prisma.reservation.findUniqueOrThrow({
		where: { id: reservationId },
		include: { payment: true },
	});

	const invoiceNumber = generateInvoiceNumber();
	const amount = reservation.payment?.amount || 0;
	const taxAmount = 0; // TVA to be configured according to the tax regime
	const totalAmount = amount + taxAmount;

	const invoice = await prisma.invoice.create({
		data: {
			invoiceNumber,
			reservationId,
			userId: reservation.userId,
			guestEmail: reservation.guestEmail,
			amount,
			taxAmount,
			totalAmount,
		},
	});

	return invoice;
}
