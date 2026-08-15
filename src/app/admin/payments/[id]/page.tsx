import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { formatDateTime, formatPrice } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { PAYMENT_STATUSES } from "@/lib/constants";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import RefundForm from "./refund-form";

export const dynamic = "force-dynamic";

export default async function AdminPaymentDetailPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const payment = await prisma.payment.findUnique({
		where: { id },
		include: { reservation: true },
	});
	if (!payment) notFound();

	const pStatus = PAYMENT_STATUSES[payment.status];
	const variantMap: Record<string, "gray" | "yellow" | "green" | "blue" | "red"> = { gray: "gray", yellow: "yellow", green: "green", blue: "blue", red: "red" };

	return (
		<div>
			<Link href="/admin/payments" className="inline-flex items-center gap-2 text-sm text-[#9A8F84] hover:text-[#F5F0EB] mb-6 transition-colors"><ArrowLeft size={16} /> Retour</Link>
			<h1 className="font-display text-3xl text-[#F5F0EB] mb-8">Paiement — {formatPrice(payment.amount)}</h1>
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<div className="bg-[#141414] border border-[#222] rounded-xl p-6 space-y-4">
					<h2 className="font-display text-xl text-[#F5F0EB]">Détails</h2>
					<dl className="space-y-3">
						{[
							{ label: "Montant", value: formatPrice(payment.amount) },
							{ label: "Statut", value: <Badge variant={variantMap[pStatus.color]}>{pStatus.label}</Badge> },
							{ label: "Type", value: payment.type === "DEPOSIT" ? "Acompte" : "Paiement complet" },
							{ label: "Stripe ID", value: <span className="text-xs font-mono text-[#5A5249]">{payment.stripePaymentIntentId || "—"}</span> },
							{ label: "Payé le", value: payment.paidAt ? formatDateTime(payment.paidAt) : "—" },
							{ label: "Client", value: `${payment.reservation.guestFirstName} ${payment.reservation.guestLastName}` },
						].map(({ label, value }) => (
							<div key={label} className="flex items-center justify-between gap-4">
								<dt className="text-xs text-[#5A5249]">{label}</dt>
								<dd className="text-sm text-[#F5F0EB]">{value}</dd>
							</div>
						))}
					</dl>
				</div>
				{payment.status === "PAID" && <RefundForm paymentId={payment.id} maxAmount={payment.amount} />}
			</div>
		</div>
	);
}
