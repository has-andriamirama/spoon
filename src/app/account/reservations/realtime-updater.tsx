"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getPusherClient } from "@/lib/pusher-client";

export default function AccountReservationsRealtimeUpdater({ userId }: { userId: string }) {
	const router = useRouter();

	useEffect(() => {
		const pusher = getPusherClient();
		const channelName = `user-${userId}`;
		const channel = pusher.subscribe(channelName);

		channel.bind("reservation-updated", () => {
			router.refresh();
		});

		return () => {
			channel.unbind_all();
			pusher.unsubscribe(channelName);
		};
	}, [router, userId]);

	return null;
}
