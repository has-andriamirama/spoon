import type { Browser } from "puppeteer-core";

async function getBrowser(): Promise<Browser> {
	if (process.env.NODE_ENV === "development") {
		const puppeteer = (await import("puppeteer")).default;
		return puppeteer.launch({ headless: true }) as unknown as Promise<Browser>;
	}

	const chromium = (await import("@sparticuz/chromium")).default;
	const puppeteerCore = (await import("puppeteer-core")).default;

	chromium.setGraphicsMode = false;

	let executablePath: string;
	try {
		executablePath = await chromium.executablePath();
	} catch (error) {
		console.error(
			"[generate-pdf] Impossible de résoudre le binaire Chromium (@sparticuz/chromium). " +
			"Vérifiez que next.config.ts inclut bien le dossier bin/ du package dans " +
			"`outputFileTracingIncludes` pour les routes API concernées.",
			error
		);
		throw error;
	}

	return puppeteerCore.launch({
		args: chromium.args,
		executablePath,
		headless: true,
	});
}

export async function htmlToPdfBuffer(html: string): Promise<Buffer> {
	const browser = await getBrowser();

	try {
		const page = await browser.newPage();
		await page.setContent(html, { waitUntil: "load", timeout: 15_000 });
		const pdf = await page.pdf({
			format: "A4",
			printBackground: true,
			margin: { top: "0", bottom: "0", left: "0", right: "0" },
		});
		return Buffer.from(pdf);
	} finally {
		await browser.close().catch(() => {});
	}
}
