import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { eventRequestSchema } from "@/lib/validations";
import { createAdminNotification } from "@/services/notification.service";

export async function GET() {
	const events = await prisma.eventRequest.findMany({ orderBy: { createdAt: "desc" } });
	return NextResponse.json({ data: events });
}

export async function POST(request: Request) {
	try {
		const body = await request.json();
		const parsed = eventRequestSchema.safeParse(body);
		if (!parsed.success) return NextResponse.json({ error: "Données invalides" }, { status: 400 });
		const event = await prisma.eventRequest.create({ data: parsed.data });
		await createAdminNotification({
			type: "event_request",
			title: "Nouvelle demande d'événement",
			message: `${event.firstName} ${event.lastName} — ${event.eventType}`,
			link: `/admin/events`
		});
		return NextResponse.json({ data: event }, { status: 201 });
	} catch { return NextResponse.json({ error: "Erreur interne" }, { status: 500 }); }
}
