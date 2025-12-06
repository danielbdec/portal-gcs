/*
 * =========================================================================
 * PÁGINA DE GESTÃO DE VARIEDADES (CRUD)
 * =========================================================================
 * ATUALIZAÇÃO:
 * - Corrigido o mapeamento de dados em 'fetchVariedades' para
 * usar os campos corretos da API (ex: 'nome_comercial', 'cultura').
 * - Atualizada a 'interface Variedade' para refletir os dados reais da API.
 * - Atualizadas as colunas da tabela para exibir os novos campos.
 * - ATUALIZAÇÃO 2: handleSaveVariedade corrigido para enviar os novos campos.
 * - ATUALIZAÇÃO 3: Tipagem de 'status' ajustada para compatibilidade com o Modal.
 * =========================================================================
 */
"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import React from "react";

// --- Imports de UI (Ant Design e Lucide) ---
import {
    Spin, Pagination, message, Dropdown, Menu, Button, Input,
} from "antd";
import type { MenuProps } from 'antd';
import {
    RefreshCcw, Lock, BadgeCheck, Settings2, ChevronsUpDown,
    ArrowUp, ArrowDown, FileDown, Sun, Moon, Plus, MoreVertical, Edit, Trash2, Eye,
    Hash, Leaf, // Leaf para Cultura
    ShoppingCart, // Icone de Variedade
    CalendarClock, // Novo Ícone para Ciclo
    Award // Novo Ícone para Obtentor
} from "lucide-react";
import { LoadingOutlined } from "@ant-design/icons";
import "antd/dist/reset.css";

// --- Imports dos Modais (Caminhos Corrigidos) ---
import ModalVariedade from "./ModalVariedade";
import ModalVariedadeDetalhes from "./ModalVariedadeDetalhes";
import NotificationModal from "./NotificationModal";


// --- INTERFACE DO ITEM (Corrigida para API real e Modal) ---
interface Variedade {
  id: number;
  key: string;
  nome: string; // Vem de 'nome_comercial'
  cultura: string; // Vem de 'cultura'
  obtentor: string; // Novo campo
  ciclo_maturacao_dias: number; // Novo campo
  // CORREÇÃO: Tipagem de status ajustada para literais
  status: 'Aberto' | 'Inativo'; 
  status_original: 'A' | 'I';
  // Campos do modal que não vêm da lista principal
  id_cultura?: number;
  nome_comercial?: string; // Adicionado para passar ao modal corretamente
}

type StatusFiltro = 'Aberto' | 'Inativo' | 'Todos';


// --- HELPER DE DATA ---
const formatProtheusDateTime = (dateString: string | null | undefined): string => {
    if (!dateString) { return '—'; }
    // ... (código helper de data mantido)
    try {
        const dateTest = new Date(dateString);
        if (isNaN(dateTest.getTime())) {
            if (dateString.length === 8) {
                const year = dateString.substring(0, 4);
                const month = dateString.substring(5, 7);
                const day = dateString.substring(6, 8);
                return `${day}/${month}/${year}`;
            }
            return '—';
        }
        const year = dateString.substring(0, 4);
        const month = dateString.substring(5, 7);
        const day = dateString.substring(8, 10);
        if(dateString.length >= 16) {
            const hour = dateString.substring(11, 13);
            const minute = dateString.substring(14, 16);
            return `${day}/${month}/${year} ${hour}:${minute}`;
        }
        return `${day}/${month}/${year}`;
    } catch (error) {
        return '—';
    }
};


// --- COMPONENTES AUXILIARES (DO GABARITO PIVÔ) ---
const LoadingSpinner = ({ text }: { text: string }) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
        <div className="auth-spinner" style={{ width: '40px', height: '40px', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <div style={{ marginTop: '1rem', fontWeight: 'bold' }} className="loading-text">
            {text}
        </div>
    </div>
);

const AcessoNegado = () => {
  const router = useRouter();
  return (
    <div className="content-card" style={{ textAlign: 'center', padding: '3rem', maxWidth: '600px', margin: 'auto' }}>
      <Lock size={48} color="var(--gcs-orange)" />
      <h2 style={{ marginTop: '1.5rem', color: 'var(--gcs-blue)' }}>Acesso Negado</h2>
      <p style={{ color: 'var(--gcs-gray-dark)', maxWidth: '400px', margin: '1rem auto' }}>
        Você não tem as permissões necessárias para visualizar esta página.
      </p>
      <button onClick={() => router.push('/painel')} className="btn btn-green" style={{ marginTop: '1rem' }}>
        Voltar ao Painel
      </button>
    </div>
  );
};

// Hook de Debounce
function useDebouncedValue<T>(value: T, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => { setDebouncedValue(value); }, delay);
    return () => { clearTimeout(handler); };
  }, [value, delay]);
  return debouncedValue;
}

// --- COMPONENTE DE ABAS DE FILTRO (DO GABARITO PIVÔ) ---
const FiltroAbasStatus = ({ filtroAtual, onChange }: {
  filtroAtual: StatusFiltro;
  onChange: (status: StatusFiltro) => void;
}) => {
  const abas: StatusFiltro[] = ['Aberto', 'Inativo', 'Todos'];
  return (
    <div className="tabs-card">
      {abas.map((aba) => (
        <button
          key={aba}
          className="seg-item"
          aria-pressed={filtroAtual === aba}
          onClick={() => onChange(aba)}
        >
          {aba}
        </button>
      ))}
    </div>
  );
};


// --- PÁGINA PRINCIPAL DO CRUD ---

export default function GestaoVariedadePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [authStatus, setAuthStatus] = useState<'loading' | 'authorized' | 'unauthorized'>('loading');
  const [variedades, setVariedades] = useState<Variedade[]>([]); 

  // --- Estados do Tema ---
  const [theme, setTheme] = useState<'light' | 'dark' | null>(null);
  const hasFetchedTheme = useRef(false);
  const [isSavingTheme, setIsSavingTheme] = useState(false);

  // --- Estados da Página ---
  const [busca, setBusca] = useState<string>("");
  const buscaDebounced = useDebouncedValue(busca, 400);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState({ visible: false, type: 'success' as 'success' | 'error', message: '' });

  // --- Estados dos Modais ---
  const [isCrudModalOpen, setIsCrudModalOpen] = useState(false);
  const [isDetalheModalOpen, setIsDetalheModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'delete'>('add');
  const [currentItem, setCurrentItem] = useState<Partial<Variedade> | null>(null);

  // --- Estados de Paginação e Ordenação ---
  const [paginaAtual, setPaginaAtual] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Variedade | null; direction: 'asc' | 'desc' }>({ key: 'id', direction: 'asc' });

  // --- Estado de Filtro de Status ---
  const [filtroStatus, setFiltroStatus] = useState<StatusFiltro>('Aberto');

  // --- KPIs ---
  const kpiDadosStatus = useMemo(() => {
    const abertos = variedades.filter(c => c.status === 'Aberto').length;
    const inativos = variedades.filter(c => c.status === 'Inativo').length;
    return [
      { name: 'Abertos', value: abertos },
      { name: 'Inativos', value: inativos },
    ];
  }, [variedades]);

  // --- LÓGICA DE TEMA (DO GABARITO PIVÔ) ---
  useEffect(() => {
    const storedTheme = localStorage.getItem('theme') as 'light' | 'dark';
    setTheme(storedTheme || 'light');
    hasFetchedTheme.current = true;
  }, []);

  useEffect(() => {
    if (theme) {
      localStorage.setItem('theme', theme);
      document.body.classList.remove('light', 'dark');
      document.body.classList.add(theme);
    }
  }, [theme]);

  const handleThemeChange = async (newTheme: 'light' | 'dark') => {
    if (!session?.user?.email || isSavingTheme || newTheme === theme) return;
    const oldTheme = theme;
    setIsSavingTheme(true);
    setTheme(newTheme);
    try {
      console.log(`[MockAPI] Tema salvo como: ${newTheme}`);
      await new Promise(res => setTimeout(res, 300));
    } catch (error: any) {
      setTheme(oldTheme);
    } finally {
      setIsSavingTheme(false);
    }
  };


  // --- LÓGICA DE AUTENTICAÇÃO ---
  useEffect(() => {
    if (status === 'loading') { setAuthStatus('loading'); return; }
    if (status === 'authenticated') {
      const user: any = session.user;
      const hasAccess = user?.is_admin === true || user?.funcoes?.includes('gestao.agricola.cultivar');
      if (hasAccess) { setAuthStatus('authorized'); }
      else { setAuthStatus('unauthorized'); }
    } else { router.push('/login'); }
  }, [status, session, router]);


  // --- LÓGICA DE DADOS (CRUD) ---

  const fetchVariedades = useCallback(async () => {
    setLoading(true);
    let data: any[] = [];
    try {
      const response = await fetch("/api/gestao-agricola/cultura/consulta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });

      if (response.status === 204) {
          data = [];
      } else if (!response.ok) {
          throw new Error(`Falha na API: ${response.statusText}`);
      } else {
          data = await response.json();
          if (!Array.isArray(data)) {
            console.warn("Resposta da API não é um array, tratando como vazio.");
            data = [];
          }
      }
    } catch (error) {
      console.error("Erro ao buscar variedades:", error);
      message.error(`Não foi possível carregar as variedades: ${error instanceof Error ? error.message : String(error)}`);
      data = [];
    } finally {
      const statusMap: Record<string, 'Aberto' | 'Inativo'> = { 'A': 'Aberto' };

      // Mapeamento corrigido para os campos da API
      const processedData: Variedade[] = data.map((item) => ({
        id: item.id,
        key: `var-${item.id}`,
        nome: item.nome_comercial || 'Sem Nome', // 'nome' é usado pela lista
        cultura: item.cultura || 'Não Informada',
        obtentor: item.obtentor || 'N/A',
        ciclo_maturacao_dias: item.ciclo_maturacao_dias || 0,
        // CORREÇÃO: Garante que o status seja um dos literais válidos
        status: statusMap[item.status] || 'Inativo',
        status_original: item.status as 'A' | 'I',
        // Passa os dados brutos para o 'initialData' do modal
        nome_comercial: item.nome_comercial,
      }));

      setVariedades(processedData);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authStatus === 'authorized') {
      fetchVariedades();
    }
  }, [authStatus, fetchVariedades]);

  // --- HANDLERS DOS MODAIS (CRUD) ---

  const handleOpenCrudModal = (mode: 'add' | 'edit' | 'delete', item?: Variedade) => {
    setModalMode(mode);
    setCurrentItem(item || null);
    setIsCrudModalOpen(true);
  };

  const handleCloseCrudModal = (shouldRefetch = false) => {
    setIsCrudModalOpen(false);
    setCurrentItem(null);
    if (shouldRefetch) {
      fetchVariedades();
    }
  };
  
  const handleOpenDetalheModal = (item: Variedade) => {
    setCurrentItem(item);
    setIsDetalheModalOpen(true);
  };
  const handleCloseDetalheModal = () => {
    setIsDetalheModalOpen(false);
    setCurrentItem(null);
  };

  // ==================================================================
  // ===               📌 ALTERAÇÃO REALIZADA AQUI                ===
  // ==================================================================
  // 'data' agora vem do formulário com os nomes corretos da API
  const handleSaveVariedade = async (data: any) => {
    setIsSaving(true);
    let endpoint = modalMode === 'add' ? '/api/gestao-agricola/cultura/inclui' : '/api/gestao-agricola/cultura/altera';
    let successMsg = modalMode === 'add' ? 'Variedade incluída com sucesso!' : 'Variedade alterada com sucesso!';
    let errorMsg = modalMode === 'add' ? 'Erro ao incluir variedade.' : 'Erro ao alterar variedade.';

    // Mapeia os dados do formulário (que agora são os nomes da API)
    const registro: any = {
      id_variedade: modalMode === 'edit' ? data.id : undefined,
      nome_comercial: data.nome_comercial, // Campo corrigido
      id_cultura: data.id_cultura,
      obtentor: data.obtentor, // Campo novo
      ciclo_maturacao_dias: data.ciclo_maturacao_dias, // Campo novo
      status: data.status === 'Aberto' ? 'A' : 'I',
    };
    // ==================================================================
    // ===                       FIM DA ALTERAÇÃO                     ===
    // ==================================================================

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ registro }),
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || errorData.details?.message || response.statusText);
        }
        setNotification({ visible: true, type: 'success', message: successMsg });
        handleCloseCrudModal(true);
    } catch (error: any) {
        setNotification({ visible: true, type: 'error', message: `${errorMsg} Detalhes: ${error.message}` });
    } finally {
        setIsSaving(false);
    }
  };

  const handleDeleteVariedade = async (id: number) => {
    setIsSaving(true);
    let errorMsg = 'Erro ao excluir variedade.';
    try {
        const response = await fetch('/api/gestao-agricola/cultura/exclui', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id }),
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || errorData.details?.message || response.statusText);
        }
        setNotification({ visible: true, type: 'success', message: 'Variedade excluída com sucesso!' });
        handleCloseCrudModal(true);
    } catch (error: any) {
        setNotification({ visible: true, type: 'error', message: `${errorMsg} Detalhes: ${error.message}` });
    } finally {
        setIsSaving(false);
    }
  };

  // --- LÓGICA DE FILTRAGEM, ORDENAÇÃO E PAGINAÇÃO ---
  const variedadesFiltradas = useMemo(() => {
    let filtrados = variedades;
    if (filtroStatus !== 'Todos') {
      filtrados = filtrados.filter(p => p.status === filtroStatus);
    }
    if (buscaDebounced) {
      const termo = buscaDebounced.toLowerCase();
      filtrados = filtrados.filter(p =>
        String(p.id).includes(termo) ||
        p.nome.toLowerCase().includes(termo) ||
        p.cultura.toLowerCase().includes(termo) ||
        p.obtentor.toLowerCase().includes(termo)
      );
    }
    return filtrados;
  }, [variedades, filtroStatus, buscaDebounced]);

  const variedadesOrdenadas = useMemo(() => {
    const sortedVariedades = [...variedadesFiltradas];
    if (sortConfig.key) {
      sortedVariedades.sort((a, b) => {
        const aValue = a[sortConfig.key!];
        const bValue = b[sortConfig.key!];
        let comparison = 0;
        if (aValue === null || aValue === undefined) comparison = -1;
        else if (bValue === null || bValue === undefined) comparison = 1;
        else if (typeof aValue === 'string' && typeof bValue === 'string') {
          comparison = aValue.localeCompare(bValue);
        } else if (typeof aValue === 'number' && typeof bValue === 'number') {
          comparison = aValue - bValue;
        }
        return sortConfig.direction === 'asc' ? comparison : comparison * -1;
      });
    }
    return sortedVariedades;
  }, [variedadesFiltradas, sortConfig]);

  const variedadesPaginadas = useMemo(() => {
    const inicio = (paginaAtual - 1) * pageSize;
    const fim = inicio + pageSize;
    return variedadesOrdenadas.slice(inicio, fim);
  }, [variedadesOrdenadas, paginaAtual, pageSize]);


  // --- Renderização da Tabela ---
  const requestSort = (key: keyof Variedade) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };
  
  const SortIcon = ({ columnKey }: { columnKey: keyof Variedade }) => {
    if (sortConfig.key !== columnKey) {
      return <ChevronsUpDown size={14} style={{ marginLeft: '4px', color: '#ffffff80' }} />;
    }
    if (sortConfig.direction === 'asc') {
      return <ArrowUp size={14} style={{ marginLeft: '4px' }} />;
    }
    return <ArrowDown size={14} style={{ marginLeft: '4px' }} />;
  };
  
  // Colunas da tabela (Corrigidas para API real)
  const tableColumns: { title: string; key: keyof Variedade; icon: React.ReactNode }[] = useMemo(() => [
    { title: 'ID', key: 'id', icon: <Hash size={16} style={{marginRight: '8px'}} /> },
    { title: 'Nome da Variedade', key: 'nome', icon: <Leaf size={16} style={{marginRight: '8px'}}/> },
    { title: 'Cultura', key: 'cultura', icon: <Leaf size={16} style={{marginRight: '8px'}} /> },
    { title: 'Obtentor', key: 'obtentor', icon: <Award size={16} style={{marginRight: '8px'}} /> },
    { title: 'Ciclo (dias)', key: 'ciclo_maturacao_dias', icon: <CalendarClock size={16} style={{marginRight: '8px'}} /> },
    { title: 'Status', key: 'status', icon: <BadgeCheck size={16} style={{marginRight: '8px'}} /> },
  ], []);

  // --- Renderização Principal (UI) ---

  if (authStatus === 'loading' || theme === null) {
    return (
        <div className="main-container" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: "2rem", minHeight: "100vh"
        }}>
            <LoadingSpinner text="Carregando autenticação e tema..." />
        </div>
    );
  }

  if (authStatus === 'unauthorized') {
    return (
        <div className="main-container" style={{ padding: "2rem", minHeight: "100vh" }}>
            <AcessoNegado />
        </div>
    );
  }


  return (
    <div className="main-container" style={{ padding: "2rem", minHeight: "100vh" }}>
      
      {/* --- ESTILOS (COPIADO DO page.tsx DE PIVÔS) --- */}
      <style>{`
        /* ... (Todo o CSS do gabarito 'Pivô' colado aqui) ... */
        :root {
            --gcs-blue: #00314A; --gcs-green: #5FB246; --gcs-orange: #F58220;
            --gcs-orange-light: #FDBA74; --gcs-gray-light: #f8f9fa; --gcs-gray-medium: #e9ecef;
            --gcs-gray-dark: #6c757d; --gcs-border-color: #dee2e6; --gcs-gray-soft: #adb5bd;
            --gcs-red: #d9534f; --gcs-red-light: #ff6f61;
            --gcs-blue-sky: #7DD3FC;
            --gcs-pagination-blue: #3B82F6; 
            --gcs-dark-text-primary: #F1F5F9;
            --gcs-dark-text-secondary: #CBD5E1;
            --gcs-dark-border: rgba(125, 173, 222, 0.2);
            --gcs-dark-border-hover: rgba(125, 173, 222, 0.4);
            --gcs-blue-light: #1b4c89;
            --gcs-green-dark: #28a745;
            --gcs-brand-red: #d9534f;
            --gcs-dark-text: #333;
            --gcs-dark-bg-transparent: rgba(25, 39, 53, 0.5);
            --gcs-dark-bg-heavy: rgba(25, 39, 53, 0.85);
            --gcs-dark-text-tertiary: #94A3B8;
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .btn { cursor: pointer; font-weight: 600; display: inline-flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s ease-in-out; border: 1px solid transparent; padding: 10px 20px; border-radius: 8px; }
        .btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .btn:disabled { cursor: not-allowed; opacity: 0.6; }
        .status-badge { padding: 4px 10px; border-radius: 16px; color: #fff; font-weight: 500; font-size: 12px; display: inline-block; text-align: center; min-width: 80px; }
        body.light { background-color: #E9ECEF !important; transition: background 0.3s ease; }
        body.light .main-container { background-color: #E9ECEF; }
        body.light .btn-green { background-color: var(--gcs-green); color: white; }
        body.light .btn-green:hover:not(:disabled) { background-color: #4a9d3a; }
        body.light .btn-outline-gray { background-color: #fff; color: var(--gcs-gray-dark); border-color: var(--gcs-border-color); }
        body.light .btn-outline-gray:hover:not(:disabled) { border-color: var(--gcs-gray-dark); background-color: var(--gcs-gray-light); }
        body.light .btn-outline-blue { background-color: #fff; color: var(--gcs-blue); border-color: var(--gcs-border-color); }
        body.light .btn-outline-blue:hover:not(:disabled) { border-color: var(--gcs-blue); background-color: #f1f5fb; }
        body.light .kpi-card, body.light .chart-card, body.light .main-content-card, body.light .content-card, body.light .responsive-table-wrapper, body.light .tabs-card {
            background-color: #fff; border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
            border: 1px solid var(--gcs-border-color);
        }
        body.light .kpi-card, body.light .chart-card, body.light .main-content-card, body.light .content-card { padding: 1.5rem; }
        body.light .loading-text { color: var(--gcs-blue); }
        body.light .auth-spinner { border: 4px solid var(--gcs-gray-medium); border-top: 4px solid var(--gcs-blue); }
        body.light h4.kpi-title { color: #4A5568 !important; }
        body.light p.kpi-value-green { color: #2F855A !important; }
        body.light p.kpi-value-red { color: var(--gcs-red) !important; }
        body.light p.kpi-value-blue { color: var(--gcs-blue) !important; }
        body.light .theme-toggle-btn { color: var(--gcs-gray-dark); border-color: var(--gcs-border-color); background: #fff; }
        body.light .theme-toggle-btn .ant-spin-dot-item { background-color: var(--gcs-blue); }
        .th-sortable { cursor: pointer; transition: color 0.2s ease-in-out; user-select: none; display: flex; align-items: center; }
        .th-sortable:hover { color: #ffffffd0; }
        body.light .responsive-table-wrapper { padding: 0; }
        body.light .responsive-table { width: 100%; border-collapse: collapse; font-size: 14px; }
        body.light .responsive-table thead { background-color: var(--gcs-blue); color: #fff; text-align: left; }
        body.light .responsive-table th { padding: 16px 12px; }
        body.light .responsive-table th:first-child { border-top-left-radius: 12px; }
        body.light .responsive-table th:last-child { border-top-right-radius: 12px; }
        body.light .responsive-table tbody tr { border-top: 1px solid var(--gcs-border-color); }
        body.light .responsive-table tbody tr:nth-of-type(odd) { background-color: #ffffff; }
        body.light .responsive-table tbody tr:nth-of-type(even) { background-color: var(--gcs-gray-light); }
        body.light .responsive-table .data-row:hover { background-color: var(--gcs-gray-medium) !important; }
        body.light .responsive-table td { padding: 14px 12px; vertical-align: middle; color: #333; }
        body.dark { background-image: url('/img_fundo_glass.png') !important; background-size: cover !important; background-position: center center !important; background-attachment: fixed !important; }
        body.dark .main-container { background-color: transparent !important; }
        body.dark .kpi-card, body.dark .chart-card, body.dark .main-content-card, body.dark .content-card, body.dark .responsive-table-wrapper, body.dark .tabs-card {
          background: rgba(25, 39, 53, 0.25) !important; backdrop-filter: blur(16px) !important;
          border: 1px solid rgba(125, 173, 222, 0.2) !important; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1) !important;
        }
        body.dark .kpi-card, body.dark .chart-card, body.dark .main-content-card, body.dark .content-card { padding: 1.5rem; }
        body.dark .page-title, body.dark .page-title svg { color: #F1F5F9 !important; }
        body.light .card-title-h3 { color: var(--gcs-blue); }
        body.dark .card-title-h3 { color: #F1F5F9 !important; }
        body.dark h4.kpi-title { color: #E2E8F0 !important; }
        body.dark p.kpi-value-green { color: #A7F3D0 !important; }
        body.dark p.kpi-value-red { color: #F87171 !important; }
        body.dark p.kpi-value-blue { color: #BFDBFE !important; }
        body.dark .loading-text { color: #93C5FD; }
        body.dark .auth-spinner { border: 4px solid rgba(125, 173, 222, 0.2); border-top: 4px solid #BFDBFE; }
        body.dark .btn-green { background-color: var(--gcs-green); color: white; }
        body.dark .btn-green:hover:not(:disabled) { background-color: #4a9d3a; }
        body.dark .btn-outline-gray, body.dark .btn-outline-blue {
          background-color: rgba(25, 39, 53, 0.5) !important; color: #E2E8F0 !important;
          border-color: rgba(125, 173, 222, 0.3) !important;
        }
        body.dark .search-input { background-color: rgba(25, 39, 53, 0.5) !important; color: #E2E8F0 !important; border-color: rgba(125, 173, 222, 0.3) !important; }
        body.dark .search-input::placeholder { color: #94A3B8; }
        .theme-toggle-btn { background: none; border: 1px solid transparent; border-radius: 8px; padding: 9px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s ease; min-width: 42px; min-height: 42px; }
        body.dark .theme-toggle-btn { background-color: rgba(25, 39, 53, 0.5) !important; color: #E2E8F0 !important; border-color: rgba(125, 173, 222, 0.3) !important; }
        body.dark .theme-toggle-btn .ant-spin-dot-item { background-color: #BFDBFE; }
        body.dark .responsive-table-wrapper { padding: 0; }
        body.dark .responsive-table { width: 100%; border-collapse: collapse; font-size: 14px; }
        body.dark .responsive-table thead { background-color: var(--gcs-blue); color: #fff; text-align: left; }
        body.dark .responsive-table th { padding: 16px 12px; }
        body.dark .responsive-table th:first-child { border-top-left-radius: 12px; }
        body.dark .responsive-table th:last-child { border-top-right-radius: 12px; }
        body.dark .responsive-table tbody tr { border-top: 1px solid rgba(125, 173, 222, 0.2) !important; }
        body.dark .responsive-table tbody tr:nth-of-type(odd) { background-color: transparent !important; }
        body.dark .responsive-table tbody tr:nth-of-type(even) { background-color: rgba(25, 39, 53, 0.15) !important; }
        body.dark .responsive-table .data-row:hover { background-color: rgba(40, 60, 80, 0.3) !important; }
        body.dark .responsive-table td { padding: 14px 12px; vertical-align: middle; color: #CBD5E1; }
        body.dark .ant-dropdown-menu { background-color: rgba(25, 39, 53, 0.9) !important; backdrop-filter: blur(8px) !important; border: 1px solid rgba(125, 173, 222, 0.3) !important; }
        body.dark .ant-dropdown-menu-item { color: #E2E8F0 !important; }
        body.dark .ant-dropdown-menu-item-danger { color: #F87171 !important; }
        body.dark .ant-dropdown-menu-item:hover { background-color: rgba(40, 60, 80, 0.7) !important; }
        body.dark .ant-pagination-total-text { color: #CBD5E1 !important; }
        body.dark .ant-pagination-item a, body.dark .ant-pagination-item-link { color: #CBD5E1 !important; }
        body.dark .ant-pagination-item { background-color: transparent !important; border-color: rgba(125, 173, 222, 0.3) !important; }
        body.dark .ant-pagination-item-active { background-color: var(--gcs-pagination-blue) !important; border-color: var(--gcs-pagination-blue) !important; }
        body.dark .ant-pagination-item-active a { color: white !important; }
        body.dark .ant-pagination-disabled .ant-pagination-item-link { color: #475569 !important; }
        body.light .recharts-legend-item-text { color: #333 !important; }
        body.dark .recharts-legend-item-text { color: #E2E8F0 !important; }
        .tabs-card { display: flex; gap: 8px; margin-bottom: 1.5rem; padding: 8px; border-radius: 12px; }
        .seg-item { padding: 8px 16px; font-size: 14px; font-weight: 600; border-radius: 8px; border: 1px solid; cursor: pointer; transition: all 0.2s ease-in-out; background: none; }
        body.light .tabs-card { background-color: #fff; border: 1px solid var(--gcs-border-color); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08); }
        body.light .seg-item { color: var(--gcs-gray-dark); background: #fff; border-color: var(--gcs-border-color); }
        body.light .seg-item:hover:not([aria-pressed="true"]) { background-color: var(--gcs-gray-light); border-color: var(--gcs-gray-dark); }
        body.light .seg-item[aria-pressed="true"] {
            background-color: var(--gcs-blue);
            color: white;
            border-color: var(--gcs-blue);
            box-shadow: 0 4px 12px rgba(0, 49, 74, 0.2);
        }
        body.dark .seg-item { color: var(--gcs-dark-text-secondary); background: rgba(25, 39, 53, 0.15); border-color: var(--gcs-dark-border); }
        body.dark .seg-item:hover:not([aria-pressed="true"]) { background: rgba(25, 39, 53, 0.7); border-color: var(--gcs-dark-border-hover); color: var(--gcs-dark-text-primary); }
        body.dark .seg-item[aria-pressed="true"] {
            background-color: var(--gcs-pagination-blue); color: white;
            border-color: var(--gcs-pagination-blue);
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
        }
        .empty-table-message { text-align: center; margin-top: 4rem; font-size: 1.1rem; }
        body.light .empty-table-message { color: var(--gcs-gray-dark); }
        body.dark .empty-table-message { color: var(--gcs-dark-text-secondary); }
      `}</style>
      
      {/* --- CABEÇALHO --- */}
      <div className="header-wrapper" style={{ display: 'flex', alignItems: 'stretch', gap: '1.5rem', marginBottom: '1.5rem' }}>
        
        <div className="main-content-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '1.5rem', paddingTop: '0.5rem', paddingBottom: '0.5rem' }}>
            <h2 className="page-title" style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <ShoppingCart size={32} /> <span>Cadastro de Variedades</span>
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <Input
                    type="text"
                    placeholder="Buscar por ID, Nome, Cultura ou Obtentor..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    className="search-input"
                    style={{ padding: "12px 16px", fontSize: "1rem", borderRadius: "8px", border: "1px solid var(--gcs-border-color)", width: "350px" }}
                />
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={fetchVariedades} title="Atualizar Lista" className="btn btn-outline-gray" style={{padding: '9px'}}><RefreshCcw size={20} /></button>
                    <button onClick={() => message.info('Exportação em desenvolvimento.')} title="Exportar para Excel" className="btn btn-outline-blue" style={{padding: '9px'}}><FileDown size={20} /></button>
                    <button
                      onClick={() => handleThemeChange(theme === 'light' ? 'dark' : 'light')}
                      className="theme-toggle-btn"
                      title={theme === 'light' ? 'Mudar para tema escuro' : 'Mudar para tema claro'}
                      disabled={isSavingTheme}
                    >
                      {isSavingTheme ? <Spin indicator={<LoadingOutlined style={{ fontSize: 20, color: 'currentColor' }} spin />} /> : (theme === 'light' ? <Moon size={20} /> : <Sun size={20} />)}
                    </button>
                </div>
            </div>
        </div>

        {/* Card de KPIs */}
        <div className="kpi-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-around' }}>
            <div style={{ textAlign: 'center' }}>
                <h4 className="kpi-title" style={{ margin: 0, fontWeight: 500, fontSize: '1rem', marginBottom: '0.25rem' }}>Total Cadastrado</h4>
                <p className="kpi-value-blue" style={{ fontSize: '2.2rem', margin: 0, fontWeight: 'bold', lineHeight: 1.2 }}>
                    {variedades.length}
                </p>
            </div>
            <hr style={{ width: '80%', border: 'none', borderTop: '1px solid var(--gcs-border-color)', margin: '0.5rem 0' }} />
            <div style={{ textAlign: 'center' }}>
                <h4 className="kpi-title" style={{ margin: 0, fontWeight: 500, fontSize: '1rem', marginBottom: '0.25rem' }}>
                    Variedades Ativas
                </h4>
                <p className="kpi-value-green" style={{ fontSize: '2.2rem', margin: 0, fontWeight: 'bold', lineHeight: 1.2 }}>
                    {kpiDadosStatus.find(d => d.name === 'Abertos')?.value || 0}
                </p>
            </div>
             <hr style={{ width: '80%', border: 'none', borderTop: '1px solid var(--gcs-border-color)', margin: '0.5rem 0' }} />
            <div style={{ textAlign: 'center' }}>
                <h4 className="kpi-title" style={{ margin: 0, fontWeight: 500, fontSize: '1rem', marginBottom: '0.25rem' }}>
                    Variedades Inativas
                </h4>
                <p className="kpi-value-red" style={{ fontSize: '2.2rem', margin: 0, fontWeight: 'bold', lineHeight: 1.2 }}>
                    {kpiDadosStatus.find(d => d.name === 'Inativos')?.value || 0}
                </p>
            </div>
        </div>
      </div>

      {/* --- ABAS DE FILTRO --- */}
      <FiltroAbasStatus
          filtroAtual={filtroStatus}
          onChange={setFiltroStatus}
      />

      {/* --- TABELA DE DADOS --- */}
      <div className="content-card" style={{padding: '1.5rem'}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
          <h3 style={{margin: 0}} className="card-title-h3">Lista de Variedades</h3>
          <button onClick={() => handleOpenCrudModal('add')} title="Cadastrar Nova Variedade" className="btn btn-green">
            <Plus size={16} /> Cadastrar Variedade
          </button>
        </div>

        {/* --- Início da Tabela Customizada --- */}
        {loading ? (
            <LoadingSpinner text="Carregando variedades..." />
        ) : variedadesFiltradas.length === 0 ? (
            <div className="empty-table-message">
              {buscaDebounced
                ? "Nenhuma variedade encontrada para sua busca."
                : (filtroStatus !== 'Todos' ? `Nenhuma variedade com status '${filtroStatus}'.` : "Nenhuma variedade cadastrada.")
              }
            </div>
        ) : (
          <>
            <div className="responsive-table-wrapper" style={{ overflowX: "auto" }}>
              <table className="responsive-table">
                <thead>
                  <tr>
                    {/* Colunas da Tabela */}
                    {tableColumns.map((col) => (
                       <th key={col.key} style={{ padding: "16px 12px" }}>
                          <div onClick={() => requestSort(col.key)} className="th-sortable">
                            {col.icon} {col.title} <SortIcon columnKey={col.key} />
                          </div>
                        </th>
                    ))}
                    <th style={{ padding: "16px 12px" }}>
                      <div className="th-sortable" style={{justifyContent: 'center'}}>
                        <Settings2 size={16} style={{marginRight: '8px'}} /> Ações
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {/* Renderização dos 'td' corrigida para os campos da API */
                  variedadesPaginadas.map((item) => {
                    const menuItems: MenuProps['items'] = [
                      { key: 'view', icon: <Eye size={14} style={{ marginRight: 8 }} />, label: 'Ver Detalhes', onClick: () => handleOpenDetalheModal(item) },
                      { key: 'edit', icon: <Edit size={14} style={{ marginRight: 8 }} />, label: 'Alterar', onClick: () => handleOpenCrudModal('edit', item) },
                      { key: 'delete', icon: <Trash2 size={14} style={{ marginRight: 8 }} />, label: 'Excluir', danger: true, onClick: () => handleOpenCrudModal('delete', item) }
                    ];

                    return (
                      <tr key={item.key} className="data-row">
                        <td data-label="ID">{item.id}</td>
                        <td data-label="Nome">{item.nome}</td>
                        <td data-label="Cultura">{item.cultura}</td>
                        <td data-label="Obtentor">{item.obtentor}</td>
                        <td data-label="Ciclo (dias)" style={{textAlign: 'center'}}>{item.ciclo_maturacao_dias}</td>
                        <td data-label="Status" style={{textAlign: 'center'}}>
                          <span
                            className="status-badge"
                            style={{ backgroundColor: item.status === 'Aberto' ? 'var(--gcs-green)' : 'var(--gcs-red)' }}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td data-label="Ações" style={{textAlign: 'center'}}>
                           <Dropdown menu={{ items: menuItems }} trigger={['click']} placement="bottomRight">
                             <Button icon={<MoreVertical size={16} />} />
                           </Dropdown>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            {/* --- Paginação Customizada --- */}
            <div style={{ marginTop: "2rem", display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <Pagination
                current={paginaAtual}
                total={variedadesFiltradas.length}
                pageSize={pageSize}
                onChange={(page, newPageSize) => {
                  setPaginaAtual(page);
                  setPageSize(newPageSize);
                }}
                showSizeChanger={true}
                pageSizeOptions={[10, 20, 50]}
                showTotal={(total, range) => `${range[0]}-${range[1]} de ${total} itens`}
              />
            </div>
          </>
        )}
        {/* --- Fim da Tabela Customizada --- */}

      </div>
      
      {/* --- MODAIS (Componentes locais) --- */}
      
      <ModalVariedade
        visible={isCrudModalOpen}
        mode={modalMode}
        initialData={currentItem} // Passa o item da API
        onClose={() => handleCloseCrudModal(false)}
        onSave={handleSaveVariedade} // A função de salvar espera o 'id_cultura' do formulário
        onDelete={handleDeleteVariedade} // A função de deletar espera o 'id'
        isSaving={isSaving}
      />
      
      <ModalVariedadeDetalhes
        visible={isDetalheModalOpen}
        onClose={handleCloseDetalheModal}
        item={currentItem}
      />
      
      <NotificationModal
          visible={notification.visible}
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification({ ...notification, visible: false })}
      />

    </div>
  );
}