import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deleteCloudinaryImage } from "@/lib/cloudinary";
import { GALLERY_CATEGORIES } from "@/lib/constants";
import type { GalleryCategory } from "@/types";

const isValidGalleryCategory = (value: unknown): value is (typeof GALLERY_CATEGORIES)[number]["id"] =>
	typeof value === "string" && GALLERY_CATEGORIES.some((category) => category.id === value);

export async function PATCH(
	request: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	const { id } = await params;

	try {
		const current = await prisma.galleryImage.findUnique({ where: { id } });
		if (!current) {
			return NextResponse.json({ error: "Image introuvable" }, { status: 404 });
		}

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

		const categoryChanged = current.category !== body.category;
		let nextOrder = current.order;

		if (categoryChanged) {
			const lastImage = await prisma.galleryImage.findFirst({
				where: { category: body.category as GalleryCategory, id: { not: id } },
				orderBy: { order: "desc" },
				select: { order: true },
			});
			nextOrder = (lastImage?.order ?? -1) + 1;
		}

		const image = await prisma.galleryImage.update({
			where: { id },
			data: {
				imageUrl: body.imageUrl,
				publicId: body.publicId,
				caption: body.caption || null,
				category: body.category as GalleryCategory,
				order: nextOrder,
			},
		});

		if (current.publicId !== body.publicId) {
			await deleteCloudinaryImage(current.publicId).catch((error) =>
				console.error("[gallery/update] Cloudinary error:", error)
			);
		}

		return NextResponse.json({ data: image });
	} catch {
		return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
	}
}

export async function DELETE(
	_request: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	const { id } = await params;
	try {
		const image = await prisma.galleryImage.findUnique({ where: { id } });
		if (!image) return NextResponse.json({ error: "Image introuvable" }, { status: 404 });
		if (image.publicId) await deleteCloudinaryImage(image.publicId);
		await prisma.galleryImage.delete({ where: { id } });
		return NextResponse.json({ message: "Image supprimée" });
	} catch {
		return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
	}
}
