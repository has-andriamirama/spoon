"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ImageUploader } from "@/components/admin/image-uploader";
import { uploadFileToCDN, deleteFromCDN } from "@/lib/client/cloudinary-upload";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/utils";
import type { ImageInput } from "@/types";

const LOGO_UPLOAD_FOLDER = "spoon/settings/logo";

export default function AdminSettingsGeneralPage() {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [form, setForm] = useState({
    name: "",
    tagline: "",
    description: "",
    phone: "",
    email: "",
    address: "",
    googleMapsUrl: "",
    facebookUrl: "",
    instagramUrl: "",
    depositRequired: true,
    depositAmountPerCover: 10,
    freeCancellationHours: 24,
    maxCoversPerSlot: 40,
    minBookingNoticeHours: 2,
    maxBookingAdvanceDays: 60,
    autoConfirmReservations: false
  });
  const [logoPublicId, setLogoPublicId] = useState("");
  const [logoImages, setLogoImages] = useState<ImageInput[]>([]);

  useEffect(() => {
    fetch("/api/settings").then(r => r.json()).then(d => {
      if (d.data) {
        setForm(d.data);
        setLogoPublicId(d.data.logoPublicId || "");
        if (d.data.logoUrl) {
          setLogoImages([{ url: d.data.logoUrl, publicId: d.data.logoPublicId || "", isPrimary: true, order: 0 }]);
        }
      }
    }).finally(() => setFetching(false));
  }, []);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm(previous => ({ ...previous, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);

    let uploadedPublicId: string | null = null;

    try {
      let logoUrl: string | null = logoImages[0]?.url ?? null;
      let nextLogoPublicId: string | null = logoImages[0]?.publicId || null;

      const pendingLogo = logoImages[0]?.file;
      if (pendingLogo) {
        toast.loading("Upload du logo…", { id: "logo-upload-toast" });
        const result = await uploadFileToCDN(pendingLogo, LOGO_UPLOAD_FOLDER);
        toast.dismiss("logo-upload-toast");
        if (!result) throw new Error("Échec de l'upload du logo.");
        uploadedPublicId = result.publicId;
        logoUrl = result.url;
        nextLogoPublicId = result.publicId;
      } else if (logoImages.length === 0) {
        logoUrl = null;
        nextLogoPublicId = null;
      }

      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, logoUrl, logoPublicId: nextLogoPublicId }),
      });
      if (!res.ok) throw new Error();

      if (logoPublicId && logoPublicId !== nextLogoPublicId) {
        await deleteFromCDN(logoPublicId);
      }
      setLogoPublicId(nextLogoPublicId || "");

      toast.success("Paramètres enregistrés !");
    } catch (error) {
      if (uploadedPublicId) await deleteFromCDN(uploadedPublicId);
      toast.error(getErrorMessage(error, "Erreur lors de la sauvegarde."));
    }
    finally { setLoading(false); }
  };

  if (fetching) return <div className="animate-pulse space-y-4">{[...Array(6)].map((_, i) => <div key={i} className="h-10 bg-[#222] rounded-lg" />)}</div>;

  return (
    <div>
      <h1 className="font-display text-3xl text-[#F5F0EB] mb-8">Paramètres généraux</h1>
      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        <div className="bg-[#141414] border border-[#222] rounded-xl p-6 space-y-4">
          <h2 className="font-display text-xl text-[#F5F0EB]">Identité du restaurant</h2>
          <ImageUploader
            images={logoImages}
            onChange={setLogoImages}
            maxImages={1}
            allowPrimary={false}
            label="Logo"
            emptyText="Aucun logo — cliquez sur « + » pour en ajouter"
            emptyHelperText="Utilisé sur les factures et additions (variable {{logoUrl}})."
          />
          <Input label="Nom" value={form.name} onChange={e => set("name", e.target.value)} />
          <Input label="Accroche" value={form.tagline || ""} onChange={e => set("tagline", e.target.value)} placeholder="La cuisine créole élevée au rang d'art" />
          <Textarea label="Description" value={form.description || ""} onChange={e => set("description", e.target.value)} rows={3} />
          <Input label="Téléphone" type="tel" value={form.phone || ""} onChange={e => set("phone", e.target.value)} />
          <Input label="Email" type="email" value={form.email || ""} onChange={e => set("email", e.target.value)} />
          <Textarea label="Adresse" value={form.address || ""} onChange={e => set("address", e.target.value)} rows={2} />
          <Input label="URL Google Maps" value={form.googleMapsUrl || ""} onChange={e => set("googleMapsUrl", e.target.value)} />
          <Input label="URL Facebook" value={form.facebookUrl || ""} onChange={e => set("facebookUrl", e.target.value)} />
          <Input label="URL Instagram" value={form.instagramUrl || ""} onChange={e => set("instagramUrl", e.target.value)} />
        </div>

        <div className="bg-[#141414] border border-[#222] rounded-xl p-6 space-y-4">
          <h2 className="font-display text-xl text-[#F5F0EB]">Règles de réservation</h2>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Max couverts / créneau" type="number" min="1" value={form.maxCoversPerSlot} onChange={e => set("maxCoversPerSlot", parseInt(e.target.value))} />
            <Input label="Délai min. réservation (h)" type="number" min="0" value={form.minBookingNoticeHours} onChange={e => set("minBookingNoticeHours", parseInt(e.target.value))} />
            <Input label="Réservation max à l'avance (j)" type="number" min="1" value={form.maxBookingAdvanceDays} onChange={e => set("maxBookingAdvanceDays", parseInt(e.target.value))} />
            <Input label="Annulation gratuite jusqu'à (h)" type="number" min="0" value={form.freeCancellationHours} onChange={e => set("freeCancellationHours", parseInt(e.target.value))} />
          </div>
          <div className="space-y-3 pt-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={form.depositRequired} onChange={e => set("depositRequired", e.target.checked)} className="w-4 h-4 accent-[#C8973A]" />
              <span className="text-sm text-[#F5F0EB]">Acompte requis à la réservation</span>
            </label>
            {form.depositRequired && <Input label="Montant acompte / couvert (€)" type="number" step="0.01" min="0" value={form.depositAmountPerCover} onChange={e => set("depositAmountPerCover", parseFloat(e.target.value))} className="max-w-xs" />}
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={form.autoConfirmReservations} onChange={e => set("autoConfirmReservations", e.target.checked)} className="w-4 h-4 accent-[#C8973A]" />
              <span className="text-sm text-[#F5F0EB]">Confirmation automatique des réservations</span>
            </label>
          </div>
        </div>

        <Button type="submit" loading={loading} size="lg">Enregistrer les paramètres</Button>
      </form>
    </div>
  );
}
