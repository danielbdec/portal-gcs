import { NextResponse, NextRequest } from 'next/server';

// URL do seu webhook que cria uma nova função/permissão no banco
const CRIA_FUNCAO_URL = 'http://localhost:5678/webhook/cria-funcao';

/**
 * Rota para criar uma nova função (permissão) no sistema.
 * O front-end envia os dados da nova permissão a ser cadastrada.
 *
 * O webhook deve receber esses dados e executar um INSERT na tabela
 * 'portal_gcs_funcoes'.
 *
 * Exemplo de corpo (body) esperado da requisição:
 * {
 * "nome_chave": "nfEntrada.visaoGeral",
 * "modulo": "NF Entrada",
 * "descricao": "Acessar a tela de Visão Geral da NF-e"
 * }
 */
export async function POST(req: NextRequest) {
  try {
    // Pega os dados da nova função enviados pelo front-end
    const body = await req.json();

    // Validação simples para garantir que os campos essenciais foram enviados
    if (!body.nome_chave || !body.modulo || !body.descricao) {
      return NextResponse.json({ error: 'Todos os campos (chave, módulo e descrição) são obrigatórios.' }, { status: 400 });
    }

    const result = await fetch(CRIA_FUNCAO_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      // Envia os dados da nova função para o webhook
      body: JSON.stringify(body),
    });

    if (!result.ok) {
        const errorText = await result.text();
        console.error('Erro na resposta do webhook (cria-funcao):', errorText);
        return NextResponse.json({ error: `Erro do webhook: ${result.statusText}` }, { status: result.status });
    }

    const data = await result.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Erro ao conectar com o webhook de criação de função:', error);
    return NextResponse.json({ error: 'Erro interno ao criar função' }, { status: 500 });
  }
}
