"use client";
import { useState } from "react";
import { MapPin, Phone, Mail, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

export default function ContactContent() {
	const [loading, setLoading] = useState(false);
	const [sent, setSent] = useState(false);
	const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
	const update = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));
	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault(); setLoading(true);
		try {
			const res = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
			if (!res.ok) throw new Error(); setSent(true);
		} catch { toast.error("Erreur lors de l'envoi. Réessayez."); } finally { setLoading(false); }
	};
	const infos = [
		{ icon: MapPin, label: "Adresse", value: "12 Rue de Paris, 97400 Saint-Denis, La Réunion" },
		{ icon: Phone, label: "Téléphone", value: "+262 692 00 00 00" },
		{ icon: Mail, label: "Email", value: "contact@spoon.re" },
		{ icon: Clock, label: "Horaires", value: "Lun–Ven 12h–14h & 19h–21h\nSamedi 12h–14h30 & 19h–21h30\nDimanche : Fermé" },
	];
	return (
		<div className="min-h-screen pt-24 pb-20">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="mb-12">
					<p className="text-[#C8973A] text-sm font-medium uppercase tracking-widest mb-3">Contact</p>
					<h1 className="font-display text-5xl text-[#F5F0EB]">Contactez-nous</h1>
				</div>
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
					<div>
						<div className="flex flex-col gap-6 mb-10">
							{infos.map(({ icon: Icon, label, value }) => (
								<div key={label} className="flex items-start gap-4">
									<div className="w-10 h-10 bg-[#C8973A]/10 border border-[#C8973A]/20 rounded-full flex items-center justify-center shrink-0 mt-0.5">
										<Icon size={18} className="text-[#C8973A]" />
									</div>
									<div>
										<p className="text-xs text-[#5A5249] uppercase tracking-wider mb-1">{label}</p>
										<p className="text-[#F5F0EB] text-sm whitespace-pre-line">{value}</p>
									</div>
								</div>
							))}
						</div>
						<iframe
							src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3769.3!2d55.45!3d-20.88!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjDCsDUyJzQ4LjAiUyA1NcKwMjcnMDAuMCJF!5e0!3m2!1sfr!2sfr!4v1700000000000"
							className="w-full h-56 rounded-xl border border-[#222] grayscale"
							loading="lazy"
							title="Carte Spoon Restaurant"
						/>
					</div>
					<div>
						{sent ? (
							<div className="bg-green-500/10 border border-green-500/30 rounded-xl p-8 text-center h-full flex flex-col items-center justify-center">
								<p className="text-green-400 font-display text-2xl mb-3">Message envoyé !</p>
								<p className="text-[#9A8F84]">Nous vous répondrons dans les meilleurs délais.</p>
							</div>
						) : (
							<form onSubmit={handleSubmit} className="bg-[#141414] border border-[#222] rounded-xl p-6 sm:p-8 flex flex-col gap-4">
								<h2 className="font-display text-2xl text-[#F5F0EB] mb-2">Envoyez-nous un message</h2>
								<Input label="Nom complet *" value={form.name} onChange={e => update("name", e.target.value)} required />
								<Input label="Email *" type="email" value={form.email} onChange={e => update("email", e.target.value)} required />
								<Input label="Sujet *" value={form.subject} onChange={e => update("subject", e.target.value)} required />
								<Textarea label="Message *" value={form.message} onChange={e => update("message", e.target.value)} rows={5} required />
								<Button type="submit" loading={loading} className="w-full">Envoyer</Button>
							</form>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
