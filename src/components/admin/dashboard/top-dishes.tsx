interface TopDish {
	name: string;
	qty: number;
}

export default function TopDishes({ dishes }: { dishes: TopDish[] }) {
	const max = Math.max(...dishes.map((d) => d.qty), 1);

	return (
		<div className="bg-[#141414] border border-[#222] rounded-2xl p-5 min-w-0">
			<h3 className="font-display text-base text-[#F5F0EB] mb-4">Plats populaires</h3>

			{dishes.length === 0 ? (
				<p className="text-[#5A5249] text-sm py-6 text-center">Pas encore de commandes ce mois-ci</p>
			) : (
				<div className="space-y-3">
					{dishes.map((d) => (
						<div key={d.name}>
							<div className="flex items-center justify-between mb-1">
								<span className="text-xs text-[#F5F0EB] truncate pr-2">{d.name}</span>
								<span className="text-xs text-[#5A5249] shrink-0">{d.qty}</span>
							</div>
							<div className="w-full h-1.5 bg-[#2C2C2A] rounded-full overflow-hidden">
								<div
									className="h-full bg-[#C8973A] rounded-full transition-all duration-500"
									style={{ width: `${Math.max(6, (d.qty / max) * 100)}%` }}
								/>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
