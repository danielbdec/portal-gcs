import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ message: "Usuário não autenticado" }, { status: 401 });
    }

    const body = await request.json();
    const { chave } = body;

    if (!chave) {
      return NextResponse.json({ message: "A chave da nota não foi fornecida." }, { status: 400 });
    }

    const response = await fetch("http://localhost:5678/webhook/consulta-pgto-financeiro", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        chave: chave
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("A chamada ao webhook (consulta-pgto-financeiro) falhou:", errorText);
       try {
          const errorJson = JSON.parse(errorText);
          return NextResponse.json({ message: errorJson.message || "O serviço de webhook retornou um erro." }, { status: response.status });
      } catch (parseError) {
          return NextResponse.json({ message: "O serviço de webhook retornou um erro e a resposta não é um JSON válido." }, { status: 502 });
      }
    }

    const webhookResult = await response.json();

    return NextResponse.json(webhookResult);

  } catch (e) {
    console.error("Erro no handler do route.ts (nfe-consulta-pagto-financeiro):", e);
    return NextResponse.json({ message: "Erro inesperado no servidor" }, { status: 500 });
  }
}