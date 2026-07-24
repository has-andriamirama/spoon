import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Cancel reservations with PENDING payment older than 30 minutes (payment not completed)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const stalePayments = await prisma.payment.findMany({
      where: { status: "PENDING", createdAt: { lt: thirtyMinutesAgo } },
      select: { reservationId: true },
    });
    let cleaned = 0;
    for (const p of stalePayments) {
      await prisma.payment.update({ where: { reservationId: p.reservationId }, data: { status: "FAILED" } });
      cleaned++;
    }
    return NextResponse.json({ success: true, cleaned });
  } catch (error) {
    console.error("Cron error:", error);
    return NextResponse.json({ error: "Erreur cron" }, { status: 500 });
  }
}
