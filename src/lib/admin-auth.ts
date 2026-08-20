import { cookies } from "next/headers";

export async function requireAdminSession() {
  const cookieStore = await cookies();
  const cookie = cookieStore.get("admin-session");

  if (!cookie) {
    throw new Response("Non authentifié", { status: 401 });
  }

  try {
    const session = JSON.parse(cookie.value) as {
      id?: string;
      username?: string;
      role?: string;
      mustChangePassword?: boolean;
    };

    if (!session.id || !session.role) {
      throw new Error("Session admin invalide");
    }

    if (session.mustChangePassword) {
      throw new Response("Changement de mot de passe requis", { status: 403 });
    }

    return session;
  } catch (error) {
    if (error instanceof Response) throw error;
    throw new Response("Session admin invalide", { status: 401 });
  }
}
