import { CalendarPlus, Banknote, ClockAlert, ConciergeBell, LucideIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

export type ActivityType = "reservation" | "payment" | "pending" | "service";

export interface ActivityItem {
	id: string;
	type: ActivityType;
	text: string;
	date: Date;
}

const CONFIG: Record<ActivityType, { icon: LucideIcon; color: string; bg: string }> = {
	reservation: { icon: CalendarPlus, color: "text-[#C8973A]", bg: "bg-[#C8973A]/10" },
	payment: { icon: Banknote, color: "text-green-400", bg: "bg-green-500/10" },
	pending: { icon: ClockAlert, color: "text-yellow-400", bg: "bg-yellow-500/10" },
	service: { icon: ConciergeBell, color: "text-blue-400", bg: "bg-blue-500/10" },
};

export default function ActivityFeed({ items }: { items: ActivityItem[] }) {
	return (
		<div className="bg-[#141414] border border-[#222] rounded-2xl p-5 sm:p-6 min-w-0 flex flex-col">
			<h2 className="font-display text-lg text-[#F5F0EB] mb-4">Activité récente</h2>

			{items.length === 0 ? (
				<p className="text-[#5A5249] text-sm py-8 text-center flex-1">Aucune activité récente</p>
			) : (
				<div className="space-y-4 flex-1">
					{items.map((item) => {
						const { icon: Icon, color, bg } = CONFIG[item.type];
						return (
							<div key={item.id} className="flex items-start gap-3">
								<div className={`w-7 h-7 rounded-full ${bg} flex items-center justify-center shrink-0`}>
									<Icon size={14} className={color} />
								</div>
								<div className="min-w-0">
									<p className="text-[13px] text-[#F5F0EB] leading-snug">{item.text}</p>
									<p className="text-[11px] text-[#5A5249] mt-0.5">
										{formatDistanceToNow(item.date, { addSuffix: true, locale: fr })}
									</p>
								</div>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}
