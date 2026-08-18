"use client";
import Link from "next/link";
import { Armchair, CalendarDays, ClipboardList, Edit3, Users } from "lucide-react";
import { useEffect, useState } from "react";

type LiveTable = {
  id: string; number: string; name: string | null; capacity: number; zone: string; state: string;
  reservation: { id: string; guestFirstName: string; guestLastName: string; covers: number; timeSlot: string; status: string } | null;
  order: { id: string; status: string; covers: number; guestFirstName: string | null; guestLastName: string | null; reservationId: string | null } | null;
};

const stateConfig: Record<string, { label: string; className: string; icon: typeof Armchair }> = {
  AVAILABLE: { label: "Disponible", className: "border-emerald-500/20 bg-emerald-500/5", icon: Armchair },
  RESERVED: { label: "Réservée", className: "border-yellow-500/20 bg-yellow-500/5", icon: CalendarDays },
  OCCUPIED: { label: "Occupée", className: "border-blue-500/20 bg-blue-500/5", icon: ClipboardList },
  CLEANING: { label: "Nettoyage", className: "border-orange-500/20 bg-orange-500/5", icon: Users },
  OUT_OF_SERVICE: { label: "Hors service", className: "border-red-500/20 bg-red-500/5", icon: Armchair },
};

export default function TableLiveBoard({ initialTables }: { initialTables: LiveTable[] }) {
  const [tables, setTables] = useState(initialTables);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState(() => new Date().toTimeString().slice(0, 5));

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/tables?date=${date}&time=${time}`, { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => { if (!cancelled && payload?.data) setTables(payload.data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [date, time]);

  return (
    <>
      <div className="bg-[#141414] border border-[#222] rounded-xl p-4 mb-5 flex flex-wrap gap-3 items-end">
        <label className="text-xs text-[#5A5249]">Date<input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 h-9 rounded-lg bg-[#0A0A0A] border border-[#222] px-3 text-sm text-[#F5F0EB]" /></label>
        <label className="text-xs text-[#5A5249]">Heure de référence<input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="mt-1 h-9 rounded-lg bg-[#0A0A0A] border border-[#222] px-3 text-sm text-[#F5F0EB]" /></label>
        <p className="text-xs text-[#5A5249] pb-2">« Réservée » tient compte de la durée du service configurée dans les paramètres.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
        {tables.map((table) => {
          const config = stateConfig[table.state] ?? stateConfig.AVAILABLE;
          const Icon = config.icon;
          return (
            <div key={table.id} className={`rounded-xl border p-4 ${config.className}`}>
              <div className="flex items-start justify-between gap-3 mb-5">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-[#141414] border border-[#222] flex items-center justify-center"><Icon size={18} className="text-[#C8973A]" /></div>
                  <div><p className="font-display text-lg text-[#F5F0EB]">Table {table.number}</p><p className="text-[11px] text-[#5A5249]">{table.zone} · {table.capacity} places</p></div>
                </div>
                <Link href={`/admin/tables/${table.id}`} className="text-[#5A5249] hover:text-[#C8973A]" title="Modifier"><Edit3 size={15} /></Link>
              </div>
              <span className="inline-flex items-center px-2 py-1 rounded-full bg-[#141414] border border-[#222] text-[11px] text-[#9A8F84]">{config.label}</span>
              {table.reservation && (
                <div className="mt-4 p-3 rounded-lg bg-[#0A0A0A]/60 border border-[#222]">
                  <p className="text-[10px] text-[#5A5249] uppercase tracking-wider mb-1">Réservation</p>
                  <p className="text-sm text-[#F5F0EB]">{table.reservation.guestFirstName} {table.reservation.guestLastName}</p>
                  <p className="text-xs text-[#9A8F84] mt-0.5">{table.reservation.covers} couverts · {table.reservation.timeSlot}</p>
                  <Link href={`/admin/reservations/${table.reservation.id}`} className="inline-block mt-2 text-xs text-[#C8973A] hover:underline">Voir la réservation</Link>
                </div>
              )}
              {table.order && (
                <div className="mt-4 p-3 rounded-lg bg-[#0A0A0A]/60 border border-[#222]">
                  <p className="text-[10px] text-[#5A5249] uppercase tracking-wider mb-1">Commande</p>
                  <p className="text-sm text-[#F5F0EB]">{table.order.guestFirstName || "Client sur place"} {table.order.guestLastName || ""}</p>
                  <p className="text-xs text-[#9A8F84] mt-0.5">{table.order.covers} couverts · {table.order.status}</p>
                  <Link href={`/admin/orders/${table.order.id}`} className="inline-block mt-2 text-xs text-[#C8973A] hover:underline">Ouvrir l'addition</Link>
                </div>
              )}
              {table.state === "AVAILABLE" && <p className="text-xs text-[#5A5249] mt-4">Prête à accueillir un client.</p>}
            </div>
          );
        })}
      </div>
      {tables.length === 0 && <div className="bg-[#141414] border border-[#222] rounded-xl py-20 text-center"><p className="text-[#5A5249]">Aucune table active. Créez votre première table.</p></div>}
    </>
  );
}
