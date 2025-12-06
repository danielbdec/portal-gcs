/*
 * =========================================================================
 * PÁGINA DE GESTÃO DE PIVÔS E TALHÕES (CRUD)
 * =========================================================================
 * Baseado no layout do 'Caderno Agrícola'
 * - Título, API e Permissões atualizadas.
 * - Colunas da tabela adaptadas para 'Pivô/Talhão'.
 * - Modais renomeados para 'ModalPivo' e 'ModalPivoDetalhes'.
 * =========================================================================
 * ATUALIZAÇÃO (Baseada no feedback):
 * 1. Lógica de Status: Corrigido para 'A' = "Aberto" e outros = "Inativo".
 * 2. Gráfico: Alterado de "Itens por Status" para "Área por Cultura (ha)".
 * 3. Cores do Gráfico: Adicionadas novas cores para culturas.
 * 4. CRUD: Texto do botão "Cadastrar Talhão/Pivo".
 * 5. API: Função handleSavePivo ativada para usar fetch real.
 * 6. CORREÇÃO: Adicionado 'email' ao mock 'useSession'.
 * 7. FIX: Caminhos de importação dos modais ajustados para a raiz.
 * 8. CORREÇÃO (CRÍTICA): Removidos dados mockados do bloco 'catch' em 'fetchPivos'.
 * 9. CORREÇÃO (CRÍTICA): Corrigida a lógica de cores do gráfico (case-sensitivity).
 * 10. ADICIONADO CAMPO 'FILIAL':
 * - Adicionado 'filial' à interface PivoTalhao.
 * - Adicionado 'filial' ao mapeamento de fetchPivos.
 * - Adicionado 'filial' ao filtro de busca.
 * - Adicionada coluna "Filial" na tabela.
 * 11. ATUALIZAÇÃO GRÁFICO (renderActiveShape):
 * - Revertida a solução <foreignObject> (que causava corte).
 * - Reimplementado com <text> e <tspan> nativos do SVG.
 * - Corrigida a quebra de linha (Nome, ha, %).
 * - Ajustada a posição do texto para evitar corte nas laterais.
 * 12. ATUALIZAÇÃO GRÁFICO (Tooltip):
 * - Substituído o texto do 'activeShape' por um <RechartsTooltip> customizado.
 * - 'renderActiveShape' agora apenas destaca a fatia.
 * - O Tooltip ('CustomTooltip') renderiza um <div> com glassmorphism,
 * resolvendo o corte de texto e a sobreposição da legenda.
 * 13. CORREÇÃO GRÁFICO (Tooltip):
 * - Corrigido o bug que exibia (NaN%) no tooltip.
 * - Corrigido bug de parênteses duplicados no tooltip.
 * 14. CORREÇÃO GRÁFICO (Tooltip):
 * - Corrigida a lógica de verificação do percentual que causava (0.0%)
 * incorretamente (check 'falsy' em vez de 'typeof').
 * 15. CORREÇÃO GRÁFICO (Tooltip):
 * - Adicionada lógica para tratar 'NaN' (quando há 1 item) e exibir '100.0%'.
 * 16. ATUALIZAÇÃO TABELA:
 * - Movida a coluna "Filial" para ser a primeira coluna da tabela.
 * 17. CORREÇÃO GRÁFICO (Tooltip):
 * - O percentual do Tooltip do Recharts é instável (dá NaN).
 * - Adicionado 'totalAreaCultura' (useMemo) para calcular o total.
 * - Tooltip agora calcula o percentual manualmente (valor / total).
 * 18. ATUALIZAÇÃO TABELA:
 * - Trocada a posição das colunas "Status" e "Filial".
 * Status agora é a 1ª, Filial é a 2ª.
 * 19. ATUALIZAÇÃO DADOS:
 * - Adicionado 'gid_telemetria' e 'kml' à interface PivoTalhao.
 * - Adicionado 'gid_telemetria' e 'kml' ao mapeamento de fetchPivos.
 * 20. ATUALIZAÇÃO VISUAL:
 * - Removidas colunas "Safra" e "Cultura" da tabela.
 * - Removida lógica de busca por "Safra" e "Cultura" no filtro e placeholder.
 * - Gráfico alterado de "Área por Cultura" para "Área por Bloco".
 * 21. CORREÇÃO TIPAGEM:
 * - Alterado PivoTalhao para usar '?' em vez de '| null' para campos opcionais
 * - Ajustado fetchPivos para mapear null para undefined.
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
    Landmark 
} from "lucide-react";
import { LoadingOutlined } from "@ant-design/icons";
import "antd/dist/reset.css"; 

// --- Imports dos Modais ---
import ModalPivo from "./ModalPivo";
import ModalPivoDetalhes from "./ModalPivoDetalhes";
import NotificationModal from "./NotificationModal";


// --- INTERFACE DO ITEM ---
// CORREÇÃO: Campos que podem vir null da API tipados como opcionais (undefined) para compatibilidade com componentes
interface PivoTalhao {
  id: number;
  key: string;
  nome: string;
  safra: string;
  filial: string; 
  bloco?: string; // Alterado de string | null para string | undefined (opcional)
  ha?: number;    // Alterado de number | null para number | undefined (opcional)
  cultura: string | null;
  variedade: string | null;
  gid_telemetria?: string; // Alterado de string | null para string | undefined (opcional)
  kml?: string;            // Alterado de string | null para string | undefined (opcional)
  status: string; // "Aberto" ou "Inativo"
  status_original: 'A' | 'I';
  dt_inclusao: string;
  dt_alteracao: string | null;
  [key: string]: any;
}

type StatusFiltro = 'Aberto' | 'Inativo' | 'Todos';


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

export default function GestaoPivoPage() {
  const { data: session, status } = useSession(); 
  const router = useRouter(); 
  const [authStatus, setAuthStatus] = useState<'loading' | 'authorized' | 'unauthorized'>('loading');
  const [pivos, setPivos] = useState<PivoTalhao[]>([]); 

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
  const [isDetalheModalOpen, setIsDetalheModalOpen] = useState(false); 
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'delete'>('add');
  const [currentItem, setCurrentItem] = useState<Partial<PivoTalhao> | null>(null); 
  
  // --- Estados de Paginação e Ordenação (Layout 1) ---
  const [paginaAtual, setPaginaAtual] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [sortConfig, setSortConfig] = useState<{ key: keyof PivoTalhao | null; direction: 'asc' | 'desc' }>({ key: 'id', direction: 'asc' });

  // --- Estado de Filtro de Status ---
  const [filtroStatus, setFiltroStatus] = useState<StatusFiltro>('Aberto');

  // --- Gráfico e KPIs ---
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);

  const kpiDadosStatus = useMemo(() => {
    const abertos = pivos.filter(c => c.status === 'Aberto').length;
    const inativos = pivos.filter(c => c.status === 'Inativo').length;
    return [
      { name: 'Abertos', value: abertos },
      { name: 'Inativos', value: inativos },
    ];
  }, [pivos]);

  const dadosGraficoBloco = useMemo(() => {
    const blocoMap = new Map<string, number>();
    pivos.forEach(item => {
        // Agrupa por 'bloco', tratando nulo como 'N/A'
        const bloco = (item.bloco || 'N/A').toUpperCase(); 
        const area = item.ha || 0;
        blocoMap.set(bloco, (blocoMap.get(bloco) || 0) + area);
    });

    return Array.from(blocoMap.entries())
        .map(([name, value]) => ({
            name: name,
            value: parseFloat(value.toFixed(2)) // Arredonda para 2 casas decimais
        }))
        .filter(d => d.value > 0) // Remove blocos com área 0
        .sort((a, b) => b.value - a.value); // Ordena da maior para a menor
  }, [pivos]);

  const totalAreaBloco = useMemo(() => {
      return dadosGraficoBloco.reduce((acc, entry) => acc + entry.value, 0);
  }, [dadosGraficoBloco]);

  const coresBlocoTexto: Record<string, string> = {
      "BLOCO A": "#EAB308",
      "BLOCO B": "#5FB246",
      "BLOCO C": "#38BDF8",
      "BLOCO D": "#F58220",
      "N/A": "#888888",
  };

  const coresBlocoDonut: Record<string, string> = {
      "BLOCO A": "url(#gradAmarelo)",
      "BLOCO B": "url(#gradVerde)",
      "BLOCO C": "url(#gradAzulClaro)",
      "BLOCO D": "url(#gradLaranja)",
      "N/A": "url(#gradCinza)",
  };
  const DEFAULT_COR_BLOCO = "url(#gradCinza)";


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
      const hasAccess = user?.is_admin === true || user?.funcoes?.includes('gestao.agricola.pivo');
      if (hasAccess) { setAuthStatus('authorized'); }
      else { setAuthStatus('unauthorized'); }
    } else { router.push('/login'); }
  }, [status, session, router]);


  // --- LÓGICA DE DADOS (CRUD) ---

  const fetchPivos = useCallback(async () => {
    setLoading(true);
    let data: any[] = [];
    try {
      const response = await fetch("/api/gestao-agricola/pivo/consulta", {
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
      console.error("Erro ao buscar pivôs/talhões:", error);
      message.error(`Não foi possível carregar os pivôs/talhões: ${error instanceof Error ? error.message : String(error)}`);
      data = []; 
    } finally {
      const statusMap: Record<string, string> = { 'A': 'Aberto' };
      setPivos(data.map((item, index) => ({
        ...item,
        key: item.id?.toString() ?? `key-${index}`,
        nome: item.nome || 'N/A',
        safra: item.safra || 'N/A',
        filial: item.filial || 'N/A', 
        // CORREÇÃO: Mapeando null para undefined
        gid_telemetria: item.gid_telemetria || undefined, 
        kml: item.kml || undefined, 
        bloco: item.bloco || undefined,
        ha: item.ha || undefined,
        status: statusMap[item.status] || 'Inativo',
        status_original: item.status || 'I', 
      })));
      setLoading(false);
    }
  }, []);

  // Busca inicial
  useEffect(() => {
    if (authStatus === 'authorized') {
      fetchPivos();
    }
  }, [authStatus, fetchPivos]);

  // --- Lógica de Ordenação e Filtro ---
  const pivosFiltrados = useMemo(() => {
    let dadosFiltrados = [...pivos];
    
    if (filtroStatus !== 'Todos') {
      dadosFiltrados = dadosFiltrados.filter(c => c.status === filtroStatus);
    }
    
    const termo = buscaDebounced.toLowerCase().trim();
    if (termo) {
        dadosFiltrados = dadosFiltrados.filter(c =>
            c.nome.toLowerCase().includes(termo) ||
            c.filial.toLowerCase().includes(termo) ||
            c.id.toString().includes(termo) ||
            (c.bloco && c.bloco.toLowerCase().includes(termo))
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
  }, [pivos, buscaDebounced, sortConfig, filtroStatus]);

  // --- Lógica de Paginação ---
  const pivosPaginados = useMemo(() => {
      const inicio = (paginaAtual - 1) * pageSize;
      const fim = inicio + pageSize;
      return pivosFiltrados.slice(inicio, fim);
  }, [pivosFiltrados, paginaAtual, pageSize]);

  const handleFiltroStatusChange = (status: StatusFiltro) => {
    setFiltroStatus(status);
    setPaginaAtual(1); 
  };

  const handleOpenCrudModal = (mode: 'add' | 'edit' | 'delete', item?: PivoTalhao) => {
    setModalMode(mode);
    setCurrentItem(item || null);
    setIsCrudModalOpen(true);
  };
  const handleCloseCrudModal = () => setIsCrudModalOpen(false);

  const handleOpenDetalheModal = (item: PivoTalhao) => {
    setCurrentItem(item);
    setIsDetalheModalOpen(true);
  };
  const handleCloseDetalheModal = () => setIsDetalheModalOpen(false);
  
  const handleSavePivo = async (data: any, mode: 'add' | 'edit' | 'delete') => {
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
      const statusApi = data.status === 'Aberto' ? 'A' : 'I';

      if (mode === 'add') {
        endpoint = '/api/gestao-agricola/pivo/inclui';
        body.registro = { ...data, status: statusApi, dt_inclusao: now, dt_alteracao: now };
        action = 'incluir';
        successMessage = 'Item cadastrado com sucesso!';
      } else if (mode === 'edit') {
        endpoint = '/api/gestao-agricola/pivo/altera';
        body.registro = { ...data, status: statusApi, dt_alteracao: now };
        action = 'alterar';
        successMessage = 'Item alterado com sucesso!';
      } else if (mode === 'delete') {
        endpoint = '/api/gestao-agricola/pivo/exclui';
        body.id = data.id;
        action = 'excluir';
        successMessage = 'Item excluído com sucesso!';
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
          if (response.ok) {
              result = { status: 'ok', message: successMessage };
          } else {
              throw new Error(`[HTTP ${response.status}] ${response.statusText || errorText}`);
          }
      }
      
      const firstResult = Array.isArray(result) ? result[0] : result;
      
      if (!response.ok || (firstResult && firstResult.status === 'error')) {
        throw new Error(firstResult?.message || `Falha ao ${action} o item.`);
      }

      setNotification({ visible: true, type: 'success', message: successMessage });
      handleCloseCrudModal();
      fetchPivos();
      
    } catch (error: any) {
      console.error(`Erro ao ${action} item:`, error);
      setNotification({ visible: true, type: 'error', message: error.message || 'Não foi possível realizar a operação.' });
    } finally {
      setIsSaving(false);
    }
  };
  
  const requestSort = (key: keyof PivoTalhao) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    setPaginaAtual(1); 
  };

  const SortIcon = ({ columnKey }: { columnKey: keyof PivoTalhao }) => {
    if (sortConfig.key !== columnKey) {
      return <ChevronsUpDown size={14} style={{ marginLeft: '4px', color: '#ffffff80' }} />;
    }
    if (sortConfig.direction === 'asc') {
      return <ArrowUp size={14} style={{ marginLeft: '4px' }} />;
    }
    return <ArrowDown size={14} style={{ marginLeft: '4px' }} />;
  };

  const renderLegendText = (value: string) => {
    return <span style={{ marginLeft: '4px' }} className="recharts-legend-item-text">{value}</span>;
  };

  const CustomTooltip = ({ active, payload }: any) => {
      if (active && payload && payload.length) {
          const value = payload[0].value;
          const name = payload[0].name;
          
          const percent = (totalAreaBloco > 0) 
              ? ((value / totalAreaBloco) * 100).toFixed(1) 
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
              color: coresBlocoTexto[name] || '#888888', 
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
                      {`${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ha`}
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
    <svg width="0" height="0" style={{ position: 'absolute', zIndex: -1 }}>
        <defs>
          <linearGradient id="gradLaranja" x1="0" y1="0" x2="0" y2="1"> <stop offset="0%" stopColor="#f79b4d" /> <stop offset="100%" stopColor="#F58220" /> </linearGradient>
          <linearGradient id="gradVerde" x1="0" y1="0" x2="0" y2="1"> <stop offset="0%" stopColor="#9DDE5B" /> <stop offset="100%" stopColor="#5FB246" /> </linearGradient>
          <linearGradient id="gradAmarelo" x1="0" y1="0" x2="0" y2="1"> <stop offset="0%" stopColor="#FDE047" /> <stop offset="100%" stopColor="#EAB308" /> </linearGradient>
          <linearGradient id="gradAzulClaro" x1="0" y1="0" x2="0" y2="1"> <stop offset="0%" stopColor="#7DD3FC" /> <stop offset="100%" stopColor="#38BDF8" /> </linearGradient>
          <linearGradient id="gradCinza" x1="0" y1="0" x2="0" y2="1"> <stop offset="0%" stopColor="#B0B0B0" /> <stop offset="100%" stopColor="#888888" /> </linearGradient>
        </defs>
    </svg>

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

        /* --- Correção 1: Texto da tabela vazia --- */
        .empty-table-message {
            text-align: center;
            margin-top: 4rem;
            font-size: 1.1rem;
        }
        body.light .empty-table-message {
            color: var(--gcs-gray-dark);
        }
        body.dark .empty-table-message {
            color: var(--gcs-dark-text-secondary); /* Corrigido */
        }
        /* --- Fim da Correção --- */

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
        
        {/* ATUALIZAÇÃO 20: Gráfico alterado para Área por Bloco */}
        <div className="chart-card" style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', minWidth: '280px', paddingTop: '1rem', paddingBottom: '1rem' }}>
            <h4 className="kpi-title" style={{ margin: 0, fontWeight: 500, fontSize: '1rem' }}>Área por Bloco (ha)</h4>
            <div style={{ width: 280, height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        {/* --- ATUALIZAÇÃO 12: Tooltip customizado adicionado --- */}
                        <RechartsTooltip 
                            content={<CustomTooltip />} 
                            cursor={{ fill: 'transparent' }} // Esconde o cursor padrão
                        />
                        <Pie
                            data={dadosGraficoBloco} dataKey="value" nameKey="name"
                            cx="50%" cy="45%" innerRadius={50} outerRadius={80}
                            cornerRadius={8} paddingAngle={3}
                            activeIndex={activeIndex} 
                            activeShape={renderActiveShape} // Shape simplificado
                            onMouseEnter={(_, index) => setActiveIndex(index)}
                            // ALTERAÇÃO: setando para undefined em vez de null
                            onMouseLeave={() => setActiveIndex(undefined)}
                        >
                            {dadosGraficoBloco.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={coresBlocoDonut[entry.name] || DEFAULT_COR_BLOCO} />
                            ))}
                        </Pie>
                        <Legend
                          layout="horizontal"
                          align="center"
                          verticalAlign="bottom"
                          iconSize={10}
                          wrapperStyle={{ fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '270px' }} // Ajuste para legendas longas
                          formatter={renderLegendText}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>

        <div className="main-content-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '1.5rem', paddingTop: '0.5rem', paddingBottom: '0.5rem' }}>
            <h2 className="page-title" style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <MapPin size={32} /> <span>Cadastro de Pivôs/Talhões</span>
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <Input
                    type="text"
                    // ATUALIZAÇÃO 20: Placeholder atualizado
                    placeholder="Buscar por nome, ID, filial ou bloco..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    className="search-input"
                    style={{ padding: "12px 16px", fontSize: "1rem", borderRadius: "8px", border: "1px solid var(--gcs-border-color)", width: "350px" }}
                />
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={fetchPivos} title="Atualizar Lista" className="btn btn-outline-gray" style={{padding: '9px'}}><RefreshCcw size={20} /></button>
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

        {/* ATUALIZAÇÃO 1: KPI de Status corrigido */}
        <div className="kpi-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-around' }}>
            <div style={{ textAlign: 'center' }}>
                <h4 className="kpi-title" style={{ margin: 0, fontWeight: 500, fontSize: '1rem', marginBottom: '0.25rem' }}>Total de Itens</h4>
                <p className="kpi-value-green" style={{ fontSize: '2.2rem', margin: 0, color: 'var(--gcs-green)', fontWeight: 'bold', lineHeight: 1.2 }}>
                    {pivos.length}
                </p>
            </div>
            <hr style={{ width: '80%', border: 'none', borderTop: '1px solid var(--gcs-border-color)', margin: '0.5rem 0' }} />
            <div style={{ textAlign: 'center' }}>
                <h4 className="kpi-title" style={{ margin: 0, fontWeight: 500, fontSize: '1rem', marginBottom: '0.25rem' }}>
                    Itens Abertos
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
          <h3 style={{margin: 0}} className="card-title-h3">Lista de Pivôs e Talhões</h3>
          {/* ATUALIZAÇÃO 4: Texto do botão corrigido */}
          <button onClick={() => handleOpenCrudModal('add')} title="Cadastrar Novo Item" className="btn btn-green">
            <Plus size={16} /> Cadastrar Talhão/Pivo
          </button>
        </div>

        {/* --- Início da Tabela Customizada --- */}
        {loading ? (
            <LoadingSpinner text="Carregando pivôs e talhões..." />
        ) : pivosFiltrados.length === 0 ? (
            // --- *** CORREÇÃO 1 APLICADA AQUI (classe) *** ---
            <div className="empty-table-message">
              {buscaDebounced
                ? "Nenhum item encontrado para sua busca."
                : (filtroStatus !== 'Todos' ? `Nenhum item com status '${filtroStatus}'.` : "Nenhum item cadastrado.")
              }
            </div>
        ) : (
          <>
            <div className="responsive-table-wrapper" style={{ overflowX: "auto" }}>
              <table className="responsive-table">
                <thead>
                  <tr>
                    {/* --- ATUALIZAÇÃO 18: Ordem Trocada --- */}
                    <th style={{ padding: "16px 12px", textAlign: 'center' }}>
                      <div onClick={() => requestSort('status')} className="th-sortable" style={{justifyContent: 'center'}}>
                        <BadgeCheck size={16} style={{marginRight: '8px'}} /> Status <SortIcon columnKey="status" />
                      </div>
                    </th>
                    <th style={{ padding: "16px 12px" }}>
                      <div onClick={() => requestSort('filial')} className="th-sortable">
                        <Landmark size={16} style={{marginRight: '8px'}} /> Filial <SortIcon columnKey="filial" />
                      </div>
                    </th>
                    {/* --- Fim da Troca --- */}

                    <th style={{ padding: "16px 12px" }}>
                      <div onClick={() => requestSort('id')} className="th-sortable">
                        <Hash size={16} style={{marginRight: '8px'}} /> ID <SortIcon columnKey="id" />
                      </div>
                    </th>
                    <th style={{ padding: "16px 12px" }}>
                      <div onClick={() => requestSort('nome')} className="th-sortable">
                        <MapPin size={16} style={{marginRight: '8px'}}/> Nome do Item <SortIcon columnKey="nome" />
                      </div>
                    </th>
                    
                    {/* --- ATUALIZAÇÃO 20: Colunas 'Safra' e 'Cultura' removidas --- */}

                    <th style={{ padding: "16px 12px" }}>
                      <div onClick={() => requestSort('bloco')} className="th-sortable">
                        <FileBadge size={16} style={{marginRight: '8px'}} /> Bloco <SortIcon columnKey="bloco" />
                      </div>
                    </th>
                    <th style={{ padding: "16px 12px", textAlign: 'center' }}>
                      <div onClick={() => requestSort('ha')} className="th-sortable" style={{justifyContent: 'center'}}>
                        <AreaChart size={16} style={{marginRight: '8px'}} /> Área (ha) <SortIcon columnKey="ha" />
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
                  {pivosPaginados.map((item) => {
                    const menuItems: MenuProps['items'] = [
                      { key: 'view', icon: <Eye size={14} style={{ marginRight: 8 }} />, label: 'Ver Detalhes', onClick: () => handleOpenDetalheModal(item) },
                      { key: 'edit', icon: <Edit size={14} style={{ marginRight: 8 }} />, label: 'Alterar', onClick: () => handleOpenCrudModal('edit', item) },
                      { key: 'delete', icon: <Trash2 size={14} style={{ marginRight: 8 }} />, label: 'Excluir', danger: true, onClick: () => handleOpenCrudModal('delete', item) }
                    ];

                    return (
                      <tr key={item.key} className="data-row">
                        {/* --- ATUALIZAÇÃO 18: Ordem Trocada --- */}
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
                        <td data-label="Filial" style={{ padding: '14px 12px', verticalAlign: 'middle' }}>{item.filial}</td>
                        {/* --- Fim da Troca --- */}
                        
                        <td data-label="ID" style={{ padding: '14px 12px', verticalAlign: 'middle' }}>{item.id}</td>
                        <td data-label="Nome do Item" style={{ padding: '14px 12px', verticalAlign: 'middle' }}>{item.nome}</td>
                        
                        {/* --- ATUALIZAÇÃO 20: 'Safra' e 'Cultura' removidas --- */}
                        
                        <td data-label="Bloco" style={{ padding: '14px 12px', verticalAlign: 'middle' }}>
                          {item.bloco || '—'}
                        </td>
                        <td data-label="Área (ha)" style={{ padding: '14px 12px', verticalAlign: 'middle', textAlign: 'center' }}>
                          {item.ha ? item.ha.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
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
                total={pivosFiltrados.length}
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
    
    <ModalPivo
      visible={isCrudModalOpen}
      mode={modalMode}
      initialData={currentItem}
      onClose={handleCloseCrudModal}
      onSave={handleSavePivo}
      isSaving={isSaving}
      onOpenKmlModal={() => { console.log("Abrir modal KML")}} // Placeholder
    />
    
    <ModalPivoDetalhes
      visible={isDetalheModalOpen}
      onClose={handleCloseDetalheModal}
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