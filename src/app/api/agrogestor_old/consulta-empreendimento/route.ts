import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; // Verifique se este caminho está correto
import { NextRequest, NextResponse } from "next/server";

// URL do webhook que consulta os dados no seu serviço interno.
const WEBHOOK_URL = "http://localhost:5678/webhook/agrogestor-consulta-empreendimento";

export async function POST(request: NextRequest) {
  try {
    // 1. Autenticação: Garante que apenas usuários logados possam consultar os dados.
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ erro: true, message: "Usuário não autenticado" }, { status: 401 });
    }

    // 2. Chamada para o Webhook de Consulta
    // Mesmo sendo uma consulta, usamos POST para manter o padrão e enviar o email do usuário para possível auditoria.
    const resposta = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: session.user.email,
      })
    });

    // 3. Tratamento da Resposta do Webhook
    const raw = await resposta.text();

    if (!raw) {
      // Se a resposta for vazia, retorna um array vazio (nenhum empreendimento encontrado).
      return NextResponse.json([]);
    }

    let data;
    try {
      data = JSON.parse(raw);
    } catch (err) {
      console.error("Erro ao fazer parse do JSON recebido do webhook de consulta:", err, raw);
      return NextResponse.json({ erro: true, message: "Resposta inválida do serviço interno" }, { status: 502 });
    }

    // Retorna os dados consultados (a lista de empreendimentos) para o front-end.
    return NextResponse.json(data);

  } catch (e: any) {
    console.error("Erro no handler do route.ts (consulta-empreendimento):", e);
    // Em caso de erro de conexão (ECONNREFUSED, etc.), o erro será capturado aqui.
    return NextResponse.json({ erro: true, message: "Erro inesperado no servidor ao consultar empreendimentos." }, { status: 500 });
  }
}