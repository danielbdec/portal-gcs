import { NextResponse, NextRequest } from 'next/server';

export const runtime = 'nodejs'; // garante Node, não Edge
const FILE_MICROSERVICE_URL = 'http://localhost:3203';

export async function POST(request: NextRequest) {
  try {
    const { relKey, nome_arquivo } = await request.json();

    if (!relKey) {
      return NextResponse.json(
        { error: 'relKey é obrigatório.' },
        { status: 400 }
      );
    }

    // monta URL para o microserviço (ele espera "key")
    const url = new URL('/download', FILE_MICROSERVICE_URL);
    url.searchParams.set('key', relKey);
    if (nome_arquivo) url.searchParams.set('name', nome_arquivo);

    // chama o microserviço
    const resp = await fetch(url.toString(), {
      method: 'GET',
      cache: 'no-store',
    });

    if (!resp.ok) {
      let msg = `Falha ao baixar arquivo (${resp.status})`;
      try {
        const j = await resp.json();
        if (j?.error) msg = j.error;
      } catch { /* ignore */ }
      return NextResponse.json({ error: msg }, { status: resp.status || 502 });
    }

    // *** Bufferiza o corpo ***
    const buf = await resp.arrayBuffer();

    // Preserve os headers do micro
    const headers = new Headers();
    const upstreamCT = resp.headers.get('content-type') || 'application/octet-stream';
    const upstreamCD = resp.headers.get('content-disposition');
    headers.set('Content-Type', upstreamCT);

    if (upstreamCD) {
      headers.set('Content-Disposition', upstreamCD);
    } else {
      // fallback: evita encodeURIComponent no filename visível
      const safeName = (nome_arquivo || 'arquivo.bin').replace(/[\r\n"]/g, '');
      headers.set('Content-Disposition', `attachment; filename="${safeName}"`);
      // opcional: RFC5987 para Unicode
      headers.append('Content-Disposition', `; filename*=UTF-8''${encodeRFC5987ValueChars(safeName)}`);
    }

    headers.set('Content-Length', String(buf.byteLength));
    headers.set('Cache-Control', 'no-store');

    return new NextResponse(buf, { status: 200, headers });
  } catch (err: any) {
    console.error('Erro interno na API de download:', err);
    return NextResponse.json(
      { error: 'Erro interno no servidor ao processar o download.' },
      { status: 500 }
    );
  }
}

/** Codifica valor para filename* (RFC 5987) */
function encodeRFC5987ValueChars(str: string) {
  return encodeURIComponent(str)
    .replace(/['()]/g, escape)
    .replace(/\*/g, '%2A');
}
