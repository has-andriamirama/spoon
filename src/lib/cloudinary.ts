import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
	cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
	api_key: process.env.CLOUDINARY_API_KEY,
	api_secret: process.env.CLOUDINARY_API_SECRET,
	secure: true,
});

export { cloudinary };

export async function deleteCloudinaryImage(publicId: string): Promise<void> {
	await cloudinary.uploader.destroy(publicId);
}

/**
 * Sépare un chemin complet ("spoon/invoices/templates/deposit/mon-template-123")
 * en `{ folder, filename }`.
 *
 * IMPORTANT — pourquoi c'est nécessaire :
 * Sur les comptes Cloudinary en mode "Dynamic Folder" (le mode par défaut pour
 * tout compte créé depuis juillet 2023), le dossier affiché dans la Media
 * Library N'EST PLUS déduit automatiquement des "/" présents dans `public_id`
 * pour les ressources `resource_type: "raw"` — contrairement aux ressources
 * `image`/`video`. Si on ne passe QUE `public_id` (même avec des "/"), le
 * fichier est bien accessible via son URL (le chemin fait partie du
 * public_id), mais Cloudinary le place à la racine de la Media Library au
 * lieu du dossier attendu (ex. `spoon/invoices/templates/...`) : c'est
 * exactement le symptôme "le fichier existe mais n'est pas au bon endroit".
 *
 * Pour être fiable sur TOUS les modes de compte (Fixed ET Dynamic Folder), on
 * passe désormais explicitement `folder` en plus d'un `public_id` qui ne
 * contient que le nom de fichier final. Cloudinary reconstruit alors
 * lui-même le chemin complet (`folder + "/" + public_id`) dans le
 * `public_id` renvoyé — donc les appels suivants (fetch, update, destroy) qui
 * réutilisent ce `public_id` complet continuent de fonctionner sans rien
 * changer côté appelant.
 */
function splitCloudinaryPath(fullPath: string): { folder: string; filename: string } {
	const normalized = fullPath.replace(/^\/+/, "").replace(/\/+$/, "");
	const lastSlash = normalized.lastIndexOf("/");
	if (lastSlash === -1) {
		return { folder: "", filename: normalized };
	}
	return {
		folder: normalized.slice(0, lastSlash),
		filename: normalized.slice(lastSlash + 1),
	};
}

/**
 * Upload d'un contenu texte (HTML de template, par ex.) vers Cloudinary en tant
 * que fichier "raw".
 *
 * `publicId` doit être le chemin COMPLET (dossier inclus), ex.
 * "spoon/invoices/templates/deposit/mon-template-123".
 */
export async function uploadRawTextToCloudinary(
	content: string,
	publicId: string
): Promise<{ url: string; publicId: string }> {
	const base64 = Buffer.from(content, "utf-8").toString("base64");
	const dataUri = `data:text/html;base64,${base64}`;
	const { folder, filename } = splitCloudinaryPath(publicId);

	const result = await cloudinary.uploader.upload(dataUri, {
		resource_type: "raw",
		public_id: filename,
		folder: folder || undefined,
		asset_folder: folder || undefined,
		use_filename: false,
		unique_filename: false,
		overwrite: true,
		format: "html",
	});

	return { url: result.secure_url, publicId: result.public_id };
}

/**
 * Upload d'un buffer binaire (PDF généré, par ex.) vers Cloudinary en tant que
 * fichier "raw". Même remarque que ci-dessus : `publicId` est le chemin complet.
 */
export async function uploadRawBufferToCloudinary(
	buffer: Buffer,
	publicId: string
): Promise<{ url: string; publicId: string }> {
	const { folder, filename } = splitCloudinaryPath(publicId);

	return new Promise((resolve, reject) => {
		const uploadStream = cloudinary.uploader.upload_stream(
			{
				resource_type: "raw",
				public_id: filename,
				folder: folder || undefined,
				asset_folder: folder || undefined,
				use_filename: false,
				unique_filename: false,
				overwrite: true,
				format: "pdf",
			},
			(error, result) => {
				if (error || !result) {
					reject(error ?? new Error("Échec de l'upload Cloudinary"));
					return;
				}
				resolve({ url: result.secure_url, publicId: result.public_id });
			}
		);
		uploadStream.end(buffer);
	});
}

export async function deleteCloudinaryRaw(publicId: string): Promise<void> {
	await cloudinary.uploader.destroy(publicId, { resource_type: "raw" });
}

/**
 * Récupère le contenu texte d'un fichier "raw" Cloudinary (le HTML d'un template).
 * Passe par le backend pour éviter tout souci de CORS côté navigateur.
 */
export async function fetchRawTextFromCloudinary(url: string): Promise<string> {
	const res = await fetch(url, { cache: "no-store" });
	if (!res.ok) {
		throw new Error(`Impossible de récupérer le fichier Cloudinary (${res.status})`);
	}
	return res.text();
}

export function getCloudinarySignature(folder: string): {
	signature: string;
	timestamp: number;
	cloudName: string;
	apiKey: string;
} {
	const timestamp = Math.round(new Date().getTime() / 1000);
	const signature = cloudinary.utils.api_sign_request(
		{ timestamp, folder },
		process.env.CLOUDINARY_API_SECRET!
	);
	return {
		signature,
		timestamp,
		cloudName: process.env.CLOUDINARY_CLOUD_NAME!,
		apiKey: process.env.CLOUDINARY_API_KEY!,
	};
}
