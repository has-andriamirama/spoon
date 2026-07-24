"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function CancelReservationButton({ reservationId }: { reservationId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleCancel = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reservations/${reservationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED_BY_CUSTOMER" }),
      });
      if (!res.ok) throw new Error();
      toast.success("Réservation annulée.");
      setOpen(false);
      router.refresh();
    } catch { toast.error("Erreur lors de l'annulation."); }
    finally { setLoading(false); }
  };

  return (
    <>
      <Button variant="destructive" onClick={() => setOpen(true)} className="w-full">Annuler la réservation</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Confirmer l'annulation" description="Êtes-vous sûr de vouloir annuler cette réservation ? L'acompte éventuel ne sera pas remboursé après 48h.">
        <div className="flex gap-3 mt-2">
          <Button variant="secondary" onClick={() => setOpen(false)} className="flex-1">Retour</Button>
          <Button variant="destructive" onClick={handleCancel} loading={loading} className="flex-1">Confirmer l'annulation</Button>
        </div>
      </Modal>
    </>
  );
}
