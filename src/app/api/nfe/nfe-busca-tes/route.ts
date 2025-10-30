// app/api/algum-caminho/consulta-tes/route.ts
// (Lembre-se de colocar este arquivo no caminho da API que desejar)

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; // Verifique se este caminho está correto
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // 1. Obtém a sessão do usuário logado
    const session = await getServerSession(authOptions);

    // 2. Valida se o usuário está autenticado
    if (!session?.user?.email) {
      return NextResponse.json(
        { erro: true, message: "Usuário não autenticado" },
        { status: 401 }
      );
    }

    const body = await request.json();

    // 3. ✅ ALTERADO: Valida se o 'tesCode' foi informado
    // O fluxo n8n espera por 'tesCode' para usar na query SQL
    if (!body || !body.tesCode) {
      console.warn("Requisição sem 'tesCode' recebida:", body);
      return NextResponse.json(
        { erro: true, message: "Código TES (tesCode) não informado" },
        { status: 400 }
      );
    }

    // 4. ✅ ALTERADO: Envia 'tesCode' e 'email' para o webhook do n8n
    // O endpoint foi atualizado para 'nfe-busca-tes'
    const resposta = await fetch(
      "http://localhost:5678/webhook/nfe-busca-tes",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tesCode: body.tesCode,
          email: session.user.email, // É uma boa prática manter o email para logs
        }),
      }
    );

    const raw = await resposta.text();

    if (!raw) {
      return NextResponse.json(
        { erro: true, message: "Resposta vazia do n8n" },
        { status: 502 }
      );
    }

    // 5. O fluxo n8n já retorna um JSON (graças ao node "Respond to Webhook4")
    let data;
    try {
      data = JSON.parse(raw);
    } catch (err) {
      console.error("Erro ao fazer parse do JSON recebido do n8n:", err, raw);
      return NextResponse.json(
        { erro: true, message: "Resposta inválida do n8n" },
        { status: 502 }
      );
    }

    // 6. Retorna os dados processados pelo n8n para o frontend
    return NextResponse.json(data);
  } catch (e) {
    console.error("Erro no handler do route.ts:", e);
    return NextResponse.json(
      { erro: true, message: "Erro inesperado" },
      { status: 500 }
    );
  }
}