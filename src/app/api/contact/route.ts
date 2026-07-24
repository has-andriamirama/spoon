import { NextResponse } from "next/server";
import { contactSchema } from "@/lib/validations";
import { resend, FROM_EMAIL } from "@/lib/resend";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = contactSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    const { name, email, subject, message } = parsed.data;
    const settings = await prisma.restaurantSettings.findFirst();
    if (settings?.email) {
      await resend.emails.send({ from: FROM_EMAIL, to: settings.email, replyTo: email, subject: `[Contact] ${subject}`, html: `<p><strong>De :</strong> ${name} (${email})</p><p><strong>Sujet :</strong> ${subject}</p><p>${message.replace(/\n/g, "<br>")}</p>` });
    }
    return NextResponse.json({ message: "Message envoyé" });
  } catch { return NextResponse.json({ error: "Erreur interne" }, { status: 500 }); }
}
