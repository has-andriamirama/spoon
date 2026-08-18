import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Plus, Armchair, Users, ClipboardList, CalendarDays } from "lucide-react";
import { getLiveTables, type LiveTableState } from "@/lib/table-service";
import TablesRealtimeUpdater from "./tables-realtime-updater";
import TableLiveBoard from "./table-live-board";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tables" };

export default async function AdminTablesPage() {
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const time = now.toTimeString().slice(0, 5);
  const [tables, activeReservations, activeOrders] = await Promise.all([
    getLiveTables(date, time),
    prisma.reservation.count({ where: { date: new Date(date), status: { in: ["PENDING", "CONFIRMED"] } } }),
    prisma.order.count({ where: { status: { in: ["OPEN", "SUBMITTED", "PREPARING", "READY", "SERVED"] } } }),
  ]);

  const stateCounts = tables.reduce<Record<LiveTableState, number>>((acc, table) => {
    acc[table.state] += 1;
    return acc;
  }, { AVAILABLE: 0, RESERVED: 0, OCCUPIED: 0, CLEANING: 0, OUT_OF_SERVICE: 0 });

  return (
    <div>
      <TablesRealtimeUpdater />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[#C8973A] mb-2">Salle & service</p>
          <h1 className="font-display text-3xl text-[#F5F0EB]">Gestion des tables</h1>
          <p className="text-sm text-[#5A5249] mt-1">État en temps réel selon les réservations et les commandes actives.</p>
        </div>
        <Link href="/admin/tables/new" className="inline-flex items-center justify-center gap-2 bg-[#C8973A] hover:bg-[#E8B04A] text-[#0A0A0A] font-semibold text-sm px-4 py-2.5 rounded-lg transition-colors">
          <Plus size={16} /> Nouvelle table
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {[
          ["Disponibles", stateCounts.AVAILABLE, "text-emerald-400", "bg-emerald-500/10", Armchair],
          ["Réservées", stateCounts.RESERVED, "text-yellow-400", "bg-yellow-500/10", CalendarDays],
          ["Occupées", stateCounts.OCCUPIED, "text-blue-400", "bg-blue-500/10", ClipboardList],
          ["Nettoyage", stateCounts.CLEANING, "text-orange-400", "bg-orange-500/10", Users],
          ["Hors service", stateCounts.OUT_OF_SERVICE, "text-red-400", "bg-red-500/10", Armchair],
        ].map(([label, value, text, bg, Icon]) => {
          const IconComponent = Icon as typeof Armchair;
          return <div key={String(label)} className="bg-[#141414] border border-[#222] rounded-xl p-4"><div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mb-2`}><IconComponent size={15} className={String(text)} /></div><p className="text-xs text-[#5A5249]">{label}</p><p className={`font-display text-2xl ${String(text)}`}>{value as number}</p></div>;
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-[#5A5249] mb-4">
        <span>Aujourd'hui · {date.split("-").reverse().join("/")} · {time}</span>
        <span>·</span><span>{activeReservations} réservation(s) active(s) aujourd'hui</span>
        <span>·</span><span>{activeOrders} commande(s) en cours</span>
      </div>

      <TableLiveBoard initialTables={tables} />
    </div>
  );
}
