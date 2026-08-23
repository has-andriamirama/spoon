import { prisma } from "@/lib/prisma";
import TablesClient from "./tables-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tables — Spoon Admin" };

export default async function TablesPage() {
	const tables = await prisma.table.findMany({
		include: {
			_count: { select: { reservations: true } },
		},
		orderBy: [{ zone: "asc" }, { numero: "asc" }],
	});

	return <TablesClient initialTables={tables as any} />;
}
