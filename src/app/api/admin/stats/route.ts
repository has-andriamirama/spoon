import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay, startOfMonth, endOfMonth } from "date-fns";

export async function GET() {
	try {
		const today = new Date();
		const [todayRes, pendingCount, monthRevenue, totalCustomers] = await Promise.all([
			prisma.reservation.findMany({
				where: {
					date: { gte: startOfDay(today), lte: endOfDay(today) },
					status: { in: ["PENDING","CONFIRMED"] }
				},
				select: { covers: true, status: true }
			}),
			prisma.reservation.count({ where: { status: "PENDING" } }),
			prisma.payment.aggregate({
				where: {
					status: "PAID",
					paidAt: { gte: startOfMonth(today), lte: endOfMonth(today) }
				},
				_sum: { amount: true } 
			}),
			prisma.user.count({ where: { isActive: true } }),
		]);
		return NextResponse.json({
			data: {
				todayReservations: todayRes.length,
				todayCovers: todayRes.reduce((s, r) => s + r.covers, 0),
				pendingReservations: pendingCount,
				monthRevenue: monthRevenue._sum.amount || 0,
				totalCustomers
			}
		});
	} catch { return NextResponse.json({ error: "Erreur interne" }, { status: 500 }); }
}
