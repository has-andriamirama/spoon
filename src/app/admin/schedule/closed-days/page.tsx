"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate, getErrorMessage } from "@/lib/utils";
import { Trash2, Plus } from "lucide-react";
import toast from "react-hot-toast";

type ClosedDay = { id: string; date: string; reason?: string | null };

export default function AdminClosedDaysPage() {
  const [days, setDays] = useState<ClosedDay[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ date: "", reason: "" });

  useEffect(() => {
    fetch("/api/schedule/closed-days").then(r => r.json()).then(d => setDays(d.data || []));
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.date) return;
    setLoading(true);
    try {
      const res = await fetch("/api/schedule/closed-days", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDays(p => [...p, data.data]);
      setForm({ date: "", reason: "" });
      toast.success("Jour fermé ajouté");
    } catch (error: unknown) { toast.error(getErrorMessage(error)); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/schedule/closed-days/${id}`, { method: "DELETE" });
      setDays(p => p.filter(d => d.id !== id));
      toast.success("Jour supprimé");
    } catch { toast.error("Erreur"); }
  };

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <a href="/admin/schedule/hours" className="text-sm text-[#9A8F84] hover:text-[#F5F0EB]">← Horaires</a>
        <h1 className="font-display text-3xl text-[#F5F0EB]">Jours fermés</h1>
      </div>
      <form onSubmit={handleAdd} className="bg-[#141414] border border-[#222] rounded-xl p-5 mb-6 flex flex-col sm:flex-row gap-3 items-end">
        <Input label="Date de fermeture *" type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} required className="flex-1" />
        <Input label="Motif (optionnel)" value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} placeholder="Ex : Fermeture annuelle" className="flex-1" />
        <Button type="submit" loading={loading} className="shrink-0"><Plus size={16} /> Ajouter</Button>
      </form>
      <div className="bg-[#141414] border border-[#222] rounded-xl overflow-hidden">
        {days.length === 0 ? (
          <p className="text-center py-12 text-[#5A5249] text-sm">Aucun jour de fermeture exceptionnel défini.</p>
        ) : (
          <div className="divide-y divide-[#1a1a1a]">
            {days.map(day => (
              <div key={day.id} className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="text-sm text-[#F5F0EB] font-medium">{formatDate(day.date)}</p>
                  {day.reason && <p className="text-xs text-[#5A5249] mt-0.5">{day.reason}</p>}
                </div>
                <button onClick={() => handleDelete(day.id)} className="p-2 text-[#333] hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/10">
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
