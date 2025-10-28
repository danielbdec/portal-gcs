"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Pagination } from "antd";
import * as XLSX from 'xlsx';
import {
    PieChart, Pie, Cell, Legend, ResponsiveContainer, Sector
} from "recharts";
import {
    RefreshCcw, FileText, AlertTriangle, Search, Building2, Hash,
    Truck, Calendar, BadgeCheck, MessageSquare, User, Settings2, ChevronsUpDown,
    ArrowUp, ArrowDown, Filter, X, FileDown, TrendingUp, Send, ShoppingCart, Landmark, Lock,
    CheckSquare, Square // <-- CheckSquare e Square podem ser removidos se não forem mais usados em outro lugar
} from "lucide-react";
import ModalDetalhes from "./ModalDetalhes";
import NotificationModal from "./NotificationModal"; // Importado
import React from "react";
import "antd/dist/reset.css";
import PriorityRibbonTabs from "./PriorityRibbonTabs";

// --- COMPONENTES AUXILIARES DE SEGURANÇA E UI ---

const LoadingSpinner = ({ text }: { text: string }) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
        <div style={{ width: '40px', height: '40px', border: '4px solid var(--gcs-gray-medium)', borderTop: '4px solid var(--gcs-blue)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <div style={{ marginTop: '1rem', fontWeight: 'bold', color: 'var(--gcs-blue)' }}>
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
  conferido?: 'S' | 'N' | null; // <-- Mantido na interface caso a API ainda retorne, mas não será usado na UI
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
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '8px',
                    width: '360px',
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                    border: '1px solid var(--gcs-border-color)',
                    zIndex: 100,
                    padding: '1rem'
                }}>
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

                    {/* Removido o filtro de TIPO daqui pois agora é fixo 'NFE'
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500 }}>Tipo</label>
                        <select value={tipo} onChange={(e) => setTipo(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--gcs-border-color)' }}>
                            {tiposUnicos.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    */}

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

// REMOVIDO - Modal de confirmação de conferência não é mais necessário
/*
const ConfirmationModal = ({ ... }) => { ... };
*/


export default function ConsultaNotas() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [authStatus, setAuthStatus] = useState<'loading' | 'authorized' | 'unauthorized'>('loading');

  const [notas, setNotas] = useState<Nota[]>([]);
  const [filtroStatus, setFiltroStatus] = useState<string>("Compras");

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

  // REMOVIDO - Estados relacionados à conferência
  // const [isConfirmConferenciaOpen, setIsConfirmConferenciaOpen] = useState(false);
  // const [conferenciaNota, setConferenciaNota] = useState<Nota | null>(null);
  // const [newConferenciaStatus, setNewConferenciaStatus] = useState<'S' | 'N' | null>(null);
  // const [isSubmittingConferencia, setIsSubmittingConferencia] = useState(false);

  const [notification, setNotification] = useState({ visible: false, type: 'success' as 'success' | 'error', message: '' });

  const [advancedFilters, setAdvancedFilters] = useState({
    filial: 'Todas',
    tipo: 'Todos', // Mantido para o FilterPopover, mas ignorado na API principal
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
  const [allTipos, setAllTipos] = useState<string[]>(['Todos']); // Mantido para FilterPopover
  const [allCompradores, setAllCompradores] = useState<string[]>(['Todos']);
  const [allStatusLancamento, setAllStatusLancamento] = useState<string[]>(['Todos']);


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
    // Garantir que o filtro de tipo 'NFE' não seja sobrescrito pelo popover
    const { tipo, ...restFilters } = filters;
    setAdvancedFilters(restFilters);
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
      const hasAccess = user?.is_admin === true || user?.funcoes?.includes('nfEntrada.pendenciaCompras');

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

  const statusDisponiveis = useMemo(() => {
    return ["Todos", "Compras", "Fiscal", "Enviadas", "Erro I.A.", "Não Recebidas", "Importado", "Manual", "Falha ERP"];
  }, []);


  const statusCounts = useMemo(() => {
    if (totaisAbas && Object.keys(totaisAbas).length) return totaisAbas;
    return {};
  }, [totaisAbas]);


  const dadosGraficoStatus = useMemo(() => {
    return statusDisponiveis
      .filter(key => key !== "Todos" && (statusCounts[key] || 0) > 0)
      .map(name => ({ name, value: statusCounts[name] }));
  }, [statusCounts, statusDisponiveis]);

  const areFiltersApplied = useMemo(() => {
    const isStatusFiltered = filtroStatus !== "Todos";
    const isSearchFiltered = busca.trim() !== "";
    const isAdvancedFiltered = advancedFilters.filial !== 'Todas' ||
                               advancedFilters.responsavel !== 'Todos' ||
                               // advancedFilters.tipo !== 'Todos' || // Ignorar tipo do popover
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
  }, [filtroStatus]);


  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  const onPieLeave = () => {
    const newActiveIndex = dadosGraficoStatus.findIndex(
        (data) => data.name === filtroStatus
    );
    setActiveIndex(newActiveIndex !== -1 ? newActiveIndex : null);
  };

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
          tipo: 'NFE', // <-- FILTRO FIXO ADICIONADO AQUI
          responsavel: advancedFilters.responsavel === 'Todos' ? undefined : advancedFilters.responsavel,
          statusLancamento: advancedFilters.statusLancamento === 'Todos' ? undefined : advancedFilters.statusLancamento,
          startDate: advancedFilters.startDate || undefined,
          endDate: advancedFilters.endDate || undefined,
          startDateProtheus: advancedFilters.startDateProtheus || undefined,
          endDateProtheus: advancedFilters.endDateProtheus || undefined
          // only_compras_pendentes: true // <-- Mantido implicitamente pela lógica abaixo
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
        } else {
             // Se o filtro principal for 'Todos', ainda aplicamos o filtro de compras pendentes
             // por ser o objetivo da página, mas precisamos garantir que outros filtros não sejam aplicados.
             body.only_compras_pendentes  = true;
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
            setAllFiliais(['Todos', ...payload.distinct_filiais.filter(Boolean)]);
        } else if (!advancedFilters.filial || advancedFilters.filial === 'Todas') {
             setAllFiliais(['Todos']);
        }
        // Não atualizar allTipos, pois o filtro é fixo
         if (Array.isArray(payload?.distinct_compradores) && payload.distinct_compradores.length > 0) {
             setAllCompradores(['Todos', ...payload.distinct_compradores.filter(Boolean)]);
        } else if (!advancedFilters.responsavel || advancedFilters.responsavel === 'Todos') {
             setAllCompradores(['Todos']);
        }
         if (Array.isArray(payload?.distinct_status) && payload.distinct_status.length > 0) {
             setAllStatusLancamento(['Todos', ...payload.distinct_status.filter(Boolean)]);
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
        setAllTipos(['Todos']); // Mantém 'Todos' para o popover
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
    // REMOVIDO - "Conferido" do header
    const headers = ["Status da Nota", "Filial", "Nota", "Série", "Tipo", "Fornecedor", "Recebimento", "Lançamento Protheus", "Status Envio Unidade", "Status Compras", "Status Fiscal", "Observação", "Responsável", "Chave"];

    const data = notasPaginadas.map(nota => {
      return [
        // REMOVIDO - Mapeamento de 'conferido'
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

    // Ajustado para remover a primeira coluna
    worksheet['!cols'] = [
        /*{ wch: 10 },*/ { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 10 }, { wch: 10 },
        { wch: 40 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 },
        { wch: 20 }, { wch: 50 }, { wch: 25 }, { wch: 50 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Notas Fiscais");
    XLSX.writeFile(workbook, "Consulta_Notas_Fiscais_Pagina.xlsx");
  };

  // --- FUNÇÕES DE CONFERÊNCIA (CHECKBOX) REMOVIDAS ---
  // const handleCheckboxClick = ...
  // const handleCloseConferencia = ...
  // const handleConfirmConferencia = ...

  // Função para fechar notificação genérica (mantida)
  const handleCloseNotification = () => {
      setNotification({ visible: false, type: 'success', message: '' });
      console.log("handleCloseNotification: Notificação fechada.");
  };
  // --- FIM DAS FUNÇÕES DE CONFERÊNCIA REMOVIDAS ---


  const renderLegendText = (value: string) => {
    return <span style={{ marginLeft: '4px' }}>{value}</span>;
  };

  useEffect(() => {
    if (authStatus === 'authorized') {
      fetchNotas();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authStatus, paginaAtual, pageSize, busca, filtroStatus, advancedFilters, sortConfig]);

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
    const sx = cx + (outerRadius + 10) * cos;
    const sy = cy + (outerRadius + 10) * sin;
    const mx = cx + (outerRadius + 30) * cos;
    const my = cy + (outerRadius + 30) * sin;
    const ex = mx + (cos >= 0 ? 1 : -1) * 22;
    const ey = my;
    const textAnchor = cos >= 0 ? 'start' : 'end';

    return (
      <g>
        <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius} startAngle={startAngle} endAngle={endAngle} fill={fill} />
        <Sector cx={cx} cy={cy} startAngle={startAngle} endAngle={endAngle} innerRadius={outerRadius + 6} outerRadius={outerRadius + 10} fill={fill} />
        <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
        <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
        <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={textAnchor} fill="#333" style={{ fontSize: '13px' }}>{`${payload.name}`}</text>
        <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} dy={18} textAnchor={textAnchor} fill="#999" style={{ fontSize: '12px' }}>{`(${value} - ${(percent * 100).toFixed(1)}%)`}</text>
      </g>
    );
  };

  // --- COMPONENTE CHECKBOX REMOVIDO ---
  // const ConferidoCheckbox = (...) => { ... };


  return (<>
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

            --gcs-orange-light-bg: #fff8e1;
            --gcs-orange-border: #FDBA74;
            --gcs-orange-text: #F58220;

            --gcs-blue-light-bg: #f1f5fb;
            --gcs-blue-border: #a3b8d1;
            --gcs-blue-text: #00314A;
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .btn { cursor: pointer; font-weight: 600; display: inline-flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s ease-in-out; border: 1px solid transparent; padding: 10px 20px; border-radius: 8px; }
        .btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .btn:disabled { cursor: not-allowed; opacity: 0.6; }
        .btn-green { background-color: var(--gcs-green); color: white; }
        .btn-green:hover:not(:disabled) { background-color: #4a9d3a; }
        .btn-dark-gray {
            background-color: #344054;
            color: white;
            padding: 8px 16px;
            font-size: 14px;
            border: 1px solid #1d2939;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        }
        .btn-dark-gray:hover:not(:disabled) {
            background-color: #1d2939;
        }
        .btn-outline-gray { background-color: #fff; color: var(--gcs-gray-dark); border-color: var(--gcs-border-color); }
        .btn-outline-gray:hover:not(:disabled) { border-color: var(--gcs-gray-dark); background-color: var(--gcs-gray-light); }
        .btn-outline-blue { background-color: #fff; color: var(--gcs-blue); border-color: var(--gcs-border-color); }
        .btn-outline-blue:hover:not(:disabled) { border-color: var(--gcs-blue); background-color: #f1f5fb; }

        .tab-button { background: none; border: none; cursor: pointer; padding: 8px 12px 12px 12px; font-size: 1rem; font-weight: 500; color: var(--gcs-gray-dark); position: relative; transition: all 0.2s ease-in-out; }
        .tab-button::after { content: ''; position: absolute; bottom: -2px; right: 0; width: 100%; height: 100%; border-style: solid; border-color: transparent; border-image: none; opacity: 0; transform: scale(0.95); transition: all 0.2s ease-in-out; pointer-events: none; filter: drop-shadow(1px 1px 1px rgba(0,0,0,0.2)); }
        .tab-button:hover:not(.active) { transform: translateY(-2px); color: var(--gcs-blue); }
        .tab-button.active { color: var(--gcs-orange); font-weight: 600; transform: translateY(-2px); }
        .tab-button.active::after {
            opacity: 1;
            transform: scale(1);
            border-top: 3px solid transparent;
            border-right: 3px solid var(--gcs-orange-light);
            border-bottom: 3px solid var(--gcs-orange-light);
            border-left: 3px solid transparent;
            border-top-right-radius: 8px;
        }

        .th-sortable { cursor: pointer; transition: color 0.2s ease-in-out; user-select: none; display: flex; align-items: center; }
        .th-sortable:hover { color: #ffffffd0; }
        .ant-pagination-item-active { background-color: var(--gcs-blue) !important; border-color: var(--gcs-blue) !important; }
        .ant-pagination-item-active a { color: white !important; }

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

        .data-row:hover {
            background-color: var(--gcs-gray-light) !important;
            cursor: default;
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

        .kpi-card, .chart-card, .main-content-card, .tabs-card, .content-card {
            background-color: #fff;
            border-radius: 12px;
            padding: 1.5rem;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
            border: 1px solid var(--gcs-border-color);
        }

        .tabs-card {
          padding: 1rem 1.5rem;
        }

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
             .kpi-card, .chart-card, .main-content-card, .tabs-card {
                padding: 1rem;
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
                border: 1px solid var(--gcs-border-color);
                border-radius: 8px;
                padding: 0.5rem 1rem;
            }
            .responsive-table td {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 0.8rem 0;
                border-bottom: 1px solid var(--gcs-gray-medium);
            }
            .responsive-table tr td:last-child {
                border-bottom: none;
            }
            .responsive-table td::before {
                content: attr(data-label);
                font-weight: bold;
                color: var(--gcs-blue);
                margin-right: 1rem;
            }

            .td-status, .td-actions {
                justify-content: flex-start;
            }
            .td-actions .btn {
                width: 100%;
            }
        }
    `}</style>

    <div className="main-container" style={{ padding: "2rem", backgroundColor: "#E9ECEF", minHeight: "100vh" }}>

      <div className="header-wrapper" style={{ display: 'flex', alignItems: 'stretch', gap: '1.5rem', marginBottom: '1.5rem' }}>

        <div
            className="chart-card clickable-chart chart-3d-effect"
            style={{
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
            }}
        >
            <h4 style={{ margin: 0, color: 'var(--gcs-gray-dark)', fontWeight: 500, fontSize: '1rem' }}>
                Gráfico por Status
            </h4>
            <div style={{ width: 280, height: 180 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart key={chartKey}>
                        <Pie
                            activeIndex={activeIndex}
                            activeShape={renderActiveShape}
                            data={dadosGraficoStatus}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="45%"
                            innerRadius={40}
                            outerRadius={60}
                            paddingAngle={3}
                            onMouseEnter={onPieEnter}
                            onMouseLeave={onPieLeave}
                            onClick={handleChartClick}
                        >
                            {dadosGraficoStatus.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={coresStatus[entry.name] || '#ccc'} />
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
            <h2 className="page-title" style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold', color: 'var(--gcs-blue)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <FileText size={32} color="var(--gcs-blue)" />
                <span>Pendências de Compras</span> {/* Título Modificado */}
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
                    </div>
                    <div style={{ height: 'auto', marginTop: '0.25rem', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                        {timeAgo && !loading && (
                          <span style={{ color: 'var(--gcs-gray-dark)', fontSize: '12px', fontStyle: 'italic' }}>
                              Atualizado {timeAgo}
                          </span>
                        )}
                        {areFiltersApplied && !loading && (
                          <span style={{ color: '#dc3545', fontSize: '12px', fontWeight: 'bold' }}>
                              Existem filtros aplicados
                          </span>
                        )}
                    </div>
                </div>
            </div>
        </div>

        <div className="kpi-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-around' }}>
            <div style={{ textAlign: 'center' }}>
                <h4 style={{ color: 'var(--gcs-gray-dark)', margin: 0, fontWeight: 500, fontSize: '1rem', marginBottom: '0.25rem' }}>
                    Notas Hoje
                </h4>
                <p style={{ fontSize: '2.2rem', margin: 0, color: 'var(--gcs-green)', fontWeight: 'bold', lineHeight: 1.2 }}>
                    {totalNotasHoje}
                </p>
            </div>

            <hr style={{ width: '80%', border: 'none', borderTop: '1px solid var(--gcs-border-color)', margin: '0.5rem 0' }} />

            <div style={{ textAlign: 'center' }}>
                <h4 style={{ color: 'var(--gcs-gray-dark)', margin: 0, fontWeight: 500, fontSize: '1rem', marginBottom: '0.25rem' }}>
                    Pendentes
                </h4>
                <p style={{ fontSize: '2.2rem', margin: 0, color: 'var(--gcs-orange)', fontWeight: 'bold', lineHeight: 1.2 }}>
                    {totalPendentes}
                </p>
            </div>
        </div>
      </div>

      <div className="tabs-card" style={{ // RESTAURADO
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
          <div style={{ marginTop: '1rem', fontWeight: 'bold', color: 'var(--gcs-blue)' }}>
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
                  {/* REMOVIDO - Header da coluna Conferido */}
                  <th style={{ padding: "16px 12px", textAlign: 'center', borderTopLeftRadius: '12px' }}><div className="th-sortable" style={{justifyContent: 'center'}}><BadgeCheck size={16} style={{marginRight: '8px'}} /> Status da Nota</div></th>
                  <th style={{ padding: "16px 12px" }}><div onClick={() => requestSort('filial')} className="th-sortable"><Building2 size={16} style={{marginRight: '8px'}} /> Filial <SortIcon columnKey="filial" /></div></th>
                  <th style={{ padding: "16px 12px" }}><div onClick={() => requestSort('nf')} className="th-sortable"><Hash size={16} style={{marginRight: '8px'}} /> Nota / Série <SortIcon columnKey="nf" /></div></th>
                  <th style={{ padding: "16px 12px", textAlign: 'center' }}><div onClick={() => requestSort('tipo_nf')} className="th-sortable" style={{justifyContent: 'center'}}><FileText size={16} style={{marginRight: '8px'}} /> Tipo <SortIcon columnKey="tipo_nf" /></div></th>
                  <th style={{ padding: "16px 12px" }}><div onClick={() => requestSort('nome_fornecedor')} className="th-sortable"><Truck size={16} style={{marginRight: '8px'}} /> Fornecedor <SortIcon columnKey="nome_fornecedor" /></div></th>
                  <th style={{ padding: "16px 12px" }}><div onClick={() => requestSort('dt_recebimento')} className="th-sortable"><Calendar size={16} style={{marginRight: '8px'}} /> Recebimento <SortIcon columnKey="dt_recebimento" /></div></th>
                  <th style={{ padding: "16px 12px" }}><div onClick={() => requestSort('dt_lcto_protheus' as keyof Nota)} className="th-sortable"><Calendar size={16} style={{marginRight: '8px'}} /> Lançamento Protheus <SortIcon columnKey={"dt_lcto_protheus" as keyof Nota} /></div></th>
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

                  return (
                    <tr
                      key={nota.chave} // Usar a chave como key é mais seguro
                      className="data-row"
                      style={{
                        borderTop: "1px solid var(--gcs-border-color)",
                        backgroundColor: index % 2 === 0 ? "#ffffff" : "var(--gcs-gray-light)"
                      }}
                    >
                      {/* REMOVIDO - Célula da coluna Conferido */}
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
                          <span style={{fontWeight: 'bold', color: '#343a40'}}>{nota.nf}</span>
                          <span style={{color: 'var(--gcs-gray-dark)'}}> / {nota.serie}</span>
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
                      <td data-label="Recebimento" style={{ padding: '14px 12px', verticalAlign: 'middle' }}>{nota.dt_recebimento} {nota.hr_Recebimento}</td>
                      <td data-label="Lançamento Protheus" style={{ padding: '14px 12px', verticalAlign: 'middle' }}>
                        {formatProtheusDateTime(nota.dt_lcto_protheus)}
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

    {/* REMOVIDO - Modal de confirmação de conferência */}
    {/*
    <ConfirmationModal
        isOpen={isConfirmConferenciaOpen}
        ...
    />
    */}
  </>);

}