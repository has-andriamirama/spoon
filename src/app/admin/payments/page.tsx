import { prisma } from "@/lib/prisma";
import PaymentsClient, { type UnifiedPayment } from "./payments-client";

export const dynamic  = "force-dynamic";
export const metadata = { title: "Paiements — Spoon Admin" };

interface PageProps {
	searchParams: Promise<{ id?: string }>;
}

export default async function AdminPaymentsPage({ searchParams }: PageProps) {
	const { id: initialPaymentId } = await searchParams;

	const deposits = await prisma.payment.findMany({
		include: {
			reservation: {
				select: {
					id: true,
					guestFirstName: true,
					guestLastName: true,
					guestEmail: true,
					date: true,
					timeSlot: true,
				},
			},
			invoice: {
				select: { id: true, invoiceNumber: true, pdfUrl: true },
			},
		},
		orderBy: { createdAt: "desc" },
		take: 500,
	});

	const encaissements = await prisma.serviceOrder.findMany({
		where: { status: "PAYEE" },
		include: {
			table: { select: { numero: true } },
			reservation: {
				select: { id: true, guestEmail: true },
			},
			invoice: {
				select: { id: true, invoiceNumber: true, pdfUrl: true },
			},
			_count: { select: { items: true } },
		},
		orderBy: { closedAt: "desc" },
		take: 500,
	});

	const depositPayments: UnifiedPayment[] = deposits.map((p) => {
		return {
			id: p.id,
			kind: "DEPOSIT",
			amount: p.amount,
			currency: p.currency,
			type: p.type,
			paymentMethod: null,
			status: p.status,
			refundedAmount: p.refundedAmount,
			depositDeducted: null,
			stripePaymentIntentId: p.stripePaymentIntentId,
			stripeChargeId: p.stripeChargeId,
			paidAt: p.paidAt,
			refundedAt: p.refundedAt,
			failureReason: p.failureReason,
			createdAt: p.createdAt,
			updatedAt: p.updatedAt,
			guestName: `${p.reservation.guestFirstName} ${p.reservation.guestLastName}`.trim(),
			guestEmail: p.reservation.guestEmail,
			date: p.reservation.date,
			timeSlot: p.reservation.timeSlot,
			reservationId: p.reservation.id,
			invoice: p.invoice,
			serviceOrderId: null,
			serviceType: null,
			tableNumero: null,
			itemsCount: null,
		};
	});

	const additionPayments: UnifiedPayment[] = encaissements.map((o) => ({
		id: `so_${o.id}`,
		kind: "ADDITION",
		amount: o.totalAmount,
		currency: "eur",
		type: null,
		paymentMethod: o.paymentMethod,
		status: "PAID",
		refundedAmount: null,
		depositDeducted: o.depositDeducted,
		stripePaymentIntentId: null,
		stripeChargeId: null,
		paidAt: o.closedAt,
		refundedAt: null,
		failureReason: null,
		createdAt: o.closedAt ?? o.openedAt,
		updatedAt: o.updatedAt,
		guestName: o.guestName,
		guestEmail: o.reservation?.guestEmail ?? null,
		date: o.closedAt ?? o.openedAt,
		timeSlot: null,
		reservationId: o.reservationId,
		invoice: o.invoice,
		serviceOrderId: o.id,
		serviceType: o.type,
		tableNumero: o.table.numero,
		itemsCount: o._count.items,
	}));

	const payments = [...depositPayments, ...additionPayments].sort(
		(a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
	);

	return <PaymentsClient payments={payments} initialPaymentId={initialPaymentId} />;
}
