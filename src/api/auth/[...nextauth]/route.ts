import NextAuth from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";

// URL do seu webhook no n8n.
const GET_USER_PERMISSIONS_URL = 'http://localhost:5678/webhook/consulta-usuarios';

// Tipagem para estender o token e a sessão
declare module "next-auth" {
  interface Session {
    user: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      is_admin?: boolean;
      funcoes?: string[];
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    is_admin?: boolean;
    funcoes?: string[];
  }
}


const handler = NextAuth({
  providers: [
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID!,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user, account }) {
      // Este bloco é executado no momento do login
      if (account && user && user.email) {
        
        // LOG 1: Verificar se o processo de busca de permissões começou
        console.log(`[AUTH LOG 1] A iniciar busca de permissões para: ${user.email}`);

        try {
          const permissionsResponse = await fetch(GET_USER_PERMISSIONS_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: user.email }),
            cache: 'no-store'
          });

          // LOG 2: Verificar a resposta do seu webhook
          console.log(`[AUTH LOG 2] Resposta do Webhook - Status: ${permissionsResponse.status}`);

          if (permissionsResponse.ok) {
            const permissionsData = await permissionsResponse.json();
            
            // LOG 3: Ver os dados exatos que o webhook retornou
            console.log('[AUTH LOG 3] Dados recebidos do Webhook:', permissionsData);

            // O seu webhook DEVE devolver um objeto com { is_admin: boolean, funcoes: string[] }
            token.is_admin = permissionsData.is_admin;
            token.funcoes = permissionsData.funcoes;
          } else {
            // LOG DE ERRO: Se a resposta não for 'ok'
            console.error('[AUTH ERRO] Webhook retornou um erro de status:', permissionsResponse.statusText);
            token.is_admin = false;
            token.funcoes = [];
          }
        } catch (error) {
          // LOG DE ERRO: Se a chamada fetch falhar
          console.error('[AUTH ERRO] Falha ao contactar o webhook:', error);
          token.is_admin = false;
          token.funcoes = [];
        }
      }
      
      // LOG 4: Ver o token final antes de ser guardado
      console.log('[AUTH LOG 4] Token final a ser guardado:', token);
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.is_admin = token.is_admin;
        session.user.funcoes = token.funcoes;
      }
      // LOG 5: Ver a sessão final que será enviada para o frontend
      // (Este log pode não aparecer sempre, mas os outros são mais importantes)
      console.log('[AUTH LOG 5] Sessão final enviada para o cliente:', session);
      return session;
    },
    async redirect({ url, baseUrl }) {
      return baseUrl;
    },
  },
});

export { handler as GET, handler as POST };
