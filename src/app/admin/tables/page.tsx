import { prisma } from "@/lib/prisma";
import { LayoutGrid } from "lucide-react";
import Link from "next/link";
import TablesClient from "@/components/admin/tables-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Gestion des tables — Spoon Admin" };

export default async function TablesPage() {
	const tables = await prisma.table.findMany({
		include: {
			_count: { select: { reservations: true } },
		},
		orderBy: [{ zone: "asc" }, { numero: "asc" }],
	});

	return (
		<div>
			<div className="flex items-center justify-between mb-6">
				<div>
					<h1 className="font-display text-3xl text-[#F5F0EB]">
						Tables
					</h1>
					<p className="text-sm text-[#5A5249] mt-0.5">
						Configurez les tables physiques de votre restaurant
					</p>
				</div>
				<Link
					href="/admin/reservations/plan"
					className="flex items-center gap-2 text-sm text-[#C8973A] hover:underline"
				>
					<LayoutGrid size={15} />
					Voir le plan de salle
				</Link>
			</div>

			<TablesClient initialTables={tables as any} />
		</div>
	);
}
