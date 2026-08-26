import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	images: {
		remotePatterns: [
			{ protocol: "https", hostname: "res.cloudinary.com" },
			{ protocol: "https", hostname: "images.unsplash.com" },
		],
	},
	serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core", "puppeteer"],
	// Sur Vercel, le "file tracing" qui décide quels fichiers embarquer dans
	// chaque fonction serverless ne détecte pas toujours les binaires de
	// @sparticuz/chromium (accédés dynamiquement via fs, pas via require()
	// statique). Sans cette inclusion explicite, `chromium.executablePath()`
	// échoue en production (le fichier est absent du déploiement) alors que
	// tout fonctionne en local — ce qui produit exactement le symptôme
	// "facture créée mais PDF vide, rien sur Cloudinary".
	outputFileTracingIncludes: {
		"/api/webhooks/stripe": ["./node_modules/@sparticuz/chromium/bin/**/*"],
		"/api/payments/verify-session": ["./node_modules/@sparticuz/chromium/bin/**/*"],
		"/api/admin/service-orders/[id]/payer": ["./node_modules/@sparticuz/chromium/bin/**/*"],
		"/api/invoices/[id]/pdf": ["./node_modules/@sparticuz/chromium/bin/**/*"],
	},
	experimental: {
		serverActions: { allowedOrigins: ["localhost:3000"] },
	},
};

export default nextConfig;
