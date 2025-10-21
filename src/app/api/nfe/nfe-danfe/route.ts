// app/api/nfe/nfe-danfe/route.ts

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const chave: string | undefined = body?.chave;

    if (!chave || typeof chave !== "string") {
      return new Response("Parâmetro 'chave' é obrigatório.", {
        status: 400,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-store",
        },
      });
    }

    // URL do webhook do n8n que devolve HTML da DANFE
    // Defina N8N_DANFE_URL no .env, ex: https://seu-n8n/webhook/nfe-danfe
    const n8nUrl =
      process.env.N8N_DANFE_URL ?? "http://localhost:5678/webhook/nfe-danfe";

    const r = await fetch(n8nUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // importante para evitar re-encode indevido
        Accept: "text/html; charset=utf-8",
      },
      body: JSON.stringify({ chave }),
      // não use r.blob()/r.json() aqui
    });

    const html = await r.text(); // ← pega texto cru

    // Propaga status do n8n, mas força o Content-Type correto
    return new Response(html, {
      status: r.status,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err: any) {
    const msg =
      typeof err?.message === "string"
        ? err.message
        : "Falha ao gerar DANFE.";
    return new Response(msg, {
      status: 500,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }
}
