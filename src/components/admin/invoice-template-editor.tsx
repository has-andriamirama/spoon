"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
	ArrowLeft,
	Save,
	Play,
	RotateCw,
	Braces,
	ZoomIn,
	ZoomOut,
	Maximize2,
	FileCode2,
	Circle,
	X,
} from "lucide-react";
import toast from "react-hot-toast";
import { cn, getErrorMessage } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
	INVOICE_TEMPLATE_VARIABLES,
	buildSampleVariables,
	injectTemplateVariables,
} from "@/lib/pdf/template-variables";
import TemplateCodeEditor, {
	type TemplateCodeEditorHandle,
} from "@/components/admin/template-code-editor";

type InvoiceType = "DEPOSIT" | "ADDITION";

const TYPE_META: Record<InvoiceType, { label: string }> = {
	DEPOSIT: { label: "Acompte" },
	ADDITION: { label: "Addition" },
};

const SAMPLE_VARIABLES = buildSampleVariables();

const PDF_PAGE_WIDTH = 794;
const PDF_PAGE_HEIGHT = 1123;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2;
const VIEWPORT_PADDING = 32;

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

interface VariableGroup {
	label: string;
	keys: string[];
}

function buildVariableGroups(type: InvoiceType): VariableGroup[] {
	const visible = INVOICE_TEMPLATE_VARIABLES.filter(
		(v) => !v.types || v.types.includes(type)
	);
	const groups: Record<string, string[]> = {
		Facture: [],
		Client: [],
		Restaurant: [],
		Articles: [],
	};
	for (const v of visible) {
		if (v.key.startsWith("restaurant") || v.key.startsWith("logo")) {
			groups.Restaurant.push(v.key);
		} else if (v.key.startsWith("customer")) {
			groups.Client.push(v.key);
		} else if (v.key.startsWith("items")) {
			groups.Articles.push(v.key);
		} else {
			groups.Facture.push(v.key);
		}
	}
	return Object.entries(groups)
		.filter(([, keys]) => keys.length > 0)
		.map(([label, keys]) => ({ label, keys }));
}

function variableLabel(key: string): string {
	return INVOICE_TEMPLATE_VARIABLES.find((v) => v.key === key)?.label ?? key;
}

export interface TemplateEditorInitialData {
	id: string | null;
	type: InvoiceType;
	name: string;
	html: string;
	isActive: boolean;
}

interface Props {
	initial: TemplateEditorInitialData;
	isFirstOfType: boolean;
}

export default function TemplateEditorClient({ initial, isFirstOfType }: Props) {
	const router = useRouter();
	const isNew = initial.id === null;

	const [type, setType] = useState<InvoiceType>(initial.type);
	const [name, setName] = useState(initial.name);
	const [html, setHtml] = useState(initial.html);
	const [setActive, setSetActive] = useState(isNew ? isFirstOfType : initial.isActive);
	const [saving, setSaving] = useState(false);

	const [previewHtml, setPreviewHtml] = useState<string | null>(null);
	const [previewStale, setPreviewStale] = useState(false);
	const [varPanelOpen, setVarPanelOpen] = useState(false);

	const [zoom, setZoom] = useState(1);
	const [fitToWidthMode, setFitToWidthMode] = useState(true);
	const [pageCount, setPageCount] = useState(1);

	const editorRef = useRef<TemplateCodeEditorHandle>(null);
	const iframeRef = useRef<HTMLIFrameElement>(null);
	const viewportRef = useRef<HTMLDivElement>(null);
	const savedSnapshot = useRef({ name: initial.name, html: initial.html, type: initial.type });

	const dirty =
		name !== savedSnapshot.current.name ||
		html !== savedSnapshot.current.html ||
		type !== savedSnapshot.current.type;

	const variableGroups = useMemo(() => buildVariableGroups(type), [type]);

	const markHtmlChanged = useCallback((value: string) => {
		setHtml(value);
		setPreviewStale(true);
	}, []);

	const handleTypeChange = useCallback((t: InvoiceType) => {
		setType(t);
		setPreviewStale(true);
	}, []);

	const runPreview = useCallback(() => {
		setPreviewHtml(injectTemplateVariables(html, SAMPLE_VARIABLES));
		setPreviewStale(false);
	}, [html]);

	const measurePages = useCallback(() => {
		const iframe = iframeRef.current;
		if (!iframe) return;
		let contentHeight = PDF_PAGE_HEIGHT;
		try {
			const doc = iframe.contentDocument;
			if (doc) {
				contentHeight = Math.max(
					doc.documentElement?.scrollHeight ?? 0,
					doc.body?.scrollHeight ?? 0,
					PDF_PAGE_HEIGHT
				);
			}
		} catch {
			contentHeight = PDF_PAGE_HEIGHT;
		}
		setPageCount(Math.max(1, Math.ceil(contentHeight / PDF_PAGE_HEIGHT)));
	}, []);

	const handleIframeLoad = useCallback(() => {
		measurePages();
		const timers = [150, 500].map((delay) => window.setTimeout(measurePages, delay));
		return () => timers.forEach((t) => window.clearTimeout(t));
	}, [measurePages]);

	const computeFitZoom = useCallback(() => {
		const el = viewportRef.current;
		if (!el) return 1;
		const available = el.clientWidth - VIEWPORT_PADDING;
		if (available <= 0) return 1;
		return clamp(available / PDF_PAGE_WIDTH, MIN_ZOOM, MAX_ZOOM);
	}, []);

	useEffect(() => {
		if (!fitToWidthMode) return;
		const el = viewportRef.current;
		if (!el) return;
		const apply = () => setZoom(computeFitZoom());
		apply();
		const observer = new ResizeObserver(apply);
		observer.observe(el);
		return () => observer.disconnect();
	}, [fitToWidthMode, computeFitZoom, previewHtml]);

	const zoomBy = useCallback((delta: number) => {
		setFitToWidthMode(false);
		setZoom((z) => clamp(Math.round((z + delta) * 100) / 100, MIN_ZOOM, MAX_ZOOM));
	}, []);

	const resetZoom = useCallback(() => {
		setFitToWidthMode(false);
		setZoom(1);
	}, []);

	const fitToWidth = useCallback(() => {
		setFitToWidthMode(true);
	}, []);

	const handleInsertVariable = useCallback((key: string) => {
		editorRef.current?.insertText(`{{${key}}}`);
	}, []);

	const goBack = useCallback(() => {
		if (dirty && !window.confirm("Des modifications ne sont pas enregistrées. Quitter quand même ?")) {
			return;
		}
		router.push("/admin/invoices/templates");
	}, [dirty, router]);

	const handleSave = useCallback(async () => {
		if (!name.trim()) {
			toast.error("Le nom du template est requis");
			return;
		}
		if (!html.trim()) {
			toast.error("Le contenu HTML est requis");
			return;
		}

		setSaving(true);
		try {
			const url = isNew
				? "/api/admin/invoice-templates"
				: `/api/admin/invoice-templates/${initial.id}`;
			const method = isNew ? "POST" : "PATCH";
			const body = isNew
				? { name, type, html, setActive }
				: { name, html, setActive };

			const res = await fetch(url, {
				method,
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
			});
			if (!res.ok) {
				const err = await res.json().catch(() => null);
				throw new Error(err?.error ?? "Échec de l'enregistrement");
			}

			savedSnapshot.current = { name, html, type };
			toast.success(isNew ? "Template créé" : "Template mis à jour");
			router.push("/admin/invoices/templates");
		} catch (error) {
			toast.error(getErrorMessage(error, "Erreur lors de l'enregistrement du template"));
		} finally {
			setSaving(false);
		}
	}, [html, initial.id, isNew, name, router, setActive, type]);

	const lineCount = html.split("\n").length;
	const charCount = html.length;

	return (
		<div className="min-h-full flex flex-col">
			<div className="flex items-center gap-3 mb-4">
				<button
					onClick={goBack}
					className="p-1.5 -ml-1.5 rounded-lg text-[#5A5249] hover:text-[#F5F0EB] hover:bg-[#1a1a1a] transition-colors shrink-0"
					aria-label="Retour aux templates"
				>
					<ArrowLeft size={16} />
				</button>
				<div>
					<h1 className="font-display text-2xl text-[#F5F0EB] leading-tight">
						{isNew ? "Nouveau template" : "Modifier le template"}
					</h1>
					<p className="text-xs text-[#5A5249] mt-0.5">
						Éditez le HTML puis lancez l&apos;aperçu manuellement avec Play
					</p>
				</div>
			</div>

			<div className="flex-1 flex flex-col rounded-xl border border-[#222] bg-[#0A0A0A] overflow-hidden h-[75vh] min-h-[560px] max-h-[860px] relative">
				<div className="flex items-center gap-2 sm:gap-3 border-b border-[#222] px-3 sm:px-4 py-2.5 sm:py-3 shrink-0">
					<div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[#C8973A]/10 border border-[#C8973A]/20 flex items-center justify-center shrink-0">
						<FileCode2 size={16} className="text-[#C8973A]" />
					</div>

					<input
					value={name}
					onChange={(e) => setName(e.target.value)}
					placeholder="Nom du template"
					className="min-w-[70px] sm:min-w-[160px] max-w-[320px] flex-1 sm:flex-none bg-transparent text-sm font-semibold text-[#F5F0EB] placeholder:text-[#5A5249] rounded-md px-2 py-1.5 outline-none focus:bg-[#1a1a1a] transition-colors"
				/>

				<div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
					{(Object.keys(TYPE_META) as InvoiceType[]).map((t) => (
						<button
							key={t}
							disabled={!isNew}
							onClick={() => handleTypeChange(t)}
							className={cn(
								"px-2 sm:px-2.5 h-7 rounded-full border text-[11px] font-medium transition-all whitespace-nowrap",
								type === t
									? "bg-[#C8973A]/10 border-[#C8973A]/30 text-[#C8973A]"
									: "border-[#222] text-[#5A5249]",
								isNew && type !== t && "hover:border-[#333] hover:text-[#9A8F84]",
								!isNew && "opacity-70 cursor-default"
							)}
						>
							{TYPE_META[t].label}
						</button>
					))}
				</div>

				<div className="ml-auto flex items-center gap-2 sm:gap-3 shrink-0">
					{dirty && (
						<span className="hidden sm:flex items-center gap-1.5 text-[11px] text-[#C8973A]">
							<Circle size={6} className="fill-[#C8973A]" />
							Non enregistré
						</span>
					)}
					<Button
						onClick={handleSave}
						loading={saving}
						size="sm"
						aria-label="Enregistrer"
						className="shrink-0 px-2.5 gap-1.5 sm:px-3 sm:gap-2"
					>
						<Save size={14} className="shrink-0" />
						<span className="hidden sm:inline">Enregistrer</span>
					</Button>
				</div>
			</div>

			<div className="flex flex-1 min-h-0 relative">
				<div className="w-11 shrink-0 border-r border-[#222] flex flex-col items-center pt-3 gap-3">
					<button
						onClick={() => setVarPanelOpen((v) => !v)}
						aria-label="Afficher les variables"
						aria-pressed={varPanelOpen}
						className={cn(
							"p-2 rounded-lg transition-colors",
							varPanelOpen
								? "text-[#C8973A] bg-[#C8973A]/10"
								: "text-[#5A5249] hover:text-[#9A8F84] hover:bg-[#1a1a1a]"
						)}
					>
						<Braces size={17} />
					</button>
				</div>

				<div className="flex-1 min-w-0 flex flex-col lg:flex-row gap-3 p-3">
					<div className="flex-1 min-w-0 flex flex-col min-h-[260px]">
						<div className="flex items-center h-7 gap-2 px-1 shrink-0">
							<FileCode2 size={12} className="text-[#C8973A] shrink-0" />
							<span className="text-[11px] text-[#9A8F84] leading-none">template.html</span>
							<span className="ml-auto text-[10px] text-[#5A5249] hidden sm:inline leading-none">
								Tab pour indenter
							</span>
						</div>
						<TemplateCodeEditor
							textareaId="invoice-template-html"
							value={html}
							onChange={markHtmlChanged}
							onRunShortcut={runPreview}
							ref={editorRef}
							className="flex-1 mt-2"
						/>
					</div>

					<div className="flex-1 min-w-0 flex flex-col min-h-[260px]">
						<div className="flex items-center h-7 gap-1 px-1 shrink-0">
							<span className="text-[11px] text-[#9A8F84] leading-none mr-1">Aperçu</span>

							<div className="flex items-center gap-0.5 rounded-md border border-[#1c1c1c] bg-[#0A0A0A] px-0.5">
								<button
									onClick={() => zoomBy(-0.1)}
									disabled={!previewHtml || zoom <= MIN_ZOOM}
									aria-label="Zoom arrière"
									title="Zoom arrière"
									className="p-1 rounded text-[#9A8F84] hover:text-[#F5F0EB] hover:bg-[#1a1a1a] disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
								>
									<ZoomOut size={12} />
								</button>
								<button
									onClick={resetZoom}
									disabled={!previewHtml}
									aria-label="Réinitialiser le zoom à 100%"
									title="Réinitialiser le zoom (100%)"
									className="w-11 text-center text-[10px] tabular-nums text-[#9A8F84] hover:text-[#F5F0EB] disabled:opacity-30 transition-colors"
								>
									{Math.round(zoom * 100)}%
								</button>
								<button
									onClick={() => zoomBy(0.1)}
									disabled={!previewHtml || zoom >= MAX_ZOOM}
									aria-label="Zoom avant"
									title="Zoom avant"
									className="p-1 rounded text-[#9A8F84] hover:text-[#F5F0EB] hover:bg-[#1a1a1a] disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
								>
									<ZoomIn size={12} />
								</button>
								<button
									onClick={fitToWidth}
									disabled={!previewHtml}
									aria-label="Ajuster à la largeur"
									aria-pressed={fitToWidthMode}
									title="Ajuster à la largeur"
									className={cn(
										"p-1 rounded transition-colors disabled:opacity-30",
										fitToWidthMode
											? "text-[#C8973A] bg-[#C8973A]/10"
											: "text-[#9A8F84] hover:text-[#F5F0EB] hover:bg-[#1a1a1a]"
									)}
								>
									<Maximize2 size={12} />
								</button>
							</div>

							{previewHtml && pageCount > 1 && (
								<span className="text-[10px] text-[#5A5249] ml-1.5 truncate hidden sm:inline">
									{pageCount} pages A4
								</span>
							)}

							{previewHtml && previewStale && (
								<span className="text-[10px] text-[#C8973A] ml-2 truncate">
									Aperçu non à jour
								</span>
							)}

							<button
								onClick={runPreview}
								aria-label={previewHtml ? "Relancer l'aperçu" : "Lancer l'aperçu"}
								title={previewHtml ? "Relancer l'aperçu" : "Lancer l'aperçu"}
								className="ml-auto p-1 rounded-md text-[#C8973A] hover:bg-[#C8973A]/10 transition-colors"
							>
								{previewHtml ? <RotateCw size={13} /> : <Play size={13} />}
							</button>
						</div>

						<div
							ref={viewportRef}
							className="flex-1 mt-2 rounded-lg border border-[#222] bg-[#050505] overflow-auto"
						>
							{previewHtml ? (
								<div className="min-h-full w-max min-w-full flex justify-center p-4">
									<div
										style={{
											width: PDF_PAGE_WIDTH * zoom,
											height: pageCount * PDF_PAGE_HEIGHT * zoom,
										}}
										className="shrink-0"
									>
										<div
											style={{
												width: PDF_PAGE_WIDTH,
												height: pageCount * PDF_PAGE_HEIGHT,
												transform: `scale(${zoom})`,
												transformOrigin: "top left",
											}}
											className="relative bg-white shadow-[0_2px_24px_rgba(0,0,0,0.5)]"
										>
											<iframe
												ref={iframeRef}
												title="Aperçu du template"
												srcDoc={previewHtml}
												sandbox="allow-same-origin"
												onLoad={handleIframeLoad}
												style={{
													width: PDF_PAGE_WIDTH,
													height: pageCount * PDF_PAGE_HEIGHT,
													border: "none",
													display: "block",
												}}
											/>
											{Array.from({ length: pageCount - 1 }, (_, i) => (
												<div
													key={i}
													style={{ top: (i + 1) * PDF_PAGE_HEIGHT }}
													className="pointer-events-none absolute left-0 right-0 border-t-2 border-dashed border-[#C8973A]/50"
												>
													<span className="absolute -top-[18px] right-2 text-[9px] font-medium text-[#8a6a24] bg-[#F5F0EB] px-1.5 py-0.5 rounded-sm shadow-sm">
														Page {i + 2}
													</span>
												</div>
											))}
										</div>
									</div>
								</div>
							) : (
								<div className="h-full flex items-center justify-center">
									<div className="text-center text-[#4A453F] px-4">
										<Play size={24} className="mx-auto mb-2" />
										<p className="text-xs">Cliquez sur Play pour générer l&apos;aperçu</p>
										<p className="text-[10px] mt-1 text-[#3A3630]">Ctrl / Cmd + Entrée</p>
									</div>
								</div>
							)}
						</div>
					</div>
				</div>

				<div
					onClick={() => setVarPanelOpen(false)}
					aria-hidden="true"
					className={cn(
						"absolute inset-0 z-10 bg-black/50 transition-opacity duration-200",
						varPanelOpen
							? "opacity-100 pointer-events-auto"
							: "opacity-0 pointer-events-none"
					)}
				/>

				<div
					role="dialog"
					aria-label="Variables disponibles"
					className={cn(
						"absolute inset-y-0 right-0 z-20 w-72 max-w-[85vw] border-l border-[#222] bg-[#0F0F0F] shadow-2xl transition-transform duration-200 ease-out flex flex-col",
						varPanelOpen ? "translate-x-0" : "translate-x-full"
					)}
				>
					<div className="flex items-center gap-2 border-b border-[#222] px-3 h-11 shrink-0">
						<Braces size={13} className="text-[#C8973A]" />
						<p className="text-[10px] uppercase tracking-wider text-[#9A8F84]">
							Variables — clic pour insérer
						</p>
						<button
							onClick={() => setVarPanelOpen(false)}
							aria-label="Fermer le panneau des variables"
							className="ml-auto p-1 rounded-md text-[#5A5249] hover:text-[#F5F0EB] hover:bg-[#1a1a1a] transition-colors"
						>
							<X size={14} />
						</button>
					</div>
					<div className="flex-1 overflow-y-auto p-3">
						{variableGroups.map((group) => (
							<div key={group.label} className="mb-3">
								<p className="text-[10px] text-[#4A453F] mb-1.5 px-1">{group.label}</p>
								<div className="flex flex-col gap-1">
									{group.keys.map((key) => (
										<button
											key={key}
											onClick={() => handleInsertVariable(key)}
											title={variableLabel(key)}
											className="text-left font-mono text-[11px] px-2 py-1.5 rounded-md bg-[#0A0A0A] border border-[#222] text-[#C8973A] hover:border-[#C8973A]/40 hover:bg-[#C8973A]/5 transition-colors truncate"
										>
											{`{{${key}}}`}
										</button>
									))}
								</div>
							</div>
						))}
						{type === "ADDITION" && (
							<p className="text-[10px] text-[#5A5249] leading-relaxed mt-2 px-1">
								<span className="text-[#9A8F84] font-medium">{`{{itemsRows}}`}</span> insère
								une ligne <code>&lt;tr&gt;</code> par plat commandé — placez-la dans un{" "}
								<code>&lt;tbody&gt;</code> d&apos;un tableau à 4 colonnes.
							</p>
						)}
					</div>
				</div>
			</div>

			<div className="flex items-center gap-4 border-t border-[#222] px-4 py-2 shrink-0 text-[10px] text-[#5A5249]">
				<label className="flex items-center gap-2 text-[11px] text-[#9A8F84] cursor-pointer select-none">
					<input
						type="checkbox"
						checked={setActive}
						onChange={(e) => setSetActive(e.target.checked)}
						className="w-3.5 h-3.5 rounded border-[#222] bg-[#0A0A0A] accent-[#C8973A]"
					/>
					Définir comme template actif pour « {TYPE_META[type].label} »
				</label>
				<span className="ml-auto">{lineCount} lignes</span>
				<span>{charCount} caractères</span>
				<span className="hidden sm:inline text-[#4A453F]">
					L&apos;aperçu ne se met à jour qu&apos;au clic sur Play
				</span>
			</div>
			</div>
		</div>
	);
}
