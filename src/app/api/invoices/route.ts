import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
	try {
		const session = await getServerSession(authOptions);
		const userId = (session?.user as any)?.id;
		const invoices = await prisma.invoice.findMany({
			where: userId ? { userId } : {},
			orderBy: { issuedAt: "desc" },
		});
		return NextResponse.json({ data: invoices });
	} catch {
		return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
	}
}
