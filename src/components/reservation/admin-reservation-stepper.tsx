"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import StepDateTime from "./step-date-time";
import StepPersonalInfo from "./step-personal-info";
import StepOptions from "./step-options";
import AdminStepSummary from "./admin-step-summary";
import type { ReservationFormData } from "./reservation-stepper";

const STEPS = [
	{ id: 1, label: "Date & heure" },
	{ id: 2, label: "Client" },
	{ id: 3, label: "Options" },
	{ id: 4, label: "Validation" },
];

const defaultData: ReservationFormData = {
	date: "",
	timeSlot: "",
	covers: 2,
	guestFirstName: "",
	guestLastName: "",
	guestEmail: "",
	guestPhone: "",
	notes: "",
	allergies: "",
};

export default function AdminReservationStepper() {
	const router = useRouter();
	const [step, setStep] = useState(1);
	const [data, setData] = useState<ReservationFormData>(defaultData);

	const updateData = (updates: Partial<ReservationFormData>) =>
		setData((prev) => ({ ...prev, ...updates }));

	const next = () => setStep((s) => Math.min(s + 1, 4));
	const prev = () => setStep((s) => Math.max(s - 1, 1));

	const handleDone = () => {
		router.push("/admin/reservations");
	};

	return (
		<div>
			<div className="flex items-center justify-center mb-10">
				{STEPS.map((s, idx) => {
					const isCompleted = step > s.id;
					const isCurrent = step === s.id;

					return (
						<div key={s.id} className="flex items-center">
							<div className="flex flex-col items-center">
								<div
									className={cn(
										"w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all",
										isCompleted
											? "bg-[#C8973A] border-[#C8973A] text-[#0A0A0A]"
											: isCurrent
											? "border-[#C8973A] text-[#C8973A] bg-transparent"
											: "border-[#333] text-[#5A5249] bg-transparent"
									)}
								>
									{isCompleted ? <Check size={16} /> : s.id}
								</div>
								<span
									className={cn(
										"text-xs mt-1.5 hidden sm:block whitespace-nowrap",
										isCurrent ? "text-[#C8973A]" : "text-[#5A5249]"
									)}
								>
									{s.label}
								</span>
							</div>
							{idx < STEPS.length - 1 && (
								<div
									className={cn(
										"h-px w-12 sm:w-20 mx-2 transition-colors",
										isCompleted ? "bg-[#C8973A]" : "bg-[#222]"
									)}
								/>
							)}
						</div>
					);
				})}
			</div>

			<div className="bg-[#141414] border border-[#222] rounded-xl p-6 sm:p-8">
				{step === 1 && (
					<StepDateTime data={data} updateData={updateData} onNext={next} />
				)}
				{step === 2 && (
					<StepPersonalInfo
						data={data}
						updateData={updateData}
						onNext={next}
						onPrev={prev}
						isAdminReservation={true}
					/>
				)}
				{step === 3 && (
					<StepOptions
						data={data}
						updateData={updateData}
						onNext={next}
						onPrev={prev}
					/>
				)}
				{step === 4 && (
					<AdminStepSummary data={data} onPrev={prev} onDone={handleDone} />
				)}
			</div>
		</div>
	);
}
