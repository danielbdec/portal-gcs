import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    id?: string;
    user: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      perfil?: string;
    };
  }

  interface User {
    perfil?: string;
  }

  interface JWT {
    accessToken?: string;
    sub?: string;
  }
}
