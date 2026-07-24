// EU 14 major allergens
export const ALLERGENS = [
  { id: "gluten", label: "Gluten" },
  { id: "shellfish", label: "Crustacés" },
  { id: "eggs", label: "Œufs" },
  { id: "fish", label: "Poisson" },
  { id: "peanuts", label: "Arachides" },
  { id: "soy", label: "Soja" },
  { id: "dairy", label: "Lait" },
  { id: "tree-nuts", label: "Fruits à coque" },
  { id: "celery", label: "Céleri" },
  { id: "mustard", label: "Moutarde" },
  { id: "sesame", label: "Sésame" },
  { id: "sulphites", label: "Anhydride sulfureux" },
  { id: "lupin", label: "Lupin" },
  { id: "molluscs", label: "Mollusques" },
] as const;

export const DIETARY_TAGS = [
  { id: "vegetarian", label: "Végétarien", color: "green" },
  { id: "vegan", label: "Vegan", color: "emerald" },
  { id: "gluten-free", label: "Sans gluten", color: "yellow" },
  { id: "spicy", label: "Épicé", color: "red" },
  { id: "chef-special", label: "Spécialité du chef", color: "amber" },
] as const;

export const GALLERY_CATEGORIES = [
  { id: "DINING_ROOM", label: "Salle" },
  { id: "DISHES", label: "Plats" },
  { id: "EVENTS", label: "Événements" },
  { id: "TEAM", label: "Équipe" },
  { id: "EXTERIOR", label: "Extérieur" },
] as const;

export const RESERVATION_STATUSES = {
  PENDING: { label: "En attente", color: "yellow" },
  CONFIRMED: { label: "Confirmée", color: "green" },
  CANCELLED_BY_CUSTOMER: { label: "Annulée", color: "red" },
  CANCELLED_BY_ADMIN: { label: "Annulée", color: "red" },
  COMPLETED: { label: "Terminée", color: "gray" },
  NO_SHOW: { label: "Absent", color: "orange" },
} as const;

export const PAYMENT_STATUSES = {
  NONE: { label: "Aucun", color: "gray" },
  PENDING: { label: "En attente", color: "yellow" },
  PAID: { label: "Payé", color: "green" },
  REFUNDED: { label: "Remboursé", color: "blue" },
  PARTIALLY_REFUNDED: { label: "Partiellement remboursé", color: "blue" },
  FAILED: { label: "Échoué", color: "red" },
} as const;

export const EVENT_TYPES = [
  "Anniversaire",
  "Mariage",
  "Séminaire d'entreprise",
  "Repas de famille",
  "Baptême",
  "Soirée de gala",
  "Réunion professionnelle",
  "Autre",
];

export const DAYS_OF_WEEK = [
  "Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi",
];
