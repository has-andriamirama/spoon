import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { RESERVATION_STATUSES, PAYMENT_STATUSES } from "@/lib/constants";
import { formatDate, formatPrice, formatDateTime } from "@/lib/utils";
import Link from "next/link";
import { Calendar, Clock, Users, Mail, Phone, ArrowLeft } from "lucide-react";
import CancelReservationButton from "./cancel-button";
import RetryPaymentButton from "./retry-payment-button";
import ReactivateReservationButton from "./reactivate-button";
import AccountReservationsRealtimeUpdater from "../realtime-updater";

export const dynamic = "force-dynamic";

const colorVariantMap: Record<string, "yellow" | "green" | "red" | "gray" | "orange" | "blue"> = {
	yellow: "yellow",
	green: "green",
	red: "red",
	gray: "gray",
	orange: "orange",
	blue: "blue",
};

export default async function ReservationDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	const session = await getServerSession(authOptions);
	if (!session) redirect("/auth/login");

	const reservation = await prisma.reservation.findFirst({
		where: { id, userId: session.user.id },
		include: { payment: true, invoice: true },
	});
	if (!reservation) notFound();

	const settings = await prisma.restaurantSettings.findFirst();
	const freeCancelHours = settings?.freeCancellationHours ?? 24; // 24h

	const status = RESERVATION_STATUSES[reservation.status];
	const paymentStatusInfo = reservation.payment
		? PAYMENT_STATUSES[reservation.payment.status]
		: null;

	const reservationDate = new Date(reservation.date);
	const now = new Date();

	const canCancel =
		["PENDING", "CONFIRMED"].includes(reservation.status) &&
		reservationDate > new Date(now.getTime() + freeCancelHours * 60 * 60 * 1000);

	const refundEligible =
		reservation.payment?.status === "PAID" &&
		reservationDate > new Date(now.getTime() + freeCancelHours * 60 * 60 * 1000);

	const canRetryPayment =
		(reservation.payment?.status === "FAILED" ||
			reservation.payment?.status === "PENDING") &&
		!["CANCELLED_BY_CUSTOMER", "CANCELLED_BY_ADMIN"].includes(reservation.status);

	const canReactivate =
		["CANCELLED_BY_CUSTOMER", "CANCELLED_BY_ADMIN"].includes(reservation.status) &&
		reservationDate > now;

	return (
		<div>
			<AccountReservationsRealtimeUpdater userId={session.user.id} />

			<Link
				href="/account/reservations"
				className="inline-flex items-center gap-2 text-sm text-[#9A8F84] hover:text-[#F5F0EB] mb-6 transition-colors"
			>
				<ArrowLeft size={16} /> Retour aux réservations
			</Link>

			<div className="flex items-start justify-between gap-4 mb-8">
				<h1 className="font-display text-3xl text-[#F5F0EB]">
					Réservation du {formatDate(reservation.date)}
				</h1>
				<Badge variant={colorVariantMap[status.color] ?? "gray"}>{status.label}</Badge>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<div className="bg-[#141414] border border-[#222] rounded-xl p-6">
					<h2 className="font-display text-xl text-[#F5F0EB] mb-5">Détails</h2>
					<div className="space-y-4">
						{[
							{ icon: Calendar, label: "Date", value: formatDate(reservation.date, "EEEE d MMMM yyyy") },
							{ icon: Clock,    label: "Heure", value: reservation.timeSlot },
							{ icon: Users,    label: "Couverts", value: `${reservation.covers} personne${reservation.covers > 1 ? "s" : ""}` },
							{ icon: Mail,     label: "Email", value: reservation.guestEmail },
							{ icon: Phone,    label: "Téléphone", value: reservation.guestPhone },
						].map(({ icon: Icon, label, value }) => (
							<div key={label} className="flex items-start gap-3">
								<Icon size={16} className="text-[#C8973A] mt-0.5 shrink-0" />
								<div>
									<p className="text-xs text-[#5A5249]">{label}</p>
									<p className="text-sm text-[#F5F0EB]">{value}</p>
								</div>
							</div>
						))}
						{reservation.notes && (
							<div className="pt-3 border-t border-[#222]">
								<p className="text-xs text-[#5A5249] mb-1">Notes</p>
								<p className="text-sm text-[#9A8F84]">{reservation.notes}</p>
							</div>
						)}
						{reservation.cancellationReason && (
							<div className="pt-3 border-t border-[#222]">
								<p className="text-xs text-[#5A5249] mb-1">Motif d&apos;annulation</p>
								<p className="text-sm text-[#9A8F84]">{reservation.cancellationReason}</p>
							</div>
						)}
					</div>
				</div>

				<div className="flex flex-col gap-4">
					{reservation.payment && paymentStatusInfo && (
						<div className="bg-[#141414] border border-[#222] rounded-xl p-6">
							<h2 className="font-display text-xl text-[#F5F0EB] mb-4">Paiement</h2>
							<div className="space-y-3">
								<div className="flex justify-between text-sm">
									<span className="text-[#9A8F84]">Montant</span>
									<span className="text-[#F5F0EB] font-medium">
										{formatPrice(reservation.payment.amount)}
									</span>
								</div>
								<div className="flex justify-between text-sm">
									<span className="text-[#9A8F84]">Statut</span>
									<Badge variant={colorVariantMap[paymentStatusInfo.color] ?? "gray"}>
										{paymentStatusInfo.label}
									</Badge>
								</div>
								{reservation.payment.paidAt && (
									<div className="flex justify-between text-sm">
										<span className="text-[#9A8F84]">Payé le</span>
										<span className="text-[#F5F0EB]">{formatDateTime(reservation.payment.paidAt)}</span>
									</div>
								)}
								{reservation.payment.refundedAt && (
									<div className="flex justify-between text-sm">
										<span className="text-[#9A8F84]">Remboursé le</span>
										<span className="text-green-400">{formatDateTime(reservation.payment.refundedAt)}</span>
									</div>
								)}
								{reservation.payment.failureReason && (
									<div className="pt-2 border-t border-[#222]">
										<p className="text-xs text-red-400">{reservation.payment.failureReason}</p>
									</div>
								)}
							</div>
						</div>
					)}

					{reservation.invoice && (
						<div className="bg-[#141414] border border-[#222] rounded-xl p-6">
							<h2 className="font-display text-xl text-[#F5F0EB] mb-3">Facture</h2>
							<p className="text-sm text-[#9A8F84] mb-3">N° {reservation.invoice.invoiceNumber}</p>
							{reservation.invoice.pdfUrl && (
								<a
									href={reservation.invoice.pdfUrl}
									target="_blank"
									rel="noopener noreferrer"
									className="inline-flex items-center gap-2 text-sm text-[#C8973A] hover:underline"
								>
									Télécharger la facture PDF
								</a>
							)}
						</div>
					)}

					{canRetryPayment && (
						<RetryPaymentButton
							reservationId={reservation.id}
							paymentStatus={reservation.payment!.status as "FAILED" | "PENDING"}
						/>
					)}

					{canCancel && (
						<CancelReservationButton
							reservationId={reservation.id}
							refundEligible={refundEligible}
							depositAmount={reservation.payment?.amount}
						/>
					)}

					{canReactivate && <ReactivateReservationButton reservationId={reservation.id} />}
				</div>
			</div>
		</div>
	);
}
