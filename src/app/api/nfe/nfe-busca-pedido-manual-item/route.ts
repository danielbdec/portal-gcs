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
    const { chave, item_xml } = body; 

    // Validação para garantir que 'chave' e 'item_xml' foram fornecidos corretamente
    if (!chave || typeof chave !== 'string' || chave.length !== 44 || !item_xml || typeof item_xml !== 'number') {
      return NextResponse.json({ erro: true, message: "Dados inválidos. Chave da NFe e o número do item são obrigatórios." }, { status: 400 });
    }

    // Chamada única ao webhook para buscar os pedidos
    const webhookResponse = await fetch("http://localhost:5678/webhook/nfe-busca-pedido-manual-item", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: session.user.email, // Email do usuário logado
        chave: chave,              // Chave da NFe
        item_xml: item_xml,        // Número do item específico para a busca
      })
    });

    // Verifica se a chamada ao webhook falhou
    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text();
      console.error("A chamada ao webhook n8n (nfe-busca-pedido-manual-item) falhou:", errorText);
      return NextResponse.json({ erro: true, message: "Ocorreu um erro ao buscar os pedidos no serviço de webhook." }, { status: 502 });
    }
    
    // Se a chamada foi bem-sucedida, pega a resposta (a lista de pedidos)
    const data = await webhookResponse.json();
    
    // Retorna a resposta do webhook diretamente para o frontend
    return NextResponse.json(data);

  } catch (e) {
    console.error("Erro no handler do route.ts (nfe-busca-pedido-manual-item):", e);
    return NextResponse.json({ erro: true, message: "Erro inesperado no servidor" }, { status: 500 });
  }
}