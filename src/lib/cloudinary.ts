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
