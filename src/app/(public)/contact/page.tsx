import type { Metadata } from "next";
import ContactContent from "./ContactContent";

export const metadata: Metadata = {
	title: "Contact | Spoon",
	description: "Contactez le restaurant Spoon à Saint-Denis de La Réunion. Formulaire de contact, adresse, téléphone et horaires d'ouverture.",
};

export default function ContactPage() {
	return <ContactContent />;
}
