import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
	try {
		const { searchParams } = new URL(request.url);
		const q = searchParams.get("q");
		const customers = await prisma.user.findMany({
			where: q
				? {
						isActive: true,
						OR: [
							{ email: { contains: q, mode: "insensitive" } },
							{ firstName: { contains: q, mode: "insensitive" } },
							{ lastName: { contains: q, mode: "insensitive" } }
						]
					}
				: { isActive: true },
			select: {
				id: true,
				firstName: true,
				lastName: true,
				email: true,
				phone: true,
				createdAt: true,
				_count: { select: { reservations: true } } },
			orderBy: { createdAt: "desc" },
			take: 100,
		});
		return NextResponse.json({ data: customers });
	} catch {
		return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
	}
}
