// /src/app/api/assistente/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const resposta = await fetch("http://187.32.243.161:5678/webhook/ia_portal_celeiro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const text = await resposta.text();
    console.log("🔥 Texto bruto do n8n:", text);

    let data;
    try {
      data = JSON.parse(text);
      console.log("🧩 JSON recebido do n8n:", JSON.stringify(data, null, 2));
    } catch {
      console.warn("⚠️ Resposta não era JSON válido. Usando texto bruto.");
      data = { resposta: text };
    }

    let mensagem = "Desculpe, não entendi.";
    if (Array.isArray(data) && typeof data[0] === "object" && data[0].output) {
      mensagem = data[0].output;
    } else if (data?.output) {
      mensagem = data.output;
    } else if (data?.resposta) {
      mensagem = data.resposta;
    }

    return NextResponse.json({ resposta: mensagem });
  } catch (error) {
    console.error("❌ Erro no proxy route.ts:", error);
    return NextResponse.json(
      { resposta: "Desculpe, houve um erro ao se comunicar com o servidor." },
      { status: 500 }
    );
  }
}
