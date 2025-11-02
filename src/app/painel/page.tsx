"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { Button, Spin } from "antd";
import { LoadingOutlined } from "@ant-design/icons";
import { useEffect, useState } from "react";

export default function HomePage() {
  const { data: session, status } = useSession();
  const [loadingLogout, setLoadingLogout] = useState(false);
  
  // Estado para controlar o tema
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const orangeColor = "#f97316"; // Mantido do seu original
  const spinner = <LoadingOutlined style={{ fontSize: 48, color: orangeColor }} spin />;

  // Efeito para carregar o tema do localStorage ao montar
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark';
    const initialTheme = savedTheme || 'light'; // Define 'light' como padrão se nada for salvo
    setTheme(initialTheme);
  }, []);

  // Efeito para APLICAR o tema ao body
  useEffect(() => {
    document.body.classList.remove('light', 'dark');
    document.body.classList.add(theme);
  }, [theme]);


  useEffect(() => {
    if (status === "unauthenticated") {
      // Corrigido para "azure-ad" como no seu client-layout.tsx
      signIn("azure-ad", { callbackUrl: "/" });
    }
  }, [status]);

  if (status === "loading" || loadingLogout) {
    return (
      // O container principal aplica o fundo correto
      <div className="dashboard-container">
        <div className="loading-overlay">
          <Spin 
            tip={<span className="loading-text">{loadingLogout ? "Saindo..." : "Carregando..."}</span>} 
            indicator={spinner} 
          />
        </div>
      </div>
    );
  }

  return (
    <>
      {/* --- ESTILOS GLOBAIS E DA PÁGINA (COPIADOS DO SEU PROJETO) --- */}
      <style>{`
        /* --- Variáveis de Tema (Copiadas) --- */
        :root {
            --gcs-blue: #00314A;
            --gcs-green: #5FB246;
            --gcs-orange: #F58220;
            --gcs-orange-light: #FDBA74;
            --gcs-gray-light: #f8f9fa;
            --gcs-gray-medium: #e9ecef;
            --gcs-gray-dark: #6c757d;
            --gcs-border-color: #dee2e6;
            --gcs-gray-soft: #adb5bd;
            --gcs-brand-red: #E11D2E;
            --gcs-brand-orange: #EA580C;
            --gcs-brand-blue: #1F4E79;
            --gcs-dark-bg-heavy: rgba(25, 39, 53, 0.85);
            --gcs-dark-border-glass: rgba(125, 173, 222, 0.2);
            --gcs-dark-text-primary: #E2E8F0;
            --gcs-dark-text-secondary: #CBD5E1;
            --gcs-dark-text-tertiary: #A0AEC0;
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

        /* --- Estilos Base (Copiados) --- */
        .dashboard-container {
            padding: 2rem;
            min-height: 100vh;
            /* REMOVIDO: display: flex e centralização */
        }
        .content-card, .main-content-card {
            padding: 1.5rem;
            border-radius: 12px;
            transition: all 0.3s ease;
        }
        .page-title {
            margin: 0;
            font-size: 2rem;
            font-weight: bold;
            display: flex;
            align-items: center;
            justify-content: center; /* Centralizado para esta página */
            gap: 0.75rem;
        }
        
        /* --- Tema Claro (Copiado) --- */
        body.light .dashboard-container { background-color: #E9ECEF; }
        body.light .content-card,
        body.light .main-content-card {
            background-color: #fff;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
            border: 1px solid var(--gcs-border-color);
        }
        body.light .page-title { color: var(--gcs-blue); }
        body.light .loading-text { color: var(--gcs-blue); }
        
        /* --- Tema Escuro (Copiado) --- */
        body.dark {
          background-image: url('/img_fundo_glass.png') !important;
          background-size: cover !important;
          background-position: center center !important;
          background-attachment: fixed !important;
        }
        body.dark .dashboard-container { background-color: transparent !important; }
        
        body.dark .content-card,
        body.dark .main-content-card {
          background: rgba(25, 39, 53, 0.25) !important; /* Efeito Vidro */
          backdrop-filter: blur(16px) !important;
          -webkit-backdrop-filter: blur(16px) !important;
          border: 1px solid var(--gcs-dark-border-glass) !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1) !important;
        }
        /* O .page-title (emoji 🏠) ficará branco */
        body.dark .page-title { color: var(--gcs-dark-text-primary); } 
        body.dark .loading-text { color: #93C5FD; }
        
        /* --- ESTILOS (Para esta página) --- */
        
        /* Overlay de Loading */
        .loading-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background-color 0.3s ease;
        }
        body.light .loading-overlay {
            background: #E9ECEF; /* Fundo claro opaco */
        }
        body.dark .loading-overlay {
            background: rgba(0, 0, 0, 0.5); /* Fundo escuro transparente */
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
        }
        
        /* Spinner (Antd) */
        .loading-text {
            font-size: 1.1rem;
            font-weight: bold;
            margin-top: 1rem;
        }
        
        /* Card de Boas Vindas (Layout corrigido) */
        .welcome-card {
            max-width: 700px;
            margin: 0 auto; /* Centraliza horizontalmente, respeita o padding-top do container */
            text-align: center;
            padding: 2rem !important; /* Padding original da sua tela */
        }

        /* === CORREÇÃO DO TÍTULO === */
        .welcome-title-gradient {
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          text-fill-color: transparent;
          display: inline-block;
        }
        /* Gradiente para Tema Claro (Seu original) */
        body.light .welcome-title-gradient {
          background-image: linear-gradient(90deg, #1e3a8a, #60a5fa);
        }
        /* Gradiente para Tema Escuro (Novo, mais claro) */
        body.dark .welcome-title-gradient {
          background-image: linear-gradient(90deg, #a5c6fa, #60a5fa);
        }
        /* === FIM DA CORREÇÃO === */
        
        .email-tag {
             display: inline-block;
             padding: 0.25rem 0.75rem;
             border-radius: 1rem;
             font-size: 0.875rem;
             margin-top: 1.5rem;
             transition: all 0.3s ease;
        }
        
        body.light .email-tag {
            background-color: #f0f0f0;
            color: #333;
            border: 1px solid var(--gcs-border-color);
        }
        body.dark .email-tag {
            background-color: rgba(25, 39, 53, 0.5);
            color: var(--gcs-dark-text-secondary);
            border: 1px solid var(--gcs-dark-border-glass);
        }
        
        /* Estilo do Botão Laranja (do seu globals.css) */
        .btn-laranja {
          background-color: #F58220 !important;
          border-color: #F58220 !important;
          color: white !important;
          border-radius: 20px !important;
          font-weight: bold !important;
          padding: 6px 20px !important;
        }
        .btn-laranja:hover {
          background-color: #d66f1b !important;
          border-color: #d66f1b !important;
        }
      `}</style>

      {/* O container não tem mais estilos de centralização */}
      <div className="dashboard-container">
        <div className="content-card welcome-card">
          
          {/* O h1 e o span usam classes CSS em vez de style inline para o gradiente */}
          <h1 className="page-title">
            🏠 <span className="welcome-title-gradient">Bem-vindo, {session?.user?.name}</span>
          </h1>

          <p style={{ fontSize: "1rem" }}>
            <span className="email-tag">
              E-mail: {session?.user?.email}
            </span>
          </p>

          <div style={{ marginTop: "2rem" }}>
            <Button
              className="btn-laranja"
              onClick={async () => {
                setLoadingLogout(true);
                const postLogoutUrl = process.env.NEXT_PUBLIC_NEXTAUTH_URL || window.location.origin;
                const microsoftLogoutUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/logout?post_logout_redirect_uri=${encodeURIComponent(postLogoutUrl)}`;
                await signOut({ redirect: false });
                window.location.href = microsoftLogoutUrl;
              }}
            >
              Sair
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}