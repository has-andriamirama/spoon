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
