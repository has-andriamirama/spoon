"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import Link from "next/link";
import {
	ArrowLeft,
	Plus,
	Pencil,
	Trash2,
	CheckCircle2,
	Loader2,
	Save,
	X,
	FileCode2,
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

const TYPE_META: Record<InvoiceType, { label: string; plural: string }> = {
	DEPOSIT:  { label: "Acompte",  plural: "templates d'acompte" },
	ADDITION: { label: "Addition", plural: "templates d'addition" },
};

const SAMPLE_VARIABLES = buildSampleVariables();

function TypeTabs({
	value,
	onChange,
	counts,
}: {
	value: InvoiceType;
	onChange: (t: InvoiceType) => void;
	counts: Record<InvoiceType, number>;
}) {
	return (
		<div className="flex items-center gap-2">
			{(Object.keys(TYPE_META) as InvoiceType[]).map((t) => (
				<button
					key={t}
					onClick={() => onChange(t)}
					className={cn(
						"flex items-center gap-1.5 px-3 h-8 rounded-full border text-xs font-medium transition-all whitespace-nowrap",
						value === t
							? "bg-[#C8973A]/10 border-[#C8973A]/30 text-[#C8973A]"
							: "border-[#222] text-[#5A5249] hover:border-[#333] hover:text-[#9A8F84]"
					)}
				>
					{TYPE_META[t].label}
					<span
						className={cn(
							"text-[10px] px-1.5 py-0.5 rounded-full font-semibold",
							value === t ? "bg-white/10" : "bg-[#1a1a1a] text-[#5A5249]"
						)}
					>
						{counts[t]}
					</span>
				</button>
			))}
		</div>
	);
}

function TemplateCard({
	template,
	onEdit,
	onActivate,
	onDelete,
	activating,
	deleting,
}: {
	template: Template;
	onEdit: () => void;
	onActivate: () => void;
	onDelete: () => void;
	activating: boolean;
	deleting: boolean;
}) {
	return (
		<div className="bg-[#141414] border border-[#222] rounded-xl p-4 flex flex-col gap-3">
			<div className="flex items-start justify-between gap-2">
				<div className="min-w-0">
					<p className="text-sm font-medium text-[#F5F0EB] truncate">{template.name}</p>
					<p className="text-xs text-[#5A5249] mt-0.5">
						Modifié le {formatDateTime(template.updatedAt)}
					</p>
				</div>
				{template.isActive ? (
					<Badge variant="gold" className="text-[10px] shrink-0">
						<CheckCircle2 size={11} />
						Actif
					</Badge>
				) : (
					<Badge variant="gray" className="text-[10px] shrink-0">
						Inactif
					</Badge>
				)}
			</div>

			<div className="flex items-center gap-2 mt-auto">
				<Button variant="secondary" size="sm" className="flex-1" onClick={onEdit}>
					<Pencil size={13} />
					Modifier
				</Button>
				{!template.isActive && (
					<Button
						variant="outline"
						size="sm"
						className="flex-1"
						onClick={onActivate}
						loading={activating}
					>
						Activer
					</Button>
				)}
				<Button
					variant="ghost"
					size="icon"
					className="h-8 w-8 shrink-0 text-red-400/70 hover:text-red-400 hover:bg-red-500/10"
					onClick={onDelete}
					disabled={deleting}
					aria-label="Supprimer le template"
				>
					{deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
				</Button>
			</div>
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
									<p className="text-xs text-[#5A5249] truncate">
										{TYPE_META[state.type].label}
									</p>
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
	const [typeTab, setTypeTab] = useState<InvoiceType>("DEPOSIT");
	const [editor, setEditor] = useState<EditorState | null>(null);
	const [loadingHtml, setLoadingHtml] = useState(false);
	const [saving, setSaving] = useState(false);
	const [activatingId, setActivatingId] = useState<string | null>(null);
	const [deletingId, setDeletingId] = useState<string | null>(null);

	const counts = useMemo(
		() => ({
			DEPOSIT: templates.filter((t) => t.type === "DEPOSIT").length,
			ADDITION: templates.filter((t) => t.type === "ADDITION").length,
		}),
		[templates]
	);

	const visibleTemplates = useMemo(
		() => templates.filter((t) => t.type === typeTab),
		[templates, typeTab]
	);

	const openNewEditor = useCallback(() => {
		setEditor({ id: null, type: typeTab, name: "", html: "", setActive: visibleTemplates.length === 0 });
	}, [typeTab, visibleTemplates.length]);

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
				cur.map((t) =>
					t.type === template.type ? { ...t, isActive: t.id === template.id } : t
				)
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
			<div className="flex items-center gap-3 mb-1">
				<Link
					href="/admin/invoices"
					className="p-1.5 -ml-1.5 rounded-lg text-[#5A5249] hover:text-[#F5F0EB] hover:bg-[#1a1a1a] transition-colors"
					aria-label="Retour aux factures"
				>
					<ArrowLeft size={16} />
				</Link>
				<h1 className="font-display text-3xl text-[#F5F0EB] leading-tight">
					Templates de factures
				</h1>
			</div>
			<p className="text-sm text-[#5A5249] mt-1 mb-6 ml-8">
				Gérez les templates HTML utilisés pour générer les PDF de factures d&apos;acompte et
				d&apos;addition.
			</p>

			<div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
				<TypeTabs value={typeTab} onChange={setTypeTab} counts={counts} />
				<Button size="sm" onClick={openNewEditor}>
					<Plus size={14} />
					Nouveau template
				</Button>
			</div>

			{visibleTemplates.length === 0 ? (
				<div className="flex flex-col items-center justify-center py-16 gap-3 text-center bg-[#141414] border border-[#222] rounded-xl">
					<div className="w-12 h-12 rounded-full bg-[#1a1a1a] flex items-center justify-center">
						<FileCode2 size={20} className="text-[#5A5249]" />
					</div>
					<p className="text-sm text-[#5A5249]">
						Aucun {TYPE_META[typeTab].plural.slice(0, -1)} pour l&apos;instant
					</p>
					<p className="text-xs text-[#5A5249] max-w-xs">
						Sans template actif, un modèle par défaut minimal est utilisé automatiquement pour
						ne jamais bloquer la génération des factures.
					</p>
				</div>
			) : (
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
					{visibleTemplates.map((template) => (
						<TemplateCard
							key={template.id}
							template={template}
							onEdit={() => openExistingEditor(template)}
							onActivate={() => handleActivate(template)}
							onDelete={() => handleDelete(template)}
							activating={activatingId === template.id}
							deleting={deletingId === template.id}
						/>
					))}
				</div>
			)}

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
