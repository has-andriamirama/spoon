"use client";
import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";

export default function DeleteAccountPage() {
  const { data: session } = useSession();
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const userId = (session?.user as any)?.id;

  const handleDelete = async () => {
    if (confirm !== "SUPPRIMER") return;
    setLoading(true);
    try {
      const res = await fetch(`/api/customers/${userId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Compte supprimé");
      await signOut({ callbackUrl: "/" });
    } catch { toast.error("Erreur lors de la suppression."); setLoading(false); }
  };

  return (
    <div>
      <h1 className="font-display text-3xl text-[#F5F0EB] mb-8">Supprimer mon compte</h1>
      <div className="max-w-lg bg-red-500/5 border border-red-500/20 rounded-xl p-6">
        <div className="flex items-start gap-4 mb-6">
          <AlertTriangle size={24} className="text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-[#F5F0EB] font-medium mb-2">Cette action est irréversible</p>
            <p className="text-sm text-[#9A8F84]">La suppression de votre compte entraînera l'anonymisation de vos données personnelles. Vos réservations passées seront conservées pour des raisons comptables.</p>
          </div>
        </div>
        <Input label='Tapez "SUPPRIMER" pour confirmer' value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="SUPPRIMER" />
        <Button variant="destructive" onClick={handleDelete} loading={loading} disabled={confirm !== "SUPPRIMER"} className="w-full mt-4">
          Supprimer définitivement mon compte
        </Button>
      </div>
    </div>
  );
}
