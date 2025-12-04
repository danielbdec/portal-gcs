import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

const WEBHOOK_URL = "http://localhost:5678/webhook/agrogestor-exclui-empreendimento";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ erro: true, message: "Usuário não autenticado" }, { status: 401 });
    }

    const body = await request.json();

    // Para excluir, o ID é a única informação obrigatória
    if (!body || !body.id) {
      return NextResponse.json({ erro: true, message: "O ID do registro a ser excluído não foi informado." }, { status: 400 });
    }
    
    const resposta = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: session.user.email,
        id: body.id, // Enviando o ID para o webhook
      })
    });

    const raw = await resposta.text();
    if (!raw) {
      return NextResponse.json({ erro: true, message: "Resposta vazia do serviço interno" }, { status: 502 });
    }

    const data = JSON.parse(raw);
    return NextResponse.json(data);

  } catch (e: any) {
    console.error("Erro no handler do route.ts (exclui-empreendimento):", e);
    return NextResponse.json({ erro: true, message: "Erro inesperado no servidor." }, { status: 500 });
  }
}