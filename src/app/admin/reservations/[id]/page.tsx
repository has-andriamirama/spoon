import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { formatDate, formatPrice, getInitials } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
	RESERVATION_STATUSES,
	PAYMENT_STATUSES,
	ZONE_LABELS,
} from "@/lib/constants";
import Link from "next/link";
import {
	ArrowLeft,
	Mail,
	Phone,
	Users,
	Clock,
	CalendarDays,
	MapPin,
	CreditCard,
	Receipt,
	ExternalLink,
	Utensils,
} from "lucide-react";
import ReservationActions from "./reservation-actions";

export const dynamic = "force-dynamic";

const VARIANT_MAP: Record<
	string,
	"yellow" | "green" | "red" | "gray" | "orange" | "blue"
> = {
	yellow: "yellow",
	green: "green",
	red: "red",
	gray: "gray",
	orange: "orange",
	blue: "blue",
};

const PAYMENT_TYPE_LABELS: Record<string, string> = {
	DEPOSIT: "Acompte",
	FULL:    "Paiement complet",
	NONE:    "Sans paiement",
};

const SERVICE_STATUS_LABELS: Record<string, { label: string; color: string }> = {
	OUVERTE:           { label: "En cours",         color: "blue"   },
	ADDITION_DEMANDEE: { label: "Addition demandée", color: "yellow" },
	PAYEE:             { label: "Payée",             color: "green"  },
	ANNULEE:           { label: "Annulée",           color: "red"    },
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
	CB:           "Carte bancaire",
	ESPECES:      "Espèces",
	CHEQUE:       "Chèque",
	TICKET_RESTO: "Ticket-restaurant",
};

export default async function AdminReservationDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;

	const reservation = await prisma.reservation.findUnique({
		where: { id },
		include: {
			payment: true,
			invoice: true,
			table: {
				select: { id: true, numero: true, zone: true, capaciteMax: true },
			},
			user: {
				select: {
					id: true,
					firstName: true,
					lastName: true,
					email: true,
				},
			},
			serviceOrder: {
				include: {
					items: {
						orderBy: { course: "asc" },
					},
				},
			},
		},
	});

	if (!reservation) notFound();

	const st  = RESERVATION_STATUSES[reservation.status];
	const pst = reservation.payment
		? PAYMENT_STATUSES[reservation.payment.status]
		: null;

	const fullName = `${reservation.guestFirstName} ${reservation.guestLastName}`;
	const initials  = getInitials(reservation.guestFirstName, reservation.guestLastName);

	const isActive = ["PENDING", "CONFIRMED"].includes(reservation.status);

	const serviceOrder = reservation.serviceOrder ?? null;
	const hasAddition  = !!serviceOrder && serviceOrder.status !== "ANNULEE";

	return (
		<div className="max-w-full">
			<Link
				href="/admin/reservations"
				className="inline-flex items-center gap-2 text-sm text-[#5A5249] hover:text-[#F5F0EB] mb-6 transition-colors"
			>
				<ArrowLeft size={15} />
				Retour aux réservations
			</Link>

			<div className="bg-[#141414] border border-[#222] rounded-xl overflow-hidden">

				<div className="px-6 py-5 border-b border-[#222] flex items-center justify-between gap-4">
					<div className="flex items-center gap-4 min-w-0">
						<div className="w-12 h-12 rounded-full bg-[#C8973A]/10 border border-[#C8973A]/20 flex items-center justify-center text-base font-semibold text-[#C8973A] shrink-0">
							{initials}
						</div>
						<div className="min-w-0">
							<h1 className="font-display text-xl text-[#F5F0EB] truncate">
								{fullName}
							</h1>
							<p className="text-xs text-[#5A5249] mt-0.5">
								Réf. #{id.slice(-8).toUpperCase()}
							</p>
						</div>
					</div>
					<div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
						<Badge variant={VARIANT_MAP[st.color]} className="text-xs">
							{st.label}
						</Badge>
						{pst && (
							<Badge variant={VARIANT_MAP[pst.color]} className="text-xs">
								{pst.label}
							</Badge>
						)}
					</div>
				</div>

				{/* Key info grid */}
				<div className="grid grid-cols-2 sm:grid-cols-4 border-b border-[#222]">
					{[
						{
							icon: CalendarDays,
							label: "Date",
							value: formatDate(reservation.date, "EEEE dd MMMM yyyy"),
							accent: false,
						},
						{
							icon: Clock,
							label: "Heure",
							value: reservation.timeSlot,
							sub: Number(reservation.timeSlot.split(":")[0]) < 17 ? "Service midi" : "Service soir",
						},
						{
							icon: Users,
							label: "Couverts",
							value: `${reservation.covers} personne${reservation.covers > 1 ? "s" : ""}`,
						},
						{
							icon: MapPin,
							label: "Table",
							value: reservation.table
								? `T${reservation.table.numero}`
								: "Non assignée",
							sub: reservation.table
								? ZONE_LABELS[reservation.table.zone]?.label
								: "Après confirmation",
							muted: !reservation.table,
						},
					].map(({ icon: Icon, label, value, sub, muted }) => (
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
									muted ? "text-[#5A5249] italic" : "text-[#F5F0EB]"
								}`}
							>
								{value}
							</p>
							{sub && (
								<p className="text-[11px] text-[#5A5249] mt-0.5">{sub}</p>
							)}
						</div>
					))}
				</div>

				{/* Contact section */}
				<div className="px-6 py-4 border-b border-[#222]">
					<p className="text-[10px] font-semibold uppercase tracking-wider text-[#5A5249] mb-3">
						Contact
					</p>
					<div className="flex flex-col sm:flex-row gap-3">
						<a
							href={`mailto:${reservation.guestEmail}`}
							className="flex items-center gap-2 text-sm text-[#F5F0EB] hover:text-[#C8973A] transition-colors"
						>
							<Mail size={13} className="text-[#5A5249]" />
							{reservation.guestEmail}
						</a>
						<a
							href={`tel:${reservation.guestPhone}`}
							className="flex items-center gap-2 text-sm text-[#F5F0EB] hover:text-[#C8973A] transition-colors"
						>
							<Phone size={13} className="text-[#5A5249]" />
							{reservation.guestPhone}
						</a>
					</div>

					{/* Linked customer account */}
					{reservation.user && (
						<div className="mt-3 pt-3 border-t border-[#1a1a1a] flex items-center justify-between">
							<div>
								<p className="text-xs text-[#9A8F84]">
									Compte client :{" "}
									<span className="text-[#F5F0EB] font-medium">
										{reservation.user.firstName} {reservation.user.lastName}
									</span>
								</p>
							</div>
							<Link
								href={`/admin/customers/${reservation.user.id}`}
								className="flex items-center gap-1 text-xs text-[#C8973A] hover:underline"
							>
								Voir la fiche <ExternalLink size={11} />
							</Link>
						</div>
					)}
				</div>

				{/* Occasion + notes + allergies */}
				{(reservation.occasion || reservation.notes || reservation.allergies || reservation.adminNotes) && (
					<div className="px-6 py-4 border-b border-[#222] space-y-3">
						<p className="text-[10px] font-semibold uppercase tracking-wider text-[#5A5249]">
							Notes
						</p>
						{reservation.occasion && (
							<div className="flex items-start gap-2">
								<span className="text-xs text-[#5A5249] w-24 shrink-0">Occasion</span>
								<span className="text-xs text-[#C8973A] border border-[#C8973A]/30 bg-[#C8973A]/5 px-2 py-0.5 rounded-md">
									{reservation.occasion}
								</span>
							</div>
						)}
						{reservation.notes && (
							<div className="flex items-start gap-2">
								<span className="text-xs text-[#5A5249] w-24 shrink-0">Client</span>
								<span className="text-xs text-[#9A8F84] leading-relaxed">{reservation.notes}</span>
							</div>
						)}
						{reservation.allergies && (
							<div className="flex items-start gap-2">
								<span className="text-xs text-[#5A5249] w-24 shrink-0">Allergies</span>
								<span className="text-xs text-orange-400 leading-relaxed">{reservation.allergies}</span>
							</div>
						)}
						{reservation.adminNotes && (
							<div className="flex items-start gap-2">
								<span className="text-xs text-[#5A5249] w-24 shrink-0">Admin</span>
								<span className="text-xs text-[#9A8F84] leading-relaxed">{reservation.adminNotes}</span>
							</div>
						)}
					</div>
				)}

				{/* Payment section */}
				{reservation.payment && pst && (
					<div className="px-6 py-4 border-b border-[#222]">
						<div className="flex items-center justify-between mb-3">
							<p className="text-[10px] font-semibold uppercase tracking-wider text-[#5A5249] flex items-center gap-1.5">
								<CreditCard size={11} />
								Acompte &amp; paiement
							</p>
							<Badge variant={VARIANT_MAP[pst.color]} className="text-[10px]">
								{pst.label}
							</Badge>
						</div>

						<div className="bg-[#0A0A0A] rounded-xl border border-[#1a1a1a] divide-y divide-[#1a1a1a] overflow-hidden">
							{[
								{
									label: "Type",
									value: PAYMENT_TYPE_LABELS[reservation.payment.type] ?? reservation.payment.type,
								},
								{
									label: "Montant",
									value: formatPrice(reservation.payment.amount),
								},
								...(reservation.payment.paidAt
									? [{ label: "Payé le", value: formatDate(reservation.payment.paidAt, "dd/MM/yyyy à HH:mm") }]
									: []),
								...(reservation.payment.refundedAmount
									? [{ label: "Remboursé", value: formatPrice(reservation.payment.refundedAmount) }]
									: []),
								...(reservation.payment.refundedAt
									? [{ label: "Remboursé le", value: formatDate(reservation.payment.refundedAt, "dd/MM/yyyy à HH:mm") }]
									: []),
								...(reservation.payment.stripePaymentIntentId
									? [
											{
												label: "Stripe ID",
												value: reservation.payment.stripePaymentIntentId,
												mono: true,
												small: true,
											},
										]
									: []),
								...(reservation.payment.failureReason
									? [{ label: "Motif d'échec", value: reservation.payment.failureReason, danger: true }]
									: []),
							].map(({ label, value, mono, small, danger }) => (
								<div key={label} className="flex items-start justify-between px-3 py-2.5">
									<span className="text-xs text-[#5A5249]">{label}</span>
									<span
										className={`text-right break-all max-w-[60%] ${
											mono
												? "font-mono text-[10px] text-[#5A5249]"
												: small
												? "text-xs text-[#5A5249]"
												: danger
												? "text-xs text-red-400"
												: "text-xs font-medium text-[#F5F0EB]"
										}`}
									>
										{value}
									</span>
								</div>
							))}
						</div>

						{/* Invoice link */}
						{reservation.invoice && (
							<Link
								href={`/admin/invoices/${reservation.invoice.id}`}
								className="mt-3 flex items-center justify-between px-3 py-2.5 bg-[#0A0A0A] rounded-xl border border-[#1a1a1a] hover:border-[#C8973A]/30 transition-colors"
							>
								<span className="flex items-center gap-2 text-xs text-[#9A8F84]">
									<Receipt size={12} />
									Facture #{reservation.invoice.invoiceNumber}
								</span>
								<ExternalLink size={11} className="text-[#5A5249]" />
							</Link>
						)}
					</div>
				)}

				{/* Addition / service order section */}
				{hasAddition && serviceOrder && (
					<div className="px-6 py-4 border-b border-[#222]">
						<div className="flex items-center justify-between mb-3">
							<p className="text-[10px] font-semibold uppercase tracking-wider text-[#5A5249] flex items-center gap-1.5">
								<Utensils size={11} />
								Addition — Plan de salle
							</p>
							<Badge
								variant={VARIANT_MAP[SERVICE_STATUS_LABELS[serviceOrder.status]?.color ?? "gray"]}
								className="text-[10px]"
							>
								{SERVICE_STATUS_LABELS[serviceOrder.status]?.label ?? serviceOrder.status}
							</Badge>
						</div>

						{/* Items */}
						{serviceOrder.items.length > 0 && (
							<div className="bg-[#0A0A0A] rounded-xl border border-[#1a1a1a] overflow-hidden mb-3">
								{serviceOrder.items.map((item, idx) => (
									<div
										key={item.id}
										className={`flex items-center justify-between px-3 py-2.5 ${
											idx < serviceOrder.items.length - 1 ? "border-b border-[#1a1a1a]" : ""
										}`}
									>
										<div className="min-w-0">
											<span className="text-xs text-[#F5F0EB] font-medium">{item.dishName}</span>
											{item.qty > 1 && (
												<span className="text-[10px] text-[#5A5249] ml-2">×{item.qty}</span>
											)}
										</div>
										<span className="text-xs text-[#9A8F84] shrink-0 ml-3">
											{formatPrice(item.totalPrice)}
										</span>
									</div>
								))}
							</div>
						)}

						{/* Summary */}
						<div className="bg-[#0A0A0A] rounded-xl border border-[#1a1a1a] divide-y divide-[#1a1a1a] overflow-hidden">
							{serviceOrder.depositDeducted > 0 && (
								<div className="flex justify-between px-3 py-2.5">
									<span className="text-xs text-[#5A5249]">Acompte déduit</span>
									<span className="text-xs text-green-400">
										−{formatPrice(serviceOrder.depositDeducted)}
									</span>
								</div>
							)}
							<div className="flex justify-between px-3 py-2.5">
								<span className="text-xs font-semibold text-[#F5F0EB]">Total</span>
								<span className="text-xs font-semibold text-[#C8973A]">
									{formatPrice(serviceOrder.totalAmount)}
								</span>
							</div>
							{serviceOrder.paymentMethod && (
								<div className="flex justify-between px-3 py-2.5">
									<span className="text-xs text-[#5A5249]">Mode de paiement</span>
									<span className="text-xs text-[#9A8F84]">
										{PAYMENT_METHOD_LABELS[serviceOrder.paymentMethod] ?? serviceOrder.paymentMethod}
									</span>
								</div>
							)}
							{serviceOrder.closedAt && (
								<div className="flex justify-between px-3 py-2.5">
									<span className="text-xs text-[#5A5249]">Encaissé le</span>
									<span className="text-xs text-[#9A8F84]">
										{formatDate(serviceOrder.closedAt, "dd/MM/yyyy à HH:mm")}
									</span>
								</div>
							)}
						</div>
					</div>
				)}

				{/* Timestamps */}
				<div className="px-6 py-4 border-b border-[#222]">
					<p className="text-[10px] font-semibold uppercase tracking-wider text-[#5A5249] mb-3">
						Historique
					</p>
					<div className="bg-[#0A0A0A] rounded-xl border border-[#1a1a1a] divide-y divide-[#1a1a1a] overflow-hidden">
						{[
							{ label: "Créée le",      value: formatDate(reservation.createdAt, "dd/MM/yyyy à HH:mm") },
							...(reservation.confirmedAt
								? [{ label: "Confirmée le", value: formatDate(reservation.confirmedAt, "dd/MM/yyyy à HH:mm") }]
								: []),
							...(reservation.tableAssignedAt
								? [{ label: "Table assignée le", value: formatDate(reservation.tableAssignedAt, "dd/MM/yyyy à HH:mm") }]
								: []),
							...(reservation.completedAt
								? [{ label: "Terminée le", value: formatDate(reservation.completedAt, "dd/MM/yyyy à HH:mm") }]
								: []),
							...(reservation.cancelledAt
								? [{ label: "Annulée le", value: formatDate(reservation.cancelledAt, "dd/MM/yyyy à HH:mm") }]
								: []),
						].map(({ label, value }) => (
							<div key={label} className="flex justify-between px-3 py-2.5">
								<span className="text-xs text-[#5A5249]">{label}</span>
								<span className="text-xs text-[#9A8F84]">{value}</span>
							</div>
						))}
						<div className="flex justify-between px-3 py-2.5">
							<span className="text-xs text-[#5A5249]">Référence</span>
							<span className="font-mono text-[10px] text-[#5A5249] break-all">{id}</span>
						</div>
						{reservation.cancellationReason && (
							<div className="flex justify-between px-3 py-2.5">
								<span className="text-xs text-[#5A5249]">Motif d'annulation</span>
								<span className="text-xs text-red-400 max-w-[60%] text-right">
									{reservation.cancellationReason}
								</span>
							</div>
						)}
					</div>
				</div>

				{/* Actions (client component) */}
				{isActive && (
					<div className="px-6 py-5">
						<ReservationActions
							reservation={{
								id: reservation.id,
								status: reservation.status,
								covers: reservation.covers,
								payment: reservation.payment,
							}}
						/>
					</div>
				)}
			</div>
		</div>
	);
}
