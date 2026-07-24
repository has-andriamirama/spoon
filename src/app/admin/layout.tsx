import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AdminSidebar from "@/components/admin/admin-sidebar";
import AdminHeader from "@/components/admin/admin-header";

function getAdminSession() {
  try {
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get("admin-session");
    if (!sessionCookie) return null;
    return JSON.parse(sessionCookie.value);
  } catch { return null; }
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // Login page has its own layout
  return (
    <div className="min-h-screen bg-[#0A0A0A] flex">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader />
        <main className="flex-1 p-6 lg:p-8 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
