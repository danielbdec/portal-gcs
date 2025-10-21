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
    ArrowUp, ArrowDown, Filter, X, FileDown, TrendingUp, Send, ShoppingCart, Landmark, Lock
} from "lucide-react";
import ModalDetalhes from "./ModalDetalhes";
import React from "react";
import "antd/dist/reset.css";

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
    notas,
    onApplyFilters,
    initialFilters
}: {
    notas: Nota[],
    onApplyFilters: (filters: any) => void,
    initialFilters: any
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [filial, setFilial] = useState(initialFilters.filial || 'Todas');
    const [responsavel, setResponsavel] = useState(initialFilters.responsavel || 'Todos');
    const [tipo, setTipo] = useState(initialFilters.tipo || 'Todos'); // NOVO ESTADO
    const popoverRef = useRef<HTMLDivElement>(null);

    const filiaisUnicas = useMemo(() => ['Todas', ...Array.from(new Set(notas.map(n => n.filial).filter(Boolean)))], [notas]);
    const responsaveisUnicos = useMemo(() => ['Todos', ...Array.from(new Set(notas.map(n => n.comprador).filter(Boolean)))], [notas]);
    const tiposUnicos = useMemo(() => ['Todos', ...Array.from(new Set(notas.map(n => n.tipo_nf).filter(Boolean)))], [notas]); // NOVA LISTA

    const handleApply = () => {
        onApplyFilters({ filial, responsavel, tipo }); // ADICIONADO TIPO
        setIsOpen(false);
    };

    const handleClear = () => {
        setFilial('Todas');
        setResponsavel('Todos');
        setTipo('Todos'); // RESET TIPO
        onApplyFilters({ filial: 'Todas', responsavel: 'Todos', tipo: 'Todos' }); // ADICIONADO TIPO
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
                    width: '300px',
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

                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500 }}>Filial</label>
                        <select value={filial} onChange={(e) => setFilial(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--gcs-border-color)' }}>
                            {filiaisUnicas.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                    </div>

                    {/* NOVO FILTRO DE TIPO */}
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500 }}>Tipo</label>
                        <select value={tipo} onChange={(e) => setTipo(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--gcs-border-color)' }}>
                            {tiposUnicos.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500 }}>Responsável</label>
                        <select value={responsavel} onChange={(e) => setResponsavel(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--gcs-border-color)' }}>
                            {responsaveisUnicos.map(r => <option key={r} value={r}>{r}</option>)}
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

const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
    </g>
  );
};


export default function ConsultaNotas() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [authStatus, setAuthStatus] = useState<'loading' | 'authorized' | 'unauthorized'>('loading');

  const [notas, setNotas] = useState<Nota[]>([]);
  const [filtroStatus, setFiltroStatus] = useState<string>("Todos");
  const [busca, setBusca] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [notaSelecionada, setNotaSelecionada] = useState<Nota | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [paginaAtual, setPaginaAtual] = useState<number>(1);
  const itensPorPagina = 10;
  const [sortConfig, setSortConfig] = useState<{ key: keyof Nota | null; direction: 'asc' | 'desc' }>({ key: null, direction: 'asc' });
  const [advancedFilters, setAdvancedFilters] = useState({ filial: 'Todas', responsavel: 'Todos', tipo: 'Todos' }); // ADICIONADO TIPO
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [chartKey, setChartKey] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [timeAgo, setTimeAgo] = useState('');

  // --- GUARDA DE ROTA ---
  useEffect(() => {
    if (status === 'loading') {
      setAuthStatus('loading');
      return;
    }
    if (status === 'authenticated') {
      const user = session.user;
      // Chave de permissão para esta página específica
      const hasAccess = user?.is_admin === true || user?.funcoes?.includes('nfEntrada.centralDeNotas');
      
      if (hasAccess) {
        setAuthStatus('authorized');
        fetchNotas(); // Carrega os dados da página apenas se o utilizador for autorizado
      } else {
        setAuthStatus('unauthorized');
      }
    } else {
        router.push('/login'); // Redireciona se não estiver autenticado
    }
  }, [status, session, router]);

  useEffect(() => {
    setTimeAgo(formatTimeAgo(lastUpdated));
    const interval = setInterval(() => {
        setTimeAgo(formatTimeAgo(lastUpdated));
    }, 60000);
    return () => clearInterval(interval);
  }, [lastUpdated]);

  const statusDisponiveis = ["Todos", "Erro", "Erro I.A.", "Aguardando", "Importado", "Pendente", "Manual", "Erro ExecAuto"];

  const statusCounts = useMemo(() => {
      const counts: Record<string, number> = { Todos: notas.length };
      statusDisponiveis.slice(1).forEach(status => {
          counts[status] = notas.filter(n => n.status_nf?.trim().toLowerCase() === status.toLowerCase()).length;
      });
      return counts;
  }, [notas]);

  const dadosGraficoStatus = useMemo(() => {
    return Object.entries(statusCounts)
      .filter(([key, value]) => key !== "Todos" && value > 0)
      .map(([name, value]) => ({ name, value }));
  }, [statusCounts]);

  const areFiltersApplied = useMemo(() => {
    const isStatusFiltered = filtroStatus !== "Todos";
    const isSearchFiltered = busca.trim() !== "";
    const isAdvancedFiltered = advancedFilters.filial !== 'Todas' || advancedFilters.responsavel !== 'Todos' || advancedFilters.tipo !== 'Todos'; // ADICIONADO TIPO

    return isStatusFiltered || isSearchFiltered || isAdvancedFiltered;
  }, [filtroStatus, busca, advancedFilters]);
  
  const notasProcessadasHoje = useMemo(() => {
    const hoje = new Date();
    const hojeString = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;

    return notas.filter(nota => {
        if (!nota.dt_atualizacao) return false;
        
        let notaDateString;
        
        if (nota.dt_atualizacao.includes('/')) {
            const parts = nota.dt_atualizacao.split(' ')[0].split('/');
            if (parts.length === 3) {
                notaDateString = `${parts[2]}-${parts[1]}-${parts[0]}`;
            } else {
                return false;
            }
        } else if (nota.dt_atualizacao.includes('-')) {
            notaDateString = nota.dt_atualizacao.split(' ')[0].split('T')[0];
        } else {
            return false;
        }

        return notaDateString === hojeString;
    }).length;
  }, [notas]);

  const notasPendentes = useMemo(() => {
    return notas.filter(nota => nota.status_compras?.trim().toUpperCase() === 'PENDENTE').length;
  }, [notas]);

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
            setFiltroStatus(statusName);
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

  const fetchNotas = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/nfe/nfe-consulta-notas-cabecalho", {
          method: "POST",
        });
        const data = await response.json();
        setNotas(Array.isArray(data) ? data : []);
        setChartKey(prevKey => prevKey + 1); 
        setLastUpdated(new Date());
      } catch (error) {
        console.error("Erro ao buscar as notas:", error);
      } finally {
        setLoading(false);
      }
    };

    const notasFiltradasOrdenadas = useMemo(() => {
    let notasFiltradas = (notas || []).filter((nota) => {
      const termo = busca.toLowerCase();
      const statusOk = filtroStatus === "Todos" || nota.status_nf?.trim().toLowerCase() === filtroStatus.toLowerCase();
      const buscaOk =
        nota.nome_fornecedor.toLowerCase().includes(termo) ||
        nota.nf.includes(termo) ||
        nota.chave.includes(termo);

      const filialOk = advancedFilters.filial === 'Todas' || nota.filial === advancedFilters.filial;
      const responsavelOk = advancedFilters.responsavel === 'Todos' || nota.comprador === advancedFilters.responsavel;
      const tipoOk = advancedFilters.tipo === 'Todos' || nota.tipo_nf === advancedFilters.tipo; // LÓGICA DO FILTRO DE TIPO

      return statusOk && buscaOk && filialOk && responsavelOk && tipoOk; // APLICANDO O FILTRO
    });

    if (sortConfig.key) {
      notasFiltradas.sort((a, b) => {
        const aValue = a[sortConfig.key!]
        const bValue = b[sortConfig.key!]
        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return notasFiltradas;
  }, [notas, busca, filtroStatus, sortConfig, advancedFilters]);

  const requestSort = (key: keyof Nota) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const totalPaginas = Math.ceil(notasFiltradasOrdenadas.length / itensPorPagina);
  const notasPaginadas = notasFiltradasOrdenadas.slice((paginaAtual - 1) * itensPorPagina, paginaAtual * itensPorPagina);

  const coresStatus: Record<string, string> = {
    "Erro": "#dc3545",
    "Erro I.A.": "#ff6f61",
    "Aguardando": "#f7941d",
    "Importado": "#28a745",
    "Pendente": "#6c757d",
    "Manual": "#343a40",
    "Erro ExecAuto": "#8B0000"
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
    const headers = ["Status da Nota", "Filial", "Nota", "Série", "Tipo", "Fornecedor", "Recebimento", "Status Envio Unidade", "Status Compras", "Status Fiscal", "Observação", "Responsável", "Chave"];

    const data = notasFiltradasOrdenadas.map(nota => {
      return [
        nota.status_lancamento || '',
        nota.filial,
        nota.nf,
        nota.serie,
        nota.tipo_nf || '',
        nota.nome_fornecedor,
        `${nota.dt_recebimento} ${nota.hr_Recebimento}`,
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
        { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 10 }, { wch: 10 }, 
        { wch: 40 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 },
        { wch: 50 }, { wch: 25 }, { wch: 50 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Notas Fiscais");
    XLSX.writeFile(workbook, "Consulta_Notas_Fiscais.xlsx");
  };

  // Se a sessão ainda está a carregar, mostra um spinner
  if (authStatus === 'loading') {
    return (
        <div className="main-container" style={{ padding: "2rem", backgroundColor: "#E9ECEF", minHeight: "100vh" }}>
            <LoadingSpinner text="A verificar permissões..." />
        </div>
    );
  }

  // Se o utilizador não está autorizado, mostra a página de acesso negado
  if (authStatus === 'unauthorized') {
    return (
        <div className="main-container" style={{ padding: "2rem", backgroundColor: "#E9ECEF", minHeight: "100vh" }}>
            <AcessoNegado />
        </div>
    );
  }
  
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
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .btn { cursor: pointer; font-weight: 600; display: inline-flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s ease-in-out; border: 1px solid transparent; padding: 10px 20px; border-radius: 8px; }
        .btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .btn:disabled { cursor: not-allowed; opacity: 0.6; }
        .btn-green { background-color: var(--gcs-green); color: white; }
        .btn-green:hover:not(:disabled) { background-color: #4a9d3a; }
        .btn-dark-gray {
            background-color: #344054; /* Cinza forte */
            color: white;
            padding: 8px 16px;
            font-size: 14px;
            border: 1px solid #1d2939;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        }
        .btn-dark-gray:hover:not(:disabled) {
            background-color: #1d2939; /* Cinza mais escuro no hover */
        }
        .btn-outline-gray { background-color: #fff; color: var(--gcs-gray-dark); border-color: var(--gcs-border-color); }
        .btn-outline-gray:hover:not(:disabled) { border-color: var(--gcs-gray-dark); background-color: var(--gcs-gray-light); }
        .btn-outline-blue { background-color: #fff; color: var(--gcs-blue); border-color: var(--gcs-border-color); }
        .btn-outline-blue:hover:not(:disabled) { border-color: var(--gcs-blue); background-color: #f1f5fb; }
        .filter-tabs-container { display: flex; flex-wrap: wrap; gap: 1.5rem; justify-content: center; }
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
            filter: drop-shadow(1px 1px 0px rgba(0,0,0,0.1))
                    drop-shadow(2px 2px 0px rgba(0,0,0,0.09))
                    drop-shadow(3px 3px 0px rgba(0,0,0,0.08))
                    drop-shadow(4px 4px 0px rgba(0,0,0,0.07))
                    drop-shadow(5px 5px 0px rgba(0,0,0,0.06));
        }

        /* ESTILOS PARA OS CARDS */
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

        /* INÍCIO DOS ESTILOS DE RESPONSIVIDADE PARA MOBILE */
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
            .filter-tabs-container {
                gap: 0.5rem;
                justify-content: flex-start;
                overflow-x: auto;
                -ms-overflow-style: none; /* IE and Edge */
                scrollbar-width: none; /* Firefox */
            }
            .filter-tabs-container::-webkit-scrollbar {
                display: none; /* Chrome, Safari, Opera */
            }
            .tab-button {
                white-space: nowrap;
                padding: 8px 10px 12px 10px;
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
        /* FIM DOS ESTILOS DE RESPONSIVIDADE */
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
            <div style={{ width: 280, height: 160 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart key={chartKey}>
                        <Pie
                            activeIndex={activeIndex}
                            activeShape={renderActiveShape}
                            data={dadosGraficoStatus}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
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
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
        
        <div className="main-content-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '1.5rem', paddingTop: '0.5rem', paddingBottom: '0.5rem' }}>
            <h2 className="page-title" style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold', color: 'var(--gcs-blue)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <FileText size={32} color="var(--gcs-blue)" />
                <span>Central de Notas</span>
            </h2>
            
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <input
                        type="text"
                        placeholder="Buscar por fornecedor, nota ou chave"
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                        className="search-input"
                        style={{ padding: "12px 16px", fontSize: "1rem", borderRadius: "8px", border: "1px solid var(--gcs-border-color)", width: "350px" }}
                    />
                    <button className="btn btn-green">
                        <Search size={18} /> Pesquisar
                    </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button onClick={fetchNotas} title="Atualizar Notas Fiscais" className="btn btn-outline-gray" style={{padding: '9px'}}>
                            <RefreshCcw size={20} />
                        </button>
                        <FilterPopover
                            notas={notas}
                            onApplyFilters={setAdvancedFilters}
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
                    {notasProcessadasHoje}
                </p>
            </div>
            
            <hr style={{ width: '80%', border: 'none', borderTop: '1px solid var(--gcs-border-color)', margin: '0.5rem 0' }} />

            <div style={{ textAlign: 'center' }}>
                <h4 style={{ color: 'var(--gcs-gray-dark)', margin: 0, fontWeight: 500, fontSize: '1rem', marginBottom: '0.25rem' }}>
                    Pendentes
                </h4>
                <p style={{ fontSize: '2.2rem', margin: 0, color: 'var(--gcs-orange)', fontWeight: 'bold', lineHeight: 1.2 }}>
                    {notasPendentes}
                </p>
            </div>
        </div>
      </div>

      <div className="tabs-card" style={{ marginBottom: '1.5rem' }}>
        <div className="filter-tabs-container">
          {statusDisponiveis.map((status) => {
            const isSelected = filtroStatus === status;
            return (
              <button key={status} onClick={() => setFiltroStatus(status)} className={`tab-button ${isSelected ? 'active' : ''}`}>
                {status} ({statusCounts[status] || 0})
              </button>
            )
          })}
        </div>
      </div>
      
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem' }}>
          <div style={{ width: '40px', height: '40px', border: '4px solid var(--gcs-gray-medium)', borderTop: '4px solid var(--gcs-blue)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <div style={{ marginTop: '1rem', fontWeight: 'bold', color: 'var(--gcs-blue)' }}>
            Carregando notas...
          </div>
        </div>
      ) : notasFiltradasOrdenadas.length === 0 ? (
        <div style={{ textAlign: "center", color: "var(--gcs-gray-dark)", marginTop: "4rem", fontSize: '1.1rem' }}>
          Nenhuma nota encontrada para os filtros aplicados.
        </div>
      ) : (
        <>
          <div className="responsive-table-wrapper" style={{ overflowX: "auto", border: "1px solid var(--gcs-border-color)", borderRadius: "12px", background: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <table className="responsive-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: '14px' }}>
              <thead style={{ backgroundColor: "var(--gcs-blue)", color: "#fff", textAlign: "left" }}>
                <tr>
                  <th style={{ padding: "16px 12px", textAlign: 'center', borderTopLeftRadius: '12px' }}><div className="th-sortable" style={{justifyContent: 'center'}}><BadgeCheck size={16} style={{marginRight: '8px'}} /> Status da Nota</div></th>
                  <th style={{ padding: "16px 12px" }}><div onClick={() => requestSort('filial')} className="th-sortable"><Building2 size={16} style={{marginRight: '8px'}} /> Filial <SortIcon columnKey="filial" /></div></th>
                  <th style={{ padding: "16px 12px" }}><div onClick={() => requestSort('nf')} className="th-sortable"><Hash size={16} style={{marginRight: '8px'}} /> Nota / Série <SortIcon columnKey="nf" /></div></th>
                  <th style={{ padding: "16px 12px", textAlign: 'center' }}><div onClick={() => requestSort('tipo_nf')} className="th-sortable" style={{justifyContent: 'center'}}><FileText size={16} style={{marginRight: '8px'}} /> Tipo <SortIcon columnKey="tipo_nf" /></div></th>
                  <th style={{ padding: "16px 12px" }}><div onClick={() => requestSort('nome_fornecedor')} className="th-sortable"><Truck size={16} style={{marginRight: '8px'}} /> Fornecedor <SortIcon columnKey="nome_fornecedor" /></div></th>
                  <th style={{ padding: "16px 12px" }}><div onClick={() => requestSort('dt_recebimento')} className="th-sortable"><Calendar size={16} style={{marginRight: '8px'}} /> Recebimento <SortIcon columnKey="dt_recebimento" /></div></th>
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
                      key={index}
                      className="data-row"
                      style={{
                        borderTop: "1px solid var(--gcs-border-color)",
                        backgroundColor: index % 2 === 0 ? "#ffffff" : "var(--gcs-gray-light)"
                      }}
                    >
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
              total={notasFiltradasOrdenadas.length}
              pageSize={itensPorPagina}
              onChange={(page) => setPaginaAtual(page)}
              showSizeChanger={false}
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
  </>);

}
