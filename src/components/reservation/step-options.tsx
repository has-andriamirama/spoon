"use client";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { ReservationFormData } from "./reservation-stepper";

interface Props {
  data: ReservationFormData;
  updateData: (u: Partial<ReservationFormData>) => void;
  onNext: () => void;
  onPrev: () => void;
}

export default function StepOptions({ data, updateData, onNext, onPrev }: Props) {
  return (
    <div>
      <h2 className="font-display text-2xl text-[#F5F0EB] mb-2">Options & demandes spéciales</h2>
      <p className="text-sm text-[#9A8F84] mb-6">Ces informations nous aident à mieux vous accueillir.</p>

      <div className="flex flex-col gap-4 mb-8">
        <Textarea
          label="Allergies alimentaires ou intolérances"
          value={data.allergies}
          onChange={e => updateData({ allergies: e.target.value })}
          placeholder="Ex : allergie aux fruits de mer, intolérance au lactose..."
          rows={3}
        />
        <Textarea
          label="Demandes spéciales ou commentaires"
          value={data.notes}
          onChange={e => updateData({ notes: e.target.value })}
          placeholder="Ex : chaise haute pour enfant, table en terrasse, occasion spéciale..."
          rows={3}
        />
      </div>

      <div className="flex gap-3">
        <Button variant="secondary" onClick={onPrev} className="flex-1">← Retour</Button>
        <Button onClick={onNext} className="flex-1">Voir le récapitulatif →</Button>
      </div>
    </div>
  );
}
