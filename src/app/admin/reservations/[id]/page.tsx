import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { formatDate, formatDateTime, formatPrice } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { RESERVATION_STATUSES, PAYMENT_STATUSES } from "@/lib/constants";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import AdminReservationActions from "./reservation-actions";

export const dynamic = "force-dynamic";

const colorVariantMap: Record<string, "yellow" | "green" | "red" | "gray" | "orange" | "blue"> = {
	yellow: "yellow",
	green: "green",
	red: "red",
	gray: "gray",
	orange: "orange",
	blue: "blue",
};

export default async function AdminReservationDetailPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const reservation = await prisma.reservation.findUnique({
		where: { id },
		include: {
			payment: true,
			invoice: true,
			user: { select: { id: true, firstName: true, lastName: true, email: true } },
		},
	});
	if (!reservation) notFound();

	const status = RESERVATION_STATUSES[reservation.status];
	const paymentStatusInfo = reservation.payment
		? PAYMENT_STATUSES[reservation.payment.status]
		: null;

	return (
		<div>
			<Link
				href="/admin/reservations"
				className="inline-flex items-center gap-2 text-sm text-[#9A8F84] hover:text-[#F5F0EB] mb-6 transition-colors"
			>
				<ArrowLeft size={16} /> Retour
			</Link>

			<div className="flex items-start justify-between gap-4 mb-8">
				<div>
					<h1 className="font-display text-3xl text-[#F5F0EB]">
						{reservation.guestFirstName} {reservation.guestLastName}
					</h1>
					<p className="text-[#5A5249] text-sm mt-1">
						Ref. #{reservation.id.slice(-8).toUpperCase()}
					</p>
				</div>
				<Badge variant={colorVariantMap[status.color]} className="text-base px-4 py-1.5">
					{status.label}
				</Badge>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				<div className="lg:col-span-2 space-y-6">
					<div className="bg-[#141414] border border-[#222] rounded-xl p-6">
						<h2 className="font-display text-xl text-[#F5F0EB] mb-4">Informations</h2>
						<dl className="grid grid-cols-2 gap-x-8 gap-y-4">
							{[
								{ label: "Date", value: formatDate(reservation.date, "EEEE d MMMM yyyy") },
								{ label: "Heure", value: reservation.timeSlot },
								{ label: "Couverts", value: reservation.covers },
								{ label: "Email", value: reservation.guestEmail },
								{ label: "Téléphone", value: reservation.guestPhone },
								{ label: "Créée le", value: formatDateTime(reservation.createdAt) },
							].map(({ label, value }) => (
								<div key={label}>
									<dt className="text-xs text-[#5A5249] mb-0.5">{label}</dt>
									<dd className="text-sm text-[#F5F0EB]">{String(value)}</dd>
								</div>
							))}
						</dl>
						{reservation.notes && (
							<div className="mt-4 pt-4 border-t border-[#222]">
								<p className="text-xs text-[#5A5249] mb-1">Notes</p>
								<p className="text-sm text-[#9A8F84]">{reservation.notes}</p>
							</div>
						)}
						{reservation.allergies && (
							<div className="mt-2">
								<p className="text-xs text-[#5A5249] mb-1">Allergies</p>
								<p className="text-sm text-[#9A8F84]">{reservation.allergies}</p>
							</div>
						)}
					</div>

					{reservation.payment && paymentStatusInfo && (
						<div className="bg-[#141414] border border-[#222] rounded-xl p-6">
							<h2 className="font-display text-xl text-[#F5F0EB] mb-4">Paiement</h2>
							<dl className="grid grid-cols-2 gap-4">
								<div>
									<dt className="text-xs text-[#5A5249] mb-0.5">Montant</dt>
									<dd className="text-[#F5F0EB]">{formatPrice(reservation.payment.amount)}</dd>
								</div>
								<div>
									<dt className="text-xs text-[#5A5249] mb-0.5">Statut</dt>
									<dd>
										<Badge variant={colorVariantMap[paymentStatusInfo.color]}>
											{paymentStatusInfo.label}
										</Badge>
									</dd>
								</div>
								{reservation.payment.stripePaymentIntentId && (
									<div>
										<dt className="text-xs text-[#5A5249] mb-0.5">Stripe ID</dt>
										<dd className="text-xs text-[#5A5249] font-mono truncate">
											{reservation.payment.stripePaymentIntentId}
										</dd>
									</div>
								)}
								{reservation.payment.paidAt && (
									<div>
										<dt className="text-xs text-[#5A5249] mb-0.5">Payé le</dt>
										<dd className="text-sm text-[#F5F0EB]">
											{formatDateTime(reservation.payment.paidAt)}
										</dd>
									</div>
								)}
								{reservation.payment.failureReason && (
									<div className="col-span-2">
										<dt className="text-xs text-[#5A5249] mb-0.5">Motif d&apos;échec</dt>
										<dd className="text-sm text-red-400">{reservation.payment.failureReason}</dd>
									</div>
								)}
							</dl>
						</div>
					)}
				</div>

				<div className="space-y-6">
					<AdminReservationActions
						reservation={{ id: reservation.id, status: reservation.status, payment: reservation.payment }}
					/>
					{reservation.user && (
						<div className="bg-[#141414] border border-[#222] rounded-xl p-5">
							<h3 className="font-display text-base text-[#F5F0EB] mb-3">Compte client</h3>
							<p className="text-sm text-[#F5F0EB]">
								{reservation.user.firstName} {reservation.user.lastName}
							</p>
							<p className="text-xs text-[#5A5249] mb-2">{reservation.user.email}</p>
							<Link
								href={`/admin/customers/${reservation.user.id}`}
								className="text-xs text-[#C8973A] hover:underline"
							>
								Voir la fiche client →
							</Link>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
