import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { deleteCloudinaryImage } from "@/lib/cloudinary";
import { imageInputSchema } from "@/lib/validations";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
	const { id } = await params;
	const dish = await prisma.dish.findUnique({
		where: { id },
		include: {
			category: true,
			images: { orderBy: [{ isPrimary: "desc" }, { order: "asc" }] },
		},
	});
	if (!dish) return NextResponse.json({ error: "Plat introuvable" }, { status: 404 });
	return NextResponse.json({ data: dish });
}

export async function PATCH(request: Request, { params }: Params) {
	const { id } = await params;
	try {
		const body = await request.json();
		const { images: imageInputs, ...dishFields } = body as {
			images?: z.infer<typeof imageInputSchema>[];
			[key: string]: unknown;
		};

		const updatedDish = await prisma.dish.update({
			where: { id },
			data: {
				...(dishFields as object),
				...(typeof dishFields.name === "string" && { slug: slugify(dishFields.name as string) }),
			},
		});

		if (imageInputs !== undefined) {
			const existingImages = await prisma.image.findMany({ where: { dishId: id } });
			const incomingIds = imageInputs
				.filter((img) => img.id)
				.map((img) => img.id as string);

			const toDelete = existingImages.filter((img) => !incomingIds.includes(img.id));
			if (toDelete.length > 0) {
				await Promise.allSettled(
					toDelete.map((img) =>
						deleteCloudinaryImage(img.publicId).catch((err) =>
							console.error("[dishes/patch] Cloudinary delete error:", err)
						)
					)
				);
				await prisma.image.deleteMany({
					where: { id: { in: toDelete.map((img) => img.id) } },
				});
			}

			const toUpdate = imageInputs.filter((img) => img.id);
			await Promise.all(
				toUpdate.map((img) =>
					prisma.image.update({
						where: { id: img.id },
						data: { isPrimary: img.isPrimary ?? false, order: img.order ?? 0 },
					})
				)
			);

			const toCreate = imageInputs.filter((img) => !img.id);
			if (toCreate.length > 0) {
				await prisma.image.createMany({
					data: toCreate.map((img) => ({
						url: img.url,
						publicId: img.publicId,
						alt: img.alt,
						isPrimary: img.isPrimary ?? false,
						order: img.order ?? 0,
						dishId: id,
					})),
				});
			}

			const primaryImage = imageInputs.find((img) => img.isPrimary) ?? imageInputs[0];
			await prisma.dish.update({
				where: { id },
				data: {
					imageUrl: primaryImage?.url ?? null,
					imagePublicId: primaryImage?.publicId ?? null,
				},
			});
		}

		void updatedDish;

		const fullDish = await prisma.dish.findUnique({
			where: { id },
			include: {
				category: true,
				images: { orderBy: [{ isPrimary: "desc" }, { order: "asc" }] },
			},
		});

		return NextResponse.json({ data: fullDish });
	} catch {
		return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
	}
}

export async function DELETE(_request: Request, { params }: Params) {
	const { id } = await params;
	try {
		const dishImages = await prisma.image.findMany({ where: { dishId: id } });
		await Promise.allSettled(
			dishImages.map((img) =>
				deleteCloudinaryImage(img.publicId).catch((err) =>
					console.error("[dishes/delete] Cloudinary error:", err)
				)
			)
		);

		await prisma.dish.delete({ where: { id } });
		return NextResponse.json({ message: "Plat supprimé" });
	} catch {
		return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
	}
}
