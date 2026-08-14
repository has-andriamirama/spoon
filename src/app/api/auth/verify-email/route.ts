import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
	const { searchParams } = new URL(request.url);
	const token = searchParams.get("token");

	const loginUrl = new URL("/auth/login", process.env.NEXTAUTH_URL || request.url);

	if (!token) {
		loginUrl.searchParams.set("error", "token_manquant");
		return NextResponse.redirect(loginUrl);
	}

	try {
		const record = await prisma.emailVerificationToken.findUnique({
			where: { token },
			include: { user: true },
		});

		if (!record) {
			loginUrl.searchParams.set("error", "token_invalide");
			return NextResponse.redirect(loginUrl);
		}

		if (record.expiresAt < new Date()) {
			await prisma.emailVerificationToken.delete({ where: { token } });
			loginUrl.searchParams.set("error", "token_expire");
			return NextResponse.redirect(loginUrl);
		}

		await prisma.user.update({
			where: { id: record.userId },
			data: { emailVerified: new Date() },
		});

		await prisma.emailVerificationToken.delete({ where: { token } });

		loginUrl.searchParams.set("verified", "1");
		return NextResponse.redirect(loginUrl);
	} catch (error) {
		console.error("[verify-email] Erreur:", error);
		loginUrl.searchParams.set("error", "erreur_serveur");
		return NextResponse.redirect(loginUrl);
	}
}
