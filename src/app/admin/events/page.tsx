import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { PartyPopper } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Événements" };

export default async function AdminEventsPage() {
  const events = await prisma.eventRequest.findMany({ orderBy: { createdAt: "desc" } });
  const statusColors: Record<string, any> = { NEW: "yellow", IN_PROGRESS: "blue", ACCEPTED: "green", DECLINED: "red" };
  const statusLabels: Record<string, string> = { NEW: "Nouveau", IN_PROGRESS: "En cours", ACCEPTED: "Accepté", DECLINED: "Refusé" };

  return (
    <div>
      <h1 className="font-display text-3xl text-[#F5F0EB] mb-6">Demandes d'événements</h1>
      <div className="bg-[#141414] border border-[#222] rounded-xl overflow-hidden">
        {events.length === 0 ? (
          <div className="text-center py-16"><PartyPopper size={40} className="text-[#333] mx-auto mb-4" /><p className="text-[#5A5249]">Aucune demande d'événement</p></div>
        ) : (
          <div className="divide-y divide-[#1a1a1a]">
            {events.map(ev => (
              <div key={ev.id} className="p-6">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <p className="text-[#F5F0EB] font-medium">{ev.firstName} {ev.lastName}</p>
                    <p className="text-sm text-[#9A8F84]">{ev.email} · {ev.phone}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusColors[ev.status]}>{statusLabels[ev.status]}</Badge>
                    <span className="text-xs text-[#5A5249]">{formatDate(ev.createdAt, "dd/MM/yyyy")}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-4 text-xs text-[#5A5249] mb-3">
                  <span>Type : <span className="text-[#9A8F84]">{ev.eventType}</span></span>
                  {ev.eventDate && <span>Date : <span className="text-[#9A8F84]">{formatDate(ev.eventDate, "dd/MM/yyyy")}</span></span>}
                  {ev.guestCount && <span>Personnes : <span className="text-[#9A8F84]">{ev.guestCount}</span></span>}
                  {ev.budget && <span>Budget : <span className="text-[#9A8F84]">{ev.budget}</span></span>}
                </div>
                <p className="text-sm text-[#9A8F84] bg-[#0A0A0A] rounded-lg p-3">{ev.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
