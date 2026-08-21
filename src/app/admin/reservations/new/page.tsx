import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import AdminReservationStepper from "@/components/reservation/admin-reservation-stepper";

export const metadata = { title: "Nouvelle réservation" };

export default function AdminNewReservationPage() {
	return (
		<div>
			<div className="flex items-center gap-3 mb-8">
				<Link
					href="/admin/reservations"
					className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-[#222] bg-[#141414] text-[#9A8F84] hover:text-[#F5F0EB] hover:border-[#C8973A]/40 transition-colors shrink-0"
					aria-label="Retour aux réservations"
				>
					<ArrowLeft size={17} />
				</Link>
				<div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
					<h1 className="font-display text-3xl text-[#F5F0EB]">Nouvelle réservation</h1>
					<p className="text-sm text-[#5A5249] mt-1">
						Créez une réservation pour un client et envoyez-lui le lien de paiement par email.
					</p>
				</div>
			</div>

			<AdminReservationStepper />
		</div>
	);
}
