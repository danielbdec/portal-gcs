import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ status: 'error', message: "Usuário não autenticado" }, { status: 401 });
    }

    const body = await request.json();
    const { registro } = body; 

    if (!registro) {
      return NextResponse.json({ status: 'error', message: "O objeto 'registro' não foi fornecido." }, { status: 400 });
    }

    // Assumindo que seu n8n escuta neste endpoint
    const webhookUrl = "http://localhost:5678/webhook/caderno-agricola-inclui";

    const webhookResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: session.user.email,
        registro: registro, 
      }),
    });

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text();
      console.error("A chamada ao webhook de incluir caderno falhou:", errorText);
      return NextResponse.json({ status: 'error', message: errorText || "O serviço de inclusão retornou um erro." }, { status: webhookResponse.status });
    }

    const jsonResponse = await webhookResponse.json();

    return new NextResponse(JSON.stringify(jsonResponse), {
        status: 200,
        headers: {
            'Content-Type': 'application/json',
        },
    });

  } catch (e) {
    console.error("Erro no handler da rota (caderno-agricola-inclui):", e);
    return NextResponse.json({ status: 'error', message: "Erro inesperado no servidor" }, { status: 500 });
  }
}