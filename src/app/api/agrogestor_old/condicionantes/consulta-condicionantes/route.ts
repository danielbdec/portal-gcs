import { NextResponse } from 'next/server';

// URL ATUALIZADA para o webhook de busca de condicionantes
const EXTERNAL_API_URL = 'http://192.168.0.204:5678/webhook/agrogestor-busca-condicionantes';

export async function POST(request: Request) {
    try {
        // 1. Recebe e extrai o corpo da requisição vinda do frontend
        // Para a busca de condicionantes, o corpo pode ser um objeto vazio {}
        const body = await request.json();

        // A validação de 'empreendimento_id' foi removida, pois não é mais necessária.

        // 2. Chama a API externa, repassando o corpo da requisição
        const externalApiResponse = await fetch(EXTERNAL_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            // Repassa o corpo original da requisição (ex: {}) para a API externa
            body: JSON.stringify(body),
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