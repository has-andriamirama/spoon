import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfDay } from "date-fns";

export async function GET() {
  try {
    const today = startOfDay(new Date());
    const result = await prisma.reservation.updateMany({
      where: { date: { lt: today }, status: "CONFIRMED" },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
    return NextResponse.json({ success: true, updated: result.count });
  } catch (error) {
    console.error("Cron error:", error);
    return NextResponse.json({ error: "Erreur cron" }, { status: 500 });
  }
}
