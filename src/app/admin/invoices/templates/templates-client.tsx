"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
	ArrowLeft,
	Plus,
	Edit,
	Trash2,
	CheckCircle2,
	Loader2,
	FileCode2,
	Search,
	ChevronDown,
	X,
} from "lucide-react";
import toast from "react-hot-toast";
import { cn, formatDateTime, getErrorMessage } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

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

export default function TemplatesClient({ initialTemplates }: Props) {
	const router = useRouter();
	const [templates, setTemplates] = useState<Template[]>(initialTemplates);
	const [search, setSearch] = useState("");
	const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");
	const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
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
		router.push(`/admin/invoices/templates/new?type=${type}`);
	}, [typeFilter, router]);

	const openExistingEditor = useCallback(
		(template: Template) => {
			router.push(`/admin/invoices/templates/${template.id}`);
		},
		[router]
	);

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
		</div>
	);
}
