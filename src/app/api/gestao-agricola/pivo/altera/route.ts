import { NextResponse, NextRequest } from 'next/server';

// URL do webhook externo
const WEBHOOK_URL = 'http://localhost:5678/webhook/gestao-pivo-altera';

/**
 * Handler para POST - Alterar um Pivô/Talhão existente
 * Recebe os dados do cliente, encaminha para o webhook externo e retorna a resposta.
 */
export async function POST(request: NextRequest) {
  let requestBody;
  try {
    // 1. Parsear o corpo da requisição vinda do cliente (page.tsx)
    requestBody = await request.json();
  } catch (error) {
    console.error('[API /altera] Erro ao parsear JSON da requisição:', error);
    return NextResponse.json({ message: 'Corpo da requisição inválido.' }, { status: 400 });
  }

  // 2. Extrair o registro
  const { registro } = requestBody;

  if (!registro) {
    console.error('[API /altera] Requisição recebida sem o objeto "registro".');
    return NextResponse.json({ message: 'Dados do "registro" ausentes.' }, { status: 400 });
  }

  console.log('[API /altera] Recebido para alteração:', registro);

  try {
    // 3. Encaminhar os dados do *registro* para o webhook externo
    const fetchResponse = await fetch(WEBHOOK_URL, {
      method: 'POST', // ou PUT, dependendo do seu webhook
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(registro), // Encaminha o registro completo
    });

    // 4. Analisar a resposta do webhook
    const responseData = await fetchResponse.json();

    if (!fetchResponse.ok) {
      // Se o webhook retornar um erro (4xx, 5xx), repassa o erro
      console.error(`[API /altera] Webhook retornou erro ${fetchResponse.status}:`, responseData);
      return NextResponse.json(
        { message: 'Erro no serviço externo.', details: responseData },
        { status: fetchResponse.status }
      );
    }

    // 5. Retornar a resposta de sucesso do webhook para o cliente (page.tsx)
    console.log('[API /altera] Resposta do Webhook:', responseData);
    return NextResponse.json(responseData, { status: 200 });

  } catch (error: any) {
    // Captura erros de rede (ex: webhook offline) ou erros de parse do JSON do webhook
    console.error('[API /altera] Erro ao contatar o webhook:', error.message);
    return NextResponse.json(
      { message: 'Erro interno ao processar a alteração.', error: error.message },
      { status: 500 }
    );
  }
}