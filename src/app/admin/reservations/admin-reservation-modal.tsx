"use client";
import { useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Modal } from "@/components/ui/modal";
import StepDateTime from "@/components/reservation/step-date-time";
import StepPersonalInfo from "@/components/reservation/step-personal-info";
import StepOptions from "@/components/reservation/step-options";
import AdminStepSummary from "@/components/reservation/admin-step-summary";
import type { ReservationFormData } from "@/components/reservation/reservation-stepper";

interface Props {
	open: boolean;
	onClose: () => void;
	onCreated: () => void;
}

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

export default function AdminReservationModal({ open, onClose, onCreated }: Props) {
	const [step, setStep] = useState(1);
	const [data, setData] = useState<ReservationFormData>(defaultData);

	const updateData = (updates: Partial<ReservationFormData>) =>
		setData((prev) => ({ ...prev, ...updates }));

	const next = () => setStep((s) => Math.min(s + 1, 4));
	const prev = () => setStep((s) => Math.max(s - 1, 1));

	const handleClose = () => {
		setStep(1);
		setData(defaultData);
		onClose();
	};

	const handleDone = () => {
		handleClose();
		onCreated();
	};

	return (
		<Modal
			open={open}
			onClose={handleClose}
			title="Nouvelle réservation"
			description="Créez une réservation pour un client et envoyez-lui le lien de paiement par email."
			className="max-w-2xl"
		>
			<div className="flex items-center justify-center mb-7 -mt-1">
				{STEPS.map((s, idx) => {
					const isCompleted = step > s.id;
					const isCurrent = step === s.id;
					return (
						<div key={s.id} className="flex items-center">
							<div className="flex flex-col items-center">
								<div
									className={cn(
										"w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-all",
										isCompleted
											? "bg-[#C8973A] border-[#C8973A] text-[#0A0A0A]"
											: isCurrent
											? "border-[#C8973A] text-[#C8973A] bg-transparent"
											: "border-[#333] text-[#5A5249] bg-transparent"
									)}
								>
									{isCompleted ? <Check size={13} /> : s.id}
								</div>
								<span
									className={cn(
										"text-xs mt-1 hidden sm:block whitespace-nowrap",
										isCurrent ? "text-[#C8973A]" : "text-[#5A5249]"
									)}
								>
									{s.label}
								</span>
							</div>
							{idx < STEPS.length - 1 && (
								<div
									className={cn(
										"h-px w-8 sm:w-14 mx-1.5 mb-4 transition-colors",
										isCompleted ? "bg-[#C8973A]" : "bg-[#222]"
									)}
								/>
							)}
						</div>
					);
				})}
			</div>

			{step === 1 && (
				<StepDateTime data={data} updateData={updateData} onNext={next} />
			)}
			{step === 2 && (
				<StepPersonalInfo
					data={data}
					updateData={updateData}
					onNext={next}
					onPrev={prev}
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
		</Modal>
	);
}
