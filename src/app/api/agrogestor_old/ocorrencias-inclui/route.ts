import { NextResponse } from 'next/server';

// URL do webhook n8n para inclusão de ocorrências
const EXTERNAL_API_URL = 'http://localhost:5678/webhook/agrogestor-inclui-ocorrencias';

export async function POST(request: Request) {
    try {
        const body = await request.json();

        // Validação de campos obrigatórios
        if (!body.empreendimento_id || !body.descricao || !body.data_ocorrencia) {
             return NextResponse.json(
                { error: 'Campos obrigatórios faltando.' },
                { status: 400 }
            );
        }

        // Chama a API externa
        const externalApiResponse = await fetch(EXTERNAL_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        if (!externalApiResponse.ok) {
            const errorBody = await externalApiResponse.text();
            console.error(`Erro da API externa (${externalApiResponse.status}):`, errorBody);
            return NextResponse.json(
                { error: `Falha na comunicação com serviço externo. Status: ${externalApiResponse.status}` },
                { status: 502 }
            );
        }

        // Processa o corpo da resposta
        const responseText = await externalApiResponse.text();
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            console.error('Resposta não é um JSON válido:', responseText);
            return NextResponse.json({ error: 'Resposta inválida do servidor externo.' }, { status: 502 });
        }

        // --- VALIDAÇÃO RIGOROSA ---
        // Aceita APENAS se for: [ { "status": "ok" } ]
        const isValid = Array.isArray(data) && 
                        data.length === 1 && 
                        data[0] && 
                        data[0].status === 'ok';

        if (!isValid) {
            console.error('Validação falhou. Resposta recebida:', JSON.stringify(data));
            return NextResponse.json(
                { error: 'Ocorreu um erro ao processar a inclusão. Resposta inesperada.' },
                { status: 502 }
            );
        }

        // Se passou na validação, retorna o primeiro item (o objeto { status: 'ok' })
        return NextResponse.json(data[0]);

    } catch (error) {
        console.error('Erro interno no servidor (Inclusão):', error);
        return NextResponse.json(
            { error: 'Ocorreu um erro interno no servidor.' },
            { status: 500 }
        );
    }
}