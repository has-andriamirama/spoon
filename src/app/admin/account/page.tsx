"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";
import toast from "react-hot-toast";

export default function AdminAccountPage() {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.newPassword !== form.confirmPassword) { toast.error("Mots de passe non identiques"); return; }
    if (form.newPassword.length < 8) { toast.error("Minimum 8 caractères"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/account", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Mot de passe modifié !");
      router.push("/admin/dashboard");
    } catch (err: any) { toast.error(err.message || "Erreur"); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <h1 className="font-display text-3xl text-[#F5F0EB] mb-2">Mon compte admin</h1>
      <p className="text-[#9A8F84] mb-8">Modifiez votre mot de passe d'administration.</p>
      <form onSubmit={handleSubmit} className="max-w-md bg-[#141414] border border-[#222] rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2 text-[#C8973A] mb-2"><Shield size={16} /><span className="text-sm font-medium">Sécurité du compte</span></div>
        <Input label="Mot de passe actuel *" type="password" value={form.currentPassword} onChange={e => setForm(p => ({ ...p, currentPassword: e.target.value }))} required />
        <Input label="Nouveau mot de passe *" type="password" value={form.newPassword} onChange={e => setForm(p => ({ ...p, newPassword: e.target.value }))} hint="Minimum 8 caractères" required />
        <Input label="Confirmer le nouveau mot de passe *" type="password" value={form.confirmPassword} onChange={e => setForm(p => ({ ...p, confirmPassword: e.target.value }))} required />
        <Button type="submit" loading={loading} className="w-full">Modifier le mot de passe</Button>
      </form>
    </div>
  );
}
