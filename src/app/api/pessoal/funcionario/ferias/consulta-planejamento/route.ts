 import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; // Ajuste este caminho se a sua lib de auth estiver em outro local
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // 1. Valida a sessão do usuário no servidor
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ message: "Usuário não autenticado" }, { status: 401 });
    }

    // 2. Define o endpoint do webhook do n8n para consulta de planejamento de férias
    const webhookUrl = "http://localhost:5678/webhook/pessoal-ferias-consulta-planejamento";

    // 3. Chama o webhook
    const webhookResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        // Envia o e-mail do usuário para filtrar o planejamento dele
        email: session.user.email,
      }),
      cache: "no-store", // Garante que os dados sejam sempre frescos
    });

    // 4. Trata erros vindos do n8n
    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text();
      console.error("A chamada ao webhook de consulta de planejamento de férias falhou:", errorText);
      return new NextResponse(errorText || "O serviço de consulta de férias retornou um erro.", { status: webhookResponse.status });
    }

    // 5. O n8n retorna o JSON com o array de planejamentos (conforme o exemplo que você forneceu)
    const jsonResponse = await webhookResponse.json();

    // 6. Retorna o JSON para o cliente
    return new NextResponse(JSON.stringify(jsonResponse), {
        status: 200,
        headers: {
            'Content-Type': 'application/json',
        },
    });

  } catch (e) {
    console.error("Erro no handler da rota (pessoal-ferias-consulta-planejamento):", e);
    return NextResponse.json({ message: "Erro inesperado no servidor" }, { status: 500 });
  }
}