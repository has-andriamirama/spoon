"use client";
import { useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { GALLERY_CATEGORIES } from "@/lib/constants";
import type { GalleryImage } from "@/types";

const PLACEHOLDER_IMAGES = [
  { id: "1", imageUrl: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=80", caption: "Notre salle principale", category: "DINING_ROOM" as const },
  { id: "2", imageUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&q=80", caption: "Cari poulet boucané", category: "DISHES" as const },
  { id: "3", imageUrl: "https://images.unsplash.com/photo-1600891964092-4316c288032e?w=600&q=80", caption: "Préparation en cuisine", category: "DISHES" as const },
  { id: "4", imageUrl: "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=600&q=80", caption: "Soirée événementielle", category: "EVENTS" as const },
  { id: "5", imageUrl: "https://images.unsplash.com/photo-1547573854-74d2a71d0826?w=600&q=80", caption: "Notre équipe", category: "TEAM" as const },
  { id: "6", imageUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80", caption: "Desserts créoles", category: "DISHES" as const },
];

export default function GalleryClientPage({ images }: { images: GalleryImage[] }) {
  const displayImages = images.length > 0 ? images : PLACEHOLDER_IMAGES;
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [lightbox, setLightbox] = useState<string | null>(null);

  const filtered = activeCategory === "all" ? displayImages : displayImages.filter(i => i.category === activeCategory);

  return (
    <div className="min-h-screen pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-10">
        <p className="text-[#C8973A] text-sm font-medium uppercase tracking-widest mb-3">Galerie</p>
        <h1 className="font-display text-5xl text-[#F5F0EB] mb-4">En images</h1>
        <div className="flex items-center gap-2 flex-wrap mt-6">
          <button onClick={() => setActiveCategory("all")} className={cn("px-4 py-2 rounded-full text-sm font-medium transition-colors", activeCategory === "all" ? "bg-[#C8973A] text-[#0A0A0A]" : "bg-[#141414] text-[#9A8F84] border border-[#222] hover:text-[#F5F0EB]")}>Tout</button>
          {GALLERY_CATEGORIES.map(cat => (
            <button key={cat.id} onClick={() => setActiveCategory(cat.id)} className={cn("px-4 py-2 rounded-full text-sm font-medium transition-colors", activeCategory === cat.id ? "bg-[#C8973A] text-[#0A0A0A]" : "bg-[#141414] text-[#9A8F84] border border-[#222] hover:text-[#F5F0EB]")}>{cat.label}</button>
          ))}
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
          {filtered.map(img => (
            <button key={img.id} onClick={() => setLightbox(img.imageUrl)} className="block w-full break-inside-avoid rounded-xl overflow-hidden group relative">
              <Image src={img.imageUrl} alt={img.caption || ""} width={600} height={400} className="w-full object-cover group-hover:scale-105 transition-transform duration-500" />
              {img.caption && (
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                  <p className="text-white text-sm font-medium">{img.caption}</p>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <button className="absolute top-4 right-4 text-white/70 hover:text-white z-10"><X size={28} /></button>
          <div className="max-w-4xl max-h-[90vh] relative" onClick={e => e.stopPropagation()}>
            <Image src={lightbox} alt="Galerie" width={1200} height={800} className="max-h-[90vh] w-auto object-contain rounded-lg" />
          </div>
        </div>
      )}
    </div>
  );
}
