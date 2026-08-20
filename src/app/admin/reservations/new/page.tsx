import { prisma } from "@/lib/prisma";
import AdminReservationStepper from "@/components/admin/admin-reservation-stepper";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nouvelle réservation" };

export default async function NewAdminReservationPage() {
  const settings = await prisma.restaurantSettings.findFirst({
    select: {
      depositRequired: true,
      depositAmountPerCover: true,
      maxBookingAdvanceDays: true,
    },
  });

  return (
    <div>
      <AdminReservationStepper
        depositRequired={settings?.depositRequired ?? true}
        depositAmountPerCover={settings?.depositAmountPerCover ?? 20}
        maxBookingAdvanceDays={settings?.maxBookingAdvanceDays ?? 60}
      />
    </div>
  );
}
