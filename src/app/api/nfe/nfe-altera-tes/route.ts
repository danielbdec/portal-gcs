import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; // Verifique se este caminho está correto
import { NextRequest, NextResponse } from "next/server";

// Interface para garantir a tipagem de cada item no array
interface UpdateItem {
  id: number;
  tes: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ erro: true, message: "Usuário não autenticado" }, { status: 401 });
    }

    const body = await request.json();
    const { updates } = body; // Corretamente extrai o array 'updates'

    // Validação para garantir que 'updates' é um array e não está vazio
    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ erro: true, message: "Nenhum dado de atualização foi fornecido." }, { status: 400 });
    }

    // Cria um array de Promises, uma para cada chamada ao webhook
    const webhookPromises = updates.map((item: UpdateItem) => {
      return fetch("http://localhost:5678/webhook/nfe-altera-tes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: session.user.email, // Email do usuário logado
          id: item.id,               // ID do item específico
          tes: item.tes,             // TES do item específico
        })
      });
    });

    // Executa todas as chamadas ao webhook em paralelo e aguarda a conclusão
    const responses = await Promise.all(webhookPromises);

    // Verifica se alguma das chamadas ao webhook falhou
    for (const resposta of responses) {
      if (!resposta.ok) {
        // Se uma falhar, retorna um erro geral
        console.error("Uma das chamadas ao webhook n8n falhou:", await resposta.text());
        return NextResponse.json({ erro: true, message: "Ocorreu um erro ao processar uma das atualizações no serviço de webhook." }, { status: 502 });
      }
    }
    
    // Se todas as chamadas foram bem-sucedidas, retorna o status 'ok' que o frontend espera
    return NextResponse.json({ status: 'ok', message: 'Todas as alterações foram processadas com sucesso.' });

  } catch (e) {
    console.error("Erro no handler do route.ts (nfe-altera-tes):", e);
    return NextResponse.json({ erro: true, message: "Erro inesperado no servidor" }, { status: 500 });
  }
}