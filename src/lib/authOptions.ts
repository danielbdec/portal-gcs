import NextAuth, { type NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";

// URL do seu webhook no n8n que busca os dados de permissão de um utilizador.
const GET_USER_PERMISSIONS_URL = 'http://localhost:5678/webhook/consulta-acessos-portal';

// Tipagem para estender o token e a sessão com os nossos novos campos
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

export const authOptions: NextAuthOptions = {
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
      // Este bloco é executado no momento do login (quando 'account' e 'user' existem)
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

            // CORREÇÃO: O n8n pode devolver um array com um único item. Acedemos ao primeiro.
            const permissionsObject = Array.isArray(permissionsData) ? permissionsData[0] : permissionsData;

            if (permissionsObject) {
                // LOG 3.1: Verificar o objeto que estamos a usar
                console.log('[AUTH LOG 3.1] Objeto de permissão a ser usado:', permissionsObject);
                token.is_admin = permissionsObject.is_admin;
                token.funcoes = permissionsObject.funcoes;
            } else {
                console.error('[AUTH ERRO] O formato dos dados de permissão é inválido.');
                token.is_admin = false;
                token.funcoes = [];
            }

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
      // Passa os dados do token para a sessão do cliente
      if (session.user) {
        session.user.is_admin = token.is_admin;
        session.user.funcoes = token.funcoes;
      }
      
      // LOG 5: Ver a sessão final que será enviada para o frontend
      console.log('[AUTH LOG 5] Sessão final enviada para o cliente:', session);
      return session;
    },
    async redirect({ url, baseUrl }) {
      return `${baseUrl}/painel`;
    },
  },
  pages: {
    signIn: "/login",
  },
  debug: true,
};
