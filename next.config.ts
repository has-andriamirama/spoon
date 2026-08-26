import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	images: {
		remotePatterns: [
			{ protocol: "https", hostname: "res.cloudinary.com" },
			{ protocol: "https", hostname: "images.unsplash.com" },
		],
	},
	serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core", "puppeteer"],
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
