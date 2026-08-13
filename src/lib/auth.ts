import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
	session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
	pages: { signIn: "/auth/login" },
	providers: [
		CredentialsProvider({
			name: "credentials",
			credentials: {
				email: { label: "Email", type: "email" },
				password: { label: "Password", type: "password" },
			},
			async authorize(credentials) {
				if (!credentials?.email || !credentials?.password) return null;

				const user = await prisma.user.findUnique({
					where: { email: credentials.email },
				});

				if (!user || !user.isActive) return null;

				const passwordMatch = await bcrypt.compare(credentials.password, user.passwordHash);
				if (!passwordMatch) return null;

				return {
					id: user.id,
					email: user.email,
					firstName: user.firstName,
					lastName: user.lastName,
					role: user.role,
					avatarUrl: user.avatarUrl,
					phone: user.phone,
				};
			},
		}),
	],
	callbacks: {
		async jwt({ token, user }) {
			if (user) {
				token.id = user.id;
				token.firstName = user.firstName;
				token.lastName = user.lastName;
				token.role = user.role;
				token.avatarUrl = user.avatarUrl;
				token.phone = user.phone;
			}
			return token;
		},
		async session({ session, token }) {
			if (!session.user) return session;

			if (!token.id || !token.firstName || !token.lastName || !token.role) {
				return session;
			}

			session.user.id = token.id;
			session.user.firstName = token.firstName;
			session.user.lastName = token.lastName;
			session.user.role = token.role;
			session.user.avatarUrl = token.avatarUrl;
			session.user.phone = token.phone;

			return session;
		},
	},
};
