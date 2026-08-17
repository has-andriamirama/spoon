"use client";

import { useRef } from "react";
import Image from "next/image";
import { X, Plus, ImageIcon, CloudUpload } from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import type { ImageInput } from "@/types";

export type { ImageInput };

interface ImageUploaderProps {
	images: ImageInput[];
	onChange: (images: ImageInput[]) => void;
	maxImages?: number;
	label?: string;
	countLabel?: string;
	emptyText?: string;
	primaryLabel?: string;
	emptyHelperText?: string;
	pendingHelperText?: string;
	allowPrimary?: boolean;
	accept?: string;
	className?: string;
}

export function ImageUploader({
	images,
	onChange,
	maxImages = 8,
	label = "Images",
	countLabel,
	emptyText = 'Aucune image — cliquez sur « + » pour en ajouter',
	primaryLabel = "Principale",
	emptyHelperText = "L'image principale apparaît en premier dans les aperçus.",
	pendingHelperText,
	allowPrimary = true,
	accept = "image/*",
	className,
}: ImageUploaderProps) {
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = Array.from(e.target.files ?? []);
		if (files.length === 0) return;

		const slots = maxImages - images.length;
		if (slots <= 0) {
			toast.error(`Maximum ${maxImages} image${maxImages > 1 ? "s" : ""} atteint${maxImages > 1 ? "" : "e"}`);
			if (fileInputRef.current) fileInputRef.current.value = "";
			return;
		}

		const filesToProcess = files.slice(0, slots);

		if (files.length > slots) {
			toast(`Seules ${slots} image${slots > 1 ? "s" : ""} ont été ajoutées (maximum ${maxImages})`, {
				icon: "⚠️",
			});
		}

		const newImages: ImageInput[] = filesToProcess.map((file, index) => ({
			url: URL.createObjectURL(file),
			publicId: "",
			isPrimary: allowPrimary && images.length === 0 && index === 0,
			order: images.length + index,
			file,
		}));

		const updated = [...images, ...newImages];

		if (allowPrimary && !updated.some((img) => img.isPrimary) && updated.length > 0) {
			updated[0].isPrimary = true;
		}

		onChange(updated.map((img, index) => ({ ...img, order: index })));

		if (fileInputRef.current) fileInputRef.current.value = "";
	};

	const handleRemove = (index: number) => {
		const image = images[index];

		if (image?.file) {
			URL.revokeObjectURL(image.url);
		}

		const updated = images.filter((_, imageIndex) => imageIndex !== index);

		if (allowPrimary && image?.isPrimary && updated.length > 0) {
			updated[0].isPrimary = true;
		}

		onChange(updated.map((img, imageIndex) => ({ ...img, order: imageIndex })));
	};

	const handleSetPrimary = (index: number) => {
		if (!allowPrimary) return;
		onChange(images.map((img, imageIndex) => ({ ...img, isPrimary: imageIndex === index })));
	};

	const pendingCount = images.filter((img) => !!img.file).length;
	const canAddMore = images.length < maxImages;

	return (
		<div className={cn("space-y-3", className)}>
			<div className="flex items-baseline gap-2">
				<p className="text-sm font-medium text-[#F5F0EB]">{label}</p>
				<span className="text-xs text-[#5A5249]">
					{countLabel ?? `${images.length}/${maxImages}`}
					{allowPrimary && " · Cliquer pour définir comme principale"}
				</span>
			</div>

			<div className="flex flex-wrap gap-3">
				{images.map((img, index) => {
					const isPending = !!img.file;
					const canSelectPrimary = allowPrimary && images.length > 1;

					return (
						<div
							key={img.id ?? `${isPending ? "pending" : img.publicId || "image"}-${index}`}
						title={
								allowPrimary
									? img.isPrimary
										? "Image principale"
										: "Cliquer pour définir comme principale"
									: undefined
							}
							className={cn(
								"relative w-24 h-24 rounded-lg overflow-hidden group transition-all select-none",
								allowPrimary && canSelectPrimary ? "cursor-pointer" : "cursor-default",
								allowPrimary && img.isPrimary
									? "ring-2 ring-[#C8973A] ring-offset-2 ring-offset-[#141414]"
									: "ring-1 ring-[#2a2a2a] hover:ring-[#444]"
							)}
						>
							{canSelectPrimary ? (
								<button
									type="button"
									onClick={() => handleSetPrimary(index)}
									className="absolute inset-0 z-[1]"
									aria-label={img.isPrimary ? "Image principale" : "Définir comme image principale"}
								/>
							) : null}

							<Image
								src={img.url}
								alt={img.alt || `Photo ${index + 1}`}
								fill
								sizes="96px"
								className="object-cover"
								unoptimized={isPending}
							/>

							{allowPrimary && img.isPrimary && (
								<div className="absolute bottom-0 inset-x-0 z-[2] bg-[#C8973A] text-[#0A0A0A] text-[9px] font-bold text-center py-[3px] uppercase tracking-wide">
									{primaryLabel}
								</div>
							)}

							<button
								type="button"
								title="Supprimer"
								onClick={(event) => {
									event.stopPropagation();
									handleRemove(index);
								}}
								className={cn(
									"absolute top-1.5 right-1.5 z-10 w-5 h-5 rounded-full",
									"bg-black/60 hover:bg-red-500 text-white",
									"flex items-center justify-center",
									"opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
								)}
							>
								<X size={11} strokeWidth={2.5} />
							</button>

							{allowPrimary && !img.isPrimary && canSelectPrimary && (
								<div className="absolute inset-0 z-0 bg-[#C8973A]/10 opacity-0 group-hover:opacity-100 transition-opacity" />
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
						<span className="text-xs">{emptyText}</span>
					</div>
				)}
			</div>

			{pendingCount > 0 && (
				<p className="text-xs text-blue-400/70 flex items-center gap-1.5">
					<CloudUpload size={11} />
					{pendingHelperText ??
						`${pendingCount} nouvelle${pendingCount > 1 ? "s" : ""} image${pendingCount > 1 ? "s" : ""} sera${pendingCount > 1 ? "ont" : "a"} uploadée${pendingCount > 1 ? "s" : ""} lors de la validation du formulaire.`}
				</p>
			)}

			{images.length > 0 && pendingCount === 0 && emptyHelperText && (
				<p className="text-xs text-[#3a3a3a]">✦ {emptyHelperText}</p>
			)}

			<input
				ref={fileInputRef}
				type="file"
				accept={accept}
				multiple={maxImages > 1}
				className="hidden"
				onChange={handleFileChange}
			/>
		</div>
	);
}
