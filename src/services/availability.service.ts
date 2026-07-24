import { prisma } from "@/lib/prisma";
import type { TimeSlot, ScheduleSlot } from "@/types";
import { startOfDay, endOfDay } from "date-fns";

export async function getAvailableSlots(dateStr: string): Promise<TimeSlot[]> {
  const date = new Date(dateStr);
  const dayOfWeek = date.getDay();

  // Check closed day exception
  const closedDay = await prisma.closedDay.findFirst({
    where: {
      date: {
        gte: startOfDay(date),
        lte: endOfDay(date),
      },
    },
  });
  if (closedDay) return [];

  // Get regular schedule
  const scheduleDay = await prisma.scheduleDay.findUnique({ where: { dayOfWeek } });
  if (!scheduleDay || !scheduleDay.isOpen) return [];

  const slots = scheduleDay.slots as ScheduleSlot[];

  // Get existing bookings
  const existingReservations = await prisma.reservation.findMany({
    where: {
      date: { gte: startOfDay(date), lte: endOfDay(date) },
      status: { in: ["PENDING", "CONFIRMED"] },
    },
    select: { timeSlot: true, covers: true },
  });

  return slots.map((slot) => {
    const booked = existingReservations
      .filter((r) => r.timeSlot === slot.time)
      .reduce((sum, r) => sum + r.covers, 0);

    return {
      time: slot.time,
      maxCovers: slot.maxCovers,
      bookedCovers: booked,
      available: booked < slot.maxCovers,
    };
  });
}

export async function checkSlotAvailability(
  dateStr: string,
  timeSlot: string,
  covers: number
): Promise<boolean> {
  const slots = await getAvailableSlots(dateStr);
  const slot = slots.find((s) => s.time === timeSlot);
  if (!slot || !slot.available) return false;
  return slot.maxCovers - slot.bookedCovers >= covers;
}
