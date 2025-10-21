import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; // Verifique se este caminho está correto
import { NextRequest, NextResponse } from "next/server";

// Força a API a nunca usar cache de ROTA
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ erro: true, message: "Usuário não autenticado" }, { status: 401 });
    }

    const clientBody = await request.json();

    const payload = {
      email: session.user.email,
      ...clientBody
    };

    const resposta = await fetch("http://localhost:5678/webhook/nfe-consulta-regras-fiscais", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload),
      // !! ESTA É A LINHA QUE FORÇA O FETCH A NÃO USAR CACHE !!
      cache: 'no-store'
    });

    const raw = await resposta.text();

    if (!raw) {
      return NextResponse.json([]);
    }

    let data;
    try {
      data = JSON.parse(raw);
    } catch (err) {
      console.error("Erro ao fazer parse do JSON recebido do n8n:", err, raw);
      return NextResponse.json({ erro: true, message: "Resposta inválida do n8n" }, { status: 502 });
    }

    return NextResponse.json(data);

  } catch (e) {
    console.error("Erro no handler do route.ts (nfe-consulta-regras-fiscais):", e);
    return NextResponse.json({ erro: true, message: "Erro inesperado no servidor" }, { status: 500 });
  }
}