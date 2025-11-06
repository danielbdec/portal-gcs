import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; // Verifique se o caminho para authOptions está correto
import { NextRequest, NextResponse } from "next/server";

/**
 * @api {POST} /api/caderno-agricola/caderno-agricola-cultura-consulta
 * @description Rota para buscar as culturas associadas a um Caderno Agrícola específico.
 * @body {number} id_caderno - O ID do caderno principal (ex: o ID que vem da 'page.tsx').
 * * @returns {Array} Retorna um array de objetos (culturas) se bem-sucedido.
 * @returns {object} Retorna um objeto de erro em caso de falha.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ message: "Usuário não autenticado" }, { status: 401 });
    }

    // --- ETAPA 1: Ler o corpo da requisição do frontend ---
    const body = await request.json();
    const { id_caderno } = body; // O frontend deve enviar { "id_caderno": 123 }

    // --- ETAPA 2: Validar se o ID foi recebido ---
    if (!id_caderno) {
      return NextResponse.json({ message: "O 'id_caderno' é obrigatório no corpo da requisição." }, { status: 400 }); // 400 Bad Request
    }

    // --- ETAPA 3: Definir a URL do Webhook ---
    const webhookUrl = "http://localhost:5678/webhook/caderno-agricola-cultura-consulta";

    // --- ETAPA 4: Chamar o Webhook (n8n) passando o e-mail e o id_caderno ---
    const webhookResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: session.user.email,
        id_caderno: id_caderno // Repassa o ID para o fluxo n8n
      }),
    });

    // --- ETAPA 5: Tratar a resposta do Webhook ---
    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text();
      console.error("A chamada ao webhook de consulta de CULTURAS falhou:", errorText);
      return new NextResponse(errorText || "O serviço de consulta de CULTURAS retornou um erro.", { status: webhookResponse.status });
    }

    // O n8n deve retornar um JSON (array de culturas)
    const jsonResponse = await webhookResponse.json();

    // --- ETAPA 6: Retornar a resposta para o frontend ---
    return new NextResponse(JSON.stringify(jsonResponse), {
        status: 200,
        headers: {
            'Content-Type': 'application/json',
        },
    });

  } catch (e: any) {
    // Pega erros da requisição (ex: JSON mal formatado) ou da lógica
    console.error("Erro no handler da rota (caderno-agricola-cultura-consulta):", e);
    return NextResponse.json({ message: e.message || "Erro inesperado no servidor" }, { status: 500 });
  }
}