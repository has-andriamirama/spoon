"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Power, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import TableForm from "../table-form";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TableData {
	id:          string;
	numero:      number;
	capaciteMin: number;
	capaciteMax: number;
	zone:        "SALLE" | "TERRASSE" | "BAR" | "PRIVE";
	description: string | null;
	isActif:     boolean;
}

interface Props {
	table:  TableData | null;
	isNew:  boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TableDetailClient({ table: initialTable, isNew }: Props) {
	const [table, setTable]     = useState<TableData | null>(initialTable);
	const [toggling, setToggling] = useState(false);

	const handleToggleActive = async () => {
		if (!table) return;
		setToggling(true);
		try {
			const res = await fetch(`/api/admin/tables/${table.id}`, {
				method:  "PATCH",
				headers: { "Content-Type": "application/json" },
				body:    JSON.stringify({ isActif: !table.isActif }),
			});
			if (!res.ok) throw new Error();
			const { data } = await res.json();
			setTable((prev) => prev ? { ...prev, isActif: data.isActif } : prev);
			toast.success(
				`Table ${table.numero} ${data.isActif ? "activée" : "désactivée"}`
			);
		} catch {
			toast.error("Erreur lors de la mise à jour");
		} finally {
			setToggling(false);
		}
	};

	return (
		<div>
			{/* ── Back + title + toggle ── */}
			<div className="flex items-center gap-3 mb-8">
				<Link
					href="/admin/tables"
					className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-[#222] bg-[#141414] text-[#9A8F84] hover:text-[#F5F0EB] hover:border-[#C8973A]/40 transition-colors shrink-0"
					aria-label="Retour aux tables"
				>
					<ArrowLeft size={17} />
				</Link>

				<h1 className="font-display text-3xl text-[#F5F0EB] flex-1 min-w-0 truncate">
					{table ? `Table ${table.numero}` : "Nouvelle table"}
				</h1>

				{/* Toggle active/inactive — only shown when editing an existing table */}
				{table && (
					<button
						onClick={handleToggleActive}
						disabled={toggling}
						title={table.isActif ? "Désactiver la table" : "Activer la table"}
						className={cn(
							"inline-flex items-center gap-2 h-9 px-3 sm:px-4 rounded-lg border text-sm font-medium transition-all shrink-0",
							table.isActif
								? "border-green-900/40 bg-green-950/20 text-green-400 hover:bg-red-950/20 hover:border-red-900/40 hover:text-red-400"
								: "border-[#222] bg-[#141414] text-[#5A5249] hover:bg-green-950/20 hover:border-green-900/40 hover:text-green-400"
						)}
					>
						{toggling ? (
							<Loader2 size={14} className="animate-spin" />
						) : (
							<Power size={14} />
						)}
						<span className="hidden sm:inline">
							{table.isActif ? "Désactiver" : "Activer"}
						</span>
					</button>
				)}
			</div>

			{/* ── Status badge (only on edit) ── */}
			{table && (
				<div className="mb-6 flex items-center gap-2">
					<span
						className={cn(
							"inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border",
							table.isActif
								? "text-green-400 bg-green-950/20 border-green-900/40"
								: "text-[#5A5249] bg-[#141414] border-[#222]"
						)}
					>
						<span
							className={cn(
								"w-1.5 h-1.5 rounded-full",
								table.isActif ? "bg-green-500" : "bg-[#333]"
							)}
						/>
						{table.isActif ? "Active" : "Inactive"}
					</span>
				</div>
			)}

			<TableForm table={table} />
		</div>
	);
}
