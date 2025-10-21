// src/app/api/portal/consulta-usuarios-funcoes/route.ts

import { NextResponse, NextRequest } from 'next/server';

// ATENÇÃO: Crie este novo webhook no seu n8n.
// Ele será responsável por buscar as funções de um usuário específico pelo ID.
const CONSULTA_FUNCOES_URL = 'http://localhost:5678/webhook/portal/consulta-funcoes-por-usuario';

/**
 * Rota para buscar as funções (permissões) de um único usuário pelo seu ID.
 * Esta API é chamada pelo front-end quando o administrador clica em "Gerenciar".
 *
 * O webhook no n8n deve receber um ID, consultar a tabela 'portal_gcs_usuario_funcoes'
 * e devolver um array de objetos contendo os IDs das funções.
 *
 * Exemplo de corpo (body) esperado da requisição para esta API:
 * {
 * "id": 15
 * }
 *
 * Exemplo de retorno esperado do webhook:
 * [
 * { "funcao_id": 1 },
 * { "funcao_id": 5 },
 * { "funcao_id": 8 }
 * ]
 */
export async function POST(req: NextRequest) {
  try {
    // Pega os dados enviados pelo front-end (ex: { id: 15 })
    const body = await req.json();

    // Validação para garantir que o ID foi enviado
    if (!body.id) {
      return NextResponse.json({ error: 'O ID do usuário é obrigatório.' }, { status: 400 });
    }

    // Faz a chamada para o seu novo webhook no n8n
    const result = await fetch(CONSULTA_FUNCOES_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store', // Garante que os dados de permissão sejam sempre frescos
      // Envia o ID para o webhook
      body: JSON.stringify({ id: body.id }),
    });

    // Trata erros caso o n8n não responda corretamente
    if (!result.ok) {
        const errorText = await result.text();
        console.error('Erro na resposta do webhook (consulta-funcoes-por-usuario):', errorText);
        return NextResponse.json({ error: `Erro do webhook: ${result.statusText}` }, { status: result.status });
    }

    // Se tudo deu certo, retorna os dados (o array de funções) para o front-end
    const data = await result.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Erro ao conectar com o webhook de consulta de funções:', error);
    return NextResponse.json({ error: 'Erro interno ao buscar funções do usuário' }, { status: 500 });
  }
}
