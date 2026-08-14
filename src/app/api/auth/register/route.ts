import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { registerSchema } from "@/lib/validations";
import { randomBytes } from "crypto";
import { sendEmailVerification } from "@/services/email.service";

export async function POST(request: Request) {
	try {
		const body = await request.json();
		const data = registerSchema.safeParse(body);
		if (!data.success) {
			return NextResponse.json(
				{ error: "Données invalides", details: data.error.flatten() },
				{ status: 400 }
			);
		}

		const existing = await prisma.user.findUnique({ where: { email: data.data.email } });
		if (existing) {
			return NextResponse.json({ error: "Cet email est déjà utilisé" }, { status: 409 });
		}

		const passwordHash = await bcrypt.hash(data.data.password, 12);

		const user = await prisma.user.create({
			data: {
				email: data.data.email,
				passwordHash,
				firstName: data.data.firstName,
				lastName: data.data.lastName,
				phone: data.data.phone,
			},
		});

		const guestReservations = await prisma.reservation.findMany({
			where: { guestEmail: data.data.email, userId: null },
			select: { id: true },
		});

		if (guestReservations.length > 0) {
			const reservationIds = guestReservations.map((r) => r.id);

			await prisma.reservation.updateMany({
				where: { id: { in: reservationIds } },
				data: { userId: user.id },
			});

			await prisma.invoice.updateMany({
				where: {
					reservationId: { in: reservationIds },
					userId: null,
				},
				data: { userId: user.id },
			});
		}

		// Email verification token
		const token = randomBytes(32).toString("hex");
		await prisma.emailVerificationToken.create({
			data: {
				userId: user.id,
				token,
				expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
			},
		});

		const verifyUrl = `${process.env.NEXTAUTH_URL}/api/auth/verify-email?token=${token}`;
		await sendEmailVerification({ firstName: user.firstName, email: user.email, verifyUrl });

		return NextResponse.json({ data: { id: user.id } }, { status: 201 });
	} catch (error) {
		console.error(error);
		return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 });
	}
}
