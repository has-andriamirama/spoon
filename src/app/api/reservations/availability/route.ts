import { NextResponse } from "next/server";
import { getAvailableSlots } from "@/services/availability.service";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    if (!date) return NextResponse.json({ error: "Date requise" }, { status: 400 });
    const slots = await getAvailableSlots(date);
    return NextResponse.json({ data: slots });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
