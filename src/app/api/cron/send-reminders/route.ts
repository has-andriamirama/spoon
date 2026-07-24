import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendReservationReminder } from "@/services/email.service";
import { addDays, startOfDay, endOfDay } from "date-fns";

export async function GET(request: Request) {
  try {
    const tomorrow = addDays(new Date(), 1);
    const reservations = await prisma.reservation.findMany({
      where: { date: { gte: startOfDay(tomorrow), lte: endOfDay(tomorrow) }, status: "CONFIRMED" },
    });
    let sent = 0;
    for (const r of reservations) {
      await sendReservationReminder({ guestFirstName: r.guestFirstName, guestEmail: r.guestEmail, date: r.date, timeSlot: r.timeSlot, covers: r.covers });
      sent++;
    }
    return NextResponse.json({ success: true, reminders_sent: sent });
  } catch (error) {
    console.error("Cron error:", error);
    return NextResponse.json({ error: "Erreur cron" }, { status: 500 });
  }
}
