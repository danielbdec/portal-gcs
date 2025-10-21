import { NextResponse, NextRequest } from 'next/server';

// URL do seu webhook que cria um novo usuário no banco
const CRIA_USUARIO_URL = 'http://localhost:5678/webhook/cria-usuarios';

/**
 * Rota para criar um novo usuário e associar suas funções.
 * O front-end envia um corpo (body) com os dados do novo usuário.
 *
 * O webhook deve receber esses dados e:
 * 1. Inserir um novo registro na tabela 'portal_gcs_usuarios'.
 * 2. Obter o ID do usuário recém-criado.
 * 3. Inserir as permissões (o array 'funcao_ids') na tabela
 * 'portal_gcs_usuario_funcoes', associando-as ao novo ID.
 *
 * Exemplo de corpo (body) esperado da requisição:
 * {
 * "email": "novo.usuario@gcs.com.br",
 * "status": "ativo",
 * "is_admin": false,
 * "funcao_ids": [2, 4]
 * }
 */
export async function POST(req: NextRequest) {
  try {
    // Pega os dados do usuário enviados pelo front-end
    const body = await req.json();

    if (!body.email) {
        return NextResponse.json({ error: 'O email do usuário é obrigatório para a criação.' }, { status: 400 });
    }

    const result = await fetch(CRIA_USUARIO_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      // Envia os dados do novo usuário para o webhook
      body: JSON.stringify(body),
    });

    if (!result.ok) {
        const errorText = await result.text();
        console.error('Erro na resposta do webhook (cria-usuario):', errorText);
        return NextResponse.json({ error: `Erro do webhook: ${result.statusText}` }, { status: result.status });
    }

    const data = await result.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Erro ao conectar com o webhook de criação de usuário:', error);
    return NextResponse.json({ error: 'Erro interno ao criar usuário' }, { status: 500 });
  }
}
