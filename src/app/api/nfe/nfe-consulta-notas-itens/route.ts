import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body || !body.chave) {
      console.warn("Requisição sem chave recebida:", body);
      return NextResponse.json({ erro: true, message: "Chave não informada" }, { status: 400 });
    }

    const resposta = await fetch("http://localhost:5678/webhook/consulta-nf-entrada-itens", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      // ================== CORREÇÃO APLICADA AQUI ==================
      // Esta linha força o Next.js a ignorar o cache e buscar dados novos.
      cache: 'no-store',
      // ==========================================================
      body: JSON.stringify({ chave: body.chave })
    });

    const raw = await resposta.text();

    if (!raw) {
      return NextResponse.json({ erro: true, message: "Não foi encontrados itens." }, { status: 502 });
    }

    let data;
    try {
      data = JSON.parse(raw);
    } catch (err) {
      console.error("Erro ao fazer parse do JSON recebido do n8n:", err, raw);
      return NextResponse.json({ erro: true, message: "Erro de resposta da api. Tente novamente" }, { status: 502 });
    }

    return NextResponse.json(data);
  } catch (e) {
    console.error("Erro no handler do route.ts:", e);
    return NextResponse.json({ erro: true, message: "Erro inesperado" }, { status: 500 });
  }
}