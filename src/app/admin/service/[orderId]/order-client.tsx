"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
	ChevronLeft, Plus, Minus, UtensilsCrossed, Receipt,
	CreditCard, Check, X, ChevronDown, ChevronUp,
	Loader2, Users, Clock, Banknote, Ticket,
	AlertTriangle, ShoppingCart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ZONE_LABELS } from "@/lib/constants";
import type { ServiceOrderFull, ServiceOrderItemRow, MenuCategoryForService } from "@/types";

type PaymentMethod = "CB" | "ESPECES" | "CHEQUE" | "TICKET_RESTO";

interface Props {
	order: ServiceOrderFull;
	menu: MenuCategoryForService[];
	date: string;
}

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: React.ElementType }[] = [
	{ value: "CB",           label: "Carte bancaire", icon: CreditCard },
	{ value: "ESPECES",      label: "Espèces",        icon: Banknote   },
	{ value: "CHEQUE",       label: "Chèque",         icon: Receipt    },
	{ value: "TICKET_RESTO", label: "Ticket-resto",   icon: Ticket     },
];

const COURSE_ORDER: Record<string, number> = {
	ENTREE: 1, PLAT: 2, DESSERT: 3, BOISSON: 4, EXTRA: 5,
};
const COURSE_LABELS: Record<string, string> = {
	ENTREE: "Entrées", PLAT: "Plats", DESSERT: "Desserts", BOISSON: "Boissons", EXTRA: "Extras",
};

export default function OrderClient({ order: initialOrder, menu, date }: Props) {
	const router = useRouter();

	const [order,         setOrder]         = useState<ServiceOrderFull>(initialOrder);
	const [showPicker,    setShowPicker]     = useState(false);
	const [activeCat,     setActiveCat]      = useState(menu[0]?.id ?? "");
	const [showBillPanel, setShowBillPanel]  = useState(order.status === "ADDITION_DEMANDEE");
	const [payMethod,     setPayMethod]      = useState<PaymentMethod | null>(null);
	const [loading,       setLoading]        = useState<string | null>(null);
	const [error,         setError]          = useState<string | null>(null);
	const [itemNote,      setItemNote]       = useState<{ dishId: string; value: string } | null>(null);

	const planUrl = `/admin/reservations/plan?date=${date}`;

	const itemsTotal = useMemo(
		() => order.items.reduce((s, i) => s + i.totalPrice, 0),
		[order.items]
	);
	const amountDue = Math.max(0, itemsTotal - order.depositDeducted);

	const itemsByCourse = useMemo(() => {
		const groups: Record<string, ServiceOrderItemRow[]> = {};
		for (const item of order.items) {
			const c = item.course ?? "PLAT";
			if (!groups[c]) groups[c] = [];
			groups[c].push(item);
		}
		return Object.entries(groups).sort(
			([a], [b]) => (COURSE_ORDER[a] ?? 9) - (COURSE_ORDER[b] ?? 9)
		);
	}, [order.items]);

	const refreshOrder = useCallback(async () => {
		const res = await fetch(`/api/admin/service-orders/${order.id}`);
		if (res.ok) {
			const { data } = await res.json();
			setOrder(data);
		}
	}, [order.id]);

	// Add dishes
	const addItem = useCallback(async (dishId: string) => {
		const notes = itemNote?.dishId === dishId ? itemNote.value : undefined;
		setLoading(`add-${dishId}`);
		setError(null);
		try {
			const res = await fetch(`/api/admin/service-orders/${order.id}/items`, {
				method:  "POST",
				headers: { "Content-Type": "application/json" },
				body:    JSON.stringify({ dishId, qty: 1, notes }),
			});
			if (!res.ok) {
				const { error: e } = await res.json();
				setError(e ?? "Erreur lors de l'ajout");
				return;
			}
			setItemNote(null);
			await refreshOrder();
		} finally {
			setLoading(null);
		}
	}, [order.id, itemNote, refreshOrder]);

	const changeQty = useCallback(async (item: ServiceOrderItemRow, delta: number) => {
		const newQty = item.qty + delta;
		setLoading(`qty-${item.id}`);
		setError(null);
		try {
			if (newQty <= 0) {
				const res = await fetch(
					`/api/admin/service-orders/${order.id}/items/${item.id}`,
					{ method: "DELETE" }
				);
				if (!res.ok) {
					const { error: e } = await res.json();
					setError(e ?? "Erreur lors de la suppression");
					return;
				}
			} else {
				const res = await fetch(
					`/api/admin/service-orders/${order.id}/items/${item.id}`,
					{
						method:  "PATCH",
						headers: { "Content-Type": "application/json" },
						body:    JSON.stringify({ qty: newQty }),
					}
				);
				if (!res.ok) {
					const { error: e } = await res.json();
					setError(e ?? "Erreur lors de la modification");
					return;
				}
			}
			await refreshOrder();
		} finally {
			setLoading(null);
		}
	}, [order.id, refreshOrder]);

	const requestBill = useCallback(async () => {
		if (order.items.length === 0) return;
		setLoading("bill");
		setError(null);
		try {
			const res = await fetch(`/api/admin/service-orders/${order.id}`, {
				method:  "PATCH",
				headers: { "Content-Type": "application/json" },
				body:    JSON.stringify({ status: "ADDITION_DEMANDEE" }),
			});
			if (!res.ok) {
				const { error: e } = await res.json();
				setError(e ?? "Erreur");
				return;
			}
			const { data } = await res.json();
			setOrder(data);
			setShowPicker(false);
			setShowBillPanel(true);
		} finally {
			setLoading(null);
		}
	}, [order.id, order.items.length]);

	const pay = useCallback(async () => {
		if (!payMethod) return;
		setLoading("pay");
		setError(null);
		try {
			const res = await fetch(`/api/admin/service-orders/${order.id}/payer`, {
				method:  "POST",
				headers: { "Content-Type": "application/json" },
				body:    JSON.stringify({ paymentMethod: payMethod }),
			});
			if (!res.ok) {
				const { error: e } = await res.json();
				setError(e ?? "Erreur lors de l'encaissement");
				return;
			}
			router.push(planUrl);
			router.refresh();
		} finally {
			setLoading(null);
		}
	}, [order.id, payMethod, router, planUrl]);

	const reopenOrder = useCallback(async () => {
		setLoading("reopen");
		setError(null);
		try {
			const res = await fetch(`/api/admin/service-orders/${order.id}`, {
				method:  "PATCH",
				headers: { "Content-Type": "application/json" },
				body:    JSON.stringify({ status: "OUVERTE" }),
			});
			if (!res.ok) {
				const { error: e } = await res.json();
				setError(e ?? "Erreur lors de la réouverture");
				return;
			}
			const { data } = await res.json();
			setOrder(data);
			setShowBillPanel(false);
			setShowPicker(true);
		} finally {
			setLoading(null);
		}
	}, [order.id]);

	const isAdditionDemandee = order.status === "ADDITION_DEMANDEE";
	const isOuverte          = order.status === "OUVERTE";
	const isResa             = order.type   === "RESERVATION";

	return (
		<div className="min-h-screen bg-[#0A0A0A]">

			<div className="sticky top-0 z-20 bg-[#0A0A0A]/95 backdrop-blur border-b border-[#222]">
				<div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-4">
					<Link
						href={planUrl}
						className="flex items-center gap-1.5 text-sm text-[#5A5249] hover:text-[#9A8F84] transition-colors shrink-0"
					>
						<ChevronLeft size={16} />
						Plan de salle
					</Link>

					<div className="flex-1 min-w-0">
						<div className="flex items-center gap-2 flex-wrap">
							<span className="font-display text-lg text-[#F5F0EB] font-semibold">
								T{order.table.numero}
							</span>
							<span className="text-[#5A5249] text-sm">·</span>
							<span className="text-sm text-[#9A8F84]">
								{ZONE_LABELS[order.table.zone]?.label ?? order.table.zone}
							</span>
							<span className="text-[#5A5249] text-sm">·</span>
							<span className="flex items-center gap-1 text-sm text-[#9A8F84]">
								<Users size={13} /> {order.covers} cv
							</span>
							{isResa && order.reservation && (
								<>
									<span className="text-[#5A5249] text-sm">·</span>
									<span className="flex items-center gap-1 text-sm text-[#9A8F84]">
										<Clock size={13} /> {order.reservation.timeSlot}
									</span>
								</>
							)}
						</div>
						<p className="text-xs text-[#5A5249] mt-0.5 truncate">
							{order.guestName}
							{isResa && (
								<span className="ml-1.5 text-blue-500/70">Réservation</span>
							)}
							{!isResa && (
								<span className="ml-1.5 text-[#C8973A]/70">Walk-in</span>
							)}
						</p>
					</div>

					<StatusBadge status={order.status} />
				</div>
			</div>

			<div className="max-w-4xl mx-auto px-4 py-6 space-y-5">

				{isResa && order.depositDeducted > 0 && (
					<div className="flex items-center gap-2 text-sm text-green-400 bg-green-950/20 border border-green-900/30 rounded-xl px-4 py-2.5">
						<Check size={14} className="shrink-0" />
						Acompte de réservation encaissé : {order.depositDeducted.toFixed(2)} €
					</div>
				)}

				{error && (
					<div className="flex items-center gap-2 text-sm text-red-400 bg-red-950/20 border border-red-900/30 rounded-xl px-4 py-2.5">
						<AlertTriangle size={14} className="shrink-0" />
						{error}
						<button onClick={() => setError(null)} className="ml-auto text-red-600 hover:text-red-400">
							<X size={14} />
						</button>
					</div>
				)}

				<div className="bg-[#141414] border border-[#222] rounded-2xl overflow-hidden">
					<div className="px-5 py-3.5 border-b border-[#1e1e1e] flex items-center justify-between">
						<h2 className="text-sm font-semibold text-[#F5F0EB]">
							Articles commandés
						</h2>
						<span className="text-xs text-[#5A5249]">
							{order.items.length} article{order.items.length > 1 ? "s" : ""}
						</span>
					</div>

					{order.items.length === 0 ? (
						<div className="text-center py-10 px-4">
							<ShoppingCart size={28} className="text-[#2a2a2a] mx-auto mb-3" />
							<p className="text-sm text-[#5A5249]">Aucun article</p>
							<p className="text-xs text-[#333] mt-1">
								Utilisez le menu ci-dessous pour ajouter des plats
							</p>
						</div>
					) : (
						<div className="divide-y divide-[#1a1a1a]">
							{itemsByCourse.map(([course, items]) => (
								<div key={course}>
									<p className="text-[10px] font-semibold text-[#333] uppercase tracking-widest px-5 py-2 bg-[#0e0e0e]">
										{COURSE_LABELS[course] ?? course}
									</p>
									{items.map((item) => (
										<div key={item.id} className="flex items-center gap-3 px-5 py-3">
											<div className="flex-1 min-w-0">
												<p className="text-sm text-[#F5F0EB] leading-tight">
													{item.dishName}
												</p>
												{item.notes && (
													<p className="text-[11px] text-[#C8973A]/70 mt-0.5 italic">
														↳ {item.notes}
													</p>
												)}
												<p className="text-[11px] text-[#5A5249] mt-0.5">
													{item.unitPrice.toFixed(2)} € / u
												</p>
											</div>

											{isOuverte && (
												<div className="flex items-center gap-2 shrink-0">
													<button
														onClick={() => changeQty(item, -1)}
														disabled={loading === `qty-${item.id}`}
														className="w-7 h-7 rounded-full border border-[#2a2a2a] bg-[#1a1a1a] hover:border-red-800/60 hover:bg-red-950/20 text-[#5A5249] hover:text-red-400 transition-colors flex items-center justify-center disabled:opacity-40"
													>
														{loading === `qty-${item.id}` && item.qty === 1 ? (
															<Loader2 size={11} className="animate-spin" />
														) : (
															<Minus size={11} />
														)}
													</button>
													<span className="text-sm font-semibold text-[#F5F0EB] w-5 text-center">
														{item.qty}
													</span>
													<button
														onClick={() => changeQty(item, +1)}
														disabled={loading === `qty-${item.id}`}
														className="w-7 h-7 rounded-full border border-[#2a2a2a] bg-[#1a1a1a] hover:border-[#C8973A]/50 hover:bg-[#C8973A]/10 text-[#5A5249] hover:text-[#C8973A] transition-colors flex items-center justify-center disabled:opacity-40"
													>
														<Plus size={11} />
													</button>
												</div>
											)}
											{!isOuverte && (
												<span className="text-sm text-[#5A5249] shrink-0">
													×{item.qty}
												</span>
											)}

											<span className="text-sm font-semibold text-[#F5F0EB] w-16 text-right shrink-0">
												{item.totalPrice.toFixed(2)} €
											</span>
										</div>
									))}
								</div>
							))}
						</div>
					)}

					<div className="border-t border-[#222] px-5 py-3.5 flex items-center justify-between">
						<span className="text-sm text-[#9A8F84]">Total commande</span>
						<span className="text-lg font-bold text-[#F5F0EB]">
							{itemsTotal.toFixed(2)} €
						</span>
					</div>
				</div>

				{isOuverte && (
					<div>
						<button
							onClick={() => setShowPicker((v) => !v)}
							className="w-full flex items-center justify-between px-5 py-3.5 bg-[#141414] border border-[#222] rounded-2xl hover:border-[#2a2a2a] transition-colors text-sm text-[#9A8F84] hover:text-[#F5F0EB]"
						>
							<span className="flex items-center gap-2">
								<UtensilsCrossed size={15} />
								{showPicker ? "Fermer le menu" : "Ajouter des plats"}
							</span>
							{showPicker ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
						</button>

						{showPicker && (
							<div className="mt-2 bg-[#141414] border border-[#222] rounded-2xl overflow-hidden">
								<div className="flex overflow-x-auto border-b border-[#1e1e1e] scrollbar-none">
									{menu.map((cat) => (
										<button
											key={cat.id}
											onClick={() => setActiveCat(cat.id)}
											className={cn(
												"shrink-0 px-4 py-3 text-xs font-medium border-b-2 transition-colors whitespace-nowrap",
												activeCat === cat.id
													? "border-[#C8973A] text-[#C8973A]"
													: "border-transparent text-[#5A5249] hover:text-[#9A8F84]"
											)}
										>
											{cat.name}
										</button>
									))}
								</div>

								<div className="divide-y divide-[#1a1a1a] max-h-72 overflow-y-auto">
									{menu
										.find((c) => c.id === activeCat)
										?.dishes.map((dish) => {
											const inOrder = order.items.find((i) => i.dishId === dish.id);
											const isAdding = loading === `add-${dish.id}`;
											return (
												<div key={dish.id} className="flex items-center gap-3 px-5 py-3">
													<div className="flex-1 min-w-0">
														<p className="text-sm text-[#F5F0EB] leading-tight">
															{dish.name}
														</p>
														<p className="text-[11px] text-[#5A5249] mt-0.5">
															{dish.price.toFixed(2)} €
														</p>
													</div>

													{inOrder && (
														<span className="text-[11px] text-[#C8973A] bg-[#C8973A]/10 border border-[#C8973A]/20 px-2 py-0.5 rounded-full shrink-0">
															×{inOrder.qty}
														</span>
													)}

													<button
														onClick={() => addItem(dish.id)}
														disabled={isAdding}
														className="w-8 h-8 rounded-full bg-[#C8973A]/10 border border-[#C8973A]/30 hover:bg-[#C8973A]/20 hover:border-[#C8973A]/60 text-[#C8973A] transition-colors flex items-center justify-center shrink-0 disabled:opacity-40"
													>
														{isAdding ? (
															<Loader2 size={13} className="animate-spin" />
														) : (
															<Plus size={13} />
														)}
													</button>
												</div>
											);
										})}
								</div>
							</div>
						)}
					</div>
				)}

				{(isAdditionDemandee || showBillPanel) && (
					<div className="bg-[#141414] border border-[#1e1e1e] rounded-2xl overflow-hidden">
						<div className="px-5 py-3.5 border-b border-[#1e1e1e] flex items-center gap-2">
							<Receipt size={15} className="text-[#C8973A]" />
							<h2 className="text-sm font-semibold text-[#F5F0EB]">
								Récapitulatif de l&apos;addition
							</h2>
						</div>

						<div className="p-5 space-y-2">
							{order.items.map((item) => (
								<div key={item.id} className="flex justify-between text-sm">
									<span className="text-[#9A8F84]">
										{item.qty}× {item.dishName}
									</span>
									<span className="text-[#F5F0EB] font-medium">
										{item.totalPrice.toFixed(2)} €
									</span>
								</div>
							))}

							<div className="border-t border-[#222] pt-3 mt-3 space-y-2">
								<div className="flex justify-between text-sm">
									<span className="text-[#9A8F84]">Sous-total</span>
									<span className="text-[#F5F0EB]">{itemsTotal.toFixed(2)} €</span>
								</div>

								{isResa && order.depositDeducted > 0 && (
									<div className="flex justify-between text-sm text-green-400">
										<span className="flex items-center gap-1">
											<Check size={12} />
											Acompte déjà encaissé
										</span>
										<span>− {order.depositDeducted.toFixed(2)} €</span>
									</div>
								)}

								<div className="border-t border-[#222] pt-2 flex justify-between">
									<span className="text-sm font-semibold text-[#F5F0EB]">
										Reste à payer
									</span>
									<span className="text-lg font-bold text-[#C8973A]">
										{amountDue.toFixed(2)} €
									</span>
								</div>
							</div>
						</div>

						<div className="px-5 pb-5 space-y-3">
							<p className="text-xs text-[#5A5249] font-medium uppercase tracking-wider">
								Mode de paiement
							</p>
							<div className="grid grid-cols-2 gap-2">
								{PAYMENT_METHODS.map(({ value, label, icon: Icon }) => (
									<button
										key={value}
										onClick={() => setPayMethod(value)}
										className={cn(
											"flex items-center gap-2.5 px-3 py-3 rounded-xl border text-sm transition-all",
											payMethod === value
												? "bg-[#C8973A]/10 border-[#C8973A]/50 text-[#C8973A]"
												: "border-[#222] bg-[#1a1a1a] text-[#5A5249] hover:border-[#2a2a2a] hover:text-[#9A8F84]"
										)}
									>
										<Icon size={15} className="shrink-0" />
										{label}
									</button>
								))}
							</div>

							<button
								onClick={pay}
								disabled={!payMethod || loading === "pay"}
								className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-[#C8973A] hover:bg-[#D4A445] active:bg-[#B8872A] text-[#0A0A0A] text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
							>
								{loading === "pay" ? (
									<Loader2 size={16} className="animate-spin" />
								) : (
									<Check size={16} />
								)}
								{loading === "pay" ? "Enregistrement…" : `Encaisser · ${amountDue.toFixed(2)} €`}
							</button>

							<button
								onClick={reopenOrder}
								disabled={loading === "reopen"}
								className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-[#222] text-[#5A5249] hover:text-[#9A8F84] hover:border-[#333] text-sm transition-colors disabled:opacity-40"
							>
								{loading === "reopen" ? (
									<Loader2 size={14} className="animate-spin" />
								) : (
									<UtensilsCrossed size={14} />
								)}
								{loading === "reopen" ? "Réouverture…" : "Ajouter des plats oubliés"}
							</button>
						</div>
					</div>
				)}

				{isOuverte && !showBillPanel && (
					<button
						onClick={requestBill}
						disabled={order.items.length === 0 || loading === "bill"}
						className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-[#C8973A] hover:bg-[#D4A445] active:bg-[#B8872A] text-[#0A0A0A] text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
					>
						{loading === "bill" ? (
							<Loader2 size={16} className="animate-spin" />
						) : (
							<Receipt size={16} />
						)}
						{loading === "bill" ? "Chargement…" : "Demander l'addition"}
					</button>
				)}

				{isAdditionDemandee && !showBillPanel && (
					<button
						onClick={() => setShowBillPanel(true)}
						className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-[#C8973A] hover:bg-[#D4A445] text-[#0A0A0A] text-sm font-semibold transition-colors"
					>
						<CreditCard size={16} />
						Encaisser l&apos;addition
					</button>
				)}
			</div>
		</div>
	);
}

function StatusBadge({ status }: { status: string }) {
	const map: Record<string, { label: string; cls: string }> = {
		OUVERTE:           { label: "En service", cls: "bg-[#C8973A]/10 text-[#C8973A] border-[#C8973A]/30"         },
		ADDITION_DEMANDEE: { label: "Addition",   cls: "bg-red-950/40 text-red-400 border-red-800/40 animate-pulse" },
		PAYEE:             { label: "Payée",      cls: "bg-green-950/40 text-green-400 border-green-800/40"         },
		ANNULEE:           { label: "Annulée",    cls: "bg-[#111] text-[#444] border-[#222]"                        },
	};
	const s = map[status] ?? map.OUVERTE;
	return (
		<span className={cn("shrink-0 text-[11px] font-medium px-2.5 py-1 rounded-full border", s.cls)}>
			{s.label}
		</span>
	);
}
