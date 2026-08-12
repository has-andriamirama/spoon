"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Clock, Users, User, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate, getErrorMessage } from "@/lib/utils";
import type { ReservationFormData } from "./reservation-stepper";
import toast from "react-hot-toast";

interface Props {
  data: ReservationFormData;
  onPrev: () => void;
  onConfirmed: (id: string) => void;
}

export default function StepSummary({ data, onPrev, onConfirmed }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: data.date,
          timeSlot: data.timeSlot,
          covers: data.covers,
          guestFirstName: data.guestFirstName,
          guestLastName: data.guestLastName,
          guestEmail: data.guestEmail,
          guestPhone: data.guestPhone,
          notes: data.notes,
          allergies: data.allergies,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erreur lors de la réservation");
      onConfirmed(json.data.id);
      router.push(`/reservation/confirmation?id=${json.data.id}`);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Une erreur est survenue."));
    } finally {
      setLoading(false);
    }
  };

  const rows = [
    { icon: Calendar, label: "Date", value: formatDate(data.date) },
    { icon: Clock, label: "Heure", value: data.timeSlot },
    { icon: Users, label: "Couverts", value: `${data.covers} personne${data.covers > 1 ? "s" : ""}` },
    { icon: User, label: "Nom", value: `${data.guestFirstName} ${data.guestLastName}` },
    { icon: Mail, label: "Email", value: data.guestEmail },
    { icon: Phone, label: "Téléphone", value: data.guestPhone },
  ];

  return (
    <div>
      <h2 className="font-display text-2xl text-[#F5F0EB] mb-6">Récapitulatif de votre réservation</h2>

      <div className="bg-[#0A0A0A] rounded-xl border border-[#222] divide-y divide-[#1a1a1a] mb-6">
        {rows.map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-center gap-4 px-5 py-3.5">
            <Icon size={16} className="text-[#C8973A] shrink-0" />
            <span className="text-[#5A5249] text-sm w-24 shrink-0">{label}</span>
            <span className="text-[#F5F0EB] text-sm font-medium">{value}</span>
          </div>
        ))}
        {data.allergies && (
          <div className="px-5 py-3.5">
            <p className="text-xs text-[#5A5249] mb-1">Allergies :</p>
            <p className="text-sm text-[#9A8F84]">{data.allergies}</p>
          </div>
        )}
        {data.notes && (
          <div className="px-5 py-3.5">
            <p className="text-xs text-[#5A5249] mb-1">Notes :</p>
            <p className="text-sm text-[#9A8F84]">{data.notes}</p>
          </div>
        )}
      </div>

      <p className="text-xs text-[#5A5249] mb-6">
        En confirmant, vous acceptez nos <a href="/legal/mentions-legales" className="text-[#C8973A] hover:underline">conditions générales</a> et notre <a href="/legal/politique-de-confidentialite" className="text-[#C8973A] hover:underline">politique de confidentialité</a>.
      </p>

      <div className="flex gap-3">
        <Button variant="secondary" onClick={onPrev} className="flex-1" disabled={loading}>← Retour</Button>
        <Button onClick={handleConfirm} loading={loading} className="flex-1">Confirmer ma réservation</Button>
      </div>
    </div>
  );
}
