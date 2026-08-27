"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import Link from "next/link";
import {
	ArrowLeft,
	Plus,
	Edit,
	Trash2,
	CheckCircle2,
	Loader2,
	Save,
	X,
	FileCode2,
	Search,
	ChevronDown,
} from "lucide-react";
import toast from "react-hot-toast";
import { cn, formatDateTime, getErrorMessage } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	INVOICE_TEMPLATE_VARIABLES,
	buildSampleVariables,
	injectTemplateVariables,
} from "@/lib/pdf/template-variables";

type InvoiceType = "DEPOSIT" | "ADDITION";
type TypeFilter = "ALL" | InvoiceType;
type StatusFilter = "all" | "active" | "inactive";

interface Template {
	id: string;
	name: string;
	type: InvoiceType;
	isActive: boolean;
	cloudinaryUrl: string;
	cloudinaryPublicId: string;
	createdAt: Date;
	updatedAt: Date;
}

interface Props {
	initialTemplates: Template[];
}

const TYPE_META: Record<InvoiceType, { label: string; badge: "gold" | "blue" }> = {
	DEPOSIT: { label: "Acompte", badge: "gold" },
	ADDITION: { label: "Addition", badge: "blue" },
};

const TEMPLATE_GRID_COLS = "grid-cols-[2fr_0.9fr_0.9fr_1fr_104px]";

const SAMPLE_VARIABLES = buildSampleVariables();

function Pill({
	label,
	count,
	active,
	activeClass,
	onClick,
}: {
	label: string;
	count: number;
	active: boolean;
	activeClass?: string;
	onClick: () => void;
}) {
	return (
		<button
			onClick={onClick}
			className={cn(
				"flex items-center gap-1.5 px-3 h-8 rounded-full border text-xs font-medium transition-all whitespace-nowrap",
				active
					? activeClass ?? "bg-[#C8973A]/10 border-[#C8973A]/30 text-[#C8973A]"
					: "border-[#222] text-[#5A5249] hover:border-[#333] hover:text-[#9A8F84]"
			)}
		>
			{label}
			<span
				className={cn(
					"text-[10px] px-1.5 py-0.5 rounded-full font-semibold",
					active ? "bg-white/10" : "bg-[#1a1a1a] text-[#5A5249]"
				)}
			>
				{count}
			</span>
		</button>
	);
}

function EmptyState({ onReset }: { onReset?: () => void }) {
	return (
		<div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
			<div className="w-12 h-12 rounded-full bg-[#1a1a1a] flex items-center justify-center">
				<FileCode2 size={20} className="text-[#5A5249]" />
			</div>
			<p className="text-sm text-[#5A5249]">Aucun template trouvé</p>
			<p className="text-xs text-[#5A5249] max-w-xs">
				Sans template actif, un modèle par défaut minimal est utilisé automatiquement pour ne
				jamais bloquer la génération des factures.
			</p>
			{onReset && (
				<button
					onClick={onReset}
					className="text-xs text-[#C8973A] hover:underline transition-colors"
				>
					Réinitialiser les filtres
				</button>
			)}
		</div>
	);
}

<<<<<<< HEAD
=======
/** Groupe d'actions icônes (activer / modifier / supprimer) — jamais de texte. */
>>>>>>> e1c0511a475b3cc45f8103b30b898dd779b5fb85
function TemplateActions({
	template,
	onEdit,
	onActivate,
	onDelete,
	activating,
	deleting,
	className,
}: {
	template: Template;
	onEdit: (e: React.MouseEvent) => void;
	onActivate: (e: React.MouseEvent) => void;
	onDelete: (e: React.MouseEvent) => void;
	activating: boolean;
	deleting: boolean;
	className?: string;
}) {
	return (
		<div className={cn("flex items-center gap-1", className)}>
			{!template.isActive && (
				<button
					onClick={onActivate}
					disabled={activating}
					title="Activer"
					aria-label="Activer ce template"
					className="p-1.5 rounded-lg text-[#5A5249] hover:text-green-400 hover:bg-green-500/10 transition-all disabled:opacity-40"
				>
					{activating ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
				</button>
			)}
			<button
				onClick={onEdit}
				title="Modifier"
				aria-label="Modifier ce template"
				className="p-1.5 rounded-lg text-[#5A5249] hover:text-[#C8973A] hover:bg-[#252525] transition-all"
			>
				<Edit size={14} />
			</button>
			<button
				onClick={onDelete}
				disabled={deleting}
				title="Supprimer"
				aria-label="Supprimer ce template"
				className="p-1.5 rounded-lg text-[#5A5249] hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-40"
			>
				{deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
			</button>
		</div>
	);
}

function VariableChip({ label, onInsert }: { label: string; onInsert: () => void }) {
	return (
		<button
			type="button"
			onClick={onInsert}
			className="font-mono text-[11px] px-2 py-1 rounded-md bg-[#0A0A0A] border border-[#222] text-[#C8973A] hover:border-[#C8973A]/40 hover:bg-[#C8973A]/5 transition-colors"
		>
			{`{{${label}}}`}
		</button>
	);
}

interface EditorState {
	id: string | null;
	type: InvoiceType;
	name: string;
	html: string;
	setActive: boolean;
}

function EditorPanel({
	state,
	loadingHtml,
	saving,
	onClose,
	onChange,
	onInsertVariable,
	onSave,
}: {
	state: EditorState | null;
	loadingHtml: boolean;
	saving: boolean;
	onClose: () => void;
	onChange: (patch: Partial<EditorState>) => void;
	onInsertVariable: (key: string) => void;
	onSave: () => void;
}) {
	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [onClose]);

	useEffect(() => {
		document.body.style.overflow = state ? "hidden" : "";
		return () => {
			document.body.style.overflow = "";
		};
	}, [state]);

	const isOpen = !!state;
	const isNew = state?.id === null;

	const previewHtml = useMemo(() => {
		if (!state) return "";
		return injectTemplateVariables(state.html, SAMPLE_VARIABLES);
	}, [state]);

	return (
		<>
			<div
				onClick={onClose}
				aria-hidden="true"
				className={cn(
					"fixed inset-0 bg-black/60 z-40 transition-opacity duration-200",
					isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
				)}
			/>

			<aside
				className={cn(
					"fixed top-0 right-0 h-full w-full lg:w-[860px] z-50 flex flex-col",
					"bg-[#141414] border-l border-[#222] shadow-2xl",
					"transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
					isOpen ? "translate-x-0" : "translate-x-full"
				)}
				aria-label="Éditeur de template"
				role="dialog"
				aria-modal="true"
			>
				{state && (
					<>
						<div className="flex items-center justify-between p-5 border-b border-[#222] shrink-0">
							<div className="flex items-center gap-3 min-w-0">
								<div className="w-9 h-9 rounded-lg bg-[#C8973A]/10 border border-[#C8973A]/20 flex items-center justify-center shrink-0">
									<FileCode2 size={16} className="text-[#C8973A]" />
								</div>
								<div className="min-w-0">
									<p className="text-sm font-semibold text-[#F5F0EB] truncate">
										{isNew ? "Nouveau template" : "Modifier le template"}
									</p>
									{isNew ? (
										<div className="flex items-center gap-1.5 mt-1">
											{(Object.keys(TYPE_META) as InvoiceType[]).map((t) => (
												<button
													key={t}
													onClick={() => onChange({ type: t })}
													className={cn(
														"px-2 h-6 rounded-full border text-[11px] font-medium transition-all",
														state.type === t
															? "bg-[#C8973A]/10 border-[#C8973A]/30 text-[#C8973A]"
															: "border-[#222] text-[#5A5249] hover:border-[#333] hover:text-[#9A8F84]"
													)}
												>
													{TYPE_META[t].label}
												</button>
											))}
										</div>
									) : (
										<p className="text-xs text-[#5A5249] truncate">{TYPE_META[state.type].label}</p>
									)}
								</div>
							</div>
							<button
								onClick={onClose}
								className="p-1.5 rounded-lg text-[#5A5249] hover:text-[#F5F0EB] hover:bg-[#222] transition-colors shrink-0 ml-2"
								aria-label="Fermer l'éditeur"
							>
								<X size={16} />
							</button>
						</div>

						<div className="flex-1 overflow-y-auto p-5 space-y-4">
							<Input
								label="Nom du template"
								placeholder="Ex. Acompte — Élégance dorée"
								value={state.name}
								onChange={(e) => onChange({ name: e.target.value })}
							/>

							<div>
								<p className="text-xs font-medium text-[#F5F0EB] mb-2">
									Variables disponibles — clic pour insérer
								</p>
								<div className="flex flex-wrap gap-1.5">
									{INVOICE_TEMPLATE_VARIABLES.map((v) => (
										<VariableChip
											key={v.key}
											label={v.key}
											onInsert={() => onInsertVariable(v.key)}
										/>
									))}
								</div>
								<p className="text-[11px] text-[#5A5249] mt-2 leading-relaxed">
									<span className="text-[#9A8F84] font-medium">{`{{logoImg}}`}</span> insère le
									logo de l&apos;établissement (balise <code>&lt;img&gt;</code> déjà prête, vide
									si aucun logo n&apos;est configuré dans les paramètres du restaurant).{" "}
									<span className="text-[#9A8F84] font-medium">{`{{itemsRows}}`}</span> insère
									une ligne <code>&lt;tr&gt;</code> par plat (désignation, quantité, prix
									unitaire, total) — placez-la à l&apos;intérieur d&apos;un{" "}
									<code>&lt;tbody&gt;</code> d&apos;un tableau à 4 colonnes.
								</p>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<p className="text-xs font-medium text-[#F5F0EB] mb-2">HTML du template</p>
									{loadingHtml ? (
										<div className="h-72 rounded-lg border border-[#222] bg-[#0A0A0A] flex items-center justify-center">
											<Loader2 size={18} className="animate-spin text-[#5A5249]" />
										</div>
									) : (
										<textarea
											id="invoice-template-html"
											value={state.html}
											onChange={(e) => onChange({ html: e.target.value })}
											spellCheck={false}
											className={cn(
												"flex w-full h-72 rounded-lg border border-[#222] bg-[#0A0A0A] px-3 py-2.5 text-xs text-[#F5F0EB] placeholder:text-[#5A5249] transition-colors resize-y",
												"font-mono focus:outline-none focus:border-[#C8973A] focus:ring-1 focus:ring-[#C8973A]"
											)}
										/>
									)}
								</div>

								<div>
									<p className="text-xs font-medium text-[#F5F0EB] mb-2">
										Aperçu — données de test
									</p>
									<div className="h-72 rounded-lg border border-[#222] bg-white overflow-hidden">
										<iframe
											title="Aperçu du template"
											srcDoc={previewHtml}
											sandbox=""
											className="w-full h-full"
										/>
									</div>
								</div>
							</div>

							<label className="flex items-center gap-2.5 text-sm text-[#F5F0EB] cursor-pointer select-none">
								<input
									type="checkbox"
									checked={state.setActive}
									onChange={(e) => onChange({ setActive: e.target.checked })}
									className="w-4 h-4 rounded border-[#222] bg-[#0A0A0A] accent-[#C8973A]"
								/>
								Définir comme template actif pour les factures « {TYPE_META[state.type].label} »
							</label>
						</div>

						<div className="p-5 border-t border-[#222] shrink-0 flex items-center gap-2">
							<Button variant="secondary" onClick={onClose} className="flex-1">
								Annuler
							</Button>
							<Button onClick={onSave} loading={saving} className="flex-1">
								<Save size={14} />
								Enregistrer sur Cloudinary
							</Button>
						</div>
					</>
				)}
			</aside>
		</>
	);
}

export default function TemplatesClient({ initialTemplates }: Props) {
	const [templates, setTemplates] = useState<Template[]>(initialTemplates);
	const [search, setSearch] = useState("");
	const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");
	const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
	const [editor, setEditor] = useState<EditorState | null>(null);
	const [loadingHtml, setLoadingHtml] = useState(false);
	const [saving, setSaving] = useState(false);
	const [activatingId, setActivatingId] = useState<string | null>(null);
	const [deletingId, setDeletingId] = useState<string | null>(null);

	const counts = useMemo(
		() => ({
			ALL: templates.length,
			DEPOSIT: templates.filter((t) => t.type === "DEPOSIT").length,
			ADDITION: templates.filter((t) => t.type === "ADDITION").length,
		}),
		[templates]
	);

	const filtered = useMemo(() => {
		const q = search.toLowerCase().trim();
		return templates
			.filter((t) => {
				if (q && !t.name.toLowerCase().includes(q)) return false;
				if (typeFilter !== "ALL" && t.type !== typeFilter) return false;
				if (statusFilter === "active" && !t.isActive) return false;
				if (statusFilter === "inactive" && t.isActive) return false;
				return true;
			})
			.sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
	}, [templates, search, typeFilter, statusFilter]);

	const hasActiveFilters = !!(search || typeFilter !== "ALL" || statusFilter !== "all");

	const resetFilters = useCallback(() => {
		setSearch("");
		setTypeFilter("ALL");
		setStatusFilter("all");
	}, []);

	const openNewEditor = useCallback(() => {
		const type: InvoiceType = typeFilter === "ADDITION" ? "ADDITION" : "DEPOSIT";
		const isFirstOfType = templates.filter((t) => t.type === type).length === 0;
		setEditor({ id: null, type, name: "", html: "", setActive: isFirstOfType });
	}, [typeFilter, templates]);

	const openExistingEditor = useCallback(async (template: Template) => {
		setEditor({
			id: template.id,
			type: template.type,
			name: template.name,
			html: "",
			setActive: template.isActive,
		});
		setLoadingHtml(true);
		try {
			const res = await fetch(`/api/admin/invoice-templates/${template.id}`);
			if (!res.ok) throw new Error("Impossible de charger le template");
			const { data } = await res.json();
			setEditor((cur) => (cur && cur.id === template.id ? { ...cur, html: data.html } : cur));
		} catch (error) {
			toast.error(getErrorMessage(error, "Erreur lors du chargement du template"));
			setEditor(null);
		} finally {
			setLoadingHtml(false);
		}
	}, []);

	const closeEditor = useCallback(() => setEditor(null), []);

	const handleEditorChange = useCallback((patch: Partial<EditorState>) => {
		setEditor((cur) => (cur ? { ...cur, ...patch } : cur));
	}, []);

	const handleInsertVariable = useCallback((key: string) => {
		const textarea = document.getElementById("invoice-template-html") as HTMLTextAreaElement | null;
		setEditor((cur) => {
			if (!cur) return cur;
			const token = `{{${key}}}`;
			if (!textarea) return { ...cur, html: cur.html + token };
			const pos = textarea.selectionStart ?? cur.html.length;
			const html = cur.html.slice(0, pos) + token + cur.html.slice(pos);
			requestAnimationFrame(() => {
				textarea.focus();
				textarea.selectionStart = textarea.selectionEnd = pos + token.length;
			});
			return { ...cur, html };
		});
	}, []);

	const handleSave = useCallback(async () => {
		if (!editor) return;
		if (!editor.name.trim()) {
			toast.error("Le nom du template est requis");
			return;
		}
		if (!editor.html.trim()) {
			toast.error("Le contenu HTML est requis");
			return;
		}

		setSaving(true);
		try {
			const isNew = editor.id === null;
			const url = isNew
				? "/api/admin/invoice-templates"
				: `/api/admin/invoice-templates/${editor.id}`;
			const method = isNew ? "POST" : "PATCH";
			const body = isNew
				? { name: editor.name, type: editor.type, html: editor.html, setActive: editor.setActive }
				: { name: editor.name, html: editor.html, setActive: editor.setActive };

			const res = await fetch(url, {
				method,
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
			});
			if (!res.ok) {
				const err = await res.json().catch(() => null);
				throw new Error(err?.error ?? "Échec de l'enregistrement");
			}
			const { data: saved } = await res.json();

			setTemplates((cur) => {
				const withoutSaved = cur.filter((t) => t.id !== saved.id);
				const next = saved.isActive
					? withoutSaved.map((t) => (t.type === saved.type ? { ...t, isActive: false } : t))
					: withoutSaved;
				return [...next, saved];
			});

			toast.success(isNew ? "Template créé" : "Template mis à jour");
			setEditor(null);
		} catch (error) {
			toast.error(getErrorMessage(error, "Erreur lors de l'enregistrement du template"));
		} finally {
			setSaving(false);
		}
	}, [editor]);

	const handleActivate = useCallback(async (template: Template) => {
		setActivatingId(template.id);
		try {
			const res = await fetch(`/api/admin/invoice-templates/${template.id}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ setActive: true }),
			});
			if (!res.ok) throw new Error("Échec de l'activation");
			setTemplates((cur) =>
				cur.map((t) => (t.type === template.type ? { ...t, isActive: t.id === template.id } : t))
			);
			toast.success(`« ${template.name} » est maintenant actif`);
		} catch (error) {
			toast.error(getErrorMessage(error, "Erreur lors de l'activation"));
		} finally {
			setActivatingId(null);
		}
	}, []);

	const handleDelete = useCallback(async (template: Template) => {
		if (!window.confirm(`Supprimer le template « ${template.name} » ? Cette action est irréversible.`)) {
			return;
		}
		setDeletingId(template.id);
		try {
			const res = await fetch(`/api/admin/invoice-templates/${template.id}`, { method: "DELETE" });
			if (!res.ok) throw new Error("Échec de la suppression");
			setTemplates((cur) => cur.filter((t) => t.id !== template.id));
			toast.success("Template supprimé");
		} catch (error) {
			toast.error(getErrorMessage(error, "Erreur lors de la suppression"));
		} finally {
			setDeletingId(null);
		}
	}, []);

	return (
		<div className="min-h-full">
			<div className="flex items-start justify-between mb-6 gap-4">
				<div className="flex items-center gap-3">
					<Link
						href="/admin/invoices"
						className="p-1.5 -ml-1.5 rounded-lg text-[#5A5249] hover:text-[#F5F0EB] hover:bg-[#1a1a1a] transition-colors shrink-0"
						aria-label="Retour aux factures"
					>
						<ArrowLeft size={16} />
					</Link>
					<div>
						<h1 className="font-display text-3xl text-[#F5F0EB] leading-tight">
							Templates de factures
						</h1>
						<p className="text-sm text-[#5A5249] mt-1">
							{templates.length} template{templates.length !== 1 ? "s" : ""} · acompte et
							addition
						</p>
					</div>
				</div>
				<button
					onClick={openNewEditor}
					className="flex items-center gap-2 h-9 px-3 sm:px-4 bg-[#C8973A] hover:bg-[#E8B04A] text-[#0A0A0A] text-sm font-semibold rounded-lg transition-colors shrink-0"
				>
					<Plus size={14} />
					<span className="hidden sm:inline">Ajouter</span>
				</button>
			</div>

			<div className="bg-[#141414] border border-[#222] rounded-xl p-4 mb-4 space-y-3">
				<div className="flex flex-col sm:flex-row gap-3">
					<div className="relative flex-1">
						<Search
							size={14}
							className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5A5249] pointer-events-none"
						/>
						<input
							type="text"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder="Rechercher un template..."
							className="w-full h-9 pl-9 pr-9 rounded-lg bg-[#0A0A0A] border border-[#222] text-sm text-[#F5F0EB] placeholder:text-[#5A5249] focus:border-[#C8973A] focus:ring-1 focus:ring-[#C8973A] outline-none transition-colors"
						/>
						{search && (
							<button
								onClick={() => setSearch("")}
								className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#5A5249] hover:text-[#9A8F84] transition-colors"
								aria-label="Effacer"
							>
								<X size={14} />
							</button>
						)}
					</div>

					<div className="relative">
						<select
							value={statusFilter}
							onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
							className="h-9 pl-3 pr-8 rounded-lg bg-[#0A0A0A] border border-[#222] text-sm text-[#F5F0EB] focus:border-[#C8973A] focus:outline-none appearance-none cursor-pointer w-full sm:w-auto"
						>
							<option value="all">Tous statuts</option>
							<option value="active">Actifs</option>
							<option value="inactive">Inactifs</option>
						</select>
						<ChevronDown
							size={13}
							className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#5A5249] pointer-events-none"
						/>
					</div>
				</div>

				<div className="flex items-center gap-2 flex-wrap">
					<Pill label="Tous" count={counts.ALL} active={typeFilter === "ALL"} onClick={() => setTypeFilter("ALL")} />
					<Pill
						label="Acompte"
						count={counts.DEPOSIT}
						active={typeFilter === "DEPOSIT"}
						onClick={() => setTypeFilter("DEPOSIT")}
					/>
					<Pill
						label="Addition"
						count={counts.ADDITION}
						active={typeFilter === "ADDITION"}
						activeClass="bg-orange-500/10 border-orange-500/30 text-orange-400"
						onClick={() => setTypeFilter("ADDITION")}
					/>
					{hasActiveFilters && (
						<button
							onClick={resetFilters}
							className="ml-auto flex items-center gap-1 text-xs text-[#5A5249] hover:text-[#9A8F84] transition-colors"
						>
							<X size={12} />
							Réinitialiser
						</button>
					)}
				</div>
			</div>

			{/* ── Desktop ── */}
			<div className="hidden lg:block bg-[#141414] border border-[#222] rounded-xl overflow-hidden">
				<div className={cn("grid items-center px-5 py-3 border-b border-[#1a1a1a]", TEMPLATE_GRID_COLS)}>
					<span className="text-xs font-semibold uppercase tracking-wider text-[#5A5249]">Nom</span>
					<span className="text-xs font-semibold uppercase tracking-wider text-[#5A5249]">Type</span>
					<span className="text-xs font-semibold uppercase tracking-wider text-[#5A5249]">Statut</span>
					<span className="text-xs font-semibold uppercase tracking-wider text-[#5A5249]">Modifié le</span>
					<span className="text-xs font-semibold uppercase tracking-wider text-[#5A5249] text-right">
						Actions
					</span>
				</div>

				{filtered.length === 0 ? (
					<EmptyState onReset={hasActiveFilters ? resetFilters : undefined} />
				) : (
					<div className="divide-y divide-[#1a1a1a]">
						{filtered.map((template) => (
							<div
								key={template.id}
								onClick={() => openExistingEditor(template)}
								role="button"
								tabIndex={0}
								onKeyDown={(e) => e.key === "Enter" && openExistingEditor(template)}
								className={cn(
									"group grid items-center px-5 py-3.5 cursor-pointer transition-colors hover:bg-[#1a1a1a]",
									TEMPLATE_GRID_COLS
								)}
							>
								<span className="text-sm font-medium text-[#F5F0EB] truncate pr-2">
									{template.name}
								</span>

								<div>
									<Badge variant={TYPE_META[template.type].badge} className="text-[10px]">
										{TYPE_META[template.type].label}
									</Badge>
								</div>

								<div>
									{template.isActive ? (
										<Badge variant="green" className="text-[10px]">
											<CheckCircle2 size={11} />
											Actif
										</Badge>
									) : (
										<Badge variant="gray" className="text-[10px]">
											Inactif
										</Badge>
									)}
								</div>

								<span className="text-sm text-[#9A8F84]">{formatDateTime(template.updatedAt)}</span>

								<TemplateActions
									template={template}
									onEdit={(e) => {
										e.stopPropagation();
										openExistingEditor(template);
									}}
									onActivate={(e) => {
										e.stopPropagation();
										handleActivate(template);
									}}
									onDelete={(e) => {
										e.stopPropagation();
										handleDelete(template);
									}}
									activating={activatingId === template.id}
									deleting={deletingId === template.id}
									className="justify-end opacity-0 group-hover:opacity-100 transition-opacity"
								/>
							</div>
						))}
					</div>
				)}
			</div>

			{/* ── Mobile ── */}
			<div className="lg:hidden space-y-3">
				{filtered.length === 0 ? (
					<EmptyState onReset={hasActiveFilters ? resetFilters : undefined} />
				) : (
					filtered.map((template) => (
						<div
							key={template.id}
							onClick={() => openExistingEditor(template)}
							role="button"
							tabIndex={0}
							onKeyDown={(e) => e.key === "Enter" && openExistingEditor(template)}
							className="bg-[#141414] border border-[#222] rounded-xl p-4 cursor-pointer transition-colors hover:border-[#333] hover:bg-[#1a1a1a]"
						>
							<div className="flex items-start justify-between gap-3 mb-3">
								<div className="min-w-0">
									<p className="text-sm font-semibold text-[#F5F0EB] truncate">{template.name}</p>
									<p className="text-xs text-[#5A5249] mt-0.5">
										Modifié le {formatDateTime(template.updatedAt)}
									</p>
								</div>
								<Badge variant={TYPE_META[template.type].badge} className="text-[10px] shrink-0">
									{TYPE_META[template.type].label}
								</Badge>
							</div>

							<div className="flex items-center justify-between pt-3 border-t border-[#1a1a1a]">
								<div>
									{template.isActive ? (
										<Badge variant="green" className="text-[10px]">
											<CheckCircle2 size={11} />
											Actif
										</Badge>
									) : (
										<Badge variant="gray" className="text-[10px]">
											Inactif
										</Badge>
									)}
								</div>

								<TemplateActions
									template={template}
									onEdit={(e) => {
										e.stopPropagation();
										openExistingEditor(template);
									}}
									onActivate={(e) => {
										e.stopPropagation();
										handleActivate(template);
									}}
									onDelete={(e) => {
										e.stopPropagation();
										handleDelete(template);
									}}
									activating={activatingId === template.id}
									deleting={deletingId === template.id}
								/>
							</div>
						</div>
					))
				)}
			</div>

			<EditorPanel
				state={editor}
				loadingHtml={loadingHtml}
				saving={saving}
				onClose={closeEditor}
				onChange={handleEditorChange}
				onInsertVariable={handleInsertVariable}
				onSave={handleSave}
			/>
		</div>
	);
}
