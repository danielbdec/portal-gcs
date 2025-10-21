import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json([], { status: 401 });
  }

  const email = session.user.email;

  try {
    const resposta = await fetch("http://187.32.243.161:5678/webhook/historico_ia", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const raw = await resposta.text();
    console.log("🔍 RAW recebido do webhook:", raw);

    let registros: any[] = [];

    try {
      const parsed = JSON.parse(raw);

      if (Array.isArray(parsed)) {
        registros = parsed;
      } else if (parsed && typeof parsed === "object") {
        registros = [parsed]; // ← aqui está a correção
      } else if (Array.isArray(parsed.data)) {
        registros = parsed.data;
      }
    } catch (error) {
      console.error("❌ Erro ao fazer parse do JSON:", error);
      return NextResponse.json([], { status: 500 });
    }

    console.log("📦 Registros identificados:", registros.length, registros.slice(0, 2));

    const mensagens = registros.map((item) => ({
      sender: item.tipo === "usuario" ? "user" : "bot",
      text: item.mensagem,
      timestamp: item.data_envio,
    }));

    console.log("✅ Enviando ao frontend:", mensagens.length, mensagens.slice(0, 2));

    return NextResponse.json(mensagens);
  } catch (error) {
    console.error("❌ Erro ao buscar histórico:", error);
    return NextResponse.json([], { status: 500 });
  }
}
