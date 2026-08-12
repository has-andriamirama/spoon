"use client";
import { useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import StepDateTime from "./step-date-time";
import StepPersonalInfo from "./step-personal-info";
import StepOptions from "./step-options";
import StepSummary from "./step-summary";

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
  date: "", timeSlot: "", covers: 2,
  guestFirstName: "", guestLastName: "", guestEmail: "", guestPhone: "",
  notes: "", allergies: "",
};

export default function ReservationStepper() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<ReservationFormData>(defaultData);

  const updateData = (updates: Partial<ReservationFormData>) => setData(prev => ({ ...prev, ...updates }));
  const next = () => setStep(s => Math.min(s + 1, 4));
  const prev = () => setStep(s => Math.max(s - 1, 1));

  return (
    <div>
      {/* Step indicators */}
      <div className="flex items-center justify-center mb-10">
        {STEPS.map((s, idx) => (
          <div key={s.id} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={cn(
                "w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all",
                step > s.id ? "bg-[#C8973A] border-[#C8973A] text-[#0A0A0A]" :
                step === s.id ? "border-[#C8973A] text-[#C8973A] bg-transparent" :
                "border-[#333] text-[#5A5249] bg-transparent"
              )}>
                {step > s.id ? <Check size={16} /> : s.id}
              </div>
              <span className={cn("text-xs mt-1.5 hidden sm:block", step === s.id ? "text-[#C8973A]" : "text-[#5A5249]")}>
                {s.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div className={cn("h-px w-12 sm:w-20 mx-2 transition-colors", step > s.id ? "bg-[#C8973A]" : "bg-[#222]")} />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="bg-[#141414] border border-[#222] rounded-xl p-6 sm:p-8">
        {step === 1 && <StepDateTime data={data} updateData={updateData} onNext={next} />}
        {step === 2 && <StepPersonalInfo data={data} updateData={updateData} onNext={next} onPrev={prev} />}
        {step === 3 && <StepOptions data={data} updateData={updateData} onNext={next} onPrev={prev} />}
        {step === 4 && <StepSummary data={data} onPrev={prev} />}
      </div>
    </div>
  );
}
