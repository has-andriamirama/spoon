import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import TableDetailClient from "./table-detail-client";

export const dynamic = "force-dynamic";

export default async function AdminTablePage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;

	const table =
		id === "new"
			? null
			: await prisma.table.findUnique({ where: { id } });

	if (id !== "new" && !table) notFound();

	return <TableDetailClient table={table} isNew={id === "new"} />;
}
