// src/app/api/nfe/nfe-dda-consulta/route.ts

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const chave: string | undefined = body?.chave;

    if (!chave || typeof chave !== "string") {
      return new Response(JSON.stringify({ message: "Parâmetro 'chave' é obrigatório." }), {
        status: 400,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store",
        },
      });
    }

    const ddaApiUrl = "http://localhost:5678/webhook/nfe-consulta-dda";

    const externalResponse = await fetch(ddaApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ chave }),
    });

    if (!externalResponse.ok) {
        let errorMessage = 'O serviço de consulta DDA retornou um erro.';
        try {
            const errorData = await externalResponse.json();
            if (errorData && typeof errorData.message === 'string') {
                errorMessage = errorData.message;
            }
        } catch (e) {
            errorMessage = externalResponse.statusText || errorMessage;
        }
        
        return new Response(JSON.stringify({ message: errorMessage }), {
            status: externalResponse.status,
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                "Cache-Control": "no-store",
            },
        });
    }

    // Lê a resposta como texto para verificar se está vazia
    const responseText = await externalResponse.text();

    // Se o corpo da resposta estiver vazio, retorna um array JSON vazio.
    // Isso é um cenário válido (nenhum boleto encontrado) e evita o erro.
    if (!responseText) {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store",
        },
      });
    }

    // Se houver conteúdo, converte o texto para JSON e o retorna.
    const data = JSON.parse(responseText);
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });

  } catch (err: any) {
    console.error('[API /nfe-dda-consulta] Erro:', err);
    const msg = typeof err?.message === "string" ? err.message : "Falha ao consultar boletos DDA.";

    return new Response(JSON.stringify({ message: msg }), {
      status: 500,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }
}