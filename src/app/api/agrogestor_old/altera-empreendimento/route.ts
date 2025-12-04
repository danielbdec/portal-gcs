import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

const WEBHOOK_URL = "http://localhost:5678/webhook/agrogestor-altera-empreendimento";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { erro: true, message: "Usuário não autenticado" },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Normalizações básicas
    const id = body?.id;
    const nome = (body?.nome ?? "").toString().trim();
    const cnpj_cpf_raw = (body?.cnpj_cpf ?? "").toString().trim();
    const cnpj_cpf = cnpj_cpf_raw.replace(/\D/g, "");
    const numero_matricula = body?.numero_matricula?.toString()?.trim() || null;
    const unidade = (body?.unidade ?? "").toString().trim();
    const estado = (body?.estado ?? "").toString().trim();
    const situacao = (body?.situacao ?? "").toString().trim();
    
    let area: number | null = null;
    if (body?.area !== undefined && body?.area !== null && `${body.area}`.trim() !== "") {
      const parsed = parseFloat(`${body.area}`.replace(",", "."));
      area = Number.isFinite(parsed) ? parsed : null;
    }

    // ======================= NOVOS CAMPOS =======================
    // Lógica para tratar os novos campos de área (agricultável e reserva)
    let area_agricultavel: number | null = null;
    if (body?.area_agricultavel !== undefined && body?.area_agricultavel !== null && `${body.area_agricultavel}`.toString().trim() !== "") {
        const parsed = parseFloat(`${body.area_agricultavel}`.toString().replace(",", "."));
        area_agricultavel = Number.isFinite(parsed) ? parsed : null;
    }

    let area_reserva_legal: number | null = null;
    if (body?.area_reserva_legal !== undefined && body?.area_reserva_legal !== null && `${body.area_reserva_legal}`.toString().trim() !== "") {
        const parsed = parseFloat(`${body.area_reserva_legal}`.toString().replace(",", "."));
        area_reserva_legal = Number.isFinite(parsed) ? parsed : null;
    }

    // Adicionando o novo campo de Área de Preservação Permanente
    let area_preserv_perm: number | null = null;
    if (body?.area_preservacao_permanente !== undefined && body?.area_preservacao_permanente !== null && `${body.area_preservacao_permanente}`.toString().trim() !== "") {
        const parsed = parseFloat(`${body.area_preservacao_permanente}`.toString().replace(",", "."));
        area_preserv_perm = Number.isFinite(parsed) ? parsed : null;
    }
    // ============================================================

    // Validações obrigatórias
    if (!id || !nome || !cnpj_cpf || !unidade || !estado || !situacao) {
      return NextResponse.json(
        {
          erro: true,
          message:
            "Campos obrigatórios não informados. Necessários: ID, Nome, CPF/CNPJ, Unidade, Estado e Situação do imóvel.",
        },
        { status: 400 }
      );
    }

    // Validação simples de CPF/CNPJ
    if (!(cnpj_cpf.length === 11 || cnpj_cpf.length === 14)) {
      return NextResponse.json(
        { erro: true, message: "CPF/CNPJ inválido (deve ter 11 ou 14 dígitos numéricos)." },
        { status: 400 }
      );
    }

    // Chamada ao webhook
    const resposta = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: session.user.email,
        id,
        nome,
        cnpj_cpf,
        numero_matricula,
        unidade,
        estado,
        area,
        situacao,
        // ======================= NOVOS CAMPOS =======================
        // Adicionando os novos campos ao corpo da requisição do webhook
        area_agricultavel,
        area_reserva_legal,
        area_preserv_perm // NOVO CAMPO ADICIONADO
        // ============================================================
      }),
    });

    const raw = await resposta.text();
    if (!raw) {
      return NextResponse.json(
        { erro: true, message: "Resposta vazia do serviço interno" },
        { status: 502 }
      );
    }

    let data;
    try {
      data = JSON.parse(raw);
    } catch (err) {
      console.error("Erro ao fazer parse do JSON recebido do webhook:", err, raw);
      return NextResponse.json(
        { erro: true, message: "Resposta inválida do serviço interno (JSON inválido)" },
        { status: 502 }
      );
    }

    return NextResponse.json(data);
  } catch (e: any) {
    console.error("Erro no handler do route.ts (altera-empreendimento):", e);
    return NextResponse.json(
      { erro: true, message: "Erro inesperado no servidor." },
      { status: 500 }
    );
  }
}