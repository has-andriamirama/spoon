"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Calendar, FileText, User, Trash2, LogOut } from "lucide-react";
import { cn, getInitials } from "@/lib/utils";

const LINKS = [
  { href: "/account/reservations", label: "Mes réservations", icon: Calendar },
  { href: "/account/invoices", label: "Mes factures", icon: FileText },
  { href: "/account/profile", label: "Mon profil", icon: User },
  { href: "/account/delete", label: "Supprimer mon compte", icon: Trash2, danger: true },
];

export default function AccountSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user;

  return (
    <div className="bg-[#141414] border border-[#222] rounded-xl overflow-hidden">
      <div className="p-6 border-b border-[#222]">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-[#C8973A] rounded-full flex items-center justify-center text-[#0A0A0A] font-bold">
            {user ? getInitials(user.firstName || "", user.lastName || "") : "?"}
          </div>
          <div>
            <p className="text-[#F5F0EB] font-medium">{user?.firstName} {user?.lastName}</p>
            <p className="text-xs text-[#5A5249]">{user?.email}</p>
          </div>
        </div>
      </div>
      <nav className="p-2">
        {LINKS.map(({ href, label, icon: Icon, danger }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
              pathname.startsWith(href)
                ? "bg-[#C8973A]/10 text-[#C8973A]"
                : danger
                  ? "text-red-400/60 hover:text-red-400 hover:bg-red-500/5"
                  : "text-[#9A8F84] hover:text-[#F5F0EB] hover:bg-[#222]"
            )}
          >
            <Icon size={16} />
            {label}
          </Link>
        ))}
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-[#9A8F84] hover:text-[#F5F0EB] hover:bg-[#222] transition-colors"
        >
          <LogOut size={16} />
          Déconnexion
        </button>
      </nav>
    </div>
  );
}
