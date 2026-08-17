"use client";

import { useRef } from "react";
import Image from "next/image";
import { X, Plus, ImageIcon, CloudUpload } from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import type { ImageInput } from "@/types";

export type { ImageInput };

interface Props {
	images: ImageInput[];
	onChange: (images: ImageInput[]) => void;
	maxImages?: number;
}

export function ImageUploader({
	images,
	onChange,
	maxImages = 8,
}: Props) {
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = Array.from(e.target.files ?? []);
		if (files.length === 0) return;

		const slots = maxImages - images.length;
		if (slots <= 0) {
			toast.error(`Maximum ${maxImages} images atteint`);
			if (fileInputRef.current) fileInputRef.current.value = "";
			return;
		}

		const filesToProcess = files.slice(0, slots);

		if (files.length > slots) {
			toast(`Seules ${slots} image${slots > 1 ? "s" : ""} ont été ajoutées (maximum ${maxImages})`, {
				icon: "⚠️",
			});
		}

		const newImages: ImageInput[] = filesToProcess.map((file, i) => ({
			url: URL.createObjectURL(file),
			publicId: "",
			isPrimary: images.length === 0 && i === 0,
			order: images.length + i,
			file,
		}));

		const updated = [...images, ...newImages];
		if (!updated.some((img) => img.isPrimary)) updated[0].isPrimary = true;
		onChange(updated.map((img, idx) => ({ ...img, order: idx })));

		if (fileInputRef.current) fileInputRef.current.value = "";
	};

	const handleRemove = (index: number) => {
		const img = images[index];

		if (img.file) {
			URL.revokeObjectURL(img.url);
		}
		
		const updated = images.filter((_, i) => i !== index);
		if (img.isPrimary && updated.length > 0) {
			updated[0].isPrimary = true;
		}
		onChange(updated.map((img, idx) => ({ ...img, order: idx })));
	};

	const handleSetPrimary = (index: number) => {
		onChange(images.map((img, i) => ({ ...img, isPrimary: i === index })));
	};

	const pendingCount = images.filter((img) => img.file).length;
	const canAddMore   = images.length < maxImages;

	return (
		<div className="space-y-3">
			<div className="flex items-baseline gap-2">
				<p className="text-sm font-medium text-[#F5F0EB]">Images du plat</p>
				<span className="text-xs text-[#5A5249]">
					{images.length}/{maxImages} · Cliquer pour définir comme principale
				</span>
			</div>

			<div className="flex flex-wrap gap-3">
				{images.map((img, idx) => {
					const isPending = !!img.file;

					return (
						<div
							key={img.id ?? `${isPending ? "pending" : img.publicId}-${idx}`}
							title={
								img.isPrimary
									? "Image principale"
									: "Cliquer pour définir comme principale"
							}
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
								unoptimized={isPending}
							/>

							{img.isPrimary && (
								<div className="absolute bottom-0 inset-x-0 bg-[#C8973A] text-[#0A0A0A] text-[9px] font-bold text-center py-[3px] uppercase tracking-wide">
									Principale
								</div>
							)}

							{isPending && !img.isPrimary && (
								<div className="absolute bottom-0 inset-x-0 bg-blue-600/80 text-white text-[9px] font-semibold text-center py-[3px] uppercase tracking-wide flex items-center justify-center gap-1">
									<CloudUpload size={8} />
									Nouveau
								</div>
							)}

							{isPending && img.isPrimary && (
								<div className="absolute bottom-0 inset-x-0 bg-[#C8973A] text-[#0A0A0A] text-[9px] font-bold text-center py-[3px] uppercase tracking-wide flex items-center justify-center gap-1">
									<CloudUpload size={8} />
									Principale · Nouveau
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
					);
				})}

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

				{images.length === 0 && (
					<div className="flex items-center gap-3 text-[#3a3a3a]">
						<ImageIcon size={14} />
						<span className="text-xs">
							Aucune image — cliquez sur « + » pour en ajouter
						</span>
					</div>
				)}
			</div>

			{pendingCount > 0 && (
				<p className="text-xs text-blue-400/70 flex items-center gap-1.5">
					<CloudUpload size={11} />
					{pendingCount} nouvelle{pendingCount > 1 ? "s" : ""} image
					{pendingCount > 1 ? "s" : ""} sera
					{pendingCount > 1 ? "ont" : ""} uploadée
					{pendingCount > 1 ? "s" : ""} lors de la validation du formulaire
				</p>
			)}

			{images.length > 0 && pendingCount === 0 && (
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
