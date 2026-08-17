import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deleteCloudinaryImage } from "@/lib/cloudinary";

export async function DELETE(
	_request: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	const { id } = await params;
	try {
		const image = await prisma.image.findUnique({ where: { id } });
		if (!image) {
			return NextResponse.json({ error: "Image introuvable" }, { status: 404 });
		}

		await deleteCloudinaryImage(image.publicId).catch((err) =>
			console.error("[images/delete] Cloudinary error:", err)
		);

		await prisma.image.delete({ where: { id } });

		return NextResponse.json({ message: "Image supprimée" });
	} catch {
		return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
	}
}
