import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import { sendPasswordReset } from "@/services/email.service";

export async function POST(request: Request) {
	try {
		const { email } = await request.json();
		if (!email) {
			return NextResponse.json({ error: "Email requis" }, { status: 400 });
		}

		const user = await prisma.user.findUnique({ where: { email } });

		if (!user) {
			return NextResponse.json({
				message: "Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.",
			});
		}

		await prisma.passwordResetToken.deleteMany({
			where: { userId: user.id },
		});

		const token = randomBytes(32).toString("hex");
		await prisma.passwordResetToken.create({
			data: {
				userId: user.id,
				token,
				expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1h
			},
		});

		const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password/${token}`;

		sendPasswordReset({ firstName: user.firstName, email: user.email, resetUrl });

		return NextResponse.json({
			message: "Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.",
		});
	} catch (error) {
		console.error("[forgot-password] Erreur:", error);
		return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
	}
}
