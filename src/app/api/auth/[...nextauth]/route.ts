import NextAuth from "next-auth";
import { authOptions } from "@/lib/authOptions"; // ou relativo se necessário

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
