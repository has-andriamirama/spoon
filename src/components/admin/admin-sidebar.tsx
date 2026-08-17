"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
	LayoutDashboard,
	Calendar,
	UtensilsCrossed,
	Tag,
	Users,
	CreditCard,
	FileText,
	ImageIcon,
	PartyPopper,
	FolderTree,
	Clock,
	Bell,
	Settings,
	ChevronLeft,
	ChevronRight,
	X,
	UtensilsCrossed as Logo,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAdminSidebar } from "./admin-layout-client";

const NAV = [
	{
		section: "Principal",
		items: [
			{ href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
			{ href: "/admin/reservations", label: "Réservations", icon: Calendar },
		],
	},
	{
		section: "Menu",
		items: [
			{ href: "/admin/menu/dishes", label: "Plats", icon: UtensilsCrossed },
			{ href: "/admin/menu/categories", label: "Catégories", icon: FolderTree },
			{ href: "/admin/special-offers", label: "Offres spéciales", icon: Tag },
		],
	},
	{
		section: "Clients",
		items: [
			{ href: "/admin/customers", label: "Clients", icon: Users },
			{ href: "/admin/payments", label: "Paiements", icon: CreditCard },
			{ href: "/admin/invoices", label: "Factures", icon: FileText },
		],
	},
	{
		section: "Contenu",
		items: [
			{ href: "/admin/gallery", label: "Galerie", icon: ImageIcon },
			{ href: "/admin/events", label: "Événements", icon: PartyPopper },
			{ href: "/admin/schedule", label: "Horaires", icon: Clock },
		],
	},
	{
		section: "Système",
		items: [
			{ href: "/admin/notifications", label: "Notifications", icon: Bell },
			{ href: "/admin/settings", label: "Paramètres", icon: Settings },
		],
	},
];

function SidebarContent({
	collapsed,
	onClose,
	showCloseButton,
}: {
	collapsed?: boolean;
	onClose?: () => void;
	showCloseButton?: boolean;
}) {
	const pathname = usePathname();

	return (
		<>
			<div className="flex items-center justify-between p-4 border-b border-[#222] h-16 shrink-0">
				{!collapsed && (
					<div className="flex items-center gap-2">
						<div className="w-7 h-7 bg-[#C8973A] rounded-full flex items-center justify-center shrink-0">
							<Logo size={14} className="text-[#0A0A0A]" />
						</div>
						<span className="font-display text-lg text-[#F5F0EB] font-semibold">
							Spoon Admin
						</span>
					</div>
				)}
				{showCloseButton && onClose && (
					<button
						onClick={onClose}
						className="p-1.5 rounded-lg hover:bg-[#222] text-[#5A5249] hover:text-[#9A8F84] transition-colors ml-auto"
					>
						<X size={18} />
					</button>
				)}
			</div>

			<nav className="flex-1 overflow-y-auto py-4 px-2">
				{NAV.map(({ section, items }) => (
					<div key={section} className="mb-6">
						{!collapsed && (
							<p className="text-[10px] font-semibold text-[#333] uppercase tracking-widest px-3 mb-2">
								{section}
							</p>
						)}
						{items.map(({ href, label, icon: Icon }) => {
							const active = pathname === href || pathname.startsWith(`${href}/`);
							return (
								<Link
									key={href}
									href={href}
									title={collapsed ? label : undefined}
									className={cn(
										"flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-0.5",
										active
											? "bg-[#C8973A]/10 text-[#C8973A]"
											: "text-[#5A5249] hover:text-[#9A8F84] hover:bg-[#1a1a1a]",
										collapsed && "justify-center"
									)}
								>
									<Icon size={17} className="shrink-0" />
									{!collapsed && label}
								</Link>
							);
						})}
					</div>
				))}
			</nav>
		</>
	);
}

export default function AdminSidebar() {
	const pathname = usePathname();
	const { mobileOpen, setMobileOpen } = useAdminSidebar();
	const [collapsed, setCollapsed] = useState(false);

	if (pathname === "/admin/login") return null;

	return (
		<>
			<aside
				className={cn(
					"hidden lg:flex flex-col bg-[#141414] border-r border-[#222] transition-all duration-300 shrink-0",
					collapsed ? "w-16" : "w-64"
				)}
			>
				<SidebarContent collapsed={collapsed} />

				<div className="p-2 border-t border-[#222]">
					<button
						onClick={() => setCollapsed((c) => !c)}
						className={cn(
							"w-full p-2 rounded-lg hover:bg-[#222] text-[#5A5249] hover:text-[#9A8F84] transition-colors flex items-center",
							collapsed ? "justify-center" : "justify-end"
						)}
					>
						{collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
					</button>
				</div>
			</aside>

			<aside
				className={cn(
					"fixed inset-y-0 left-0 z-40 flex flex-col bg-[#141414] border-r border-[#222] w-72 transition-transform duration-300 lg:hidden",
					mobileOpen ? "translate-x-0" : "-translate-x-full"
				)}
			>
				<SidebarContent
					showCloseButton
					onClose={() => setMobileOpen(false)}
				/>
			</aside>
		</>
	);
}
