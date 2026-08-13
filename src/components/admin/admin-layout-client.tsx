"use client";
import { createContext, useContext, useState } from "react";
import AdminSidebar from "./admin-sidebar";
import AdminHeader from "./admin-header";

interface AdminSidebarContextType {
	mobileOpen: boolean;
	setMobileOpen: (open: boolean) => void;
}

export const AdminSidebarContext = createContext<AdminSidebarContextType>({
	mobileOpen: false,
	setMobileOpen: () => {},
});

export function useAdminSidebar() {
	return useContext(AdminSidebarContext);
}

export default function AdminLayoutClient({
	children,
}: {
	children: React.ReactNode;
}) {
	const [mobileOpen, setMobileOpen] = useState(false);

	return (
		<AdminSidebarContext.Provider value={{ mobileOpen, setMobileOpen }}>
			<div className="min-h-screen bg-[#0A0A0A] flex">
				{/* Overlay mobile */}
				{mobileOpen && (
					<div
						className="fixed inset-0 bg-black/60 z-30 lg:hidden"
						onClick={() => setMobileOpen(false)}
					/>
				)}

				<AdminSidebar />

				<div className="flex-1 flex flex-col min-w-0">
					<AdminHeader />
					<main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
						{children}
					</main>
				</div>
			</div>
		</AdminSidebarContext.Provider>
	);
}
