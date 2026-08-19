import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";

export async function createAdminNotification(data: {
	type: string;
	title: string;
	message: string;
	link?: string;
}): Promise<void> {
	try {
		const notification = await prisma.adminNotification.create({ data });
		await pusherServer.trigger("admin-notifications", "new-notification", {
			id: notification.id,
			type: notification.type,
			title: notification.title,
			message: notification.message,
			link: notification.link,
			createdAt: notification.createdAt,
		});
	} catch (err) {
		console.error("[Pusher] createAdminNotification:", err);
	}
}

export async function broadcastReservationUpdate(
	reservationId: string,
	userId?: string | null
): Promise<void> {
	try {
		const payload = { reservationId, ts: Date.now() };
		await pusherServer.trigger("admin-reservations", "reservation-updated", payload);
		if (userId) {
			await pusherServer.trigger(`user-${userId}`, "reservation-updated", payload);
		}
	} catch (err) {
		console.error("[Pusher] broadcastReservationUpdate:", err);
	}
}

export async function broadcastTableUpdate(
	tableId: string,
	action: "blocked" | "unblocked" | "updated"
): Promise<void> {
	try {
		await pusherServer.trigger("admin-reservations", "table-updated", {
			tableId,
			action,
			ts: Date.now(),
		});
	} catch (err) {
		console.error("[Pusher] broadcastTableUpdate:", err);
	}
}
