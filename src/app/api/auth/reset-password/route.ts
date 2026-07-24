import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const { token, password, userId, currentPassword } = await request.json();

    // In-account password change (userId + currentPassword provided)
    if (userId && currentPassword) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
      const match = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!match) return NextResponse.json({ error: "Mot de passe actuel incorrect" }, { status: 400 });
      const passwordHash = await bcrypt.hash(password, 12);
      await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
      return NextResponse.json({ message: "Mot de passe mis à jour" });
    }

    // Token-based reset
    if (!token) return NextResponse.json({ error: "Token requis" }, { status: 400 });
    const resetToken = await prisma.passwordResetToken.findUnique({ where: { token } });
    if (!resetToken || resetToken.expiresAt < new Date() || resetToken.usedAt) {
      return NextResponse.json({ error: "Lien invalide ou expiré" }, { status: 400 });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.update({ where: { id: resetToken.userId }, data: { passwordHash } });
    await prisma.passwordResetToken.update({ where: { id: resetToken.id }, data: { usedAt: new Date() } });
    return NextResponse.json({ message: "Mot de passe réinitialisé" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
