"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ImageUploader } from "@/components/admin/image-uploader";
import { GALLERY_CATEGORIES } from "@/lib/constants";
import { deleteFromCDN, uploadFileToCDN } from "@/lib/client/cloudinary-upload";
import type { GalleryCategory, GalleryImage, ImageInput } from "@/types";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/utils";

const UPLOAD_FOLDER = "spoon/gallery";

const isGalleryCategory = (value: string): value is GalleryCategory =>
	GALLERY_CATEGORIES.some((category) => category.id === value);

interface GalleryFormProps {
	initialImage?: GalleryImage | null;
	onSaved: (image: GalleryImage) => void;
	onCancel: () => void;
}

export default function GalleryForm({ initialImage = null, onSaved, onCancel }: GalleryFormProps) {
	const router = useRouter();
	const [loading, setLoading] = useState(false);
	const [form, setForm] = useState<{ category: GalleryCategory; caption: string }>({
		category: initialImage?.category ?? "DISHES",
		caption: initialImage?.caption ?? "",
	});

	const [images, setImages] = useState<ImageInput[]>(
		initialImage
			? [
					{
						id: initialImage.id,
						url: initialImage.imageUrl,
						publicId: initialImage.publicId,
						alt: initialImage.caption ?? undefined,
						isPrimary: true,
						order: 0,
					},
				]
			: []
	);

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault();

		if (images.length !== 1) {
			toast.error("Ajoutez une image avant d'enregistrer.");
			return;
		}

		setLoading(true);
		let uploadedPublicId: string | null = null;

		try {
			let imageUrl = images[0].url;
			let publicId = images[0].publicId;

			if (images[0].file) {
				toast.loading("Upload de l'image…", { id: "gallery-upload-toast" });
				const result = await uploadFileToCDN(images[0].file, UPLOAD_FOLDER);

				if (!result) {
					toast.dismiss("gallery-upload-toast");
					throw new Error("Échec de l'upload de l'image.");
				}

				uploadedPublicId = result.publicId;
				imageUrl = result.url;
				publicId = result.publicId;
			}

			const isEditing = Boolean(initialImage);
			const response = await fetch(
				isEditing ? `/api/gallery/${initialImage?.id}` : "/api/gallery",
				{
					method: isEditing ? "PATCH" : "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						imageUrl,
						publicId,
						caption: form.caption.trim() || null,
						category: form.category,
					}),
				}
			);

			if (!response.ok) {
				const errorBody = await response.json().catch(() => ({}));
				throw new Error(
					(errorBody as { error?: string }).error ||
					"Erreur lors de l'enregistrement de l'image."
				);
			}

			const data = (await response.json()) as { data: GalleryImage };

			if (images[0].file) URL.revokeObjectURL(images[0].url);
			if (initialImage && initialImage.publicId !== publicId) {
				await deleteFromCDN(initialImage.publicId);
			}

			toast.dismiss("gallery-upload-toast");
			toast.success(isEditing ? "Image modifiée !" : "Image ajoutée !");
			onSaved(data.data);
			router.refresh();
		} catch (error: unknown) {
			toast.dismiss("gallery-upload-toast");

			if (uploadedPublicId) {
				await deleteFromCDN(uploadedPublicId);
			}

			toast.error(getErrorMessage(error));
		} finally {
			setLoading(false);
		}
	};

	return (
		<form onSubmit={handleSubmit} className="max-w-2xl">
			<div className="bg-[#141414] border border-[#222] rounded-xl p-6 flex flex-col gap-5">
				<div>
					<p className="font-display text-xl text-[#F5F0EB]">
						{initialImage ? "Modifier l'image" : "Ajouter une image"}
					</p>
					<p className="text-xs text-[#5A5249] mt-1">
						Choisissez une catégorie et ajoutez la photo qui doit apparaître dans la galerie.
					</p>
				</div>

				<Select
					label="Catégorie *"
					value={form.category}
					onChange={(event) => {
						const value = event.target.value;
						if (!isGalleryCategory(value)) return;

						setForm((previous) => ({
							...previous,
							category: value,
						}));
					}}
					options={GALLERY_CATEGORIES.map((category) => ({
						value: category.id,
						label: category.label,
					}))}
					required
				/>

				<Input
					label="Légende"
					value={form.caption}
					onChange={(event) => setForm((previous) => ({ ...previous, caption: event.target.value }))}
					placeholder="Ex. Notre salle principale"
				/>

				<div className="border-t border-[#1e1e1e] pt-5">
					<ImageUploader
						images={images}
						onChange={setImages}
						maxImages={1}
						allowPrimary={false}
						label="Image de galerie *"
						countLabel={`${images.length}/1`}
						emptyText='Aucune image — cliquez sur « + » pour en ajouter'
						emptyHelperText="Une seule image est enregistrée par formulaire."
					/>
				</div>

				<div className="flex gap-3 pt-2 border-t border-[#1e1e1e]">
					<Button
						type="button"
						variant="secondary"
						onClick={onCancel}
						className="flex-1"
						disabled={loading}
					>
						Annuler
					</Button>
					<Button type="submit" loading={loading} className="flex-1">
						{loading ? "Enregistrement..." : initialImage ? "Enregistrer les modifications" : "Ajouter l'image"}
					</Button>
				</div>
			</div>
		</form>
	);
}
