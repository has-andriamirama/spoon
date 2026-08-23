"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { X, Plus, Save, Loader2 } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Zone = "SALLE" | "TERRASSE" | "BAR" | "PRIVE";

interface TableData {
	id: string;
	numero: number;
	capaciteMin: number;
	capaciteMax: number;
	zone: Zone;
	description: string | null;
	isActif: boolean;
}

interface Props {
	table: TableData | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ZONE_OPTIONS: { value: Zone; label: string }[] = [
	{ value: "SALLE",    label: "Salle — intérieur" },
	{ value: "TERRASSE", label: "Terrasse"           },
	{ value: "BAR",      label: "Bar"                },
	{ value: "PRIVE",    label: "Espace privé"       },
];

const fieldCls = [
	"w-full bg-[#0A0A0A] border border-[#222] rounded-xl px-3 py-2.5",
	"text-sm text-[#F5F0EB] placeholder-[#5A5249]",
	"focus:border-[#C8973A]/60 focus:ring-1 focus:ring-[#C8973A]/20 focus:outline-none",
	"transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
].join(" ");

// ─── Component ────────────────────────────────────────────────────────────────

export default function TableForm({ table }: Props) {
	const router = useRouter();
	const [loading, setLoading] = useState(false);
	const [form, setForm] = useState({
		numero:      table?.numero?.toString()      ?? "",
		capaciteMin: table?.capaciteMin?.toString() ?? "1",
		capaciteMax: table?.capaciteMax?.toString() ?? "",
		zone:        (table?.zone ?? "SALLE") as Zone,
		description: table?.description             ?? "",
	});

	const updateForm = (key: keyof typeof form, value: string) =>
		setForm((f) => ({ ...f, [key]: value }));

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!form.numero || !form.capaciteMax) {
			toast.error("Numéro et capacité max sont requis");
			return;
		}
		setLoading(true);
		try {
			const body = {
				numero:      Number(form.numero),
				capaciteMin: Number(form.capaciteMin),
				capaciteMax: Number(form.capaciteMax),
				zone:        form.zone,
				description: form.description.trim() || null,
			};

			const res = await fetch(
				table ? `/api/admin/tables/${table.id}` : "/api/admin/tables",
				{
					method:  table ? "PATCH" : "POST",
					headers: { "Content-Type": "application/json" },
					body:    JSON.stringify(body),
				}
			);

			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error((err as { error?: string }).error || "Erreur");
			}

			toast.success(
				table ? `Table ${form.numero} mise à jour` : `Table ${form.numero} créée`
			);
			router.push("/admin/tables");
			router.refresh();
		} catch (error: unknown) {
			toast.error(getErrorMessage(error));
		} finally {
			setLoading(false);
		}
	};

	return (
		<form onSubmit={handleSubmit} className="max-w-2xl">
			<div className="bg-[#141414] border border-[#222] rounded-xl p-6 flex flex-col gap-5">

				{/* ── Section header ── */}
				<div>
					<h2 className="font-display text-xl text-[#F5F0EB]">
						Configuration de la table
					</h2>
					<p className="text-xs text-[#5A5249] mt-1">
						Définissez le numéro, la zone et la capacité d&apos;accueil.
					</p>
				</div>

				{/* ── Row 1 : numéro + zone ── */}
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div>
						<label className="text-xs text-[#5A5249] block mb-1.5">
							Numéro *
						</label>
						<input
							type="number"
							min="1"
							value={form.numero}
							onChange={(e) => updateForm("numero", e.target.value)}
							placeholder="Ex : 12"
							className={fieldCls}
							disabled={loading}
							required
						/>
					</div>
					<div>
						<label className="text-xs text-[#5A5249] block mb-1.5">
							Zone *
						</label>
						<select
							value={form.zone}
							onChange={(e) => updateForm("zone", e.target.value as Zone)}
							className={cn(fieldCls, "cursor-pointer")}
							disabled={loading}
						>
							{ZONE_OPTIONS.map(({ value, label }) => (
								<option key={value} value={value}>
									{label}
								</option>
							))}
						</select>
					</div>
				</div>

				{/* ── Row 2 : capacité min + max ── */}
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div>
						<label className="text-xs text-[#5A5249] block mb-1.5">
							Couverts min *
						</label>
						<input
							type="number"
							min="1"
							value={form.capaciteMin}
							onChange={(e) => updateForm("capaciteMin", e.target.value)}
							className={fieldCls}
							disabled={loading}
							required
						/>
					</div>
					<div>
						<label className="text-xs text-[#5A5249] block mb-1.5">
							Couverts max *
						</label>
						<input
							type="number"
							min="1"
							value={form.capaciteMax}
							onChange={(e) => updateForm("capaciteMax", e.target.value)}
							placeholder="Ex : 4"
							className={fieldCls}
							disabled={loading}
							required
						/>
					</div>
				</div>

				{/* ── Description ── */}
				<div>
					<label className="text-xs text-[#5A5249] block mb-1.5">
						Description (facultatif)
					</label>
					<input
						type="text"
						value={form.description}
						onChange={(e) => updateForm("description", e.target.value)}
						placeholder="Ex : Coin fenêtre, Vue mer, Banquette…"
						className={fieldCls}
						disabled={loading}
					/>
				</div>

				{/* ── Actions ── */}
				<div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-[#1e1e1e]">
					<Button
						type="button"
						variant="secondary"
						onClick={() => router.push("/admin/tables")}
						className="w-full sm:flex-1"
						disabled={loading}
					>
						<X size={14} />
						Annuler
					</Button>

					<Button
						type="submit"
						disabled={loading}
						className="w-full sm:flex-1"
					>
						{loading ? (
							<>
								<Loader2 size={14} className="animate-spin" />
								Enregistrement…
							</>
						) : (
							<>
								{table ? <Save size={14} /> : <Plus size={14} />}
								{table ? "Enregistrer" : "Créer la table"}
							</>
						)}
					</Button>
				</div>
			</div>
		</form>
	);
}
