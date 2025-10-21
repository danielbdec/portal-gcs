// src/app/api/nfe/nfe-consulta-notas-cabecalho/route.ts

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

// ✅ ALTERADO: A função agora recebe 'request' para poder acessar a sessão
export async function POST(request: NextRequest) {
  try {
    // 1. Obtém a sessão do usuário logado
    const session = await getServerSession(authOptions);

    // 2. Valida se o usuário está autenticado
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Usuário não autenticado' }, { status: 401 });
    }

    // 3. Faz a chamada para o webhook enviando o email do usuário no corpo
    const result = await fetch('http://187.32.243.161:5678/webhook/nfe-busca-nf-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      // ✅ ALTERADO: Corpo da requisição agora envia o e-mail do usuário logado
      body: JSON.stringify({ email: session.user.email }),
    });

    // 4. Tratamento de erro caso a chamada para o webhook falhe
    if (!result.ok) {
        const errorBody = await result.text();
        console.error(`Erro do n8n: ${result.status} ${result.statusText}`, errorBody);
        return NextResponse.json({ error: `Erro na comunicação com o serviço: ${result.statusText}`, details: errorBody }, { status: result.status });
    }

    const data = await result.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Erro ao buscar dados do n8n:', error);
    return NextResponse.json({ error: 'Erro ao buscar dados do n8n' }, { status: 500 });
  }
}