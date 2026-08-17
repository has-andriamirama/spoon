import { NextResponse } from "next/server";
import { getCloudinarySignature, deleteCloudinaryImage } from "@/lib/cloudinary";

export async function GET(request: Request) {
	try {
		const { searchParams } = new URL(request.url);
		const folder = searchParams.get("folder") || "spoon";
		const signature = getCloudinarySignature(folder);
		return NextResponse.json(signature);
	} catch {
		return NextResponse.json({ error: "Erreur lors de la génération de la signature" }, { status: 500 });
	}
}

export async function DELETE(request: Request) {
	try {
		const body = await request.json();
		const { publicId } = body as { publicId?: string };
		if (!publicId) {
			return NextResponse.json({ error: "publicId requis" }, { status: 400 });
		}
		await deleteCloudinaryImage(publicId);
		return NextResponse.json({ message: "Image supprimée de Cloudinary" });
	} catch {
		return NextResponse.json({ error: "Erreur lors de la suppression" }, { status: 500 });
	}
}
