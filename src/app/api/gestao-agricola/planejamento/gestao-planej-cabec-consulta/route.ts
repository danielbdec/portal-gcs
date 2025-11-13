import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; // Ajuste este caminho se a sua lib de auth estiver em outro local
import { NextRequest, NextResponse } from "next/server";

/**
 * Handler para POST - Consultar Cabeçalho do Planejamento Agrícola
 *
 * 1. Valida a sessão do usuário no servidor.
 * 2. Chama o webhook de consulta do N8N (gestao-planej-cabec-consulta).
 * 3. Retorna os dados (array de cabeçalhos) para o cliente.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Valida a sessão do usuário no servidor
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ message: "Usuário não autenticado" }, { status: 401 });
    }

    // 2. Define o endpoint do webhook de consulta de cabeçalho
    // A URL base vem do seu N8N: http://localhost:5678/webhook/
    const webhookUrl = "http://localhost:5678/webhook/gestao-planej-cabec-consulta";

    // 3. Chama o webhook
    const webhookResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        // Envia o e-mail do usuário (boa prática para auditoria)
        email: session.user.email,
      }),
      cache: "no-store", // Garante que os dados sejam sempre buscados
    });

    // 4. Trata erros vindos do n8n
    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text();
      console.error(`[API /gestao-planej-cabec-consulta] Webhook retornou erro ${webhookResponse.status}:`, errorText);
      return new NextResponse(errorText || "O serviço de consulta de cabeçalho retornou um erro.", { status: webhookResponse.status });
    }

    // 5. O n8n está configurado para "respondWith": "json", então lemos a resposta como JSON
    const jsonResponse = await webhookResponse.json();

    // 6. Retorna o JSON (array de dados) para o cliente
    return new NextResponse(JSON.stringify(jsonResponse), {
        status: 200,
        headers: {
            'Content-Type': 'application/json',
        },
    });

  } catch (e) {
    console.error("[API /gestao-planej-cabec-consulta] Erro no handler da rota:", e);
    return NextResponse.json({ message: "Erro inesperado no servidor" }, { status: 500 });
  }
}