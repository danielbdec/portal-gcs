// pages/api/nfe-danfe.ts
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // 1. Obtém a sessão do utilizador logado (Correto)
    const session = await getServerSession(authOptions);

    // 2. Valida se o utilizador está autenticado (Correto)
    if (!session?.user?.email) {
      return NextResponse.json({ message: "Usuário não autenticado" }, { status: 401 });
    }

    const body = await request.json();

    if (!body || !body.chave) {
      return NextResponse.json({ message: "Chave não informada" }, { status: 400 });
    }

    // 3. Envia a 'chave' E o 'email' para o webhook do n8n (Correto)
    const n8nWebhookUrl = "http://localhost:5678/webhook/nfe-danfe";
    if (!n8nWebhookUrl) {
      throw new Error("URL do webhook N8N não configurada.");
    }

    const n8nResponse = await fetch(n8nWebhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        chave: body.chave,
        email: session.user.email
      })
    });

    // 4. Se a resposta do N8N não for OK, repassa o erro (Boa Prática)
    if (!n8nResponse.ok) {
        const errorText = await n8nResponse.text();
        return new Response(errorText || "Erro ao gerar a DANFE no serviço.", { status: n8nResponse.status });
    }
    
    // 5. ✅ CORREÇÃO: Pega o HTML e o devolve DIRETAMENTE
    const htmlDanfe = await n8nResponse.text();

    if (!htmlDanfe) {
        return new Response("Serviço retornou uma resposta vazia.", { status: 502 });
    }

    // Retorna o HTML com o Content-Type correto para o navegador renderizar
    return new Response(htmlDanfe, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });

  } catch (e: any) {
    console.error("Erro no handler do nfe-danfe:", e);
    return NextResponse.json({ message: e.message || "Erro inesperado" }, { status: 500 });
  }
}