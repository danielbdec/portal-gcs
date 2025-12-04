import { NextResponse } from 'next/server';

// Endereço do seu microserviço de arquivos que agora tem a rota de download
const FILE_MICROSERVICE_URL = 'http://localhost:3203';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        // O frontend nos envia o `relKey` que foi salvo no banco de dados pelo n8n
        const { relKey, nome_arquivo } = body;

        if (!relKey || !nome_arquivo) {
            return NextResponse.json({ error: 'relKey e nome_arquivo são obrigatórios.' }, { status: 400 });
        }

        // 1. Monta a URL para chamar a nova rota no seu microserviço
        const downloadUrl = `${FILE_MICROSERVICE_URL}/download?key=${encodeURIComponent(relKey)}`;
        console.log(`Encaminhando pedido de download para: ${downloadUrl}`);

        // 2. Chama o microserviço
        const microserviceResponse = await fetch(downloadUrl);

        // 3. Verifica se o microserviço encontrou e retornou o arquivo
        if (!microserviceResponse.ok || !microserviceResponse.body) {
            const errorText = await microserviceResponse.text();
            console.error('Erro retornado pelo microserviço de download:', errorText);
            return NextResponse.json(
                { error: `O serviço de arquivos retornou um erro: ${microserviceResponse.status}` },
                { status: microserviceResponse.status }
            );
        }

        // 4. Prepara os cabeçalhos para o navegador do cliente
        const headers = new Headers();
        headers.set('Content-Type', microserviceResponse.headers.get('Content-Type') || 'application/octet-stream');
        headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(nome_arquivo)}"`);

        // 5. Retorna o arquivo (stream) diretamente para o navegador
        return new NextResponse(microserviceResponse.body, {
            status: 200,
            headers: headers,
        });

    } catch (error) {
        console.error('Erro interno na API de download:', error);
        return NextResponse.json(
            { error: 'Erro interno no servidor ao processar o download.' },
            { status: 500 }
        );
    }
}