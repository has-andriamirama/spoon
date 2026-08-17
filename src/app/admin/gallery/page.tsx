"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Plus, Trash2, ImageIcon, X, Edit } from "lucide-react";
import { GALLERY_CATEGORIES } from "@/lib/constants";
import type { GalleryImage } from "@/types";
import toast from "react-hot-toast";
import GalleryForm from "./gallery-form";

export default function AdminGalleryPage() {
	const [images, setImages] = useState<GalleryImage[]>([]);
	const [loading, setLoading] = useState(true);
	const [showForm, setShowForm] = useState(false);
	const [editingImage, setEditingImage] = useState<GalleryImage | null>(null);

	useEffect(() => {
		const loadImages = async () => {
			try {
				const response = await fetch("/api/gallery", { cache: "no-store" });
				if (!response.ok) throw new Error("Impossible de charger la galerie.");
				const data = (await response.json()) as { data?: GalleryImage[] };
				setImages(data.data ?? []);
			} catch (error) {
				console.error(error);
				toast.error("Impossible de charger la galerie.");
			} finally {
				setLoading(false);
			}
		};

		void loadImages();
	}, []);

	const groupedImages = useMemo(() => {
		return GALLERY_CATEGORIES.map((category) => ({
			...category,
			images: images
				.filter((image) => image.category === category.id)
				.sort((a, b) => a.order - b.order),
		}));
	}, [images]);

	const openCreateForm = () => {
		setEditingImage(null);
		setShowForm(true);
	};

	const openEditForm = (image: GalleryImage) => {
		setEditingImage(image);
		setShowForm(true);
	};

	const closeForm = () => {
		setEditingImage(null);
		setShowForm(false);
	};

	const handleSaved = (image: GalleryImage) => {
		setImages((previous) => {
			const index = previous.findIndex((item) => item.id === image.id);
			if (index === -1) return [image, ...previous];
			const next = [...previous];
			next[index] = image;
			return next;
		});
		closeForm();
	};

	const handleDelete = async (image: GalleryImage) => {
		if (!confirm("Supprimer cette image ?")) return;

		try {
			const response = await fetch(`/api/gallery/${image.id}`, { method: "DELETE" });
			if (!response.ok) {
				const body = await response.json().catch(() => ({}));
				throw new Error((body as { error?: string }).error || "Erreur lors de la suppression.");
			}

			setImages((previous) => previous.filter((item) => item.id !== image.id));
			toast.success("Image supprimée");
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Erreur lors de la suppression");
		}
	};

	return (
		<div>
			<div className="flex items-center justify-between gap-4 mb-6">
				<div>
					<h1 className="font-display text-3xl text-[#F5F0EB]">Galerie</h1>
					<p className="text-sm text-[#5A5249] mt-1">
						Les images sont organisées par catégorie, comme les plats du menu.
					</p>
				</div>

				<button
					type="button"
					onClick={openCreateForm}
					className="inline-flex items-center gap-2 bg-[#C8973A] hover:bg-[#E8B04A] text-[#0A0A0A] font-semibold text-sm px-4 py-2 rounded-lg transition-colors shrink-0"
				>
					<Plus size={16} /> Ajouter
				</button>
			</div>

			{showForm && (
				<section className="mb-8">
					<div className="flex items-center justify-between mb-4">
						<h2 className="font-display text-xl text-[#F5F0EB]">
							{editingImage ? "Modifier l’image" : "Nouvelle image"}
						</h2>
						<button
							type="button"
							onClick={closeForm}
							className="p-2 text-[#5A5249] hover:text-[#F5F0EB] transition-colors"
							aria-label="Fermer le formulaire"
						>
							<X size={18} />
						</button>
					</div>
					<GalleryForm
						initialImage={editingImage}
						onSaved={handleSaved}
						onCancel={closeForm}
					/>
				</section>
			)}

			{loading ? (
				<div className="bg-[#141414] border border-[#222] rounded-xl py-20 text-center text-sm text-[#5A5249]">
					Chargement de la galerie…
				</div>
			) : images.length === 0 ? (
				<div className="bg-[#141414] border border-[#222] rounded-xl py-20 text-center">
					<ImageIcon size={48} className="text-[#333] mx-auto mb-4" />
					<p className="text-[#5A5249]">Aucune image. Ajoutez vos premières photos !</p>
				</div>
			) : (
				<div className="space-y-8">
					{groupedImages.map((category) => (
						<section key={category.id}>
							<div className="flex items-center gap-3 mb-4">
								<h2 className="font-display text-xl text-[#F5F0EB]">{category.label}</h2>
								<span className="text-xs text-[#5A5249] bg-[#1a1a1a] px-2 py-0.5 rounded-full">
									{category.images.length} image{category.images.length > 1 ? "s" : ""}
								</span>
							</div>

							<div className="bg-[#141414] border border-[#222] rounded-xl p-4">
								{category.images.length === 0 ? (
									<p className="text-center py-8 text-[#5A5249] text-sm">
										Aucune image dans cette catégorie
									</p>
								) : (
									<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
										{category.images.map((image) => (
											<div
												key={image.id}
												className="group relative aspect-square bg-[#101010] rounded-xl overflow-hidden border border-[#222]"
											>
												<Image
													src={image.imageUrl}
													alt={image.caption || category.label}
													fill
													sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
													className="object-cover transition-transform duration-300 group-hover:scale-105"
												/>

												<div className="absolute inset-0 bg-black/65 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
													<div className="w-full space-y-2">
														{image.caption && (
															<p className="text-xs text-white line-clamp-2">{image.caption}</p>
														)}
														<div className="flex items-center justify-end gap-2">
															<button
																type="button"
																onClick={() => openEditForm(image)}
																className="p-1.5 bg-[#C8973A]/20 hover:bg-[#C8973A]/40 rounded-lg transition-colors"
																aria-label="Modifier l’image"
															>
																<Edit size={14} className="text-[#E8B04A]" />
															</button>
															<button
																type="button"
																onClick={() => handleDelete(image)}
																className="p-1.5 bg-red-500/20 hover:bg-red-500/40 rounded-lg transition-colors"
																aria-label="Supprimer l’image"
															>
																<Trash2 size={14} className="text-red-400" />
															</button>
														</div>
													</div>
												</div>
											</div>
										))}
									</div>
								)}
							</div>
						</section>
					))}
				</div>
			)}
		</div>
	);
}
