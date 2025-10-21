// src/app/api/portal/consulta-usuarios-funcoes/route.ts

import { NextResponse, NextRequest } from 'next/server';

// URL do webhook no n8n que busca as funções de um usuário pelo ID.
const N8N_WEBHOOK_URL = 'http://localhost:5678/webhook/consulta-usuarios-funcoes';

/**
 * Rota que recebe um ID de usuário e o repassa para o webhook do n8n
 * para buscar as funções (permissões) associadas.
 */
export async function POST(req: NextRequest) { // Adicionado 'req: NextRequest' para ler o corpo
  try {
    // Pega o corpo da requisição enviado pelo front-end (ex: { "id": 15 })
    const body = await req.json();

    // Validação para garantir que o ID foi enviado no corpo da requisição
    if (!body.id) {
      return NextResponse.json({ error: 'O ID do usuário é obrigatório.' }, { status: 400 });
    }

    // Faz a chamada para o webhook do n8n
    const result = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
      // Envia o corpo completo recebido (que contém o ID) para o n8n
      body: JSON.stringify(body),
    });

    // Trata a resposta do webhook
    if (!result.ok) {
        const errorText = await result.text();
        console.error('Erro na resposta do webhook (consulta-usuarios-funcoes):', errorText);
        return NextResponse.json({ error: `Erro do webhook: ${result.statusText}` }, { status: result.status });
    }

    const data = await result.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Erro ao conectar com o webhook de funções do usuário:', error);
    return NextResponse.json({ error: 'Erro interno ao buscar dados das funções do usuário' }, { status: 500 });
  }
}
