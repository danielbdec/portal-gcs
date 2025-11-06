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
    const { registro } = body; // Espera um objeto 'registro' com todos os campos

    if (!registro) {
      return NextResponse.json({ message: "O objeto 'registro' não foi fornecido." }, { status: 400 });
    }

    const webhookUrl = "http://localhost:5678/webhook/caderno-agricola-altera";

    const webhookResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: session.user.email,
        registro: registro, // Passa o objeto 'registro' completo para o n8n
      }),
    });

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text();
      console.error("A chamada ao webhook de alterar caderno falhou:", errorText);
      return new NextResponse(errorText || "O serviço de alteração retornou um erro.", { status: webhookResponse.status });
    }

    // Assumindo que o n8n retorna um JSON de confirmação
    const jsonResponse = await webhookResponse.json();

    return new NextResponse(JSON.stringify(jsonResponse), {
        status: 200,
        headers: {
            'Content-Type': 'application/json',
        },
    });

  } catch (e) {
    console.error("Erro no handler da rota (caderno-agricola-altera):", e);
    return NextResponse.json({ message: "Erro inesperado no servidor" }, { status: 500 });
  }
}