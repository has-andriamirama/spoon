"use client";

import { useState } from "react";
import Image from "next/image";
import { Flame, Image as ImageIcon, Leaf, Wheat } from "lucide-react";
import { cn, formatPrice } from "@/lib/utils";
import type { MenuCategory, Dish, Image as DishImage } from "@/types";
import { ALLERGENS, DIETARY_TAGS } from "@/lib/constants";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { DishImageSlider } from "@/components/menu/dish-image-slider";

type DishWithImages = Dish & {
	category: MenuCategory;
	images: DishImage[];
};

interface Props {
	categories: MenuCategory[];
	dishes: DishWithImages[];
}

export default function MenuClientPage({ categories, dishes }: Props) {
	const [activeCategory, setActiveCategory] = useState<string>("all");
	const [activeDietary, setActiveDietary] = useState<string[]>([]);
	const [selectedDish, setSelectedDish] = useState<DishWithImages | null>(null);

	const filtered = dishes.filter((d) => {
		const catMatch   = activeCategory === "all" || d.categoryId === activeCategory;
		const dietMatch  = activeDietary.length === 0 || activeDietary.every((tag) => d.dietaryTags.includes(tag));
		return catMatch && dietMatch;
	});

	const toggleDietary = (tag: string) =>
		setActiveDietary((prev) =>
			prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
		);

	const getPrimaryImageUrl = (dish: DishWithImages): string | null => {
		const primary = dish.images.find((img) => img.isPrimary) ?? dish.images[0];
		return primary?.url ?? dish.imageUrl ?? null;
	};

	return (
		<div className="min-h-screen pt-24 pb-20">

			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
				<p className="text-[#C8973A] text-sm font-medium uppercase tracking-widest mb-3">
					Gastronomie créole
				</p>
				<h1 className="font-display text-5xl text-[#F5F0EB] mb-4">La Carte</h1>
				<p className="text-[#9A8F84] max-w-lg">
					Des saveurs authentiques de l&apos;île, revisitées avec créativité et passion.
				</p>
			</div>

			<div className="sticky top-16 lg:top-20 z-30 bg-[#0A0A0A]/90 backdrop-blur-sm border-b border-[#222] mb-10">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
					<div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide mb-3">
						<button
							onClick={() => setActiveCategory("all")}
							className={cn(
								"shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors",
								activeCategory === "all"
									? "bg-[#C8973A] text-[#0A0A0A]"
									: "bg-[#141414] text-[#9A8F84] hover:text-[#F5F0EB] border border-[#222]"
							)}
						>
							Tout
						</button>
						{categories.map((cat) => (
							<button
								key={cat.id}
								onClick={() => setActiveCategory(cat.id)}
								className={cn(
									"shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors",
									activeCategory === cat.id
										? "bg-[#C8973A] text-[#0A0A0A]"
										: "bg-[#141414] text-[#9A8F84] hover:text-[#F5F0EB] border border-[#222]"
								)}
							>
								{cat.name}
							</button>
						))}
					</div>

					<div className="flex items-center gap-2 flex-wrap">
						<span className="text-xs text-[#5A5249]">Filtres :</span>
						{DIETARY_TAGS.slice(0, 3).map((tag) => (
							<button
								key={tag.id}
								onClick={() => toggleDietary(tag.id)}
								className={cn(
									"flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors border",
									activeDietary.includes(tag.id)
										? "bg-[#C8973A]/20 border-[#C8973A]/50 text-[#C8973A]"
										: "bg-[#141414] border-[#222] text-[#5A5249] hover:text-[#9A8F84]"
								)}
							>
								{tag.id === "vegetarian" && <Leaf size={11} />}
								{tag.id === "gluten-free" && <Wheat size={11} />}
								{tag.label}
							</button>
						))}
					</div>
				</div>
			</div>

			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				{filtered.length === 0 ? (
					<div className="text-center py-20 text-[#5A5249]">
						<p className="text-lg mb-2">Aucun plat trouvé</p>
						<p className="text-sm">Essayez de modifier vos filtres.</p>
					</div>
				) : (
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
						{filtered.map((dish) => {
							const primaryUrl = getPrimaryImageUrl(dish);
							const imageCount = dish.images.length;

							return (
								<button
									key={dish.id}
									onClick={() => setSelectedDish(dish)}
									className="group text-left bg-[#141414] border border-[#222] rounded-xl overflow-hidden hover:border-[#C8973A]/30 transition-all hover:shadow-lg hover:shadow-[#C8973A]/5 active:scale-[0.98]"
								>
									<div className="aspect-[4/3] relative overflow-hidden bg-[#1a1a1a]">
										{primaryUrl ? (
											<Image
												src={primaryUrl}
												alt={dish.name}
												fill
												sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
												className="object-cover group-hover:scale-105 transition-transform duration-500"
											/>
										) : (
											<div className="absolute inset-0 flex items-center justify-center text-[#333]">
												<Flame size={40} />
											</div>
										)}

										{dish.isDailySpecial && (
											<div className="absolute top-2 left-2">
												<span className="bg-[#C8973A] text-[#0A0A0A] text-xs font-bold px-2 py-0.5 rounded-full">
													✦ Spécialité
												</span>
											</div>
										)}

										{imageCount > 1 && (
											<div className="absolute bottom-2 right-2">
												<span className="bg-black/60 backdrop-blur-sm text-white text-[10px] font-medium px-2 py-0.5 rounded-full">
													{imageCount}
												</span>
											</div>
										)}
									</div>

									<div className="p-4">
										<div className="flex items-start justify-between gap-2 mb-1">
											<h3 className="font-display text-base text-[#F5F0EB] font-semibold leading-tight">
												{dish.name}
											</h3>
											<span className="text-[#C8973A] font-semibold text-sm shrink-0">
												{formatPrice(dish.price)}
											</span>
										</div>
										<p className="text-xs text-[#9A8F84] leading-relaxed line-clamp-2 mb-3">
											{dish.description}
										</p>
										<div className="flex items-center gap-1.5 flex-wrap">
											{dish.dietaryTags.slice(0, 2).map((tag) => {
												const t = DIETARY_TAGS.find((dt) => dt.id === tag);
												return t ? (
													<Badge key={tag} variant="gold" className="text-[10px]">
														{t.label}
													</Badge>
												) : null;
											})}
											{dish.allergens.length > 0 && (
												<span className="text-[10px] text-[#5A5249]">
													{dish.allergens.length} allergène{dish.allergens.length > 1 ? "s" : ""}
												</span>
											)}
										</div>
									</div>
								</button>
							);
						})}
					</div>
				)}
			</div>

			{selectedDish && (
				<Modal
					open={!!selectedDish}
					onClose={() => setSelectedDish(null)}
					title={selectedDish.name}
					description={selectedDish.category.name}
					className="max-w-xl"
				>
					{selectedDish.images.length > 0 ? (
						<DishImageSlider
							images={selectedDish.images.map((img) => ({
								id: img.id,
								url: img.url,
								alt: img.alt,
							}))}
							dishName={selectedDish.name}
						/>
					) : selectedDish.imageUrl ? (
						<div className="aspect-video relative rounded-lg overflow-hidden mb-4 -mt-2">
							<Image
								src={selectedDish.imageUrl}
								alt={selectedDish.name}
								fill
								className="object-cover"
							/>
						</div>
					) : null}

					<p className="text-[#9A8F84] text-sm leading-relaxed mb-4">
						{selectedDish.description}
					</p>

					<div className="flex items-center justify-between mb-4">
						<span className="text-[#C8973A] text-2xl font-display font-semibold">
							{formatPrice(selectedDish.price)}
						</span>
						{selectedDish.isDailySpecial && <Badge variant="gold">✦ Suggestion du chef</Badge>}
					</div>

					{selectedDish.dietaryTags.length > 0 && (
						<div className="mb-4">
							<p className="text-xs text-[#5A5249] uppercase tracking-wider mb-2">Régimes</p>
							<div className="flex flex-wrap gap-2">
								{selectedDish.dietaryTags.map((tag) => {
									const t = DIETARY_TAGS.find((dt) => dt.id === tag);
									return t ? (
										<Badge key={tag} variant="green">
											{t.label}
										</Badge>
									) : null;
								})}
							</div>
						</div>
					)}

					{selectedDish.allergens.length > 0 && (
						<div>
							<p className="text-xs text-[#5A5249] uppercase tracking-wider mb-2">Allergènes</p>
							<div className="flex flex-wrap gap-2">
								{selectedDish.allergens.map((a) => {
									const allergen = ALLERGENS.find((al) => al.id === a);
									return allergen ? (
										<Badge key={a} variant="yellow">
											{allergen.label}
										</Badge>
									) : null;
								})}
							</div>
						</div>
					)}
				</Modal>
			)}
		</div>
	);
}
