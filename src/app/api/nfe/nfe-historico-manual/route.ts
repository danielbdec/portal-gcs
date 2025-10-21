// app/api/nfe/nfe-historico-manual/route.ts
import { NextRequest, NextResponse } from 'next/server';

// Necessário para chamar http://localhost (ou host interno) a partir do Next
export const runtime = 'nodejs';
// Garante resposta dinâmica (sem cache)
export const dynamic = 'force-dynamic';

// Defina em .env se quiser:
// N8N_HISTORICO_URL="http://srv.gcsagro.com.br:5678/webhook/nfe-historico-manual"
const N8N_URL =
  process.env.N8N_HISTORICO_URL ??
  'http://localhost:5678/webhook/nfe-historico-manual';

export async function POST(req: NextRequest) {
  try {
    // Lê o body recebido do cliente (ModalDetalhes):
    // { chave, email_solicitante, historico }
    const payload = await req.json().catch(() => ({}));

    // Encaminha o payload para o webhook do n8n
    const res = await fetch(N8N_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify(payload),
    });

    // O n8n deve responder com { status: 'ok' } ou { status: 'error' }
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('Erro ao encaminhar para o n8n (historico-manual):', error);
    return NextResponse.json(
      { error: 'Erro ao consultar n8n' },
      { status: 502 }
    );
  }
}