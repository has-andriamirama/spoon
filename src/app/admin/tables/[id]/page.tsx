import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import TableForm from "../table-form";

export const dynamic = "force-dynamic";

export default async function AdminTableDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const table = id === "new" ? null : await prisma.restaurantTable.findUnique({ where: { id } });
  if (id !== "new" && !table) notFound();
  return <div>
    <div className="flex items-center gap-3 mb-8">
      <Link href="/admin/tables" className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-[#222] bg-[#141414] text-[#9A8F84] hover:text-[#F5F0EB] hover:border-[#C8973A]/40 transition-colors"><ArrowLeft size={17} /></Link>
      <h1 className="font-display text-3xl text-[#F5F0EB]">{table ? `Modifier la table ${table.number}` : "Nouvelle table"}</h1>
    </div>
    <TableForm table={table} />
  </div>;
}
