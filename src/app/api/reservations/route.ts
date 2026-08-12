import { NextResponse } from "next/server";
import { ReservationStatus } from "../../../../generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createReservationSchema } from "@/lib/validations";
import { checkSlotAvailability } from "@/services/availability.service";
import { sendReservationConfirmation, sendAdminNewReservationAlert } from "@/services/email.service";
import { createAdminNotification } from "@/services/notification.service";

export async function GET(request: Request) {
	try {
		const { searchParams } = new URL(request.url);
		const session = await getServerSession(authOptions);
		const userId = session?.user?.id;
		const where: { userId?: string; status?: ReservationStatus } = userId ? { userId } : {};
		const status = searchParams.get("status");
		if (status && Object.values(ReservationStatus).includes(status as ReservationStatus)) {
			where.status = status as ReservationStatus;
		}
		const reservations = await prisma.reservation.findMany({
			where,
			include: { payment: true },
			orderBy: { date: "desc" },
			take: 100
		});
		return NextResponse.json({ data: reservations });
	} catch {
		return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
	}
}

export async function POST(request: Request) {
	try {
		const body = await request.json();
		const parsed = createReservationSchema.safeParse(body);
		if (!parsed.success) return NextResponse.json({ error: "Données invalides", details: parsed.error.flatten() }, { status: 400 });

		const { date, timeSlot, covers } = parsed.data;
		const available = await checkSlotAvailability(date, timeSlot, covers);
		if (!available) return NextResponse.json({ error: "Ce créneau n'est plus disponible. Veuillez choisir un autre." }, { status: 409 });

		const session = await getServerSession(authOptions);
		const settings = await prisma.restaurantSettings.findFirst();

		const reservation = await prisma.reservation.create({
			data: {
				...parsed.data,
				date: new Date(date),
				userId: session?.user?.id || null,
				status: settings?.autoConfirmReservations ? "CONFIRMED" : "PENDING",
				confirmedAt: settings?.autoConfirmReservations ? new Date() : null,
			},
		});

		// Send confirmation email
		await sendReservationConfirmation({
			id: reservation.id,
			guestFirstName: reservation.guestFirstName,
			guestLastName: reservation.guestLastName,
			guestEmail: reservation.guestEmail,
			date: reservation.date,
			timeSlot: reservation.timeSlot,
			covers: reservation.covers,
			notes: reservation.notes
		});

		// Admin notification
		await createAdminNotification({
			type: "new_reservation",
			title: "Nouvelle réservation",
			message: `${reservation.guestFirstName} ${reservation.guestLastName} — ${timeSlot} (${covers} couvert${covers > 1 ? "s" : ""})`,
			link: `/admin/reservations/${reservation.id}`
		});

		// Admin email if configured
		if (settings?.email) {
			await sendAdminNewReservationAlert({
				guestFirstName: reservation.guestFirstName,
				guestLastName: reservation.guestLastName,
				date: reservation.date,
				timeSlot: reservation.timeSlot,
				covers: reservation.covers,
				adminEmail: settings.email
			});
		}

		return NextResponse.json({ data: reservation }, { status: 201 });
	} catch (error) {
		console.error(error);
		return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 });
	}
}
