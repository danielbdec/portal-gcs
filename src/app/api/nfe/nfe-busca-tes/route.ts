import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; // Verifique se o caminho para suas authOptions está correto
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // 1. Obtém a sessão do usuário logado
    const session = await getServerSession(authOptions);

    // 2. Valida se o usuário está autenticado
    if (!session?.user?.email) {
      return NextResponse.json({ erro: true, message: "Usuário não autenticado" }, { status: 401 });
    }

    const body = await request.json();

    // 3. Valida se o código da TES foi informado
    if (!body || !body.tesCode) {
      return NextResponse.json({ erro: true, message: "Código da TES não informado" }, { status: 400 });
    }

    // 4. Envia o 'tesCode' e 'email' para o webhook do n8n
    const resposta = await fetch("http://localhost:5678/webhook/nfe-busca-tes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: session.user.email,
        tesCode: body.tesCode.toUpperCase() // Envia o código da TES em maiúsculas
      })
    });

    // 5. Trata a resposta do n8n
    const raw = await resposta.text();

    if (!raw) {
      return NextResponse.json({ erro: true, message: "Não foi encontrada nenhuma TES com esse código, tente novamente." }, { status: 502 });
    }

    let data;
    try {
      data = JSON.parse(raw);
    } catch (err) {
      console.error("Erro ao fazer parse do JSON recebido do n8n:", err, raw);
      return NextResponse.json({ erro: true, message: "Resposta inválida do n8n" }, { status: 502 });
    }

    // 6. Retorna os dados para o frontend
    return NextResponse.json(data);

  } catch (e) {
    console.error("Erro no handler do route.ts (nfe-busca-tes):", e);
    return NextResponse.json({ erro: true, message: "Erro inesperado no servidor" }, { status: 500 });
  }
}