import { prisma } from "@/lib/prisma";
import ReservationStepper from "@/components/reservation/reservation-stepper";

export const metadata = { title: "Réservation" };

export const dynamic = "force-dynamic";

export default async function ReservationPage() {
  const settings = await prisma.restaurantSettings.findFirst({
    select: {
      depositAmountPerCover: true,
      maxBookingAdvanceDays: true,
    },
  });

  return (
    <div className="min-h-screen pt-24 pb-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-10">
          <p className="text-[#C8973A] text-sm font-medium uppercase tracking-widest mb-3">
            Réservation en ligne
          </p>
          <h1 className="font-display text-4xl lg:text-5xl text-[#F5F0EB] mb-3">
            Réservez votre table
          </h1>
          <p className="text-[#9A8F84]">
            Réservation en quelques étapes. Confirmation immédiate par email.
          </p>
        </div>

        <ReservationStepper
          depositAmountPerCover={settings?.depositAmountPerCover ?? 20}
          maxBookingAdvanceDays={settings?.maxBookingAdvanceDays ?? 60}
        />
      </div>
    </div>
  );
}
