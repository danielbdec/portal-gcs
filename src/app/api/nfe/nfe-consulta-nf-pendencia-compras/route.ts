import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const result = await fetch('http://localhost:5678/webhook/consulta-nf-pendencia-compras', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      // ================== GARANTA QUE ESTA LINHA ESTEJA AQUI ==================
      // Esta opção força o Next.js a sempre buscar os dados mais recentes.
      cache: 'no-store',
      // ========================================================================
      body: JSON.stringify({}), 
    });

    const data = await result.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Erro ao buscar dados do n8n:', error);
    return NextResponse.json({ error: 'Erro ao buscar dados do n8n' }, { status: 500 });
  }
}