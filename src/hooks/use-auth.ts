import { useSession } from "next-auth/react";

export function useAuth() {
  const { data: session, status } = useSession();
  const user = session?.user as any;
  return {
    user,
    isAuthenticated: status === "authenticated",
    isLoading: status === "loading",
    id: user?.id,
    firstName: user?.firstName,
    lastName: user?.lastName,
    email: user?.email,
    role: user?.role,
  };
}
