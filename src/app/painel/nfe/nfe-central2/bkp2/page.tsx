//
"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Pagination, Tooltip } from "antd"; // Tooltip importado
import * as XLSX from 'xlsx';
import {
    PieChart, Pie, Cell, Legend, ResponsiveContainer, Sector, Tooltip as RechartsTooltip
} from "recharts";
import {
    RefreshCcw, FileText, AlertTriangle, Search, Building2, Hash,
    Truck, Calendar, BadgeCheck, MessageSquare, User, Settings2, ChevronsUpDown,
    ArrowUp, ArrowDown, Filter, X, FileDown, TrendingUp, Send, ShoppingCart, Landmark, Lock,
    CheckSquare, Square,
    Sun, Moon 
} from "lucide-react";
import ModalDetalhes from "./ModalDetalhes";
// === CORREÇÃO: Ajuste o caminho para o diretório correto (o mesmo de page.tsx) ===
import NotificationModal from "./NotificationModal"; // Importado
// =================================================================================
import React from "react";
import "antd/dist/reset.css";
// ===== ALTERAÇÃO: Importar o componente E a lista de status =====
import PriorityRibbonTabs, { RIBBON_STATUS_LIST } from "./PriorityRibbonTabs";
// ==============================================================
// import Donut3DStatus from "./Donut3DStatus"; // Removido

// --- COMPONENTES AUXILIARES DE SEGURANÇA E UI ---

const LoadingSpinner = ({ text }: { text: string }) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
        <div style={{ width: '40px', height: '40px', border: '4px solid var(--gcs-gray-medium)', borderTop: '4px solid var(--gcs-blue)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <div style={{ marginTop: '1rem', fontWeight: 'bold', color: 'var(--gcs-blue)' }} className="loading-text">
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
        Você não tem as permissões necessárias para visualizar esta página. Por favor, contacte um administrador se acredita que isto é um erro.
      </p>
      <button onClick={() => router.push('/painel')} className="btn btn-green" style={{ marginTop: '1rem' }}>
        Voltar ao Painel
      </button>
    </div>
  );
};


// Helper para formatar o tempo (ex: "há 2 minutos")
const formatTimeAgo = (date: Date | null): string => {
    if (!date) return '';
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return "agora mesmo";
    const minutes = Math.floor(seconds / 60);
    if (minutes === 1) return `há 1 minuto`;
    if (minutes < 60) return `há ${minutes} minutos`;
    const hours = Math.floor(minutes / 60);
    if (hours === 1) return `há 1 hora`;
    if (hours < 24) return `há ${hours} horas`;
    const days = Math.floor(hours / 24);
    if (days === 1) return `há 1 dia`;
    return `há ${days} dias`;
};

// Helper para formatar data e hora do Protheus (ISODate)
const formatProtheusDateTime = (dateString: string | null | undefined): string => {
    if (!dateString) {
        return '—';
    }
    try {
        const dateTest = new Date(dateString);
        if (isNaN(dateTest.getTime())) {
            return '—';
        }

        const year = dateString.substring(0, 4);
        const month = dateString.substring(5, 7);
        const day = dateString.substring(8, 10);
        const hour = dateString.substring(11, 13);
        const minute = dateString.substring(14, 16);

        if (year.length !== 4 || month.length !== 2 || day.length !== 2 || hour.length !== 2 || minute.length !== 2) {
             if(dateString.length >= 16){
                const hourAlt = dateString.substring(11, 13);
                const minuteAlt = dateString.substring(14, 16);
                if(hourAlt.length === 2 && minuteAlt.length === 2){
                    return `${day}/${month}/${year} ${hourAlt}:${minuteAlt}`;
                }
             }
             return '—';
        }

        return `${day}/${month}/${year} ${hour}:${minute}`;

    } catch (error) {
        console.error("Erro ao formatar data Protheus:", error);
        return '—';
    }
};


interface Nota {
  filial: string;
  dt_recebimento: string;
  hr_Recebimento: string;
  grp_empresa: string;
  nf: string;
  serie: string;
  tipo_nf: string;
  nome_fornecedor: string;
  chave: string;
  status_nf: string;
  dt_atualizacao: string;
  observacao: string;
  comprador: string;
  status_lancamento?: string;
  status_envio_unidade?: string;
  status_compras?: string;
  status_fiscal?: string;
  dt_lcto_protheus?: string;
  conferido?: 'S' | 'N' | null;
}

const StatusSetorDots = ({ statusUnidade, statusCompras, statusFiscal }: {
    statusUnidade?: string;
    statusCompras?: string;
    statusFiscal?: string;
}) => {
    const getIconBgColor = (status: string | undefined, completedValue: string): string => {
        if (typeof status === 'string' && status.trim().toUpperCase() === completedValue) {
            return '#28a745'; // Verde sólido
        }
        return '#dc3545'; // Vermelho sólido
    };

    let unidadeTitleText = 'Pendente';
    if (typeof statusUnidade === 'string') {
        if (statusUnidade.trim().toUpperCase() === 'SIM') {
            unidadeTitleText = 'Enviado';
        } else if (statusUnidade.trim().toUpperCase() === 'NAO') {
            unidadeTitleText = 'Não Enviado';
        }
    }

    const unidadeBgColor = getIconBgColor(statusUnidade, 'SIM');
    const comprasBgColor = getIconBgColor(statusCompras, 'CONCLUÍDO');
    const fiscalBgColor = getIconBgColor(statusFiscal, 'CONCLUÍDO');

    const iconContainerStyle: React.CSSProperties = {
        width: '28px',
        height: '28px',
        borderRadius: '50%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
    };

    return (
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
            <div title={`Fazenda: ${unidadeTitleText}`} style={{ ...iconContainerStyle, backgroundColor: unidadeBgColor }}>
                <Send size={16} color="white" />
            </div>
            <div title={`Compras: ${statusCompras || 'Pendente'}`} style={{ ...iconContainerStyle, backgroundColor: comprasBgColor }}>
                <ShoppingCart size={16} color="white" />
            </div>
            <div title={`Fiscal: ${statusFiscal || 'Pendente'}`} style={{ ...iconContainerStyle, backgroundColor: fiscalBgColor }}>
                <Landmark size={16} color="white" />
            </div>
        </div>
    );
};

const FilterPopover = ({
    allFiliais,
    allTipos,
    allCompradores,
    allStatusLancamento,
    onApplyFilters,
    initialFilters
}: {
    allFiliais: string[],
    allTipos: string[],
    allCompradores: string[],
    allStatusLancamento: string[],
    onApplyFilters: (filters: any) => void,
    initialFilters: any
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [filial, setFilial] = useState(initialFilters.filial || 'Todas');
    const [tipo, setTipo] = useState(initialFilters.tipo || 'Todos');
    const [responsavel, setResponsavel] = useState(initialFilters.responsavel || 'Todos');
    const [statusLancamento, setStatusLancamento] = useState(initialFilters.statusLancamento || 'Todos');
    const [startDate, setStartDate] = useState(initialFilters.startDate || '');
    const [endDate, setEndDate] = useState(initialFilters.endDate || '');
    const [startDateProtheus, setStartDateProtheus] = useState(initialFilters.startDateProtheus || '');
    const [endDateProtheus, setEndDateProtheus] = useState(initialFilters.endDateProtheus || '');
    const popoverRef = useRef<HTMLDivElement>(null);

    const filiaisUnicas = useMemo(() => allFiliais, [allFiliais]);
    const tiposUnicos = useMemo(() => allTipos, [allTipos]);
    const responsaveisUnicos = useMemo(() => allCompradores, [allCompradores]);
    const statusUnicos = useMemo(() => allStatusLancamento, [allStatusLancamento]);


    const handleApply = () => {
        onApplyFilters({
            filial, tipo, responsavel, statusLancamento,
            startDate, endDate,
            startDateProtheus, endDateProtheus
        });
        setIsOpen(false);
    };

    const handleClear = () => {
        setFilial('Todas');
        setTipo('Todos');
        setResponsavel('Todos');
        setStatusLancamento('Todos');
        setStartDate('');
        setEndDate('');
        setStartDateProtheus('');
        setEndDateProtheus('');

        onApplyFilters({
            filial: 'Todas', tipo: 'Todos', responsavel: 'Todos',
            statusLancamento: 'Todos', startDate: '', endDate: '',
            startDateProtheus: '', endDateProtheus: ''
        });
        setIsOpen(false);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [popoverRef]);

    return (
        <div style={{ position: 'relative' }} ref={popoverRef}>
            <button onClick={() => setIsOpen(!isOpen)} title="Filtros Avançados" className="btn btn-outline-gray" style={{padding: '9px'}}>
                <Filter size={20} />
            </button>

            {isOpen && (
                <div 
                    // --- CLASSE ADICIONADA PARA O TEMA ESCURO ---
                    className="filter-popover-content"
                    style={{
                        position: 'absolute',
                        top: '100%',
                        right: 0,
                        marginTop: '8px',
                        width: '360px',
                        backgroundColor: 'white',
                        borderRadius: '8px',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                        border: '1px solid var(--gcs-border-color)',
                        // === CORREÇÃO 2: Aplicar z-index altíssimo diretamente no style inline para maior precedência ===
                        zIndex: 99999999,
                        // =================================================================================
                        padding: '1rem'
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h4 style={{ margin: 0, color: 'var(--gcs-blue)' }}>Filtros Avançados</h4>
                        <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} color="var(--gcs-gray-dark)" /></button>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500 }}>Dt. Receb. Inicial</label>
                            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--gcs-border-color)' }} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500 }}>Dt. Receb. Final</label>
                            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--gcs-border-color)' }} />
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500 }}>Dt. Imp. Protheus Inicial</label>
                            <input type="date" value={startDateProtheus} onChange={(e) => setStartDateProtheus(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--gcs-border-color)' }} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500 }}>Dt. Imp. Protheus Final</label>
                            <input type="date" value={endDateProtheus} onChange={(e) => setEndDateProtheus(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--gcs-border-color)' }} />
                        </div>
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500 }}>Filial</label>
                        <select value={filial} onChange={(e) => setFilial(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--gcs-border-color)' }}>
                            {filiaisUnicas.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500 }}>Tipo</label>
                        <select value={tipo} onChange={(e) => setTipo(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--gcs-border-color)' }}>
                            {tiposUnicos.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500 }}>Responsável</label>
                        <select value={responsavel} onChange={(e) => setResponsavel(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--gcs-border-color)' }}>
                            {responsaveisUnicos.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500 }}>Status da Nota</label>
                        <select value={statusLancamento} onChange={(e) => setStatusLancamento(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--gcs-border-color)' }}>
                            {statusUnicos.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <button onClick={handleClear} className="btn btn-outline-gray" style={{padding: '8px 16px'}}>Limpar</button>
                        <button onClick={handleApply} className="btn btn-green" style={{padding: '8px 16px'}}>Aplicar</button>
                    </div>
                </div>
            )}
        </div>
    );
};

const ConfirmationModal = ({
    isOpen,
    onClose,
    onConfirm,
    message,
    title = "Confirmação Necessária",
    icon = <AlertTriangle size={40} color="#f7941d" />,
    confirmText = "OK, Entendi",
    confirmColor = "#dc3545",
    showCancelButton = true
}: {
    isOpen: boolean,
    onClose: () => void,
    onConfirm: () => void,
    message: string,
    title?: string,
    icon?: React.ReactNode,
    confirmText?: string,
    confirmColor?: string,
    showCancelButton?: boolean
}) => {
    if (!isOpen) return null;
    return (
        <>
            <div onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 2147483648 }}></div>
            <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', backgroundColor: 'white', padding: '2rem', borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.2)', zIndex: 2147483649, maxWidth: '450px', textAlign: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                    {icon}
                </div>
                <h3 style={{ marginTop: 0, marginBottom: '1rem', color: '#333' }}>{title}</h3>
                <p style={{ color: '#666', lineHeight: 1.6 }}>{message}</p>
                <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                    {showCancelButton && (
                        <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: '5px', border: '1px solid #ccc', background: '#f1f1f1', cursor: 'pointer', fontWeight: 'bold' }}>Cancelar</button>
                    )}
                    <button onClick={onConfirm} style={{ padding: '10px 20px', borderRadius: '5px', border: 'none', background: confirmColor, color: 'white', cursor: 'pointer', fontWeight: 'bold' }}>{confirmText}</button>
                </div>
            </div>
        </>
    );
};


export default function ConsultaNotas() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [authStatus, setAuthStatus] = useState<'loading' | 'authorized' | 'unauthorized'>('loading');

  const [notas, setNotas] = useState<Nota[]>([]);
  const [filtroStatus, setFiltroStatus] = useState<string>("Todos");

  const [buscaRaw, setBuscaRaw] = useState<string>("");
  const [busca, setBusca] = useState<string>("");

  const [loading, setLoading] = useState<boolean>(true);
  const [notaSelecionada, setNotaSelecionada] = useState<Nota | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [paginaAtual, setPaginaAtual] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [totalServidor, setTotalServidor] = useState<number>(0);
  const [totaisAbas, setTotaisAbas] = useState<Record<string, number>>({});
  const [sortConfig, setSortConfig] = useState<{ key: keyof Nota | null; direction: 'asc' | 'desc' }>({ key: null, direction: 'asc' });

  const [isConfirmConferenciaOpen, setIsConfirmConferenciaOpen] = useState(false);
  const [conferenciaNota, setConferenciaNota] = useState<Nota | null>(null);
  const [newConferenciaStatus, setNewConferenciaStatus] = useState<'S' | 'N' | null>(null);
  const [isSubmittingConferencia, setIsSubmittingConferencia] = useState(false);
  // O NotificationModal não precisa de z-index ajustado aqui, pois ele usa createPortal no body.
  const [notification, setNotification] = useState({ visible: false, type: 'success' as 'success' | 'error', message: '' });

  const [advancedFilters, setAdvancedFilters] = useState({
    filial: 'Todas',
    tipo: 'Todos',
    responsavel: 'Todos',
    statusLancamento: 'Todos',
    startDate: '',
    endDate: '',
    startDateProtheus: '',
    endDateProtheus: ''
  });

  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [chartKey, setChartKey] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [timeAgo, setTimeAgo] = useState('');

  const [totalPendentes, setTotalPendentes] = useState<number>(0);
  const [totalNotasHoje, setTotalNotasHoje] = useState<number>(0);

  const [allFiliais, setAllFiliais] = useState<string[]>(['Todos']);
  const [allTipos, setAllTipos] = useState<string[]>(['Todos']);
  const [allCompradores, setAllCompradores] = useState<string[]>(['Todos']);
  const [allStatusLancamento, setAllStatusLancamento] = useState<string[]>(['Todos']);

  // --- ESTADO DO TEMA ADICIONADO ---
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // --- EFEITOS DE TEMA ADICIONADOS ---
  // 1. Carregar tema do localStorage ao montar
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark';
    if (savedTheme) {
      setTheme(savedTheme);
    } else {
      setTheme('light'); // Padrão é claro
    }
  }, []);

  // 2. Aplicar tema ao body e salvar no localStorage
  useEffect(() => {
    localStorage.setItem('theme', theme);
    document.body.classList.remove('light', 'dark');
    document.body.classList.add(theme);
  }, [theme]);
  // --- FIM DOS EFEITOS DE TEMA ---


  useEffect(() => {
    const handler = setTimeout(() => {
        setBusca(buscaRaw);
        setPaginaAtual(1);
    }, 400);

    return () => {
        clearTimeout(handler);
    };
  }, [buscaRaw]);

  const handleApplyAdvancedFilters = (filters: any) => {
    setAdvancedFilters(filters);
    setPaginaAtual(1);
  };

  const handleFiltroStatusChange = (status: string) => {
    setFiltroStatus(status);
    setPaginaAtual(1);
  };

  useEffect(() => {
    if (status === 'loading') {
      setAuthStatus('loading');
      return;
    }
    if (status === 'authenticated') {
      const user = session.user;
      const hasAccess = user?.is_admin === true || user?.funcoes?.includes('nfEntrada.centralDeNotas');

      if (hasAccess) {
        setAuthStatus('authorized');
      } else {
        setAuthStatus('unauthorized');
      }
    } else {
        router.push('/login');
    }
  }, [status, session, router]);

  useEffect(() => {
    setTimeAgo(formatTimeAgo(lastUpdated));
    const interval = setInterval(() => {
        setTimeAgo(formatTimeAgo(lastUpdated));
    }, 60000);
    return () => clearInterval(interval);
  }, [lastUpdated]);

  // ===== ALTERAÇÃO: A lista de status agora é importada do componente =====
  const statusDisponiveis = RIBBON_STATUS_LIST; // Importado de PriorityRibbonTabs
  // ========================================================================


  const statusCounts = useMemo(() => {
    if (totaisAbas && Object.keys(totaisAbas).length) return totaisAbas;
    return {};
  }, [totaisAbas]);


  const dadosGraficoStatus = useMemo(() => {
    return statusDisponiveis
      .filter(key => key !== "Todos" && (statusCounts[key] || 0) > 0)
      .map(name => ({ name, value: statusCounts[name] })); // CORRIGIDO: de key para name
  // ===== ALTERAÇÃO: Removido 'statusDisponiveis' do array de dependência =====
  }, [statusCounts]);
  // ==========================================================================

  const areFiltersApplied = useMemo(() => {
    const isStatusFiltered = filtroStatus !== "Todos";
    const isSearchFiltered = busca.trim() !== "";
    const isAdvancedFiltered = advancedFilters.filial !== 'Todas' ||
                               advancedFilters.responsavel !== 'Todos' ||
                               advancedFilters.tipo !== 'Todos' ||
                               advancedFilters.statusLancamento !== 'Todos' ||
                               advancedFilters.startDate !== '' ||
                               advancedFilters.endDate !== '' ||
                               advancedFilters.startDateProtheus !== '' ||
                               advancedFilters.endDateProtheus !== '';

    return isStatusFiltered || isSearchFiltered || isAdvancedFiltered;
  }, [filtroStatus, busca, advancedFilters]);


  useEffect(() => {
    if (filtroStatus === 'Todos') {
        setActiveIndex(null);
    } else {
        const newActiveIndex = dadosGraficoStatus.findIndex(
            (data) => data.name === filtroStatus
        );
        setActiveIndex(newActiveIndex !== -1 ? newActiveIndex : null);
    }
  }, [filtroStatus, dadosGraficoStatus]);

  useEffect(() => {
    setChartKey(prevKey => prevKey + 1);
  }, [filtroStatus, theme]); // Adicionado theme aqui para recarregar o gráfico


  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  const onPieLeave = () => {
    const newActiveIndex = dadosGraficoStatus.findIndex(
        (data) => data.name === filtroStatus
    );
    setActiveIndex(newActiveIndex !== -1 ? newActiveIndex : null);
  };

  // ATUALIZADO: Handler para o Donut
  const handleChartClick = (data: any) => {
    if (data && data.name) {
        const statusName = data.name;
        if(statusDisponiveis.includes(statusName)) {
            handleFiltroStatusChange(statusName);
        }
    }
  };

  const abrirModalDetalhes = (nota: any) => {
    if (!nota.chave) {
      console.warn("Nota sem chave:", nota);
      return;
    }
    setNotaSelecionada(nota);
    setModalAberto(true);
  };

  const statusFiltroToStatusNf = (tab: string): string | null => {
    const map: Record<string, string> = {
      "Erro I.A.": "erro i.a.",
      "Não Recebidas": "aguardando",
      "Importado": "importado",
      "Manual": "manual",
      "Falha ERP": "erro execauto",
    };
    return map[tab] ?? null;
  };

  const sortWhitelist = new Set(['dt_atualizacao','dt_recebimento','nf','serie','nome_fornecedor','status_nf','tipo_nf', 'dt_lcto_protheus']);
  const sortKeyToBackend = (k: keyof Nota | null) => (k && sortWhitelist.has(k as string) ? (k as string) : 'dt_atualizacao');


  const fetchNotas = async () => {
      try {
        setLoading(true);

        const body: any = {
          page: paginaAtual,
          pageSize,
          sortBy: sortKeyToBackend(sortConfig.key),
          sortDir: sortConfig.direction || 'asc',
          termo: (busca || '').trim() || undefined,
          filial: advancedFilters.filial === 'Todas' ? undefined : advancedFilters.filial,
          tipo: advancedFilters.tipo === 'Todos' ? undefined : advancedFilters.tipo,
          responsavel: advancedFilters.responsavel === 'Todos' ? undefined : advancedFilters.responsavel,
          statusLancamento: advancedFilters.statusLancamento === 'Todos' ? undefined : advancedFilters.statusLancamento,
          startDate: advancedFilters.startDate || undefined,
          endDate: advancedFilters.endDate || undefined,
          startDateProtheus: advancedFilters.startDateProtheus || undefined,
          endDateProtheus: advancedFilters.endDateProtheus || undefined
        };

        if (filtroStatus && filtroStatus !== 'Todos') {
            const statusNf = statusFiltroToStatusNf(filtroStatus);
            if (statusNf) {
                body.status_nf = statusNf;
            } else {
                if (filtroStatus === 'Compras')  body.only_compras_pendentes  = true;
                if (filtroStatus === 'Fiscal')   body.only_fiscal_pendentes   = true;
                if (filtroStatus === 'Enviadas') body.only_enviadas_pendentes = true;
            }
        }

        console.log("==> Enviando body para API:", JSON.stringify(body, null, 2));

        const response = await fetch("/api/nfe/nfe-consulta-notas-cabecalho-paginado", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify(body),
        });
        const payload = await response.json();

        console.log("<== Recebido payload da API:", payload);

        setNotas(Array.isArray(payload?.data) ? payload.data : []);
        setTotalServidor(Number(payload?.total ?? 0));
        setTotaisAbas(payload?.tabs || {});
        setTotalPendentes(Number(payload?.pendentes_total ?? 0));
        setTotalNotasHoje(Number(payload?.notas_hoje ?? 0));

        // Atualiza listas de filtros APENAS se vierem dados válidos
        if (Array.isArray(payload?.distinct_filiais) && payload.distinct_filiais.length > 0) {
            setAllFiliais(payload.distinct_filiais);
        } else if (!advancedFilters.filial || advancedFilters.filial === 'Todas') { // Reseta se não houver filtro aplicado
             setAllFiliais(['Todos']);
        }
        if (Array.isArray(payload?.distinct_tipos) && payload.distinct_tipos.length > 0) {
             setAllTipos(payload.distinct_tipos);
        } else if (!advancedFilters.tipo || advancedFilters.tipo === 'Todos') {
             setAllTipos(['Todos']);
        }
         if (Array.isArray(payload?.distinct_compradores) && payload.distinct_compradores.length > 0) {
             setAllCompradores(payload.distinct_compradores);
        } else if (!advancedFilters.responsavel || advancedFilters.responsavel === 'Todos') {
             setAllCompradores(['Todos']);
        }
         if (Array.isArray(payload?.distinct_status) && payload.distinct_status.length > 0) {
             setAllStatusLancamento(payload.distinct_status);
        } else if (!advancedFilters.statusLancamento || advancedFilters.statusLancamento === 'Todos') {
             setAllStatusLancamento(['Todos']);
        }


        setChartKey(prevKey => prevKey + 1);
        setLastUpdated(new Date());
      } catch (error) {
        console.error("Erro ao buscar as notas:", error);
        setNotas([]);
        setTotalServidor(0);
        setTotaisAbas({});
        setTotalPendentes(0);
        setTotalNotasHoje(0);
        // Reseta filtros em caso de erro grave
        setAllFiliais(['Todos']);
        setAllTipos(['Todos']);
        setAllCompradores(['Todos']);
        setAllStatusLancamento(['Todos']);
      } finally {
        setLoading(false);
      }
    };


  const requestSort = (key: keyof Nota) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    setPaginaAtual(1); // Resetar para a primeira página ao ordenar
  };

  const notasPaginadas = notas; // A paginação agora é feita no backend

  // Cores sólidas
  const coresStatus: Record<string, string> = {
    "Erro I.A.": "#ff6f61",
    "Não Recebidas": "var(--gcs-orange)",
    "Importado": "var(--gcs-green)",
    "Manual": "#343a40",
    "Falha ERP": "#8B0000",
    "Compras": "#FFC107",
    "Fiscal": "#00314A",
    "Enviadas": "#17a2b8",
  };
  
  // *** ADICIONADO: Mapeamento de Cores/Gradientes do Donut ***
  const coresStatusDonut: Record<string, string> = {
    "Erro I.A.": "url(#gradVermelho)",
    "Não Recebidas": "url(#gradLaranja)",
    "Importado": "url(#gradVerde)",
    "Manual": "url(#gradCinza)",
    "Falha ERP": "url(#gradVermelho)",
    "Compras": "url(#gradAmarelo)",
    "Fiscal": "url(#gradAzul)",
    "Enviadas": "url(#gradAzulClaro)",
  };

  const SortIcon = ({ columnKey }: { columnKey: keyof Nota }) => {
    if (sortConfig.key !== columnKey) {
      return <ChevronsUpDown size={14} style={{ marginLeft: '4px', color: '#ffffff80' }} />;
    }
    if (sortConfig.direction === 'asc') {
      return <ArrowUp size={14} style={{ marginLeft: '4px' }} />;
    }
    return <ArrowDown size={14} style={{ marginLeft: '4px' }} />;
  };

  const handleExportXLSX = () => {
    const headers = ["Conferido", "Status da Nota", "Filial", "Nota", "Série", "Tipo", "Fornecedor", "Recebimento", "Lançamento Protheus", "Status Envio Unidade", "Status Compras", "Status Fiscal", "Observação", "Responsável", "Chave"];

    const data = notasPaginadas.map(nota => {
      return [
        nota.conferido === 'S' ? 'Sim' : 'Não',
        nota.status_lancamento || '',
        nota.filial,
        nota.nf,
        nota.serie,
        nota.tipo_nf || '',
        nota.nome_fornecedor,
        `${nota.dt_recebimento} ${nota.hr_Recebimento}`,
        formatProtheusDateTime(nota.dt_lcto_protheus),
        nota.status_envio_unidade || '',
        nota.status_compras || '',
        nota.status_fiscal || '',
        nota.observacao || '',
        nota.comprador || '',
        nota.chave
      ];
    });

    const worksheetData = [headers, ...data];
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    worksheet['!cols'] = [
        { wch: 10 }, { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 10 }, { wch: 10 },
        { wch: 40 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 },
        { wch: 20 }, { wch: 50 }, { wch: 25 }, { wch: 50 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Notas Fiscais");
    XLSX.writeFile(workbook, "Consulta_Notas_Fiscais_Pagina.xlsx");
  };

  // --- FUNÇÕES DE CONFERÊNCIA (CHECKBOX) ---

  // 1. Abre o modal de confirmação
  const handleCheckboxClick = (nota: Nota) => {
      if (isSubmittingConferencia) return; // Impede cliques duplos
      const newStatus = nota.conferido === 'S' ? 'N' : 'S';
      setConferenciaNota(nota);
      setNewConferenciaStatus(newStatus);
      setIsConfirmConferenciaOpen(true);
  };

  // 2. Fecha o modal de confirmação
  const handleCloseConferencia = () => {
      if (isSubmittingConferencia) return;
      setIsConfirmConferenciaOpen(false);
      setConferenciaNota(null);
      setNewConferenciaStatus(null);
  };

  // 3. Chamada à API após clicar em "Sim"
  const handleConfirmConferencia = async () => {
      console.log("handleConfirmConferencia: Iniciando..."); // Log 1

      // 1. Verifica a sessão
      if (!session?.user?.email) {
          console.error("handleConfirmConferencia: Erro - Sessão ou email do usuário não encontrado."); // Log 2
          setNotification({ visible: true, type: 'error', message: 'Erro: Sessão do usuário não encontrada. Faça login novamente.' });
          setIsConfirmConferenciaOpen(false);
          return;
      }
      console.log("handleConfirmConferencia: Sessão OK, Email:", session.user.email); // Log 3

      // 2. Verifica os dados da nota
      if (!conferenciaNota || !newConferenciaStatus) {
          console.error("handleConfirmConferencia: Erro - Dados da nota ou novo status ausentes."); // Log 4
          setNotification({ visible: true, type: 'error', message: 'Erro: Informações da nota não encontradas. Tente novamente.' });
          setIsConfirmConferenciaOpen(false);
          return;
      }
      console.log("handleConfirmConferencia: Dados da nota OK:", { chave: conferenciaNota.chave, novoStatus: newConferenciaStatus }); // Log 5

      // 3. Inicia o envio
      setIsSubmittingConferencia(true);
      console.log("handleConfirmConferencia: Enviando para API /api/nfe/nfe-conferencia..."); // Log 6

      try {
          const bodyPayload = {
              chave: conferenciaNota.chave,
              email_solicitante: session.user.email,
              conferido: newConferenciaStatus
          };
          console.log("handleConfirmConferencia: Payload:", JSON.stringify(bodyPayload)); // Log 7

          const response = await fetch('/api/nfe/nfe-conferencia', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(bodyPayload)
          });
          console.log("handleConfirmConferencia: Resposta da API recebida, Status HTTP:", response.status); // Log 8

          let result: any = {};
          try {
              result = await response.json();
              console.log("handleConfirmConferencia: Corpo da Resposta (JSON):", result); // Log 9
          } catch (jsonError) {
              const textResponse = await response.text().catch(() => "Erro ao ler corpo da resposta");
              console.error("handleConfirmConferencia: Resposta não é JSON. Resposta como Texto:", textResponse); // Log 10
              result = { status: 'error', message: `Erro ${response.status}: ${response.statusText}. Resposta do servidor não é JSON.` };
          }

          if (response.ok && result?.status === 'ok') {
              console.log("handleConfirmConferencia: Sucesso! Status HTTP OK e status interno 'ok'."); // Log 11
              setNotification({ visible: true, type: 'success', message: `Nota ${newConferenciaStatus === 'S' ? 'marcada' : 'desmarcada'} com sucesso!` });
              fetchNotas(); // Recarrega os dados
          } else {
              console.error("handleConfirmConferencia: Falha - Resposta não OK ou status interno diferente de 'ok'."); // Log 12
              const errorMessage = result?.message || `Erro ao se comunicar com o servidor (HTTP ${response.status})`;
              throw new Error(errorMessage);
          }

      } catch (error: any) {
          console.error("handleConfirmConferencia: Erro no bloco catch:", error); // Log 13
          setNotification({ visible: true, type: 'error', message: error.message || 'Não foi possível realizar a operação.' });
      } finally {
          console.log("handleConfirmConferencia: Bloco finally executado."); // Log 14
          setIsSubmittingConferencia(false);
          setIsConfirmConferenciaOpen(false);
          setConferenciaNota(null);
          setNewConferenciaStatus(null);
      }
  };

  // 4. Fecha o modal de notificação
  const handleCloseNotification = () => {
      setNotification({ visible: false, type: 'success', message: '' });
      console.log("handleCloseNotification: Notificação fechada."); // Log 15
  };
  // --- FIM DAS FUNÇÕES DE CONFERÊNCIA ---


  const renderLegendText = (value: string) => {
    return <span style={{ marginLeft: '4px' }} className="recharts-legend-item-text">{value}</span>;
  };

  useEffect(() => {
    if (authStatus === 'authorized') {
      fetchNotas();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authStatus, paginaAtual, pageSize, busca, filtroStatus, advancedFilters, sortConfig]);

  // *** ADICIONADO: Estilos dinâmicos do Tooltip ***
  const glassTooltipStyle: React.CSSProperties = {
    borderRadius: '12px',
    border: '1px solid',
    backdropFilter: 'blur(14px) saturate(140%)',
    WebkitBackdropFilter: 'blur(14px) saturate(140%)',
    boxShadow: '0 8px 24px rgba(0,0,0,.12)',
    color: theme === 'dark' ? '#E2E8F0' : '#00314A', 
    background: theme === 'dark' ? 'rgba(25,39,53,.50)' : 'rgba(255,255,255,.25)',
    borderColor: theme === 'dark' ? 'rgba(125,173,222,.28)' : 'rgba(255,255,255,.35)',
  };

  const tooltipLabelStyle: React.CSSProperties = {
    color: theme === 'dark' ? '#E2E8F0' : '#00314A',
    fontWeight: 'bold',
  };
  
  const tooltipItemStyle: React.CSSProperties = {
    color: theme === 'dark' ? '#E2E8F0' : '#00314A',
    };
  // *** FIM DOS ESTILOS DINÂMICOS ***

  if (authStatus === 'loading') {
    return (
        <div className="main-container" style={{ padding: "2rem", backgroundColor: "#E9ECEF", minHeight: "100vh" }}>
            <LoadingSpinner text="A verificar permissões..." />
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

  const renderActiveShape = (props: any) => {
    const RADIAN = Math.PI / 180;
    const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
    const sin = Math.sin(-RADIAN * midAngle);
    const cos = Math.cos(-RADIAN * midAngle);
    const sx = cx + (outerRadius + 2) * cos; // Diminuído o popout
    const sy = cy + (outerRadius + 2) * sin;
    const mx = cx + (outerRadius + 15) * cos; // Diminuída a linha
    const my = cy + (outerRadius + 15) * sin;
    const ex = mx + (cos >= 0 ? 1 : -1) * 15; // Diminuída a linha
    const ey = my;
    const textAnchor = cos >= 0 ? 'start' : 'end';
    
    // Define a cor do texto com base no tema
    const labelFillColor = theme === 'dark' ? '#F1F5F9' : '#333';
    const percentFillColor = theme === 'dark' ? '#94A3B8' : '#999';

    return (
      <g>
        <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius} startAngle={startAngle} endAngle={endAngle} fill={fill} />
        <Sector cx={cx} cy={cy} startAngle={startAngle} endAngle={endAngle} innerRadius={outerRadius + 4} outerRadius={outerRadius + 8} fill={fill} /> {/* Aumentado o pop-out */}
        <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
        <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
        <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={textAnchor} fill={labelFillColor} style={{ fontSize: '13px' }}>{`${payload.name}`}</text>
        <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} dy={18} textAnchor={textAnchor} fill={percentFillColor} style={{ fontSize: '12px' }}>{`(${value} - ${(percent * 100).toFixed(1)}%)`}</text>
      </g>
    );
  };

  // --- COMPONENTE CHECKBOX FINAL (RESTAURADO COM LÓGICA CORRIGIDA) ---
  const ConferidoCheckbox = ({ conferido, onClick }: { conferido: 'S' | 'N' | null | undefined, onClick: () => void }) => {
    // Log removido, pois confirmamos que o valor chega corretamente.
    // console.log(`ConferidoCheckbox FINAL - Recebido: '${conferido}'`);

    const isChecked = conferido === 'S';
    // Usa as variáveis CSS originais para cor
    const color = isChecked ? 'var(--gcs-green)' : 'var(--gcs-gray-dark)';

    return (
        <button
            onClick={onClick}
            title={isChecked ? "Desmarcar conferência" : "Marcar como conferido"}
            disabled={isSubmittingConferencia} // Usa a variável do escopo pai
            style={{
                background: 'none',
                border: 'none', // Sem borda extra
                cursor: isSubmittingConferencia ? 'wait' : 'pointer',
                padding: '4px', // Padding original
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: color, // Cor baseada no estado
                opacity: isSubmittingConferencia ? 0.5 : 1, // Opacidade se estiver submetendo
                // Animação de giro pode ser adicionada aqui se desejar,
                // mas requer passar qual nota está sendo processada.
                // Ex: animation: isProcessingThisNota ? 'spin 1s linear infinite' : 'none'
            }}
            className="conferido-checkbox-btn" // Classe para o tema escuro
        >
            {/* Renderização condicional direta dos ícones */}
            {isChecked ? (
                <CheckSquare size={20} />
            ) : (
                <Square size={20} />
            )}
            {/* Texto de debug removido */}
        </button>
    );
  };


  return (<>
    {/* --- SVG DE GRADIENTES (DO VISÃO GERAL) --- */}
    <svg width="0" height="0" style={{ position: 'absolute', zIndex: -1 }}>
        <defs>
          <linearGradient id="gradLaranja" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f79b4d" />
            <stop offset="100%" stopColor="#F58220" />
          </linearGradient>
          <linearGradient id="gradVerde" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#9DDE5B" />
            <stop offset="100%" stopColor="#5FB246" />
          </linearGradient>
          {/* --- NOVOS GRADIENTES ADICIONADOS --- */}
          <linearGradient id="gradVermelho" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ff6f61" />
            <stop offset="100%" stopColor="#E11D2E" />
          </linearGradient>
          <linearGradient id="gradAmarelo" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFC107" />
            <stop offset="100%" stopColor="#EA580C" />
          </linearGradient>
          <linearGradient id="gradAzul" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1F4E79" />
            <stop offset="100%" stopColor="#00314A" />
          </linearGradient>
          <linearGradient id="gradAzulClaro" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#17a2b8" />
            <stop offset="100%" stopColor="#1F4E79" />
          </linearGradient>
          <linearGradient id="gradCinza" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6c757d" />
            <stop offset="100%" stopColor="#343a40" />
          </linearGradient>
        </defs>
    </svg>

    {/* --- BLOCO DE ESTILO GLOBAL ATUALIZADO --- */}
    <style>{`
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

            /* Cores do Funil (usadas pelo novo componente) */
            --gcs-red-light-bg: #f8d7da;
            --gcs-red-border: #f1c2c7;
            --gcs-red-text: #b22c38;
            --gcs-brand-red: #E11D2E;

            --gcs-orange-light-bg: #fff8e1;
            --gcs-orange-border: #FDBA74;
            --gcs-orange-text: #F58220;
            --gcs-brand-orange: #EA580C;

            --gcs-blue-light-bg: #f1f5fb;
            --gcs-blue-border: #a3b8d1;
            --gcs-blue-text: #00314A;
            --gcs-brand-blue: #1F4E79;
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        
        /* --- ESTILOS DE BASE (COMUNS) --- */
        .btn { cursor: pointer; font-weight: 600; display: inline-flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s ease-in-out; border: 1px solid transparent; padding: 10px 20px; border-radius: 8px; }
        .btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .btn:disabled { cursor: not-allowed; opacity: 0.6; }
        
        .th-sortable { cursor: pointer; transition: color 0.2s ease-in-out; user-select: none; display: flex; align-items: center; }
        .th-sortable:hover { color: #ffffffd0; }

        .status-badge {
            padding: 4px 10px;
            border-radius: 16px;
            color: #fff;
            font-weight: 500;
            font-size: 12px;
            display: inline-block;
            text-align: center;
            min-width: 80px;
        }
        
        .clickable-chart .recharts-pie-sector path {
            cursor: pointer;
            transition: all 0.3s ease;
        }
        .chart-3d-effect .recharts-pie-sector path {
            stroke: #fff;
            stroke-width: 1px;
            filter: drop-shadow(1px 1px 1px rgba(0,0,0,0.1))
                    drop-shadow(2px 2px 0px rgba(0,0,0,0.09))
                    drop-shadow(3px 3px 0px rgba(0,0,0,0.08))
                    drop-shadow(4px 4px 0px rgba(0,0,0,0.07))
                    drop-shadow(5px 5px 0px rgba(0,0,0,0.06));
        }

        /* --- MODO CLARO --- */
        body.light {
            background-color: #E9ECEF !important;
            transition: background 0.3s ease;
        }
        body.light .main-container {
            background-color: #E9ECEF;
        }
        body.light .btn-green { background-color: var(--gcs-green); color: white; }
        body.light .btn-green:hover:not(:disabled) { background-color: #4a9d3a; }
        body.light .btn-dark-gray {
            background-color: #344054; color: white; padding: 8px 16px;
            font-size: 14px; border: 1px solid #1d2939; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        }
        body.light .btn-dark-gray:hover:not(:disabled) { background-color: #1d2939; }
        body.light .btn-outline-gray { background-color: #fff; color: var(--gcs-gray-dark); border-color: var(--gcs-border-color); }
        body.light .btn-outline-gray:hover:not(:disabled) { border-color: var(--gcs-gray-dark); background-color: var(--gcs-gray-light); }
        body.light .btn-outline-blue { background-color: #fff; color: var(--gcs-blue); border-color: var(--gcs-border-color); }
        body.light .btn-outline-blue:hover:not(:disabled) { border-color: var(--gcs-blue); background-color: #f1f5fb; }

        body.light .ant-pagination-item-active { background-color: var(--gcs-blue) !important; border-color: var(--gcs-blue) !important; }
        body.light .ant-pagination-item-active a { color: white !important; }

        body.light .data-row:hover { background-color: var(--gcs-gray-light) !important; cursor: default; }
        body.light .kpi-card, body.light .chart-card, body.light .main-content-card, body.light .content-card, body.light .responsive-table-wrapper {
            background-color: #fff; border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08); border: 1px solid var(--gcs-border-color);
        }
        /* Ajuste para PriorityRibbonTabs */
        body.light .tabs-card {
            background: transparent;
            border: none;
            box-shadow: none;
        }
        body.light .kpi-card, body.light .chart-card, body.light .main-content-card, body.light .content-card { padding: 1.5rem; }
        /* body.light .tabs-card { padding: 1rem 1.5rem; } */ /* Removido para PriorityRibbonTabs */

        body.light .responsive-table thead { background-color: var(--gcs-blue); color: #fff; }
        body.light .responsive-table tbody tr { border-top: 1px solid var(--gcs-border-color); }
        body.light .responsive-table tbody tr:nth-of-type(odd) { background-color: #ffffff; }
        body.light .responsive-table tbody tr:nth-of-type(even) { background-color: var(--gcs-gray-light); }
        body.light .responsive-table td { color: #333; }
        body.light .responsive-table td::before { color: var(--gcs-blue); }

        /* CORREÇÃO TABELA */
        body.light .table-note-number { font-weight: bold; color: #343a40; }
        body.light .table-note-series { color: var(--gcs-gray-dark); }


        body.light .recharts-default-tooltip {
            border-radius: 12px !important;
            border: 1px solid rgba(255,255,255,.35) !important;
            background: rgba(255,255,255,.25) !important;
            backdrop-filter: blur(14px) saturate(140%) !important;
            -webkit-backdrop-filter: blur(14px) saturate(140%) !important;
            box-shadow: 0 8px 24px rgba(0,0,0,.12) !important;
            color: #00314A !important;
        }
        body.light .recharts-legend-item-text { color: #333 !important; }
        body.light .loading-text { color: var(--gcs-blue); }

        /* Botão de Tema - Modo Claro */
        .theme-toggle-btn {
          background: none; border: 1px solid transparent; border-radius: 8px; padding: 9px; cursor: pointer;
          display: flex; align-items: center; justify-content: center; transition: all 0.2s ease;
        }
        body.light .theme-toggle-btn { 
          color: var(--gcs-gray-dark); 
          border-color: var(--gcs-border-color); 
          background: #fff;
        }
        body.light .theme-toggle-btn:hover { 
          background: var(--gcs-gray-light); 
          border-color: var(--gcs-gray-dark);
        }

        /* Popover de Filtro - Modo Claro */
        body.light .filter-popover-content {
            background-color: white;
            border: 1px solid var(--gcs-border-color);
        }
        body.light .filter-popover-content h4 { color: var(--gcs-blue); }
        body.light .filter-popover-content label { color: #333; }
        body.light .filter-popover-content input,
        body.light .filter-popover-content select {
            background-color: #fff;
            color: #333;
            border: 1px solid var(--gcs-border-color);
        }

        /* --- MODO ESCURO --- */
        body.dark {
          background-image: url('/img_fundo_glass.png') !important;
          background-size: cover !important;
          background-position: center center !important;
          background-attachment: fixed !important;
          transition: background 0.3s ease;
        }
        body.dark .main-container {
            background-color: transparent !important;
        }
        
        /* Cards de Vidro */
        body.dark .kpi-card, 
        body.dark .chart-card, 
        body.dark .main-content-card, 
        /* body.dark .tabs-card, */ /* Removido para PriorityRibbonTabs */
        body.dark .content-card,
        body.dark .responsive-table-wrapper {
          background: rgba(25, 39, 53, 0.25) !important;
          backdrop-filter: blur(16px) !important;
          -webkit-backdrop-filter: blur(16px) !important;
          border: 1px solid rgba(125, 173, 222, 0.2) !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1) !important;
        }
        /* Ajuste para PriorityRibbonTabs */
        body.dark .tabs-card {
            background: transparent;
            border: none;
            box-shadow: none;
        }

        body.dark .kpi-card, body.dark .chart-card, body.dark .main-content-card, body.dark .content-card { padding: 1.5rem; }
        /* body.dark .tabs-card { padding: 1rem 1.5rem; } */ /* Removido para PriorityRibbonTabs */

        /* Textos */
        body.dark .page-title,
        body.dark .page-title svg {
          color: #F1F5F9 !important;
        }
        /* Cores dos Textos de Rodapé do Header */
        body.dark .time-ago-text { 
          color: #BFDBFE !important; /* Azul claro para melhor contraste */
        }
        body.dark .filter-applied-text { 
          color: #FECACA !important; /* Vermelho mais claro para melhor contraste */
        }
        /* Cores dos KPIs */
        body.dark h4, body.dark .kpi-title { /* Título do gráfico E Título KPI */
          color: #E2E8F0 !important; /* Branco Suave */
        }
        /* Cores fortes KPI */
        body.dark .kpi-value-green { color: #86EFAC !important; } /* Verde mais claro */
        body.dark .kpi-value-orange { color: #FDBA74 !important; } /* Laranja mais claro */

        body.dark .loading-text { color: #93C5FD; }
        body.dark .ant-pagination-total-text { color: #CBD5E1 !important; }
        
        /* Botões */
        body.dark .btn-green { background-color: var(--gcs-green); color: white; } /* Mantém verde */
        body.dark .btn-green:hover:not(:disabled) { background-color: #4a9d3a; }
        
        body.dark .btn-dark-gray {
            background-color: rgba(30, 41, 59, 0.7); color: #E2E8F0; padding: 8px 16px;
            font-size: 14px; border: 1px solid rgba(125, 173, 222, 0.3);
        }
        body.dark .btn-dark-gray:hover:not(:disabled) { background-color: rgba(51, 65, 85, 0.8); }

        body.dark .btn-outline-gray,
        body.dark .btn-outline-blue {
          background-color: rgba(25, 39, 53, 0.5) !important;
          color: #E2E8F0 !important;
          border-color: rgba(125, 173, 222, 0.3) !important;
        }
        body.dark .btn-outline-gray:hover:not(:disabled),
        body.dark .btn-outline-blue:hover:not(:disabled) {
          background-color: rgba(40, 60, 80, 0.7) !important;
          border-color: rgba(125, 173, 222, 0.5) !important;
        }

        /* Botão de Tema - Modo Escuro (CORRIGIDO) */
        body.dark .theme-toggle-btn { 
          background-color: rgba(25, 39, 53, 0.5) !important;
          color: #E2E8F0 !important;
          border-color: rgba(125, 173, 222, 0.3) !important;
        }
        body.dark .theme-toggle-btn:hover { 
          background-color: rgba(40, 60, 80, 0.7) !important;
          border-color: rgba(125, 173, 222, 0.5) !important;
        }
        
        /* Input de Busca */
        body.dark .search-input {
          background-color: rgba(25, 39, 53, 0.5) !important;
          color: #E2E8F0 !important;
          border-color: rgba(125, 173, 222, 0.3) !important;
        }
        body.dark .search-input::placeholder { color: #94A3B8; }

        /* Tabela */
        body.dark .responsive-table thead { background-color: var(--gcs-blue); color: #fff; }
        body.dark .responsive-table tbody tr {
            background-color: transparent !important;
            border-top: 1px solid rgba(125, 173, 222, 0.2) !important;
        }
        body.dark .responsive-table tbody tr:nth-of-type(even) {
            background-color: rgba(25, 39, 53, 0.15) !important;
        }
        body.dark .data-row:hover {
            background-color: rgba(40, 60, 80, 0.3) !important;
        }
        body.dark .responsive-table td { color: #CBD5E1; }
        body.dark .conferido-checkbox-btn { color: #94A3B8; } /* Cor do checkbox não conferido */
        body.dark .conferido-checkbox-btn[style*="rgb(40, 167, 69)"] { color: var(--gcs-green) !important; } /* Cor do conferido */

        /* CORREÇÃO TABELA */
        body.dark .table-note-number { font-weight: bold; color: #E2E8F0; }
        body.dark .table-note-series { color: #94A3B8; }


        /* Tabela Mobile */
        body.dark .responsive-table tr { /* card da linha mobile */
            border: 1px solid rgba(125, 173, 222, 0.2) !important;
        }
        body.dark .responsive-table td {
            border-bottom: 1px solid rgba(125, 173, 222, 0.1) !important;
        }
        body.dark .responsive-table td::before { color: #93C5FD; }

        /* Paginação */
        body.dark .ant-pagination-total-text { color: #CBD5E1 !important; }
        body.dark .ant-pagination-item a,
        body.dark .ant-pagination-item-link {
          color: #CBD5E1 !impoRtant;
        }
        body.dark .ant-pagination-item {
          background-color: transparent !important;
          border-color: rgba(125, 173, 222, 0.3) !important;
        }
        body.dark .ant-pagination-item-active {
          background-color: #3B82F6 !important;
          border-color: #3B82F6 !important;
        }
        body.dark .ant-pagination-item-active a { color: white !important; }
        body.dark .ant-pagination-disabled .ant-pagination-item-link { color: #475569 !important; }

        /* Popover de Filtro */
        body.dark .filter-popover-content {
            background: rgba(25, 39, 53, 0.98) !important; 
            backdrop-filter: blur(8px) !important;
            -webkit-backdrop-filter: blur(8px) !important;
            border: 1px solid rgba(125, 173, 222, 0.3) !important;
            box-shadow: 0 8px 24px rgba(0,0,0,0.3) !important;
        }
        body.dark .filter-popover-content h4 { color: #F1F5F9 !important; }
        body.dark .filter-popover-content label { color: #CBD5E1; }
        body.dark .filter-popover-content input[type="date"],
        body.dark .filter-popover-content select {
            background-color: rgba(25, 39, 53, 0.5) !important;
            color: #E2E8F0 !important;
            border-color: rgba(125, 173, 222, 0.3) !important;
        }
        body.dark .filter-popover-content input[type="date"]::-webkit-calendar-picker-indicator {
            filter: invert(1);
        }

        /* Gráfico Recharts */
        body.dark .recharts-default-tooltip {
            border: 1px solid rgba(125,173,222,.28) !important;
            background: rgba(25,39,53,.50) !important;
            color: #E2E8F0 !important;
            border-radius: 12px !important;
            backdrop-filter: blur(14px) saturate(140%) !important;
            -webkit-backdrop-filter: blur(14px) saturate(140%) !important;
            box-shadow: 0 8px 24px rgba(0,0,0,.12) !important;
        }
        body.dark .recharts-legend-item-text {
            color: #E2E8F0 !important;
        }
        
        /* Estilos do PriorityRibbonTabs */
        body.dark .ribbon-card {
          background: rgba(25, 39, 53, 0.25) !important;
          backdrop-filter: saturate(180%) blur(10px) !important;
          -webkit-backdrop-filter: saturate(180%) blur(10px) !important;
          border: 1px solid rgba(125, 173, 222, 0.2) !important;
          box-shadow: 0 8px 24px rgba(0,0,0,0.1) !important;
        }
        
        /* Fundos de vidro coloridos para cada segmento */
        body.dark .seg.p1 { background: linear-gradient(110deg, rgba(225, 29, 46, 0.15), rgba(225, 29, 46, 0.25)) !important; }
        body.dark .seg.p2 { background: linear-gradient(110deg, rgba(234, 88, 12, 0.15), rgba(234, 88, 12, 0.25)) !important; }
        body.dark .seg.p3 { background: linear-gradient(110deg, rgba(59, 130, 246, 0.15), rgba(59, 130, 246, 0.25)) !important; }
        
        body.dark .seg:hover {
          background: rgba(40, 60, 80, 0.3) !important; /* Fundo de hover genérico */
        }

        /* Textos e Tags dos Segmentos */
        body.dark .seg-head { color: #F1F5F9 !important; } /* Título (URGENTE) - Cor base */
        body.dark .tag { /* Tag (01) - Cor base */
          background: rgba(10, 20, 30, 0.5) !important;
          border-color: rgba(125, 173, 222, 0.2) !important;
          color: #E2E8F0 !important;
        }
        
        /* APLICANDO AS CORES DE PRIORIDADE (PONTO 2 da nova task) */
        body.dark .p1 .tag { 
          color: #FCA5A5 !important; /* Vermelho claro */
          border-color: #EF4444 !important; /* Vermelho vivo */
          background: rgba(239, 68, 68, 0.15) !important; /* Fundo vermelho leve */
        }
        body.dark .p1 .title { color: #FCA5A5 !important; } /* Texto URGENTE */
        
        body.dark .p2 .tag { 
          color: #FDBA74 !important; /* Laranja claro */
          border-color: #F97316 !important; /* Laranja vivo */
          background: rgba(249, 115, 22, 0.15) !important; /* Fundo laranja leve */
        }
        body.dark .p2 .title { color: #FDBA74 !important; } /* Texto PENDÊNCIAS */
        
        body.dark .p3 .tag { 
          color: #BFDBFE !important; /* Azul claro */
          border-color: #3B82F6 !important; /* Azul vivo */
          background: rgba(59, 130, 246, 0.15) !important; /* Fundo azul leve */
        }
        body.dark .p3 .title { color: #BFDBFE !important; } /* Texto MONITORAR */

        /* Botões internos (SegmentItem) - Padrão (Todos) */
        body.dark .seg-item {
          color: #E2E8F0 !important;
          background: linear-gradient(180deg, rgba(25, 39, 53, 0.25), rgba(25, 39, 53, 0.4)) !important;
          border-color: rgba(125, 173, 222, 0.2) !important;
        }
        body.dark .seg-item:hover {
           border-color: rgba(125, 173, 222, 0.5) !important;
        }
        body.dark .seg-item[aria-pressed="true"] { /* "Todos" Ativo */
          border-color: #3B82F6 !important;
          box-shadow: 0 6px 16px rgba(0,0,0,.06), 0 0 0 4px rgba(59, 130, 246, 0.15) !important;
          background: linear-gradient(180deg, rgba(59, 130, 246, 0.2), rgba(59, 130, 246, 0.3)) !important;
          color: #F1F5F9 !important;
        }

        /* --- P1 (Vermelho) Botões --- */
        body.dark .p1 .seg-item {
          color: #FCA5A5 !important;
          background: linear-gradient(180deg, rgba(225, 29, 46, 0.2), rgba(225, 29, 46, 0.3)) !important;
          border-color: rgba(239, 68, 68, 0.3) !important;
        }
        body.dark .p1 .seg-item:hover {
          color: #FEE2E2 !important;
          background: linear-gradient(180deg, rgba(225, 29, 46, 0.3), rgba(225, 29, 46, 0.4)) !important;
          border-color: rgba(239, 68, 68, 0.5) !important;
        }
        body.dark .p1 .seg-item[aria-pressed="true"] { /* P1 Ativo */
          color: #F1F5F9 !important;
          background: linear-gradient(180deg, rgba(225, 29, 46, 0.3), rgba(225, 29, 46, 0.4)) !important;
          border-color: var(--gcs-brand-red, #E11D2E) !important;
          box-shadow: 0 6px 16px rgba(0,0,0,.06), 0 0 0 4px rgba(225, 29, 46, 0.15) !important;
        }

        /* --- P2 (Laranja) Botões --- */
        body.dark .p2 .seg-item {
          color: #FDBA74 !important;
          background: linear-gradient(180deg, rgba(234, 88, 12, 0.2), rgba(234, 88, 12, 0.3)) !important;
          border-color: rgba(249, 115, 22, 0.3) !important;
        }
        body.dark .p2 .seg-item:hover {
          color: #FFEDD5 !important;
          background: linear-gradient(180deg, rgba(234, 88, 12, 0.3), rgba(234, 88, 12, 0.4)) !important;
          border-color: rgba(249, 115, 22, 0.5) !important;
        }
        body.dark .p2 .seg-item[aria-pressed="true"] { /* P2 Ativo */
          color: #F1F5F9 !important;
          background: linear-gradient(180deg, rgba(234, 88, 12, 0.3), rgba(234, 88, 12, 0.4)) !important;
          border-color: var(--gcs-brand-orange, #EA580C) !important;
          box-shadow: 0 6px 16px rgba(0,0,0,.06), 0 0 0 4px rgba(234, 88, 12, 0.15) !important;
        }
        
        /* --- P3 (Azul) Botões --- */
        body.dark .p3 .seg-item {
          color: #BFDBFE !important;
          background: linear-gradient(180deg, rgba(59, 130, 246, 0.2), rgba(59, 130, 246, 0.3)) !important;
          /* CORREÇÃO BORDA AZUL: Aumentada opacidade de 0.3 para 0.7 */
          border-color: rgba(59, 130, 246, 0.7) !important;
        }
        body.dark .p3 .seg-item:hover {
          color: #EBF8FF !important;
          background: linear-gradient(180deg, rgba(59, 130, 246, 0.3), rgba(59, 130, 246, 0.4)) !important;
          /* CORREÇÃO BORDA AZUL: Aumentada opacidade de 0.5 para 0.9 */
          border-color: rgba(59, 130, 246, 0.9) !important;
        }
        body.dark .p3 .seg-item[aria-pressed="true"] { /* P3 Ativo */
          color: #F1F5F9 !important;
          background: linear-gradient(180deg, rgba(59, 130, 246, 0.3), rgba(59, 130, 246, 0.4)) !important;
          border-color: var(--gcs-brand-blue, #3B82F6) !important;
          box-shadow: 0 6px 16px rgba(0,0,0,.06), 0 0 0 4px rgba(59, 130, 246, 0.15) !important;
        }
        
        /* Tooltip AntD */
        .ant-tooltip-inner {
          background-color: var(--gcs-blue) !important;
          color: white !important;
          border-radius: 6px !important;
        }
        .ant-tooltip-arrow::before,
        .ant-tooltip-arrow::after {
          background: var(--gcs-blue) !important;
        }
        body.dark .ant-tooltip-inner {
           background: rgba(25,39,53,0.9) !important;
           color: #E2E8F0 !important;
           border: 1px solid rgba(125, 173, 222, 0.2) !important;
        }
         body.dark .ant-tooltip-arrow::before,
         body.dark .ant-tooltip-arrow::after {
          background: rgba(25,39,53,0.9) !important;
        }


        /* --- RESPONSIVIDADE (MEDIA QUERIES) --- */
        @media (max-width: 1200px) {
            .header-wrapper {
                flex-direction: column;
                align-items: center;
                gap: 1.5rem;
            }
             .main-content-card, .kpi-card {
                width: 100%;
             }
        }

        @media (max-width: 768px) {
            .main-container {
                padding: 1rem;
            }
            .page-title {
                font-size: 1.25rem;
                text-align: center;
            }
            .controls-group {
                flex-direction: column;
                align-items: stretch;
                width: 100%;
            }
            .search-input {
                width: 100%;
            }

             .header-wrapper {
                gap: 1rem;
             }
             body.light .kpi-card, body.light .chart-card, body.light .main-content-card,
             body.dark .kpi-card, body.dark .chart-card, body.dark .main-content-card {
                padding: 1rem;
             }
             /* Ajuste para PriorityRibbonTabs */
             body.light .tabs-card, body.dark .tabs-card {
                padding: 0;
             }


            .responsive-table thead {
                display: none;
            }
            .responsive-table tbody,
            .responsive-table tr,
            .responsive-table td {
                display: block;
                width: 100%;
            }
            .responsive-table tr {
                margin-bottom: 1rem;
                border-radius: 8px;
                padding: 0.5rem 1rem;
            }
            body.light .responsive-table tr { border: 1px solid var(--gcs-border-color); }
            .responsive-table td {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 0.8rem 0;
            }
            body.light .responsive-table td { border-bottom: 1px solid var(--gcs-gray-medium); }
            .responsive-table tr td:last-child {
                border-bottom: none;
            }
            .responsive-table td::before {
                content: attr(data-label);
                font-weight: bold;
                margin-right: 1rem;
            }
            
            body.light .responsive-table td::before { color: var(--gcs-blue); }
            body.dark .responsive-table td::before { color: #93C5FD; }

            .td-status, .td-actions {
                justify-content: flex-start;
            }
            .td-actions .btn {
                width: 100%;
            }
        }
    `}</style>

    <div className="main-container" style={{ padding: "2rem", minHeight: "100vh" }}>

      <div className="header-wrapper" style={{ display: 'flex', alignItems: 'stretch', gap: '1.5rem', marginBottom: '1.5rem' }}>

        <div
            className="chart-card clickable-chart"
            style={{
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                minWidth: '280px',
                paddingTop: '1rem',
                paddingBottom: '1rem',
            }}
        >
            <h4 style={{ margin: 0, color: 'var(--gcs-gray-dark)', fontWeight: 500, fontSize: '1rem' }}>
                Gráfico por Status
            </h4>
            {/* --- GRÁFICO RECHARTS ATUALIZADO (PONTO 1) --- */}
            <div style={{ width: 280, height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart key={chartKey}>
                        <Pie
                            data={dadosGraficoStatus}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="45%"
                            innerRadius={50} // Estilo Donut
                            outerRadius={80} // Estilo Donut
                            cornerRadius={8} // Estilo Donut
                            stroke={theme === 'dark' ? "rgba(25, 39, 53, 0.5)" : "rgba(255,255,255,.35)"} // Estilo Donut
                            strokeWidth={1} // Estilo Donut
                            paddingAngle={3}
                            // Mantendo a interatividade que você já tinha
                            activeIndex={activeIndex}
                            activeShape={renderActiveShape}
                            onMouseEnter={onPieEnter}
                            onMouseLeave={onPieLeave}
                            onClick={(data) => handleChartClick(data.payload.payload)} // Corrigido para pegar o payload
                        >
                            {dadosGraficoStatus.map((entry, index) => {
                                // Mapeia cores/gradientes
                                const pieFill = coresStatusDonut[entry.name] || coresStatus[entry.name] || '#ccc';
                                return <Cell key={`cell-${index}`} fill={pieFill} />;
                            })}
                        </Pie>
                        <Legend
                            layout="horizontal"
                            align="center"
                            verticalAlign="bottom"
                            iconSize={10}
                            wrapperStyle={{ fontSize: '12px', marginTop: '10px' }}
                            formatter={renderLegendText}
                        />
                        {/* ADICIONADO: Tooltip com estilos dinâmicos */}
                        <RechartsTooltip 
                            contentStyle={glassTooltipStyle} 
                            labelStyle={tooltipLabelStyle} 
                            itemStyle={tooltipItemStyle} 
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>

        <div className="main-content-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '1.5rem', paddingTop: '0.5rem', paddingBottom: '0.5rem' }}>
            <h2 className="page-title" style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold', color: 'var(--gcs-blue)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <FileText size={32} />
                <span>Central de Notas</span>
            </h2>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <input
                        type="text"
                        placeholder="Buscar por fornecedor, nota ou chave"
                        value={buscaRaw}
                        onChange={(e) => setBuscaRaw(e.target.value)}
                        className="search-input"
                        style={{ padding: "12px 16px", fontSize: "1rem", borderRadius: "8px", border: "1px solid var(--gcs-border-color)", width: "350px" }}
                    />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button onClick={fetchNotas} title="Atualizar Notas Fiscais" className="btn btn-outline-gray" style={{padding: '9px'}}>
                            <RefreshCcw size={20} />
                        </button>
                        <FilterPopover
                            allFiliais={allFiliais}
                            allTipos={allTipos}
                            allCompradores={allCompradores}
                            allStatusLancamento={allStatusLancamento}
                            onApplyFilters={handleApplyAdvancedFilters}
                            initialFilters={advancedFilters}
                         />
                        <button onClick={handleExportXLSX} title="Exportar para Excel" className="btn btn-outline-blue" style={{padding: '9px'}}>
                            <FileDown size={20} />
                        </button>
                        {/* --- BOTÃO DE TEMA ADICIONADO --- */}
                        <button
                          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                          className="theme-toggle-btn"
                          title={theme === 'light' ? 'Mudar para tema escuro' : 'Mudar para tema claro'}
                        >
                          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                        </button>
                    </div>
                    <div style={{ height: 'auto', marginTop: '0.25rem', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                        {timeAgo && !loading && (
                          <span className="time-ago-text" style={{ color: 'var(--gcs-gray-dark)', fontSize: '12px', fontStyle: 'italic' }}>
                              Atualizado {timeAgo}
                          </span>
                        )}
                        {areFiltersApplied && !loading && (
                          <span className="filter-applied-text" style={{ color: '#dc3545', fontSize: '12px', fontWeight: 'bold' }}>
                              Existem filtros aplicados
                          </span>
                        )}
                    </div>
                </div>
            </div>
        </div>

        <div className="kpi-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-around' }}>
            <div style={{ textAlign: 'center' }}>
                <h4 className="kpi-title" style={{ color: 'var(--gcs-gray-dark)', margin: 0, fontWeight: 500, fontSize: '1rem', marginBottom: '0.25rem' }}>
                    Notas Hoje
                </h4>
                <p className="kpi-value-green" style={{ fontSize: '2.2rem', margin: 0, color: 'var(--gcs-green)', fontWeight: 'bold', lineHeight: 1.2 }}>
                    {totalNotasHoje}
                </p>
            </div>

            <hr style={{ width: '80%', border: 'none', borderTop: '1px solid var(--gcs-border-color)', margin: '0.5rem 0' }} />

            <div style={{ textAlign: 'center' }}>
                <h4 className="kpi-title" style={{ color: 'var(--gcs-gray-dark)', margin: 0, fontWeight: 500, fontSize: '1rem', marginBottom: '0.25rem' }}>
                    Pendentes
                </h4>
                <p className="kpi-value-orange" style={{ fontSize: '2.2rem', margin: 0, color: 'var(--gcs-orange)', fontWeight: 'bold', lineHeight: 1.2 }}>
                    {totalPendentes}
                </p>
            </div>
        </div>
      </div>

      <div className="tabs-card" style={{
          marginBottom: '1.5rem',
          padding: 0,
          background: 'transparent',
          border: 'none',
          boxShadow: 'none'
      }}>
        <PriorityRibbonTabs
          filtroStatus={filtroStatus}
          statusCounts={statusCounts as any}
          onChange={(key) => {
            if (key === "outras") return;
            handleFiltroStatusChange(key);
          }}
        />
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem' }}>
          <div style={{ width: '40px', height: '40px', border: '4px solid var(--gcs-gray-medium)', borderTop: '4px solid var(--gcs-blue)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <div style={{ marginTop: '1rem', fontWeight: 'bold', color: 'var(--gcs-blue)' }} className="loading-text">
            Carregando notas...
          </div>
        </div>
      ) : notasPaginadas.length === 0 ? (
        <div style={{ textAlign: "center", color: "var(--gcs-gray-dark)", marginTop: "4rem", fontSize: '1.1rem' }}>
          Nenhuma nota encontrada para os filtros aplicados.
        </div>
      ) : (
        <>
          <div className="responsive-table-wrapper" style={{ overflowX: "auto", border: "1px solid var(--gcs-border-color)", borderRadius: "12px", background: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <table className="responsive-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: '14px' }}>
              <thead style={{ backgroundColor: "var(--gcs-blue)", color: "#fff", textAlign: "left" }}>
                <tr>
                  <th style={{ padding: "16px 12px", textAlign: 'center', borderTopLeftRadius: '12px' }}><div className="th-sortable" style={{justifyContent: 'center'}}><CheckSquare size={16} style={{marginRight: '8px'}} /> Conferido</div></th>
                  <th style={{ padding: "16px 12px", textAlign: 'center' }}><div className="th-sortable" style={{justifyContent: 'center'}}><BadgeCheck size={16} style={{marginRight: '8px'}} /> Status da Nota</div></th>
                  <th style={{ padding: "16px 12px" }}><div onClick={() => requestSort('filial')} className="th-sortable"><Building2 size={16} style={{marginRight: '8px'}} /> Filial <SortIcon columnKey="filial" /></div></th>
                  <th style={{ padding: "16px 12px" }}><div onClick={() => requestSort('nf')} className="th-sortable"><Hash size={16} style={{marginRight: '8px'}} /> Nota / Série <SortIcon columnKey="nf" /></div></th>
                  <th style={{ padding: "16px 12px", textAlign: 'center' }}><div onClick={() => requestSort('tipo_nf')} className="th-sortable" style={{justifyContent: 'center'}}><FileText size={16} style={{marginRight: '8px'}} /> Tipo <SortIcon columnKey="tipo_nf" /></div></th>
                  <th style={{ padding: "16px 12px" }}><div onClick={() => requestSort('nome_fornecedor')} className="th-sortable"><Truck size={16} style={{marginRight: '8px'}} /> Fornecedor <SortIcon columnKey="nome_fornecedor" /></div></th>
                  {/* --- COLUNAS DE DATA SUBSTITUÍDAS --- */}
                  <th style={{ padding: "16px 12px", textAlign: 'center' }}><div className="th-sortable" style={{justifyContent: 'center'}}><Calendar size={16} style={{marginRight: '8px'}}/> Datas</div></th>
                  <th style={{ padding: "16px 12px", textAlign: 'center' }}><div className="th-sortable" style={{justifyContent: 'center'}}><TrendingUp size={16} style={{marginRight: '8px'}} /> Status Setor</div></th>
                  <th style={{ padding: "16px 12px" }}><div onClick={() => requestSort('observacao')} className="th-sortable"><MessageSquare size={16} style={{marginRight: '8px'}}/> Observação <SortIcon columnKey="observacao" /></div></th>
                  <th style={{ padding: "16px 12px" }}><div onClick={() => requestSort('comprador')} className="th-sortable"><User size={16} style={{marginRight: '8px'}} /> Responsável <SortIcon columnKey="comprador" /></div></th>
                  <th style={{ padding: "16px 12px", textAlign: 'center', borderTopRightRadius: '12px' }}><div className="th-sortable" style={{justifyContent: 'center'}}><Settings2 size={16} style={{marginRight: '8px'}} /> Ações</div></th>
                </tr>
              </thead>
              <tbody>
                {notasPaginadas.map((nota, index) => {

                  const statusLancamento = nota.status_lancamento;
                  const statusNotaTexto = statusLancamento || 'N/A';
                  let statusNotaCor = 'var(--gcs-gray-dark)';

                  if (statusLancamento === 'Concluído') {
                      statusNotaCor = 'var(--gcs-green)';
                  } else if (statusLancamento === 'Pendente') {
                      statusNotaCor = 'var(--gcs-orange)';
                  }

                  // --- CONTEÚDO DO TOOLTIP DE DATA ---
                  const dateTooltipContent = (
                    <div style={{fontSize: '12px', textAlign: 'left'}}>
                        <div style={{marginBottom: '4px'}}><strong>Recebimento:</strong> {nota.dt_recebimento} {nota.hr_Recebimento}</div>
                        <div><strong>Lançamento:</strong> {formatProtheusDateTime(nota.dt_lcto_protheus)}</div>
                    </div>
                  );

                  return (
                    <tr
                      key={nota.chave} // Usar a chave como key é mais seguro
                      className="data-row"
                    >
                      <td data-label="Conferido" className="td-conferido" style={{ padding: '14px 12px', verticalAlign: 'middle', textAlign: 'center' }}>
                          <ConferidoCheckbox
                              conferido={nota.conferido}
                              onClick={() => handleCheckboxClick(nota)}
                          />
                      </td>
                      <td data-label="Status da Nota" className="td-status" style={{ padding: '14px 12px', verticalAlign: 'middle', textAlign: 'center' }}>
                        <span
                          className="status-badge"
                          style={{ backgroundColor: statusNotaCor }}
                        >
                          {statusNotaTexto}
                        </span>
                      </td>
                      <td data-label="Filial" style={{ padding: '14px 12px', verticalAlign: 'middle' }}>{nota.filial}</td>
                      <td data-label="Nota / Série" style={{ padding: '14px 12px', verticalAlign: 'middle', whiteSpace: "nowrap" }}>
                          {/* --- ESTILO CORRIGIDO (PONTO 2) --- */}
                          <span className="table-note-number">{nota.nf}</span>
                          <span className="table-note-series"> / {nota.serie}</span>
                      </td>
                      <td data-label="Tipo" style={{ padding: '14px 12px', verticalAlign: 'middle', textAlign: 'center' }}>
                        {nota.tipo_nf ? (
                            <span
                                className="status-badge"
                                style={{
                                    backgroundColor: nota.tipo_nf.toUpperCase() === 'CTE' ? 'var(--gcs-gray-soft)' : 'var(--gcs-gray-dark)'
                                }}
                            >
                                {nota.tipo_nf.toUpperCase()}
                            </span>
                        ) : (
                            <span style={{ color: 'var(--gcs-gray-dark)' }}>—</span>
                        )}
                      </td>
                      <td data-label="Fornecedor" style={{ padding: '14px 12px', verticalAlign: 'middle', fontSize: '13px' }}>{nota.nome_fornecedor}</td>
                      
                      {/* --- COLUNA DE DATA UNIFICADA --- */}
                      <td data-label="Datas" style={{ padding: '14px 12px', verticalAlign: 'middle', textAlign: 'center' }}>
                        <Tooltip title={dateTooltipContent} placement="top">
                            <span style={{cursor: 'help'}}><Calendar size={18} /></span>
                        </Tooltip>
                      </td>
                      
                      <td data-label="Status Setor" style={{ padding: '14px 12px', verticalAlign: 'middle', textAlign: 'center' }}>
                          <StatusSetorDots
                              statusUnidade={nota.status_envio_unidade}
                              statusCompras={nota.status_compras}
                              statusFiscal={nota.status_fiscal}
                          />
                      </td>
                      <td data-label="Observação" style={{ padding: '14px 12px', verticalAlign: 'middle', fontSize: '13px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {nota.observacao ? nota.observacao : <span style={{ color: 'var(--gcs-gray-dark)' }}>—</span>}
                      </td>
                      <td data-label="Responsável" style={{ padding: '14px 12px', verticalAlign: 'middle', fontSize: '13px' }}>
                        {nota.comprador ? nota.comprador : <span style={{ color: 'var(--gcs-gray-dark)' }} title="Sem responsável">—</span>}
                      </td>
                      <td data-label="Ações" className="td-actions" style={{ padding: '14px 12px', verticalAlign: 'middle', textAlign: 'center' }}>
                          <button
                            onClick={() => abrirModalDetalhes(nota)}
                            title="Ver Detalhes da Nota"
                            className="btn btn-dark-gray"
                          >
                            <Search size={14} /> Analisar
                          </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: "2rem", display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Pagination
              current={paginaAtual}
              total={totalServidor}
              pageSize={pageSize}
              onChange={(page) => setPaginaAtual(page)}
              showSizeChanger={false}
              showTotal={(total, range) => `${range[0]}-${range[1]} de ${total} notas`}
            />
          </div>
        </>
      )}
    </div>

    <ModalDetalhes
      chave={notaSelecionada?.chave || ""}
      visivel={modalAberto}
      onClose={() => setModalAberto(false)}
      nomeFornecedor={notaSelecionada?.nome_fornecedor}
      statusNF={notaSelecionada?.status_nf || ""}
      onActionSuccess={fetchNotas}
      statusCompras={notaSelecionada?.status_compras}
      observacao={notaSelecionada?.observacao}
    />

    <NotificationModal
        visible={notification.visible}
        type={notification.type}
        message={notification.message}
        onClose={handleCloseNotification}
    />

    <ConfirmationModal
        isOpen={isConfirmConferenciaOpen}
        onClose={handleCloseConferencia}
        onConfirm={handleConfirmConferencia}
        title="Confirmar Conferência"
        message={
            newConferenciaStatus === 'S'
                ? "Com essa ação você está confirmando que realizou a conferência dessa nota no Protheus. Deseja continuar?"
                : "Você tem certeza que deseja desmarcar a conferência desta nota?"
        }
        confirmText={isSubmittingConferencia ? "Processando..." : (newConferenciaStatus === 'S' ? "Sim, Continuar" : "Sim, Desmarcar")}
        confirmColor={newConferenciaStatus === 'S' ? "#28a745" : "#dc3545"}
        showCancelButton={!isSubmittingConferencia}
        icon={newConferenciaStatus === 'S' ? <CheckSquare size={40} color="#28a745" /> : <AlertTriangle size={40} color="#f7941d" />}
    />
  </>);

}