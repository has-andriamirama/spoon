import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Cormorant_Garamond } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import Providers from "@/components/layout/providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Spoon — Restaurant Créole | Saint-Denis, La Réunion", template: "%s | Spoon Restaurant" },
  description: "Au cœur de Saint-Denis, Spoon vous propose une expérience gastronomique unique mêlant les saveurs authentiques de La Réunion à une cuisine créative et raffinée.",
  keywords: ["restaurant créole", "La Réunion", "gastronomie", "Saint-Denis", "cari", "rougail"],
  authors: [{ name: "Spoon Restaurant" }],
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "Spoon Restaurant",
    title: "Spoon — Restaurant Créole | Saint-Denis, La Réunion",
    description: "La cuisine créole élevée au rang d'art. Réservez votre table en ligne.",
    images: [{ url: "/images/og-default.jpg", width: 1200, height: 630, alt: "Spoon Restaurant" }],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${inter.variable} ${cormorant.variable}`}>
      <body>
        <Providers>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: "#141414",
                color: "#F5F0EB",
                border: "1px solid #222",
                borderRadius: "8px",
                fontSize: "14px",
              },
              success: { iconTheme: { primary: "#C8973A", secondary: "#141414" } },
              error: { iconTheme: { primary: "#F87171", secondary: "#141414" } },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
