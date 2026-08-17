import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { createDishSchema } from "@/lib/validations";

function isPrismaUniqueConstraintError(error: unknown): boolean {
	return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

export async function GET(request: Request) {
	const { searchParams } = new URL(request.url);
	const categorySlug = searchParams.get("category");
	const where: { categoryId?: string } = {};

	if (categorySlug) {
		const cat = await prisma.menuCategory.findUnique({ where: { slug: categorySlug } });
		if (cat) where.categoryId = cat.id;
	}

	const dishes = await prisma.dish.findMany({
		where: { ...where, isAvailable: true },
		include: {
			category: true,
			images: { orderBy: [{ isPrimary: "desc" }, { order: "asc" }] },
		},
		orderBy: [{ category: { order: "asc" } }, { order: "asc" }],
	});

	return NextResponse.json({ data: dishes });
}

export async function POST(request: Request) {
	try {
		const body = await request.json();
		const parsed = createDishSchema.safeParse(body);
		if (!parsed.success) {
			return NextResponse.json(
				{ error: "Données invalides", details: parsed.error.flatten() },
				{ status: 400 }
			);
		}

		const { images: imageInputs, ...dishData } = parsed.data;

		const primaryImage = imageInputs?.find((img) => img.isPrimary) ?? imageInputs?.[0];

		const dish = await prisma.dish.create({
			data: {
				...dishData,
				slug: slugify(dishData.name),
				imageUrl: primaryImage?.url ?? dishData.imageUrl,
				imagePublicId: primaryImage?.publicId ?? dishData.imagePublicId,
			},
		});

		if (imageInputs && imageInputs.length > 0) {
			await prisma.image.createMany({
				data: imageInputs.map((img, idx) => ({
					url: img.url,
					publicId: img.publicId,
					alt: img.alt,
					isPrimary: img.isPrimary || idx === 0,
					order: img.order ?? idx,
					dishId: dish.id,
				})),
			});
		}

		const fullDish = await prisma.dish.findUnique({
			where: { id: dish.id },
			include: {
				category: true,
				images: { orderBy: [{ isPrimary: "desc" }, { order: "asc" }] },
			},
		});

		return NextResponse.json({ data: fullDish }, { status: 201 });
	} catch (error: unknown) {
		if (isPrismaUniqueConstraintError(error)) {
			return NextResponse.json({ error: "Un plat avec ce nom existe déjà" }, { status: 409 });
		}
		return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
	}
}
