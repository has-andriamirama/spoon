import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
	label: string;
	value: string | number;
	sub?: string;
	icon: LucideIcon;
	color: string; // classe Tailwind, ex: "text-[#C8973A]"
	hex: string; // couleur réelle, ex: "#C8973A" (utilisée pour sparkline/progress)
	trend?: number; // pourcentage, positif ou négatif
	sparkline?: number[]; // valeurs pour la mini-courbe (optionnel)
	progress?: number; // 0-100, alternative à la sparkline (ex: en attente, occupation)
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
	if (!values || values.length < 2) return null;
	const max = Math.max(...values);
	const min = Math.min(...values);
	const range = max - min || 1;
	const w = 100;
	const h = 24;
	const step = w / (values.length - 1);
	const points = values
		.map((v, i) => {
			const x = i * step;
			const y = h - ((v - min) / range) * (h - 4) - 2;
			return `${x.toFixed(1)},${y.toFixed(1)}`;
		})
		.join(" ");

	return (
		<svg viewBox={`0 0 ${w} ${h}`} className="w-full h-5 overflow-visible" preserveAspectRatio="none">
			<polyline
				points={points}
				fill="none"
				stroke={color}
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

export default function StatCard({ label, value, sub, icon: Icon, color, hex, trend, sparkline, progress }: StatCardProps) {
	return (
		<div className="bg-[#141414] border border-[#222] rounded-2xl p-4 sm:p-5 transition-colors hover:border-[#333] animate-fade-in">
			<div className="flex items-start justify-between mb-3">
				<p className="text-xs sm:text-sm text-[#5A5249]">{label}</p>
				<Icon size={17} className={color} />
			</div>

			<p className="font-display text-2xl sm:text-3xl text-[#F5F0EB] font-semibold mb-1 leading-none">
				{value}
			</p>

			<div className="flex items-center gap-2 mb-3 min-h-[16px]">
				{typeof trend === "number" && (
					<span
						className={cn(
							"text-[11px] font-medium flex items-center gap-0.5",
							trend >= 0 ? "text-green-400" : "text-red-400"
						)}
					>
						{trend >= 0 ? "↗" : "↘"} {Math.abs(trend).toFixed(0)}%
					</span>
				)}
				{sub && <span className="text-[11px] text-[#5A5249]">{sub}</span>}
			</div>

			{sparkline && sparkline.length > 1 && <Sparkline values={sparkline} color={hex} />}

			{typeof progress === "number" && (
				<div className="w-full h-1.5 bg-[#2C2C2A] rounded-full overflow-hidden">
					<div
						className="h-full rounded-full transition-all duration-500"
						style={{ width: `${Math.min(100, Math.max(0, progress))}%`, backgroundColor: hex }}
					/>
				</div>
			)}
		</div>
	);
}
