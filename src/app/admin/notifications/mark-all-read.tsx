"use client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function MarkAllReadButton() {
	const router = useRouter();
	const handle = async () => {
		await fetch("/api/notifications", { method: "PATCH" });
		toast.success("Toutes les notifications lues");
		router.refresh();
	};
	return <Button variant="secondary" size="sm" onClick={handle}>Tout marquer comme lu</Button>;
}
