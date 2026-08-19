"use client";

import { useRouter } from "next/navigation";

interface Props {
	value: string; // "YYYY-MM-DD"
	basePath?: string;
}

export default function PlanDatePicker({ value, basePath = "/admin/reservations/plan" }: Props) {
	const router = useRouter();

	return (
		<input
			type="date"
			defaultValue={value}
			onChange={(e) => {
				if (e.target.value) {
					router.push(`${basePath}?date=${e.target.value}`);
				}
			}}
			className="h-9 px-3 rounded-xl bg-[#141414] border border-[#222] text-sm text-[#F5F0EB] focus:border-[#C8973A] focus:outline-none cursor-pointer"
		/>
	);
}
