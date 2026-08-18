import { prisma } from "@/lib/prisma";
import { format } from "date-fns";

export const ACTIVE_ORDER_STATUSES = ["OPEN", "SUBMITTED", "PREPARING", "READY", "SERVED"] as const;
export const ACTIVE_RESERVATION_STATUSES = ["PENDING", "CONFIRMED"] as const;

export type LiveTableState = "AVAILABLE" | "RESERVED" | "OCCUPIED" | "CLEANING" | "OUT_OF_SERVICE";

export function parseTimeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return 0;
  return hours * 60 + minutes;
}

export function getReservationWindow(timeSlot: string, durationMinutes: number, graceBeforeMinutes: number) {
  const start = parseTimeToMinutes(timeSlot);
  return { start: Math.max(0, start - graceBeforeMinutes), end: start + durationMinutes };
}

export function isReservationActiveAt(
  reservation: { timeSlot: string; date: Date | string },
  dateStr: string,
  timeSlot: string,
  durationMinutes: number,
  graceBeforeMinutes: number,
) {
  const reservationDate = format(new Date(reservation.date), "yyyy-MM-dd");
  if (reservationDate !== dateStr) return false;

  const selectedMinutes = parseTimeToMinutes(timeSlot);
  const window = getReservationWindow(reservation.timeSlot, durationMinutes, graceBeforeMinutes);
  return selectedMinutes >= window.start && selectedMinutes < window.end;
}

export function hasReservationConflict(
  firstTimeSlot: string,
  secondTimeSlot: string,
  durationMinutes: number,
) {
  const firstStart = parseTimeToMinutes(firstTimeSlot);
  const secondStart = parseTimeToMinutes(secondTimeSlot);
  const firstEnd = firstStart + durationMinutes;
  const secondEnd = secondStart + durationMinutes;
  return firstStart < secondEnd && secondStart < firstEnd;
}

export async function getLiveTables(dateStr: string, timeSlot: string) {
  const settings = await prisma.restaurantSettings.findFirst({
    select: { reservationDurationMinutes: true, reservationGraceBeforeMinutes: true },
  });
  const durationMinutes = settings?.reservationDurationMinutes ?? 120;
  const graceBeforeMinutes = settings?.reservationGraceBeforeMinutes ?? 30;

  const tables = await prisma.restaurantTable.findMany({
    where: { isActive: true },
    orderBy: [{ zone: "asc" }, { number: "asc" }],
    include: {
      reservations: {
        where: { releasedAt: null, reservation: { date: new Date(dateStr), status: { in: ACTIVE_RESERVATION_STATUSES } } },
        include: {
          reservation: {
            select: { id: true, guestFirstName: true, guestLastName: true, covers: true, date: true, timeSlot: true, status: true },
          },
        },
      },
      orders: {
        where: { releasedAt: null, order: { status: { in: ACTIVE_ORDER_STATUSES } } },
        include: {
          order: {
            select: {
              id: true,
              status: true,
              covers: true,
              guestFirstName: true,
              guestLastName: true,
              reservationId: true,
            },
          },
        },
      },
    },
  });

  return tables.map((table) => {
    const activeOrder = table.orders[0]?.order ?? null;
    const activeReservationLink = table.reservations.find((link) =>
      isReservationActiveAt(link.reservation, dateStr, timeSlot, durationMinutes, graceBeforeMinutes),
    );
    const state: LiveTableState =
      table.status === "OUT_OF_SERVICE"
        ? "OUT_OF_SERVICE"
        : table.status === "CLEANING"
          ? "CLEANING"
          : activeOrder
            ? "OCCUPIED"
            : activeReservationLink
              ? "RESERVED"
              : "AVAILABLE";

    return {
      id: table.id,
      number: table.number,
      name: table.name,
      capacity: table.capacity,
      zone: table.zone,
      operationalStatus: table.status,
      notes: table.notes,
      state,
      reservation: activeReservationLink?.reservation ?? null,
      order: activeOrder,
    };
  });
}
