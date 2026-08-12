import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deleteCloudinaryImage } from "@/lib/cloudinary";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	try {
		const image = await prisma.galleryImage.findUnique({ where: { id: id } });
		if (!image) return NextResponse.json({ error: "Image introuvable" }, { status: 404 });
		if (image.publicId) await deleteCloudinaryImage(image.publicId);
		await prisma.galleryImage.delete({ where: { id: id } });
		return NextResponse.json({ message: "Image supprimée" });
	} catch { return NextResponse.json({ error: "Erreur interne" }, { status: 500 }); }
}
