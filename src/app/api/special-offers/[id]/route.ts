import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
	try {
		const body = await request.json();
		const { dishIds, userIds, ...data } = body;
		if (data.startDate) data.startDate = new Date(data.startDate);
		if (data.endDate) data.endDate = new Date(data.endDate);

		const offer = await prisma.specialOffer.update({
			where: { id: params.id },
			data: {
				...data,
				...(dishIds !== undefined && {
					items: { deleteMany: {}, create: dishIds.map((id: string) => ({ dishId: id })) },
				}),
			},
		});
		return NextResponse.json({ data: offer });
	} catch {
		return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
	}
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
	try {
		await prisma.specialOffer.delete({ where: { id: params.id } });
		return NextResponse.json({ message: "Offre supprimée" });
	} catch {
		return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
	}
}
