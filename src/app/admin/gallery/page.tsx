import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";
import { ImageIcon, Plus } from "lucide-react";
import { GALLERY_CATEGORIES } from "@/lib/constants";

export const dynamic = "force-dynamic";
export const metadata = { title: "Galerie" };

export default async function AdminGalleryPage() {
	const images = await prisma.galleryImage.findMany({
		where: { isActive: true },
		orderBy: [{ category: "asc" }, { order: "asc" }, { uploadedAt: "desc" }],
	});

	const categories = GALLERY_CATEGORIES.map((category) => ({
		...category,
		images: images.filter((image) => image.category === category.id),
	}));

	return (
		<div>
			<div className="flex items-center justify-between gap-4 mb-6">
				<div>
					<h1 className="font-display text-3xl text-[#F5F0EB]">Galerie</h1>
					<p className="text-sm text-[#5A5249] mt-1">Gérez les images affichées sur le site par catégorie.</p>
				</div>
				<Link
					href="/admin/gallery/new"
					className="inline-flex items-center gap-2 bg-[#C8973A] hover:bg-[#E8B04A] text-[#0A0A0A] font-semibold text-sm px-4 py-2 rounded-lg transition-colors shrink-0"
				>
					<Plus size={16} /> Nouvelle image
				</Link>
			</div>

			{images.length === 0 ? (
				<div className="bg-[#141414] border border-[#222] rounded-xl py-20 text-center">
					<ImageIcon size={40} className="text-[#333] mx-auto mb-4" />
					<p className="text-[#5A5249]">Aucune image dans la galerie. Ajoutez votre première photo !</p>
				</div>
			) : (
				<div className="space-y-8">
					{categories.map((category) => (
						<section key={category.id}>
							<div className="flex items-center gap-3 mb-4">
								<h2 className="font-display text-xl text-[#F5F0EB]">{category.label}</h2>
								<span className="text-xs text-[#5A5249] bg-[#1a1a1a] px-2 py-0.5 rounded-full">
									{category.images.length} image{category.images.length > 1 ? "s" : ""}
								</span>
							</div>

							{category.images.length === 0 ? (
								<div className="bg-[#141414] border border-[#222] rounded-xl py-10 text-center">
									<p className="text-sm text-[#5A5249]">Aucune image dans cette catégorie.</p>
								</div>
							) : (
								<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
									{category.images.map((image) => (
										<Link
											key={image.id}
											href={`/admin/gallery/${image.id}`}
											className="group bg-[#141414] border border-[#222] hover:border-[#C8973A]/30 rounded-xl overflow-hidden transition-all"
										>
											<div className="relative aspect-[4/3] bg-[#101010] overflow-hidden">
												<Image
													src={image.imageUrl}
													alt={image.caption || category.label}
													fill
													sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
													className="object-cover transition-transform duration-300 group-hover:scale-105"
												/>
											</div>
											<div className="p-4">
												<p className="text-sm text-[#F5F0EB] font-medium line-clamp-2 min-h-10">
													{image.caption || "Sans légende"}
												</p>
												<div className="flex items-center justify-between gap-3 mt-3 text-xs text-[#5A5249]">
													<span>{category.label}</span>
													<span>{formatDate(image.uploadedAt, "dd/MM/yyyy")}</span>
												</div>
											</div>
										</Link>
									))}
								</div>
							)}
						</section>
					))}
				</div>
			)}
		</div>
	);
}
