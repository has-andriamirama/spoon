"use client";
import { usePathname, useRouter } from "next/navigation";
import { Bell, LogOut, User } from "lucide-react";
import { useState, useEffect } from "react";
import { getPusherClient } from "@/lib/pusher-client";
import toast from "react-hot-toast";

const TITLES: Record<string, string> = {
  "/admin/dashboard": "Dashboard",
  "/admin/reservations": "Réservations",
  "/admin/menu": "Menu",
  "/admin/special-offers": "Offres spéciales",
  "/admin/customers": "Clients",
  "/admin/payments": "Paiements",
  "/admin/invoices": "Factures",
  "/admin/gallery": "Galerie",
  "/admin/events": "Événements",
  "/admin/schedule": "Horaires",
  "/admin/notifications": "Notifications",
  "/admin/settings": "Paramètres",
};

export default function AdminHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [notifCount, setNotifCount] = useState(0);
  const title = Object.entries(TITLES).find(([k]) => pathname.startsWith(k))?.[1] || "Administration";

  if (pathname === "/admin/login") return null;

  useEffect(() => {
    // Load unread count
    fetch("/api/notifications?unread=true").then(r => r.json()).then(d => setNotifCount(d.data?.count || 0)).catch(() => {});
    // Real-time notifications
    const pusher = getPusherClient();
    const channel = pusher.subscribe("admin-notifications");
    channel.bind("new-notification", (data: any) => {
      setNotifCount(c => c + 1);
      toast(data.title, { icon: "🔔" });
    });
    return () => { channel.unbind_all(); pusher.unsubscribe("admin-notifications"); };
  }, []);

  const handleLogout = async () => {
    await fetch("/api/admin/login", { method: "DELETE" });
    router.push("/admin/login");
  };

  return (
    <header className="h-16 bg-[#141414] border-b border-[#222] flex items-center justify-between px-6 shrink-0">
      <h1 className="font-display text-xl text-[#F5F0EB] font-semibold">{title}</h1>
      <div className="flex items-center gap-3">
        <a href="/admin/notifications" className="relative p-2 rounded-lg hover:bg-[#222] text-[#5A5249] hover:text-[#9A8F84] transition-colors">
          <Bell size={18} />
          {notifCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#C8973A] text-[#0A0A0A] text-[10px] font-bold rounded-full flex items-center justify-center">{notifCount > 9 ? "9+" : notifCount}</span>
          )}
        </a>
        <a href="/admin/account" className="p-2 rounded-lg hover:bg-[#222] text-[#5A5249] hover:text-[#9A8F84] transition-colors"><User size={18} /></a>
        <button onClick={handleLogout} className="p-2 rounded-lg hover:bg-[#222] text-[#5A5249] hover:text-red-400 transition-colors"><LogOut size={18} /></button>
      </div>
    </header>
  );
}
