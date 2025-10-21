import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; // Verifique se este caminho está correto
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ erro: true, message: "Usuário não autenticado" }, { status: 401 });
    }

    const body = await request.json();

    // Valida se o ID do registro foi informado
    if (!body || !body.id) {
      return NextResponse.json({ erro: true, message: "ID do registro não informado." }, { status: 400 });
    }

    // Envia o ID e o email do usuário para o webhook do n8n
    const resposta = await fetch("http://localhost:5678/webhook/nfe-exclui-regras-fiscais", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: session.user.email,
        id: body.id, // ID puro do registro a ser excluído
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
    console.error("Erro no handler do route.ts (nfe-exclui-regras-fiscais):", e);
    return NextResponse.json({ erro: true, message: "Erro inesperado no servidor" }, { status: 500 });
  }
}