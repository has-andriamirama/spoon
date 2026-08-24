import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { formatDateTime, formatPrice, getInitials } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { PAYMENT_STATUSES } from "@/lib/constants";
import Link from "next/link";
import {
	ArrowLeft,
	CreditCard,
	CalendarDays,
	Clock,
	ExternalLink,
	Receipt,
	RotateCcw,
	Zap,
} from "lucide-react";
import RefundForm from "./refund-form";

export const dynamic = "force-dynamic";

const PAYMENT_TYPE_LABELS: Record<string, string> = {
	DEPOSIT: "Acompte",
	FULL:    "Paiement complet",
	NONE:    "Sans paiement",
};

const VARIANT_MAP: Record<string, "gray" | "yellow" | "green" | "blue" | "red"> = {
	gray:   "gray",
	yellow: "yellow",
	green:  "green",
	blue:   "blue",
	red:    "red",
};

export default async function AdminPaymentDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;

	const payment = await prisma.payment.findUnique({
		where: { id },
		include: {
			reservation: {
				include: {
					invoice: {
						select: { id: true, invoiceNumber: true, pdfUrl: true },
					},
				},
			},
		},
	});

	if (!payment) notFound();

	const pStatus  = PAYMENT_STATUSES[payment.status];
	const fullName = `${payment.reservation.guestFirstName} ${payment.reservation.guestLastName}`;
	const initials = getInitials(payment.reservation.guestFirstName, payment.reservation.guestLastName);
	const invoice  = payment.reservation.invoice;

	const isRefundable = payment.status === "PAID";
	const refundable   = (payment.amount ?? 0) - (payment.refundedAmount ?? 0);

	return (
		<div className="max-w-full">

			{/* ── Back link ── */}
			<Link
				href="/admin/payments"
				className="inline-flex items-center gap-2 text-sm text-[#5A5249] hover:text-[#F5F0EB] mb-6 transition-colors"
			>
				<ArrowLeft size={15} />
				Retour aux paiements
			</Link>

			<div className="bg-[#141414] border border-[#222] rounded-xl overflow-hidden">

				{/* ── Header card ── */}
				<div className="px-6 py-5 border-b border-[#222] flex items-center justify-between gap-4">
					<div className="flex items-center gap-4 min-w-0">
						<div className="w-12 h-12 rounded-full bg-[#C8973A]/10 border border-[#C8973A]/20 flex items-center justify-center text-base font-semibold text-[#C8973A] shrink-0">
							{initials}
						</div>
						<div className="min-w-0">
							<h1 className="font-display text-xl text-[#F5F0EB] truncate">{fullName}</h1>
							<p className="text-xs text-[#5A5249] mt-0.5">
								Réf. #{id.slice(-8).toUpperCase()}
							</p>
						</div>
					</div>
					<Badge variant={VARIANT_MAP[pStatus.color]} className="text-xs shrink-0">
						{pStatus.label}
					</Badge>
				</div>

				{/* ── Key info grid ── */}
				<div className="grid grid-cols-2 sm:grid-cols-4 border-b border-[#222]">
					{[
						{
							icon: CreditCard,
							label: "Montant",
							value: formatPrice(payment.amount),
							accent: true,
						},
						{
							icon: Zap,
							label: "Type",
							value: PAYMENT_TYPE_LABELS[payment.type] ?? payment.type,
						},
						{
							icon: CalendarDays,
							label: "Payé le",
							value: payment.paidAt ? formatDateTime(payment.paidAt) : "—",
							muted: !payment.paidAt,
						},
						{
							icon: RotateCcw,
							label: "Remboursé le",
							value: payment.refundedAt ? formatDateTime(payment.refundedAt) : "—",
							muted: !payment.refundedAt,
						},
					].map(({ icon: Icon, label, value, accent, muted }) => (
						<div
							key={label}
							className="px-5 py-4 border-r border-[#222] last:border-r-0 sm:[&:nth-child(4)]:border-r-0"
						>
							<div className="flex items-center gap-1.5 mb-1.5">
								<Icon size={12} className="text-[#5A5249]" />
								<span className="text-[10px] font-semibold uppercase tracking-wider text-[#5A5249]">
									{label}
								</span>
							</div>
							<p
								className={`text-sm font-medium leading-tight ${
									accent ? "text-[#C8973A]" : muted ? "text-[#5A5249] italic" : "text-[#F5F0EB]"
								}`}
							>
								{value}
							</p>
						</div>
					))}
				</div>

				{/* ── Body: two columns ── */}
				<div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-[#222]">

					{/* ── Stripe info ── */}
					<div className="px-6 py-5 space-y-4">
						<p className="text-[10px] font-semibold uppercase tracking-wider text-[#5A5249]">
							Informations Stripe
						</p>
						<dl className="space-y-3">
							{[
								{
									label: "Payment Intent ID",
									value: payment.stripePaymentIntentId
										? <span className="font-mono text-xs break-all text-[#F5F0EB]">{payment.stripePaymentIntentId}</span>
										: <span className="text-[#5A5249] italic">—</span>,
								},
								{
									label: "Charge ID",
									value: payment.stripeChargeId
										? <span className="font-mono text-xs break-all text-[#F5F0EB]">{payment.stripeChargeId}</span>
										: <span className="text-[#5A5249] italic">—</span>,
								},
								...(payment.refundedAmount != null && payment.refundedAmount > 0
									? [{ label: "Montant remboursé", value: <span className="text-blue-400 font-semibold">{formatPrice(payment.refundedAmount)}</span> }]
									: []),
								...(payment.failureReason
									? [{ label: "Raison d'échec", value: <span className="text-red-400 text-xs">{payment.failureReason}</span> }]
									: []),
							].map(({ label, value }) => (
								<div key={label} className="flex items-start justify-between gap-4">
									<dt className="text-xs text-[#5A5249] shrink-0">{label}</dt>
									<dd className="text-right">{value}</dd>
								</div>
							))}
						</dl>
					</div>

					{/* ── Reservation & Invoice ── */}
					<div className="px-6 py-5 space-y-4">
						<p className="text-[10px] font-semibold uppercase tracking-wider text-[#5A5249]">
							Réservation liée
						</p>
						<Link
							href={`/admin/reservations/${payment.reservation.id}`}
							className="flex items-center justify-between gap-3 p-3 rounded-lg bg-[#0A0A0A] border border-[#1a1a1a] hover:border-[#C8973A]/30 transition-colors group"
						>
							<div className="flex items-center gap-3 min-w-0">
								<div className="w-8 h-8 rounded-full bg-[#C8973A]/10 border border-[#C8973A]/20 flex items-center justify-center text-xs font-semibold text-[#C8973A] shrink-0">
									{initials}
								</div>
								<div className="min-w-0">
									<p className="text-sm text-[#F5F0EB] font-medium truncate">{fullName}</p>
									<p className="text-xs text-[#5A5249]">
										#{payment.reservation.id.slice(-8).toUpperCase()}
									</p>
								</div>
							</div>
							<ExternalLink size={14} className="text-[#5A5249] group-hover:text-[#C8973A] shrink-0 transition-colors" />
						</Link>

						{invoice && (
							<>
								<p className="text-[10px] font-semibold uppercase tracking-wider text-[#5A5249] pt-1">
									Facture associée
								</p>
								<Link
									href={`/admin/invoices/${invoice.id}`}
									className="flex items-center justify-between gap-3 p-3 rounded-lg bg-[#0A0A0A] border border-[#1a1a1a] hover:border-[#C8973A]/30 transition-colors group"
								>
									<div className="flex items-center gap-3 min-w-0">
										<div className="w-8 h-8 rounded-lg bg-[#1a1a1a] border border-[#222] flex items-center justify-center shrink-0">
											<Receipt size={14} className="text-[#9A8F84]" />
										</div>
										<div className="min-w-0">
											<p className="text-sm text-[#F5F0EB] font-medium font-mono truncate">
												{invoice.invoiceNumber}
											</p>
											<p className="text-xs text-[#5A5249]">Voir la facture</p>
										</div>
									</div>
									<ExternalLink size={14} className="text-[#5A5249] group-hover:text-[#C8973A] shrink-0 transition-colors" />
								</Link>
							</>
						)}
					</div>
				</div>
			</div>

			{/* ── Refund form ── */}
			{isRefundable && refundable > 0 && (
				<div className="mt-6">
					<RefundForm paymentId={payment.id} maxAmount={refundable} />
				</div>
			)}
		</div>
	);
}
