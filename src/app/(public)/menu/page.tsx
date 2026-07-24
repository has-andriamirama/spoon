import { prisma } from "@/lib/prisma";
import MenuClientPage from "./menu-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "La Carte" };

export default async function MenuPage() {
  const [categories, dishes] = await Promise.all([
    prisma.menuCategory.findMany({ where: { isActive: true }, orderBy: { order: "asc" } }),
    prisma.dish.findMany({
      where: { isAvailable: true },
      include: { category: true },
      orderBy: [{ category: { order: "asc" } }, { order: "asc" }],
    }),
  ]);

  return <MenuClientPage categories={categories} dishes={dishes} />;
}
