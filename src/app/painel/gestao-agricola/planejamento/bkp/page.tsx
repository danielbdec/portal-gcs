/*
 * =========================================================================
 * PÁGINA DE GESTÃO DE PLANEJAMENTO AGRÍCOLA (Mestre)
 * =========================================================================
 * - Layout baseado na Gestão de Pivôs (KPIs + Gráfico).
 * - Consome a API de 'gestao-planej-cabec-consulta'.
 * - Exibe a tabela de cabeçalho (plano_cultivo).
 * - ATUALIZAÇÃO:
 * - "Novo Planejamento": Abre ModalPlanejamentoDetalhe (modo 'add').
 * - "Alterar": Abre ModalPlanejamentoDetalhe (modo 'edit').
 * - "Excluir": Abre ModalPlanejamento (modo 'delete').
 * =========================================================================
 */
"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
// --- Imports de Pacotes (Reais) ---
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import React from "react";

// --- Imports de UI (Ant Design e Lucide) ---
import {
    Tooltip, Spin, Pagination, message, Empty, Table, Dropdown, Menu, Space, Button, Input,
    Modal as AntModal, Form, InputNumber, Select, Alert, Descriptions, Tag
} from "antd";
import type { MenuProps } from 'antd';
import * as XLSX from 'xlsx';
import {
    PieChart, Pie, Cell, Legend, ResponsiveContainer, Sector, Tooltip as RechartsTooltip
} from "recharts";
import {
    RefreshCcw, FileText, AlertTriangle, Search, Lock,
    Calendar, BadgeCheck, MessageSquare, User, Settings2, ChevronsUpDown,
    ArrowUp, ArrowDown, Filter, X, FileDown, TrendingUp, Send, ShoppingCart,
    CheckSquare, Square, Sun, Moon, Plus, MoreVertical, Edit, Trash2, Eye,
    Hash, FileBadge, CalendarDays, MapPin, Trees, AreaChart,
    Landmark, ClipboardList // Ícone para Planejamento
} from "lucide-react";
import { LoadingOutlined } from "@ant-design/icons";
import "antd/dist/reset.css";

// --- Imports dos Modais (Nomenclatura Corrigida) ---
import ModalPlanejamento from "./ModalPlanejamento";           // Modal Simples (AGORA SÓ DELETE)
import ModalPlanejamentoDetalhe from "./ModalPlanejamentoDetalhe"; // Modal Mestre-Detalhe (Add/Edit)
import NotificationModal from "./NotificationModal";           // Modal de Notificação


// --- INTERFACE DO CABEÇALHO (plano_cultivo) ---
interface PlanejamentoCabec {
  id: number;
  key: string; // Para a tabela
  safra: string;
  descricao: string;
  status: string; // "Aberto" ou "Inativo"
  status_original: 'A' | 'I'; // Status da API
  observacao: string | null;
  dt_inclusao: string;
  dt_alteracao: string | null;
  [key: string]: any;
}

// --- INTERFACE DOS ITENS (plano_cultivo_item) ---
interface PlanejamentoItem {
    id: number;
    id_plano_cultivo: number;
    id_pivo_talhao: number;
    id_cultivar_rot1: number | null;
    desc_cultivar_rot1: string | null;
    dt_plantio_rot1: string | null;
    id_cultivar_rot2: number | null;
    desc_cultivar_rot2: string | null;
    dt_plantio_rot2: string | null;
    id_cultivar_rot3: number | null;
    desc_cultivar_rot3: string | null;
    dt_plantio_rot3: string | null;
    status: 'A' | 'I';
    observacao: string | null;
    [key: string]: any;
}

// Interfaces para os Lookups
interface PivoTalhao {
    id: number;
    nome: string;
    [key: string]: any;
}
interface Variedade {
    id: number;
    nome_comercial: string; // Baseado no ModalVariedade.tsx
    [key: string]: any;
}


type StatusFiltro = 'Aberto' | 'Inativo' | 'Todos';


// --- HELPER DE DATA (Do seu exemplo de Pivô) ---
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

export default function GestaoPlanejamentoPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [authStatus, setAuthStatus] = useState<'loading' | 'authorized' | 'unauthorized'>('loading');
  
  // Estado principal
  const [planejamentos, setPlanejamentos] = useState<PlanejamentoCabec[]>([]);

  // --- Estados do Tema (Layout 1) ---
  const [theme, setTheme] = useState<'light' | 'dark' | null>(null);
  const hasFetchedTheme = useRef(false);
  const [isSavingTheme, setIsSavingTheme] = useState(false);

  // --- Estados da Página (Layout 2) ---
  const [busca, setBusca] = useState<string>("");
  const buscaDebounced = useDebouncedValue(busca, 400);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState(false); // Usado para salvar/excluir cabeçalho
  const [notification, setNotification] = useState({ visible: false, type: 'success' as 'success' | 'error', message: '' });

  // ==================================================================
  // ===           📌 ATUALIZAÇÃO DOS ESTADOS DOS MODAIS           ===
  // ==================================================================
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false); // Para ModalPlanejamento (Delete)
  const [isDetalheModalOpen, setIsDetalheModalOpen] = useState(false); // Para ModalPlanejamentoDetalhe (Add/Edit)
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add'); // 'delete' é tratado pelo isDeleteModalOpen
  const [currentItem, setCurrentItem] = useState<Partial<PlanejamentoCabec> | null>(null);
  // ==================================================================
  
  // --- Estados de Paginação e Ordenação (Layout 1) ---
  const [paginaAtual, setPaginaAtual] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [sortConfig, setSortConfig] = useState<{ key: keyof PlanejamentoCabec | null; direction: 'asc' | 'desc' }>({ key: 'id', direction: 'asc' });

  // --- Estado de Filtro de Status ---
  const [filtroStatus, setFiltroStatus] = useState<StatusFiltro>('Aberto');

  // --- Gráfico e KPIs ---
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // KPIs de Status (Total vs Abertos)
  const kpiDadosStatus = useMemo(() => {
    const abertos = planejamentos.filter(c => c.status === 'Aberto').length;
    return [
      { name: 'Abertos', value: abertos },
    ];
  }, [planejamentos]);

  // Gráfico: Planos por Safra
  const dadosGraficoSafra = useMemo(() => {
    const safraMap = new Map<string, number>();
    planejamentos.forEach(item => {
        const safra = (item.safra || 'N/A');
        safraMap.set(safra, (safraMap.get(safra) || 0) + 1); // Contagem de itens
    });

    return Array.from(safraMap.entries())
        .map(([name, value]) => ({
            name: name,
            value: value
        }))
        .sort((a, b) => b.value - a.value); // Ordena da maior para a menor
  }, [planejamentos]);

  // Total para cálculo do percentual do gráfico
  const totalPlanos = useMemo(() => {
      return dadosGraficoSafra.reduce((acc, entry) => acc + entry.value, 0);
  }, [dadosGraficoSafra]);

  // Cores (baseado no layout do Pivô)
  const coresSafraTexto: Record<string, string> = {
      "24/25": "#EAB308",
      "25/26": "#5FB246",
      "26/27": "#38BDF8",
      "N/A": "#888888",
  };
  const coresSafraDonut: Record<string, string> = {
      "24/25": "url(#gradAmarelo)",
      "25/26": "url(#gradVerde)",
      "26/27": "url(#gradAzulClaro)",
      "N/A": "url(#gradCinza)",
  };
  const DEFAULT_COR_GRAFICO = "url(#gradCinza)";


  // --- LÓGICA DE TEMA (Layout 1) ---
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


  // --- LÓGICA DE AUTENTICAÇÃO (Layout 2) ---
  useEffect(() => {
    if (status === 'loading') { setAuthStatus('loading'); return; }
    if (status === 'authenticated') {
      const user: any = session.user;
      const hasAccess = user?.is_admin === true || user?.funcoes?.includes('gestao.agricola.planejamento');
      if (hasAccess) { setAuthStatus('authorized'); }
      else { setAuthStatus('unauthorized'); }
    } else { router.push('/login'); }
  }, [status, session, router]);


  // --- LÓGICA DE DADOS (CRUD) ---

  const fetchPlanejamentos = useCallback(async () => {
    setLoading(true);
    let data: any[] = [];
    try {
      const response = await fetch("/api/gestao-agricola/planejamento/gestao-planej-cabec-consulta", {
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
      console.error("Erro ao buscar planejamentos:", error);
      message.error(`Não foi possível carregar os planejamentos: ${error instanceof Error ? error.message : String(error)}`);
      data = [];
    } finally {
      const statusMap: Record<string, string> = { 'A': 'Aberto' };
      setPlanejamentos(data.map((item, index) => ({
        ...item,
        key: item.id?.toString() ?? `key-${index}`,
        status: statusMap[item.status] || 'Inativo',
        status_original: item.status || 'I',
        safra: item.safra || 'N/A',
        descricao: item.descricao || 'N/A',
      })));
      setLoading(false);
    }
  }, []);

  // Busca inicial
  useEffect(() => {
    if (authStatus === 'authorized') {
      fetchPlanejamentos();
    }
  }, [authStatus, fetchPlanejamentos]);

  // --- Lógica de Ordenação e Filtro ---
  const planejamentosFiltrados = useMemo(() => {
    let dadosFiltrados = [...planejamentos];
    
    if (filtroStatus !== 'Todos') {
      dadosFiltrados = dadosFiltrados.filter(c => c.status === filtroStatus);
    }
    
    const termo = buscaDebounced.toLowerCase().trim();
    if (termo) {
        dadosFiltrados = dadosFiltrados.filter(c =>
            c.safra.toLowerCase().includes(termo) ||
            c.descricao.toLowerCase().includes(termo) ||
            c.id.toString().includes(termo)
        );
    }

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
  }, [planejamentos, buscaDebounced, sortConfig, filtroStatus]);

  // --- Lógica de Paginação ---
  const planejamentosPaginados = useMemo(() => {
      const inicio = (paginaAtual - 1) * pageSize;
      const fim = inicio + pageSize;
      return planejamentosFiltrados.slice(inicio, fim);
  }, [planejamentosFiltrados, paginaAtual, pageSize]);

  // Handler para Trocar Aba
  const handleFiltroStatusChange = (status: StatusFiltro) => {
    setFiltroStatus(status);
    setPaginaAtual(1);
  };

  // ==================================================================
  // ===           📌 NOVA LÓGICA DE ABERTURA DE MODAL             ===
  // ==================================================================
  
  // Handlers dos Modais
  const handleOpenModal = (mode: 'add' | 'edit' | 'delete', item?: PlanejamentoCabec) => {
    
    if (mode === 'add') {
        setCurrentItem(null); // Limpa o item
        setModalMode('add');
        setIsDetalheModalOpen(true); // Abre o Mestre-Detalhe (add)
        
    } else if (mode === 'edit') {
        setCurrentItem(item || null);
        setModalMode('edit');
        setIsDetalheModalOpen(true); // Abre o Mestre-Detalhe (edit)

    } else if (mode === 'delete') {
        setCurrentItem(item || null);
        setIsDeleteModalOpen(true); // Abre o modal simples (delete)
    }
  };

  const handleCloseDeleteModal = () => setIsDeleteModalOpen(false);
  const handleCloseDetalheModal = () => setIsDetalheModalOpen(false);
  
  /**
   * (NOVO) Salva o CABEÇALHO (modo 'add')
   * Chamado de dentro do ModalPlanejamentoDetalhe
   * Retorna o novo item com ID para o modal
   */
  const handleSaveHeader = async (data: any): Promise<PlanejamentoCabec | null> => {
    if (!session?.user?.email) {
      setNotification({ visible: true, type: 'error', message: 'Sessão expirada. Faça login novamente.' });
      return null;
    }
    setIsSaving(true);
    
    // TODO: Usar endpoint 'gestao-planej-cabec-inclui'
    
    try {
      // Simulação
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log("Simulando salvamento (Cabeçalho - Add):", data);
      
      const successMessage = 'Cabeçalho salvo com sucesso (simulação).';
      
      // Simula o retorno de um novo ID
      const newItemComId: PlanejamentoCabec = {
          ...data,
          id: data.id || Math.floor(Math.random() * 1000) + 10, // Simula um novo ID
          status: 'Aberto', // Padrão
          key: (data.id || Math.floor(Math.random() * 1000) + 10).toString()
      };

      setNotification({ visible: true, type: 'success', message: successMessage });
      
      // Atualiza a lista da página
      await fetchPlanejamentos();
      
      return newItemComId; // Retorna o item salvo para o modal
      
    } catch (error: any) {
      console.error(`Erro ao 'add' planejamento:`, error);
      setNotification({ visible: true, type: 'error', message: error.message || 'Não foi possível salvar o cabeçalho.' });
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * (MODIFICADO) Salva o CABEÇALHO (modo 'delete')
   * Chamado de dentro do ModalPlanejamento (agora só de delete)
   */
  const handleDeleteHeader = async (data: any) => {
    if (!session?.user?.email) {
      setNotification({ visible: true, type: 'error', message: 'Sessão expirada. Faça login novamente.' });
      return;
    }
    setIsSaving(true);
    
    // TODO: Usar endpoint 'gestao-planej-cabec-exclui'
    
    try {
      // Simulação
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log("Simulando exclusão (Cabeçalho - Delete):", data);
      
      setNotification({ visible: true, type: 'success', message: 'Plano excluído (simulação).' });
      handleCloseDeleteModal();
      
      // Atualiza a lista da página
      await fetchPlanejamentos();
      
    } catch (error: any) {
      console.error(`Erro ao 'delete' planejamento:`, error);
      setNotification({ visible: true, type: 'error', message: error.message || 'Não foi possível realizar a operação.' });
    } finally {
      setIsSaving(false);
    }
  };
  // ==================================================================
  
  // --- COMPONENTES DE ORDENAÇÃO (Layout 1) ---
  const requestSort = (key: keyof PlanejamentoCabec) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    setPaginaAtual(1);
  };

  const SortIcon = ({ columnKey }: { columnKey: keyof PlanejamentoCabec }) => {
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

  // Tooltip Customizado (Glassmorphism)
  const CustomTooltip = ({ active, payload }: any) => {
      if (active && payload && payload.length) {
          const value = payload[0].value;
          const name = payload[0].name;
          
          const percent = (totalPlanos > 0) 
              ? ((value / totalPlanos) * 100).toFixed(1) 
              : '0.0';

          const isDark = theme === 'dark';

          const glassStyle: React.CSSProperties = {
              borderRadius: '8px',
              padding: '10px 12px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              zIndex: 999,
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              background: isDark ? 'rgba(25, 39, 53, 0.85)' : 'rgba(255, 255, 255, 0.85)',
              border: isDark ? '1px solid var(--gcs-dark-border)' : '1px solid var(--gcs-border-color)',
              overflow: 'hidden',
          };
          
          const titleStyle: React.CSSProperties = {
              color: coresSafraTexto[name] || '#888888',
              fontSize: '14px',
              fontWeight: 'bold',
              margin: 0,
              lineHeight: 1.3,
          };
          
          const valueStyle: React.CSSProperties = {
              color: isDark ? 'var(--gcs-dark-text-primary)' : 'var(--gcs-dark-text)',
              fontSize: '13px',
              margin: '4px 0 0 0',
              lineHeight: 1.2,
          };
          
          const percentStyle: React.CSSProperties = {
              color: isDark ? 'var(--gcs-dark-text-secondary)' : 'var(--gcs-gray-dark)',
              fontSize: '12px',
              margin: '2px 0 0 0',
              lineHeight: 1.2,
          };

          return (
              <div style={glassStyle}>
                  <p style={titleStyle}>{name}</p>
                  <p style={valueStyle}>
                      {`${value} plano(s)`}
                  </p>
                  <p style={percentStyle}>
                      {`(${percent}%)`}
                  </p>
              </div>
          );
      }
      return null;
  };

  const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
    return (
      <g>
        <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius} startAngle={startAngle} endAngle={endAngle} fill={fill} />
        <Sector cx={cx} cy={cy} startAngle={startAngle} endAngle={endAngle} innerRadius={outerRadius + 4} outerRadius={outerRadius + 8} fill={fill} />
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
          <linearGradient id="gradAmarelo" x1="0" y1="0" x2="0" y2="1"> <stop offset="0%" stopColor="#FDE047" /> <stop offset="100%" stopColor="#EAB308" /> </linearGradient>
          <linearGradient id="gradAzulClaro" x1="0" y1="0" x2="0" y2="1"> <stop offset="0%" stopColor="#7DD3FC" /> <stop offset="100%" stopColor="#38BDF8" /> </linearGradient>
          <linearGradient id="gradCinza" x1="0" y1="0" x2="0" y2="1"> <stop offset="0%" stopColor="#B0B0B0" /> <stop offset="100%" stopColor="#888888" /> </linearGradient>
        </defs>
    </svg>

    {/* --- STYLES (Copiado da Gestão de Pivôs/Variedades) --- */}
    <style>{`
        /* --- Variáveis (Layout 1) --- */
        :root {
            --gcs-blue: #00314A; --gcs-green: #5FB246; --gcs-orange: #F58220;
            --gcs-orange-light: #FDBA74; --gcs-gray-light: #f8f9fa; --gcs-gray-medium: #e9ecef;
            --gcs-gray-dark: #6c757d; --gcs-border-color: #dee2e6; --gcs-gray-soft: #adb5bd;
            --gcs-red: #d9534f; --gcs-red-light: #ff6f61;
            --gcs-blue-sky: #7DD3FC;
            --gcs-pagination-blue: #3B82F6; /* Cor da Paginação */
            
            /* Variáveis Modo Escuro (para Abas e Tabela Vazia) */
            --gcs-dark-text-primary: #F1F5F9;
            --gcs-dark-text-secondary: #CBD5E1;
            --gcs-dark-border: rgba(125, 173, 222, 0.2);
            --gcs-dark-border-hover: rgba(125, 173, 222, 0.4);
            
            /* Cores dos Modais (baseado no ModalSafra_exemplo.tsx) */
            --gcs-blue-light: #1b4c89;
            --gcs-green-dark: #28a745;
            --gcs-brand-red: #d9534f;
            --gcs-dark-text: #333;
            --gcs-dark-bg-transparent: rgba(25, 39, 53, 0.5);
            --gcs-dark-bg-heavy: rgba(25, 39, 53, 0.85);
            --gcs-dark-text-tertiary: #94A3B8;
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
        
        /* --- Abas Dark --- */
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

        .empty-table-message {
            text-align: center;
            margin-top: 4rem;
            font-size: 1.1rem;
        }
        body.light .empty-table-message {
            color: var(--gcs-gray-dark);
        }
        body.dark .empty-table-message {
            color: var(--gcs-dark-text-secondary);
        }

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
            <h4 className="kpi-title" style={{ margin: 0, fontWeight: 500, fontSize: '1rem' }}>Planos por Safra</h4>
            <div style={{ width: 280, height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <RechartsTooltip 
                            content={<CustomTooltip />} 
                            cursor={{ fill: 'transparent' }}
                        />
                        <Pie
                            data={dadosGraficoSafra} dataKey="value" nameKey="name"
                            cx="50%" cy="45%" innerRadius={50} outerRadius={80}
                            cornerRadius={8} paddingAngle={3}
                            activeIndex={activeIndex} 
                            activeShape={renderActiveShape}
                            onMouseEnter={(_, index) => setActiveIndex(index)}
                            onMouseLeave={() => setActiveIndex(null)}
                        >
                            {dadosGraficoSafra.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={coresSafraDonut[entry.name] || DEFAULT_COR_GRAFICO} />
                            ))}
                        </Pie>
                        <Legend
                          layout="horizontal"
                          align="center"
                          verticalAlign="bottom"
                          iconSize={10}
                          wrapperStyle={{ fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '270px' }}
                          formatter={renderLegendText}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>

        <div className="main-content-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '1.5rem', paddingTop: '0.5rem', paddingBottom: '0.5rem' }}>
            <h2 className="page-title" style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <ClipboardList size={32} /> <span>Planejamento Agrícola</span>
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <Input
                    type="text"
                    placeholder="Buscar por safra, descrição ou ID..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    className="search-input"
                    style={{ padding: "12px 16px", fontSize: "1rem", borderRadius: "8px", border: "1px solid var(--gcs-border-color)", width: "350px" }}
                />
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={fetchPlanejamentos} title="Atualizar Lista" className="btn btn-outline-gray" style={{padding: '9px'}}><RefreshCcw size={20} /></button>
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
                <h4 className="kpi-title" style={{ margin: 0, fontWeight: 500, fontSize: '1rem', marginBottom: '0.25rem' }}>Total de Planos</h4>
                <p className="kpi-value-green" style={{ fontSize: '2.2rem', margin: 0, color: 'var(--gcs-green)', fontWeight: 'bold', lineHeight: 1.2 }}>
                    {planejamentos.length}
                </p>
            </div>
            <hr style={{ width: '80%', border: 'none', borderTop: '1px solid var(--gcs-border-color)', margin: '0.5rem 0' }} />
            <div style={{ textAlign: 'center' }}>
                <h4 className="kpi-title" style={{ margin: 0, fontWeight: 500, fontSize: '1rem', marginBottom: '0.25rem' }}>
                    Planos Abertos
                </h4>
                <p className="kpi-value-orange" style={{ fontSize: '2.2rem', margin: 0, color: 'var(--gcs-orange)', fontWeight: 'bold', lineHeight: 1.2 }}>
                    {kpiDadosStatus.find(d => d.name === 'Abertos')?.value || 0}
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
          <h3 style={{margin: 0}} className="card-title-h3">Lista de Planos de Cultivo (Cabeçalho)</h3>
          
          <button onClick={() => handleOpenModal('add')} title="Cadastrar Novo Plano" className="btn btn-green">
            <Plus size={16} /> Novo Planejamento
          </button>
        </div>

        {/* --- Início da Tabela Customizada --- */}
        {loading ? (
            <LoadingSpinner text="Carregando planos de cultivo..." />
        ) : planejamentosFiltrados.length === 0 ? (
            <div className="empty-table-message">
              {buscaDebounced
                ? "Nenhum plano encontrado para sua busca."
                : (filtroStatus !== 'Todos' ? `Nenhum plano com status '${filtroStatus}'.` : "Nenhum plano cadastrado.")
              }
            </div>
        ) : (
          <>
            <div className="responsive-table-wrapper" style={{ overflowX: "auto" }}>
              <table className="responsive-table">
                <thead>
                  <tr>
                    <th style={{ padding: "16px 12px", textAlign: 'center' }}>
                      <div onClick={() => requestSort('status')} className="th-sortable" style={{justifyContent: 'center'}}>
                        <BadgeCheck size={16} style={{marginRight: '8px'}} /> Status <SortIcon columnKey="status" />
                      </div>
                    </th>
                    <th style={{ padding: "16px 12px" }}>
                      <div onClick={() => requestSort('id')} className="th-sortable">
                        <Hash size={16} style={{marginRight: '8px'}} /> ID <SortIcon columnKey="id" />
                      </div>
                    </th>
                    <th style={{ padding: "16px 12px" }}>
                      <div onClick={() => requestSort('safra')} className="th-sortable">
                        <Calendar size={16} style={{marginRight: '8px'}}/> Safra <SortIcon columnKey="safra" />
                      </div>
                    </th>
                    <th style={{ padding: "16px 12px", minWidth: '200px' }}>
                      <div onClick={() => requestSort('descricao')} className="th-sortable">
                        <FileText size={16} style={{marginRight: '8px'}} /> Descrição <SortIcon columnKey="descricao" />
                      </div>
                    </th>
                    <th style={{ padding: "16px 12px" }}>
                      <div onClick={() => requestSort('dt_inclusao')} className="th-sortable">
                        <CalendarDays size={16} style={{marginRight: '8px'}} /> Data Inclusão <SortIcon columnKey="dt_inclusao" />
                      </div>
                    </th>
                    <th style={{ padding: "16px 12px", textAlign: 'center' }}>
                      <div className="th-sortable" style={{justifyContent: 'center'}}>
                        <Settings2 size={16} style={{marginRight: '8px'}} /> Ações
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {planejamentosPaginados.map((item) => {
                    // ==================================================================
                    // ===            📌 ATUALIZAÇÃO DO MENU DE AÇÕES                ===
                    // ==================================================================
                    const menuItems: MenuProps['items'] = [
                      { key: 'edit', icon: <Edit size={14} style={{ marginRight: 8 }} />, label: 'Alterar Planejamento', onClick: () => handleOpenModal('edit', item) },
                      { key: 'delete', icon: <Trash2 size={14} style={{ marginRight: 8 }} />, label: 'Excluir Plano', danger: true, onClick: () => handleOpenModal('delete', item) }
                    ];
                    // ==================================================================

                    return (
                      <tr key={item.key} className="data-row">
                        <td data-label="Status" style={{ padding: '14px 12px', verticalAlign: 'middle', textAlign: 'center' }}>
                          <span
                            className="status-badge"
                            style={{
                              backgroundColor: item.status === 'Aberto'
                                ? 'var(--gcs-green)'
                                : 'var(--gcs-red, #d9534f)'
                            }}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td data-label="ID" style={{ padding: '14px 12px', verticalAlign: 'middle' }}>{item.id}</td>
                        <td data-label="Safra" style={{ padding: '14px 12px', verticalAlign: 'middle' }}>{item.safra}</td>
                        <td data-label="Descrição" style={{ padding: '14px 12px', verticalAlign: 'middle' }}>{item.descricao}</td>
                        <td data-label="Data Inclusão" style={{ padding: '14px 12px', verticalAlign: 'middle' }}>
                          {formatProtheusDateTime(item.dt_inclusao)}
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
                total={planejamentosFiltrados.length}
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
    </div>

    {/* --- MODAIS (Componentes locais) --- */}
    
    <ModalPlanejamento
        visible={isDeleteModalOpen}
        mode={'delete'} // Este modal agora só lida com 'delete'
        initialData={currentItem}
        onClose={handleCloseDeleteModal}
        onSave={handleDeleteHeader} // Função que orquestra add/delete
        isSaving={isSaving}
    />
    
    <ModalPlanejamentoDetalhe
        visible={isDetalheModalOpen}
        mode={modalMode} // 'add' ou 'edit'
        initialData={currentItem} // Passa o cabeçalho (ou null se 'add')
        onClose={handleCloseDetalheModal}
        onSaveHeader={handleSaveHeader} // (NOVO) Passa a função de salvar o cabeçalho
        isSavingGlobal={isSaving} // (Renomeado) Passa o isSaving da página
    />
    
    <NotificationModal
        visible={notification.visible}
        type={notification.type}
        message={notification.message}
        onClose={() => setNotification(v => ({...v, visible: false}))}
    />
  </>);
}