"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { DAYS_OF_WEEK } from "@/lib/constants";
import toast from "react-hot-toast";
import { Plus, Trash2 } from "lucide-react";

type Slot = { time: string; maxCovers: number };
type DaySchedule = { id?: string; dayOfWeek: number; isOpen: boolean; slots: Slot[] };

export default function AdminScheduleHoursPage() {
	const [schedule, setSchedule] = useState<DaySchedule[]>(
		Array.from({ length: 7 }, (_, i) => ({ dayOfWeek: i, isOpen: i !== 0, slots: [] }))
	);
	const [loading, setLoading] = useState(false);
	const [fetching, setFetching] = useState(true);

	useEffect(() => {
		fetch("/api/schedule/hours").then(r => r.json()).then(d => { if (d.data?.length) setSchedule(d.data); }).finally(() => setFetching(false));
	}, []);

	const toggleDay = (idx: number) => setSchedule(s => s.map((d, i) => i === idx ? { ...d, isOpen: !d.isOpen } : d));

	const addSlot = (dayIdx: number) => setSchedule(s => s.map((d, i) => i === dayIdx ? { ...d, slots: [...d.slots, { time: "12:00", maxCovers: 40 }] } : d));

	const removeSlot = (dayIdx: number, slotIdx: number) => setSchedule(s => s.map((d, i) => i === dayIdx ? { ...d, slots: d.slots.filter((_, j) => j !== slotIdx) } : d));

	const updateSlot = (dayIdx: number, slotIdx: number, key: keyof Slot, value: string | number) =>
		setSchedule(s => s.map((d, i) => i === dayIdx ? { ...d, slots: d.slots.map((sl, j) => j === slotIdx ? { ...sl, [key]: value } : sl) } : d));

	const handleSave = async () => {
		setLoading(true);
		try {
			const res = await fetch("/api/schedule/hours", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ schedule }) });
			if (!res.ok) throw new Error();
			toast.success("Horaires enregistrés !");
		} catch { toast.error("Erreur lors de la sauvegarde."); }
		finally { setLoading(false); }
	};

	if (fetching) return <div className="space-y-3">{[...Array(7)].map((_, i) => <div key={i} className="h-16 bg-[#222] rounded-xl animate-pulse" />)}</div>;

	return (
		<div>
			<div className="flex items-center justify-between mb-6">
				<h1 className="font-display text-3xl text-[#F5F0EB]">Horaires d'ouverture</h1>
				<Button onClick={handleSave} loading={loading}>Enregistrer</Button>
			</div>
			<div className="space-y-4">
				{schedule.map((day, dayIdx) => (
					<div key={day.dayOfWeek} className="bg-[#141414] border border-[#222] rounded-xl p-5">
						<div className="flex items-center gap-4 mb-4">
							<label className="flex items-center gap-3 cursor-pointer">
								<input type="checkbox" checked={day.isOpen} onChange={() => toggleDay(dayIdx)} className="w-4 h-4 accent-[#C8973A]" />
								<span className="text-[#F5F0EB] font-medium w-24">{DAYS_OF_WEEK[day.dayOfWeek]}</span>
							</label>
							{!day.isOpen && <span className="text-sm text-red-400/70">Fermé</span>}
							{day.isOpen && (
								<button type="button" onClick={() => addSlot(dayIdx)} className="flex items-center gap-1.5 text-xs text-[#C8973A] hover:text-[#E8B04A] transition-colors ml-auto">
									<Plus size={14} /> Ajouter un créneau
								</button>
							)}
						</div>
						{day.isOpen && (
							<div className="flex flex-wrap gap-3 pl-7">
								{day.slots.map((slot, slotIdx) => (
									<div key={slotIdx} className="flex items-center gap-2 bg-[#0A0A0A] border border-[#222] rounded-lg px-3 py-2">
										<input type="time" value={slot.time} onChange={e => updateSlot(dayIdx, slotIdx, "time", e.target.value)} className="bg-transparent text-sm text-[#F5F0EB] focus:outline-none w-20" />
										<span className="text-[#333]">|</span>
										<input type="number" value={slot.maxCovers} min="1" onChange={e => updateSlot(dayIdx, slotIdx, "maxCovers", parseInt(e.target.value))} className="bg-transparent text-sm text-[#F5F0EB] focus:outline-none w-12 text-center" />
										<span className="text-xs text-[#5A5249]">cvts</span>
										<button type="button" onClick={() => removeSlot(dayIdx, slotIdx)} className="text-[#333] hover:text-red-400 transition-colors ml-1"><Trash2 size={13} /></button>
									</div>
								))}
								{day.slots.length === 0 && <p className="text-xs text-[#5A5249]">Aucun créneau. Ajoutez-en un.</p>}
							</div>
						)}
					</div>
				))}
			</div>
		</div>
	);
}
