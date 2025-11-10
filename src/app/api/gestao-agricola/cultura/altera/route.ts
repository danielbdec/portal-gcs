import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; // Ajuste este caminho

// URL do webhook externo
const WEBHOOK_URL = 'http://localhost:5678/webhook/gestao-variedade-altera';

/**
 * Handler para POST - Alterar uma Variedade existente
 * Recebe os dados do cliente, encaminha para o webhook externo e retorna a resposta.
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
    console.error('[API /altera-variedade] Erro ao parsear JSON da requisição:', error);
    return NextResponse.json({ message: 'Corpo da requisição inválido.' }, { status: 400 });
  }

  // 3. Extrair o registro
  const { registro } = requestBody;

  if (!registro) {
    console.error('[API /altera-variedade] Requisição recebida sem o objeto "registro".');
    return NextResponse.json({ message: 'Dados do "registro" ausentes.' }, { status: 400 });
  }

  console.log('[API /altera-variedade] Recebido para alteração:', registro);

  try {
    // 4. Encaminhar os dados do *registro* para o webhook externo
    const fetchResponse = await fetch(WEBHOOK_URL, {
      method: 'POST', // ou PUT, dependendo do seu webhook
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(registro), // Encaminha o registro completo
    });

    // 5. Analisar a resposta do webhook
    const responseData = await fetchResponse.json();

    if (!fetchResponse.ok) {
      // Se o webhook retornar um erro (4xx, 5xx), repassa o erro
      console.error(`[API /altera-variedade] Webhook retornou erro ${fetchResponse.status}:`, responseData);
      return NextResponse.json(
        { message: 'Erro no serviço externo.', details: responseData },
        { status: fetchResponse.status }
      );
    }

    // 6. Retornar a resposta de sucesso do webhook para o cliente
    console.log('[API /altera-variedade] Resposta do Webhook:', responseData);
    return NextResponse.json(responseData, { status: 200 });

  } catch (error: any) {
    // Captura erros de rede (ex: webhook offline) ou erros de parse do JSON do webhook
    console.error('[API /altera-variedade] Erro ao contatar o webhook:', error.message);
    return NextResponse.json(
      { message: 'Erro interno ao processar a alteração.', error: error.message },
      { status: 500 }
    );
  }
}