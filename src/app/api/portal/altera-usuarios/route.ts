import { NextResponse, NextRequest } from 'next/server';

// URL do seu webhook que altera os dados de um usuário no banco
const ALTERA_USUARIO_URL = 'http://localhost:5678/webhook/altera-usuarios';

/**
 * Rota para atualizar um usuário existente e suas funções associadas.
 * O front-end envia um corpo (body) com os dados completos do usuário.
 *
 * O webhook deve receber esses dados, encontrar o usuário pelo 'id' e
 * então executar uma transação para:
 * 1. Atualizar os campos na tabela 'portal_gcs_usuarios' (email, status, is_admin).
 * 2. Apagar todas as entradas existentes para este 'usuario_id' na tabela
 * 'portal_gcs_usuario_funcoes'.
 * 3. Inserir as novas permissões (o array 'funcao_ids') na tabela
 * 'portal_gcs_usuario_funcoes'.
 *
 * Exemplo de corpo (body) esperado da requisição:
 * {
 * "id": 2,
 * "email": "usuario.alterado@gcsagro.com.br",
 * "status": "inativo",
 * "is_admin": false,
 * "funcao_ids": [1, 5, 8]
 * }
 */
export async function POST(req: NextRequest) {
  try {
    // Pega os dados do usuário enviados pelo front-end
    const body = await req.json();

    // Validação para garantir que o ID foi enviado
    if (!body.id) {
        return NextResponse.json({ error: 'O ID do usuário é obrigatório para a alteração.' }, { status: 400 });
    }

    const result = await fetch(ALTERA_USUARIO_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      // Envia os dados completos do usuário para o webhook
      body: JSON.stringify(body),
    });

    if (!result.ok) {
        const errorText = await result.text();
        console.error('Erro na resposta do webhook (altera-usuario):', errorText);
        return NextResponse.json({ error: `Erro do webhook: ${result.statusText}` }, { status: result.status });
    }

    const data = await result.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Erro ao conectar com o webhook de alteração de usuário:', error);
    return NextResponse.json({ error: 'Erro interno ao alterar usuário' }, { status: 500 });
  }
}
