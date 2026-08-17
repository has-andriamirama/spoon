// ─── Menu ─────────────────────────────────────────────────────────────────────

export interface MenuCategory {
	id: string;
	name: string;
	slug: string;
	description?: string | null;
	iconName?: string | null;
	order: number;
	isActive: boolean;
	createdAt: Date;
	updatedAt: Date;
}

export interface Dish {
	id: string;
	categoryId: string;
	name: string;
	slug: string;
	description?: string | null;
	price: number;
	imageUrl?: string | null;
	imagePublicId?: string | null;
	allergens: string[];
	dietaryTags: string[];
	isAvailable: boolean;
	isDailySpecial: boolean;
	order: number;
	createdAt: Date;
	updatedAt: Date;
}

export interface Image {
	id: string;
	dishId?: string | null;
	url: string;
	publicId: string;
	alt?: string | null;
	isPrimary: boolean;
	order: number;
	createdAt: Date;
	updatedAt: Date;
}

export interface ImageInput {
	id?: string;
	url: string;
	publicId: string;
	alt?: string;
	isPrimary: boolean;
	order: number;
	file?: File;
}

// ─── API Response ─────────────────────────────────────────────────────────────

export type ApiResponse<T> = {
	data: T;
	message?: string;
};

export type ApiError = {
	error: string;
	details?: unknown;
};

// ─── Auth / Users ─────────────────────────────────────────────────────────────

export interface User {
	id: string;
	email: string;
	firstName: string;
	lastName: string;
	phone?: string | null;
	role: "USER" | "ADMIN";
	emailVerified?: Date | null;
	createdAt: Date;
	updatedAt: Date;
}

// ─── Reservation ──────────────────────────────────────────────────────────────

export type ReservationStatus =
	| "PENDING"
	| "CONFIRMED"
	| "CANCELLED_BY_CUSTOMER"
	| "CANCELLED_BY_ADMIN"
	| "COMPLETED"
	| "NO_SHOW";

export interface Reservation {
	id: string;
	userId?: string | null;
	date: string;
	timeSlot: string;
	covers: number;
	status: ReservationStatus;
	guestFirstName: string;
	guestLastName: string;
	guestEmail: string;
	guestPhone: string;
	notes?: string | null;
	allergies?: string | null;
	cancellationReason?: string | null;
	depositRequired: boolean;
	depositAmount: number;
	depositPaid: boolean;
	createdAt: Date;
	updatedAt: Date;
}

// ─── Payments ─────────────────────────────────────────────────────────────────

export type PaymentStatus = "PENDING" | "SUCCEEDED" | "FAILED" | "REFUNDED";

export interface Payment {
	id: string;
	reservationId: string;
	stripePaymentIntentId?: string | null;
	stripeSessionId?: string | null;
	amount: number;
	currency: string;
	status: PaymentStatus;
	refundedAt?: Date | null;
	createdAt: Date;
	updatedAt: Date;
}

// ─── Events ───────────────────────────────────────────────────────────────────

export interface Event {
	id: string;
	title: string;
	description?: string | null;
	date: string;
	startTime: string;
	endTime?: string | null;
	imageUrl?: string | null;
	isPublic: boolean;
	createdAt: Date;
	updatedAt: Date;
}

// ─── Notifications ────────────────────────────────────────────────────────────

export interface Notification {
	id: string;
	type: string;
	title: string;
	message: string;
	isRead: boolean;
	data?: Record<string, unknown> | null;
	createdAt: Date;
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export interface RestaurantSettings {
	id: string;
	name: string;
	tagline?: string | null;
	description?: string | null;
	phone?: string | null;
	email?: string | null;
	address?: string | null;
	googleMapsUrl?: string | null;
	facebookUrl?: string | null;
	instagramUrl?: string | null;
	depositRequired: boolean;
	depositAmountPerCover: number;
	freeCancellationHours: number;
	maxCoversPerSlot: number;
	minBookingNoticeHours: number;
	maxBookingAdvanceDays: number;
	autoConfirmReservations: boolean;
}
