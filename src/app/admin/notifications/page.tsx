import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";
import { Bell } from "lucide-react";
import MarkAllReadButton from "./mark-all-read";

export const dynamic = "force-dynamic";
export const metadata = { title: "Notifications" };

export default async function AdminNotificationsPage() {
	const notifications = await prisma.adminNotification.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
	const typeIcon: Record<string, string> = { new_reservation: "📅", payment_received: "💳", cancellation: "❌", event_request: "🎉" };

	return (
		<div>
			<div className="flex items-center justify-between mb-6">
				<h1 className="font-display text-3xl text-[#F5F0EB]">Notifications</h1>
				<MarkAllReadButton />
			</div>
			<div className="bg-[#141414] border border-[#222] rounded-xl overflow-hidden">
				{notifications.length === 0 ? (
					<div className="text-center py-16"><Bell size={40} className="text-[#333] mx-auto mb-4" /><p className="text-[#5A5249]">Aucune notification</p></div>
				) : (
					<div className="divide-y divide-[#1a1a1a]">
						{notifications.map(n => (
							<div key={n.id} className={`flex items-start gap-4 px-6 py-4 transition-colors ${n.isRead ? "opacity-50" : "hover:bg-[#1a1a1a]"}`}>
								<span className="text-xl mt-0.5">{typeIcon[n.type] || "🔔"}</span>
								<div className="flex-1">
									<div className="flex items-start justify-between gap-4">
										<p className={`text-sm font-medium ${n.isRead ? "text-[#9A8F84]" : "text-[#F5F0EB]"}`}>{n.title}</p>
										<div className="flex items-center gap-2 shrink-0">
											{!n.isRead && <span className="w-2 h-2 bg-[#C8973A] rounded-full" />}
											<span className="text-xs text-[#5A5249]">{formatDateTime(n.createdAt)}</span>
										</div>
									</div>
									<p className="text-xs text-[#5A5249] mt-0.5">{n.message}</p>
									{n.link && <a href={n.link} className="text-xs text-[#C8973A] hover:underline mt-1 inline-block">Voir →</a>}
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
