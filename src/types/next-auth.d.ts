import type { DefaultSession } from "next-auth";
import type { Role } from "../../generated/prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      firstName: string;
      lastName: string;
      role: Role;
      avatarUrl?: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    firstName: string;
    lastName: string;
    role: Role;
    avatarUrl?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    firstName?: string;
    lastName?: string;
    role?: Role;
    avatarUrl?: string | null;
  }
}
