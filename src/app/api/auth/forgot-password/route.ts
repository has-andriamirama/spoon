import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import { sendPasswordReset } from "@/services/email.service";

export async function POST(request: Request) {
	try {
		const { email } = await request.json();
		const user = await prisma.user.findUnique({ where: { email } });
		
		if (!user) return NextResponse.json({ message: "Email envoyé si le compte existe" });

		const token = randomBytes(32).toString("hex");
		await prisma.passwordResetToken.create({
			data: { userId: user.id, token, expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
		});

		const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password/${token}`;
		await sendPasswordReset({ firstName: user.firstName, email: user.email, resetUrl });

		return NextResponse.json({ message: "Email envoyé si le compte existe" });
	} catch (error) {
		console.error(error);
		return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
	}
}
