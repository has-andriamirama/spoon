"use client";
import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatDate } from "@/lib/utils";
import type { ReservationFormData } from "./reservation-stepper";
import type { TimeSlot } from "@/types";

interface Props {
  data: ReservationFormData;
  updateData: (u: Partial<ReservationFormData>) => void;
  onNext: () => void;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

export default function StepDateTime({ data, updateData, onNext }: Props) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const monthName = new Date(viewYear, viewMonth, 1).toLocaleString("fr-FR", { month: "long", year: "numeric" });

  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 60);

  useEffect(() => {
    if (!data.date) return;
    setLoadingSlots(true);
    fetch(`/api/reservations/availability?date=${data.date}`)
      .then(r => r.json())
      .then(d => setSlots(d.data || []))
      .finally(() => setLoadingSlots(false));
  }, [data.date]);

  const handleDateSelect = (day: number) => {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    updateData({ date: dateStr, timeSlot: "" });
  };

  const isDateDisabled = (day: number) => {
    const d = new Date(viewYear, viewMonth, day);
    return d < new Date(today.getFullYear(), today.getMonth(), today.getDate()) || d > maxDate;
  };

  const isDateSelected = (day: number) => {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return dateStr === data.date;
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  const canProceed = data.date && data.timeSlot && data.covers > 0;

  return (
    <div>
      <h2 className="font-display text-2xl text-[#F5F0EB] mb-6">Choisissez votre date et heure</h2>

      {/* Calendar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-[#222] text-[#9A8F84] hover:text-[#F5F0EB] transition-colors">
            <ChevronLeft size={18} />
          </button>
          <p className="text-[#F5F0EB] font-medium capitalize">{monthName}</p>
          <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-[#222] text-[#9A8F84] hover:text-[#F5F0EB] transition-colors">
            <ChevronRight size={18} />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 mb-2">
          {["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"].map(d => (
            <div key={d} className="text-center text-xs text-[#5A5249] py-1 font-medium">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => (
            <button
              key={day}
              disabled={isDateDisabled(day)}
              onClick={() => handleDateSelect(day)}
              className={cn(
                "aspect-square flex items-center justify-center rounded-lg text-sm transition-colors",
                isDateSelected(day) ? "bg-[#C8973A] text-[#0A0A0A] font-semibold" :
                isDateDisabled(day) ? "text-[#333] cursor-not-allowed" :
                "text-[#9A8F84] hover:bg-[#222] hover:text-[#F5F0EB]"
              )}
            >
              {day}
            </button>
          ))}
        </div>
      </div>

      {/* Time slots */}
      {data.date && (
        <div className="mb-8">
          <p className="text-sm font-medium text-[#F5F0EB] mb-3">
            Créneaux disponibles — {formatDate(data.date, "EEEE d MMMM")}
          </p>
          {loadingSlots ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {[...Array(6)].map((_, i) => <div key={i} className="h-10 bg-[#222] rounded-lg animate-pulse" />)}
            </div>
          ) : slots.length === 0 ? (
            <p className="text-[#9A8F84] text-sm py-4 text-center">Aucun créneau disponible ce jour. Choisissez une autre date.</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {slots.map(slot => (
                <button
                  key={slot.time}
                  disabled={!slot.available}
                  onClick={() => updateData({ timeSlot: slot.time })}
                  className={cn(
                    "py-2.5 px-3 rounded-lg text-sm font-medium border transition-colors",
                    data.timeSlot === slot.time ? "bg-[#C8973A] border-[#C8973A] text-[#0A0A0A]" :
                    !slot.available ? "border-[#1a1a1a] text-[#333] cursor-not-allowed bg-[#111]" :
                    "border-[#222] text-[#9A8F84] hover:border-[#C8973A]/50 hover:text-[#F5F0EB]"
                  )}
                >
                  {slot.time}
                  {!slot.available && <span className="block text-[10px]">Complet</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Covers */}
      <div className="mb-8">
        <p className="text-sm font-medium text-[#F5F0EB] mb-3 flex items-center gap-2">
          <Users size={16} className="text-[#C8973A]" /> Nombre de couverts
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={() => updateData({ covers: Math.max(1, data.covers - 1) })}
            className="w-10 h-10 rounded-lg border border-[#222] text-[#9A8F84] hover:border-[#C8973A]/50 hover:text-[#F5F0EB] transition-colors text-lg font-semibold"
          >-</button>
          <span className="w-12 text-center text-[#F5F0EB] font-semibold text-lg">{data.covers}</span>
          <button
            onClick={() => updateData({ covers: Math.min(20, data.covers + 1) })}
            className="w-10 h-10 rounded-lg border border-[#222] text-[#9A8F84] hover:border-[#C8973A]/50 hover:text-[#F5F0EB] transition-colors text-lg font-semibold"
          >+</button>
          <span className="text-sm text-[#5A5249]">personne{data.covers > 1 ? "s" : ""}</span>
        </div>
        {data.covers > 8 && (
          <p className="text-xs text-[#C8973A] mt-2">Pour les grands groupes (&gt;8), contactez-nous directement ou utilisez le formulaire Événements.</p>
        )}
      </div>

      <Button onClick={onNext} disabled={!canProceed} className="w-full">
        Continuer →
      </Button>
    </div>
  );
}
