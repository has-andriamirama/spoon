"use client";

import { useState, useMemo } from "react";
import { formatPrice } from "@/lib/utils";

interface RevenuePoint {
	label: string;
	value: number;
}

interface RevenueChartProps {
	last7Days: RevenuePoint[];
	last30Days: RevenuePoint[];
}

const W = 600;
const H = 200;
const PAD_X = 8;
const PAD_TOP = 16;
const PAD_BOTTOM = 24;

export default function RevenueChart({ last7Days, last30Days }: RevenueChartProps) {
	const [range, setRange] = useState<"7j" | "30j">("7j");
	const [hoverIdx, setHoverIdx] = useState<number | null>(null);

	const data = range === "7j" ? last7Days : last30Days;

	const { points, areaPath, linePath, max } = useMemo(() => {
		const values = data.map((d) => d.value);
		const max = Math.max(...values, 1);
		const min = 0;
		const range = max - min || 1;
		const innerW = W - PAD_X * 2;
		const innerH = H - PAD_TOP - PAD_BOTTOM;
		const step = data.length > 1 ? innerW / (data.length - 1) : 0;

		const points = data.map((d, i) => {
			const x = PAD_X + i * step;
			const y = PAD_TOP + innerH - ((d.value - min) / range) * innerH;
			return { x, y, ...d };
		});

		const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
		const areaPath = `${linePath} L ${points[points.length - 1]?.x ?? 0} ${H - PAD_BOTTOM} L ${points[0]?.x ?? 0} ${H - PAD_BOTTOM} Z`;

		return { points, areaPath, linePath, max };
	}, [data]);

	const hovered = hoverIdx !== null ? points[hoverIdx] : null;

	return (
		<div className="bg-[#141414] border border-[#222] rounded-2xl p-5 sm:p-6 min-w-0">
			<div className="flex items-center justify-between gap-3 flex-wrap mb-2">
				<h2 className="font-display text-lg text-[#F5F0EB]">Chiffre d'affaires</h2>
				<div className="flex gap-1 bg-[#0A0A0A] border border-[#222] rounded-lg p-1">
					{(["7j", "30j"] as const).map((r) => (
						<button
							key={r}
							onClick={() => {
								setRange(r);
								setHoverIdx(null);
							}}
							className={`text-[11px] font-medium px-2.5 py-1 rounded-md transition-colors ${
								range === r ? "bg-[#C8973A] text-[#0A0A0A]" : "text-[#9A8F84] hover:text-[#F5F0EB]"
							}`}
						>
							{r}
						</button>
					))}
				</div>
			</div>

			<div className="relative mt-2">
				{hovered && (
					<div
						className="absolute -translate-x-1/2 -translate-y-full bg-[#0A0A0A] border border-[#222] rounded-lg px-2.5 py-1.5 pointer-events-none z-10 whitespace-nowrap"
						style={{ left: `${(hovered.x / W) * 100}%`, top: `${(hovered.y / H) * 100}%`, marginTop: "-8px" }}
					>
						<p className="text-[10px] text-[#5A5249]">{hovered.label}</p>
						<p className="text-xs text-[#F5F0EB] font-medium">{formatPrice(hovered.value)}</p>
					</div>
				)}

				<svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[180px]" preserveAspectRatio="none">
					<defs>
						<linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
							<stop offset="0%" stopColor="#C8973A" stopOpacity="0.35" />
							<stop offset="100%" stopColor="#C8973A" stopOpacity="0" />
						</linearGradient>
					</defs>

					{[0.25, 0.5, 0.75].map((f) => (
						<line
							key={f}
							x1={PAD_X}
							x2={W - PAD_X}
							y1={PAD_TOP + (H - PAD_TOP - PAD_BOTTOM) * f}
							y2={PAD_TOP + (H - PAD_TOP - PAD_BOTTOM) * f}
							stroke="#1a1a1a"
							strokeWidth="1"
						/>
					))}

					<path d={areaPath} fill="url(#revenueGradient)" />
					<path d={linePath} fill="none" stroke="#C8973A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

					{points.map((p, i) => (
						<g key={i}>
							<rect
								x={p.x - (W / points.length) / 2}
								y={0}
								width={W / points.length}
								height={H}
								fill="transparent"
								onMouseEnter={() => setHoverIdx(i)}
								onMouseLeave={() => setHoverIdx(null)}
								className="cursor-pointer"
							/>
							{hoverIdx === i && (
								<>
									<line x1={p.x} x2={p.x} y1={PAD_TOP} y2={H - PAD_BOTTOM} stroke="#333" strokeWidth="1" strokeDasharray="3 3" />
									<circle cx={p.x} cy={p.y} r="4" fill="#C8973A" stroke="#141414" strokeWidth="2" />
								</>
							)}
						</g>
					))}
				</svg>

				<div className="flex justify-between px-1 -mt-1">
					{points.map((p, i) => (
						<span key={i} className="text-[10px] text-[#5A5249]" style={{ opacity: data.length > 10 && i % Math.ceil(data.length / 8) !== 0 ? 0 : 1 }}>
							{p.label}
						</span>
					))}
				</div>
			</div>

			<p className="text-[11px] text-[#5A5249] mt-2">Pic : {formatPrice(max)}</p>
		</div>
	);
}
