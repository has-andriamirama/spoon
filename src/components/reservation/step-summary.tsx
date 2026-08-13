"use client";
import { useState } from "react";
import { Calendar, Clock, Users, User, Mail, Phone, CreditCard, ShieldCheck, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate, formatPrice, getErrorMessage } from "@/lib/utils";
import type { ReservationFormData } from "./reservation-stepper";
import toast from "react-hot-toast";

interface Props {
	data: ReservationFormData;
	onPrev: () => void;
}

const DEPOSIT_PER_COVER = 10; // 10 € per person

export default function StepSummary({ data, onPrev }: Props) {
	const [loading, setLoading] = useState(false);

	const depositAmount = data.covers * DEPOSIT_PER_COVER;

	const handlePayment = async () => {
		setLoading(true);
		try {
			const res = await fetch("/api/payments/checkout-session", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					date: data.date,
					timeSlot: data.timeSlot,
					covers: data.covers,
					guestFirstName: data.guestFirstName,
					guestLastName: data.guestLastName,
					guestEmail: data.guestEmail,
					guestPhone: data.guestPhone,
					notes: data.notes,
					allergies: data.allergies,
				}),
			});

			const json = await res.json();
			if (!res.ok) throw new Error(json.error || "Erreur lors de la création du paiement");

			window.location.href = json.url;
		} catch (error: unknown) {
			toast.error(getErrorMessage(error, "Une erreur est survenue."));
			setLoading(false);
		}
	};

	const rows = [
		{ icon: Calendar, label: "Date", value: formatDate(data.date) },
		{ icon: Clock, label: "Heure", value: data.timeSlot },
		{
			icon: Users,
			label: "Couverts",
			value: `${data.covers} personne${data.covers > 1 ? "s" : ""}`,
		},
		{
			icon: User,
			label: "Nom",
			value: `${data.guestFirstName} ${data.guestLastName}`,
		},
		{ icon: Mail, label: "Email", value: data.guestEmail },
		{ icon: Phone, label: "Téléphone", value: data.guestPhone },
	];

	return (
		<div>
			<h2 className="font-display text-2xl text-[#F5F0EB] mb-6">
				Récapitulatif de votre réservation
			</h2>

			<div className="bg-[#0A0A0A] rounded-xl border border-[#222] divide-y divide-[#1a1a1a] mb-5">
				{rows.map(({ icon: Icon, label, value }) => (
					<div key={label} className="flex items-center gap-4 px-5 py-3.5">
						<Icon size={16} className="text-[#C8973A] shrink-0" />
						<span className="text-[#5A5249] text-sm w-24 shrink-0">{label}</span>
						<span className="text-[#F5F0EB] text-sm font-medium">{value}</span>
					</div>
				))}
				{data.allergies && (
					<div className="px-5 py-3.5">
						<p className="text-xs text-[#5A5249] mb-1">Allergies :</p>
						<p className="text-sm text-[#9A8F84]">{data.allergies}</p>
					</div>
				)}
				{data.notes && (
					<div className="px-5 py-3.5">
						<p className="text-xs text-[#5A5249] mb-1">Notes :</p>
						<p className="text-sm text-[#9A8F84]">{data.notes}</p>
					</div>
				)}
			</div>

			<div className="bg-[#C8973A]/10 border border-[#C8973A]/25 rounded-xl p-5 mb-4">
				<div className="flex items-start gap-3">
					<CreditCard size={18} className="text-[#C8973A] mt-0.5 shrink-0" />
					<div className="flex-1">
						<p className="text-sm font-semibold text-[#C8973A] mb-1">Acompte de réservation</p>
						<p className="text-3xl font-bold text-[#F5F0EB] mb-1">
							{formatPrice(depositAmount)}
						</p>
						<p className="text-xs text-[#9A8F84]">
							{data.covers} × {formatPrice(DEPOSIT_PER_COVER)} par personne
						</p>
					</div>
				</div>
			</div>

			<div className="flex items-start gap-2.5 mb-4 px-1">
				<ShieldCheck size={14} className="text-green-400 mt-0.5 shrink-0" />
				<p className="text-xs text-[#9A8F84] leading-relaxed">
					<span className="text-green-400 font-medium">L&apos;acompte sera déduit de votre addition</span>{" "}
					le jour de votre venue.
				</p>
			</div>

			<div className="flex items-start gap-2.5 bg-[#0A0A0A] border border-[#222] rounded-lg p-4 mb-5">
				<Info size={14} className="text-[#5A5249] mt-0.5 shrink-0" />
				<p className="text-xs text-[#5A5249] leading-relaxed">
					<span className="text-[#C8973A] font-medium">Politique d&apos;annulation :</span>{" "}
					Annulation gratuite jusqu&apos;à 24 h avant la réservation. En cas de
					non-présentation ou d&apos;annulation tardive, l&apos;acompte pourra être
					conservé.
				</p>
			</div>

			<p className="text-xs text-[#5A5249] mb-6">
				En procédant au paiement, vous acceptez nos{" "}
				<a href="/legal/mentions-legales" className="text-[#C8973A] hover:underline">
					conditions générales
				</a>{" "}
				et notre{" "}
				<a
					href="/legal/politique-de-confidentialite"
					className="text-[#C8973A] hover:underline"
				>
					politique de confidentialité
				</a>
				.
			</p>

			<div className="flex gap-3">
				<Button
					variant="secondary"
					onClick={onPrev}
					className="flex-1"
					disabled={loading}
				>
					← Retour
				</Button>
				<Button onClick={handlePayment} loading={loading} className="flex-1 gap-2">
					<CreditCard size={16} />
					Payer l&apos;acompte — {formatPrice(depositAmount)}
				</Button>
			</div>
		</div>
	);
}
