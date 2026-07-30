import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import DishForm from "./dish-form";

export const dynamic = "force-dynamic";

export default async function AdminDishPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const categories = await prisma.menuCategory.findMany({ where: { isActive: true }, orderBy: { order: "asc" } });
  const dish = id === "new" ? null : await prisma.dish.findUnique({ where: { id } });
  if (id !== "new" && !dish) notFound();
  return (
    <div>
      <h1 className="font-display text-3xl text-[#F5F0EB] mb-8">{dish ? "Modifier le plat" : "Nouveau plat"}</h1>
      <DishForm dish={dish} categories={categories} />
    </div>
  );
}
