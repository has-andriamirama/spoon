import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { formatDate, formatPrice } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ZONE_LABELS } from "@/lib/constants";
import Link from "next/link";
import {
	ArrowLeft,
	TableProperties,
	Users,
	Clock,
	MapPin,
	Receipt,
	ExternalLink,
	UtensilsCrossed,
	Banknote,
	CalendarDays,
	LinkIcon,
} from "lucide-react";

export const dynamic = "force-dynamic";

const VARIANT_MAP: Record<string, "yellow" | "green" | "red" | "gray" | "orange" | "blue"> = {
	yellow: "yellow",
	green:  "green",
	red:    "red",
	gray:   "gray",
	orange: "orange",
	blue:   "blue",
};

const SERVICE_STATUS_META: Record<string, { label: string; color: string }> = {
	OUVERTE:           { label: "En cours",          color: "blue"   },
	ADDITION_DEMANDEE: { label: "Addition demandée", color: "yellow" },
	PAYEE:             { label: "Payée",             color: "green"  },
	ANNULEE:           { label: "Annulée",           color: "red"    },
};

const SERVICE_TYPE_LABELS: Record<string, string> = {
	RESERVATION: "Réservation",
	WALK_IN:     "Sur place",
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
	CB:           "Carte bancaire",
	ESPECES:      "Espèces",
	CHEQUE:       "Chèque",
	TICKET_RESTO: "Ticket-restaurant",
};

const COURSE_LABELS: Record<string, string> = {
	ENTREE:  "Entrées",
	PLAT:    "Plats",
	DESSERT: "Desserts",
	BOISSON: "Boissons",
	EXTRA:   "Extras",
};

const COURSE_ORDER: Record<string, number> = {
	ENTREE: 1, PLAT: 2, DESSERT: 3, BOISSON: 4, EXTRA: 5,
};

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const order = await prisma.serviceOrder.findUnique({
		where: { id },
		include: { table: { select: { numero: true } } },
	});
	if (!order) return { title: "Commande introuvable — Spoon Admin" };
	return { title: `Commande T${order.table.numero} · ${order.guestName} — Spoon Admin` };
}

export default async function CommandeDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;

	const order = await prisma.serviceOrder.findUnique({
		where: { id },
		include: {
			table: {
				select: { id: true, numero: true, zone: true, capaciteMax: true, description: true },
			},
			reservation: {
				select: {
					id: true,
					guestFirstName: true,
					guestLastName: true,
					guestEmail: true,
					guestPhone: true,
					timeSlot: true,
					covers: true,
					date: true,
				},
			},
			items: { orderBy: { course: "asc" } },
		},
	});

	if (!order) notFound();

	const statusMeta = SERVICE_STATUS_META[order.status];

	const itemsByCourse: Record<string, typeof order.items> = {};
	for (const item of order.items) {
		const c = item.course ?? "PLAT";
		if (!itemsByCourse[c]) itemsByCourse[c] = [];
		itemsByCourse[c].push(item);
	}
	const courseGroups = Object.entries(itemsByCourse).sort(
		([a], [b]) => (COURSE_ORDER[a] ?? 9) - (COURSE_ORDER[b] ?? 9)
	);

	const subtotal   = order.items.reduce((s, i) => s + i.totalPrice, 0);
	const amountDue  = Math.max(0, subtotal - order.depositDeducted);

	return (
		<div className="max-w-full">
			<Link
				href="/admin/commandes"
				className="inline-flex items-center gap-2 text-sm text-[#5A5249] hover:text-[#F5F0EB] mb-6 transition-colors"
			>
				<ArrowLeft size={15} />
				Retour aux commandes
			</Link>

			<div className="bg-[#141414] border border-[#222] rounded-xl overflow-hidden">

				<div className="px-6 py-5 border-b border-[#222] flex items-center justify-between gap-4">
					<div className="flex items-center gap-4 min-w-0">
						<div className="w-12 h-12 rounded-full bg-[#C8973A]/10 border border-[#C8973A]/20 flex items-center justify-center shrink-0">
							<TableProperties size={20} className="text-[#C8973A]" />
						</div>
						<div className="min-w-0">
							<h1 className="font-display text-xl text-[#F5F0EB] truncate">
								Table {order.table.numero} — {order.guestName}
							</h1>
							<p className="text-xs text-[#5A5249] mt-0.5">
								Réf. #{id.slice(-8).toUpperCase()}
							</p>
						</div>
					</div>
					<div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
						<Badge variant={VARIANT_MAP[statusMeta?.color ?? "gray"]} className="text-xs">
							{statusMeta?.label ?? order.status}
						</Badge>
						<Badge variant="gray" className="text-xs">
							{SERVICE_TYPE_LABELS[order.type] ?? order.type}
						</Badge>
					</div>
				</div>

				<div className="grid grid-cols-2 sm:grid-cols-4 border-b border-[#222]">
					{[
						{
							icon: CalendarDays,
							label: "Ouvert le",
							value: formatDate(order.openedAt, "EEEE dd MMMM yyyy"),
							sub: formatDate(order.openedAt, "HH:mm"),
						},
						{
							icon: Clock,
							label: "Heure",
							value: formatDate(order.openedAt, "HH:mm"),
							sub: order.closedAt
								? `Clôturé à ${formatDate(order.closedAt, "HH:mm")}`
								: "En cours",
							muted: !order.closedAt,
						},
						{
							icon: Users,
							label: "Couverts",
							value: `${order.covers} personne${order.covers > 1 ? "s" : ""}`,
						},
						{
							icon: MapPin,
							label: "Table",
							value: `T${order.table.numero}`,
							sub: ZONE_LABELS[order.table.zone]?.label ?? order.table.zone,
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
							<p className={`text-sm font-medium leading-tight ${muted ? "text-[#5A5249] italic" : "text-[#F5F0EB]"}`}>
								{value}
							</p>
							{sub && <p className="text-[11px] text-[#5A5249] mt-0.5">{sub}</p>}
						</div>
					))}
				</div>

				{order.reservation && (
					<div className="px-6 py-4 border-b border-[#222]">
						<p className="text-[10px] font-semibold uppercase tracking-wider text-[#5A5249] mb-3 flex items-center gap-1.5">
							<LinkIcon size={11} />
							Réservation associée
						</p>
						<Link
							href={`/admin/reservations/${order.reservation.id}`}
							className="flex items-center justify-between px-3 py-2.5 bg-[#0A0A0A] rounded-xl border border-[#1a1a1a] hover:border-[#C8973A]/30 transition-colors"
						>
							<span className="flex items-center gap-2 text-xs text-[#9A8F84]">
								<Receipt size={12} />
								{order.reservation.guestFirstName} {order.reservation.guestLastName}{" "}
								· {order.reservation.timeSlot}
								· {order.reservation.covers} couvert{order.reservation.covers > 1 ? "s" : ""}
							</span>
							<ExternalLink size={11} className="text-[#5A5249] shrink-0" />
						</Link>
					</div>
				)}

				{order.notes && (
					<div className="px-6 py-4 border-b border-[#222]">
						<p className="text-[10px] font-semibold uppercase tracking-wider text-[#5A5249] mb-2">
							Notes
						</p>
						<p className="text-xs text-[#9A8F84] leading-relaxed">{order.notes}</p>
					</div>
				)}

				<div className="px-6 py-4 border-b border-[#222]">
					<p className="text-[10px] font-semibold uppercase tracking-wider text-[#5A5249] mb-3 flex items-center gap-1.5">
						<UtensilsCrossed size={11} />
						Plats commandés
					</p>

					{order.items.length === 0 ? (
						<p className="text-xs text-[#5A5249] italic">Aucun plat enregistré</p>
					) : (
						<div className="space-y-3">
							{courseGroups.map(([course, items]) => (
								<div key={course}>
									<p className="text-[10px] text-[#5A5249] font-semibold uppercase tracking-wider mb-1.5">
										{COURSE_LABELS[course] ?? course}
									</p>
									<div className="bg-[#0A0A0A] rounded-xl border border-[#1a1a1a] overflow-hidden">
										{items.map((item, idx) => (
											<div
												key={item.id}
												className={`flex items-center justify-between px-3 py-2.5 ${
													idx < items.length - 1 ? "border-b border-[#1a1a1a]" : ""
												}`}
											>
												<div className="min-w-0">
													<span className="text-xs text-[#F5F0EB] font-medium">{item.dishName}</span>
													{item.qty > 1 && (
														<span className="text-[10px] text-[#5A5249] ml-2">×{item.qty}</span>
													)}
													{item.notes && (
														<p className="text-[10px] text-[#9A8F84] mt-0.5 italic">{item.notes}</p>
													)}
												</div>
												<div className="text-right shrink-0 ml-3">
													<span className="text-xs text-[#9A8F84]">{formatPrice(item.totalPrice)}</span>
													{item.qty > 1 && (
														<span className="block text-[10px] text-[#333]">
															{formatPrice(item.unitPrice)} / u
														</span>
													)}
												</div>
											</div>
										))}
									</div>
								</div>
							))}
						</div>
					)}
				</div>

				<div className="px-6 py-4 border-b border-[#222]">
					<p className="text-[10px] font-semibold uppercase tracking-wider text-[#5A5249] mb-3 flex items-center gap-1.5">
						<Banknote size={11} />
						Addition
					</p>

					<div className="bg-[#0A0A0A] rounded-xl border border-[#1a1a1a] divide-y divide-[#1a1a1a] overflow-hidden">
						<div className="flex justify-between px-3 py-2.5">
							<span className="text-xs text-[#5A5249]">Sous-total</span>
							<span className="text-xs text-[#F5F0EB]">{formatPrice(subtotal)}</span>
						</div>

						{order.depositDeducted > 0 && (
							<div className="flex justify-between px-3 py-2.5">
								<span className="text-xs text-[#5A5249]">Acompte déduit</span>
								<span className="text-xs text-green-400">−{formatPrice(order.depositDeducted)}</span>
							</div>
						)}

						<div className="flex justify-between px-3 py-2.5">
							<span className="text-xs font-semibold text-[#F5F0EB]">
								{order.depositDeducted > 0 ? "Reste à payer" : "Total"}
							</span>
							<span className="text-xs font-semibold text-[#C8973A]">
								{formatPrice(order.depositDeducted > 0 ? amountDue : subtotal)}
							</span>
						</div>

						{order.paymentMethod && (
							<div className="flex justify-between px-3 py-2.5">
								<span className="text-xs text-[#5A5249]">Mode de paiement</span>
								<span className="text-xs text-[#9A8F84]">
									{PAYMENT_METHOD_LABELS[order.paymentMethod] ?? order.paymentMethod}
								</span>
							</div>
						)}

						{order.closedAt && (
							<div className="flex justify-between px-3 py-2.5">
								<span className="text-xs text-[#5A5249]">Encaissé le</span>
								<span className="text-xs text-[#9A8F84]">
									{formatDate(order.closedAt, "dd/MM/yyyy à HH:mm")}
								</span>
							</div>
						)}
					</div>
				</div>

				<div className="px-6 py-4">
					<p className="text-[10px] font-semibold uppercase tracking-wider text-[#5A5249] mb-3">
						Historique
					</p>
					<div className="bg-[#0A0A0A] rounded-xl border border-[#1a1a1a] divide-y divide-[#1a1a1a] overflow-hidden">
						{[
							{ label: "Ouvert le",   value: formatDate(order.openedAt,  "dd/MM/yyyy à HH:mm") },
							...(order.closedAt
								? [{ label: "Clôturé le", value: formatDate(order.closedAt, "dd/MM/yyyy à HH:mm") }]
								: []),
							{ label: "Créé le",     value: formatDate(order.createdAt, "dd/MM/yyyy à HH:mm") },
							{ label: "Référence",   value: id,  mono: true },
						].map(({ label, value, mono }) => (
							<div key={label} className="flex items-start justify-between px-3 py-2.5">
								<span className="text-xs text-[#5A5249] shrink-0">{label}</span>
								<span
									className={
										mono
											? "font-mono text-[10px] text-[#5A5249] break-all text-right"
											: "text-xs text-[#9A8F84] text-right"
									}
								>
									{value}
								</span>
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}
