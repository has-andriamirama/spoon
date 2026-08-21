"use client";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import StepDateTime from "./step-date-time";
import StepPersonalInfo from "./step-personal-info";
import StepOptions from "./step-options";
import StepSummary from "./step-summary";
import StepPaymentResult from "./step-payment-result";

export interface ReservationFormData {
  date: string;
  timeSlot: string;
  covers: number;
  guestFirstName: string;
  guestLastName: string;
  guestEmail: string;
  guestPhone: string;
  notes: string;
  allergies: string;
}

const STEPS = [
  { id: 1, label: "Date & heure" },
  { id: 2, label: "Vos informations" },
  { id: 3, label: "Options" },
  { id: 4, label: "Confirmation" },
];

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

function ReservationStepperInner() {
  const searchParams = useSearchParams();
  const paymentStatus = searchParams.get("payment"); // 'success' | 'canceled'
  const reservationId = searchParams.get("id");
  const sessionId = searchParams.get("session_id");

  const [step, setStep] = useState(paymentStatus ? 4 : 1);
  const [data, setData] = useState<ReservationFormData>(defaultData);

  const updateData = (updates: Partial<ReservationFormData>) =>
    setData((prev) => ({ ...prev, ...updates }));
  const next = () => setStep((s) => Math.min(s + 1, 4));
  const prev = () => setStep((s) => Math.max(s - 1, 1));

  return (
    <div>
      <div className="flex items-center justify-center mb-10">
        {STEPS.map((s, idx) => {
          const isCompleted = paymentStatus ? s.id < 4 : step > s.id;
          const isCurrent = step === s.id;

          return (
            <div key={s.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all",
                    isCompleted
                      ? "bg-[#C8973A] border-[#C8973A] text-[#0A0A0A]"
                      : isCurrent
                      ? "border-[#C8973A] text-[#C8973A] bg-transparent"
                      : "border-[#333] text-[#5A5249] bg-transparent"
                  )}
                >
                  {isCompleted ? <Check size={16} /> : s.id}
                </div>
                <span
                  className={cn(
                    "text-xs mt-1.5 hidden sm:block",
                    isCurrent ? "text-[#C8973A]" : "text-[#5A5249]"
                  )}
                >
                  {s.label}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div
                  className={cn(
                    "h-px w-12 sm:w-20 mx-2 transition-colors",
                    isCompleted ? "bg-[#C8973A]" : "bg-[#222]"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-[#141414] border border-[#222] rounded-xl p-6 sm:p-8">
        {!paymentStatus && step === 1 && (
          <StepDateTime data={data} updateData={updateData} onNext={next} />
        )}
        {!paymentStatus && step === 2 && (
          <StepPersonalInfo
            data={data}
            updateData={updateData}
            onNext={next}
            onPrev={prev}
            isAdminReservation={false}
          />
        )}
        {!paymentStatus && step === 3 && (
          <StepOptions
            data={data}
            updateData={updateData}
            onNext={next}
            onPrev={prev}
          />
        )}
        {!paymentStatus && step === 4 && (
          <StepSummary data={data} onPrev={prev} />
        )}

        {paymentStatus && step === 4 && (
          <StepPaymentResult
            status={paymentStatus}
            reservationId={reservationId}
            sessionId={sessionId}
          />
        )}
      </div>
    </div>
  );
}

export default function ReservationStepper() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse bg-[#141414] rounded-xl" />}>
      <ReservationStepperInner />
    </Suspense>
  );
}
