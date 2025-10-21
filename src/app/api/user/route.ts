// src/app/api/user/route.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth"; // ou o local correto do seu authOptions
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);

  return NextResponse.json({
    email: session?.user?.email || null,
  });
}
