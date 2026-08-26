import { prisma } from "@/lib/prisma";
import {
	uploadRawTextToCloudinary,
	deleteCloudinaryRaw,
	fetchRawTextFromCloudinary,
} from "@/lib/cloudinary";
import { slugify } from "@/lib/utils";
import type { InvoiceTemplate, InvoiceType } from "@/types";

const TEMPLATES_FOLDER = "spoon/invoices/templates";

export async function listInvoiceTemplates(type?: InvoiceType): Promise<InvoiceTemplate[]> {
	return prisma.invoiceTemplate.findMany({
		where: type ? { type } : undefined,
		orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }],
	});
}

export async function getInvoiceTemplateById(id: string): Promise<InvoiceTemplate | null> {
	return prisma.invoiceTemplate.findUnique({ where: { id } });
}

/** Récupère le HTML source d'un template (proxy Cloudinary → texte). */
export async function getInvoiceTemplateHtml(template: Pick<InvoiceTemplate, "cloudinaryUrl">): Promise<string> {
	return fetchRawTextFromCloudinary(template.cloudinaryUrl);
}

/** Retourne le template actif pour un type de facture donné, ou null si aucun. */
export async function getActiveInvoiceTemplate(type: InvoiceType): Promise<InvoiceTemplate | null> {
	return prisma.invoiceTemplate.findFirst({ where: { type, isActive: true } });
}

interface CreateTemplateInput {
	name: string;
	type: InvoiceType;
	html: string;
	setActive?: boolean;
}

export async function createInvoiceTemplate(input: CreateTemplateInput): Promise<InvoiceTemplate> {
	const { name, type, html, setActive } = input;

	const publicId = `${TEMPLATES_FOLDER}/${type.toLowerCase()}/${slugify(name)}-${Date.now()}`;
	const uploaded = await uploadRawTextToCloudinary(html, publicId);

	return prisma.$transaction(async (tx) => {
		if (setActive) {
			await tx.invoiceTemplate.updateMany({
				where: { type, isActive: true },
				data: { isActive: false },
			});
		}

		return tx.invoiceTemplate.create({
			data: {
				name,
				type,
				isActive: !!setActive,
				cloudinaryUrl: uploaded.url,
				cloudinaryPublicId: uploaded.publicId,
			},
		});
	});
}

interface UpdateTemplateInput {
	name?: string;
	html?: string;
	setActive?: boolean;
}

export async function updateInvoiceTemplate(
	id: string,
	input: UpdateTemplateInput
): Promise<InvoiceTemplate> {
	const existing = await prisma.invoiceTemplate.findUniqueOrThrow({ where: { id } });

	let cloudinaryUrl = existing.cloudinaryUrl;
	let cloudinaryPublicId = existing.cloudinaryPublicId;

	if (input.html !== undefined) {
		// Réutilise le même public_id complet pour écraser le fichier existant sur Cloudinary.
		const uploaded = await uploadRawTextToCloudinary(input.html, existing.cloudinaryPublicId);
		cloudinaryUrl = uploaded.url;
		cloudinaryPublicId = uploaded.publicId;
	}

	return prisma.$transaction(async (tx) => {
		if (input.setActive) {
			await tx.invoiceTemplate.updateMany({
				where: { type: existing.type, isActive: true, NOT: { id } },
				data: { isActive: false },
			});
		}

		return tx.invoiceTemplate.update({
			where: { id },
			data: {
				name: input.name ?? undefined,
				cloudinaryUrl,
				cloudinaryPublicId,
				isActive: input.setActive !== undefined ? input.setActive : undefined,
			},
		});
	});
}

export async function deleteInvoiceTemplate(id: string): Promise<void> {
	const existing = await prisma.invoiceTemplate.findUniqueOrThrow({ where: { id } });

	await prisma.invoiceTemplate.delete({ where: { id } });

	// Best-effort : on ne bloque pas la suppression en base si Cloudinary échoue.
	try {
		await deleteCloudinaryRaw(existing.cloudinaryPublicId);
	} catch (error) {
		console.error("[invoice-template.service] échec suppression Cloudinary:", error);
	}
}
