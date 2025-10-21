import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; // Verifique se este caminho está correto
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // 1. Obtém a sessão do utilizador logado
    const session = await getServerSession(authOptions);

    // 2. Valida se o utilizador está autenticado
    if (!session?.user?.email) {
      return NextResponse.json({ erro: true, message: "Usuário não autenticado" }, { status: 401 });
    }

    const body = await request.json();

    if (!body || !body.chave) {
      console.warn("Requisição sem chave recebida:", body);
      return NextResponse.json({ erro: true, message: "Chave não informada" }, { status: 400 });
    }

    // 3. Envia a 'chave' E o 'email' para o webhook do n8n
    const resposta = await fetch("http://localhost:5678/webhook/nfe-reprocessa", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ 
        chave: body.chave,
        email: session.user.email // Adiciona o email da sessão
      })
    });

    const raw = await resposta.text();

    if (!raw) {
      return NextResponse.json({ erro: true, message: "Resposta vazia do n8n" }, { status: 502 });
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
    console.error("Erro no handler do route.ts:", e);
    return NextResponse.json({ erro: true, message: "Erro inesperado" }, { status: 500 });
  }
}
