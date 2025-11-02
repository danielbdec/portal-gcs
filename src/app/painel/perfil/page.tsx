"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useRef } from "react"; 
import { ShieldUser, Sun, Moon } from "lucide-react";
import { Spin } from "antd"; 
import { LoadingOutlined } from "@ant-design/icons";
// Importando o modal do caminho correto, conforme sua estrutura
import NotificationModal from "../nfe/nfe-central/NotificationModal"; 

// --- COMPONENTE PRINCIPAL DA PÁGINA ---
export default function Perfil() {
  const { data: session, status } = useSession();
  
  // --- REMOVIDO: O estado 'perfil' foi removido ---
  // const [perfil, setPerfil] = useState("Não definido"); 
  
  const [preferredTheme, setPreferredTheme] = useState<'light' | 'dark' | null>(null);
  const [savingTargetTheme, setSavingTargetTheme] = useState<'light' | 'dark' | null>(null);
  const [notification, setNotification] = useState({ visible: false, type: 'success' as 'success' | 'error', message: '' });

  // Ref para garantir que a busca só ocorra uma vez
  const hasFetched = useRef(false);

  useEffect(() => {
    // Esta função agora busca APENAS o tema
    const fetchThemeData = async () => {
      try {
        const res = await fetch("/api/portal/consulta-tema", {
          method: "POST" 
        });
        
        if (!res.ok) {
          throw new Error(`Falha ao buscar tema: ${res.statusText}`);
        }

        const data = await res.json(); // API retorna: { "tema": "E" } (ou [ { tema: "E" } ])
        
        // --- CORREÇÃO: Lógica unificada para tratar objeto ou array ---
        let userData;
        if (Array.isArray(data) && data.length > 0) {
          userData = data[0]; // Pega o primeiro item do array
        } else if (typeof data === 'object' && data !== null && data.tema) {
          userData = data; // Usa o objeto diretamente
        }

        if (userData && userData.tema) {
          const apiTheme = userData.tema === 'E' ? 'dark' : 'light';
          setPreferredTheme(apiTheme);
        } else {
          console.warn("API /consulta-tema retornou dados inesperados:", data);
          setPreferredTheme('light'); // Fallback
        }

      } catch (err) {
        console.error("Erro ao buscar dados do tema:", err);
        setPreferredTheme('light'); 
      }
    };

    // Lógica de execução única
    if (status === "authenticated" && session?.user?.email && !hasFetched.current) {
      hasFetched.current = true;
      fetchThemeData();
    }
  }, [status, session]); 

  const handleThemeChange = async (newTheme: 'light' | 'dark') => {
    if (!session?.user?.email || savingTargetTheme || newTheme === preferredTheme) return;

    const oldTheme = preferredTheme;
    setSavingTargetTheme(newTheme); 
    setPreferredTheme(newTheme); 

    try {
      const response = await fetch('/api/portal/altera-tema', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            tema: newTheme 
          }),
      });

      const result = await response.json();
      if (!response.ok || result.status !== 'ok') {
        throw new Error(result.message || 'Falha ao salvar o tema.');
      }

      setNotification({ visible: true, type: 'success', message: 'Preferência de tema salva com sucesso!' });

    } catch (error: any) {
      console.error("Erro ao salvar tema:", error);
      setNotification({ visible: true, type: 'error', message: error.message || 'Não foi possível salvar sua preferência.' });
      setPreferredTheme(oldTheme); // Reverte em caso de erro
    } finally {
      setSavingTargetTheme(null); 
    }
  };
  
  const handleCloseNotification = () => {
    setNotification({ visible: false, type: 'success', message: '' });
  };

  useEffect(() => {
    if (preferredTheme) {
      document.body.classList.remove('light', 'dark');
      document.body.classList.add(preferredTheme);
      localStorage.setItem('theme', preferredTheme);
    }
  }, [preferredTheme]); 


  // Mostra o loading se a sessão estiver carregando OU se o tema ainda for 'null'
  if (status === "loading" || !preferredTheme) {
    return (
        <div 
          className="dashboard-container"
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            minHeight: 'calc(100vh - 4rem)' 
          }}
        >
          <Spin 
            indicator={<LoadingOutlined style={{ fontSize: 48, color: 'var(--gcs-blue)' }} spin />} 
            tip={<span className="loading-text">Carregando perfil...</span>} 
          />
        </div>
    );
  }

  // Variável para desabilitar botões
  const isSaving = savingTargetTheme !== null;

  return (
    <>
      {/* --- ESTILOS GLOBAIS E DA PÁGINA (COPIADOS DO SEU page_visao_geral.tsx) --- */}
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
        }
        .content-card, .main-content-card {
            padding: 1.5rem;
            border-radius: 12px;
            transition: all 0.3s ease;
        }
        .page-title {
            margin: 0;
            font-size: 1.75rem; /* Ajustado para 1.75rem (igual visao_geral) */
            font-weight: bold;
            display: flex;
            align-items: center;
            gap: 0.75rem;
        }
        
        /* Estrutura do Cabeçalho (da visao_geral) */
        .header-wrapper { 
          margin-bottom: 1.5rem; 
        }
        .header-content {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 1rem;
        }
        
        @media (min-width: 768px) {
          .header-content {
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
          }
          .page-title {
            font-size: 1.75rem;
          }
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
        /* Cor do spinner Antd (no modo claro) */
        body.light .ant-spin-dot-item {
            background-color: var(--gcs-blue);
        }
        
        body.light .profile-label { color: var(--gcs-gray-dark); }
        body.light .profile-value { color: var(--gcs-dark-text); }
        body.light .card-divider { border-color: var(--gcs-border-color); }
        body.light .content-card h3 {
             color: var(--gcs-dark-text);
        }

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
          background: rgba(25, 39, 53, 0.25) !important; /* Opacidade 0.25 */
          backdrop-filter: blur(16px) !important;
          -webkit-backdrop-filter: blur(16px) !important;
          border: 1px solid var(--gcs-dark-border-glass) !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1) !important;
        }
        
        body.dark .page-title { color: var(--gcs-dark-text-primary); }
        body.dark .loading-text { color: #93C5FD; }
        /* Cor do spinner Antd (no modo escuro) */
        body.dark .ant-spin-dot-item {
            background-color: #BFDBFE; /* Azul claro */
        }
        body.dark .ant-spin-text {
            color: #93C5FD;
        }

        body.dark .profile-label { color: var(--gcs-dark-text-tertiary); }
        body.dark .profile-value { color: var(--gcs-dark-text-secondary); }
        body.dark .card-divider { border-color: var(--gcs-dark-border-glass); }

        body.dark .content-card h3 {
             color: var(--gcs-dark-text-primary);
        }

        /* --- ESTILOS (Para esta página) --- */
        .profile-grid {
            display: grid;
            grid-template-columns: 100px 1fr;
            gap: 1rem;
            font-size: 1rem;
            max-width: 600px;
        }
        .profile-label {
            font-weight: 600;
        }
        .profile-value {
            font-weight: 400;
        }
        .card-divider {
            border: 0;
            border-top: 1px solid;
            margin: 2rem 0;
            opacity: 0.5;
        }

        /* --- ESTILOS (Para os botões de Tema - CORRIGIDO) --- */
        .theme-button-group {
            display: flex;
            gap: 10px;
            align-items: center;
        }
        .theme-button {
            padding: 8px 16px;
            border-radius: 8px;
            border: 1px solid transparent;
            cursor: pointer;
            font-weight: 600;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            transition: all 0.2s ease-in-out;
            font-size: 0.9rem;
            /* Definir altura e largura mínimas para não "pular" */
            min-width: 140px; 
            min-height: 40px;
            justify-content: center;
        }
        .theme-button:disabled {
            opacity: 0.6;
            cursor: wait;
        }
        
        /* Spinner inline para o botão */
        .theme-button .ant-spin {
            line-height: 1; 
            color: currentColor; /* Herda a cor do texto do botão */
        }

        /* Tema Claro: Botão Inativo */
        body.light .theme-button {
            background-color: var(--gcs-gray-light);
            color: var(--gcs-gray-dark);
            border-color: var(--gcs-border-color);
        }
        body.light .theme-button svg {
            color: var(--gcs-gray-dark);
        }
        body.light .theme-button:hover:not(:disabled) {
            background-color: var(--gcs-gray-medium);
        }
        
        /* Tema Claro: Botão Ativo */
        body.light .theme-button.active {
            background-color: var(--gcs-blue);
            color: white;
            border-color: var(--gcs-blue);
        }
        body.light .theme-button.active svg {
            color: white;
        }
        
        /* Tema Escuro: Botão Inativo (Como os filtros da Central) */
        body.dark .theme-button {
            background-color: rgba(25, 39, 53, 0.5); /* Fundo vidro */
            color: var(--gcs-dark-text-secondary); /* Texto cinza */
            border-color: var(--gcs-dark-border-glass);
        }
        body.dark .theme-button svg {
            color: var(--gcs-dark-text-tertiary); /* Icone cinza */
        }
        body.dark .theme-button:hover:not(:disabled) {
            background-color: rgba(40, 60, 80, 0.7);
            border-color: rgba(125, 173, 222, 0.5);
        }
        
        /* Tema Escuro: Botão Ativo (Estilo do screenshot 'image_50a201.png') */
        body.dark .theme-button.active {
            background-color: rgba(25, 39, 53, 0.5); /* Fundo vidro */
            color: #93C5FD; /* Texto azul claro */
            border-color: #93C5FD; /* Borda azul claro */
        }
        body.dark .theme-button.active svg {
            color: #93C5FD; /* Icone azul claro */
        }
      `}</style>

      {/* --- ESTRUTURA DE LAYOUT (COPIADA DO visao_geral) --- */}
      <div className="dashboard-container">
        <div className="content-wrapper">
          
          {/* 1. Card do Cabeçalho (Título) */}
          <div className="header-wrapper">
            <div className="main-content-card header-content">
              <h2 className="page-title">
                <ShieldUser size={28} />
                Meu Perfil
              </h2>
            </div>
          </div>

          {/* 2. Card de Conteúdo (Informações do Perfil) */}
          <div className="content-card">
            <div className="profile-grid">
              <span className="profile-label">Nome:</span>
              <span className="profile-value">{session?.user?.name}</span>
              
              <span className="profile-label">Email:</span>
              <span className="profile-value">{session?.user?.email}</span>
              
              {/* --- CORREÇÃO FINAL: 'perfil' é lido da sessão --- */}
              <span className="profile-label">Perfil:</span>
              <span className="profile-value">
                {session?.user?.is_admin ? "Administrador" : "Usuario"}
              </span>
            </div>

            <hr className="card-divider" />

            {/* O h3 agora terá a cor corrigida pelo CSS */}
            <h3 style={{ marginBottom: '1rem' }}>Preferências</h3>
            <div className="theme-button-group">
              <span className="profile-label">Tema Padrão:</span>
              
              <button
                className={`theme-button ${preferredTheme === 'light' ? 'active' : ''}`}
                onClick={() => handleThemeChange('light')}
                disabled={isSaving || preferredTheme === 'light'}
              >
                {isSaving && savingTargetTheme === 'light' ? (
                  <Spin indicator={<LoadingOutlined style={{ fontSize: 18 }} spin />} />
                ) : (
                  <Sun size={18} />
                )}
                <span>Tema Claro</span>
              </button>
              
              <button
                className={`theme-button ${preferredTheme === 'dark' ? 'active' : ''}`}
                onClick={() => handleThemeChange('dark')}
                disabled={isSaving || preferredTheme === 'dark'}
              >
                {isSaving && savingTargetTheme === 'dark' ? (
                  <Spin indicator={<LoadingOutlined style={{ fontSize: 18 }} spin />} />
                ) : (
                  <Moon size={18} />
                )}
                <span>Tema Escuro</span>
              </button>
            </div>
          </div>

        </div>
      </div>

      <NotificationModal
        visible={notification.visible}
        type={notification.type}
        message={notification.message}
        onClose={handleCloseNotification}
      />
    </>
  );
}