import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Usuário não autenticado" }, { status: 401 });
  }

  const body = await req.json();
  console.log("📩 Body recebido do front:", JSON.stringify(body, null, 2));

  const { message } = body;

  const payload = [
    {
      headers: {
        accept: "application/json, text/plain, */*",
        "content-type": "application/json",
      },
      params: {},
      query: {},
      body: {
        message,
        email: session.user.email,
        usuario: session.user.email,
      },
      webhookUrl: "http://187.32.243.161:5678/webhook/ia_portal_celeiro",
      executionMode: "production",
    }
  ];

  console.log("🚀 Payload enviado ao n8n:", JSON.stringify(payload, null, 2));

  const resposta = await fetch("http://187.32.243.161:5678/webhook/ia_portal_celeiro", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const text = await resposta.text();

  try {
    const data = JSON.parse(text);
    let mensagem = "Desculpe, não entendi.";

    if (Array.isArray(data) && typeof data[0] === "object" && data[0].output) {
      mensagem = data[0].output;
    } else if (data?.output) {
      mensagem = data.output;
    } else if (data?.resposta) {
      mensagem = data.resposta;
    }

    return NextResponse.json({ resposta: mensagem });
  } catch (err) {
    console.error("❌ Erro ao converter resposta do n8n:", err);
    return NextResponse.json({ raw: text }, { status: 200 });
  }
}
