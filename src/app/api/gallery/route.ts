import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
	const images = await prisma.galleryImage.findMany({
		where: { isActive: true },
		orderBy: { order: "asc" }
	});
	return NextResponse.json({ data: images });
}

export async function POST(request: Request) {
	try {
		const { imageUrl, publicId, caption, category } = await request.json();
		const image = await prisma.galleryImage.create({ data: { imageUrl, publicId, caption, category } });
		return NextResponse.json({ data: image }, { status: 201 });
	} catch { return NextResponse.json({ error: "Erreur interne" }, { status: 500 }); }
}
