"use client";
import { useState } from "react";
import { Users, Star, Music, Briefcase } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { EVENT_TYPES } from "@/lib/constants";
import toast from "react-hot-toast";

export default function EventsPage() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", eventType: "", eventDate: "", guestCount: "", budget: "", message: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, guestCount: form.guestCount ? parseInt(form.guestCount) : undefined }) });
      if (!res.ok) throw new Error("Erreur");
      setSent(true);
    } catch { toast.error("Une erreur est survenue. Veuillez réessayer."); }
    finally { setLoading(false); }
  };

  const update = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  const packages = [
    { icon: Users, title: "Repas de famille", desc: "De 8 à 40 convives. Menus personnalisés sur demande.", capacity: "Jusqu'à 40 personnes" },
    { icon: Star, title: "Célébrations", desc: "Anniversaires, mariages, baptêmes. Décoration incluse.", capacity: "Jusqu'à 80 personnes" },
    { icon: Music, title: "Soirées thématiques", desc: "Soirées créoles, spectacles, animations musicales.", capacity: "À partir de 20 personnes" },
    { icon: Briefcase, title: "Événements pro", desc: "Séminaires, cocktails d'entreprise, team building.", capacity: "Jusqu'à 100 personnes" },
  ];

  return (
    <div className="min-h-screen pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mb-16">
          <p className="text-[#C8973A] text-sm font-medium uppercase tracking-widest mb-3">Événements & Privatisations</p>
          <h1 className="font-display text-5xl text-[#F5F0EB] mb-4">Vivez l'exception</h1>
          <p className="text-[#9A8F84] text-lg leading-relaxed">Nous mettons tout notre savoir-faire à votre service pour faire de votre événement un moment inoubliable.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-20">
          {packages.map(({ icon: Icon, title, desc, capacity }) => (
            <div key={title} className="bg-[#141414] border border-[#222] hover:border-[#C8973A]/30 rounded-xl p-6 transition-colors">
              <div className="w-12 h-12 bg-[#C8973A]/10 border border-[#C8973A]/20 rounded-full flex items-center justify-center mb-4">
                <Icon size={22} className="text-[#C8973A]" />
              </div>
              <h3 className="font-display text-lg text-[#F5F0EB] mb-2">{title}</h3>
              <p className="text-sm text-[#9A8F84] mb-3 leading-relaxed">{desc}</p>
              <p className="text-xs text-[#C8973A] font-medium">{capacity}</p>
            </div>
          ))}
        </div>
        <div className="max-w-2xl mx-auto">
          <h2 className="font-display text-3xl text-[#F5F0EB] mb-2">Demande de devis</h2>
          <p className="text-[#9A8F84] mb-8">Remplissez ce formulaire et nous vous répondrons sous 24h.</p>
          {sent ? (
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-8 text-center">
              <p className="text-green-400 font-display text-xl mb-2">Demande envoyée !</p>
              <p className="text-[#9A8F84] text-sm">Notre équipe vous contactera sous 24h pour finaliser les détails de votre événement.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-[#141414] border border-[#222] rounded-xl p-6 sm:p-8 flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Prénom *" value={form.firstName} onChange={e => update("firstName", e.target.value)} required />
                <Input label="Nom *" value={form.lastName} onChange={e => update("lastName", e.target.value)} required />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Email *" type="email" value={form.email} onChange={e => update("email", e.target.value)} required />
                <Input label="Téléphone *" type="tel" value={form.phone} onChange={e => update("phone", e.target.value)} required />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select label="Type d'événement *" value={form.eventType} onChange={e => update("eventType", e.target.value)} options={EVENT_TYPES.map(t => ({ value: t, label: t }))} placeholder="Choisir..." required />
                <Input label="Date souhaitée" type="date" value={form.eventDate} onChange={e => update("eventDate", e.target.value)} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Nombre de personnes" type="number" min="1" value={form.guestCount} onChange={e => update("guestCount", e.target.value)} placeholder="Ex : 40" />
                <Input label="Budget approximatif" value={form.budget} onChange={e => update("budget", e.target.value)} placeholder="Ex : 2 000 €" />
              </div>
              <Textarea label="Votre message *" value={form.message} onChange={e => update("message", e.target.value)} placeholder="Décrivez votre événement, vos attentes..." rows={4} required />
              <Button type="submit" loading={loading} className="w-full mt-2">Envoyer ma demande</Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
