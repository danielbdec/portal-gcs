// app/api/nfe/nfe-conferencia/route.ts
import { NextRequest, NextResponse } from 'next/server';

// Necessário para chamar http://localhost (ou host interno) a partir do Next
export const runtime = 'nodejs';
// Garante resposta dinâmica (sem cache)
export const dynamic = 'force-dynamic';

// URL do webhook N8N para MARCAR NOTA COMO CONFERIDA
const N8N_URL =
  process.env.N8N_CONFERENCIA_URL ??
  'http://localhost:5678/webhook/nfe-conferencia';

export async function POST(req: NextRequest) {
  console.log(`[route.ts] Recebida requisição POST para /api/nfe/nfe-conferencia`); // Log 1: Rota acionada

  try {
    const payload = await req.json().catch(() => {
        console.error("[route.ts] Erro ao fazer parse do JSON do body da requisição."); // Log 2: Erro de parse
        return {};
    });
    console.log("[route.ts] Payload recebido do frontend:", payload); // Log 3: Payload recebido

    // Verifica se os dados essenciais estão presentes antes de chamar o n8n
    if (!payload.chave || !payload.email_solicitante || !payload.conferido) {
        console.error("[route.ts] Erro: Payload incompleto. Chave, email ou conferido faltando."); // Log 4: Payload incompleto
        return NextResponse.json(
          { error: 'Payload incompleto', message: 'Chave, email_solicitante e conferido são obrigatórios.' },
          { status: 400 } // Bad Request
        );
    }

    const n8nPayload = { ...payload };

    console.log(`[route.ts] Tentando chamar n8n na URL: ${N8N_URL}`); // Log 5: URL do n8n
    console.log("[route.ts] Enviando payload para n8n:", JSON.stringify(n8nPayload)); // Log 6: Payload para n8n

    const res = await fetch(N8N_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify(n8nPayload),
    });

    console.log(`[route.ts] Resposta recebida do n8n com status HTTP: ${res.status}`); // Log 7: Status da resposta do n8n

    // Tenta ler a resposta do n8n como JSON
    let data = {};
    try {
        data = await res.json();
        console.log("[route.ts] Corpo da resposta do n8n (JSON):", data); // Log 8: Corpo da resposta do n8n
    } catch (jsonError) {
        // Se falhar, lê como texto (pode ser um erro HTML do n8n ou do proxy)
        const textResponse = await res.text().catch(() => "Erro ao ler corpo da resposta do n8n");
        console.error("[route.ts] Resposta do n8n não é JSON. Resposta como Texto:", textResponse); // Log 9: Resposta n8n não-JSON
        // Retorna um erro 502 indicando que a comunicação com o n8n falhou
        return NextResponse.json(
          { error: 'Erro de comunicação com o n8n', message: `O n8n respondeu com status ${res.status} mas o corpo não era JSON.`, n8n_response: textResponse },
          { status: 502 } // Bad Gateway
        );
    }

    // Verifica se a resposta HTTP do n8n foi bem-sucedida (2xx)
    if (!res.ok) {
        console.error(`[route.ts] Erro: n8n respondeu com status ${res.status}.`); // Log 10: Erro HTTP do n8n
        // Retorna o erro vindo do n8n (se houver) e o status correto
        return NextResponse.json(
          { error: 'Erro retornado pelo n8n', ...(data as object) }, // Inclui a resposta JSON do n8n no erro
          { status: res.status } // Retorna o mesmo status de erro do n8n
        );
    }

    // Se chegou aqui, a chamada ao n8n foi OK (HTTP 2xx)
    console.log("[route.ts] Comunicação com n8n OK. Retornando resposta para o frontend."); // Log 11: Sucesso
    // Encaminha a resposta JSON do n8n para o frontend
    return NextResponse.json(data, { status: res.status }); // Geralmente 200 OK

  } catch (error: any) {
    // Captura erros gerais (ex: falha de rede ao tentar chamar o n8n, erro no `req.json()`)
    console.error('[route.ts] Erro GERAL no bloco catch:', error); // Log 12: Erro geral
    return NextResponse.json(
      { error: 'Erro interno na API route', message: error.message },
      { status: 500 } // Internal Server Error
    );
  }
}