import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; // Verifique se o caminho está correto
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ erro: true, message: "Usuário não autenticado" }, { status: 401 });
    }

    const body = await request.json();
    
    // Log para depuração no console do servidor
    console.log("--- BACKEND RECEIVED BODY ---", body);

    const { chave, codigo_comprador_destino, nome_comprador_destino, motivo } = body;



    const resposta = await fetch("http://localhost:5678/webhook/nfe-transfere-comprador", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        chave: chave,
        email_solicitante: session.user.email,
        codigo_comprador_destino: codigo_comprador_destino,
        nome_comprador_destino: nome_comprador_destino,
        motivo: motivo
      })
    });

    if (!resposta.ok) {
        const errorText = await resposta.text();
        console.error("Erro retornado pelo n8n:", errorText);
        return NextResponse.json({ erro: true, message: `Erro na comunicação com o serviço de automação: ${resposta.statusText}` }, { status: resposta.status });
    }

    const data = await resposta.json();

    return NextResponse.json(data);

  } catch (e) {
    console.error("Erro inesperado no handler de nfe-transfere-comprador:", e);
    return NextResponse.json({ erro: true, message: "Erro inesperado no servidor" }, { status: 500 });
  }
}
