"use client";

import { useSession, signOut, signIn } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
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
  Send, // Ícone para Notas Enviadas
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

    // ==================================================================
    // Bloco da "Central de Notas"
    // ==================================================================
    if (isAdmin || user.funcoes?.includes("nfEntrada.centralDeNotas")) {
      nfEntradaSubItems.push({
        key: "centralnfe",
        icon: <FileSearch size={18} color="white" />,
        label: "Central de Notas",
        onClick: () => router.push("/painel/nfe/nfe-central"),
      });
    }

    // ==================================================================
    // Bloco "Notas Enviadas BA"
    // ==================================================================
    if (isAdmin || user.funcoes?.includes("nfEntrada.notasEnviadas")) {
      nfEntradaSubItems.push({
        key: "notasenviadasba",
        icon: <Send size={18} color="white" />,
        label: "Notas Enviadas BA",
        onClick: () => router.push("/painel/nfe/nfe-enviadasBA"),
      });
    }

    // ==================================================================
    // Bloco da "Central Financeiro" mantido
    // ==================================================================
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

    // Sub-itens do menu Agrogestor
    const agrogestorSubItems: any[] = [];
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
      if (pathname.startsWith("/painel/nfe/nfe-visao-geral")) return "visaogeralnfe";
      // Lógica de seleção para a Central de Notas
      if (pathname.startsWith("/painel/nfe/nfe-central")) return "centralnfe";
      // Lógica de seleção para Notas Enviadas BA
      if (pathname.startsWith("/painel/nfe/nfe-enviadasBA")) return "notasenviadasba";
      if (pathname.startsWith("/painel/nfe/nfe-central-financeiro")) return "centralfinanceiro";
      if (pathname.startsWith("/painel/nfe/nfe-central-compras")) return "centralcompras";
      if (pathname.startsWith("/painel/nfe/nfe-pendencia-compras")) return "pendenciacompras";
      // REMOVIDO o 'm' perdido aqui
      if (pathname.startsWith("/painel/nfe/nfe-pendencia-fiscal")) return "pendenciafiscal";
      if (pathname.startsWith("/painel/nfe/nfe-regras-fiscais")) return "regrafiscalnfe";
      if (pathname.startsWith("/painel/agrogestor/empreendimento")) return "agrogestorEmpreendimentos";
      if (pathname.startsWith("/painel/agrogestor/condicionantes")) return "agrogestorCondicionantes";
      if (pathname.startsWith("/painel/agrogestor/gestao-empreendimento")) return "agrogestorGestao";

      return undefined;
    };

    return (
      <div style={{ display: "flex", height: "100vh" }}>
        <div
          onMouseEnter={() => setCollapsed(false)}
          onMouseLeave={() => setCollapsed(true)}
          style={{
            width: collapsed ? 80 : 240,
            transition: "width 0.3s ease-in-out",
            background: "linear-gradient(to bottom, var(--cor-sidebar-gradiente-topo), var(--cor-sidebar-gradiente-base))",
            padding: "1rem 0.5rem",
            color: "white",
            position: "relative",
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                paddingLeft: collapsed ? 0 : 16,
                paddingRight: collapsed ? 0 : 16,
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
            <Menu
              mode="inline"
              inlineCollapsed={collapsed}
              selectedKeys={getSelectedKey() ? [getSelectedKey() as string] : []}
              style={{ background: "transparent", borderRight: 0, marginTop: "2rem" }}
              items={menuItems}
            />
          </div>
          <div
            onClick={async () => {
              setLoadingLogout(true);
              
              const postLogoutUrl = process.env.NEXT_PUBLIC_NEXTAUTH_URL || window.location.origin;
              const microsoftLogoutUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/logout?post_logout_redirect_uri=${encodeURIComponent(postLogoutUrl)}`;
              
              await signOut({ redirect: false });
              
              window.location.href = microsoftLogoutUrl;
            }}
            style={{
              position: "absolute",
              bottom: "1rem",
              left: "0.5rem",
              right: "0.5rem",
              color: "white",
              cursor: "pointer",
              padding: "0.5rem 1rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              justifyContent: collapsed ? "center" : "flex-start",
            }}
          >
            <LogOut size={iconSize} />
            <span style={{ transition: "width 0.2s ease-in-out", whiteSpace: "nowrap", width: collapsed ? 0 : "auto", overflow: "hidden" }}>
              Sair
            </span>
          </div>
        </div>
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