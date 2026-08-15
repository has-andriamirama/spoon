import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export function cn(...inputs: ClassValue[]): string {
	return twMerge(clsx(inputs));
}

export function formatPrice(amount: number): string {
	return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(amount);
}

export function formatDate(date: Date | string, pattern = "dd MMMM yyyy"): string {
	return format(new Date(date), pattern, { locale: fr });
}

export function formatDateTime(date: Date | string): string {
	return format(new Date(date), "dd/MM/yyyy à HH:mm", { locale: fr });
}

export function generateInvoiceNumber(): string {
	const year = new Date().getFullYear();
	const random = Math.floor(10000000 + Math.random() * 90000000);
	return `SPO-${year}-${random}`;
}

export function slugify(text: string): string {
	return text
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^a-z0-9 -]/g, "")
		.replace(/\s+/g, "-")
		.replace(/-+/g, "-")
		.trim();
}

export function capitalizeFirst(str: string): string {
	return str.charAt(0).toUpperCase() + str.slice(1);
}

export function getInitials(firstName: string, lastName: string): string {
	return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function truncate(str: string, maxLength: number): string {
	return str.length > maxLength ? `${str.slice(0, maxLength)}...` : str;
}

export function getErrorMessage(error: unknown, fallback = "Erreur"): string {
	return error instanceof Error ? error.message : fallback;
}
