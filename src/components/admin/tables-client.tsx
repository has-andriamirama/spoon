"use client";

import { useState } from "react";
import {
	Plus,
	Pencil,
	Trash2,
	TableProperties,
	Power,
	Check,
	X,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

type Zone = "SALLE" | "TERRASSE" | "BAR" | "PRIVE";

type TableRow = {
	id: string;
	numero: number;
	capaciteMin: number;
	capaciteMax: number;
	zone: Zone;
	description: string | null;
	isActif: boolean;
	_count: { reservations: number };
};

type FormValues = {
	numero: string;
	capaciteMin: string;
	capaciteMax: string;
	zone: Zone;
	description: string;
};

const ZONES: { value: Zone; label: string }[] = [
	{ value: "SALLE", label: "Salle — intérieur" },
	{ value: "TERRASSE", label: "Terrasse" },
	{ value: "BAR", label: "Bar" },
	{ value: "PRIVE", label: "Espace privé" },
];

const ZONE_COLORS: Record<Zone, string> = {
	SALLE: "text-blue-400 bg-blue-950/30 border-blue-900/40",
	TERRASSE: "text-green-400 bg-green-950/30 border-green-900/40",
	BAR: "text-[#C8973A] bg-[#1a1200] border-[#C8973A]/20",
	PRIVE: "text-purple-400 bg-purple-950/30 border-purple-900/40",
};

const EMPTY_FORM: FormValues = {
	numero: "",
	capaciteMin: "1",
	capaciteMax: "",
	zone: "SALLE",
	description: "",
};

export default function TablesClient({
	initialTables,
}: {
	initialTables: TableRow[];
}) {
	const [tables, setTables] = useState<TableRow[]>(initialTables);
	const [modal, setModal] = useState<"create" | "edit" | null>(null);
	const [editTarget, setEditTarget] = useState<TableRow | null>(null);
	const [form, setForm] = useState<FormValues>(EMPTY_FORM);
	const [loading, setLoading] = useState<string | null>(null);
	const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

	const openCreate = () => {
		setForm(EMPTY_FORM);
		setEditTarget(null);
		setModal("create");
	};

	const openEdit = (t: TableRow) => {
		setForm({
			numero: String(t.numero),
			capaciteMin: String(t.capaciteMin),
			capaciteMax: String(t.capaciteMax),
			zone: t.zone,
			description: t.description || "",
		});
		setEditTarget(t);
		setModal("edit");
	};

	const closeModal = () => {
		setModal(null);
		setEditTarget(null);
		setForm(EMPTY_FORM);
	};

	const updateForm = (key: keyof FormValues, value: string) =>
		setForm((f) => ({ ...f, [key]: value }));

	const handleCreate = async () => {
		if (!form.numero || !form.capaciteMax) {
			toast.error("Numéro et capacité max sont requis");
			return;
		}
		setLoading("create");
		try {
			const res = await fetch("/api/admin/tables", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					numero: Number(form.numero),
					capaciteMin: Number(form.capaciteMin),
					capaciteMax: Number(form.capaciteMax),
					zone: form.zone,
					description: form.description || null,
				}),
			});
			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.error);
			}
			const { data } = await res.json();
			setTables((prev) =>
				[...prev, { ...data, _count: { reservations: 0 } }].sort(
					(a, b) => a.numero - b.numero
				)
			);
			toast.success(`Table ${data.numero} créée`);
			closeModal();
		} catch (e: unknown) {
			toast.error(e instanceof Error ? e.message : "Erreur");
		} finally {
			setLoading(null);
		}
	};

	const handleEdit = async () => {
		if (!editTarget || !form.numero || !form.capaciteMax) {
			toast.error("Champs requis manquants");
			return;
		}
		setLoading("edit");
		try {
			const res = await fetch(`/api/admin/tables/${editTarget.id}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					numero: Number(form.numero),
					capaciteMin: Number(form.capaciteMin),
					capaciteMax: Number(form.capaciteMax),
					zone: form.zone,
					description: form.description || null,
				}),
			});
			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.error);
			}
			const { data } = await res.json();
			setTables((prev) =>
				prev
					.map((t) =>
						t.id === data.id
							? { ...data, _count: t._count }
							: t
					)
					.sort((a, b) => a.numero - b.numero)
			);
			toast.success(`Table ${data.numero} mise à jour`);
			closeModal();
		} catch (e: unknown) {
			toast.error(e instanceof Error ? e.message : "Erreur");
		} finally {
			setLoading(null);
		}
	};

	const handleToggleActive = async (t: TableRow) => {
		setLoading(`toggle-${t.id}`);
		try {
			const res = await fetch(`/api/admin/tables/${t.id}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ isActif: !t.isActif }),
			});
			if (!res.ok) throw new Error();
			const { data } = await res.json();
			setTables((prev) =>
				prev.map((x) => (x.id === data.id ? { ...data, _count: x._count } : x))
			);
			toast.success(
				`Table ${t.numero} ${data.isActif ? "activée" : "désactivée"}`
			);
		} catch {
			toast.error("Erreur");
		} finally {
			setLoading(null);
		}
	};

	const handleDelete = async (t: TableRow) => {
		setLoading(`delete-${t.id}`);
		try {
			const res = await fetch(`/api/admin/tables/${t.id}`, {
				method: "DELETE",
			});
			if (!res.ok) throw new Error();
			setTables((prev) => prev.filter((x) => x.id !== t.id));
			toast.success(`Table ${t.numero} supprimée`);
			setDeleteConfirm(null);
		} catch {
			toast.error("Erreur lors de la suppression");
		} finally {
			setLoading(null);
		}
	};

	const byZone = ZONES.reduce(
		(acc, { value }) => {
			acc[value] = tables.filter((t) => t.zone === value);
			return acc;
		},
		{} as Record<Zone, TableRow[]>
	);

	return (
		<>
			<div className="flex justify-end mb-6">
				<button
					onClick={openCreate}
					className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#C8973A] hover:bg-[#D4A445] text-[#0A0A0A] text-sm font-semibold transition-colors"
				>
					<Plus size={16} />
					Ajouter une table
				</button>
			</div>

			{tables.length === 0 ? (
				<div className="text-center py-20 border border-dashed border-[#222] rounded-xl">
					<TableProperties size={32} className="text-[#2a2a2a] mx-auto mb-3" />
					<p className="text-[#5A5249] text-sm mb-1">Aucune table configurée</p>
					<p className="text-xs text-[#333]">
						Ajoutez vos tables pour utiliser le plan de salle dynamique
					</p>
				</div>
			) : (
				<div className="space-y-4">
					{ZONES.map(({ value: zone, label }) => {
						const zoneTables = byZone[zone];
						if (zoneTables.length === 0) return null;
						return (
							<div
								key={zone}
								className="bg-[#141414] border border-[#222] rounded-xl overflow-hidden"
							>
								<div className="px-5 py-3 border-b border-[#1e1e1e] flex items-center gap-3">
									<span
										className={cn(
											"text-[11px] font-semibold px-2.5 py-1 rounded-lg border",
											ZONE_COLORS[zone]
										)}
									>
										{label}
									</span>
									<span className="text-xs text-[#333]">
										{zoneTables.length} table{zoneTables.length > 1 ? "s" : ""}
									</span>
								</div>

								<div className="divide-y divide-[#1a1a1a]">
									{zoneTables.map((t) => (
										<div
											key={t.id}
											className={cn(
												"flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-[#1a1a1a]",
												!t.isActif && "opacity-50"
											)}
										>
											<div
												className={cn(
													"w-2 h-2 rounded-full shrink-0",
													t.isActif ? "bg-green-500" : "bg-[#333]"
												)}
											/>

											<span className="text-sm font-bold text-[#F5F0EB] w-10 shrink-0">
												T{t.numero}
											</span>

											<span className="text-xs text-[#9A8F84]">
												{t.capaciteMin}–{t.capaciteMax} cv
											</span>

											{t.description && (
												<span className="text-xs text-[#5A5249] flex-1 truncate">
													{t.description}
												</span>
											)}

											<span className="text-[11px] text-[#333] ml-auto">
												{t._count.reservations} résa
											</span>

											<div className="flex items-center gap-1.5 shrink-0">
												<button
													onClick={() => handleToggleActive(t)}
													disabled={loading === `toggle-${t.id}`}
													title={t.isActif ? "Désactiver" : "Activer"}
													className={cn(
														"p-1.5 rounded-lg transition-colors",
														t.isActif
															? "text-green-600 hover:text-green-400 hover:bg-green-950/30"
															: "text-[#333] hover:text-[#9A8F84] hover:bg-[#222]"
													)}
												>
													{t.isActif ? (
														<Check size={14} />
													) : (
														<Power size={14} />
													)}
												</button>
												<button
													onClick={() => openEdit(t)}
													className="p-1.5 rounded-lg text-[#5A5249] hover:text-[#9A8F84] hover:bg-[#222] transition-colors"
													title="Modifier"
												>
													<Pencil size={14} />
												</button>
												{deleteConfirm === t.id ? (
													<div className="flex items-center gap-1">
														<button
															onClick={() => handleDelete(t)}
															disabled={loading === `delete-${t.id}`}
															className="p-1.5 rounded-lg text-red-500 hover:bg-red-950/30 transition-colors"
															title="Confirmer la suppression"
														>
															<Check size={14} />
														</button>
														<button
															onClick={() => setDeleteConfirm(null)}
															className="p-1.5 rounded-lg text-[#5A5249] hover:text-[#9A8F84] transition-colors"
														>
															<X size={14} />
														</button>
													</div>
												) : (
													<button
														onClick={() => setDeleteConfirm(t.id)}
														className="p-1.5 rounded-lg text-[#5A5249] hover:text-red-400 hover:bg-red-950/20 transition-colors"
														title="Supprimer"
													>
														<Trash2 size={14} />
													</button>
												)}
											</div>
										</div>
									))}
								</div>
							</div>
						);
					})}
				</div>
			)}

			<Modal
				open={modal !== null}
				onClose={closeModal}
				title={modal === "create" ? "Ajouter une table" : "Modifier la table"}
				description={
					modal === "create"
						? "Configurez une nouvelle table physique du restaurant."
						: `Modifier la configuration de la table ${editTarget?.numero}.`
				}
			>
				<div className="space-y-4">
					<div className="grid grid-cols-2 gap-4">
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
								className="w-full bg-[#0A0A0A] border border-[#222] rounded-xl px-3 py-2.5 text-sm text-[#F5F0EB] placeholder-[#2a2a2a] focus:border-[#C8973A] focus:outline-none"
							/>
						</div>

						<div>
							<label className="text-xs text-[#5A5249] block mb-1.5">
								Zone *
							</label>
							<select
								value={form.zone}
								onChange={(e) => updateForm("zone", e.target.value as Zone)}
								className="w-full bg-[#0A0A0A] border border-[#222] rounded-xl px-3 py-2.5 text-sm text-[#F5F0EB] focus:border-[#C8973A] focus:outline-none"
							>
								{ZONES.map(({ value, label }) => (
									<option key={value} value={value}>
										{label}
									</option>
								))}
							</select>
						</div>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div>
							<label className="text-xs text-[#5A5249] block mb-1.5">
								Couverts min *
							</label>
							<input
								type="number"
								min="1"
								value={form.capaciteMin}
								onChange={(e) => updateForm("capaciteMin", e.target.value)}
								className="w-full bg-[#0A0A0A] border border-[#222] rounded-xl px-3 py-2.5 text-sm text-[#F5F0EB] focus:border-[#C8973A] focus:outline-none"
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
								className="w-full bg-[#0A0A0A] border border-[#222] rounded-xl px-3 py-2.5 text-sm text-[#F5F0EB] placeholder-[#2a2a2a] focus:border-[#C8973A] focus:outline-none"
							/>
						</div>
					</div>

					<div>
						<label className="text-xs text-[#5A5249] block mb-1.5">
							Description (facultatif)
						</label>
						<input
							type="text"
							value={form.description}
							onChange={(e) => updateForm("description", e.target.value)}
							placeholder="Ex : Coin fenêtre, Vue mer, Banquette…"
							className="w-full bg-[#0A0A0A] border border-[#222] rounded-xl px-3 py-2.5 text-sm text-[#F5F0EB] placeholder-[#2a2a2a] focus:border-[#C8973A] focus:outline-none"
						/>
					</div>

					<div className="flex justify-end gap-3 pt-2 border-t border-[#1e1e1e]">
						<button
							onClick={closeModal}
							className="px-4 py-2 text-sm text-[#5A5249] hover:text-[#9A8F84] transition-colors"
						>
							Annuler
						</button>
						<button
							onClick={modal === "create" ? handleCreate : handleEdit}
							disabled={
								loading === "create" || loading === "edit"
							}
							className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#C8973A] hover:bg-[#D4A445] text-[#0A0A0A] text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
						>
							{modal === "create" ? (
								<>
									<Plus size={15} />
									{loading === "create" ? "Création…" : "Créer la table"}
								</>
							) : (
								<>
									<Check size={15} />
									{loading === "edit" ? "Sauvegarde…" : "Sauvegarder"}
								</>
							)}
						</button>
					</div>
				</div>
			</Modal>
		</>
	);
}
