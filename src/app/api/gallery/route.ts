import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GALLERY_CATEGORIES } from "@/lib/constants";
import type { GalleryCategory } from "@/types";

const isValidGalleryCategory = (value: unknown): value is (typeof GALLERY_CATEGORIES)[number]["id"] =>
	typeof value === "string" && GALLERY_CATEGORIES.some((category) => category.id === value);

export async function GET() {
	try {
		const images = await prisma.galleryImage.findMany({
			where: { isActive: true },
			orderBy: [{ category: "asc" }, { order: "asc" }, { uploadedAt: "desc" }],
		});
		return NextResponse.json({ data: images });
	} catch {
		return NextResponse.json({ error: "Erreur lors du chargement de la galerie" }, { status: 500 });
	}
}

export async function POST(request: Request) {
	try {
		const body = (await request.json()) as {
			imageUrl?: string;
			publicId?: string;
			caption?: string | null;
			category?: string;
		};

		if (!body.imageUrl || !body.publicId) {
			return NextResponse.json({ error: "Image et publicId requis" }, { status: 400 });
		}

		if (!isValidGalleryCategory(body.category)) {
			return NextResponse.json({ error: "Catégorie de galerie invalide" }, { status: 400 });
		}

		const lastImage = await prisma.galleryImage.findFirst({
			where: { category: body.category },
			orderBy: { order: "desc" },
			select: { order: true },
		});

		const image = await prisma.galleryImage.create({
			data: {
				imageUrl: body.imageUrl,
				publicId: body.publicId,
				caption: body.caption || null,
				category: body.category as GalleryCategory,
				order: (lastImage?.order ?? -1) + 1,
			},
		});

		return NextResponse.json({ data: image }, { status: 201 });
	} catch {
		return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
	}
}
