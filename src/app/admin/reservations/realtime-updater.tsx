"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getPusherClient } from "@/lib/pusher-client";

export default function AdminReservationsRealtimeUpdater() {
	const router = useRouter();

	useEffect(() => {
		const pusher = getPusherClient();
		const channel = pusher.subscribe("admin-reservations");

		channel.bind("reservation-updated", () => {
			router.refresh();
		});

		return () => {
			channel.unbind_all();
			pusher.unsubscribe("admin-reservations");
		};
	}, [router]);

	return null;
}
