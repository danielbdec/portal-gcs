import { NextResponse } from 'next/server';

// URL do webhook externo para ALTERAR condicionantes
const EXTERNAL_API_URL = 'http://192.168.0.204:5678/webhook/agrogestor-altera-condicionantes';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { id, documento, nome, status } = body;

        // Validação para garantir que todos os campos, incluindo o ID, foram enviados
        if (!id || !documento || !nome || !status) {
            return NextResponse.json(
                { message: 'O ID e os campos documento, nome e status são obrigatórios para a alteração.' },
                { status: 400 } // 400 Bad Request
            );
        }

        const externalApiResponse = await fetch(EXTERNAL_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!externalApiResponse.ok) {
            const errorBody = await externalApiResponse.text();
            console.error(`Erro da API externa (${externalApiResponse.status}):`, errorBody);
            
            return NextResponse.json(
                { message: `Falha ao alterar dados na API externa. Status: ${externalApiResponse.status}` },
                { status: 502 } // 502 Bad Gateway
            );
        }

        const data = await externalApiResponse.json();
        return NextResponse.json(data);

    } catch (error) {
        console.error('Erro interno no servidor:', error);
        return NextResponse.json(
            { message: 'Ocorreu um erro interno no servidor.' },
            { status: 500 } // 500 Internal Server Error
        );
    }
}