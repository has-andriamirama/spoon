"use client";
import { useEffect, useState } from "react";
import { CheckCircle, XCircle, AlertCircle, ArrowRight, Calendar, Clock, Users, CreditCard, RotateCcw } from "lucide-react";
import Link from "next/link";
import { formatDate, formatPrice } from "@/lib/utils";

interface Props {
	status: string; // 'success' | 'canceled' | 'failed'
	reservationId: string | null;
}

interface ReservationDetails {
	guestFirstName: string;
	guestLastName: string;
	date: string;
	timeSlot: string;
	covers: number;
	payment: { amount: number; status: string } | null;
}

export default function StepPaymentResult({ status, reservationId }: Props) {
	const [reservation, setReservation] = useState<ReservationDetails | null>(null);

	useEffect(() => {
		if (reservationId && status === "success") {
			fetch(`/api/reservations/${reservationId}`)
				.then((r) => r.json())
				.then((d) => {
					if (d.data) setReservation(d.data);
				})
				.catch(() => {});
		}
	}, [reservationId, status]);

	if (status === "success") {
		return (
			<div className="text-center py-4">
				<div className="w-20 h-20 bg-green-500/10 border border-green-500/30 rounded-full flex items-center justify-center mx-auto mb-5">
					<CheckCircle size={38} className="text-green-400" />
				</div>
				<h2 className="font-display text-3xl text-[#F5F0EB] mb-2">
					Paiement réussi !
				</h2>
				<p className="text-[#9A8F84] text-sm mb-6 leading-relaxed">
					Votre réservation est confirmée. Un email de confirmation a été envoyé
					à votre adresse.
				</p>

				{reservation && (
					<div className="bg-[#0A0A0A] border border-[#222] rounded-xl p-5 mb-6 text-left space-y-3">
						<div className="flex items-center gap-3">
							<Calendar size={15} className="text-[#C8973A] shrink-0" />
							<div>
								<p className="text-xs text-[#5A5249]">Date</p>
								<p className="text-sm text-[#F5F0EB] font-medium">
									{formatDate(reservation.date)}
								</p>
							</div>
						</div>
						<div className="flex items-center gap-3">
							<Clock size={15} className="text-[#C8973A] shrink-0" />
							<div>
								<p className="text-xs text-[#5A5249]">Heure</p>
								<p className="text-sm text-[#F5F0EB] font-medium">
									{reservation.timeSlot}
								</p>
							</div>
						</div>
						<div className="flex items-center gap-3">
							<Users size={15} className="text-[#C8973A] shrink-0" />
							<div>
								<p className="text-xs text-[#5A5249]">Couverts</p>
								<p className="text-sm text-[#F5F0EB] font-medium">
									{reservation.covers} personne{reservation.covers > 1 ? "s" : ""}
								</p>
							</div>
						</div>
						{reservation.payment && (
							<div className="pt-3 border-t border-[#1a1a1a] flex items-center gap-3">
								<CreditCard size={15} className="text-green-400 shrink-0" />
								<div>
									<p className="text-xs text-[#5A5249]">Acompte payé</p>
									<p className="text-sm text-green-400 font-semibold">
										{formatPrice(reservation.payment.amount)} — déduit de votre addition
									</p>
								</div>
							</div>
						)}
					</div>
				)}

				<div className="flex flex-col sm:flex-row gap-3 justify-center">
					<Link
						href="/"
						className="bg-[#C8973A] hover:bg-[#E8B04A] text-[#0A0A0A] font-semibold px-6 py-3 rounded-lg transition-colors inline-flex items-center gap-2 justify-center"
					>
						Retour à l&apos;accueil <ArrowRight size={16} />
					</Link>
					<Link
						href="/account/reservations"
						className="border border-[#222] text-[#9A8F84] hover:text-[#F5F0EB] hover:border-[#333] font-medium px-6 py-3 rounded-lg transition-colors"
					>
						Mes réservations
					</Link>
				</div>
			</div>
		);
	}

	if (status === "canceled") {
		return (
			<div className="text-center py-4">
				<div className="w-20 h-20 bg-orange-500/10 border border-orange-500/30 rounded-full flex items-center justify-center mx-auto mb-5">
					<XCircle size={38} className="text-orange-400" />
				</div>
				<h2 className="font-display text-3xl text-[#F5F0EB] mb-2">
					Paiement annulé
				</h2>
				<p className="text-[#9A8F84] text-sm mb-6 leading-relaxed">
					Vous avez annulé le paiement. Votre réservation n&apos;a pas été
					confirmée. Vous pouvez recommencer une nouvelle réservation.
				</p>
				<div className="flex flex-col sm:flex-row gap-3 justify-center">
					<Link
						href="/reservation"
						className="bg-[#C8973A] hover:bg-[#E8B04A] text-[#0A0A0A] font-semibold px-6 py-3 rounded-lg transition-colors inline-flex items-center gap-2 justify-center"
					>
						<RotateCcw size={16} /> Nouvelle réservation
					</Link>
					<Link
						href="/"
						className="border border-[#222] text-[#9A8F84] hover:text-[#F5F0EB] hover:border-[#333] font-medium px-6 py-3 rounded-lg transition-colors"
					>
						Retour à l&apos;accueil
					</Link>
				</div>
			</div>
		);
	}

	return (
		<div className="text-center py-4">
			<div className="w-20 h-20 bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center mx-auto mb-5">
				<AlertCircle size={38} className="text-red-400" />
			</div>
			<h2 className="font-display text-3xl text-[#F5F0EB] mb-2">
				Paiement échoué
			</h2>
			<p className="text-[#9A8F84] text-sm mb-6 leading-relaxed">
				Une erreur est survenue lors du traitement de votre paiement. Veuillez
				réessayer ou contacter notre équipe.
			</p>
			<div className="flex flex-col sm:flex-row gap-3 justify-center">
				<Link
					href="/reservation"
					className="bg-[#C8973A] hover:bg-[#E8B04A] text-[#0A0A0A] font-semibold px-6 py-3 rounded-lg transition-colors inline-flex items-center gap-2 justify-center"
				>
					<RotateCcw size={16} /> Réessayer
				</Link>
				<Link
					href="/contact"
					className="border border-[#222] text-[#9A8F84] hover:text-[#F5F0EB] hover:border-[#333] font-medium px-6 py-3 rounded-lg transition-colors"
				>
					Nous contacter
				</Link>
			</div>
		</div>
	);
}
