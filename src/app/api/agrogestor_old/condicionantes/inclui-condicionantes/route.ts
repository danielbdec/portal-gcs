import { NextResponse } from 'next/server';

// URL do webhook externo para INCLUIR condicionantes
const EXTERNAL_API_URL = 'http://192.168.0.204:5678/webhook/agrogestor-inclui-condicionantes';

export async function POST(request: Request) {
    try {
        // 1. Recebe e extrai o corpo da requisição vinda do frontend
        const body = await request.json();
        const { documento, nome, status } = body;

        // 2. Validação para garantir que os campos obrigatórios foram enviados
        if (!documento || !nome || !status) {
            return NextResponse.json(
                { message: 'Os campos documento, nome e status são obrigatórios.' },
                { status: 400 } // 400 Bad Request
            );
        }

        // 3. Chama a API externa, repassando o corpo validado da requisição
        const externalApiResponse = await fetch(EXTERNAL_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        // 4. Processa a resposta da API externa
        if (!externalApiResponse.ok) {
            const errorBody = await externalApiResponse.text();
            console.error(`Erro da API externa (${externalApiResponse.status}):`, errorBody);
            
            return NextResponse.json(
                { message: `Falha ao incluir dados na API externa. Status: ${externalApiResponse.status}` },
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
            { message: 'Ocorreu um erro interno no servidor.' },
            { status: 500 } // 500 Internal Server Error
        );
    }
}