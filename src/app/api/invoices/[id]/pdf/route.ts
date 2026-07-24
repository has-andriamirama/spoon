import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const invoice = await prisma.invoice.findUnique({ where: { id: params.id } });
  if (!invoice) return NextResponse.json({ error: "Facture introuvable" }, { status: 404 });
  if (!invoice.pdfUrl) return NextResponse.json({ error: "PDF non disponible" }, { status: 404 });
  return NextResponse.redirect(invoice.pdfUrl);
}
