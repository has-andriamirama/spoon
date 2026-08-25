import { prisma } from "@/lib/prisma";
import PaymentsClient from "./payments-client";

export const dynamic  = "force-dynamic";
export const metadata = { title: "Paiements — Spoon Admin" };

export default async function AdminPaymentsPage() {
	const payments = await prisma.payment.findMany({
		include: {
			reservation: {
				select: {
					id: true,
					guestFirstName: true,
					guestLastName: true,
					guestEmail: true,
					date: true,
					timeSlot: true,
					invoice: {
						select: { id: true, invoiceNumber: true, pdfUrl: true },
					},
				},
			},
		},
		orderBy: { createdAt: "desc" },
		take: 500,
	});

	return <PaymentsClient payments={payments as Parameters<typeof PaymentsClient>[0]["payments"]} />;
}
