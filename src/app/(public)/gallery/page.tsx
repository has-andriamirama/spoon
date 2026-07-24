import { prisma } from "@/lib/prisma";
import GalleryClientPage from "./gallery-client";
export const dynamic = "force-dynamic";
export const metadata = { title: "Galerie" };
export default async function GalleryPage() {
  const images = await prisma.galleryImage.findMany({ where: { isActive: true }, orderBy: { order: "asc" } });
  return <GalleryClientPage images={images} />;
}
