import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; // Verifique se este caminho está correto
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ erro: true, message: "Usuário não autenticado" }, { status: 401 });
    }

    const email = session.user.email;
    const n8nWebhookUrl = "http://localhost:5678/webhook/consulta-tema"; 
    
    const response = await fetch(n8nWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email })
    });

    if (!response.ok) {
      console.error("Webhook n8n (consulta-tema) falhou:", await response.text());
      return NextResponse.json({ erro: true, message: "Erro ao consultar o tema no serviço de webhook." }, { status: 502 });
    }

    const data = await response.json(); // n8n retorna: [ { "tema": "E", "perfil": "admin" } ]
    
    if (Array.isArray(data) && data.length > 0) {
        // --- CORREÇÃO ---
        // Retorna o OBJETO diretamente, não o array
        return NextResponse.json(data[0]); // Retorna { tema: 'E', perfil: 'admin' }
    } else {
        return NextResponse.json({ tema: 'C', perfil: 'Não definido' });
    }

  } catch (e) {
    console.error("Erro no handler (consulta-tema):", e);
    return NextResponse.json({ erro: true, message: "Erro inesperado no servidor" }, { status: 500 });
  }
}