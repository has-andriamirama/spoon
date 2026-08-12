"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/utils";
import type { Dish, MenuCategory, SpecialOfferWithDetails } from "@/types";

interface Props {
  offer: SpecialOfferWithDetails | null;
  dishes: (Dish & { category: MenuCategory })[];
}

export default function SpecialOfferForm({ offer, dishes }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: offer?.title || "",
    description: offer?.description || "",
    type: offer?.type || "PERCENTAGE",
    value: offer?.value?.toString() || "10",
    target: offer?.target || "ALL",
    promoCode: offer?.promoCode || "",
    minCovers: offer?.minCovers?.toString() || "",
    isFirstOnly: offer?.isFirstOnly || false,
    isPublic: offer?.isPublic ?? true,
    startDate: offer?.startDate ? offer.startDate.toISOString().split("T")[0] : "",
    endDate: offer?.endDate ? offer.endDate.toISOString().split("T")[0] : "",
    isActive: offer?.isActive ?? true,
    dishIds: offer?.items?.map(i => i.dish.id) ?? [],
  });

  const toggleDish = (id: string) => setForm(p => ({ ...p, dishIds: p.dishIds.includes(id) ? p.dishIds.filter(d => d !== id) : [...p.dishIds, id] }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try {
      const body = { ...form, value: parseFloat(form.value), minCovers: form.minCovers ? parseInt(form.minCovers) : undefined };
      const url = offer ? `/api/special-offers/${offer.id}` : "/api/special-offers";
      const method = offer ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(offer ? "Offre modifiée !" : "Offre créée !");
      router.push("/admin/special-offers");
    } catch (error: unknown) { toast.error(getErrorMessage(error)); }
    finally { setLoading(false); }
  };

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm(previous => ({ ...previous, [key]: value }));

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      <div className="bg-[#141414] border border-[#222] rounded-xl p-6 space-y-4">
        <h2 className="font-display text-xl text-[#F5F0EB]">Informations de l'offre</h2>
        <Input label="Titre *" value={form.title} onChange={e => set("title", e.target.value)} required />
        <Textarea label="Description" value={form.description} onChange={e => set("description", e.target.value)} rows={2} />
        <div className="grid grid-cols-2 gap-4">
          <Select label="Type de remise *" value={form.type} onChange={e => set("type", e.target.value)} options={[{ value: "PERCENTAGE", label: "Pourcentage (%)" }, { value: "FIXED_AMOUNT", label: "Montant fixe (€)" }, { value: "FREE_ITEM", label: "Article offert" }]} />
          <Input label={form.type === "PERCENTAGE" ? "Valeur (%) *" : "Valeur (€) *"} type="number" step="0.01" min="0" value={form.value} onChange={e => set("value", e.target.value)} required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Date de début *" type="date" value={form.startDate} onChange={e => set("startDate", e.target.value)} required />
          <Input label="Date de fin *" type="date" value={form.endDate} onChange={e => set("endDate", e.target.value)} required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Code promo (optionnel)" value={form.promoCode} onChange={e => set("promoCode", e.target.value)} placeholder="SPOON10" />
          <Input label="Couverts minimum" type="number" min="1" value={form.minCovers} onChange={e => set("minCovers", e.target.value)} placeholder="2" />
        </div>
        <Select label="Cible" value={form.target} onChange={e => set("target", e.target.value)} options={[{ value: "ALL", label: "Tous les visiteurs" }, { value: "REGISTERED", label: "Clients inscrits uniquement" }]} />
        <div className="flex flex-wrap gap-5 pt-1">
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.isActive} onChange={e => set("isActive", e.target.checked)} className="w-4 h-4 accent-[#C8973A]" /><span className="text-sm text-[#F5F0EB]">Offre active</span></label>
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.isPublic} onChange={e => set("isPublic", e.target.checked)} className="w-4 h-4 accent-[#C8973A]" /><span className="text-sm text-[#F5F0EB]">Visible sur le site</span></label>
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.isFirstOnly} onChange={e => set("isFirstOnly", e.target.checked)} className="w-4 h-4 accent-[#C8973A]" /><span className="text-sm text-[#F5F0EB]">Première réservation uniquement</span></label>
        </div>
      </div>

      <div className="bg-[#141414] border border-[#222] rounded-xl p-6">
        <h2 className="font-display text-xl text-[#F5F0EB] mb-4">Plats concernés <span className="text-sm text-[#5A5249] font-sans">(laisser vide = tous)</span></h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
          {dishes.map(dish => (
            <label key={dish.id} className="flex items-center gap-3 p-2.5 rounded-lg cursor-pointer hover:bg-[#0A0A0A] transition-colors">
              <input type="checkbox" checked={form.dishIds.includes(dish.id)} onChange={() => toggleDish(dish.id)} className="w-4 h-4 accent-[#C8973A]" />
              <span className="text-sm text-[#F5F0EB]">{dish.name}</span>
              <span className="text-xs text-[#5A5249] ml-auto">{dish.category.name}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <Button type="button" variant="secondary" onClick={() => router.push("/admin/special-offers")} className="flex-1">Annuler</Button>
        <Button type="submit" loading={loading} className="flex-1">{offer ? "Enregistrer" : "Créer l'offre"}</Button>
      </div>
    </form>
  );
}
