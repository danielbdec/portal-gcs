import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; // Verifique se este caminho está correto
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ erro: true, message: "Usuário não autenticado" }, { status: 401 });
    }

    const body = await request.json();
    const { tema } = body; // Recebe 'light' or 'dark' do frontend

    // Validação do tema
    if (tema !== 'light' && tema !== 'dark') {
      return NextResponse.json({ erro: true, message: "Valor de tema inválido. Envie 'light' ou 'dark'." }, { status: 400 });
    }
    
    // Converte o tema do frontend para o formato do seu banco ('C'/'E')
    const temaDb = tema === 'light' ? 'C' : 'E';
    
    // URL do webhook "Altera Tema" do seu fluxo n8n
    const n8nWebhookUrl = "http://localhost:5678/webhook/altera-tema"; 

    const response = await fetch(n8nWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        email: session.user.email,
        tema: temaDb // Enviando 'C' ou 'E'
      })
    });

    if (!response.ok) {
      console.error("Webhook n8n (altera-tema) falhou:", await response.text());
      return NextResponse.json({ erro: true, message: "Erro ao alterar o tema no serviço de webhook." }, { status: 502 });
    }
    
    // O n8n retorna [{ "status": "ok" }] se o "Converte Json1" for bem sucedido
    const data = await response.json(); 
    
    if (Array.isArray(data) && data.length > 0 && data[0].status === 'ok') {
        return NextResponse.json({ status: 'ok', message: 'Tema alterado com sucesso.' });
    } else {
        console.error("Resposta inesperada do n8n (altera-tema):", data);
        return NextResponse.json({ erro: true, message: "O serviço de webhook não confirmou a alteração." }, { status: 502 });
    }

  } catch (e) {
    console.error("Erro no handler (altera-tema):", e);
    return NextResponse.json({ erro: true, message: "Erro inesperado no servidor" }, { status: 500 });
  }
}