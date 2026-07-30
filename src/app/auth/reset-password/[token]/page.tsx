"use client";
import { use, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UtensilsCrossed } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

export default function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [form, setForm] = useState({ password: "", confirmPassword: "" });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) { toast.error("Mots de passe non identiques"); return; }
    if (form.password.length < 8) { toast.error("Minimum 8 caractères"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: form.password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDone(true);
    } catch (err: any) { toast.error(err.message || "Erreur"); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#0A0A0A]">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-[#C8973A] rounded-full flex items-center justify-center">
              <UtensilsCrossed size={18} className="text-[#0A0A0A]" />
            </div>
            <span className="font-display text-3xl text-[#F5F0EB] font-semibold">Spoon</span>
          </Link>
          <h1 className="font-display text-2xl text-[#F5F0EB]">Nouveau mot de passe</h1>
        </div>
        <div className="bg-[#141414] border border-[#222] rounded-xl p-6 sm:p-8">
          {done ? (
            <div className="text-center py-4">
              <p className="text-green-400 mb-3 font-medium">Mot de passe réinitialisé !</p>
              <p className="text-[#9A8F84] text-sm mb-6">Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.</p>
              <Link href="/auth/login" className="inline-block bg-[#C8973A] hover:bg-[#E8B04A] text-[#0A0A0A] font-semibold px-6 py-2.5 rounded-lg transition-colors text-sm">
                Se connecter
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Input label="Nouveau mot de passe *" type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} hint="Minimum 8 caractères" required />
              <Input label="Confirmer le mot de passe *" type="password" value={form.confirmPassword} onChange={e => setForm(p => ({ ...p, confirmPassword: e.target.value }))} required />
              <Button type="submit" loading={loading} className="w-full mt-2">Réinitialiser le mot de passe</Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
