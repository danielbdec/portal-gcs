import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";


export const authProviderServer = {
  /**
   * Verifica se há uma sessão ativa no servidor.
   * Retorna `authenticated: true` se a sessão existir, senão redireciona para o login.
   */
  check: async () => {
    const session = await getServerSession(authOptions);

    return {
      authenticated: !!session,
      redirectTo: "/login",
    };
  },
};
