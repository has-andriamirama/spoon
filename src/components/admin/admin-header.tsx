"use client";
import { usePathname, useRouter } from "next/navigation";
import { Bell, LogOut, User, Menu } from "lucide-react";
import { useState, useEffect } from "react";
import { getPusherClient } from "@/lib/pusher-client";
import Link from "next/link";
import toast from "react-hot-toast";
import { useAdminSidebar } from "./admin-layout-client";

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
	const { setMobileOpen } = useAdminSidebar();
	const [notifCount, setNotifCount] = useState(0);

	const title =
		Object.entries(TITLES).find(([k]) => pathname.startsWith(k))?.[1] ||
		"Administration";

	useEffect(() => {
		if (pathname === "/admin/login") return;

		fetch("/api/notifications?unread=true")
			.then((r) => r.json())
			.then((d) => setNotifCount(d.data?.count || 0))
			.catch(() => {});

		const pusher = getPusherClient();
		const channel = pusher.subscribe("admin-notifications");

		channel.bind("new-notification", (data: { title: string }) => {
			setNotifCount((c) => c + 1);
			toast(data.title, { icon: "🔔" });
		});

		return () => {
			channel.unbind_all();
			pusher.unsubscribe("admin-notifications");
		};
	}, [pathname]);

	if (pathname === "/admin/login") return null;

	const handleLogout = async () => {
		await fetch("/api/admin/login", { method: "DELETE" });
		router.push("/admin/login");
	};

	return (
		<header className="h-16 bg-[#141414] border-b border-[#222] flex items-center justify-between px-4 sm:px-6 shrink-0">
			<div className="flex items-center gap-3">
				<button
					onClick={() => setMobileOpen(true)}
					className="lg:hidden p-2 rounded-lg hover:bg-[#222] text-[#5A5249] hover:text-[#9A8F84] transition-colors"
					aria-label="Ouvrir le menu"
				>
					<Menu size={20} />
				</button>

				<h1 className="font-display text-lg sm:text-xl text-[#F5F0EB] font-semibold">
					{title}
				</h1>
			</div>

			<div className="flex items-center gap-1 sm:gap-3">
				<Link
					href="/admin/notifications"
					className="relative p-2 rounded-lg hover:bg-[#222] text-[#5A5249] hover:text-[#9A8F84] transition-colors"
				>
					<Bell size={18} />
					{notifCount > 0 && (
						<span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#C8973A] text-[#0A0A0A] text-[10px] font-bold rounded-full flex items-center justify-center">
							{notifCount > 9 ? "9+" : notifCount}
						</span>
					)}
				</Link>
				<Link
					href="/admin/account"
					className="p-2 rounded-lg hover:bg-[#222] text-[#5A5249] hover:text-[#9A8F84] transition-colors"
				>
					<User size={18} />
				</Link>
				<button
					onClick={handleLogout}
					className="p-2 rounded-lg hover:bg-[#222] text-[#5A5249] hover:text-red-400 transition-colors"
				>
					<LogOut size={18} />
				</button>
			</div>
		</header>
	);
}
