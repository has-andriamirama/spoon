import type { Browser } from "puppeteer-core";

/**
 * Ouvre un navigateur headless adapté à l'environnement d'exécution :
 * - en développement local, on utilise le paquet `puppeteer` complet (Chromium
 *   embarqué), plus simple à faire tourner sur une machine de dev ;
 * - en production (Vercel/serverless), on utilise `puppeteer-core` avec le
 *   binaire Chromium allégé de `@sparticuz/chromium`, seul capable de tenir
 *   dans les limites de taille des fonctions serverless.
 */
async function getBrowser(): Promise<Browser> {
	if (process.env.NODE_ENV === "development") {
		// Import dynamique : `puppeteer` (avec Chromium embarqué) n'est qu'une
		// devDependency, absente du bundle de production.
		const puppeteer = (await import("puppeteer")).default;
		return puppeteer.launch({ headless: true }) as unknown as Promise<Browser>;
	}

	const chromium = (await import("@sparticuz/chromium")).default;
	const puppeteerCore = (await import("puppeteer-core")).default;

	// Réduit l'empreinte mémoire/binaire (pas besoin de rendu graphique pour
	// générer un PDF) — recommandé par @sparticuz/chromium pour les
	// environnements serverless contraints en mémoire (Vercel).
	chromium.setGraphicsMode = false;

	let executablePath: string;
	try {
		executablePath = await chromium.executablePath();
	} catch (error) {
		// Échec typique quand le binaire Chromium n'a pas été inclus dans le
		// bundle de la fonction serverless (voir `outputFileTracingIncludes`
		// dans next.config.ts). On le journalise explicitement ici car cette
		// erreur est sinon totalement invisible : elle remonte depuis un
		// `try/catch` "best-effort" plus haut dans la chaîne d'appel.
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

/**
 * Convertit un document HTML final (variables déjà injectées) en buffer PDF
 * au format A4, avec marges standard pour une facture.
 */
export async function htmlToPdfBuffer(html: string): Promise<Buffer> {
	const browser = await getBrowser();

	try {
		const page = await browser.newPage();
		// "load" attend le chargement complet des ressources inline (images,
		// polices) du HTML — "networkidle0/2" n'est plus supporté par
		// page.setContent() dans les versions récentes de Puppeteer.
		// Timeout explicite (15s) : sur un cold start serverless, on préfère
		// une erreur claire et rapide plutôt qu'un blocage silencieux jusqu'au
		// timeout de la fonction (qui, lui, laisse la facture sans PDF sans
		// aucune trace exploitable dans les logs applicatifs).
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
