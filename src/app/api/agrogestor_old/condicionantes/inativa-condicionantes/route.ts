import { NextResponse } from 'next/server';

// URL do webhook externo para INATIVAR (excluir) condicionantes
const EXTERNAL_API_URL = 'http://192.168.0.204:5678/webhook/agrogestor-inativa-condicionantes';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { id } = body;

        // Validação para garantir que o ID foi enviado
        if (!id) {
            return NextResponse.json(
                { message: 'O campo id é obrigatório para a inativação.' },
                { status: 400 } // 400 Bad Request
            );
        }

        const externalApiResponse = await fetch(EXTERNAL_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ id }), // Enviamos apenas o ID
        });

        if (!externalApiResponse.ok) {
            const errorBody = await externalApiResponse.text();
            console.error(`Erro da API externa (${externalApiResponse.status}):`, errorBody);
            
            return NextResponse.json(
                { message: `Falha ao inativar dados na API externa. Status: ${externalApiResponse.status}` },
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