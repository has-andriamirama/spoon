"use client";
import { useEffect } from "react";
import { getPusherClient } from "@/lib/pusher-client";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

export function useAdminNotifications() {
	const queryClient = useQueryClient();

	useEffect(() => {
		const pusher = getPusherClient();
		const channel = pusher.subscribe("admin-notifications");

		channel.bind("new-notification", (data: { title: string }) => {
			toast(data.title, { icon: "🔔", duration: 5000 });
			queryClient.invalidateQueries({ queryKey: ["reservations"] });
			queryClient.invalidateQueries({ queryKey: ["stats"] });
		});

		return () => {
			channel.unbind_all();
			pusher.unsubscribe("admin-notifications");
		};
	}, [queryClient]);
}
