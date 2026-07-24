"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Menu, X, UtensilsCrossed, User, LogOut } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/", label: "Accueil" },
  { href: "/menu", label: "Carte" },
  { href: "/gallery", label: "Galerie" },
  { href: "/events", label: "Événements" },
  { href: "/contact", label: "Contact" },
];

export default function PublicHeader() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <header className={cn(
      "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
      scrolled ? "bg-[#0A0A0A]/95 backdrop-blur-sm border-b border-[#222]" : "bg-transparent"
    )}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-[#C8973A] rounded-full flex items-center justify-center group-hover:bg-[#E8B04A] transition-colors">
              <UtensilsCrossed size={16} className="text-[#0A0A0A]" />
            </div>
            <span className="font-display text-2xl text-[#F5F0EB] font-semibold tracking-wide">Spoon</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "text-sm font-medium transition-colors relative",
                  pathname === link.href
                    ? "text-[#C8973A]"
                    : "text-[#9A8F84] hover:text-[#F5F0EB]"
                )}
              >
                {link.label}
                {pathname === link.href && (
                  <span className="absolute -bottom-1 left-0 right-0 h-px bg-[#C8973A] rounded-full" />
                )}
              </Link>
            ))}
          </nav>

          {/* CTA + user */}
          <div className="hidden lg:flex items-center gap-4">
            {session ? (
              <div className="flex items-center gap-3">
                <Link
                  href="/account/reservations"
                  className="flex items-center gap-2 text-sm text-[#9A8F84] hover:text-[#F5F0EB] transition-colors"
                >
                  <User size={16} />
                  <span>{(session.user as any).firstName}</span>
                </Link>
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="text-[#9A8F84] hover:text-[#F5F0EB] transition-colors"
                >
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <Link href="/auth/login" className="text-sm text-[#9A8F84] hover:text-[#F5F0EB] transition-colors">
                Connexion
              </Link>
            )}
            <Link
              href="/reservation"
              className="bg-[#C8973A] hover:bg-[#E8B04A] text-[#0A0A0A] font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors"
            >
              Réserver
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setIsOpen(true)}
            className="lg:hidden text-[#F5F0EB] p-1"
            aria-label="Ouvrir le menu"
          >
            <Menu size={24} />
          </button>
        </div>
      </div>

      {/* Mobile menu overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-[#0A0A0A]/95 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
          <div className="absolute top-0 right-0 h-full w-80 bg-[#141414] border-l border-[#222] flex flex-col p-8">
            <div className="flex items-center justify-between mb-10">
              <span className="font-display text-2xl text-[#F5F0EB] font-semibold">Spoon</span>
              <button onClick={() => setIsOpen(false)} className="text-[#9A8F84] hover:text-[#F5F0EB]">
                <X size={24} />
              </button>
            </div>
            <nav className="flex flex-col gap-6 flex-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "text-lg font-medium transition-colors",
                    pathname === link.href ? "text-[#C8973A]" : "text-[#9A8F84] hover:text-[#F5F0EB]"
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <div className="flex flex-col gap-3">
              {session ? (
                <>
                  <Link href="/account/reservations" onClick={() => setIsOpen(false)} className="flex items-center gap-2 text-[#9A8F84] hover:text-[#F5F0EB]">
                    <User size={16} /> Mon compte
                  </Link>
                  <button onClick={() => signOut({ callbackUrl: "/" })} className="text-left text-[#9A8F84] hover:text-[#F5F0EB] flex items-center gap-2">
                    <LogOut size={16} /> Déconnexion
                  </button>
                </>
              ) : (
                <Link href="/auth/login" onClick={() => setIsOpen(false)} className="text-[#9A8F84] hover:text-[#F5F0EB]">
                  Connexion
                </Link>
              )}
              <Link
                href="/reservation"
                onClick={() => setIsOpen(false)}
                className="bg-[#C8973A] hover:bg-[#E8B04A] text-[#0A0A0A] font-semibold text-center py-3 rounded-lg transition-colors"
              >
                Réserver une table
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
