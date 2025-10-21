import { NextResponse } from 'next/server';

// URL do webhook externo (n8n, etc.)
const EXTERNAL_API_URL = 'http://192.168.0.204:5678/webhook/agrogestor-busca-certidao';

export async function POST(request: Request) {
    try {
        // 1. Recebe e extrai o corpo da requisição vinda do frontend
        const body = await request.json();
        const { empreendimento_id } = body;

        // Validação básica para garantir que o ID foi enviado
        if (!empreendimento_id) {
            return NextResponse.json(
                { error: 'O campo empreendimento_id é obrigatório.' },
                { status: 400 } // 400 Bad Request
            );
        }

        // 2. Chama a API externa, repassando o corpo da requisição
        const externalApiResponse = await fetch(EXTERNAL_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ empreendimento_id }),
        });

        // 3. Processa a resposta da API externa
        if (!externalApiResponse.ok) {
            // Se a API externa retornar um erro, tenta extrair a mensagem de erro dela
            const errorBody = await externalApiResponse.text();
            console.error(`Erro da API externa (${externalApiResponse.status}):`, errorBody);
            
            return NextResponse.json(
                { error: `Falha ao buscar dados na API externa. Status: ${externalApiResponse.status}` },
                { status: 502 } // 502 Bad Gateway
            );
        }

        const data = await externalApiResponse.json();

        // 4. Retorna a resposta da API externa para o frontend
        return NextResponse.json(data);

    } catch (error) {
        // Captura qualquer outro erro inesperado (ex: JSON mal formatado, falha de rede)
        console.error('Erro interno no servidor:', error);
        
        return NextResponse.json(
            { error: 'Ocorreu um erro interno no servidor.' },
            { status: 500 } // 500 Internal Server Error
        );
    }
}