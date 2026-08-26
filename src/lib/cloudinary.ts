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
 * Upload d'un contenu texte (HTML de template, par ex.) vers Cloudinary en tant
 * que fichier "raw".
 *
 * `publicId` doit être le chemin COMPLET (dossier inclus), ex.
 * "spoon/invoices/templates/deposit/mon-template-123". On ne passe jamais
 * `folder` en plus de `public_id` : Cloudinary concatène les deux, ce qui
 * dupliquerait le chemin sur un écrasement (overwrite) où `publicId` contient
 * déjà le dossier renvoyé par un précédent upload.
 */
export async function uploadRawTextToCloudinary(
	content: string,
	publicId: string
): Promise<{ url: string; publicId: string }> {
	const base64 = Buffer.from(content, "utf-8").toString("base64");
	const dataUri = `data:text/html;base64,${base64}`;

	const result = await cloudinary.uploader.upload(dataUri, {
		resource_type: "raw",
		public_id: publicId,
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
	return new Promise((resolve, reject) => {
		const uploadStream = cloudinary.uploader.upload_stream(
			{
				resource_type: "raw",
				public_id: publicId,
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
