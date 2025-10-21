// app/api/nfe/nfe-consulta-notas-cabecalho-paginado/route.ts
import { NextRequest, NextResponse } from 'next/server';

// Necessário para chamar http://localhost (ou host interno) a partir do Next
export const runtime = 'nodejs';
// Garante resposta dinâmica (sem cache)
export const dynamic = 'force-dynamic';

// Defina em .env se quiser:
// N8N_URL="http://srv.gcsagro.com.br:5678/webhook/consulta-nf-entrada-pg"
const N8N_URL =
  process.env.N8N_URL ??
  'http://localhost:5678/webhook/consulta-nf-entrada-pg';

export async function POST(req: NextRequest) {
  try {
    // Lê o body recebido do cliente (page, pageSize, sortBy, sortDir, filtros, etc.)
    const payload = await req.json().catch(() => ({}));

    const res = await fetch(N8N_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('Erro ao encaminhar para o n8n:', error);
    return NextResponse.json(
      { error: 'Erro ao consultar n8n' },
      { status: 502 }
    );
  }
}
