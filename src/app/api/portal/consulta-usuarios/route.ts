import { NextResponse } from 'next/server';

// URL do seu webhook que consulta os usuários no banco de dados
const CONSULTA_USUARIOS_URL = 'http://localhost:5678/webhook/consulta-usuarios';

/**
 * Rota para buscar todos os usuários e suas respectivas funções.
 * O webhook deve ser configurado para buscar os dados das tabelas
 * 'portal_gcs_usuarios' e 'portal_gcs_usuario_funcoes' e retornar
 * um array de objetos, onde cada objeto de usuário contém um array
 * com os IDs de suas funções.
 *
 * Exemplo de retorno esperado do webhook:
 * [
 * { 
 * "id": 1, 
 * "email": "admin@gcs.com.br", 
 * "status": "ativo", 
 * "is_admin": true,
 * "funcoes": [] // Admin não precisa, mas pode ter
 * },
 * { 
 * "id": 2, 
 * "email": "usuario@gcs.com.br", 
 * "status": "ativo", 
 * "is_admin": false,
 * "funcoes": [1, 3, 5] 
 * }
 * ]
 */
export async function POST() {
  try {
    const result = await fetch(CONSULTA_USUARIOS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // Garante que os dados sejam sempre buscados do servidor, sem usar cache.
      cache: 'no-store',
      body: JSON.stringify({}), // Corpo vazio, pois a consulta é para todos os usuários
    });

    if (!result.ok) {
        const errorText = await result.text();
        console.error('Erro na resposta do webhook (consulta-usuarios):', errorText);
        return NextResponse.json({ error: `Erro do webhook: ${result.statusText}` }, { status: result.status });
    }

    const data = await result.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Erro ao conectar com o webhook de consulta de usuários:', error);
    return NextResponse.json({ error: 'Erro interno ao buscar usuários' }, { status: 500 });
  }
}
