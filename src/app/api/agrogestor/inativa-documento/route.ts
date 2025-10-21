import { NextResponse } from 'next/server';

// AQUI ESTÁ A URL: Definida como uma constante no topo do arquivo.
// Assumi o nome do endpoint com base na sua API de consulta.
const EXTERNAL_API_URL = 'http://192.168.0.204:5678/webhook/agrogestor-inativa-certidao';

export async function POST(request: Request) {
    try {
        // 1. Recebe os dados do frontend
        const body = await request.json();
        const { id_certidao } = body;

        // Validação
        if (!id_certidao) {
            return NextResponse.json(
                { error: 'O campo id_certidao é obrigatório.' },
                { status: 400 }
            );
        }

        console.log('API [altera-certidao] encaminhando para webhook:', body);

        // 2. Chama a API externa (seu webhook), repassando todos os dados recebidos
        const externalApiResponse = await fetch(EXTERNAL_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body), // Envia o corpo inteiro recebido
        });

        // 3. Processa a resposta do seu webhook
        if (!externalApiResponse.ok) {
            const errorBody = await externalApiResponse.text();
            console.error(`Erro do webhook (${externalApiResponse.status}):`, errorBody);
            return NextResponse.json(
                { error: `Falha no webhook. Status: ${externalApiResponse.status}` },
                { status: 502 }
            );
        }

        const data = await externalApiResponse.json();

        // 4. Retorna a resposta do webhook para o frontend
        // (Garantindo que o status "ok" seja repassado)
        return NextResponse.json(data);

    } catch (error) {
        console.error('Erro interno no servidor (altera-certidao):', error);
        return NextResponse.json(
            { error: 'Ocorreu um erro interno no servidor.' },
            { status: 500 }
        );
    }
}