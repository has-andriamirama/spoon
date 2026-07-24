import { NextResponse } from "next/server";
import { getCloudinarySignature } from "@/lib/cloudinary";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const folder = searchParams.get("folder") || "spoon";
    const signature = getCloudinarySignature(folder);
    return NextResponse.json(signature);
  } catch { return NextResponse.json({ error: "Erreur lors de la génération de la signature" }, { status: 500 }); }
}
