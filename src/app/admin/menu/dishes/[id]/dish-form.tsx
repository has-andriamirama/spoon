"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { ALLERGENS, DIETARY_TAGS } from "@/lib/constants";
import type { Dish, MenuCategory } from "@/types";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/utils";

interface Props { dish: Dish | null; categories: MenuCategory[]; }

export default function DishForm({ dish, categories }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({
    categoryId: dish?.categoryId || "",
    name: dish?.name || "",
    description: dish?.description || "",
    price: dish?.price?.toString() || "",
    imageUrl: dish?.imageUrl || "",
    allergens: dish?.allergens || [] as string[],
    dietaryTags: dish?.dietaryTags || [] as string[],
    isAvailable: dish?.isAvailable ?? true,
    isDailySpecial: dish?.isDailySpecial ?? false,
  });

  const toggleArr = (key: "allergens" | "dietaryTags", val: string) => {
    setForm(p => ({ ...p, [key]: p[key].includes(val) ? p[key].filter(v => v !== val) : [...p[key], val] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try {
      const body = { ...form, price: parseFloat(form.price) };
      const url = dish ? `/api/menu/dishes/${dish.id}` : "/api/menu/dishes";
      const method = dish ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(dish ? "Plat modifié !" : "Plat créé !");
      router.push("/admin/menu");
    } catch (error: unknown) { toast.error(getErrorMessage(error)); }
    finally { setLoading(false); }
  };

  const handleDelete = async () => {
    if (!dish || !confirm("Supprimer ce plat ?")) return;
    setDeleting(true);
    try {
      await fetch(`/api/menu/dishes/${dish.id}`, { method: "DELETE" });
      toast.success("Plat supprimé");
      router.push("/admin/menu");
    } catch { toast.error("Erreur"); }
    finally { setDeleting(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl">
      <div className="bg-[#141414] border border-[#222] rounded-xl p-6 flex flex-col gap-5">
        <Select label="Catégorie *" value={form.categoryId} onChange={e => setForm(p => ({ ...p, categoryId: e.target.value }))} options={categories.map(c => ({ value: c.id, label: c.name }))} placeholder="Choisir..." required />
        <Input label="Nom du plat *" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
        <Textarea label="Description" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} />
        <Input label="Prix (€) *" type="number" step="0.01" min="0" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} required />
        <Input label="URL de l'image (Cloudinary ou externe)" value={form.imageUrl} onChange={e => setForm(p => ({ ...p, imageUrl: e.target.value }))} placeholder="https://res.cloudinary.com/..." />

        <div>
          <p className="text-sm font-medium text-[#F5F0EB] mb-3">Allergènes</p>
          <div className="flex flex-wrap gap-2">
            {ALLERGENS.map(a => (
              <button key={a.id} type="button" onClick={() => toggleArr("allergens", a.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${form.allergens.includes(a.id) ? "bg-yellow-500/20 border-yellow-500/50 text-yellow-300" : "border-[#222] text-[#5A5249] hover:text-[#9A8F84]"}`}>
                {a.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-[#F5F0EB] mb-3">Régimes</p>
          <div className="flex flex-wrap gap-2">
            {DIETARY_TAGS.map(t => (
              <button key={t.id} type="button" onClick={() => toggleArr("dietaryTags", t.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${form.dietaryTags.includes(t.id) ? "bg-green-500/20 border-green-500/50 text-green-300" : "border-[#222] text-[#5A5249] hover:text-[#9A8F84]"}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-8 pt-2">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.isAvailable} onChange={e => setForm(p => ({ ...p, isAvailable: e.target.checked }))} className="w-4 h-4 accent-[#C8973A]" />
            <span className="text-sm text-[#F5F0EB]">Disponible</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.isDailySpecial} onChange={e => setForm(p => ({ ...p, isDailySpecial: e.target.checked }))} className="w-4 h-4 accent-[#C8973A]" />
            <span className="text-sm text-[#F5F0EB]">Suggestion du chef</span>
          </label>
        </div>

        <div className="flex gap-3 pt-2">
          {dish && <Button type="button" variant="destructive" onClick={handleDelete} loading={deleting}>Supprimer</Button>}
          <Button type="button" variant="secondary" onClick={() => router.push("/admin/menu")} className="flex-1">Annuler</Button>
          <Button type="submit" loading={loading} className="flex-1">{dish ? "Enregistrer" : "Créer le plat"}</Button>
        </div>
      </div>
    </form>
  );
}
