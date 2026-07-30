import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
	const { searchParams } = new URL(request.url);
	const unread = searchParams.get("unread") === "true";
	if (unread) {
		const count = await prisma.adminNotification.count({ where: { isRead: false } });
		return NextResponse.json({ data: { count } });
	}
	const notifications = await prisma.adminNotification.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
	return NextResponse.json({ data: notifications });
}

export async function PATCH() {
	await prisma.adminNotification.updateMany({ where: { isRead: false }, data: { isRead: true } });
	return NextResponse.json({ message: "Notifications marquées comme lues" });
}
