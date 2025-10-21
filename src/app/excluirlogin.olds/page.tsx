"use client";

import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button, Spin } from "antd";
import { LoadingOutlined } from "@ant-design/icons";
import Image from "next/image";

export default function LoginPage() {
  const { status } = useSession();
  const router = useRouter();

  // Se o usuário já estiver logado, redireciona para o painel principal.
  if (status === "authenticated") {
    router.push("/painel");
    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
            <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} />
        </div>
    );
  }

  // Enquanto a sessão está sendo verificada, exibe um spinner.
  if (status === "loading") {
      return (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
              <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} />
          </div>
      );
  }

  // Se o usuário não estiver logado, mostra a tela para ele clicar e entrar.
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f0f2f5' }}>
        <div style={{ padding: '3rem', background: 'white', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', textAlign: 'center' }}>
            {/* A imagem do logo foi trocada pela da sua screenshot */}
            <Image
              src="/gcs-logo-login.png" // Verifique se o nome/caminho da sua imagem de logo está correto
              alt="Logo GCS"
              width={100}
              height={100}
              style={{ objectFit: "contain", marginBottom: '1rem' }}
            />
            <h2 style={{ marginBottom: '2rem', color: '#333' }}>Acessar Painel GCS</h2>
            <Button
                type="primary"
                size="large"
                style={{ 
                  minWidth: '200px',
                  backgroundColor: '#22c55e', // Cor verde do botão
                  borderColor: '#22c55e' 
                }}
                // CORREÇÃO APLICADA AQUI: Adicionado o terceiro argumento para forçar a seleção de conta
                onClick={() => signIn("azure-ad", { callbackUrl: "/painel" }, { prompt: "select_account" })}
            >
                Entrar com a Microsoft
            </Button>
        </div>
    </div>
  );
}