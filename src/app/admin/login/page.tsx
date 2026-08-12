"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { UtensilsCrossed, Shield } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/utils";

export default function AdminLoginPage() {
  const [form, setForm] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try {
      const res = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Identifiants incorrects");
      toast.success("Connexion réussie");
      router.push(data.mustChangePassword ? "/admin/account" : "/admin/dashboard");
    } catch (error: unknown) { toast.error(getErrorMessage(error)); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#0A0A0A]">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-[#C8973A] rounded-full flex items-center justify-center">
              <UtensilsCrossed size={18} className="text-[#0A0A0A]" />
            </div>
            <span className="font-display text-3xl text-[#F5F0EB] font-semibold">Spoon</span>
          </div>
          <div className="flex items-center justify-center gap-2 text-[#9A8F84] mb-2">
            <Shield size={16} />
            <span className="text-sm font-medium uppercase tracking-wider">Administration</span>
          </div>
        </div>
        <div className="bg-[#141414] border border-[#222] rounded-xl p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input label="Identifiant" value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} autoComplete="username" required />
            <Input label="Mot de passe" type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} autoComplete="current-password" required />
            <Button type="submit" loading={loading} className="w-full mt-2">Connexion</Button>
          </form>
        </div>
      </div>
    </div>
  );
}
