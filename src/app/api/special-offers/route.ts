import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
	const offers = await prisma.specialOffer.findMany({
		where: { isActive: true, endDate: { gte: new Date() } },
		include: { items: { include: { dish: true } } },
		orderBy: { createdAt: "desc" },
	});
	return NextResponse.json({ data: offers });
}

export async function POST(request: Request) {
	try {
		const body = await request.json();
		const { dishIds, userIds, ...data } = body;
		const offer = await prisma.specialOffer.create({
			data: {
				...data,
				startDate: new Date(data.startDate),
				endDate: new Date(data.endDate),
				...(dishIds?.length && { items: { create: dishIds.map((id: string) => ({ dishId: id })) } }),
				...(userIds?.length && { targets: { create: userIds.map((id: string) => ({ userId: id })) } }),
			},
		});
		return NextResponse.json({ data: offer }, { status: 201 });
	} catch (error) {
		console.error(error);
		return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
	}
}
