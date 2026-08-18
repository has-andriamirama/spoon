"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface SliderImage {
	id: string;
	url: string;
	alt?: string | null;
}

interface Props {
	images: SliderImage[];
	dishName: string;
	className?: string;
}

export function DishImageSlider({ images, dishName, className }: Props) {
	const [current, setCurrent] = useState(0);
	const touchStartX = useRef<number | null>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	const total = images.length;

	const prev = useCallback(() => {
		setCurrent((c) => (c - 1 + total) % total);
	}, [total]);

	const next = useCallback(() => {
		setCurrent((c) => (c + 1) % total);
	}, [total]);

	useEffect(() => {
		if (total <= 1) return;
		const handler = (e: KeyboardEvent) => {
			if (e.key === "ArrowLeft") prev();
			if (e.key === "ArrowRight") next();
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [total, prev, next]);

	if (total === 0) return null;

	if (total === 1) {
		return (
			<div className={cn("aspect-video relative rounded-lg overflow-hidden mb-4 -mt-2", className)}>
				<Image
					src={images[0].url}
					alt={images[0].alt || dishName}
					fill
					sizes="(max-width: 640px) 100vw, 512px"
					className="object-cover"
					priority
				/>
			</div>
		);
	}

	const handleTouchStart = (e: React.TouchEvent) => {
		touchStartX.current = e.targetTouches[0].clientX;
	};

	const handleTouchEnd = (e: React.TouchEvent) => {
		if (touchStartX.current === null) return;
		const diff = touchStartX.current - e.changedTouches[0].clientX;
		if (Math.abs(diff) > 40) {
			diff > 0 ? next() : prev();
		}
		touchStartX.current = null;
	};

	return (
		<div className={cn("mb-4 -mt-2", className)} ref={containerRef}>
			<div
				className="aspect-video relative rounded-lg overflow-hidden select-none"
				onTouchStart={handleTouchStart}
				onTouchEnd={handleTouchEnd}
			>
				<div
					className="flex h-full transition-transform duration-500 ease-[cubic-bezier(.25,.46,.45,.94)]"
					style={{
						width: `${total * 100}%`,
						transform: `translateX(-${(current / total) * 100}%)`,
					}}
				>
					{images.map((img, idx) => (
						<div
							key={img.id}
							className="relative h-full shrink-0"
							style={{ width: `${100 / total}%` }}
						>
							<Image
								src={img.url}
								alt={img.alt || `${dishName} — photo ${idx + 1}`}
								fill
								sizes="(max-width: 640px) 100vw, 512px"
								className="object-cover"
								priority={idx === 0}
							/>
						</div>
					))}
				</div>

				<button
					type="button"
					onClick={prev}
					aria-label="Image précédente"
					className={cn(
						"absolute left-2 top-1/2 -translate-y-1/2 z-10",
						"w-8 h-8 rounded-full flex items-center justify-center",
						"bg-black/50 hover:bg-black/75 text-white",
						"transition-colors backdrop-blur-sm"
					)}
				>
					<ChevronLeft size={18} strokeWidth={2.5} />
				</button>

				<button
					type="button"
					onClick={next}
					aria-label="Image suivante"
					className={cn(
						"absolute right-2 top-1/2 -translate-y-1/2 z-10",
						"w-8 h-8 rounded-full flex items-center justify-center",
						"bg-black/50 hover:bg-black/75 text-white",
						"transition-colors backdrop-blur-sm"
					)}
				>
					<ChevronRight size={18} strokeWidth={2.5} />
				</button>

				<div className="absolute top-2.5 right-2.5 z-10 bg-black/60 backdrop-blur-sm text-white text-xs font-medium px-2 py-0.5 rounded-full">
					{current + 1} / {total}
				</div>
			</div>

			<div className="flex items-center justify-center gap-1.5 mt-2.5">
				{images.map((_, idx) => (
					<button
						key={idx}
						type="button"
						onClick={() => setCurrent(idx)}
						aria-label={`Aller à l'image ${idx + 1}`}
						className={cn(
							"rounded-full transition-all duration-300",
							idx === current
								? "w-5 h-1.5 bg-[#C8973A]"
								: "w-1.5 h-1.5 bg-[#3a3a3a] hover:bg-[#666]"
						)}
					/>
				))}
			</div>
		</div>
	);
}
