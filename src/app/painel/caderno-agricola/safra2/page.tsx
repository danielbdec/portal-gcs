/*
 * =========================================================================
 * PÁGINA DE CADERNO AGRÍCOLA (CRUD) - v16 (Correção Final de Imports)
 * =========================================================================
 * 1. REMOVIDO o 'const ModalCaderno' (placeholder) de dentro deste arquivo.
 * 2. ADICIONADO o 'import ModalCaderno from "./ModalCaderno";' real no topo.
 * =========================================================================
 */
"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Tooltip, Spin, Pagination, message, Empty, Table, Dropdown, Menu, Space, Button, Input } from "antd";
import type { MenuProps } from 'antd';
import * as XLSX from 'xlsx';
import {
    PieChart, Pie, Cell, Legend, ResponsiveContainer, Sector, Tooltip as RechartsTooltip
} from "recharts";
import {
    RefreshCcw, FileText, AlertTriangle, Search, Lock,
    Calendar, BadgeCheck, MessageSquare, User, Settings2, ChevronsUpDown,
    ArrowUp, ArrowDown, Filter, X, FileDown, TrendingUp, Send, ShoppingCart, Landmark,
    CheckSquare, Square, Sun, Moon, Plus, MoreVertical, Edit, Trash2, Eye,
    Hash, FileBadge, CalendarDays
} from "lucide-react";
import { LoadingOutlined } from "@ant-design/icons";
import React from "react";
import "antd/dist/reset.css";

// --- Imports dos Modais ---
import ModalSafra from "./ModalSafra"; 
import NotificationModal from "./NotificationModal";
import ModalCaderno from "./ModalCaderno"; // <<<--- CORREÇÃO APLICADA AQUI

// --- INTERFACE DO ITEM ---
interface Caderno {
  id: number;
  key: string; 
  nome: string; 
  safra: string; 
  versao: string; 
  status: string; // "Ativo" ou "Inativo"
  status_original: 'A' | 'I'; 
  dt_inclusao: string; 
  dt_atualizacao: string; 
  [key: string]: any; 
}
type StatusFiltro = 'Ativo' | 'Inativo' | 'Todos'; 


// --- HELPER DE DATA (Do seu exemplo) ---
const formatProtheusDateTime = (dateString: string | null | undefined): string => {
    if (!dateString) {
        return '—';
    }
    try {
        const dateTest = new Date(dateString);
        if (isNaN(dateTest.getTime())) {
            // Tenta formato YYYYMMDD
            if (dateString.length === 8) {
                const year = dateString.substring(0, 4);
                const month = dateString.substring(4, 6);
                const day = dateString.substring(6, 8);
                return `${day}/${month}/${year}`;
            }
            return '—';
        }

        // Padrão ISO '2025-10-01T10:00:00'
        const year = dateString.substring(0, 4);
        const month = dateString.substring(5, 7);
        const day = dateString.substring(8, 10);
        
        if(dateString.length >= 16) {
            const hour = dateString.substring(11, 13);
            const minute = dateString.substring(14, 16);
            return `${day}/${month}/${year} ${hour}:${minute}`;
        }
        
        // Retorna apenas data se não houver hora
        return `${day}/${month}/${year}`;

    } catch (error) {
        console.error("Erro ao formatar data Protheus:", error);
        return '—';
    }
};


// --- COMPONENTES AUXILIARES (DO LAYOUT 1) ---
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

// --- COMPONENTE DE ABAS DE FILTRO ---
const FiltroAbasStatus = ({ filtroAtual, onChange }: { 
  filtroAtual: StatusFiltro; 
  onChange: (status: StatusFiltro) => void; 
}) => {
  const abas: StatusFiltro[] = ['Ativo', 'Inativo', 'Todos'];
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

export default function CadernoAgricolaPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [authStatus, setAuthStatus] = useState<'loading' | 'authorized' | 'unauthorized'>('loading');
  const [cadernos, setCadernos] = useState<Caderno[]>([]);

  // --- Estados do Tema (Layout 1) ---
  const [theme, setTheme] = useState<'light' | 'dark' | null>(null);
  const hasFetchedTheme = useRef(false);
  const [isSavingTheme, setIsSavingTheme] = useState(false);

  // --- Estados da Página (Layout 2) ---
  const [busca, setBusca] = useState<string>("");
  const buscaDebounced = useDebouncedValue(busca, 400);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState({ visible: false, type: 'success' as 'success' | 'error', message: '' });

  // --- Estados dos Modais ---
  const [isCrudModalOpen, setIsCrudModalOpen] = useState(false); 
  const [isLancamentoModalOpen, setIsLancamentoModalOpen] = useState(false); 
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'delete'>('add');
  const [currentCaderno, setCurrentCaderno] = useState<Partial<Caderno> | null>(null);
  
  // --- Estados de Paginação e Ordenação (Layout 1) ---
  const [paginaAtual, setPaginaAtual] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Caderno | null; direction: 'asc' | 'desc' }>({ key: 'id', direction: 'asc' });

  // --- Estado de Filtro de Status ---
  const [filtroStatus, setFiltroStatus] = useState<StatusFiltro>('Ativo');

  // --- Gráfico e KPIs ---
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const dadosGraficoStatus = useMemo(() => {
    const ativos = cadernos.filter(c => c.status === 'Ativo').length;
    const inativos = cadernos.filter(c => c.status === 'Inativo').length;
    return [
      { name: 'Ativos', value: ativos },
      { name: 'Inativos', value: inativos },
    ].filter(d => d.value > 0);
  }, [cadernos]);
  const coresStatusDonut: Record<string, string> = { "Ativos": "url(#gradVerde)", "Inativos": "url(#gradLaranja)" };

  // --- LÓGICA DE TEMA (Layout 1) ---
  useEffect(() => {
    const fetchThemeData = async () => {
      if (!session?.user?.email) return;
      try {
        const res = await fetch("/api/portal/consulta-tema", { method: "POST" });
        const userData = await res.json(); 
        const apiTheme = (userData && userData.tema === 'E') ? 'dark' : 'light';
        setTheme(apiTheme);
      } catch (err) {
        setTheme('light');
      }
    };
    if (status === "authenticated" && session && !hasFetchedTheme.current) {
      hasFetchedTheme.current = true;
      fetchThemeData();
    }
  }, [status, session]); 

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
      await fetch('/api/portal/altera-tema', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tema: newTheme }),
      });
    } catch (error: any) {
      setTheme(oldTheme); 
    } finally {
      setIsSavingTheme(false);
    }
  };


  // --- LÓGICA DE AUTENTICAÇÃO (Layout 2) ---
  useEffect(() => {
    if (status === 'loading') { setAuthStatus('loading'); return; }
    if (status === 'authenticated') {
      const user: any = session.user; 
      const hasAccess = user?.is_admin === true || user?.funcoes?.includes('caderno.safra');
      if (hasAccess) { setAuthStatus('authorized'); } 
      else { setAuthStatus('unauthorized'); }
    } else { router.push('/login'); }
  }, [status, session, router]);


  // --- LÓGICA DE DADOS (CRUD) ---

  const fetchCadernos = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/caderno-agricola/caderno-agricola-consulta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });
      if (response.status === 204) {
          setCadernos([]);
          return;
      }
      if (!response.ok) {
        throw new Error("Falha ao buscar cadernos");
      }
      
      const data: any[] = await response.json();
      const statusMap: Record<string, string> = { 'A': 'Ativo', 'I': 'Inativo' };
      
      setCadernos(data.map((item, index) => ({
        ...item, // 'id', 'versao', 'descricao', 'codigo_safra', 'dt_inclusao', 'dt_atualizacao'
        key: item.id?.toString() ?? `key-${index}`,
        nome: item.descricao || 'N/A',
        safra: item.codigo_safra || 'N/A',
        status: statusMap[item.status] || item.status || 'Desconhecido', 
        status_original: item.status, 
        versao: item.versao || 'N/A', 
      })));
      
    } catch (error) {
      console.error("Erro ao buscar cadernos:", error);
      message.error("Não foi possível carregar os cadernos.");
      setCadernos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Busca inicial
  useEffect(() => {
    if (authStatus === 'authorized') {
      fetchCadernos();
    }
  }, [authStatus, fetchCadernos]);

  // --- Lógica de Ordenação e Filtro ---
  const cadernosFiltrados = useMemo(() => {
    let dadosFiltrados = [...cadernos];
    
    // 1. Filtrar por Status (Aba)
    if (filtroStatus !== 'Todos') {
      dadosFiltrados = dadosFiltrados.filter(c => c.status === filtroStatus);
    }
    
    // 2. Filtrar por busca (Input)
    const termo = buscaDebounced.toLowerCase().trim();
    if (termo) {
        dadosFiltrados = dadosFiltrados.filter(c => 
            c.nome.toLowerCase().includes(termo) ||
            c.safra.toLowerCase().includes(termo) ||
            c.id.toString().includes(termo) ||
            c.versao.toLowerCase().includes(termo) ||
            formatProtheusDateTime(c.dt_inclusao).includes(termo) || 
            formatProtheusDateTime(c.dt_atualizacao).includes(termo) 
        );
    }

    // 3. Ordenar
    if (sortConfig.key) {
        dadosFiltrados.sort((a, b) => {
            const aValue = a[sortConfig.key!];
            const bValue = b[sortConfig.key!];
            
            let compare = 0;
            if (typeof aValue === 'number' && typeof bValue === 'number') {
                compare = aValue - bValue;
            } else {
                compare = String(aValue).localeCompare(String(bValue));
            }
            
            return sortConfig.direction === 'asc' ? compare : -compare;
        });
    }
    
    return dadosFiltrados;
  }, [cadernos, buscaDebounced, sortConfig, filtroStatus]); 

  // --- Lógica de Paginação ---
  const cadernosPaginados = useMemo(() => {
      const inicio = (paginaAtual - 1) * pageSize;
      const fim = inicio + pageSize;
      return cadernosFiltrados.slice(inicio, fim);
  }, [cadernosFiltrados, paginaAtual, pageSize]);

  // Handler para Trocar Aba
  const handleFiltroStatusChange = (status: StatusFiltro) => {
    setFiltroStatus(status);
    setPaginaAtual(1); // Reseta a paginação
  };

  // Handlers dos Modais
  const handleOpenCrudModal = (mode: 'add' | 'edit' | 'delete', caderno?: Caderno) => {
    setModalMode(mode);
    setCurrentCaderno(caderno || null);
    setIsCrudModalOpen(true);
  };
  const handleCloseCrudModal = () => setIsCrudModalOpen(false);

  const handleOpenLancamentoModal = (caderno: Caderno) => {
    setCurrentCaderno(caderno);
    setIsLancamentoModalOpen(true);
  };
  const handleCloseLancamentoModal = () => setIsLancamentoModalOpen(false);
  
  // Handler de Salvar (para o ModalSafra)
  const handleSaveCaderno = async (data: any, mode: 'add' | 'edit' | 'delete') => {
    if (!session?.user?.email) {
      setNotification({ visible: true, type: 'error', message: 'Sessão expirada. Faça login novamente.' });
      return;
    }
    setIsSaving(true);
    let endpoint = '';
    let body: any = { email: session.user.email };
    let action = '';
    let successMessage = '';
    
    try {
      const now = new Date().toISOString();

      if (mode === 'add') {
        endpoint = '/api/caderno-agricola/caderno-agricola-inclui'; 
        body.registro = { ...data, dt_inclusao: now, dt_atualizacao: now }; 
        action = 'incluir';
        successMessage = 'Caderno cadastrado com sucesso!';
      } else if (mode === 'edit') {
        endpoint = '/api/caderno-agricola/caderno-agricola-altera';
        body.registro = { ...data, dt_atualizacao: now }; 
        action = 'alterar';
        successMessage = 'Caderno alterado com sucesso!';
      } else if (mode === 'delete') {
        endpoint = '/api/caderno-agricola/caderno-agricola-exclui';
        body.id = data.id; 
        action = 'excluir';
        successMessage = 'Caderno excluído com sucesso!';
      } else {
        throw new Error("Modo de operação inválido.");
      }
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      let result: any;
      try {
          result = await response.json();
      } catch (e) {
          const errorText = await response.text().catch(() => "Erro desconhecido no servidor.");
          throw new Error(`[HTTP ${response.status}] ${response.statusText || errorText}`);
      }
      
      const firstResult = Array.isArray(result) ? result[0] : result;
      
      if (!response.ok || firstResult?.status !== 'ok') {
        throw new Error(firstResult?.message || `Falha ao ${action} o caderno.`);
      }

      setNotification({ visible: true, type: 'success', message: successMessage });
      handleCloseCrudModal();
      fetchCadernos(); 
      
    } catch (error: any) {
      console.error(`Erro ao ${action} caderno:`, error);
      setNotification({ visible: true, type: 'error', message: error.message || 'Não foi possível realizar a operação.' });
    } finally {
      setIsSaving(false);
    }
  };
  
  // --- COMPONENTES DE ORDENAÇÃO (Layout 1) ---
  const requestSort = (key: keyof Caderno) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    setPaginaAtual(1); // Resetar para a primeira página ao ordenar
  };

  const SortIcon = ({ columnKey }: { columnKey: keyof Caderno }) => {
    if (sortConfig.key !== columnKey) {
      return <ChevronsUpDown size={14} style={{ marginLeft: '4px', color: '#ffffff80' }} />;
    }
    if (sortConfig.direction === 'asc') {
      return <ArrowUp size={14} style={{ marginLeft: '4px' }} />;
    }
    return <ArrowDown size={14} style={{ marginLeft: '4px' }} />;
  };

  // --- Função para formatar legenda ---
  const renderLegendText = (value: string) => {
    return <span style={{ marginLeft: '4px' }} className="recharts-legend-item-text">{value}</span>;
  };

  // --- Gráfico (Layout 1) ---
  const renderActiveShape = (props: any) => {
    const RADIAN = Math.PI / 180;
    const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
    const sin = Math.sin(-RADIAN * midAngle); const cos = Math.cos(-RADIAN * midAngle);
    const sx = cx + (outerRadius + 2) * cos; const sy = cy + (outerRadius + 2) * sin;
    const mx = cx + (outerRadius + 15) * cos; const my = cy + (outerRadius + 15) * sin;
    const ex = mx + (cos >= 0 ? 1 : -1) * 15; const ey = my;
    const textAnchor = cos >= 0 ? 'start' : 'end';
    const labelFillColor = theme === 'dark' ? '#F1F5F9' : '#333';
    const percentFillColor = theme === 'dark' ? '#94A3B8' : '#999';

    return (
      <g>
        <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius} startAngle={startAngle} endAngle={endAngle} fill={fill} />
        <Sector cx={cx} cy={cy} startAngle={startAngle} endAngle={endAngle} innerRadius={outerRadius + 4} outerRadius={outerRadius + 8} fill={fill} />
        <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
        <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
        <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={textAnchor} fill={labelFillColor} style={{ fontSize: '13px' }}>{`${payload.name}`}</text>
        <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} dy={18} textAnchor={textAnchor} fill={percentFillColor} style={{ fontSize: '12px' }}>{`(${value} - ${(percent * 100).toFixed(1)}%)`}</text>
      </g>
    );
  };
  
  // --- RENDERIZAÇÃO ---

  if (authStatus === 'loading' || !theme) {
    return (
        <div className="main-container" style={{ 
            display: 'flex', alignItems: 'center', justifyContent: 'center', 
            padding: "2rem", minHeight: "100vh", backgroundColor: "#E9ECEF" 
        }}>
            <Spin 
              indicator={<LoadingOutlined style={{ fontSize: 48, color: 'var(--gcs-blue)' }} spin />} 
              tip={<span style={{ color: 'var(--gcs-blue)', marginTop: '1rem', fontWeight: 'bold', fontSize: '1.1rem' }}>
                  Aguarde, verificando acesso...
                </span>}
            />
        </div>
    );
  }

  if (authStatus === 'unauthorized') {
    return (
        <div className="main-container" style={{ padding: "2rem", backgroundColor: "#E9ECEF", minHeight: "100vh" }}>
            <AcessoNegado />
        </div>
    );
  }

  return (<>
    {/* --- SVG DEFINITIONS (Layout 1) --- */}
    <svg width="0" height="0" style={{ position: 'absolute', zIndex: -1 }}>
        <defs>
          <linearGradient id="gradLaranja" x1="0" y1="0" x2="0" y2="1"> <stop offset="0%" stopColor="#f79b4d" /> <stop offset="100%" stopColor="#F58220" /> </linearGradient>
          <linearGradient id="gradVerde" x1="0" y1="0" x2="0" y2="1"> <stop offset="0%" stopColor="#9DDE5B" /> <stop offset="100%" stopColor="#5FB246" /> </linearGradient>
        </defs>
    </svg>

    {/* --- STYLES (Merge de Layout 1 e 2) --- */}
    <style>{`
        /* --- Variáveis (Layout 1) --- */
        :root {
            --gcs-blue: #00314A; --gcs-green: #5FB246; --gcs-orange: #F58220;
            --gcs-orange-light: #FDBA74; --gcs-gray-light: #f8f9fa; --gcs-gray-medium: #e9ecef;
            --gcs-gray-dark: #6c757d; --gcs-border-color: #dee2e6; --gcs-gray-soft: #adb5bd;
            --gcs-red: #d9534f; --gcs-red-light: #ff6f61;
            --gcs-blue-sky: #7DD3FC; 
            --gcs-pagination-blue: #3B82F6; /* Cor da Paginação */
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        
        /* --- Botões Base (Layout 1) --- */
        .btn { cursor: pointer; font-weight: 600; display: inline-flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s ease-in-out; border: 1px solid transparent; padding: 10px 20px; border-radius: 8px; }
        .btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .btn:disabled { cursor: not-allowed; opacity: 0.6; }

        .status-badge { padding: 4px 10px; border-radius: 16px; color: #fff; font-weight: 500; font-size: 12px; display: inline-block; text-align: center; min-width: 80px; }
        
        /* --- MODO CLARO (Layout 1) --- */
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
        body.light p.kpi-value-orange { color: #DD6B20 !important; }
        body.light .theme-toggle-btn { color: var(--gcs-gray-dark); border-color: var(--gcs-border-color); background: #fff; }
        body.light .theme-toggle-btn .ant-spin-dot-item { background-color: var(--gcs-blue); }
        
        /* --- Estilos da Tabela CUSTOMIZADA (Layout 1) --- */
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
        
        /* --- MODO ESCURO (Layout 1) --- */
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
        body.dark p.kpi-value-orange { color: #FCD34D !important; } 
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
        
        /* --- Estilos da Tabela CUSTOMIZADA (Layout 1) --- */
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

        /* --- CSS da Legenda do Gráfico --- */
        body.light .recharts-legend-item-text { color: #333 !important; }
        body.dark .recharts-legend-item-text { color: #E2E8F0 !important; }

        /* --- ESTILOS DAS ABAS --- */
        .tabs-card {
            display: flex;
            gap: 8px;
            margin-bottom: 1.5rem;
            padding: 8px;
            border-radius: 12px;
        }
        .seg-item {
            padding: 8px 16px;
            font-size: 14px;
            font-weight: 600;
            border-radius: 8px;
            border: 1px solid;
            cursor: pointer;
            transition: all 0.2s ease-in-out;
            background: none;
        }
        /* Abas Light */
        body.light .tabs-card { background-color: #fff; border: 1px solid var(--gcs-border-color); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08); }
        body.light .seg-item { color: var(--gcs-gray-dark); background: #fff; border-color: var(--gcs-border-color); }
        body.light .seg-item:hover:not([aria-pressed="true"]) { background-color: var(--gcs-gray-light); border-color: var(--gcs-gray-dark); }
        body.light .seg-item[aria-pressed="true"] {
            background-color: var(--gcs-blue);
            color: white;
            border-color: var(--gcs-blue);
            box-shadow: 0 4px 12px rgba(0, 49, 74, 0.2);
        }
        
        /* --- *** CORREÇÃO: Abas Dark *** --- */
        body.dark .seg-item {
            color: var(--gcs-dark-text-secondary);
            background: rgba(25, 39, 53, 0.15);
            border-color: var(--gcs-dark-border);
        }
        body.dark .seg-item:hover:not([aria-pressed="true"]) {
            background: rgba(25, 39, 53, 0.7);
            border-color: var(--gcs-dark-border-hover);
            color: var(--gcs-dark-text-primary);
        }
        body.dark .seg-item[aria-pressed="true"] {
            background-color: var(--gcs-pagination-blue); /* Azul forte */
            color: white; /* Texto Branco */
            border-color: var(--gcs-pagination-blue);
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
        }
        /* --- *** FIM DA CORREÇÃO *** --- */

        /* --- Responsividade (Layout 1) --- */
        @media (max-width: 1200px) { .header-wrapper { flex-direction: column; align-items: center; gap: 1.5rem; } .main-content-card, .kpi-card { width: 100%; } }
        @media (max-width: 768px) { 
            body.light .kpi-card, body.light .chart-card, body.light .main-content-card, body.dark .kpi-card, body.dark .chart-card, body.dark .main-content-card { padding: 1rem; }
            body.light .responsive-table-wrapper, body.dark .responsive-table-wrapper { padding: 1rem; border-radius: 12px; }
            .responsive-table thead { display: none; }
            .responsive-table tbody, .responsive-table tr, .responsive-table td { display: block; width: 100%; }
            .responsive-table tr { margin-bottom: 1rem; border-radius: 8px; padding: 0.5rem 1rem; }
            body.light .responsive-table tr { border: 1px solid var(--gcs-border-color); }
            body.dark .responsive-table tr { border: 1px solid rgba(125, 173, 222, 0.2) !important; }
            .responsive-table td { display: flex; justify-content: space-between; align-items: center; padding: 0.8rem 0; }
            body.light .responsive-table td { border-bottom: 1px solid var(--gcs-gray-medium); }
            body.dark .responsive-table td { border-bottom: 1px solid rgba(125, 173, 222, 0.1) !important; }
            .responsive-table tr td:last-child { border-bottom: none; }
            .responsive-table td::before { content: attr(data-label); font-weight: bold; margin-right: 1rem; }
            body.light .responsive-table td::before { color: var(--gcs-blue); }
            body.dark .responsive-table td::before { color: #93C5FD; }
        }
    `}</style>

    <div className="main-container" style={{ padding: "2rem", minHeight: "100vh" }}>

      {/* --- CABEÇALHO (Layout 1) --- */}
      <div className="header-wrapper" style={{ display: 'flex', alignItems: 'stretch', gap: '1.5rem', marginBottom: '1.5rem' }}>
        
        <div className="chart-card" style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', minWidth: '280px', paddingTop: '1rem', paddingBottom: '1rem' }}>
            <h4 className="kpi-title" style={{ margin: 0, fontWeight: 500, fontSize: '1rem' }}>Cadernos por Status</h4>
            <div style={{ width: 280, height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={dadosGraficoStatus} dataKey="value" nameKey="name"
                            cx="50%" cy="45%" innerRadius={50} outerRadius={80}
                            cornerRadius={8} paddingAngle={3}
                            activeIndex={activeIndex} activeShape={renderActiveShape}
                            onMouseEnter={(_, index) => setActiveIndex(index)}
                            onMouseLeave={() => setActiveIndex(null)}
                        >
                            {dadosGraficoStatus.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={coresStatusDonut[entry.name] || '#ccc'} />
                            ))}
                        </Pie>
                        <Legend 
                          layout="horizontal" 
                          align="center" 
                          verticalAlign="bottom" 
                          iconSize={10} 
                          wrapperStyle={{ fontSize: '12px' }}
                          formatter={renderLegendText}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>

        <div className="main-content-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '1.5rem', paddingTop: '0.5rem', paddingBottom: '0.5rem' }}>
            <h2 className="page-title" style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <FileText size={32} /> <span>Caderno Agrícola</span>
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <Input
                    type="text"
                    placeholder="Buscar por nome, safra, ID, versão ou data..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    className="search-input"
                    style={{ padding: "12px 16px", fontSize: "1rem", borderRadius: "8px", border: "1px solid var(--gcs-border-color)", width: "350px" }}
                />
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={fetchCadernos} title="Atualizar Lista" className="btn btn-outline-gray" style={{padding: '9px'}}><RefreshCcw size={20} /></button>
                    {/* <FilterPopover ... /> */}
                    <button onClick={() => {}} title="Exportar para Excel" className="btn btn-outline-blue" style={{padding: '9px'}}><FileDown size={20} /></button>
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

        <div className="kpi-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-around' }}>
            <div style={{ textAlign: 'center' }}>
                <h4 className="kpi-title" style={{ margin: 0, fontWeight: 500, fontSize: '1rem', marginBottom: '0.25rem' }}>Total Cadernos</h4>
                <p className="kpi-value-green" style={{ fontSize: '2.2rem', margin: 0, color: 'var(--gcs-green)', fontWeight: 'bold', lineHeight: 1.2 }}>
                    {cadernos.length}
                </p>
            </div>
            <hr style={{ width: '80%', border: 'none', borderTop: '1px solid var(--gcs-border-color)', margin: '0.5rem 0' }} />
            <div style={{ textAlign: 'center' }}>
                <h4 className="kpi-title" style={{ margin: 0, fontWeight: 500, fontSize: '1rem', marginBottom: '0.25rem' }}>
                  Cadernos Ativos
                </h4>
                <p className="kpi-value-orange" style={{ fontSize: '2.2rem', margin: 0, color: 'var(--gcs-orange)', fontWeight: 'bold', lineHeight: 1.2 }}>
                    {dadosGraficoStatus.find(d => d.name === 'Ativos')?.value || 0}
                </p>
            </div>
        </div>
      </div>

      {/* --- ABAS DE FILTRO ADICIONADAS --- */}
      <FiltroAbasStatus 
          filtroAtual={filtroStatus}
          onChange={handleFiltroStatusChange}
      />

      {/* --- TABELA DE DADOS (Layout 1) --- */}
      <div className="content-card" style={{padding: '1.5rem'}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
          <h3 style={{margin: 0}} className="card-title-h3">Lista de Cadernos</h3>
          <button onClick={() => handleOpenCrudModal('add')} title="Cadastrar Novo Caderno" className="btn btn-green">
              <Plus size={16} /> Cadastrar Novo Caderno
          </button>
        </div>

        {/* --- Início da Tabela Customizada --- */}
        {loading ? (
           <LoadingSpinner text="Carregando cadernos..." />
        ) : cadernosFiltrados.length === 0 ? (
            <div style={{ textAlign: "center", color: "var(--gcs-gray-dark)", marginTop: "4rem", fontSize: '1.1rem' }}>
              {buscaDebounced 
                ? "Nenhum caderno encontrado para sua busca." 
                : (filtroStatus !== 'Todos' ? `Nenhum caderno com status '${filtroStatus}'.` : "Nenhum caderno cadastrado.")
              }
            </div>
        ) : (
          <>
            <div className="responsive-table-wrapper" style={{ overflowX: "auto" }}>
              <table className="responsive-table">
                <thead>
                  <tr>
                    {/* --- COLUNA 1: STATUS --- */}
                    <th style={{ padding: "16px 12px", textAlign: 'center' }}>
                      <div onClick={() => requestSort('status')} className="th-sortable" style={{justifyContent: 'center'}}>
                        <BadgeCheck size={16} style={{marginRight: '8px'}} /> Status <SortIcon columnKey="status" />
                      </div>
                    </th>
                    {/* --- COLUNA 2: ID --- */}
                    <th style={{ padding: "16px 12px" }}>
                      <div onClick={() => requestSort('id')} className="th-sortable">
                        <Hash size={16} style={{marginRight: '8px'}} /> ID <SortIcon columnKey="id" />
                      </div>
                    </th>
                    {/* --- COLUNA 3: NOME --- */}
                    <th style={{ padding: "16px 12px" }}>
                      <div onClick={() => requestSort('nome')} className="th-sortable">
                        <FileText size={16} style={{marginRight: '8px'}}/> Nome do Caderno <SortIcon columnKey="nome" />
                      </div>
                    </th>
                    {/* --- COLUNA 4: SAFRA --- */}
                    <th style={{ padding: "16px 12px" }}>
                      <div onClick={() => requestSort('safra')} className="th-sortable">
                        <Calendar size={16} style={{marginRight: '8px'}} /> Safra <SortIcon columnKey="safra" />
                      </div>
                    </th>
                    {/* --- COLUNA 5: VERSÃO --- */}
                    <th style={{ padding: "16px 12px", textAlign: 'center' }}>
                      <div onClick={() => requestSort('versao')} className="th-sortable" style={{justifyContent: 'center'}}>
                        <FileBadge size={16} style={{marginRight: '8px'}} /> Versão <SortIcon columnKey="versao" />
                      </div>
                    </th>
                    {/* --- COLUNA 6: INCLUSÃO (NOVO) --- */}
                    <th style={{ padding: "16px 12px", textAlign: 'center' }}>
                      <div onClick={() => requestSort('dt_inclusao')} className="th-sortable" style={{justifyContent: 'center'}}>
                        <CalendarDays size={16} style={{marginRight: '8px'}} /> Inclusão <SortIcon columnKey="dt_inclusao" />
                      </div>
                    </th>
                    {/* --- COLUNA 7: ATUALIZAÇÃO (NOVO) --- */}
                    <th style={{ padding: "16px 12px", textAlign: 'center' }}>
                      <div onClick={() => requestSort('dt_atualizacao')} className="th-sortable" style={{justifyContent: 'center'}}>
                        <CalendarDays size={16} style={{marginRight: '8px'}} /> Atualização <SortIcon columnKey="dt_atualizacao" />
                      </div>
                    </th>
                    {/* --- COLUNA 8: AÇÕES --- */}
                    <th style={{ padding: "16px 12px", textAlign: 'center' }}>
                      <div className="th-sortable" style={{justifyContent: 'center'}}>
                        <Settings2 size={16} style={{marginRight: '8px'}} /> Ações
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {cadernosPaginados.map((caderno) => {
                    const menuItems: MenuProps['items'] = [
                      { key: 'view', icon: <Eye size={14} style={{ marginRight: 8 }} />, label: 'Ver Detalhes', onClick: () => handleOpenLancamentoModal(caderno) },
                      // --- *** ALTERADO AQUI *** ---
                      { key: 'copy', icon: <Plus size={14} style={{ marginRight: 8 }} />, label: 'Copiar', onClick: () => { console.log("Ação 'Copiar' para:", caderno) } },
                      { key: 'edit', icon: <Edit size={14} style={{ marginRight: 8 }} />, label: 'Alterar', onClick: () => handleOpenCrudModal('edit', caderno) },
                      { key: 'delete', icon: <Trash2 size={14} style={{ marginRight: 8 }} />, label: 'Excluir', danger: true, onClick: () => handleOpenCrudModal('delete', caderno) }
                    ];

                    return (
                      <tr key={caderno.key} className="data-row">
                        <td data-label="Status" style={{ padding: '14px 12px', verticalAlign: 'middle', textAlign: 'center' }}>
                          <span
                            className="status-badge"
                            style={{ 
                              backgroundColor: caderno.status === 'Ativo' 
                                ? 'var(--gcs-green)' 
                                : 'var(--gcs-red, #d9534f)' 
                            }}
                          >
                            {caderno.status}
                          </span>
                        </td>
                        <td data-label="ID" style={{ padding: '14px 12px', verticalAlign: 'middle' }}>{caderno.id}</td>
                        <td data-label="Nome do Caderno" style={{ padding: '14px 12px', verticalAlign: 'middle' }}>{caderno.nome}</td>
                        <td data-label="Safra" style={{ padding: '14px 12px', verticalAlign: 'middle' }}>{caderno.safra}</td>
                        <td data-label="Versão" style={{ padding: '14px 12px', verticalAlign: 'middle', textAlign: 'center' }}>
                          {caderno.versao}
                        </td>
                        <td data-label="Inclusão" style={{ padding: '14px 12px', verticalAlign: 'middle', textAlign: 'center' }}>
                          {formatProtheusDateTime(caderno.dt_inclusao)}
                        </td>
                        <td data-label="Atualização" style={{ padding: '14px 12px', verticalAlign: 'middle', textAlign: 'center' }}>
                          {formatProtheusDateTime(caderno.dt_atualizacao)}
                        </td>
                        <td data-label="Ações" style={{ padding: '14px 12px', verticalAlign: 'middle', textAlign: 'center' }}>
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
                total={cadernosFiltrados.length}
                pageSize={pageSize}
                onChange={(page, newPageSize) => {
                  setPaginaAtual(page);
                  setPageSize(newPageSize);
                }}
                showSizeChanger={true}
                pageSizeOptions={[10, 20, 50]}
                showTotal={(total, range) => `${range[0]}-${range[1]} de ${total} cadernos`}
              />
            </div>
          </>
        )}
        {/* --- Fim da Tabela Customizada --- */}

      </div>
    </div>

    {/* --- MODAIS --- */}
    
    <ModalSafra 
      visible={isCrudModalOpen}
      mode={modalMode}
      initialData={currentCaderno}
      onClose={handleCloseCrudModal}
      onSave={handleSaveCaderno}
      isSaving={isSaving}
    />

    <ModalCaderno 
      visible={isLancamentoModalOpen}
      onClose={handleCloseLancamentoModal}
      caderno={currentCaderno}
    />

    <NotificationModal
        visible={notification.visible}
        type={notification.type}
        message={notification.message}
        onClose={() => setNotification(v => ({...v, visible: false}))}
    />
  </>);
}