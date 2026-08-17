import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
	const { searchParams } = new URL(request.url);
	const dishId = searchParams.get("dishId");

	const where = dishId ? { dishId } : {};
	const images = await prisma.image.findMany({
		where,
		orderBy: [{ isPrimary: "desc" }, { order: "asc" }],
	});
	return NextResponse.json({ data: images });
}
