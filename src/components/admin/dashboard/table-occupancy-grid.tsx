import Link from "next/link";
import { cn } from "@/lib/utils";

export type TableOccupancyStatus = "libre" | "occupee" | "addition";

interface TableItem {
	id: string;
	numero: number;
	status: TableOccupancyStatus;
}

const STATUS_STYLES: Record<TableOccupancyStatus, string> = {
	libre: "bg-[#1a1a1a] border-[#2C2C2A] text-[#5A5249]",
	occupee: "bg-[#378ADD]/15 border-[#378ADD] text-[#85B7EB]",
	addition: "bg-[#EF9F27]/15 border-[#EF9F27] text-[#FAC775]",
};

export default function TableOccupancyGrid({ tables }: { tables: TableItem[] }) {
	const occupied = tables.filter((t) => t.status !== "libre").length;

	return (
		<div className="bg-[#141414] border border-[#222] rounded-2xl p-5 min-w-0">
			<div className="flex items-center justify-between mb-4">
				<h3 className="font-display text-base text-[#F5F0EB]">Tables en salle</h3>
				<Link href="/admin/reservations/plan" className="text-[11px] text-[#C8973A] hover:underline shrink-0">
					{occupied}/{tables.length} occupées
				</Link>
			</div>

			{tables.length === 0 ? (
				<p className="text-[#5A5249] text-sm py-6 text-center">Aucune table configurée</p>
			) : (
				<>
					<div className="grid grid-cols-6 gap-1.5 mb-3">
						{tables.map((t) => (
							<div
								key={t.id}
								title={`Table ${t.numero} — ${t.status === "libre" ? "libre" : t.status === "occupee" ? "occupée" : "addition demandée"}`}
								className={cn(
									"aspect-square rounded-md border flex items-center justify-center text-[10px] font-medium transition-colors",
									STATUS_STYLES[t.status]
								)}
							>
								{t.numero}
							</div>
						))}
					</div>
					<div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-[#5A5249]">
						<span className="flex items-center gap-1.5">
							<span className="w-1.5 h-1.5 rounded-sm bg-[#378ADD]" /> Occupée
						</span>
						<span className="flex items-center gap-1.5">
							<span className="w-1.5 h-1.5 rounded-sm bg-[#EF9F27]" /> Addition
						</span>
						<span className="flex items-center gap-1.5">
							<span className="w-1.5 h-1.5 rounded-sm bg-[#2C2C2A]" /> Libre
						</span>
					</div>
				</>
			)}
		</div>
	);
}
