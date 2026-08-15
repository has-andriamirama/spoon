import Link from "next/link";
import { UtensilsCrossed, MapPin, Phone, Mail, Facebook, Instagram } from "lucide-react";

export default function PublicFooter() {
	return (
		<footer className="bg-[#141414] border-t border-[#222] mt-20">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
					<div className="lg:col-span-1">
						<div className="flex items-center gap-2 mb-4">
							<div className="w-8 h-8 bg-[#C8973A] rounded-full flex items-center justify-center">
								<UtensilsCrossed size={16} className="text-[#0A0A0A]" />
							</div>
							<span className="font-display text-2xl text-[#F5F0EB] font-semibold">Spoon</span>
						</div>
						<p className="text-[#9A8F84] text-sm leading-relaxed mb-6">
							La cuisine créole élevée au rang d&apos;art. Au cœur de Saint-Denis, La Réunion.
						</p>
						<div className="flex items-center gap-4">
							<a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="text-[#5A5249] hover:text-[#C8973A] transition-colors">
								<Facebook size={20} />
							</a>
							<a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-[#5A5249] hover:text-[#C8973A] transition-colors">
								<Instagram size={20} />
							</a>
						</div>
					</div>

					<div>
						<h3 className="text-[#F5F0EB] font-semibold text-sm uppercase tracking-wider mb-5">Navigation</h3>
						<ul className="space-y-3">
							{[
								{ href: "/", label: "Accueil" },
								{ href: "/about", label: "Notre histoire" },
								{ href: "/menu", label: "La carte" },
								{ href: "/gallery", label: "Galerie" },
								{ href: "/events", label: "Événements" },
								{ href: "/reservation", label: "Réserver" },
							].map((l) => (
								<li key={l.href}>
									<Link href={l.href} className="text-[#9A8F84] hover:text-[#C8973A] text-sm transition-colors">{l.label}</Link>
								</li>
							))}
						</ul>
					</div>

					<div>
						<h3 className="text-[#F5F0EB] font-semibold text-sm uppercase tracking-wider mb-5">Horaires</h3>
						<ul className="space-y-2 text-sm text-[#9A8F84]">
							<li className="flex justify-between"><span>Lundi – Vendredi</span><span>12h–14h / 19h–21h</span></li>
							<li className="flex justify-between"><span>Samedi</span><span>12h–14h30 / 19h–21h30</span></li>
							<li className="flex justify-between"><span>Dimanche</span><span className="text-[#F87171]">Fermé</span></li>
						</ul>
					</div>

					<div>
						<h3 className="text-[#F5F0EB] font-semibold text-sm uppercase tracking-wider mb-5">Contact</h3>
						<ul className="space-y-3">
							<li className="flex items-start gap-3 text-sm text-[#9A8F84]">
								<MapPin size={16} className="text-[#C8973A] mt-0.5 shrink-0" />
								<span>12 Rue de Paris<br />97400 Saint-Denis, La Réunion</span>
							</li>
							<li className="flex items-center gap-3 text-sm text-[#9A8F84]">
								<Phone size={16} className="text-[#C8973A] shrink-0" />
								<a href="tel:+262692000000" className="hover:text-[#F5F0EB] transition-colors">+262 692 00 00 00</a>
							</li>
							<li className="flex items-center gap-3 text-sm text-[#9A8F84]">
								<Mail size={16} className="text-[#C8973A] shrink-0" />
								<a href="mailto:contact@spoon.re" className="hover:text-[#F5F0EB] transition-colors">contact@spoon.re</a>
							</li>
						</ul>
					</div>
				</div>

				<div className="border-t border-[#222] mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
					<p className="text-[#5A5249] text-xs">© {new Date().getFullYear()} Spoon Restaurant. Tous droits réservés.</p>
					<div className="flex items-center gap-6">
						{[
							{ href: "/legal/mentions-legales", label: "Mentions légales" },
							{ href: "/legal/politique-de-confidentialite", label: "Confidentialité" },
							{ href: "/legal/cookies", label: "Cookies" },
						].map((l) => (
							<Link key={l.href} href={l.href} className="text-[#5A5249] hover:text-[#9A8F84] text-xs transition-colors">
								{l.label}
							</Link>
						))}
					</div>
				</div>
			</div>
		</footer>
	);
}
