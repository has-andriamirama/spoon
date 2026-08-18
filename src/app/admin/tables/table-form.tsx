"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/utils";

type Table = { id: string; number: string; name: string | null; capacity: number; zone: string; status: string; notes: string | null; isActive: boolean };
export default function TableForm({ table }: { table: Table | null }) {
  const router = useRouter(); const [loading, setLoading] = useState(false); const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({ number: table?.number ?? "", name: table?.name ?? "", capacity: String(table?.capacity ?? 2), zone: table?.zone ?? "SALLE", status: table?.status ?? "AVAILABLE", notes: table?.notes ?? "", isActive: table?.isActive ?? true });
  const set = (key: string, value: string | boolean) => setForm((p) => ({ ...p, [key]: value }));
  const save = async (e: React.FormEvent) => { e.preventDefault(); setLoading(true); try { const res = await fetch(table ? `/api/admin/tables/${table.id}` : "/api/admin/tables", { method: table ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, capacity: Number(form.capacity) }) }); const data = await res.json(); if (!res.ok) throw new Error(data.error); toast.success(table ? "Table modifiée !" : "Table créée !"); router.push("/admin/tables"); router.refresh(); } catch (e) { toast.error(getErrorMessage(e)); } finally { setLoading(false); } };
  const deactivate = async () => { if (!table || !confirm("Désactiver cette table ? Elle ne sera plus proposée pour les nouvelles attributions.")) return; setDeleting(true); try { const res = await fetch(`/api/admin/tables/${table.id}`, { method: "DELETE" }); const data = await res.json(); if (!res.ok) throw new Error(data.error); toast.success("Table désactivée"); router.push("/admin/tables"); router.refresh(); } catch (e) { toast.error(getErrorMessage(e)); } finally { setDeleting(false); } };
  return <form onSubmit={save} className="max-w-2xl space-y-6">
    <div className="bg-[#141414] border border-[#222] rounded-xl p-6 space-y-5">
      <h2 className="font-display text-xl text-[#F5F0EB]">Informations de la table</h2>
      <div className="grid grid-cols-2 gap-4"><Input label="Numéro *" value={form.number} onChange={(e) => set("number", e.target.value)} required placeholder="T01" /><Input label="Nom / libellé" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Table fenêtre" /></div>
      <div className="grid grid-cols-2 gap-4"><Input label="Capacité *" type="number" min="1" max="50" value={form.capacity} onChange={(e) => set("capacity", e.target.value)} required /><Select label="Zone" value={form.zone} onChange={(e) => set("zone", e.target.value)} options={[{ value: "SALLE", label: "Salle" }, { value: "TERRASSE", label: "Terrasse" }, { value: "BAR", label: "Bar" }, { value: "AUTRE", label: "Autre" }]} /></div>
      <Select label="État opérationnel" value={form.status} onChange={(e) => set("status", e.target.value)} options={[{ value: "AVAILABLE", label: "Disponible" }, { value: "CLEANING", label: "Nettoyage" }, { value: "OUT_OF_SERVICE", label: "Hors service" }]} />
      <Textarea label="Notes" value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Accès PMR, table à assembler, emplacement..." />
      <label className="flex items-center gap-2 text-sm text-[#F5F0EB]"><input type="checkbox" checked={form.isActive} onChange={(e) => set("isActive", e.target.checked)} className="w-4 h-4 accent-[#C8973A]" /> Table active</label>
      <p className="text-xs text-[#5A5249] leading-relaxed">L'état « Réservée » ou « Occupée » n'est pas enregistré manuellement : il est déterminé automatiquement à partir des réservations et commandes en cours.</p>
    </div>
    <div className="flex gap-3"><Button type="button" variant="secondary" onClick={() => router.push("/admin/tables")} className="flex-1">Annuler</Button><Button type="submit" loading={loading} className="flex-1">{table ? "Enregistrer" : "Créer la table"}</Button></div>
    {table && <div className="border-t border-[#222] pt-5"><Button type="button" variant="destructive" loading={deleting} onClick={deactivate}>Désactiver cette table</Button></div>}
  </form>;
}
