"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import type { Payment, ReservationStatus } from "@/types";
import toast from "react-hot-toast";

export default function AdminReservationActions({ reservation }: { reservation: { id: string; status: ReservationStatus; payment: Payment | null } }) {
  const router = useRouter();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [loading, setLoading] = useState<string | null>(null);

  const updateStatus = async (status: string, reason?: string) => {
    setLoading(status);
    try {
      const res = await fetch(`/api/reservations/${reservation.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, cancellationReason: reason }) });
      if (!res.ok) throw new Error();
      toast.success("Statut mis à jour");
      router.refresh();
    } catch { toast.error("Erreur lors de la mise à jour"); }
    finally { setLoading(null); }
  };

  return (
    <div className="bg-[#141414] border border-[#222] rounded-xl p-5">
      <h3 className="font-display text-base text-[#F5F0EB] mb-4">Actions</h3>
      <div className="flex flex-col gap-2">
        {reservation.status === "PENDING" && (
          <Button onClick={() => updateStatus("CONFIRMED")} loading={loading === "CONFIRMED"} className="w-full" size="sm">✓ Confirmer</Button>
        )}
        {["PENDING","CONFIRMED"].includes(reservation.status) && (
          <Button onClick={() => updateStatus("NO_SHOW")} loading={loading === "NO_SHOW"} variant="secondary" size="sm" className="w-full">Marquer absent</Button>
        )}
        {["PENDING","CONFIRMED"].includes(reservation.status) && (
          <Button onClick={() => setCancelOpen(true)} variant="destructive" size="sm" className="w-full">Annuler la réservation</Button>
        )}
        {reservation.status === "CONFIRMED" && (
          <Button onClick={() => updateStatus("COMPLETED")} loading={loading === "COMPLETED"} variant="secondary" size="sm" className="w-full">Marquer terminée</Button>
        )}
      </div>
      <Modal open={cancelOpen} onClose={() => setCancelOpen(false)} title="Annuler la réservation">
        <Textarea label="Motif d'annulation (optionnel)" value={cancelReason} onChange={e => setCancelReason(e.target.value)} placeholder="Ex: Fermeture exceptionnelle..." />
        <div className="flex gap-3 mt-4">
          <Button variant="secondary" onClick={() => setCancelOpen(false)} className="flex-1">Retour</Button>
          <Button variant="destructive" onClick={() => { updateStatus("CANCELLED_BY_ADMIN", cancelReason); setCancelOpen(false); }} className="flex-1">Confirmer</Button>
        </div>
      </Modal>
    </div>
  );
}
