import { prisma } from "@/lib/prisma";
import InvoicesClient from "./invoices-client";

export const dynamic  = "force-dynamic";
export const metadata = { title: "Factures — Spoon Admin" };

interface PageProps {
	searchParams: Promise<{ id?: string }>;
}

export default async function AdminInvoicesPage({ searchParams }: PageProps) {
	const { id: initialInvoiceId } = await searchParams;

	const invoices = await prisma.invoice.findMany({
		include: {
			reservation: {
				select: {
					id: true,
					guestFirstName: true,
					guestLastName: true,
					date: true,
					timeSlot: true,
					payment: {
						select: { id: true, status: true, amount: true, type: true },
					},
				},
			},
			user: {
				select: { id: true, firstName: true, lastName: true, email: true },
			},
		},
		orderBy: { issuedAt: "desc" },
		take: 500,
	});

	return (
		<InvoicesClient
			invoices={invoices as Parameters<typeof InvoicesClient>[0]["invoices"]}
			initialInvoiceId={initialInvoiceId}
		/>
	);
}
