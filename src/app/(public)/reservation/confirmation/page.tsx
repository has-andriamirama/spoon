import Link from "next/link";
import { CheckCircle, Calendar, ArrowRight } from "lucide-react";

export const metadata = { title: "Réservation confirmée" };

export default function ConfirmationPage() {
  return (
    <div className="min-h-screen pt-24 pb-20 flex items-center">
      <div className="max-w-lg mx-auto px-4 text-center">
        <div className="w-20 h-20 bg-green-500/10 border border-green-500/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={40} className="text-green-400" />
        </div>
        <h1 className="font-display text-4xl text-[#F5F0EB] mb-3">Réservation confirmée !</h1>
        <p className="text-[#9A8F84] mb-8 leading-relaxed">
          Un email de confirmation vous a été envoyé avec tous les détails de votre réservation. Nous avons hâte de vous accueillir chez Spoon !
        </p>
        <div className="bg-[#141414] border border-[#222] rounded-xl p-6 mb-8 text-left">
          <div className="flex items-center gap-3 text-[#C8973A] mb-2">
            <Calendar size={18} />
            <span className="font-medium">Prochaine étape</span>
          </div>
          <p className="text-sm text-[#9A8F84]">Vérifiez votre email pour retrouver votre confirmation. En cas d'empêchement, annulez votre réservation au moins 48h à l'avance.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/" className="bg-[#C8973A] hover:bg-[#E8B04A] text-[#0A0A0A] font-semibold px-6 py-3 rounded-lg transition-colors inline-flex items-center gap-2 justify-center">
            Retour à l'accueil <ArrowRight size={16} />
          </Link>
          <Link href="/account/reservations" className="border border-[#222] text-[#9A8F84] hover:text-[#F5F0EB] hover:border-[#333] font-medium px-6 py-3 rounded-lg transition-colors">
            Mes réservations
          </Link>
        </div>
      </div>
    </div>
  );
}
