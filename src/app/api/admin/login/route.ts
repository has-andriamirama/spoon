import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();
    if (!username || !password) return NextResponse.json({ error: "Identifiants requis" }, { status: 400 });

    const admin = await prisma.admin.findUnique({ where: { username } });
    if (!admin) return NextResponse.json({ error: "Identifiants incorrects" }, { status: 401 });

    const match = await bcrypt.compare(password, admin.passwordHash);
    if (!match) return NextResponse.json({ error: "Identifiants incorrects" }, { status: 401 });

    // Update lastLoginAt
    await prisma.admin.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } });

    const sessionData = JSON.stringify({ id: admin.id, username: admin.username, role: admin.role, mustChangePassword: admin.mustChangePassword });
    const cookieStore = cookies();
    cookieStore.set("admin-session", sessionData, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 60 * 60 * 8, path: "/" });

    return NextResponse.json({ mustChangePassword: admin.mustChangePassword });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}

export async function DELETE() {
  const cookieStore = cookies();
  cookieStore.delete("admin-session");
  return NextResponse.json({ message: "Déconnecté" });
}
