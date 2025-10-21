import { NextResponse } from 'next/server';

const N8N_WEBHOOK_URL = 'http://localhost:5678/webhook/consulta-funcoes';

export async function POST() { // Alterado de GET para POST
  try {
    const result = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
      body: JSON.stringify({}),
    });

    if (!result.ok) {
        const errorText = await result.text();
        console.error('Erro na resposta do webhook (funcoes):', errorText);
        return NextResponse.json({ error: `Erro do webhook: ${result.statusText}` }, { status: result.status });
    }

    const data = await result.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Erro ao conectar com o webhook de funções:', error);
    return NextResponse.json({ error: 'Erro interno ao buscar dados das funções' }, { status: 500 });
  }
}