"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { X, Plus, Loader2, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import type { ImageInput } from "@/types";

export type { ImageInput };

interface Props {
	images: ImageInput[];
	onChange: (images: ImageInput[]) => void;
	maxImages?: number;
	folder?: string;
}

export function ImageUploader({
	images,
	onChange,
	maxImages = 8,
	folder = "spoon/dishes",
}: Props) {
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [uploadingCount, setUploadingCount] = useState(0);

	const uploadToCloudinary = async (
		file: File
	): Promise<{ url: string; publicId: string } | null> => {
		try {
			const sigRes = await fetch(`/api/upload?folder=${encodeURIComponent(folder)}`);
			if (!sigRes.ok) throw new Error("Signature introuvable");
			const { signature, timestamp, cloudName, apiKey } = await sigRes.json();

			const formData = new FormData();
			formData.append("file", file);
			formData.append("api_key", apiKey);
			formData.append("timestamp", String(timestamp));
			formData.append("signature", signature);
			formData.append("folder", folder);

			const uploadRes = await fetch(
				`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
				{ method: "POST", body: formData }
			);
			if (!uploadRes.ok) throw new Error("Upload échoué");
			const data = await uploadRes.json();
			return { url: data.secure_url, publicId: data.public_id };
		} catch (err) {
			console.error("[ImageUploader] Upload error:", err);
			return null;
		}
	};

	const deleteFromCloudinary = async (publicId: string) => {
		try {
			await fetch("/api/upload", {
				method: "DELETE",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ publicId }),
			});
		} catch {}
	};

	const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = Array.from(e.target.files ?? []);
		if (files.length === 0) return;

		const slots = maxImages - images.length;
		const filesToProcess = files.slice(0, slots);

		setUploadingCount(filesToProcess.length);

		const newImages: ImageInput[] = [];
		for (const file of filesToProcess) {
			const result = await uploadToCloudinary(file);
			if (result) {
				newImages.push({
					url: result.url,
					publicId: result.publicId,
					isPrimary: images.length === 0 && newImages.length === 0,
					order: images.length + newImages.length,
				});
			}
			setUploadingCount((c) => Math.max(0, c - 1));
		}

		if (newImages.length > 0) {
			const updated = [...images, ...newImages];
			
			if (!updated.some((img) => img.isPrimary)) updated[0].isPrimary = true;
			onChange(updated.map((img, i) => ({ ...img, order: i })));
			toast.success(
				`${newImages.length} image${newImages.length > 1 ? "s" : ""} ajoutée${
					newImages.length > 1 ? "s" : ""
				}`
			);
		}

		if (fileInputRef.current) fileInputRef.current.value = "";
	};

	const handleRemove = async (index: number) => {
		const img = images[index];
		const updated = images.filter((_, i) => i !== index);

		if (img.isPrimary && updated.length > 0) {
			updated[0].isPrimary = true;
		}

		if (!img.id) {
			await deleteFromCloudinary(img.publicId);
		}

		onChange(updated.map((img, i) => ({ ...img, order: i })));
	};

	const handleSetPrimary = (index: number) => {
		onChange(
			images.map((img, i) => ({ ...img, isPrimary: i === index }))
		);
	};

	const canAddMore = images.length + uploadingCount < maxImages;

	return (
		<div className="space-y-3">
			<div className="flex items-baseline gap-2">
				<p className="text-sm font-medium text-[#F5F0EB]">Images du plat</p>
				<span className="text-xs text-[#5A5249]">
					{images.length}/{maxImages} · Cliquer pour définir comme principale
				</span>
			</div>

			<div className="flex flex-wrap gap-3">
				{images.map((img, idx) => (
					<div
						key={img.publicId + idx}
						title={img.isPrimary ? "Image principale" : "Cliquer pour définir comme principale"}
						onClick={() => handleSetPrimary(idx)}
						className={cn(
							"relative w-24 h-24 rounded-lg overflow-hidden cursor-pointer group transition-all select-none",
							img.isPrimary
								? "ring-2 ring-[#C8973A] ring-offset-2 ring-offset-[#141414]"
								: "ring-1 ring-[#2a2a2a] hover:ring-[#444]"
						)}
					>
						<Image
							src={img.url}
							alt={img.alt || `Photo ${idx + 1}`}
							fill
							sizes="96px"
							className="object-cover"
						/>

						{img.isPrimary && (
							<div className="absolute bottom-0 inset-x-0 bg-[#C8973A] text-[#0A0A0A] text-[9px] font-bold text-center py-[3px] uppercase tracking-wide">
								Principale
							</div>
						)}

						<button
							type="button"
							title="Supprimer"
							onClick={(e) => {
								e.stopPropagation();
								handleRemove(idx);
							}}
							className={cn(
								"absolute top-1.5 right-1.5 w-5 h-5 rounded-full",
								"bg-black/60 hover:bg-red-500 text-white",
								"flex items-center justify-center z-10",
								"opacity-0 group-hover:opacity-100 transition-opacity"
							)}
						>
							<X size={11} strokeWidth={2.5} />
						</button>

						{!img.isPrimary && (
							<div className="absolute inset-0 bg-[#C8973A]/10 opacity-0 group-hover:opacity-100 transition-opacity" />
						)}
					</div>
				))}

				{Array.from({ length: uploadingCount }).map((_, i) => (
					<div
						key={`uploading-${i}`}
						className="w-24 h-24 rounded-lg bg-[#1a1a1a] border border-dashed border-[#333] flex flex-col items-center justify-center gap-1"
					>
						<Loader2 size={18} className="text-[#5A5249] animate-spin" />
						<span className="text-[9px] text-[#3a3a3a]">Upload…</span>
					</div>
				))}

				{canAddMore && (
					<button
						type="button"
						onClick={() => fileInputRef.current?.click()}
						className={cn(
							"w-24 h-24 rounded-lg border-2 border-dashed transition-all",
							"flex flex-col items-center justify-center gap-1",
							"border-[#2a2a2a] hover:border-[#C8973A]/60",
							"text-[#3a3a3a] hover:text-[#C8973A]"
						)}
					>
						<Plus size={26} strokeWidth={1.5} />
						<span className="text-[10px] font-medium">Ajouter</span>
					</button>
				)}

				{images.length === 0 && uploadingCount === 0 && (
					<div className="flex items-center gap-3 text-[#3a3a3a]">
						<ImageIcon size={14} />
						<span className="text-xs">Aucune image — cliquez sur « + » pour en ajouter</span>
					</div>
				)}
			</div>

			{images.length > 0 && (
				<p className="text-xs text-[#3a3a3a]">
					✦ L&apos;image principale apparaît dans la liste du menu et les aperçus
				</p>
			)}

			<input
				ref={fileInputRef}
				type="file"
				accept="image/*"
				multiple
				className="hidden"
				onChange={handleFileChange}
			/>
		</div>
	);
}
