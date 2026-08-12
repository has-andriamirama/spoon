"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { ReservationFormData } from "./reservation-stepper";

interface Props {
  data: ReservationFormData;
  updateData: (u: Partial<ReservationFormData>) => void;
  onNext: () => void;
  onPrev: () => void;
}

export default function StepPersonalInfo({ data, updateData, onNext, onPrev }: Props) {
  const { data: session } = useSession();
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Prefill from session
  if (session && !data.guestFirstName && session.user?.firstName) {
    updateData({
      guestFirstName: session.user.firstName || "",
      guestLastName: session.user.lastName || "",
      guestEmail: session.user?.email || "",
    });
  }

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!data.guestFirstName.trim()) errs.guestFirstName = "Prénom requis";
    if (!data.guestLastName.trim()) errs.guestLastName = "Nom requis";
    if (!data.guestEmail.trim() || !/\S+@\S+\.\S+/.test(data.guestEmail)) errs.guestEmail = "Email invalide";
    if (!data.guestPhone.trim() || data.guestPhone.length < 8) errs.guestPhone = "Téléphone requis";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => { if (validate()) onNext(); };

  return (
    <div>
      <h2 className="font-display text-2xl text-[#F5F0EB] mb-2">Vos informations</h2>
      <p className="text-sm text-[#9A8F84] mb-6">Ces informations seront utilisées pour votre confirmation de réservation.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <Input
          label="Prénom *"
          value={data.guestFirstName}
          onChange={e => updateData({ guestFirstName: e.target.value })}
          error={errors.guestFirstName}
          placeholder="Marie"
          autoComplete="given-name"
        />
        <Input
          label="Nom *"
          value={data.guestLastName}
          onChange={e => updateData({ guestLastName: e.target.value })}
          error={errors.guestLastName}
          placeholder="Martin"
          autoComplete="family-name"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <Input
          label="Email *"
          type="email"
          value={data.guestEmail}
          onChange={e => updateData({ guestEmail: e.target.value })}
          error={errors.guestEmail}
          placeholder="marie@exemple.fr"
          autoComplete="email"
        />
        <Input
          label="Téléphone *"
          type="tel"
          value={data.guestPhone}
          onChange={e => updateData({ guestPhone: e.target.value })}
          error={errors.guestPhone}
          placeholder="+262 692 00 00 00"
          autoComplete="tel"
        />
      </div>

      {!session && (
        <p className="text-xs text-[#5A5249] mb-6 p-4 bg-[#0A0A0A] rounded-lg border border-[#222]">
          Vous avez un compte ? <a href="/auth/login" className="text-[#C8973A] hover:underline">Connectez-vous</a> pour pré-remplir vos informations et suivre vos réservations.
        </p>
      )}

      <div className="flex gap-3">
        <Button variant="secondary" onClick={onPrev} className="flex-1">← Retour</Button>
        <Button onClick={handleNext} className="flex-1">Continuer →</Button>
      </div>
    </div>
  );
}
