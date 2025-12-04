import { NextResponse } from 'next/server';

// URL do webhook que busca condicionantes por tipo de documento
const EXTERNAL_API_URL = 'http://192.168.0.204:5678/webhook/agrogestor-busca-condicionantes-tipo';

export async function POST(request: Request) {
    try {
        // 1. Recebe e extrai o corpo da requisição
        const body = await request.json();
        const { tipo_documento } = body;

        // 2. Validação para garantir que o tipo de documento foi enviado
        if (!tipo_documento) {
            return NextResponse.json(
                { error: 'O campo tipo_documento é obrigatório.' },
                { status: 400 } // 400 Bad Request
            );
        }

        // 3. Chama a API externa, repassando apenas o tipo_documento
        const externalApiResponse = await fetch(EXTERNAL_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ tipo_documento }),
        });

        // 4. Processa a resposta da API externa
        if (!externalApiResponse.ok) {
            const errorBody = await externalApiResponse.text();
            console.error(`Erro da API externa (${externalApiResponse.status}):`, errorBody);
            
            return NextResponse.json(
                { error: `Falha ao buscar dados na API externa. Status: ${externalApiResponse.status}` },
                { status: 502 } // 502 Bad Gateway
            );
        }

        const data = await externalApiResponse.json();

        // 5. Retorna a resposta da API externa para o frontend
        return NextResponse.json(data);

    } catch (error) {
        // Captura qualquer outro erro inesperado
        console.error('Erro interno no servidor:', error);
        
        return NextResponse.json(
            { error: 'Ocorreu um erro interno no servidor.' },
            { status: 500 } // 500 Internal Server Error
        );
    }
}