import Link from "next/link";

interface HourlyPlanningProps {
	slots: { label: string; count: number }[];
}

export default function HourlyPlanning({ slots }: HourlyPlanningProps) {
	const max = Math.max(...slots.map((s) => s.count), 1);
	const hasData = slots.some((s) => s.count > 0);

	return (
		<div className="bg-[#141414] border border-[#222] rounded-2xl p-5 min-w-0">
			<div className="flex items-center justify-between mb-4">
				<h3 className="font-display text-base text-[#F5F0EB]">Planning du jour</h3>
				<Link href="/admin/reservations/calendar" className="text-[11px] text-[#C8973A] hover:underline shrink-0">
					Calendrier
				</Link>
			</div>

			{!hasData ? (
				<p className="text-[#5A5249] text-sm py-6 text-center">Aucune réservation aujourd'hui</p>
			) : (
				<>
					<div className="flex items-end gap-1 sm:gap-1.5 h-[72px] mb-2">
						{slots.map((s, i) => (
							<div key={i} className="flex-1 h-full flex items-end group relative">
								<div
									className="w-full rounded-t transition-all"
									style={{
										height: `${Math.max(6, (s.count / max) * 100)}%`,
										backgroundColor: s.count > 0 ? "#C8973A" : "#2C2C2A",
									}}
								/>
								{s.count > 0 && (
									<span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-[#9A8F84] opacity-0 group-hover:opacity-100 transition-opacity">
										{s.count}
									</span>
								)}
							</div>
						))}
					</div>
					<div className="flex justify-between">
						{slots.map((s, i) => (
							<span key={i} className="flex-1 text-center text-[9px] text-[#5A5249]">
								{s.label}
							</span>
						))}
					</div>
				</>
			)}
		</div>
	);
}
