"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { MenuCategory } from "@/types";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/utils";
import { X, Plus, Save, EyeOff, Loader2 } from "lucide-react";

interface Props {
	category: MenuCategory | null;
}

export default function CategoryForm({ category }: Props) {
	const router = useRouter();
	const [loading,  setLoading]  = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [form, setForm] = useState({
		name:        category?.name        ?? "",
		description: category?.description ?? "",
		iconName:    category?.iconName    ?? "",
		order:       category?.order?.toString() ?? "0",
		isActive:    category?.isActive    ?? true,
	});

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault();
		setLoading(true);

		try {
			const body = {
				name:        form.name.trim(),
				description: form.description.trim() || null,
				iconName:    form.iconName.trim() || null,
				order:       Number.isFinite(Number(form.order)) ? Number(form.order) : 0,
				isActive:    form.isActive,
			};

			const response = await fetch(
				category ? `/api/menu/categories/${category.id}` : "/api/menu/categories",
				{
					method:  category ? "PATCH" : "POST",
					headers: { "Content-Type": "application/json" },
					body:    JSON.stringify(body),
				}
			);

			if (!response.ok) {
				const errorBody = await response.json().catch(() => ({}));
				throw new Error(
					(errorBody as { error?: string }).error ||
					"Erreur lors de l'enregistrement de la catégorie."
				);
			}

			toast.success(category ? "Catégorie modifiée !" : "Catégorie créée !");
			router.push("/admin/menu/categories");
			router.refresh();
		} catch (error: unknown) {
			toast.error(getErrorMessage(error));
		} finally {
			setLoading(false);
		}
	};

	const handleDeactivate = async () => {
		if (
			!category ||
			!confirm(
				"Désactiver cette catégorie ? Les plats associés ne seront plus visibles dans le menu public."
			)
		)
			return;

		setDeleting(true);
		try {
			const response = await fetch(`/api/menu/categories/${category.id}`, {
				method: "DELETE",
			});
			if (!response.ok) {
				const errorBody = await response.json().catch(() => ({}));
				throw new Error(
					(errorBody as { error?: string }).error ||
					"Erreur lors de la désactivation."
				);
			}

			toast.success("Catégorie désactivée !");
			router.push("/admin/menu/categories");
			router.refresh();
		} catch (error: unknown) {
			toast.error(getErrorMessage(error));
		} finally {
			setDeleting(false);
		}
	};

	return (
		<form onSubmit={handleSubmit} className="max-w-2xl">
			<div className="bg-[#141414] border border-[#222] rounded-xl p-6 flex flex-col gap-5">

				<div>
					<h2 className="font-display text-xl text-[#F5F0EB]">
						Informations de la catégorie
					</h2>
					<p className="text-xs text-[#5A5249] mt-1">
						Définissez le nom et l&apos;ordre d&apos;affichage de la catégorie du menu.
					</p>
				</div>

				<Input
					label="Nom de la catégorie *"
					value={form.name}
					onChange={(event) =>
						setForm((previous) => ({ ...previous, name: event.target.value }))
					}
					required
				/>

				<Input
					label="Slug"
					value={category?.slug ?? "Généré automatiquement à la création"}
					readOnly
					disabled
				/>

				<Textarea
					label="Description"
					value={form.description}
					onChange={(event) =>
						setForm((previous) => ({ ...previous, description: event.target.value }))
					}
					rows={3}
				/>

				<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<Input
						label="Icône (nom Lucide, optionnel)"
						value={form.iconName}
						onChange={(event) =>
							setForm((previous) => ({ ...previous, iconName: event.target.value }))
						}
						placeholder="UtensilsCrossed"
					/>
					<Input
						label="Ordre d'affichage"
						type="number"
						min="0"
						value={form.order}
						onChange={(event) =>
							setForm((previous) => ({ ...previous, order: event.target.value }))
						}
					/>
				</div>

				<label className="flex items-center gap-3 cursor-pointer pt-1">
					<input
						type="checkbox"
						checked={form.isActive}
						onChange={(event) =>
							setForm((previous) => ({ ...previous, isActive: event.target.checked }))
						}
						className="w-4 h-4 accent-[#C8973A]"
					/>
					<span className="text-sm text-[#F5F0EB]">Catégorie active</span>
				</label>

				{/* ── Boutons d'action ── */}
				<div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-[#1e1e1e]">

					{category && (
						<Button
							type="button"
							variant="destructive"
							onClick={handleDeactivate}
							disabled={loading || deleting}
							className="w-full sm:flex-1"
						>
							{deleting ? (
								<>
									<Loader2 size={14} className="animate-spin" />
									Désactivation...
								</>
							) : (
								<>
									<EyeOff size={14} />
									Désactiver
								</>
							)}
						</Button>
					)}

					<Button
						type="button"
						variant="secondary"
						onClick={() => router.push("/admin/menu/categories")}
						className="w-full sm:flex-1"
						disabled={loading || deleting}
					>
						<X size={14} />
						Annuler
					</Button>

					<Button
						type="submit"
						disabled={loading || deleting}
						className="w-full sm:flex-1"
					>
						{loading ? (
							<>
								<Loader2 size={14} className="animate-spin" />
								Enregistrement...
							</>
						) : (
							<>
								{category ? <Save size={14} /> : <Plus size={14} />}
								{category ? "Enregistrer" : "Créer la catégorie"}
							</>
						)}
					</Button>

				</div>
			</div>
		</form>
	);
}
