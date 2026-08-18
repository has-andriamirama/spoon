import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function getAdminSession() {
  const cookieStore = await cookies();
  const raw = cookieStore.get("admin-session")?.value;
  if (!raw) return null;

  try {
    const data = JSON.parse(raw) as { id?: string; username?: string; role?: string; mustChangePassword?: boolean };
    if (!data.id) return null;
    const admin = await prisma.admin.findUnique({ where: { id: data.id } });
    if (!admin) return null;
    return {
      id: admin.id,
      username: admin.username,
      role: admin.role,
      mustChangePassword: admin.mustChangePassword,
    };
  } catch {
    return null;
  }
}
