import { useState, useEffect } from "react";
import type { TimeSlot } from "@/types";

export function useAvailability(date: string | null) {
	const [slots, setSlots] = useState<TimeSlot[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!date) { setSlots([]); return; }
		setLoading(true);
		setError(null);
		fetch(`/api/reservations/availability?date=${date}`)
			.then(r => r.json())
			.then(d => setSlots(d.data || []))
			.catch(() => setError("Impossible de charger les disponibilités"))
			.finally(() => setLoading(false));
	}, [date]);

	return { slots, loading, error };
}
