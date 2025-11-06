import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ message: "Usuário não autenticado" }, { status: 401 });
    }

    // O fluxo n8n fornecido não parece exigir um corpo (body)
    // específico, ele apenas executa um SELECT *.
    // Vamos enviar o e-mail do usuário por padrão,
    // caso seja usado para logs ou futuras validações no n8n.
    
    const webhookUrl = "http://localhost:5678/webhook/caderno-agricola-consulta";

    const webhookResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: session.user.email,
      }),
    });

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text();
      console.error("A chamada ao webhook de consulta de cadernos falhou:", errorText);
      return new NextResponse(errorText || "O serviço de consulta de cadernos retornou um erro.", { status: webhookResponse.status });
    }

    // --- Alteração Principal ---
    // O fluxo n8n "Respond to Webhook" está configurado para "respondWith": "json"
    // Portanto, devemos usar .json() e não .blob()
    const jsonResponse = await webhookResponse.json();

    // Retorna o JSON (array de dados) para o cliente
    return new NextResponse(JSON.stringify(jsonResponse), {
        status: 200,
        headers: {
            'Content-Type': 'application/json',
        },
    });

  } catch (e) {
    console.error("Erro no handler da rota (caderno-agricola-consulta):", e);
    return NextResponse.json({ message: "Erro inesperado no servidor" }, { status: 500 });
  }
}