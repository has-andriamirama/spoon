"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import { Plus, Trash2, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { GALLERY_CATEGORIES } from "@/lib/constants";
import type { GalleryImage } from "@/types";
import toast from "react-hot-toast";

export default function AdminGalleryPage() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [category, setCategory] = useState<string>("DISHES");

  useEffect(() => { fetch("/api/gallery").then(r => r.json()).then(d => setImages(d.data || [])); }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    try {
      // Get Cloudinary signature
      const sigRes = await fetch("/api/upload");
      const { signature, timestamp, cloudName, apiKey } = await sigRes.json();
      // Upload to Cloudinary
      const fd = new FormData();
      fd.append("file", file);
      fd.append("signature", signature);
      fd.append("timestamp", timestamp);
      fd.append("api_key", apiKey);
      fd.append("folder", "spoon/gallery");
      const upRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: "POST", body: fd });
      const up = await upRes.json();
      // Save to DB
      const res = await fetch("/api/gallery", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imageUrl: up.secure_url, publicId: up.public_id, category }) });
      const data = await res.json();
      setImages(p => [data.data, ...p]);
      toast.success("Image ajoutée !");
    } catch { toast.error("Erreur lors de l'upload."); }
    finally { setUploading(false); e.target.value = ""; }
  };

  const handleDelete = async (img: GalleryImage) => {
    if (!confirm("Supprimer cette image ?")) return;
    await fetch(`/api/gallery/${img.id}`, { method: "DELETE" });
    setImages(p => p.filter(i => i.id !== img.id));
    toast.success("Image supprimée");
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-3xl text-[#F5F0EB]">Galerie</h1>
        <div className="flex items-center gap-3">
          <Select value={category} onChange={e => setCategory(e.target.value)} options={GALLERY_CATEGORIES.map(c => ({ value: c.id, label: c.label }))} className="w-40" />
          <label className={`inline-flex items-center gap-2 bg-[#C8973A] hover:bg-[#E8B04A] text-[#0A0A0A] font-semibold text-sm px-4 py-2 rounded-lg transition-colors cursor-pointer ${uploading ? "opacity-60 pointer-events-none" : ""}`}>
            <Plus size={16} /> {uploading ? "Envoi…" : "Ajouter"}
            <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>
        </div>
      </div>
      {images.length === 0 ? (
        <div className="bg-[#141414] border border-[#222] rounded-xl py-20 text-center"><ImageIcon size={48} className="text-[#333] mx-auto mb-4" /><p className="text-[#5A5249]">Aucune image. Ajoutez vos premières photos !</p></div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {images.map(img => (
            <div key={img.id} className="group relative aspect-square bg-[#141414] rounded-xl overflow-hidden border border-[#222]">
              <Image src={img.imageUrl} alt={img.caption || ""} fill className="object-cover" />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs text-white/70">{GALLERY_CATEGORIES.find(c => c.id === img.category)?.label}</span>
                  <button onClick={() => handleDelete(img)} className="p-1.5 bg-red-500/20 hover:bg-red-500/40 rounded-lg transition-colors"><Trash2 size={14} className="text-red-400" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
