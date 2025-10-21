// src/app/api/nfe/nfe-visualiza-boleto/route.ts

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const registro: string | undefined = body?.registro;

    // Valida se o parâmetro 'registro' foi fornecido
    if (!registro || typeof registro !== "string") {
      return new Response("Parâmetro 'registro' é obrigatório.", {
        status: 400,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-store",
        },
      });
    }

    // URL do webhook que gera o HTML do boleto
    const visualizaBoletoUrl = "http://localhost:5678/webhook/nfe-visualiza-boleto";

    // Faz a requisição para a API externa, repassando o registro
    const externalResponse = await fetch(visualizaBoletoUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "text/html; charset=utf-8", // Indica que esperamos HTML como resposta
      },
      body: JSON.stringify({ registro }),
    });

    // Pega o corpo da resposta como texto cru (HTML)
    const html = await externalResponse.text();

    // Se a chamada externa falhou, retorna um erro
    if (!externalResponse.ok) {
        return new Response(html || "Falha no serviço de visualização de boletos.", {
            status: externalResponse.status,
             headers: {
                "Content-Type": "text/plain; charset=utf-8",
                "Cache-Control": "no-store",
            },
        });
    }
    
    // Retorna o HTML recebido para o front-end
    return new Response(html, {
      status: externalResponse.status,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });

  } catch (err: any) {
    console.error('[API /nfe-visualiza-boleto] Erro:', err);
    const msg = typeof err?.message === "string"
        ? err.message
        : "Falha ao gerar o boleto.";

    return new Response(msg, {
      status: 500,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }
}