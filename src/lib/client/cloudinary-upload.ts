export const uploadFileToCDN = async (
	file: File,
	folder: string
): Promise<{ url: string; publicId: string } | null> => {
	try {
		const sigRes = await fetch(`/api/upload?folder=${encodeURIComponent(folder)}`);
		if (!sigRes.ok) throw new Error("Impossible d’obtenir la signature d’upload");

		const { signature, timestamp, cloudName, apiKey } = await sigRes.json();

		const formData = new FormData();
		formData.append("file", file);
		formData.append("api_key", apiKey);
		formData.append("timestamp", String(timestamp));
		formData.append("signature", signature);
		formData.append("folder", folder);

		const uploadRes = await fetch(
			`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
			{ method: "POST", body: formData }
		);

		if (!uploadRes.ok) throw new Error("Upload Cloudinary échoué");

		const data = await uploadRes.json();
		return {
			url: data.secure_url as string,
			publicId: data.public_id as string,
		};
	} catch (error) {
		console.error("[cloudinary-upload] uploadFileToCDN error:", error);
		return null;
	}
};

export const deleteFromCDN = async (publicId: string): Promise<void> => {
	if (!publicId) return;

	try {
		await fetch("/api/upload", {
			method: "DELETE",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ publicId }),
		});
	} catch (error) {
		console.error("[cloudinary-upload] deleteFromCDN error:", error);
	}
};
