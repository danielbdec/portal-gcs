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
    const { registro } = body;
    if (!registro) {
      return NextResponse.json({ message: "O registro do pagamento não foi fornecido." }, { status: 400 });
    }

    const webhookUrl = "http://localhost:5678/webhook/consulta-pgto-comprovante";

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
      console.error("A chamada ao webhook de comprovante falhou:", errorText);
      return new NextResponse(errorText || "O serviço de comprovantes retornou um erro.", { status: webhookResponse.status });
    }

    // Pega o arquivo binário da resposta do webhook
    const fileBlob = await webhookResponse.blob();
    
    // Cria os cabeçalhos para a resposta ao cliente
    const headers = new Headers();
    
    // Define o tipo de conteúdo como PDF para que o navegador saiba como exibi-lo
    headers.set('Content-Type', 'application/pdf');
    
    // Sugere ao navegador que exiba o arquivo em vez de baixá-lo diretamente
    headers.set('Content-Disposition', `inline; filename="comprovante_${registro}.pdf"`);

    // Retorna o arquivo (blob) com os cabeçalhos corretos
    return new NextResponse(fileBlob, {
        status: 200,
        headers: headers,
    });

  } catch (e) {
    console.error("Erro no handler da rota (nfe-consulta-comprovante):", e);
    return NextResponse.json({ message: "Erro inesperado no servidor" }, { status: 500 });
  }
}

