import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	images: {
		remotePatterns: [
			{ protocol: "https", hostname: "res.cloudinary.com" },
			{ protocol: "https", hostname: "images.unsplash.com" },
		],
	},
	serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core", "puppeteer"],
	experimental: {
		serverActions: { allowedOrigins: ["localhost:3000"] },
	},
};

export default nextConfig;
