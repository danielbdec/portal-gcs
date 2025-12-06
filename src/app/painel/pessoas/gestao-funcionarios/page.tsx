"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
// --- Imports de Pacotes (Mockados no 'lib/auth') ---
import { useSession } from "next-auth/react"; // Mockado no 'lib/auth'
import { useRouter } from "next/navigation"; // Mockado no 'lib/auth'
import React from "react";

// --- Imports de UI (Ant Design e Lucide) ---
import {
    Tooltip, Spin, Pagination, message, Empty, Table, Dropdown, Menu, Space, Button, Input,
    Modal as AntModal, Form, InputNumber, Select, Alert, Descriptions, Tag
} from "antd";
import type { MenuProps } from 'antd';
import * as XLSX from 'xlsx'; // <--- RESTAURADO PARA O EXCEL
import {
    PieChart, Pie, Cell, Legend, ResponsiveContainer, Sector, Tooltip as RechartsTooltip
} from "recharts";
import {
    RefreshCcw, FileText, AlertTriangle, Search, Lock,
    Sun, Moon, Plus, MoreVertical, Edit, Trash2, Eye,
    Hash, FileBadge, CalendarDays, MapPin, Trees, AreaChart,
    Landmark, Settings, BarChart3, Briefcase, FileDown, // <<< --- ÍCONE RESTAURADO
} from "lucide-react";
import { LoadingOutlined } from "@ant-design/icons";
import "antd/dist/reset.css"; // Necessário para o AntD

// --- Imports dos Modais ---
import ModalFuncionario from "./ModalFuncionario"; // O NOVO MODAL DE GESTÃO
import NotificationModal from "./NotificationModal"; // Modal reutilizável


// --- INTERFACE DO ITEM ---
interface Funcionario {
  id: string; // Usando Matricula + Filial como ID único
  key: string;
  Filial: string;
  "Grupo Filial": string;
  Matricula: string;
  Nome: string;
  "Data admissao": string;
  "Cod.Função": string;
  Função: string;
  "Cod.Centro de Custo": string;
  "Centro de Custo": string;
  "Cod.Departamento": string;
  Departamento: string;
  Grupo: string;
  Registro: string;
  [key: string]: any;
}

type GrupoFilialFiltro = string;


// --- HELPER DE DATA (Do seu exemplo) ---
// (Pode ser ajustado para o formato '14/06/2014' se necessário, mas por enquanto não é usado)
const formatProtheusDateTime = (dateString: string | null | undefined): string => {
    if (!dateString) {
        return '—';
    }
    // Formato DD/MM/YYYY já vem pronto
    if (dateString.length === 10 && dateString[2] === '/') {
      return dateString;
    }
    
    // ... (lógica anterior de YYYYMMDD ou ISO, caso a API mude) ...
    
    return dateString; // Retorna o que veio se não reconhecer
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
const FiltroAbasStatus = ({ filtroAtual, onChange, dados }: {
  filtroAtual: GrupoFilialFiltro;
  onChange: (status: GrupoFilialFiltro) => void;
  dados: string[]; // Array de strings (Grupos Filiais)
}) => {
  const abas = ['Todos', ...dados]; // Adiciona "Todos" no início
  return (
    <div className="tabs-container" style={{display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
      {abas.map((aba) => (
        <button
          key={aba}
          className="seg-item" // Estilo vem do CSS global
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

export default function GestaoPessoalPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [authStatus, setAuthStatus] = useState<'loading' | 'authorized' | 'unauthorized'>('loading');
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);

  // --- Estados do Tema (Layout 1) ---
  const [theme, setTheme] = useState<'light' | 'dark'>('light'); // Default light
  const [isSavingTheme, setIsSavingTheme] = useState(false);

  // --- Estados da Página (Layout 2) ---
  const [busca, setBusca] = useState<string>("");
  const buscaDebounced = useDebouncedValue(busca, 400);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState({ visible: false, type: 'success' as 'success' | 'error', message: '' });

  // --- Estados dos Modais ---
  const [isModalAberto, setIsModalAberto] = useState(false);
  const [currentItem, setCurrentItem] = useState<Funcionario | null>(null);
  
  // --- Estados de Paginação e Ordenação (Layout 1) ---
  const [paginaAtual, setPaginaAtual] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Funcionario | null; direction: 'asc' | 'desc' }>({ key: 'Nome', direction: 'asc' });

  // --- Estado de Filtro de Status ---
  const [filtroStatus, setFiltroStatus] = useState<GrupoFilialFiltro>('Todos'); // Padrão "Todos"

  // --- LÓGICA DE TEMA (Layout 1) ---
  useEffect(() => {
    const storedTheme = localStorage.getItem('theme') as 'light' | 'dark';
    if (storedTheme) {
        setTheme(storedTheme);
    } else {
        // Se não há tema salvo, usa o do sistema
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setTheme(prefersDark ? 'dark' : 'light');
    }
  }, []);

  useEffect(() => {
    document.body.classList.remove('light', 'dark');
    document.body.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const handleThemeChange = async (newTheme: 'light' | 'dark') => {
    if (!session?.user?.email || isSavingTheme || newTheme === theme) return;
    setIsSavingTheme(true);
    setTheme(newTheme);
    try {
      // Simulação: API de salvar tema
      console.log(`[MockAPI] Tema salvo como: ${newTheme}`);
      await new Promise(res => setTimeout(res, 300));
    } catch (error: any) {
      // Reverte se a API falhar (não implementado no mock)
    } finally {
      setIsSavingTheme(false);
    }
  };


  // --- LÓGICA DE AUTENTICAÇÃO (Layout 2) ---
  useEffect(() => {
    if (status === 'loading') { setAuthStatus('loading'); return; }
    if (status === 'authenticated') {
      const user: any = session.user;
      // --- *** ATUALIZAÇÃO 1: Permissão corrigida *** ---
      const hasAccess = user?.is_admin === true || user?.funcoes?.includes('gestao.funcionario');
      if (hasAccess) { setAuthStatus('authorized'); }
      else { setAuthStatus('unauthorized'); }
    } else { 
        // Em um app real, faria router.push('/login'), mas usamos o mock:
        console.warn("Sessão não autenticada, mas continuando com mock.");
        setAuthStatus('authorized'); // Força autorização para mocks
    }
  }, [status, session, router]);


  // --- LÓGICA DE DADOS (CRUD) ---

  const fetchFuncionarios = useCallback(async () => {
    setLoading(true);
    let data: any[] = [];
    try {
      // --- *** ENDPOINT CORRETO *** ---
      // ATENÇÃO: O endpoint do n8n é 'pessoal-funcionario-consulta'
      const response = await fetch("/api/pessoal/funcionario/consulta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });

      if (response.status === 204) { data = []; } // Resposta vazia, mas OK
      else if (!response.ok) { throw new Error(`Falha na API: ${response.statusText}`); }
      else {
          data = await response.json();
          if (!Array.isArray(data)) { data = []; }
      }
    } catch (error) {
      console.error("Erro ao buscar funcionários:", error);
      message.error(`Não foi possível carregar os funcionários: ${error instanceof Error ? error.message : String(error)}`);
      data = [];
    } finally {
      setFuncionarios(data.map((item, index) => ({
        ...item,
        key: `${item.Matricula}-${item.Filial}` || `key-${index}`,
        id: `${item.Matricula}-${item.Filial}` || `key-${index}`,
      })));
      setLoading(false);
    }
  }, []);

  // Busca inicial
  useEffect(() => {
    if (authStatus === 'authorized') {
      fetchFuncionarios();
    }
  }, [authStatus, fetchFuncionarios]);

  // --- ATUALIZAÇÃO 3: Extrai os grupos filiais únicos para as abas ---
  const abasGrupoFilial = useMemo(() => {
    const grupos = new Set<string>();
    funcionarios.forEach(f => {
      if (f["Grupo Filial"]) {
        grupos.add(f["Grupo Filial"]);
      }
    });
    return Array.from(grupos).sort(); // Ordena alfabeticamente
  }, [funcionarios]);


  // --- Lógica de Ordenação e Filtro ---
  const funcionariosFiltrados = useMemo(() => {
    let dadosFiltrados = [...funcionarios];
    
    // 1. Filtrar por Grupo Filial (Aba)
    if (filtroStatus !== 'Todos') {
      dadosFiltrados = dadosFiltrados.filter(f => f["Grupo Filial"] === filtroStatus);
    }
    
    // 2. Filtrar por busca (Input)
    const termo = buscaDebounced.toLowerCase().trim();
    if (termo) {
        dadosFiltrados = dadosFiltrados.filter(c =>
            c.Nome.toLowerCase().includes(termo) ||
            c.Matricula.toLowerCase().includes(termo) ||
            c.Filial.toLowerCase().includes(termo) ||
            c.Função.toLowerCase().includes(termo) ||
            c["Centro de Custo"].toLowerCase().includes(termo)
        );
    }

    // 3. Ordenar
    if (sortConfig.key) {
        dadosFiltrados.sort((a, b) => {
            const aValue = a[sortConfig.key!];
            const bValue = b[sortConfig.key!];
            
            let compare = 0;
            if (typeof aValue === 'number' && typeof bValue === 'number') { compare = aValue - bValue; }
            else { compare = String(aValue).localeCompare(String(bValue)); }
            
            return sortConfig.direction === 'asc' ? compare : -compare;
        });
    }
    
    return dadosFiltrados;
  }, [funcionarios, buscaDebounced, sortConfig, filtroStatus]);

  // --- Lógica de Paginação ---
  const funcionariosPaginados = useMemo(() => {
      const inicio = (paginaAtual - 1) * pageSize;
      const fim = inicio + pageSize;
      return funcionariosFiltrados.slice(inicio, fim);
  }, [funcionariosFiltrados, paginaAtual, pageSize]);

  // Handler para Trocar Aba
  const handleFiltroStatusChange = (status: GrupoFilialFiltro) => {
    setFiltroStatus(status);
    setPaginaAtual(1); // Reseta a paginação
  };

  // Handlers dos Modais
  const handleOpenModal = (item: Funcionario) => {
    setCurrentItem(item);
    setIsModalAberto(true);
  };
  const handleCloseModal = () => setIsModalAberto(false);
  
  // --- COMPONENTES DE ORDENAÇÃO (Layout 1) ---
  const requestSort = (key: keyof Funcionario) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    setPaginaAtual(1); // Resetar para a primeira página ao ordenar
  };

  const SortIcon = ({ columnKey }: { columnKey: keyof Funcionario }) => {
    if (sortConfig.key !== columnKey) {
      return <Briefcase size={14} style={{ marginLeft: '4px', color: '#ffffff80', opacity: 0.5 }} />;
    }
    if (sortConfig.direction === 'asc') {
      return <Briefcase size={14} style={{ marginLeft: '4px' }} />;
    }
    return <Briefcase size={14} style={{ marginLeft: '4px' }} />;
  };

  // --- Função para formatar legenda ---
  const renderLegendText = (value: string) => {
    return <span style={{ marginLeft: '4px' }} className="recharts-legend-item-text">{value}</span>;
  };

  // --- Gráfico e KPIs (ATUALIZAÇÃO 2) ---
  // CORREÇÃO: Inicializando como undefined para satisfazer o Recharts
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);

  // KPIs dinâmicos (baseados nos dados filtrados)
  const kpiData = useMemo(() => {
    const total = funcionariosFiltrados.length;
    const grupos = new Set(funcionariosFiltrados.map(f => f["Grupo Filial"])).size;
    return { total, grupos };
  }, [funcionariosFiltrados]);

  // Donut dinâmico (baseado nos dados filtrados)
  const dadosGraficoCentroCusto = useMemo(() => {
    const ccMap = new Map<string, number>();
    funcionariosFiltrados.forEach(item => {
        const cc = (item["Centro de Custo"] || 'N/A').toUpperCase(); 
        ccMap.set(cc, (ccMap.get(cc) || 0) + 1); // Conta +1 funcionário
    });

    return Array.from(ccMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value); // Ordena do maior para o menor
  }, [funcionariosFiltrados]);

  // Total para o Tooltip
  const totalFuncionariosGrafico = useMemo(() => {
      return dadosGraficoCentroCusto.reduce((acc, entry) => acc + entry.value, 0);
  }, [dadosGraficoCentroCusto]);

  // Cores (Podemos mapear ou usar as padrão)
  const CORES_GRAFICO = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#AF19FF", "#FF1953"];

  // Tooltip Customizado
  const CustomTooltip = ({ active, payload }: any) => {
      if (active && payload && payload.length) {
          const value = payload[0].value;
          const name = payload[0].name;
          const percent = (totalFuncionariosGrafico > 0) 
              ? ((value / totalFuncionariosGrafico) * 100).toFixed(1) 
              : '0.0';
          const isDark = theme === 'dark';
          // ... (Estilos do Tooltip, copiados do projeto anterior) ...
          const glassStyle: React.CSSProperties = {
              borderRadius: '8px', padding: '10px 12px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 999,
              backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
              background: isDark ? 'rgba(25, 39, 53, 0.85)' : 'rgba(255, 255, 255, 0.85)',
              border: isDark ? '1px solid var(--gcs-dark-border)' : '1px solid var(--gcs-border-color)',
              overflow: 'hidden',
          };
          const titleStyle: React.CSSProperties = {
              color: payload[0].fill, // Cor da fatia
              fontSize: '14px', fontWeight: 'bold', margin: 0, lineHeight: 1.3,
          };
          const valueStyle: React.CSSProperties = {
              color: isDark ? 'var(--gcs-dark-text-primary)' : 'var(--gcs-dark-text)',
              fontSize: '13px', margin: '4px 0 0 0', lineHeight: 1.2,
          };
          const percentStyle: React.CSSProperties = {
              color: isDark ? 'var(--gcs-dark-text-secondary)' : 'var(--gcs-gray-dark)',
              fontSize: '12px', margin: '2px 0 0 0', lineHeight: 1.2,
          };

          return (
              <div style={glassStyle}>
                  <p style={titleStyle}>{name}</p>
                  <p style={valueStyle}>{`${value} ${value > 1 ? 'funcionários' : 'funcionário'}`}</p>
                  <p style={percentStyle}>{`(${percent}%)`}</p>
              </div>
          );
      }
      return null;
  };

  // Shape do Donut
  const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
    return (
      <g>
        <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius} startAngle={startAngle} endAngle={endAngle} fill={fill} />
        <Sector cx={cx} cy={cy} startAngle={startAngle} endAngle={endAngle} innerRadius={outerRadius + 4} outerRadius={outerRadius + 8} fill={fill} />
      </g>
    );
  };
  
  // --- FUNÇÃO DE EXPORTAR EXCEL (RESTAURADA) ---
  const handleExportExcel = () => {
      if (loading || funcionariosFiltrados.length === 0) {
          message.warning("Não há dados para exportar ou os dados ainda estão carregando.");
          return;
      }

      try {
          // 1. Mapear os dados para o formato da planilha (somente os filtrados)
          const dadosParaPlanilha = funcionariosFiltrados.map(f => ({
              "Grupo Filial": f["Grupo Filial"],
              "Matrícula": f.Matricula,
              "Nome": f.Nome,
              "Função": f.Função,
              "Centro de Custo": f["Centro de Custo"],
              "Departamento": f.Departamento,
              "Data Admissão": f["Data admissao"],
              "Grupo": f.Grupo,
              "Filial": f.Filial,
          }));

          // 2. Criar a planilha
          const ws = XLSX.utils.json_to_sheet(dadosParaPlanilha);
          
          // 3. Ajustar largura das colunas (opcional, mas bom)
          ws['!cols'] = [
              { wch: 15 }, // Grupo Filial
              { wch: 12 }, // Matrícula
              { wch: 40 }, // Nome
              { wch: 35 }, // Função
              { wch: 35 }, // Centro de Custo
              { wch: 30 }, // Departamento
              { wch: 15 }, // Data Admissão
              { wch: 15 }, // Grupo
              { wch: 10 }, // Filial
          ];

          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, "Funcionários");

          // 4. Baixar o arquivo
          XLSX.writeFile(wb, "Relatorio_Funcionarios.xlsx");
          
          message.success("Relatório exportado com sucesso!");

      } catch (error) {
          console.error("Erro ao exportar Excel:", error);
          message.error("Ocorreu um erro ao exportar o relatório.");
      }
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
          {/* (Gradientes não são mais usados pelo Donut, mas mantidos caso sejam necessários) */}
          <linearGradient id="gradLaranja" x1="0" y1="0" x2="0" y2="1"> <stop offset="0%" stopColor="#f79b4d" /> <stop offset="100%" stopColor="#F58220" /> </linearGradient>
          <linearGradient id="gradVerde" x1="0" y1="0" x2="0" y2="1"> <stop offset="0%" stopColor="#9DDE5B" /> <stop offset="100%" stopColor="#5FB246" /> </linearGradient>
          <linearGradient id="gradAmarelo" x1="0" y1="0" x2="0" y2="1"> <stop offset="0%" stopColor="#FDE047" /> <stop offset="100%" stopColor="#EAB308" /> </linearGradient>
          <linearGradient id="gradAzulClaro" x1="0" y1="0" x2="0" y2="1"> <stop offset="0%" stopColor="#7DD3FC" /> <stop offset="100%" stopColor="#38BDF8" /> </linearGradient>
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
        /* ATUALIZAÇÃO 4: Padding do tabs-card */
        body.light .tabs-card { padding: 1rem 1.5rem; }

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
        /* ATUALIZAÇÃO 4: Padding do tabs-card */
        body.dark .tabs-card { padding: 1rem 1.5rem; }
        
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
        /* ATUALIZAÇÃO 4: tabs-card agora é o container de vidro */
        .tabs-card {
            display: flex;
            gap: 8px;
            margin-bottom: 1.5rem;
            /* padding: 8px; (movido para light/dark) */
            border-radius: 12px;
            align-items: center; /* Centraliza o label com os botões */
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
        /* (tabs-card já estilizado acima) */
        body.light .seg-item { color: var(--gcs-gray-dark); background: #fff; border-color: var(--gcs-border-color); }
        body.light .seg-item:hover:not([aria-pressed="true"]) { background-color: var(--gcs-gray-light); border-color: var(--gcs-gray-dark); }
        body.light .seg-item[aria-pressed="true"] {
            background-color: var(--gcs-blue);
            color: white;
            border-color: var(--gcs-blue);
            box-shadow: 0 4px 12px rgba(0, 49, 74, 0.2);
        }
        
        /* --- Abas Dark --- */
        /* (tabs-card já estilizado acima) */
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

        /* --- Estilo para o label "Filiais:" --- */
        .tabs-label {
           font-size: 1rem;
           font-weight: 600;
           transition: color 0.3s ease;
        }
        body.light .tabs-label {
            color: var(--gcs-blue);
        }
        body.dark .tabs-label {
            color: var(--gcs-dark-text-primary);
        }
        /* --- Fim do Estilo do Label --- */

        /* --- Correção: Texto da tabela vazia --- */
        .empty-table-message {
            text-align: center;
            margin-top: 4rem;
            font-size: 1.1rem;
        }
        body.light .empty-table-message { color: var(--gcs-gray-dark); }
        body.dark .empty-table-message { color: var(--gcs-dark-text-secondary); }

        /* --- ATUALIZAÇÃO 2: Botão de Gestão (Verde) --- */
        .btn-gestao {
            background-color: var(--gcs-green) !important;
            border-color: var(--gcs-green) !important;
            color: white !important;
            font-weight: 600;
        }
        .btn-gestao:hover:not(:disabled) {
            background-color: #4a9d3a !important; /* Verde mais escuro */
            border-color: #4a9d3a !important;
        }
        /* (Não precisa de regra dark, o seletor acima se aplica a ambos) */

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
            
            /* Responsividade das abas */
            .tabs-card { flex-direction: column; align-items: flex-start; }
            .tabs-container { justify-content: flex-start; }
        }
    `}</style>

    <div className="main-container" style={{ padding: "2rem", minHeight: "100vh" }}>

      {/* --- CABEÇALHO (Layout 1) --- */}
      <div className="header-wrapper" style={{ display: 'flex', alignItems: 'stretch', gap: '1.5rem', marginBottom: '1.5rem' }}>
        
        {/* Gráfico Donut (Funcionários por CC) */}
        <div className="chart-card" style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', minWidth: '280px', paddingTop: '1rem', paddingBottom: '1rem' }}>
            <h4 className="kpi-title" style={{ margin: 0, fontWeight: 500, fontSize: '1rem' }}>Funcionários por C. Custo</h4>
            <div style={{ width: 280, height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <RechartsTooltip 
                            content={<CustomTooltip />} 
                            cursor={{ fill: 'transparent' }}
                        />
                        <Pie
                            data={dadosGraficoCentroCusto} dataKey="value" nameKey="name"
                            cx="50%" cy="45%" innerRadius={50} outerRadius={80}
                            cornerRadius={8} paddingAngle={3}
                            activeIndex={activeIndex} 
                            activeShape={renderActiveShape}
                            onMouseEnter={(_, index) => setActiveIndex(index)}
                            // CORREÇÃO: Usando undefined
                            onMouseLeave={() => setActiveIndex(undefined)}
                        >
                            {dadosGraficoCentroCusto.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={CORES_GRAFICO[index % CORES_GRAFICO.length]} />
                            ))}
                        </Pie>
                        <Legend
                          layout="horizontal" align="center" verticalAlign="bottom"
                          iconSize={10}
                          wrapperStyle={{ fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '270px' }}
                          formatter={renderLegendText}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* Título e Busca */}
        <div className="main-content-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '1.5rem', paddingTop: '0.5rem', paddingBottom: '0.5rem' }}>
            <h2 className="page-title" style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Briefcase size={32} /> <span>Gestão de Pessoal</span>
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <Input
                    type="text"
                    placeholder="Buscar por nome, matrícula, função, filial..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    className="search-input"
                    style={{ padding: "12px 16px", fontSize: "1rem", borderRadius: "8px", border: "1px solid var(--gcs-border-color)", width: "350px" }}
                />
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={fetchFuncionarios} title="Atualizar Lista" className="btn btn-outline-gray" style={{padding: '9px'}}><RefreshCcw size={20} /></button>
                    
                    {/* --- BOTÃO DE EXCEL RESTAURADO --- */}
                    <button 
                      onClick={handleExportExcel} 
                      title="Exportar para Excel" 
                      className="btn btn-outline-blue" 
                      style={{padding: '9px'}}
                      disabled={loading || funcionariosFiltrados.length === 0}
                    >
                      <FileDown size={20} />
                    </button>
                    
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

        {/* KPIs Dinâmicos */}
        <div className="kpi-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-around' }}>
            <div style={{ textAlign: 'center' }}>
                <h4 className="kpi-title" style={{ margin: 0, fontWeight: 500, fontSize: '1rem', marginBottom: '0.25rem' }}>Total de Funcionários</h4>
                <p className="kpi-value-green" style={{ fontSize: '2.2rem', margin: 0, color: 'var(--gcs-green)', fontWeight: 'bold', lineHeight: 1.2 }}>
                    {loading ? <Spin size="small" /> : kpiData.total}
                </p>
            </div>
            <hr style={{ width: '80%', border: 'none', borderTop: '1px solid var(--gcs-border-color)', margin: '0.5rem 0' }} />
            <div style={{ textAlign: 'center' }}>
                <h4 className="kpi-title" style={{ margin: 0, fontWeight: 500, fontSize: '1rem', marginBottom: '0.25rem' }}>
                    Grupos de Filiais
                </h4>
                <p className="kpi-value-orange" style={{ fontSize: '2.2rem', margin: 0, color: 'var(--gcs-orange)', fontWeight: 'bold', lineHeight: 1.2 }}>
                    {loading ? <Spin size="small" /> : kpiData.grupos}
                </p>
            </div>
        </div>
      </div>

      {/* --- DIVISÓRIA DE FILTROS --- */}
      <div 
        className="tabs-card" // Esta classe aplica o glassmorfismo/estilo de card
      >
        <span className="tabs-label">
          Filiais:
        </span>
        <FiltroAbasStatus
            filtroAtual={filtroStatus}
            onChange={handleFiltroStatusChange}
            dados={abasGrupoFilial}
        />
      </div>

      {/* --- TABELA DE DADOS (Layout 1) --- */}
      <div className="content-card" style={{padding: '1.5rem'}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
          <h3 style={{margin: 0}} className="card-title-h3">Lista de Funcionários</h3>
          {/* (Botão de cadastrar removido por enquanto) */}
        </div>

        {/* --- Início da Tabela Customizada --- */}
        {loading ? (
            <LoadingSpinner text="Carregando funcionários..." />
        ) : funcionariosFiltrados.length === 0 ? (
            <div className="empty-table-message">
              {buscaDebounced
                ? "Nenhum funcionário encontrado para sua busca."
                : (filtroStatus !== 'Todos' ? `Nenhum funcionário no grupo '${filtroStatus}'.` : "Nenhum funcionário cadastrado.")
              }
            </div>
        ) : (
          <>
            <div className="responsive-table-wrapper" style={{ overflowX: "auto" }}>
              <table className="responsive-table">
                <thead>
                  <tr>
                    <th style={{ padding: "16px 12px" }}>
                      <div onClick={() => requestSort('Grupo Filial')} className="th-sortable">
                        <Landmark size={16} style={{marginRight: '8px'}} /> Grupo Filial
                      </div>
                    </th>
                    <th style={{ padding: "16px 12px" }}>
                      <div onClick={() => requestSort('Matricula')} className="th-sortable">
                        <Hash size={16} style={{marginRight: '8px'}} /> Matrícula
                      </div>
                    </th>
                    <th style={{ padding: "16px 12px" }}>
                      <div onClick={() => requestSort('Nome')} className="th-sortable">
                        <Briefcase size={16} style={{marginRight: '8px'}}/> Nome
                      </div>
                    </th>
                    <th style={{ padding: "16px 12px" }}>
                      <div onClick={() => requestSort('Função')} className="th-sortable">
                        <Briefcase size={16} style={{marginRight: '8px'}} /> Função
                      </div>
                    </th>
                    <th style={{ padding: "16px 12px" }}>
                      <div onClick={() => requestSort('Centro de Custo')} className="th-sortable">
                        <Briefcase size={16} style={{marginRight: '8px'}} /> Centro de Custo
                      </div>
                    </th>
                    <th style={{ padding: "16px 12px", textAlign: 'center' }}>
                      <div className="th-sortable" style={{justifyContent: 'center'}}>
                        <Settings size={16} style={{marginRight: '8px'}} /> Ações
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {funcionariosPaginados.map((item) => (
                      <tr key={item.key} className="data-row">
                        <td data-label="Grupo Filial" style={{ padding: '14px 12px', verticalAlign: 'middle' }}>{item["Grupo Filial"]}</td>
                        <td data-label="Matrícula" style={{ padding: '14px 12px', verticalAlign: 'middle' }}>{item.Matricula}</td>
                        <td data-label="Nome" style={{ padding: '14px 12px', verticalAlign: 'middle' }}>{item.Nome}</td>
                        <td data-label="Função" style={{ padding: '14px 12px', verticalAlign: 'middle' }}>{item.Função}</td>
                        <td data-label="C. Custo" style={{ padding: '14px 12px', verticalAlign: 'middle' }}>{item["Centro de Custo"]}</td>
                        <td data-label="Ações" style={{ padding: '14px 12px', verticalAlign: 'middle', textAlign: 'center' }}>
                           <Button 
                              className="btn-gestao" // ATUALIZAÇÃO 2: Classe do botão verde
                              icon={<Settings size={14} />}
                              onClick={() => handleOpenModal(item)}
                              size="small"
                           >
                             Gestão
                           </Button>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
            
            {/* --- Paginação Customizada --- */}
            <div style={{ marginTop: "2rem", display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <Pagination
                current={paginaAtual}
                total={funcionariosFiltrados.length}
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
    
    <ModalFuncionario
      visible={isModalAberto}
      onClose={handleCloseModal}
      item={currentItem}
    />
    
    <NotificationModal
        visible={notification.visible}
        type={notification.type}
        message={notification.message}
        onClose={() => setNotification(v => ({...v, visible: false}))}
    />
  </>);
}