import { prisma } from "@/lib/prisma";
import InvoicesClient from "./invoices-client";

export const dynamic  = "force-dynamic";
export const metadata = { title: "Factures — Spoon Admin" };

export default async function AdminInvoicesPage() {
	const invoices = await prisma.invoice.findMany({
		include: {
			reservation: {
				select: {
					id: true,
					guestFirstName: true,
					guestLastName: true,
					date: true,
					timeSlot: true,
				},
			},
		},
		orderBy: { issuedAt: "desc" },
		take: 500,
	});

	return <InvoicesClient invoices={invoices as Parameters<typeof InvoicesClient>[0]["invoices"]} />;
}
