import "dotenv/config";
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
	console.log("Seeding database...");

	// Super admin
	const existingAdmin = await prisma.admin.findUnique({ where: { username: "admin" } });
	if (!existingAdmin) {
		await prisma.admin.create({
			data: {
				username: "admin",
				passwordHash: await bcrypt.hash("admin", 12),
				role: Role.SUPER_ADMIN,
				mustChangePassword: true,
			},
		});
		console.log("Super admin created (admin/admin)");
	}

	// Restaurant settings
	const existingSettings = await prisma.restaurantSettings.findFirst();
	if (!existingSettings) {
		await prisma.restaurantSettings.create({
			data: {
				name: "Spoon",
				tagline: "La cuisine créole élevée au rang d'art",
				description: "Au cœur de Saint-Denis, Spoon vous propose une expérience gastronomique unique, mêlant les saveurs authentiques de La Réunion à une cuisine créative et raffinée.",
				phone: "+262 692 12 34 56",
				email: "contact@spoon.re",
				address: "12 Rue de Paris, 97400 Saint-Denis, La Réunion",
				googleMapsUrl: "https://maps.google.com",
				facebookUrl: "https://facebook.com/spoon.re",
				instagramUrl: "https://instagram.com/spoon.re",
				depositRequired: true,
				depositAmountPerCover: 20,
				freeCancellationHours: 48,
				maxCoversPerSlot: 40,
				minBookingNoticeHours: 2,
				maxBookingAdvanceDays: 60,
				autoConfirmReservations: false,
			},
		});
		console.log("Restaurant settings created");
	}

	// Schedule (Mon-Sat open, Sunday closed)
	const existingSchedule = await prisma.scheduleDay.findFirst();
	if (!existingSchedule) {
		const schedule = [
			{ dayOfWeek: 0, isOpen: false, slots: [] }, // Sunday
			{ dayOfWeek: 1, isOpen: true, slots: [{ time: "12:00", maxCovers: 40 }, { time: "12:30", maxCovers: 40 }, { time: "13:00", maxCovers: 40 }, { time: "19:00", maxCovers: 40 }, { time: "19:30", maxCovers: 40 }, { time: "20:00", maxCovers: 40 }, { time: "20:30", maxCovers: 40 }] },
			{ dayOfWeek: 2, isOpen: true, slots: [{ time: "12:00", maxCovers: 40 }, { time: "12:30", maxCovers: 40 }, { time: "13:00", maxCovers: 40 }, { time: "19:00", maxCovers: 40 }, { time: "19:30", maxCovers: 40 }, { time: "20:00", maxCovers: 40 }, { time: "20:30", maxCovers: 40 }] },
			{ dayOfWeek: 3, isOpen: true, slots: [{ time: "12:00", maxCovers: 40 }, { time: "12:30", maxCovers: 40 }, { time: "13:00", maxCovers: 40 }, { time: "19:00", maxCovers: 40 }, { time: "19:30", maxCovers: 40 }, { time: "20:00", maxCovers: 40 }, { time: "20:30", maxCovers: 40 }] },
			{ dayOfWeek: 4, isOpen: true, slots: [{ time: "12:00", maxCovers: 40 }, { time: "12:30", maxCovers: 40 }, { time: "13:00", maxCovers: 40 }, { time: "19:00", maxCovers: 40 }, { time: "19:30", maxCovers: 40 }, { time: "20:00", maxCovers: 40 }, { time: "20:30", maxCovers: 40 }] },
			{ dayOfWeek: 5, isOpen: true, slots: [{ time: "12:00", maxCovers: 40 }, { time: "12:30", maxCovers: 40 }, { time: "13:00", maxCovers: 40 }, { time: "19:00", maxCovers: 40 }, { time: "19:30", maxCovers: 40 }, { time: "20:00", maxCovers: 40 }, { time: "20:30", maxCovers: 40 }] },
			{ dayOfWeek: 6, isOpen: true, slots: [{ time: "12:00", maxCovers: 40 }, { time: "12:30", maxCovers: 40 }, { time: "13:00", maxCovers: 40 }, { time: "13:30", maxCovers: 40 }, { time: "19:00", maxCovers: 40 }, { time: "19:30", maxCovers: 40 }, { time: "20:00", maxCovers: 40 }, { time: "20:30", maxCovers: 40 }, { time: "21:00", maxCovers: 40 }] }, // Saturday longer
		];
		for (const day of schedule) {
			await prisma.scheduleDay.create({ data: day });
		}
		console.log("Schedule created");
	}

	// Menu categories
	const categories = [
		{ name: "Entrées", slug: "entrees", iconName: "Salad", order: 1 },
		{ name: "Carris & Rougails", slug: "carris-rougails", iconName: "Flame", order: 2 },
		{ name: "Viandes", slug: "viandes", iconName: "Beef", order: 3 },
		{ name: "Poissons & Fruits de mer", slug: "poissons", iconName: "Fish", order: 4 },
		{ name: "Desserts", slug: "desserts", iconName: "IceCream", order: 5 },
		{ name: "Boissons", slug: "boissons", iconName: "GlassWater", order: 6 },
	];

	const existingCats = await prisma.menuCategory.count();
	if (existingCats === 0) {
		for (const cat of categories) {
			await prisma.menuCategory.create({ data: cat });
		}
		console.log("Menu categories created");
	}

	// Dishes
	const existingDishes = await prisma.dish.count();
	if (existingDishes === 0) {
		const entrees = await prisma.menuCategory.findUnique({ where: { slug: "entrees" } });
		const carris = await prisma.menuCategory.findUnique({ where: { slug: "carris-rougails" } });
		const viandes = await prisma.menuCategory.findUnique({ where: { slug: "viandes" } });
		const poissons = await prisma.menuCategory.findUnique({ where: { slug: "poissons" } });
		const desserts = await prisma.menuCategory.findUnique({ where: { slug: "desserts" } });
		const boissons = await prisma.menuCategory.findUnique({ where: { slug: "boissons" } });

		const dishes = [
			{ categoryId: entrees!.id, name: "Bouchons créoles", slug: "bouchons-creoles", description: "Petits chaussons de porc épicés, servis avec sauce cacahuètes maison", price: 9.5, allergens: ["gluten", "peanuts", "soy"], dietaryTags: [], order: 1 },
			{ categoryId: entrees!.id, name: "Salade de palmiste", slug: "salade-palmiste", description: "Cœur de palmier frais, mangue verte, vinaigrette citron-gingembre", price: 11.0, allergens: [], dietaryTags: ["vegetarian", "vegan", "gluten-free"], order: 2 },
			{ categoryId: entrees!.id, name: "Accras de morue", slug: "accras-morue", description: "Beignets de morue traditionnels, accompagnés de sauce chien fraîche", price: 10.5, allergens: ["gluten", "fish"], dietaryTags: [], order: 3, isDailySpecial: true },
			{ categoryId: carris!.id, name: "Cari poulet boucané", slug: "cari-poulet-boucane", description: "Poulet fumé mijoté dans un rougail tomates au curcuma et thym créole", price: 18.0, allergens: [], dietaryTags: ["gluten-free"], order: 1 },
			{ categoryId: carris!.id, name: "Rougail saucisses", slug: "rougail-saucisses", description: "Saucisses de porc dans un rougail tomates pimenté, le classique réunionnais", price: 16.5, allergens: [], dietaryTags: ["gluten-free"], order: 2 },
			{ categoryId: carris!.id, name: "Cari lentilles & citrouille", slug: "cari-lentilles-citrouille", description: "Cari végétarien aux lentilles blondes et citrouille fondante", price: 14.0, allergens: [], dietaryTags: ["vegetarian", "vegan", "gluten-free"], order: 3 },
			{ categoryId: viandes!.id, name: "Canard à l'ananas", slug: "canard-ananas", description: "Magret de canard confit, chutney d'ananas Victoria, jus réduit aux épices", price: 26.0, allergens: [], dietaryTags: ["gluten-free"], order: 1 },
			{ categoryId: viandes!.id, name: "Côte de cochon marlin fumé", slug: "cote-cochon-marlin", description: "Côte de porc marinée 24h, glaçage tamarin et piment oiseau, haricots rouges", price: 22.0, allergens: [], dietaryTags: ["gluten-free"], order: 2 },
			{ categoryId: poissons!.id, name: "Capitaine à la vanille", slug: "capitaine-vanille", description: "Filet de capitaine poêlé, émulsion vanille Bourbon, riz basmati et légumes croquants", price: 24.0, allergens: ["fish", "dairy"], dietaryTags: ["gluten-free"], order: 1 },
			{ categoryId: poissons!.id, name: "Cari de crevettes piment doux", slug: "cari-crevettes", description: "Grosses crevettes de l'Océan Indien, cari doux au lait de coco, chutney mangue", price: 23.0, allergens: ["shellfish", "tree-nuts"], dietaryTags: ["gluten-free"], order: 2 },
			{ categoryId: desserts!.id, name: "Napolitain vanille Bourbon", slug: "napolitain-vanille", description: "Gâteau napolitain traditionnel revisité, crème vanille Bourbon de La Réunion", price: 8.0, allergens: ["gluten", "dairy", "eggs"], dietaryTags: ["vegetarian"], order: 1 },
			{ categoryId: desserts!.id, name: "Bonbon la patate", slug: "bonbon-patate", description: "Beignets de patate douce au sucre vanillé, servis chauds avec coulis de fruit de la passion", price: 7.5, allergens: ["gluten", "eggs"], dietaryTags: ["vegetarian"], order: 2 },
			{ categoryId: desserts!.id, name: "Sorbet citron-gingembre", slug: "sorbet-citron-gingembre", description: "Sorbet artisanal au citron vert de l'île et gingembre frais", price: 7.0, allergens: [], dietaryTags: ["vegetarian", "vegan", "gluten-free"], order: 3 },
			{ categoryId: boissons!.id, name: "Rhum arrangé maison", slug: "rhum-arrange-maison", description: "Notre rhum arrangé du mois : ananas, vanille Bourbon, cannelle", price: 7.0, allergens: [], dietaryTags: [], order: 1 },
			{ categoryId: boissons!.id, name: "Jus de fruits frais", slug: "jus-fruits-frais", description: "Mangue, papaye, fruit de la passion ou tamarin — selon arrivage du marché", price: 5.5, allergens: [], dietaryTags: ["vegetarian", "vegan", "gluten-free"], order: 2 },
			{ categoryId: boissons!.id, name: "Infusion tisane Bourbon", slug: "infusion-tisane-bourbon", description: "Tisane locale : citronnelle, bois de montagne, curcuma frais", price: 4.0, allergens: [], dietaryTags: ["vegetarian", "vegan", "gluten-free"], order: 3 },
		];

		for (const dish of dishes) {
			await prisma.dish.create({ data: dish });
		}
		console.log("Dishes created");
	}

	console.log("Seed complete!");
}

main()
	.catch((e) => { console.error(e); process.exit(1); })
	.finally(async () => { await prisma.$disconnect(); });
