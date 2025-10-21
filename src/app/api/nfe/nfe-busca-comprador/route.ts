import { getServerSession } from "next-auth/next";

import { authOptions } from "@/lib/auth"; // Verifique se este caminho está correto

import { NextRequest, NextResponse } from "next/server";



export async function POST(request: NextRequest) {

  try {

    // 1. Obtém a sessão do utilizador logado

    const session = await getServerSession(authOptions);



    // 2. Valida se o utilizador está autenticado

    if (!session?.user?.email) {

      return NextResponse.json({ erro: true, message: "Usuário não autenticado" }, { status: 401 });

    }



    const body = await request.json();



    // Valida se a chave e o nome foram informados

    if (!body || !body.chave || !body.nome) {

      console.warn("Requisição sem chave ou nome recebida:", body);

      return NextResponse.json({ erro: true, message: "Chave ou termo de busca não informado" }, { status: 400 });

    }



    // 3. Envia a 'chave', 'email' e 'nome' para o webhook do n8n

    const resposta = await fetch("http://localhost:5678/webhook/nfe-busca-comprador", {

      method: "POST",

      headers: {

        "Content-Type": "application/json"

      },

      body: JSON.stringify({

        chave: body.chave,

        email: session.user.email, // Adiciona o email da sessão

        nome: body.nome.toUpperCase() // ✅ ALTERADO: Converte o termo da busca para maiúsculas

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

    console.error("Erro no handler do route.ts:", e);

    return NextResponse.json({ erro: true, message: "Erro inesperado" }, { status: 500 });

  }

}