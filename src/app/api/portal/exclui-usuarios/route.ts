import { NextResponse, NextRequest } from 'next/server';

// URL do seu webhook que exclui um usuário do banco de dados
const EXCLUI_USUARIO_URL = 'http://localhost:5678/webhook/exclui-usuarios';

/**
 * Rota para excluir um usuário permanentemente do sistema.
 * O front-end envia um corpo (body) contendo apenas o 'id' do usuário.
 *
 * O webhook deve receber o 'id' e executar um comando DELETE na tabela
 * 'portal_gcs_usuarios'. Graças à configuração 'ON DELETE CASCADE' na
 * chave estrangeira, todas as permissões associadas na tabela
 * 'portal_gcs_usuario_funcoes' serão removidas automaticamente.
 *
 * Exemplo de corpo (body) esperado da requisição:
 * {
 * "id": 3
 * }
 */
export async function POST(req: NextRequest) {
  try {
    // Pega os dados enviados pelo front-end
    const body = await req.json();

    if (!body.id) {
      return NextResponse.json({ error: 'O ID do usuário é obrigatório para a exclusão.' }, { status: 400 });
    }

    const result = await fetch(EXCLUI_USUARIO_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      // Envia apenas o ID para o webhook
      body: JSON.stringify(body),
    });

    if (!result.ok) {
        const errorText = await result.text();
        console.error('Erro na resposta do webhook (exclui-usuario):', errorText);
        return NextResponse.json({ error: `Erro do webhook: ${result.statusText}` }, { status: result.status });
    }

    const data = await result.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Erro ao conectar com o webhook de exclusão de usuário:', error);
    return NextResponse.json({ error: 'Erro interno ao excluir usuário' }, { status: 500 });
  }
}
