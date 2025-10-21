import { AuthBindings } from "@refinedev/core";
import { signIn, signOut, getSession } from "next-auth/react";

export const authProvider: AuthBindings = {
  login: async () => {
    await signIn("azure-ad");
    return { success: true, redirectTo: "/" };
  },
  logout: async () => {
    await signOut({ callbackUrl: "/" });
    return { success: true, redirectTo: "/" };
  },
  check: async () => {
    const session = await getSession();
    if (session) {
      return { authenticated: true };
    }
    return { authenticated: false, redirectTo: "/login" };
  },
  getIdentity: async () => {
    const session = await getSession();
    if (!session?.user) return null;
    return {
      name: session.user.name,
      email: session.user.email,
      avatar: session.user.image, // normalmente vem null no Azure, mas pode ser preenchido depois
    };
  },
  getPermissions: async () => null,
  onError: async (error) => {
    console.error("Auth error:", error);
    return { error };
  }
};
