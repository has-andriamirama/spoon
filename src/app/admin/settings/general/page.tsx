"use client";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

export default function AdminSettingsGeneralPage() {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [form, setForm] = useState({ name: "", tagline: "", description: "", phone: "", email: "", address: "", googleMapsUrl: "", facebookUrl: "", instagramUrl: "", depositRequired: true, depositAmountPerCover: 20, freeCancellationHours: 48, maxCoversPerSlot: 40, minBookingNoticeHours: 2, maxBookingAdvanceDays: 60, autoConfirmReservations: false });

  useEffect(() => {
    fetch("/api/settings").then(r => r.json()).then(d => { if (d.data) setForm(d.data); }).finally(() => setFetching(false));
  }, []);

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try {
      const res = await fetch("/api/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error();
      toast.success("Paramètres enregistrés !");
    } catch { toast.error("Erreur lors de la sauvegarde."); }
    finally { setLoading(false); }
  };

  if (fetching) return <div className="animate-pulse space-y-4">{[...Array(6)].map((_, i) => <div key={i} className="h-10 bg-[#222] rounded-lg" />)}</div>;

  return (
    <div>
      <h1 className="font-display text-3xl text-[#F5F0EB] mb-8">Paramètres généraux</h1>
      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        <div className="bg-[#141414] border border-[#222] rounded-xl p-6 space-y-4">
          <h2 className="font-display text-xl text-[#F5F0EB]">Identité du restaurant</h2>
          <Input label="Nom" value={form.name} onChange={e => set("name", e.target.value)} />
          <Input label="Accroche" value={form.tagline || ""} onChange={e => set("tagline", e.target.value)} placeholder="La cuisine créole élevée au rang d'art" />
          <Textarea label="Description" value={form.description || ""} onChange={e => set("description", e.target.value)} rows={3} />
          <Input label="Téléphone" type="tel" value={form.phone || ""} onChange={e => set("phone", e.target.value)} />
          <Input label="Email" type="email" value={form.email || ""} onChange={e => set("email", e.target.value)} />
          <Textarea label="Adresse" value={form.address || ""} onChange={e => set("address", e.target.value)} rows={2} />
          <Input label="URL Google Maps" value={form.googleMapsUrl || ""} onChange={e => set("googleMapsUrl", e.target.value)} />
          <Input label="URL Facebook" value={form.facebookUrl || ""} onChange={e => set("facebookUrl", e.target.value)} />
          <Input label="URL Instagram" value={form.instagramUrl || ""} onChange={e => set("instagramUrl", e.target.value)} />
        </div>

        <div className="bg-[#141414] border border-[#222] rounded-xl p-6 space-y-4">
          <h2 className="font-display text-xl text-[#F5F0EB]">Règles de réservation</h2>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Max couverts / créneau" type="number" min="1" value={form.maxCoversPerSlot} onChange={e => set("maxCoversPerSlot", parseInt(e.target.value))} />
            <Input label="Délai min. réservation (h)" type="number" min="0" value={form.minBookingNoticeHours} onChange={e => set("minBookingNoticeHours", parseInt(e.target.value))} />
            <Input label="Réservation max à l'avance (j)" type="number" min="1" value={form.maxBookingAdvanceDays} onChange={e => set("maxBookingAdvanceDays", parseInt(e.target.value))} />
            <Input label="Annulation gratuite jusqu'à (h)" type="number" min="0" value={form.freeCancellationHours} onChange={e => set("freeCancellationHours", parseInt(e.target.value))} />
          </div>
          <div className="space-y-3 pt-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={form.depositRequired} onChange={e => set("depositRequired", e.target.checked)} className="w-4 h-4 accent-[#C8973A]" />
              <span className="text-sm text-[#F5F0EB]">Acompte requis à la réservation</span>
            </label>
            {form.depositRequired && <Input label="Montant acompte / couvert (€)" type="number" step="0.01" min="0" value={form.depositAmountPerCover} onChange={e => set("depositAmountPerCover", parseFloat(e.target.value))} className="max-w-xs" />}
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={form.autoConfirmReservations} onChange={e => set("autoConfirmReservations", e.target.checked)} className="w-4 h-4 accent-[#C8973A]" />
              <span className="text-sm text-[#F5F0EB]">Confirmation automatique des réservations</span>
            </label>
          </div>
        </div>

        <Button type="submit" loading={loading} size="lg">Enregistrer les paramètres</Button>
      </form>
    </div>
  );
}
