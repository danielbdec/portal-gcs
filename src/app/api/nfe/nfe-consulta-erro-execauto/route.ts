import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body || !body.chave) {
      console.warn("Requisição sem chave recebida:", body);
      return NextResponse.json({ erro: true, message: "Chave não informada" }, { status: 400 });
    }

    const resposta = await fetch("http://localhost:5678/webhook/nfe-consulta-erro-execauto", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ chave: body.chave })
    });

    const raw = await resposta.text();

    if (!raw) {
      return NextResponse.json({ erro: true, message: "Resposta vazia do n8n" }, { status: 502 });
    }

    let data;
    try {
      data = JSON.parse(raw);
    } catch (err) {
      console.error("Erro ao fazer parse do JSON recebido do n8n:", err, raw);
      return NextResponse.json({ erro: true, message: "Resposta inválida do n8n" }, { status: 502 });
    }

    return NextResponse.json(data);
  } catch (e) {
    console.error("Erro no handler do route.ts:", e);
    return NextResponse.json({ erro: true, message: "Erro inesperado" }, { status: 500 });
  }
}
