import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

export async function PATCH(request: Request) {
  try {
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get("admin-session");
    if (!sessionCookie) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    const session = JSON.parse(sessionCookie.value);
    const { currentPassword, newPassword } = await request.json();

    const admin = await prisma.admin.findUnique({ where: { id: session.id } });
    if (!admin) return NextResponse.json({ error: "Admin introuvable" }, { status: 404 });

    const match = await bcrypt.compare(currentPassword, admin.passwordHash);
    if (!match) return NextResponse.json({ error: "Mot de passe actuel incorrect" }, { status: 400 });

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.admin.update({ where: { id: admin.id }, data: { passwordHash, mustChangePassword: false } });

    const newSession = JSON.stringify({ ...session, mustChangePassword: false });
    cookieStore.set("admin-session", newSession, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 8,
      path: "/",
    });

    return NextResponse.json({ message: "Mot de passe mis à jour" });
  } catch {
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
