// app/api/nfe/nfe-envio-nfe-wpp/route.ts

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ erro: true, message: "Usuário não autenticado" }, { status: 401 });
    }

    // Não precisamos ler o corpo (body) da requisição, pois a consulta no n8n não precisa de parâmetros.
    // A linha que causava o erro foi removida daqui.

    const resposta = await fetch("http://localhost:5678/webhook/nfe-envio-nfe-wpp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      // Enviamos um corpo vazio para o n8n, pois ele espera um POST
      body: JSON.stringify({})
    });

    if (!resposta.ok) {
        const errorText = await resposta.text();
        console.error("Erro do n8n (nfe-envio-nfe-wpp):", resposta.status, errorText);
        return NextResponse.json({ erro: true, message: "Erro no servidor n8n ao consultar histórico." }, { status: resposta.status });
    }

    const data = await resposta.json();
    return NextResponse.json(data);

  } catch (e) {
    console.error("Erro no handler do route.ts (nfe-envio-nfe-wpp):", e);
    return NextResponse.json({ erro: true, message: "Erro inesperado no servidor" }, { status: 500 });
  }
}