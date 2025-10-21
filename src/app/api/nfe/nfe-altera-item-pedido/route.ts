import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; // Verifique se o caminho para suas authOptions está correto
import { NextRequest, NextResponse } from "next/server";

// Interface para garantir a tipagem de cada item no array de itens
interface UpdateItemPedido {
  item_xml: number;
  num_pedido: string | null;
  registro_pedido: number | null;
  descricao_pedido: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ erro: true, message: "Usuário não autenticado" }, { status: 401 });
    }

    const body = await request.json();
    const { chave, itens } = body; // Extrai a chave da nota e o array 'itens'

    // Validação para garantir que a chave foi fornecida
    if (!chave) {
      return NextResponse.json({ erro: true, message: "A chave da nota não foi fornecida." }, { status: 400 });
    }

    // Validação para garantir que 'itens' é um array e não está vazio
    if (!Array.isArray(itens) || itens.length === 0) {
      return NextResponse.json({ erro: true, message: "Nenhum item para atualização foi fornecido." }, { status: 400 });
    }

    // Realiza uma ÚNICA chamada ao webhook, enviando o array de itens completo
    const response = await fetch("http://localhost:5678/webhook/nfe-altera-pedido-manual", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: session.user.email,    // Email do usuário logado
        chave: chave,                 // Chave da nota fiscal
        itens: itens                  // Array completo com todos os itens
      })
    });

    // Verifica se a chamada ao webhook falhou (status HTTP)
    if (!response.ok) {
      const errorText = await response.text();
      console.error("A chamada ao webhook n8n (nfe-altera-pedido-manual) falhou no nível HTTP:", errorText);
      return NextResponse.json({ erro: true, message: "O serviço de webhook retornou um erro." }, { status: 502 });
    }

    // Analisa a resposta JSON do webhook
    const webhookResult = await response.json();

    // Verifica o conteúdo da resposta para garantir que o status é 'ok'
    if (Array.isArray(webhookResult) && webhookResult.length > 0 && webhookResult[0].status === 'ok') {
        // Se a chamada e o conteúdo foram bem-sucedidos, retorna o status 'ok' que o frontend espera
        return NextResponse.json({ status: 'ok', message: 'Todos os itens foram processados com sucesso.' });
    } else {
        // Se o conteúdo da resposta não for o esperado, trata como erro
        console.error("A resposta do webhook n8n não continha o status 'ok':", webhookResult);
        return NextResponse.json({ erro: true, message: "O serviço de webhook processou a requisição, mas não confirmou o sucesso." }, { status: 502 });
    }

  } catch (e) {
    console.error("Erro no handler do route.ts (nfe-altera-item-pedido):", e);
    return NextResponse.json({ erro: true, message: "Erro inesperado no servidor" }, { status: 500 });
  }
}