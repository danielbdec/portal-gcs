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

    // Valida se o ID do registro e os campos obrigatórios foram informados
    if (!body || !body.id || !body.operacao || !body.tes || !body.cfop_ref_saida) {
      return NextResponse.json({ erro: true, message: "ID do registro ou campos obrigatórios não informados." }, { status: 400 });
    }
    
    if (body.insumo_direto === 'N' && body.insumo_indireto === 'N' && body.insumo_outro === 'N') {
        return NextResponse.json({ erro: true, message: "Pelo menos um dos campos de Insumo deve ser 'Sim'." }, { status: 400 });
    }

    const resposta = await fetch("http://localhost:5678/webhook/nfe-altera-regras-fiscais", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: session.user.email,
        id: body.id, // Agora esperando e enviando o ID puro
        operacao: body.operacao,
        tes: body.tes,
        cfop_ref_saida: body.cfop_ref_saida,
        cst_pis_cof_saida: body.cst_pis_cof_saida || [],
        cst_icms_saida: body.cst_icms_saida || [],
        icms_st_nf: body.icms_st_nf || 'Não',
        icms_desonerado: body.icms_desonerado || 'Não',
        insumo_direto: body.insumo_direto || 'N',
        insumo_indireto: body.insumo_indireto || 'N',
        insumo_outro: body.insumo_outro || 'N'
      })
    });

    const raw = await resposta.text();

    if (!raw) {
      return NextResponse.json({ erro: true, message: "Resposta vazia do n8n" }, { status: 502 });
    }

    let data;
    try {
      data = JSON.parse(raw);
    } catch (err) {
      console.error("Erro ao fazer parse do JSON recebido do n8n:", err, raw);
      return NextResponse.json({ erro: true, message: "Resposta inválida do n8n" }, { status: 502 });
    }

    return NextResponse.json(data);

  } catch (e) {
    console.error("Erro no handler do route.ts (nfe-altera-regras-fiscais):", e);
    return NextResponse.json({ erro: true, message: "Erro inesperado no servidor" }, { status: 500 });
  }
}