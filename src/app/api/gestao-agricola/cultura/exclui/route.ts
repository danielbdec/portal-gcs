import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; // Ajuste este caminho

// URL do webhook externo
const WEBHOOK_URL = 'http://localhost:5678/webhook/gestao-variedade-exclui';

/**
 * Handler para POST - Excluir uma Variedade existente
 * Recebe o ID do cliente, encaminha para o webhook externo e retorna a resposta.
 */
export async function POST(request: NextRequest) {
  let requestBody;
  
  try {
    // 1. Valida a sessão do usuário no servidor
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ message: "Usuário não autenticado" }, { status: 401 });
    }

    // 2. Parsear o corpo da requisição vinda do cliente
    requestBody = await request.json();
  } catch (error) {
    console.error('[API /exclui-variedade] Erro ao parsear JSON da requisição:', error);
    return NextResponse.json({ message: 'Corpo da requisição inválido.' }, { status: 400 });
  }

  // 3. Extrair o ID (diferente dos outros handlers)
  const { id } = requestBody;

  if (!id) {
    console.error('[API /exclui-variedade] Requisição recebida sem o "id".');
    return NextResponse.json({ message: 'Dados do "id" ausentes.' }, { status: 400 });
  }

  console.log('[API /exclui-variedade] Recebido para exclusão (ID):', id);

  try {
    // 4. Encaminhar os dados (apenas o ID) para o webhook externo
    const fetchResponse = await fetch(WEBHOOK_URL, {
      method: 'POST', // ou DELETE, dependendo do seu webhook
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id: id }), // Encaminha o ID
    });

    // 5. Analisar a resposta do webhook
    const responseData = await fetchResponse.json();

    if (!fetchResponse.ok) {
      // Se o webhook retornar um erro (4xx, 5xx), repassa o erro
      console.error(`[API /exclui-variedade] Webhook retornou erro ${fetchResponse.status}:`, responseData);
      return NextResponse.json(
        { message: 'Erro no serviço externo.', details: responseData },
        { status: fetchResponse.status }
      );
    }

    // 6. Retornar a resposta de sucesso do webhook para o cliente
    console.log('[API /exclui-variedade] Resposta do Webhook:', responseData);
    return NextResponse.json(responseData, { status: 200 });

  } catch (error: any) {
    // Captura erros de rede (ex: webhook offline) ou erros de parse do JSON do webhook
    console.error('[API /exclui-variedade] Erro ao contatar o webhook:', error.message);
    return NextResponse.json(
      { message: 'Erro interno ao processar a exclusão.', error: error.message },
      { status: 500 }
    );
  }
}