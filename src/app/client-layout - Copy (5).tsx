"use client";

import { useSession, signOut, signIn } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useLayoutEffect } from "react";
import { Menu, Spin } from "antd";
import {
  House,
  Users,
  ShieldUser,
  LogOut,
  FileBadge,
  FileChartLine,
  FileSearch,
  ShoppingCart,
  Landmark,
  Newspaper,
  FolderArchive,
  Banknote,
  Send,
  ChevronUp,
  ChevronDown,
  FileText, // Ícone principal de Gestão Agrícola
  MapPin,   // ÍCONE ADICIONADO PARA PIVÔ
  Leaf,     // <<< 📌 ÍCONE ADICIONADO AQUI
} from "lucide-react";
import { LoadingOutlined } from "@ant-design/icons";
import Image from "next/image";

import ChatWidget from "../components/ChatWidget";

import "@refinedev/antd/dist/reset.css";
import "./globals.css";
import "./custom-sidebar.css";

// Interface para a sessão do utilizador, agora com as permissões
interface UserSession {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  is_admin?: boolean;
  funcoes?: string[];
}

interface CustomSession {
  user?: UserSession;
  expires: string;
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(true);
  const [loadingLogout, setLoadingLogout] = useState(false);
  const router = useRouter();
  const { data: session, status }: { data: CustomSession | null; status: string } = useSession();

  // --- REFS E STATE PARA O SCROLL AUTOMÁTICO ---
  const menuContainerRef = useRef<HTMLDivElement>(null);
  const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  // --- EFEITO PARA DETECTAR OVERFLOW ---
  useLayoutEffect(() => {
    const container = menuContainerRef.current;
    if (!container) return;

    const checkOverflow = () => {
      const hasOverflow = container.scrollHeight > container.clientHeight;
      setIsOverflowing(hasOverflow);
    };

    checkOverflow();

    const resizeObserver = new ResizeObserver(checkOverflow);
    resizeObserver.observe(container);

    const mutationObserver = new MutationObserver(checkOverflow);
    mutationObserver.observe(container, { childList: true, subtree: true });

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
      }
    };
  }, [collapsed]);
  
  // --- FUNÇÕES DE CONTROLE DO SCROLL ---
  const startScroll = (direction: "up" | "down") => {
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
    }
    
    scrollIntervalRef.current = setInterval(() => {
      if (menuContainerRef.current) {
        const scrollAmount = 10; // Velocidade da rolagem
        if (direction === "up") {
          menuContainerRef.current.scrollTop -= scrollAmount;
        } else {
          menuContainerRef.current.scrollTop += scrollAmount;
        }
      }
    }, 25);
  };

  const stopScroll = () => {
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
  };
  // --------------------------------------

  if (status === "loading") {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
        <Spin tip="Carregando..." indicator={<LoadingOutlined style={{ fontSize: 48, color: "#52c41a" }} spin />} />
      </div>
    );
  }

  if (status === "unauthenticated") {
    signIn("azure-ad", { callbackUrl: pathname });
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
        <Spin tip="Redirecionando para a página de login..." indicator={<LoadingOutlined style={{ fontSize: 48, color: "#52c41a" }} spin />} />
      </div>
    );
  }

  if (session && !loadingLogout) {
    const user = session.user || {};
    const iconSize = collapsed ? 24 : 18;
    const isAdmin = user.is_admin === true;

    // --- CONSTRUÇÃO DINÂMICA DO MENU ---
    const menuItems: any[] = [];

    // Itens que todos os utilizadores veem
    menuItems.push(
      { key: "inicio", icon: <House size={iconSize} color="white" />, label: "Início", onClick: () => router.push("/painel") },
      { key: "perfil", icon: <ShieldUser size={iconSize} color="white" />, label: "Meu Perfil", onClick: () => router.push("/painel/perfil") },
    );

    // Sub-itens do menu NF Entrada
    const nfEntradaSubItems: any[] = [];
    if (isAdmin || user.funcoes?.includes("nfEntrada.visaoGeral")) {
      nfEntradaSubItems.push({
        key: "visaogeralnfe",
        icon: <FileChartLine size={18} color="white" />,
        label: "Visão Geral",
        onClick: () => router.push("/painel/nfe/nfe-visao-geral"),
      });
    }
    // ... (restante dos sub-itens de NF Entrada) ...
    if (isAdmin || user.funcoes?.includes("nfEntrada.centralDeNotas")) {
      nfEntradaSubItems.push({
        key: "centralnfe",
        icon: <FileSearch size={18} color="white" />,
        label: "Central de Notas",
        onClick: () => router.push("/painel/nfe/nfe-central"),
      });
    }
    if (isAdmin || user.funcoes?.includes("nfEntrada.notasEnviadas")) {
      nfEntradaSubItems.push({
        key: "notasenviadasba",
        icon: <Send size={18} color="white" />,
        label: "Notas Enviadas BA",
        onClick: () => router.push("/painel/nfe/nfe-enviadasBA"),
      });
    }
    if (isAdmin || user.funcoes?.includes("nfEntrada.centralFinanceiro")) {
      nfEntradaSubItems.push({
        key: "centralfinanceiro",
        icon: <Banknote size={18} color="white" />,
        label: "Central Financeiro",
        onClick: () => router.push("/painel/nfe/nfe-central-financeiro"),
      });
    }
    if (isAdmin || user.funcoes?.includes("nfEntrada.centralCompras")) {
      nfEntradaSubItems.push({
        key: "centralcompras",
        icon: <ShoppingCart size={18} color="white" />,
        label: "Central de Compras",
        onClick: () => router.push("/painel/nfe/nfe-central-compras"),
      });
    }
    if (isAdmin || user.funcoes?.includes("nfEntrada.pendenciaCompras")) {
      nfEntradaSubItems.push({
        key: "pendenciacompras",
        icon: <ShoppingCart size={18} color="white" />,
        label: "Pendencia Compras",
        onClick: () => router.push("/painel/nfe/nfe-pendencia-compras"),
      });
    }
    if (isAdmin || user.funcoes?.includes("nfEntrada.pendenciaFiscal")) {
      nfEntradaSubItems.push({
        key: "pendenciafiscal",
        icon: <Landmark size={18} color="white" />,
        label: "Pendencia Fiscal",
        onClick: () => router.push("/painel/nfe/nfe-pendencia-fiscal"),
      });
    }
    if (isAdmin || user.funcoes?.includes("nfEntrada.regrasFiscais")) {
      nfEntradaSubItems.push({
        key: "regrafiscalnfe",
        icon: <Newspaper size={18} color="white" />,
        label: "Regras Fiscais",
        onClick: () => router.push("/painel/nfe/nfe-regras-fiscais"),
      });
    }

    if (nfEntradaSubItems.length > 0) {
      menuItems.push({
        key: "nfentrada",
        icon: <FileBadge size={iconSize} color="white" />,
        label: "NF Entrada",
        children: nfEntradaSubItems,
      });
    }

    // --- MÓDULO: GESTÃO AGRÍCOLA ---
    const gestaoAgricolaSubItems: any[] = [];
    
    // --- ITEM 1: CADERNO AGRÍCOLA (CORRIGIDO) ---
    if (isAdmin || user.funcoes?.includes("caderno.safra")) {
      gestaoAgricolaSubItems.push({
        key: "cadernoAgricola", // Chave corrigida
        icon: <FileChartLine size={18} color="white" />,
        label: "Caderno Agrícola", // Label corrigido
        onClick: () => router.push("/painel/gestao-agricola/caderno-agricola"), // Rota corrigida
      });
    }
    
    // --- ITEM 2: PIVÔS E TALHÕES (NOVO) ---
    if (isAdmin || user.funcoes?.includes("gestao.agricola.pivo")) {
      gestaoAgricolaSubItems.push({
        key: "pivoTalhao",
        icon: <MapPin size={18} color="white" />,
        label: "Pivôs e Talhões",
        onClick: () => router.push("/painel/gestao-agricola/cadastros/pivo-talhao"),
      });
    }

    // ==================================================================
    // ===               📌 ALTERAÇÃO REALIZADA AQUI                ===
    // ==================================================================
    // --- ITEM 3: VARIEDADES (NOVO) ---
    if (isAdmin || user.funcoes?.includes("gestao.agricola.cultivar")) {
      gestaoAgricolaSubItems.push({
        key: "variedades",
        icon: <Leaf size={18} color="white" />, // <<< ÍCONE TROCADO
        label: "Variedades",
        onClick: () => router.push("/painel/gestao-agricola/cadastros/variedades"),
      });
    }
    // ==================================================================
    // ===                       FIM DA ALTERAÇÃO                     ===
    // ==================================================================
    
    if (gestaoAgricolaSubItems.length > 0) {
      menuItems.push({
        key: "gestaoagricola", // Chave principal do grupo
        icon: <FileText size={iconSize} color="white" />, // Ícone principal do módulo
        label: "Gestão Agrícola",
        children: gestaoAgricolaSubItems,
      });
    }
    // --- FIM DO MÓDULO ---

    // === MÓDULO: GESTÃO DE PESSOAL (NOVO) ===
    const gestaoPessoalSubItems: any[] = [];
    if (isAdmin || user.funcoes?.includes("gestao.funcionario")) {
      gestaoPessoalSubItems.push({
        key: "gestaoFuncionarios",
        icon: <Users size={18} color="white" />,
        label: "Funcionários",
        onClick: () => router.push("/painel/pessoas/gestao-funcionarios"),
      });
    }
    if (gestaoPessoalSubItems.length > 0) {
      menuItems.push({
        key: "gestaopessoal",
        icon: <Users size={iconSize} color="white" />,
        label: "Gestão de Pessoas",
        children: gestaoPessoalSubItems,
      });
    }
    // === FIM DO MÓDULO DE PESSOAL ===

    // Sub-itens do menu Agrogestor
    const agrogestorSubItems: any[] = [];
    
    // (Item de caderno agrícola foi REMOVIDO DAQUI)
    
    if (isAdmin || user.funcoes?.includes("agrogestor.empreendimentos")) {
      agrogestorSubItems.push({
        key: "agrogestorEmpreendimentos",
        icon: <Users size={18} color="white" />,
        label: "Empreendimentos",
        onClick: () => router.push("/painel/agrogestor/empreendimento"),
      });
    }
    if (isAdmin || user.funcoes?.includes("agrogestor.condicionantes")) {
      agrogestorSubItems.push({
        key: "agrogestorCondicionantes",
        icon: <Newspaper size={18} color="white" />,
        label: "Condicionantes",
        onClick: () => router.push("/painel/agrogestor/condicionantes"),
      });
    }
    if (isAdmin || user.funcoes?.includes("agrogestor.gestaoEmpreendimentos")) {
      agrogestorSubItems.push({
        key: "agrogestorGestao",
        icon: <FileChartLine size={18} color="white" />,
        label: "Gestão",
        onClick: () => router.push("/painel/agrogestor/gestao-empreendimento"),
      });
    }

    if (agrogestorSubItems.length > 0) {
      menuItems.push({
        key: "agrogestor",
        icon: <FolderArchive size={iconSize} color="white" />,
        label: "Agrogestor",
        children: agrogestorSubItems,
      });
    }

    // Menu de Administração
    if (isAdmin || user.funcoes?.includes("admin.gerenciarUsuarios")) {
      menuItems.push({
        key: "cadastro-usuarios",
        icon: <Users size={iconSize} color="white" />,
        label: "Usuários",
        onClick: () => router.push("/painel/cadastro-usuarios"),
      });
    }

    const getSelectedKey = () => {
      if (!pathname) return undefined;
      if (pathname.startsWith("/painel/perfil")) return "perfil";
      if (pathname.startsWith("/painel/cadastro-usuarios")) return "cadastro-usuarios";
      
      // NF Entrada
      if (pathname.startsWith("/painel/nfe/nfe-visao-geral")) return "visaogeralnfe";
      if (pathname.startsWith("/painel/nfe/nfe-central")) return "centralnfe";
      if (pathname.startsWith("/painel/nfe/nfe-enviadasBA")) return "notasenviadasba";
      if (pathname.startsWith("/painel/nfe/nfe-central-financeiro")) return "centralfinanceiro";
      if (pathname.startsWith("/painel/nfe/nfe-central-compras")) return "centralcompras";
      if (pathname.startsWith("/painel/nfe/nfe-pendencia-compras")) return "pendenciacompras";
      if (pathname.startsWith("/painel/nfe/nfe-pendencia-fiscal")) return "pendenciafiscal";
      if (pathname.startsWith("/painel/nfe/nfe-regras-fiscais")) return "regrafiscalnfe";
      
      // --- ATUALIZAÇÃO DO GETSELECTEDKEY (Gestão Agrícola) ---
      if (pathname.startsWith("/painel/gestao-agricola/caderno-agricola")) return "cadernoAgricola";
      if (pathname.startsWith("/painel/gestao-agricola/cadastros/pivo-talhao")) return "pivoTalhao";
      if (pathname.startsWith("/painel/gestao-agricola/cadastros/variedades")) return "variedades";
      // --- FIM DA ATUALIZAÇÃO ---

      // --- ATUALIZAÇÃO GETSELECTEDKEY (Pessoal) ---
      if (pathname.startsWith("/painel/pessoas/gestao-funcionarios")) return "gestaoFuncionarios";
      // --- FIM (Pessoal) ---

      // Agrogestor
      if (pathname.startsWith("/painel/agrogestor/empreendimento")) return "agrogestorEmpreendimentos";
      if (pathname.startsWith("/painel/agrogestor/condicionantes")) return "agrogestorCondicionantes";
      if (pathname.startsWith("/painel/agrogestor/gestao-empreendimento")) return "agrogestorGestao";

      return undefined;
    };

    // --- ESTILOS PARA AS SETAS DE SCROLL ---
    const arrowStyle: React.CSSProperties = {
      position: "absolute",
      left: "0.5rem",
      right: "0.5rem",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      height: "24px",
      background: "rgba(0, 0, 0, 0.2)",
      color: "white",
      cursor: "pointer",
      zIndex: 10,
      opacity: 0.7,
      transition: "opacity 0.2s",
    };

    const arrowHoverStyle: React.CSSProperties = {
      opacity: 1,
      background: "rgba(0, 0, 0, 0.4)",
    };


    return (
      <div style={{ display: "flex", height: "100vh" }}>
        {/* ================================================================== */}
        {/* INÍCIO DA SIDEBAR                                                */}
        {/* ================================================================== */}
        <div
          onMouseEnter={() => setCollapsed(false)}
          onMouseLeave={() => setCollapsed(true)}
          style={{
            width: collapsed ? 80 : 240,
            transition: "width 0.3s ease-in-out",
            background: "linear-gradient(to bottom, var(--cor-sidebar-gradiente-topo), var(--cor-sidebar-gradiente-base))",
            color: "white",
            display: "flex",
            flexDirection: "column",
            height: "100vh",
          }}
        >
          {/* 1. SEÇÃO DO LOGO (TOPO) */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "1rem",
              paddingLeft: collapsed ? "0.5rem" : "1.5rem",
              paddingRight: collapsed ? "0.5rem" : "1.5rem",
              flexShrink: 0,
            }}
          >
            <Image
              src="/logo.png"
              alt="Logo"
              width={collapsed ? 70 : 140}
              height={collapsed ? 40 : 60}
              style={{ objectFit: "contain", transition: "all 0.3s ease-in-out" }}
            />
          </div>

          {/* 2. SEÇÃO DO MENU (CENTRO, COM SCROLL) */}
          <div
            style={{
              flex: 1,
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* --- SETA PARA CIMA --- */}
            {isOverflowing && (
              <div
                style={{ ...arrowStyle, top: 0 }}
                onMouseEnter={(e) => {
                  startScroll("up");
                  (e.currentTarget as HTMLDivElement).style.opacity = arrowHoverStyle.opacity.toString();
                  (e.currentTarget as HTMLDivElement).style.background = arrowHoverStyle.background;
                }}
                onMouseLeave={(e) => {
                  stopScroll();
                  (e.currentTarget as HTMLDivElement).style.opacity = arrowStyle.opacity.toString();
                  (e.currentTarget as HTMLDivElement).style.background = arrowStyle.background;
                }}
              >
                <ChevronUp size={20} />
              </div>
            )}

            {/* --- CONTAINER DE SCROLL REAL --- */}
            <div
              ref={menuContainerRef}
              style={{
                height: "100%",
                overflowY: "auto",
                overflowX: "hidden",
                padding: "0 0.5rem",
                scrollbarWidth: "none",
                msOverflowStyle: "none",
              }}
              className="custom-scrollbar-hidden"
            >
              <Menu
                mode="inline"
                inlineCollapsed={collapsed}
                selectedKeys={getSelectedKey() ? [getSelectedKey() as string] : []}
                style={{
                  background: "transparent",
                  borderRight: 0,
                  marginTop: "1rem",
                  paddingTop: isOverflowing ? "24px" : 0,
                  paddingBottom: isOverflowing ? "24px" : 0,
                }}
                items={menuItems}
              />
            </div>
            
            {/* --- SETA PARA BAIXO --- */}
            {isOverflowing && (
              <div
                style={{ ...arrowStyle, bottom: 0 }}
                onMouseEnter={(e) => {
                  startScroll("down");
                  (e.currentTarget as HTMLDivElement).style.opacity = arrowHoverStyle.opacity.toString();
                  (e.currentTarget as HTMLDivElement).style.background = arrowHoverStyle.background;
                }}
                onMouseLeave={(e) => {
                  stopScroll();
                  (e.currentTarget as HTMLDivElement).style.opacity = arrowStyle.opacity.toString();
                  (e.currentTarget as HTMLDivElement).style.background = arrowStyle.background;
                }}
              >
                <ChevronDown size={20} />
              </div>
            )}
          </div>
          {/* FIM DA SEÇÃO DO MENU */}


          {/* 3. SEÇÃO SAIR (EMBAIXO, FIXO) */}
          <div
            onClick={async () => {
              setLoadingLogout(true);
              
              const postLogoutUrl = process.env.NEXT_PUBLIC_NEXTAUTH_URL || window.location.origin;
              const microsoftLogoutUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/logout?post_logout_redirect_uri=${encodeURIComponent(postLogoutUrl)}`;
              
              await signOut({ redirect: false });
              
              window.location.href = microsoftLogoutUrl;
            }}
            style={{
              color: "white",
              cursor: "pointer",
              padding: "1rem",
              paddingLeft: collapsed ? "0.5rem" : "1.5rem",
              paddingRight: collapsed ? "0.5rem" : "1.5rem",
    
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              justifyContent: collapsed ? "center" : "flex-start",
              borderTop: "1px solid rgba(255, 255, 255, 0.1)",
              marginTop: "0.5rem",
              flexShrink: 0,
            }}
          >
            <LogOut size={iconSize} />
            <span style={{ transition: "width 0.2s ease-in-out", whiteSpace: "nowrap", width: collapsed ? 0 : "auto", overflow: "hidden" }}>
              Sair
            </span>
          </div>
        </div>
        {/* ================================================================== */}
        {/* FIM DA SIDEBAR                                                   */}
        {/* ================================================================== */}

        <main style={{ flex: 1, overflow: "auto", padding: "1rem", position: "relative" }}>
          {children}
          <ChatWidget />
        </main>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
      <Spin tip="Saindo..." indicator={<LoadingOutlined style={{ fontSize: 48, color: "#52c41a" }} spin />} />
    </div>
  );
}