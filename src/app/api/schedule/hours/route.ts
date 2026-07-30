import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
	const schedule = await prisma.scheduleDay.findMany({ orderBy: { dayOfWeek: "asc" } });
	return NextResponse.json({ data: schedule });
}

export async function PUT(request: Request) {
	try {
		const { schedule } = await request.json();
		for (const day of schedule) {
			await prisma.scheduleDay.upsert({
				where: { dayOfWeek: day.dayOfWeek },
				create: { dayOfWeek: day.dayOfWeek, isOpen: day.isOpen, slots: day.slots },
				update: { isOpen: day.isOpen, slots: day.slots },
			});
		}
		return NextResponse.json({ message: "Horaires mis à jour" });
	} catch { return NextResponse.json({ error: "Erreur interne" }, { status: 500 }); }
}
