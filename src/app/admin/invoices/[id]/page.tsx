import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { formatDate, formatDateTime, formatPrice, getInitials } from "@/lib/utils";
import Link from "next/link";
import {
	ArrowLeft,
	Download,
	FileText,
	CalendarDays,
	Mail,
	ExternalLink,
	CreditCard,
	Receipt,
	Percent,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminInvoiceDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;

	const invoice = await prisma.invoice.findUnique({
		where: { id },
		include: {
			reservation: {
				include: {
					payment: {
						select: { id: true, status: true, amount: true, type: true },
					},
				},
			},
			user: {
				select: { id: true, firstName: true, lastName: true, email: true },
			},
		},
	});

	if (!invoice) notFound();

	const fullName = `${invoice.reservation.guestFirstName} ${invoice.reservation.guestLastName}`;
	const initials = getInitials(invoice.reservation.guestFirstName, invoice.reservation.guestLastName);

	return (
		<div className="max-w-full">

			{/* ── Back link ── */}
			<Link
				href="/admin/invoices"
				className="inline-flex items-center gap-2 text-sm text-[#5A5249] hover:text-[#F5F0EB] mb-6 transition-colors"
			>
				<ArrowLeft size={15} />
				Retour aux factures
			</Link>

			<div className="bg-[#141414] border border-[#222] rounded-xl overflow-hidden">

				{/* ── Header ── */}
				<div className="px-6 py-5 border-b border-[#222] flex items-center justify-between gap-4">
					<div className="flex items-center gap-4 min-w-0">
						<div className="w-12 h-12 rounded-full bg-[#C8973A]/10 border border-[#C8973A]/20 flex items-center justify-center text-base font-semibold text-[#C8973A] shrink-0">
							{initials}
						</div>
						<div className="min-w-0">
							<h1 className="font-display text-xl text-[#F5F0EB] truncate">
								Facture {invoice.invoiceNumber}
							</h1>
							<p className="text-xs text-[#5A5249] mt-0.5">{fullName}</p>
						</div>
					</div>
					{invoice.pdfUrl && (
						<a
							href={invoice.pdfUrl}
							target="_blank"
							rel="noopener noreferrer"
							className="flex items-center gap-2 h-9 px-4 bg-[#C8973A] hover:bg-[#E8B04A] text-[#0A0A0A] font-semibold text-sm rounded-lg transition-colors shrink-0"
						>
							<Download size={14} />
							<span className="hidden sm:inline">Télécharger PDF</span>
							<span className="sm:hidden">PDF</span>
						</a>
					)}
				</div>

				{/* ── Key info grid ── */}
				<div className="grid grid-cols-2 sm:grid-cols-4 border-b border-[#222]">
					{[
						{
							icon: CreditCard,
							label: "Total TTC",
							value: formatPrice(invoice.totalAmount),
							accent: true,
						},
						{
							icon: Receipt,
							label: "Montant HT",
							value: formatPrice(invoice.amount),
						},
						{
							icon: Percent,
							label: "TVA",
							value: formatPrice(invoice.taxAmount),
						},
						{
							icon: CalendarDays,
							label: "Date d'émission",
							value: formatDate(invoice.issuedAt, "dd/MM/yyyy"),
						},
					].map(({ icon: Icon, label, value, accent }) => (
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
							<p className={`text-sm font-medium leading-tight ${accent ? "text-[#C8973A]" : "text-[#F5F0EB]"}`}>
								{value}
							</p>
						</div>
					))}
				</div>

				{/* ── Body: two columns ── */}
				<div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-[#222]">

					{/* ── Client contact ── */}
					<div className="px-6 py-5 space-y-4">
						<p className="text-[10px] font-semibold uppercase tracking-wider text-[#5A5249]">
							Client
						</p>

						<div className="flex items-center gap-3">
							<div className="w-10 h-10 rounded-full bg-[#C8973A]/10 border border-[#C8973A]/20 flex items-center justify-center text-sm font-semibold text-[#C8973A] shrink-0">
								{initials}
							</div>
							<div className="min-w-0">
								<p className="text-sm font-medium text-[#F5F0EB]">{fullName}</p>
								<p className="text-xs text-[#5A5249] flex items-center gap-1 mt-0.5">
									<Mail size={10} />
									{invoice.guestEmail}
								</p>
							</div>
						</div>

						{invoice.user && (
							<Link
								href={`/admin/customers/${invoice.user.id}`}
								className="flex items-center justify-between gap-3 p-3 rounded-lg bg-[#0A0A0A] border border-[#1a1a1a] hover:border-[#C8973A]/30 transition-colors group"
							>
								<div className="min-w-0">
									<p className="text-xs text-[#5A5249]">Compte client</p>
									<p className="text-sm text-[#F5F0EB] font-medium truncate">
										{invoice.user.firstName} {invoice.user.lastName}
									</p>
								</div>
								<ExternalLink size={14} className="text-[#5A5249] group-hover:text-[#C8973A] shrink-0 transition-colors" />
							</Link>
						)}

						<dl className="space-y-3 pt-1">
							<div className="flex items-center justify-between gap-4">
								<dt className="text-xs text-[#5A5249]">N° Facture</dt>
								<dd className="text-sm font-mono font-medium text-[#F5F0EB]">{invoice.invoiceNumber}</dd>
							</div>
							<div className="flex items-center justify-between gap-4">
								<dt className="text-xs text-[#5A5249]">Créée le</dt>
								<dd className="text-sm text-[#F5F0EB]">{formatDateTime(invoice.createdAt)}</dd>
							</div>
							{!invoice.pdfUrl && (
								<div className="flex items-center justify-between gap-4">
									<dt className="text-xs text-[#5A5249]">PDF</dt>
									<dd className="text-xs text-[#5A5249] italic flex items-center gap-1">
										<FileText size={10} />
										Non disponible
									</dd>
								</div>
							)}
						</dl>
					</div>

					{/* ── Reservation liée ── */}
					<div className="px-6 py-5 space-y-4">
						<p className="text-[10px] font-semibold uppercase tracking-wider text-[#5A5249]">
							Réservation liée
						</p>

						<Link
							href={`/admin/reservations/${invoice.reservation.id}`}
							className="flex items-center justify-between gap-3 p-3 rounded-lg bg-[#0A0A0A] border border-[#1a1a1a] hover:border-[#C8973A]/30 transition-colors group"
						>
							<div className="flex items-center gap-3 min-w-0">
								<div className="w-8 h-8 rounded-full bg-[#C8973A]/10 border border-[#C8973A]/20 flex items-center justify-center text-xs font-semibold text-[#C8973A] shrink-0">
									{initials}
								</div>
								<div className="min-w-0">
									<p className="text-sm text-[#F5F0EB] font-medium truncate">{fullName}</p>
									<p className="text-xs text-[#5A5249]">
										{formatDate(invoice.reservation.date, "dd MMMM yyyy")} · {invoice.reservation.timeSlot}
									</p>
								</div>
							</div>
							<ExternalLink size={14} className="text-[#5A5249] group-hover:text-[#C8973A] shrink-0 transition-colors" />
						</Link>

						{invoice.reservation.payment && (
							<>
								<p className="text-[10px] font-semibold uppercase tracking-wider text-[#5A5249] pt-1">
									Paiement lié
								</p>
								<Link
									href={`/admin/payments/${invoice.reservation.payment.id}`}
									className="flex items-center justify-between gap-3 p-3 rounded-lg bg-[#0A0A0A] border border-[#1a1a1a] hover:border-[#C8973A]/30 transition-colors group"
								>
									<div className="flex items-center gap-3 min-w-0">
										<div className="w-8 h-8 rounded-lg bg-[#1a1a1a] border border-[#222] flex items-center justify-center shrink-0">
											<CreditCard size={14} className="text-[#9A8F84]" />
										</div>
										<div className="min-w-0">
											<p className="text-sm text-[#F5F0EB] font-medium">
												{formatPrice(invoice.reservation.payment.amount)}
											</p>
											<p className="text-xs text-[#5A5249]">Voir le paiement</p>
										</div>
									</div>
									<ExternalLink size={14} className="text-[#5A5249] group-hover:text-[#C8973A] shrink-0 transition-colors" />
								</Link>
							</>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
