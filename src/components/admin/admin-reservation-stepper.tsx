"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Copy, ExternalLink, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { formatDate, formatPrice, getErrorMessage } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import StepDateTime from "@/components/reservation/step-date-time";
import StepPersonalInfo from "@/components/reservation/step-personal-info";
import StepOptions from "@/components/reservation/step-options";
import type { ReservationFormData } from "@/components/reservation/reservation-stepper";

interface Props {
  depositRequired: boolean;
  depositAmountPerCover: number;
  maxBookingAdvanceDays: number;
}

const defaultData: ReservationFormData = {
  date: "",
  timeSlot: "",
  covers: 2,
  guestFirstName: "",
  guestLastName: "",
  guestEmail: "",
  guestPhone: "",
  notes: "",
  allergies: "",
};

const steps = [
  { id: 1, label: "Date & heure" },
  { id: 2, label: "Client" },
  { id: 3, label: "Demandes" },
  { id: 4, label: "Création" },
];

export default function AdminReservationStepper({
  depositRequired,
  depositAmountPerCover,
}: Props) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<ReservationFormData>(defaultData);
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<{
    reservationId: string;
    checkoutUrl: string | null;
    paymentAmount: number;
  } | null>(null);

  const updateData = (updates: Partial<ReservationFormData>) =>
    setData((prev) => ({ ...prev, ...updates }));

  const next = () => setStep((value) => Math.min(value + 1, 4));
  const prev = () => setStep((value) => Math.max(value - 1, 1));

  const copyLink = async () => {
    if (!created?.checkoutUrl) return;
    try {
      await navigator.clipboard.writeText(created.checkoutUrl);
      toast.success("Lien Stripe copié");
    } catch {
      toast.error("Impossible de copier le lien");
    }
  };

  const createReservation = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || "Erreur lors de la création");
      }

      setCreated({
        reservationId: json.data.reservationId,
        checkoutUrl: json.data.checkoutUrl,
        paymentAmount: json.data.paymentAmount,
      });

      toast.success("Réservation créée");
    } catch (error) {
      toast.error(getErrorMessage(error, "Impossible de créer la réservation."));
    } finally {
      setLoading(false);
    }
  };

  if (created) {
    return (
      <div className="max-w-3xl">
        <Link
          href="/admin/reservations"
          className="inline-flex items-center gap-2 text-sm text-[#9A8F84] hover:text-[#F5F0EB] mb-6"
        >
          <ArrowLeft size={16} />
          Retour aux réservations
        </Link>

        <div className="bg-[#141414] border border-[#222] rounded-xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-green-500/15 text-green-400 flex items-center justify-center">
              <Check size={20} />
            </div>
            <div>
              <h1 className="font-display text-2xl text-[#F5F0EB]">
                Réservation créée
              </h1>
              <p className="text-sm text-[#9A8F84]">
                Le paiement de l&apos;acompte est en attente.
              </p>
            </div>
          </div>

          <div className="bg-[#0A0A0A] border border-[#222] rounded-xl p-5 mb-5">
            <p className="text-xs text-[#5A5249] mb-1">Client</p>
            <p className="text-sm text-[#F5F0EB] font-medium">
              {data.guestFirstName} {data.guestLastName}
            </p>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <p className="text-xs text-[#5A5249] mb-1">Date</p>
                <p className="text-sm text-[#F5F0EB]">
                  {formatDate(data.date, "dd/MM/yyyy")}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#5A5249] mb-1">Heure</p>
                <p className="text-sm text-[#F5F0EB]">{data.timeSlot}</p>
              </div>
              <div>
                <p className="text-xs text-[#5A5249] mb-1">Couverts</p>
                <p className="text-sm text-[#F5F0EB]">{data.covers}</p>
              </div>
              <div>
                <p className="text-xs text-[#5A5249] mb-1">Acompte</p>
                <p className="text-sm font-semibold text-[#C8973A]">
                  {formatPrice(created.paymentAmount)}
                </p>
              </div>
            </div>
          </div>

          {created.checkoutUrl ? (
            <div className="mb-6">
              <p className="text-sm font-medium text-[#F5F0EB] mb-2">
                Lien de paiement Stripe
              </p>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={created.checkoutUrl}
                  className="h-10 flex-1 min-w-0 px-3 rounded-lg bg-[#0A0A0A] border border-[#222] text-xs text-[#9A8F84]"
                />
                <button
                  type="button"
                  onClick={copyLink}
                  title="Copier le lien Stripe"
                  className="w-10 h-10 shrink-0 rounded-lg border border-[#222] text-[#9A8F84] hover:text-[#F5F0EB] hover:bg-[#222] transition-colors flex items-center justify-center"
                >
                  <Copy size={16} />
                </button>
                <a
                  href={created.checkoutUrl}
                  target="_blank"
                  rel="noreferrer"
                  title="Ouvrir le paiement"
                  className="w-10 h-10 shrink-0 rounded-lg border border-[#222] text-[#9A8F84] hover:text-[#F5F0EB] hover:bg-[#222] transition-colors flex items-center justify-center"
                >
                  <ExternalLink size={16} />
                </a>
              </div>
              <p className="text-xs text-[#5A5249] mt-2">
                Le lien a également été envoyé par email au client. Il expire automatiquement après 24 h.
              </p>
            </div>
          ) : (
            <div className="mb-6 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 text-sm text-yellow-400">
              Aucun lien Stripe n&apos;a été généré. Vérifiez le paramétrage de l&apos;acompte.
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <Link href={`/admin/reservations/${created.reservationId}`} className="flex-1">
              <Button variant="secondary" className="w-full gap-2">
                Voir la réservation
                <ExternalLink size={15} />
              </Button>
            </Link>
            <Link href="/admin/reservations" className="flex-1">
              <Button className="w-full">Retour à la liste</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <Link
        href="/admin/reservations"
        className="inline-flex items-center gap-2 text-sm text-[#9A8F84] hover:text-[#F5F0EB] mb-6"
      >
        <ArrowLeft size={16} />
        Retour aux réservations
      </Link>

      <div className="mb-8">
        <p className="text-[#C8973A] text-sm font-medium uppercase tracking-widest mb-2">
          Espace admin
        </p>
        <h1 className="font-display text-3xl text-[#F5F0EB]">
          Nouvelle réservation
        </h1>
        <p className="text-[#9A8F84] mt-2">
          Créez une réservation téléphonique ou sur place à l&apos;avance.
        </p>
      </div>

      <div className="flex items-center justify-center mb-8 overflow-x-auto">
        {steps.map((item, index) => {
          const completed = step > item.id;
          const current = step === item.id;

          return (
            <div key={item.id} className="flex items-center shrink-0">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold border-2",
                    completed
                      ? "bg-[#C8973A] border-[#C8973A] text-[#0A0A0A]"
                      : current
                        ? "border-[#C8973A] text-[#C8973A]"
                        : "border-[#333] text-[#5A5249]"
                  )}
                >
                  {completed ? <Check size={16} /> : item.id}
                </div>
                <span className={cn(
                  "text-xs mt-1.5 hidden sm:block",
                  current ? "text-[#C8973A]" : "text-[#5A5249]"
                )}>
                  {item.label}
                </span>
              </div>

              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "h-px w-10 sm:w-16 mx-2",
                    completed ? "bg-[#C8973A]" : "bg-[#222]"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-[#141414] border border-[#222] rounded-xl p-6 sm:p-8">
        {step === 1 && (
          <StepDateTime
            data={data}
            updateData={updateData}
            onNext={next}
            maxBookingAdvanceDays={maxBookingAdvanceDays}
          />
        )}

        {step === 2 && (
          <StepPersonalInfo
            data={data}
            updateData={updateData}
            onNext={next}
            onPrev={prev}
          />
        )}

        {step === 3 && (
          <StepOptions
            data={data}
            updateData={updateData}
            onNext={next}
            onPrev={prev}
          />
        )}

        {step === 4 && (
          <div>
            <h2 className="font-display text-2xl text-[#F5F0EB] mb-6">
              Créer la réservation
            </h2>

            <div className="bg-[#0A0A0A] border border-[#222] rounded-xl divide-y divide-[#1a1a1a] mb-5">
              {[
                ["Date", formatDate(data.date, "dd/MM/yyyy")],
                ["Heure", data.timeSlot],
                ["Couverts", `${data.covers}`],
                ["Client", `${data.guestFirstName} ${data.guestLastName}`],
                ["Email", data.guestEmail],
                ["Téléphone", data.guestPhone],
              ].map(([label, value]) => (
                <div key={label} className="px-5 py-3.5 flex items-center gap-4">
                  <span className="text-xs text-[#5A5249] w-24 shrink-0">
                    {label}
                  </span>
                  <span className="text-sm text-[#F5F0EB] font-medium">
                    {value}
                  </span>
                </div>
              ))}

              {data.allergies && (
                <div className="px-5 py-3.5">
                  <p className="text-xs text-[#5A5249] mb-1">Allergies</p>
                  <p className="text-sm text-[#9A8F84]">{data.allergies}</p>
                </div>
              )}

              {data.notes && (
                <div className="px-5 py-3.5">
                  <p className="text-xs text-[#5A5249] mb-1">Notes</p>
                  <p className="text-sm text-[#9A8F84]">{data.notes}</p>
                </div>
              )}
            </div>

            {depositRequired ? (
              <div className="bg-[#C8973A]/10 border border-[#C8973A]/25 rounded-xl p-5 mb-5">
                <p className="text-sm font-semibold text-[#C8973A] mb-1">
                  Acompte à demander
                </p>
                <p className="text-3xl font-bold text-[#F5F0EB]">
                  {formatPrice(data.covers * depositAmountPerCover)}
                </p>
                <p className="text-xs text-[#9A8F84] mt-1">
                  {data.covers} × {formatPrice(depositAmountPerCover)} par personne
                </p>
              </div>
            ) : (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-5 text-sm text-yellow-400">
                L&apos;acompte est désactivé dans les paramètres du restaurant.
              </div>
            )}

            <div className="bg-[#0A0A0A] border border-[#222] rounded-lg p-4 mb-6">
              <p className="text-sm text-[#9A8F84] leading-relaxed">
                La réservation sera créée en statut <strong className="text-[#F5F0EB]">en attente</strong>.
                Le client recevra un lien Stripe valable 24 h. La réservation ne devient pas automatiquement
                confirmée : l&apos;équipe conserve la décision d&apos;attribuer la table et de confirmer.
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={prev}
                className="flex-1"
                disabled={loading}
              >
                ← Retour
              </Button>
              <Button
                onClick={createReservation}
                className="flex-1 gap-2"
                disabled={!depositRequired || loading}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Création...
                  </>
                ) : (
                  "Créer la réservation"
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
