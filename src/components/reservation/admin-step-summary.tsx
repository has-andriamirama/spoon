"use client";
import { useState } from "react";
import { Calendar, Clock, Users, User, Mail, Phone, CreditCard, ShieldCheck, Link2, Check, Copy, CheckCircle2, Clock3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate, formatPrice, getErrorMessage } from "@/lib/utils";
import type { ReservationFormData } from "./reservation-stepper";
import toast from "react-hot-toast";

interface Props {
	data: ReservationFormData;
	onPrev: () => void;
	onDone: () => void;
}

const DEPOSIT_PER_COVER = 10;

export default function AdminStepSummary({ data, onPrev, onDone }: Props) {
	const [loading, setLoading] = useState(false);
	const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
	const [copied, setCopied] = useState(false);

	const depositAmount = data.covers * DEPOSIT_PER_COVER;

	const handleCreate = async () => {
		setLoading(true);
		try {
			const res = await fetch("/api/admin/reservations/create-with-link", {
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
			if (!res.ok) throw new Error(json.error || "Erreur lors de la création");

			setPaymentUrl(json.url);
			toast.success("Réservation créée — lien de paiement généré et envoyé par email");
		} catch (error: unknown) {
			toast.error(getErrorMessage(error, "Une erreur est survenue."));
		} finally {
			setLoading(false);
		}
	};

	const handleCopy = async () => {
		if (!paymentUrl) return;
		try {
			await navigator.clipboard.writeText(paymentUrl);
			setCopied(true);
			toast.success("Lien copié !");
			setTimeout(() => setCopied(false), 2500);
		} catch {
			toast.error("Impossible de copier le lien");
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

	if (paymentUrl) {
		return (
			<div>
				<div className="flex items-center gap-3 mb-6">
					<div className="w-10 h-10 rounded-full bg-green-500/15 flex items-center justify-center shrink-0">
						<CheckCircle2 size={20} className="text-green-400" />
					</div>
					<div>
						<h2 className="font-display text-xl text-[#F5F0EB]">Réservation créée</h2>
						<p className="text-sm text-[#9A8F84]">
							Email envoyé à{" "}
							<span className="text-[#C8973A]">{data.guestEmail}</span>
						</p>
					</div>
				</div>

				<div className="bg-[#0A0A0A] border border-[#222] rounded-xl p-4 mb-4">
					<p className="text-xs text-[#5A5249] mb-2.5 flex items-center gap-1.5">
						<Link2 size={11} />
						Lien de paiement Stripe
					</p>
					<div className="flex items-center gap-2">
						<div className="flex-1 min-w-0 bg-[#141414] border border-[#333] rounded-lg px-3 py-2 text-xs text-[#9A8F84] truncate font-mono select-all">
							{paymentUrl}
						</div>
						<button
							onClick={handleCopy}
							title="Copier le lien"
							className="shrink-0 h-9 w-9 rounded-lg border border-[#333] flex items-center justify-center text-[#5A5249] hover:text-[#F5F0EB] hover:border-[#C8973A] transition-all"
						>
							{copied ? (
								<Check size={14} className="text-green-400" />
							) : (
								<Copy size={14} />
							)}
						</button>
					</div>
				</div>

				<div className="bg-[#C8973A]/8 border border-[#C8973A]/20 rounded-xl p-4 mb-4 space-y-1">
					<p className="text-[#C8973A] font-semibold text-xs uppercase tracking-wider mb-2">
						Résumé
					</p>
					<p className="text-sm text-[#9A8F84]">
						{data.guestFirstName} {data.guestLastName} · {data.guestEmail}
					</p>
					<p className="text-sm text-[#9A8F84]">
						{formatDate(data.date)} à {data.timeSlot} ·{" "}
						{data.covers} couvert{data.covers > 1 ? "s" : ""}
					</p>
					<p className="text-sm text-[#F5F0EB] font-semibold pt-1">
						Acompte : {formatPrice(depositAmount)}
					</p>
				</div>

				<div className="flex items-start gap-2.5 text-xs text-[#5A5249] bg-[#0A0A0A] border border-[#222] rounded-lg p-3 mb-5">
					<Clock3 size={13} className="mt-0.5 shrink-0 text-[#9A8F84]" />
					<p>
						Ce lien expire dans{" "}
						<strong className="text-[#9A8F84]">24 heures</strong>. Si le
						client ne paie pas dans ce délai, la réservation sera
						automatiquement annulée.
					</p>
				</div>

				<Button onClick={onDone} className="w-full">
					Fermer
				</Button>
			</div>
		);
	}

	return (
		<div>
			<h2 className="font-display text-2xl text-[#F5F0EB] mb-6">
				Récapitulatif de la réservation
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
						<p className="text-sm font-semibold text-[#C8973A] mb-1">
							Acompte à régler par le client
						</p>
						<p className="text-3xl font-bold text-[#F5F0EB] mb-1">
							{formatPrice(depositAmount)}
						</p>
						<p className="text-xs text-[#9A8F84]">
							{data.covers} × {formatPrice(DEPOSIT_PER_COVER)} par personne
						</p>
					</div>
				</div>
			</div>

			<div className="flex items-start gap-2.5 mb-5 bg-[#0A0A0A] border border-[#222] rounded-lg p-4">
				<ShieldCheck size={14} className="text-[#C8973A] mt-0.5 shrink-0" />
				<p className="text-xs text-[#5A5249] leading-relaxed">
					Un lien Stripe sécurisé sera généré et envoyé automatiquement par
					email à{" "}
					<span className="text-[#9A8F84] font-medium">{data.guestEmail}</span>.
					La réservation sera annulée si l&apos;acompte n&apos;est pas réglé
					dans les{" "}
					<strong className="text-[#9A8F84]">24 heures</strong>.
				</p>
			</div>

			<div className="flex gap-3">
				<Button
					variant="secondary"
					onClick={onPrev}
					className="flex-1"
					disabled={loading}
				>
					← Retour
				</Button>
				<Button onClick={handleCreate} loading={loading} className="flex-1 gap-2">
					<Link2 size={15} />
					Créer &amp; envoyer le lien
				</Button>
			</div>
		</div>
	);
}
