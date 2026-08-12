import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";

export async function createAdminNotification(data: {
	type: string;
	title: string;
	message: string;
	link?: string;
}): Promise<void> {
	const notification = await prisma.adminNotification.create({ data });

	// Push real-time via Pusher
	await pusherServer.trigger("admin-notifications", "new-notification", {
		id: notification.id,
		type: notification.type,
		title: notification.title,
		message: notification.message,
		link: notification.link,
		createdAt: notification.createdAt,
	});
}
