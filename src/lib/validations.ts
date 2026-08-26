import { z } from "zod";

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const registerSchema = z.object({
	firstName: z.string().min(2, "Prénom requis (min 2 caractères)"),
	lastName: z.string().min(2, "Nom requis (min 2 caractères)"),
	email: z.string().email("Adresse email invalide"),
	phone: z.string().optional(),
	password: z.string().min(8, "Mot de passe minimum 8 caractères"),
});

export const loginSchema = z.object({
	email: z.string().email("Email invalide"),
	password: z.string().min(1, "Mot de passe requis"),
});

export const changePasswordSchema = z
	.object({
		currentPassword: z.string().min(1, "Mot de passe actuel requis"),
		newPassword: z.string().min(8, "Minimum 8 caractères"),
		confirmPassword: z.string(),
	})
	.refine((d) => d.newPassword === d.confirmPassword, {
		message: "Les mots de passe ne correspondent pas",
		path: ["confirmPassword"],
	});

export const forgotPasswordSchema = z.object({
	email: z.string().email("Email invalide"),
});

export const resetPasswordSchema = z
	.object({
		token: z.string(),
		password: z.string().min(8, "Minimum 8 caractères"),
		confirmPassword: z.string(),
	})
	.refine((d) => d.password === d.confirmPassword, {
		message: "Les mots de passe ne correspondent pas",
		path: ["confirmPassword"],
	});

export const adminLoginSchema = z.object({
	username: z.string().min(1, "Nom d'utilisateur requis"),
	password: z.string().min(1, "Mot de passe requis"),
});

// ─── Reservation ──────────────────────────────────────────────────────────────

export const createReservationSchema = z.object({
	date: z.string().min(1, "Date requise"),
	timeSlot: z.string().min(1, "Créneau requis"),
	covers: z.number().int().min(1, "Minimum 1 couvert").max(20, "Maximum 20 couverts"),
	guestFirstName: z.string().min(2, "Prénom requis"),
	guestLastName: z.string().min(2, "Nom requis"),
	guestEmail: z.string().email("Email invalide"),
	guestPhone: z.string().min(8, "Téléphone requis"),
	notes: z.string().optional(),
	allergies: z.string().optional(),
});

export const updateReservationSchema = z.object({
	status: z.enum(["PENDING", "CONFIRMED", "CANCELLED_BY_CUSTOMER", "CANCELLED_BY_ADMIN", "COMPLETED", "NO_SHOW"]).optional(),
	cancellationReason: z.string().optional(),
	notes: z.string().optional(),
});

// ─── Menu ─────────────────────────────────────────────────────────────────────

export const createCategorySchema = z.object({
	name: z.string().min(2, "Nom requis"),
	description: z.string().optional(),
	iconName: z.string().optional(),
	order: z.number().int().optional(),
});

export const imageInputSchema = z.object({
	id:        z.string().optional(),
	url:       z.string().url("URL invalide"),
	publicId:  z.string().min(1, "publicId requis"),
	alt:       z.string().optional(),
	isPrimary: z.boolean().default(false),
	order:     z.number().int().default(0),
});

export const createDishSchema = z.object({
	categoryId:     z.string().min(1, "Catégorie requise"),
	name:           z.string().min(2, "Nom requis"),
	description:    z.string().optional(),
	price:          z.number().min(0, "Prix invalide"),
	imageUrl:       z.string().optional(),
	imagePublicId:  z.string().optional(),
	images:         z.array(imageInputSchema).optional(),
	allergens:      z.array(z.string()).optional(),
	dietaryTags:    z.array(z.string()).optional(),
	isAvailable:    z.boolean().optional(),
	isDailySpecial: z.boolean().optional(),
	order:          z.number().int().optional(),
});

// ─── Contact ──────────────────────────────────────────────────────────────────

export const contactSchema = z.object({
	name: z.string().min(2, "Nom requis"),
	email: z.string().email("Email invalide"),
	subject: z.string().min(2, "Sujet requis"),
	message: z.string().min(10, "Message trop court (min 10 caractères)"),
});

// ─── Event Request ────────────────────────────────────────────────────────────

export const eventRequestSchema = z.object({
	firstName: z.string().min(2, "Prénom requis"),
	lastName: z.string().min(2, "Nom requis"),
	email: z.string().email("Email invalide"),
	phone: z.string().min(8, "Téléphone requis"),
	eventType: z.string().min(1, "Type d'événement requis"),
	eventDate: z.string().optional(),
	guestCount: z.number().int().min(1).optional(),
	budget: z.string().optional(),
	message: z.string().min(10, "Message trop court"),
});

// ─── Special Offer ────────────────────────────────────────────────────────────

export const createSpecialOfferSchema = z.object({
	title: z.string().min(2, "Titre requis"),
	description: z.string().optional(),
	type: z.enum(["PERCENTAGE", "FIXED_AMOUNT", "FREE_ITEM"]),
	value: z.number().min(0),
	target: z.enum(["ALL", "REGISTERED", "SPECIFIC"]).optional(),
	promoCode: z.string().optional(),
	minCovers: z.number().int().optional(),
	isFirstOnly: z.boolean().optional(),
	isPublic: z.boolean().optional(),
	startDate: z.string(),
	endDate: z.string(),
	dishIds: z.array(z.string()).optional(),
	userIds: z.array(z.string()).optional(),
});

// ─── Profile ──────────────────────────────────────────────────────────────────

export const updateProfileSchema = z.object({
	firstName: z.string().min(2, "Prénom requis"),
	lastName: z.string().min(2, "Nom requis"),
	phone: z.string().optional(),
	dietaryPreferences: z.array(z.string()).optional(),
});

// ─── Settings ─────────────────────────────────────────────────────────────────

export const settingsSchema = z.object({
	name: z.string().min(1),
	tagline: z.string().optional(),
	description: z.string().optional(),
	phone: z.string().optional(),
	email: z.string().email().optional(),
	address: z.string().optional(),
	googleMapsUrl: z.string().optional(),
	facebookUrl: z.string().optional(),
	instagramUrl: z.string().optional(),
	depositRequired: z.boolean(),
	depositAmountPerCover: z.number().min(0),
	freeCancellationHours: z.number().int().min(0),
	maxCoversPerSlot: z.number().int().min(1),
	minBookingNoticeHours: z.number().int().min(0),
	maxBookingAdvanceDays: z.number().int().min(1),
	autoConfirmReservations: z.boolean(),
});

// ─── Invoice templates ────────────────────────────────────────────────────────

export const createInvoiceTemplateSchema = z.object({
	name: z.string().min(2, "Nom requis (min 2 caractères)"),
	type: z.enum(["DEPOSIT", "ADDITION"]),
	html: z.string().min(1, "Le contenu HTML est requis"),
	setActive: z.boolean().optional(),
});

export const updateInvoiceTemplateSchema = z.object({
	name: z.string().min(2, "Nom requis (min 2 caractères)").optional(),
	html: z.string().min(1, "Le contenu HTML est requis").optional(),
	setActive: z.boolean().optional(),
});
