import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import GalleryForm from "../gallery-form";

export const dynamic = "force-dynamic";

export default async function AdminGalleryImagePage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	const image = id === "new" ? null : await prisma.galleryImage.findUnique({ where: { id } });

	if (id !== "new" && !image) notFound();

	return (
		<div>
			<div className="flex items-center gap-3 mb-8">
				<Link
					href="/admin/gallery"
					className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-[#222] bg-[#141414] text-[#9A8F84] hover:text-[#F5F0EB] hover:border-[#C8973A]/40 transition-colors shrink-0"
					aria-label="Retour à la galerie"
				>
					<ArrowLeft size={17} />
				</Link>
				<h1 className="font-display text-3xl text-[#F5F0EB]">
					{image ? "Modifier l'image" : "Nouvelle image"}
				</h1>
			</div>
			<GalleryForm initialImage={image} />
		</div>
	);
}
