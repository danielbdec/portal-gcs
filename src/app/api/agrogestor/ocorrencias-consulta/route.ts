import { NextResponse } from 'next/server';

// URL do webhook n8n para busca de ocorrências
const EXTERNAL_API_URL = 'http://localhost:5678/webhook/agrogestor-busca-ocorrencias';

export async function POST(request: Request) {
    try {
        // 1. Recebe o corpo da requisição do frontend (ex: { empreendimento_id: 123 } ou { documento_id: 456 })
        const body = await request.json();

        // 2. Chama a API externa (n8n), repassando o corpo da requisição
        const externalApiResponse = await fetch(EXTERNAL_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        // 3. Processa a resposta da API externa
        if (!externalApiResponse.ok) {
            const errorBody = await externalApiResponse.text();
            console.error(`Erro da API externa de Ocorrências (${externalApiResponse.status}):`, errorBody);
            
            return NextResponse.json(
                { error: `Falha ao buscar ocorrências. Status: ${externalApiResponse.status}` },
                { status: 502 }
            );
        }

        const data = await externalApiResponse.json();

        // 4. Retorna os dados para o frontend
        return NextResponse.json(data);

    } catch (error) {
        console.error('Erro interno no servidor (Ocorrências):', error);
        
        return NextResponse.json(
            { error: 'Ocorreu um erro interno no servidor.' },
            { status: 500 }
        );
    }
}