"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UtensilsCrossed } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", password: "", confirm: "" });
  const update = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm) { toast.error("Les mots de passe ne correspondent pas"); return; }
    if (form.password.length < 8) { toast.error("Mot de passe minimum 8 caractères"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ firstName: form.firstName, lastName: form.lastName, email: form.email, phone: form.phone, password: form.password }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      toast.success("Compte créé ! Vérifiez votre email.");
      router.push("/auth/login");
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#0A0A0A] py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-[#C8973A] rounded-full flex items-center justify-center"><UtensilsCrossed size={18} className="text-[#0A0A0A]" /></div>
            <span className="font-display text-3xl text-[#F5F0EB] font-semibold">Spoon</span>
          </Link>
          <h1 className="font-display text-2xl text-[#F5F0EB]">Créer votre compte</h1>
        </div>
        <div className="bg-[#141414] border border-[#222] rounded-xl p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <Input label="Prénom *" value={form.firstName} onChange={e => update("firstName", e.target.value)} required autoComplete="given-name" />
              <Input label="Nom *" value={form.lastName} onChange={e => update("lastName", e.target.value)} required autoComplete="family-name" />
            </div>
            <Input label="Email *" type="email" value={form.email} onChange={e => update("email", e.target.value)} required autoComplete="email" />
            <Input label="Téléphone" type="tel" value={form.phone} onChange={e => update("phone", e.target.value)} autoComplete="tel" />
            <Input label="Mot de passe *" type="password" value={form.password} onChange={e => update("password", e.target.value)} required hint="Minimum 8 caractères" />
            <Input label="Confirmer le mot de passe *" type="password" value={form.confirm} onChange={e => update("confirm", e.target.value)} required />
            <Button type="submit" loading={loading} className="w-full mt-2">Créer mon compte</Button>
          </form>
          <p className="text-sm text-center text-[#5A5249] mt-6">
            Déjà un compte ? <Link href="/auth/login" className="text-[#C8973A] hover:underline">Se connecter</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
