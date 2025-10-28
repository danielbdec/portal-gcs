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
import ModalDetalhes from "./ModalDetalhes"; // Assume que ModalDetalhes está na mesma pasta
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
  status_envio_unidade?: string | null; // Permitir null
  status_compras?: string;
  status_fiscal?: string;
}

const StatusSetorDots = ({ statusUnidade, statusCompras, statusFiscal }: {
    statusUnidade?: string | null; // Permitir null
    statusCompras?: string;
    statusFiscal?: string;
}) => {
    const getIconBgColor = (status: string | undefined | null, completedValue: string): string => {
        // Verifica explicitamente se é uma string antes de comparar
        if (typeof status === 'string' && status.trim().toUpperCase() === completedValue) {
            return '#28a745'; // Verde sólido
        }
        return '#dc3545'; // Vermelho sólido (padrão para pendente/erro/null/undefined)
    };

    let unidadeTitleText = 'Pendente/Não Informado';
    if (typeof statusUnidade === 'string') {
        if (statusUnidade.trim().toUpperCase() === 'SIM') {
            unidadeTitleText = 'Enviado';
        } else if (statusUnidade.trim().toUpperCase() === 'NAO') { // Corrigido para NAO
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
            <div title={`Unidade: ${unidadeTitleText}`} style={{ ...iconContainerStyle, backgroundColor: unidadeBgColor }}>
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
    const [filial, setFilial] = useState(initialFilters.filial || 'Todas'); // Mantido, mas não usado
    const [tipo, setTipo] = useState(initialFilters.tipo || 'Todos');
    const [responsavel, setResponsavel] = useState(initialFilters.responsavel || 'Todos');
    const [statusLancamento, setStatusLancamento] = useState(initialFilters.statusLancamento || 'Todos');
    const [startDate, setStartDate] = useState(initialFilters.startDate || '');
    const [endDate, setEndDate] = useState(initialFilters.endDate || '');
    const popoverRef = useRef<HTMLDivElement>(null);

    // Filtra as opções únicas *antes* da filtragem permanente da página
    const filiaisUnicas = useMemo(() => ['Todas', ...Array.from(new Set(notas.map(n => n.filial).filter(Boolean)))], [notas]);
    const tiposUnicos = useMemo(() => ['Todos', ...Array.from(new Set(notas.map(n => n.tipo_nf?.toUpperCase()).filter(Boolean)))], [notas]);
    const responsaveisUnicos = useMemo(() => ['Todos', ...Array.from(new Set(notas.map(n => n.comprador || '-'))).sort()], [notas]);
    const statusUnicos = useMemo(() => ['Todos', ...Array.from(new Set(notas.map(n => n.status_lancamento || 'N/A').filter(Boolean)))], [notas]);

    const handleApply = () => {
        // Passa todos os filtros, a lógica da página ignora o de filial
        onApplyFilters({ filial, tipo, responsavel, statusLancamento, startDate, endDate });
        setIsOpen(false);
    };

    const handleClear = () => {
        setFilial('Todas'); // Reseta visualmente
        setTipo('Todos');
        setResponsavel('Todos');
        setStatusLancamento('Todos');
        setStartDate('');
        setEndDate('');
        // Envia filtros limpos (exceto filial que será ignorada)
        onApplyFilters({ filial: 'Todas', tipo: 'Todos', responsavel: 'Todos', statusLancamento: 'Todos', startDate: '', endDate: '' });
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
                            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500 }}>Data Inicial</label>
                            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--gcs-border-color)' }} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500 }}>Data Final</label>
                            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--gcs-border-color)' }} />
                        </div>
                    </div>

                    {/* O filtro de Filial não é mais necessário aqui, pois a página já filtra por '0402' */}
                    {/*
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500 }}>Filial</label>
                        <select value={filial} onChange={(e) => setFilial(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--gcs-border-color)' }}>
                            {filiaisUnicas.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                    </div>
                     */}

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

const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 8} // Aumenta o raio externo no hover
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
    </g>
  );
};


export default function ConsultaNotasEnviadasBA() { // Renomeado o componente para refletir o propósito
  const { data: session, status } = useSession();
  const router = useRouter();
  const [authStatus, setAuthStatus] = useState<'loading' | 'authorized' | 'unauthorized'>('loading');

  const [notas, setNotas] = useState<Nota[]>([]); // Estado que armazena as notas *já filtradas* pela API
  const [filtroStatus, setFiltroStatus] = useState<string>("Todos"); // Filtro das abas
  
  // DEBOUNCE: buscaRaw é o que o usuário digita, busca é o valor com delay
  const [buscaRaw, setBuscaRaw] = useState<string>("");
  const [busca, setBusca] = useState<string>("");
  
  const [loading, setLoading] = useState<boolean>(true);
  const [notaSelecionada, setNotaSelecionada] = useState<Nota | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [paginaAtual, setPaginaAtual] = useState<number>(1);
  const itensPorPagina = 10;
  const [sortConfig, setSortConfig] = useState<{ key: keyof Nota | null; direction: 'asc' | 'desc' }>({ key: null, direction: 'asc' });
  // Filtros avançados ainda podem ser úteis para data, tipo, responsável, etc.
  const [advancedFilters, setAdvancedFilters] = useState({ /* filial removido */ tipo: 'Todos', responsavel: 'Todos', statusLancamento: 'Todos', startDate: '', endDate: '' });
  const [activeIndex, setActiveIndex] = useState<number | null>(null); // Para o gráfico
  const [chartKey, setChartKey] = useState(0); // Para forçar re-render do gráfico
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [timeAgo, setTimeAgo] = useState('');

  // DEBOUNCE: useEffect para aplicar o delay na busca
  useEffect(() => {
    const handler = setTimeout(() => {
        setBusca(buscaRaw);
        setPaginaAtual(1); // Reseta a página para a 1 a cada nova busca
    }, 400); // Delay de 400ms

    return () => {
        clearTimeout(handler);
    };
  }, [buscaRaw]);

  // Aplica filtros avançados (exceto filial, que já está fixa)
  const handleApplyAdvancedFilters = (filters: any) => {
    // Ignora o filtro de filial vindo do popover, mantendo o filtro da página
    const { filial, ...restFilters } = filters;
    setAdvancedFilters(restFilters);
    setPaginaAtual(1);
  };

  // Muda a aba de status selecionada
  const handleFiltroStatusChange = (status: string) => {
    setFiltroStatus(status);
    setPaginaAtual(1);
  };
  
  // --- GUARDA DE ROTA ---
  useEffect(() => {
    if (status === 'loading') {
      setAuthStatus('loading');
      return;
    }
    if (status === 'authenticated') {
      const user = session.user;
      // Verifica a nova permissão
      const hasAccess = user?.is_admin === true || user?.funcoes?.includes('nfEntrada.notasEnviadas');
      
      if (hasAccess) {
        setAuthStatus('authorized');
        fetchNotas(); // Busca as notas se autorizado
      } else {
        setAuthStatus('unauthorized');
      }
    } else {
        // Se não autenticado, redireciona para login (via ClientLayout)
        router.push('/login');
    }
  }, [status, session, router]); // Adicionado router como dependência

  // Atualiza o "tempo atrás" a cada minuto
  useEffect(() => {
    setTimeAgo(formatTimeAgo(lastUpdated));
    const interval = setInterval(() => {
        setTimeAgo(formatTimeAgo(lastUpdated));
    }, 60000); // 1 minuto
    return () => clearInterval(interval);
  }, [lastUpdated]);

  // Lista de status disponíveis para as abas (mantida, mas 'Enviadas' será sempre o total)
  const statusDisponiveis = useMemo(() => {
    // Poderia simplificar se alguns status não fizerem mais sentido nesta tela
    return ["Todos", "Compras", "Fiscal", /* "Enviadas", */ "Erro I.A.", "Não Recebidas", "Importado", "Manual", "Falha ERP"];
  }, []);
  
  // Filtra as notas com base nos filtros AVANÇADOS (data, tipo, resp, status da nota)
  // A filtragem por filial ('0402') e status_envio ('SIM') já aconteceu no fetchNotas
  const notasFiltradasPorAvancado = useMemo(() => {
    return (notas || []).filter((nota) => {
        // const filialOk = true; // Não precisa mais checar filial aqui
        const tipoOk = advancedFilters.tipo === 'Todos' || nota.tipo_nf?.toUpperCase() === advancedFilters.tipo;
        const responsavelOk = advancedFilters.responsavel === 'Todos' || (nota.comprador || '-') === advancedFilters.responsavel;
        const statusLancamentoOk = advancedFilters.statusLancamento === 'Todos' || (nota.status_lancamento || 'N/A') === advancedFilters.statusLancamento;
        
        let dateOk = true;
        if (advancedFilters.startDate || advancedFilters.endDate) {
            const parts = nota.dt_recebimento.split('/'); // DD/MM/YYYY
            if (parts.length === 3) {
                // Converte DD/MM/YYYY para YYYY-MM-DD para comparação de strings
                const notaDateStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
                const start = advancedFilters.startDate; // YYYY-MM-DD
                const end = advancedFilters.endDate; // YYYY-MM-DD

                if (start && notaDateStr < start) {
                    dateOk = false;
                }
                if (end && notaDateStr > end) {
                    dateOk = false;
                }
            } else {
                dateOk = false; // Data inválida, não inclui
            }
        }

        return /* filialOk && */ tipoOk && responsavelOk && statusLancamentoOk && dateOk;
    });
  }, [notas, advancedFilters]);
  
  // Calcula as contagens para as ABAS e KPIs, baseado nas notas JÁ FILTRADAS por filial e envio
  const statusCounts = useMemo(() => {
      const source = notasFiltradasPorAvancado; // Usa as notas já filtradas por filial/envio + filtros avançados
      const counts: Record<string, number> = { Todos: source.length };
      
      // Notas pendentes (exclui concluídos, manual, importado) para contagem das abas de status
      const sourcePendentes = source.filter(n =>
        n.status_lancamento !== 'Concluído' &&
        n.status_nf?.trim().toLowerCase() !== 'manual' &&
        n.status_nf?.trim().toLowerCase() !== 'importado'
      );

      // Mapeamento para os status baseados em status_nf
      const statusNfMap: Record<string, string> = {
        "Erro I.A.": "erro i.a.",
        "Não Recebidas": "aguardando",
        "Importado": "importado", // Contará todos com este status
        "Manual": "manual", // Contará todos com este status
        "Falha ERP": "erro execauto"
      };

      Object.keys(statusNfMap).forEach(status => {
          const statusValue = statusNfMap[status];
          // As abas "Manual" e "Importado" contam TUDO (incluindo concluídos) que tem esse status_nf
          if (status === "Manual" || status === "Importado") {
              counts[status] = source.filter(n => n.status_nf?.trim().toLowerCase() === statusValue).length;
          } else {
              // As outras abas (Erro IA, Não Recebidas, Falha ERP) contam apenas os PENDENTES com esse status_nf
              counts[status] = sourcePendentes.filter(n => n.status_nf?.trim().toLowerCase() === statusValue).length;
          }
      });
      
      // Contagens baseadas nos status de setor (Compras, Fiscal) - contam apenas os pendentes
      counts['Compras'] = sourcePendentes.filter(n => n.status_compras?.trim().toUpperCase() !== 'CONCLUÍDO').length;
      counts['Fiscal'] = sourcePendentes.filter(n => n.status_fiscal?.trim().toUpperCase() !== 'CONCLUÍDO').length;
      
      // A aba "Enviadas" não faz mais sentido como filtro aqui, mas mantemos a contagem total
      // counts['Enviadas'] = source.length; // Comentado pois a aba foi removida

      return counts;
  }, [notasFiltradasPorAvancado]);

  // Dados para o gráfico, baseado nas contagens das abas
  const dadosGraficoStatus = useMemo(() => {
    // Remove 'Enviadas' da lista para o gráfico também
    const statusParaGrafico = statusDisponiveis.filter(s => s !== 'Enviadas');
    return statusParaGrafico
      .filter(key => key !== "Todos" && (statusCounts[key] || 0) > 0) // Inclui apenas status com contagem > 0
      .map(name => ({ name, value: statusCounts[name] }));
  }, [statusCounts, statusDisponiveis]);

  // Verifica se algum filtro (aba, busca, avançado) está ativo
  const areFiltersApplied = useMemo(() => {
    const isStatusFiltered = filtroStatus !== "Todos";
    const isSearchFiltered = busca.trim() !== "";
    // Verifica apenas os filtros avançados que *não* são os fixos da página
    const isAdvancedFiltered = advancedFilters.tipo !== 'Todos' || advancedFilters.responsavel !== 'Todos' || advancedFilters.statusLancamento !== 'Todos' || advancedFilters.startDate !== '' || advancedFilters.endDate !== '';

    return isStatusFiltered || isSearchFiltered || isAdvancedFiltered;
  }, [filtroStatus, busca, advancedFilters]);
  
  // KPI: Notas processadas hoje (inalterado, mas opera sobre notas já filtradas)
  const notasProcessadasHoje = useMemo(() => {
    const hoje = new Date();
    // Formato YYYY-MM-DD
    const hojeString = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;

    // Usa o estado 'notas' que já contém apenas as enviadas da filial 0402
    return notas.filter(nota => {
        if (!nota.dt_atualizacao) return false;
        
        let notaDateString;
        
        // Tenta converter DD/MM/YYYY HH:MM:SS para YYYY-MM-DD
        if (nota.dt_atualizacao.includes('/')) {
            const parts = nota.dt_atualizacao.split(' ')[0].split('/'); // Pega só a data DD/MM/YYYY
            if (parts.length === 3) {
                notaDateString = `${parts[2]}-${parts[1]}-${parts[0]}`; // Converte para YYYY-MM-DD
            } else {
                return false; // Formato inválido
            }
        // Tenta usar diretamente se já for YYYY-MM-DD ou YYYY-MM-DDTHH:MM:SS...
        } else if (nota.dt_atualizacao.includes('-')) {
             // Pega a parte antes do 'T' ou ' ', ou a string inteira se não houver
            notaDateString = nota.dt_atualizacao.split(' ')[0].split('T')[0];
        } else {
            return false; // Formato desconhecido
        }

        return notaDateString === hojeString;
    }).length;
  }, [notas]);

  // KPI: Notas Pendentes (considera TUDO exceto Manual e Importado)
  const notasPendentes = useMemo(() => {
    const statusExcluidos = ["manual", "importado"]; // Status que NÃO contam como pendentes
    // Usa 'notas' (já filtrado por filial/envio)
    return notas.filter(nota => {
      // É pendente se status_nf existe E NÃO está na lista de excluídos
      return nota.status_nf && !statusExcluidos.includes(nota.status_nf.trim().toLowerCase());
    }).length;
  }, [notas]);

  // Efeito para sincronizar o estado ativo do gráfico com a aba selecionada
  useEffect(() => {
    if (filtroStatus === 'Todos') {
        setActiveIndex(null); // Nenhum item ativo se 'Todos'
    } else {
        // Encontra o índice no array de dados do gráfico que corresponde ao status da aba
        const newActiveIndex = dadosGraficoStatus.findIndex(
            (data) => data.name === filtroStatus
        );
        setActiveIndex(newActiveIndex !== -1 ? newActiveIndex : null); // Define ou remove o item ativo
    }
  }, [filtroStatus, dadosGraficoStatus]);
  
  // Força re-render do gráfico quando o filtro de status muda (para animação)
  useEffect(() => {
    setChartKey(prevKey => prevKey + 1);
  }, [filtroStatus]);


  // Handlers para interação com o gráfico de pizza
  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index); // Destaca a fatia ao passar o mouse
  };
  
  const onPieLeave = () => {
    // Ao tirar o mouse, volta a destacar a fatia da aba selecionada (ou nenhuma)
    const newActiveIndex = dadosGraficoStatus.findIndex(
        (data) => data.name === filtroStatus
    );
    setActiveIndex(newActiveIndex !== -1 ? newActiveIndex : null);
  };

  // Handler para clique no gráfico (muda a aba selecionada)
  const handleChartClick = (data: any) => {
    if (data && data.name) {
        const statusName = data.name;
        // Verifica se o nome clicado é um status válido das abas
        if(statusDisponiveis.includes(statusName)) {
            handleFiltroStatusChange(statusName); // Muda a aba
        }
    }
  };

  // Abre o modal de detalhes para a nota clicada
  const abrirModalDetalhes = (nota: Nota) => {
    if (!nota.chave) {
      console.warn("Nota sem chave:", nota);
      return;
    }
    setNotaSelecionada(nota);
    setModalAberto(true);
  };

  // Função para buscar as notas da API
  const fetchNotas = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/nfe/nfe-consulta-notas-cabecalho", {
          method: "POST",
          // Não precisa enviar filtros aqui, pois filtramos no frontend
        });
        const data = await response.json();
        
        const allNotas = Array.isArray(data) ? data : [];

        // *** APLICANDO O FILTRO PERMANENTE AQUI ***
        const filteredNotas = allNotas.filter((nota: Nota) => {
          // Verifica se status_envio_unidade é uma string 'SIM' (case-insensitive e null-safe)
          const isEnviada = typeof nota.status_envio_unidade === 'string' &&
                            nota.status_envio_unidade.trim().toUpperCase() === 'SIM';
          // Verifica se a filial é '0402'
          const isFilialBA = nota.filial === '0402';
          return isEnviada && isFilialBA;
        });

        setNotas(filteredNotas); // Armazena apenas as notas filtradas no estado

        setChartKey(prevKey => prevKey + 1); // Atualiza chave do gráfico
        setLastUpdated(new Date()); // Registra hora da atualização
      } catch (error) {
        console.error("Erro ao buscar as notas:", error);
        setNotas([]); // Limpa as notas em caso de erro
      } finally {
        setLoading(false);
      }
    };

    // Filtra e Ordena as notas para exibição na tabela
    const notasFiltradasOrdenadas = useMemo(() => {
    // Começa com as notas já filtradas por filial/envio + filtros avançados
    let notasParaExibir = notasFiltradasPorAvancado.filter((nota) => {
      // Aplica o filtro da BUSCA textual
      const termo = busca.toLowerCase();
      const buscaOk = termo === '' || // Se busca vazia, passa
        nota.nome_fornecedor.toLowerCase().includes(termo) ||
        nota.nf.includes(termo) ||
        nota.chave.includes(termo);

      // Aplica o filtro da ABA DE STATUS
      let statusAbaOk = false;
      if (filtroStatus === 'Todos') {
        statusAbaOk = true;
      } else if (filtroStatus === 'Compras') {
        statusAbaOk = nota.status_compras?.trim().toUpperCase() !== 'CONCLUÍDO';
      } else if (filtroStatus === 'Fiscal') {
        statusAbaOk = nota.status_fiscal?.trim().toUpperCase() !== 'CONCLUÍDO';
      }
      // REMOVIDO: else if (filtroStatus === 'Enviadas')
      else {
          // Mapeia o nome da aba para o valor correspondente em status_nf
        const statusNfEquivalente = {
            "Erro I.A.": "erro i.a.",
            "Não Recebidas": "aguardando",
            "Importado": "importado",
            "Manual": "manual",
            "Falha ERP": "erro execauto"
        }[filtroStatus] || filtroStatus.toLowerCase(); // Fallback para outros casos
        
        statusAbaOk = nota.status_nf?.trim().toLowerCase() === statusNfEquivalente;
      }

       // A nota só é exibida se passar na busca E no filtro da aba
      return buscaOk && statusAbaOk;
    });

    // Aplica a ORDENAÇÃO da tabela
    if (sortConfig.key) {
      notasParaExibir.sort((a, b) => {
        const aValue = a[sortConfig.key!] ?? ''; // Trata null/undefined como string vazia para comparação
        const bValue = b[sortConfig.key!] ?? ''; // Trata null/undefined como string vazia para comparação

        // Compara como string (case-insensitive para texto) ou número
        let comparison = 0;
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          comparison = aValue.toLowerCase().localeCompare(bValue.toLowerCase());
        } else if (aValue < bValue) {
          comparison = -1;
        } else if (aValue > bValue) {
          comparison = 1;
        }

        return sortConfig.direction === 'asc' ? comparison : comparison * -1;
      });
    }

    return notasParaExibir;
  }, [notasFiltradasPorAvancado, busca, filtroStatus, sortConfig]); // Dependências da memoization

  // Handler para solicitar ordenação de uma coluna
  const requestSort = (key: keyof Nota) => {
    let direction: 'asc' | 'desc' = 'asc';
    // Se já está ordenado por essa chave ascendentemente, inverte para descendente
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Cálculo de paginação
  const totalPaginas = Math.ceil(notasFiltradasOrdenadas.length / itensPorPagina);
  const notasPaginadas = notasFiltradasOrdenadas.slice(
    (paginaAtual - 1) * itensPorPagina, // Índice inicial
    paginaAtual * itensPorPagina // Índice final (não inclusivo)
  );

  // Mapeamento de cores para o gráfico (Removido 'Enviadas')
  const coresStatus: Record<string, string> = {
    "Erro I.A.": "#ff6f61",
    "Não Recebidas": "var(--gcs-orange)",
    "Importado": "var(--gcs-green)",
    "Manual": "#343a40",
    "Falha ERP": "#8B0000", // Vermelho escuro
    "Compras": "#FFC107", // Amarelo
    "Fiscal": "#00314A", // Azul GCS
    // "Enviadas": "#17a2b8", // Ciano - Removido
  };

  // Componente para ícone de ordenação no cabeçalho da tabela
  const SortIcon = ({ columnKey }: { columnKey: keyof Nota }) => {
    if (sortConfig.key !== columnKey) {
      return <ChevronsUpDown size={14} style={{ marginLeft: '4px', color: '#ffffff80' }} />; // Ícone padrão
    }
    if (sortConfig.direction === 'asc') {
      return <ArrowUp size={14} style={{ marginLeft: '4px' }} />; // Seta para cima
    }
    return <ArrowDown size={14} style={{ marginLeft: '4px' }} />; // Seta para baixo
  };

  // Handler para exportar dados da tabela para Excel (XLSX)
  const handleExportXLSX = () => {
    // Define os cabeçalhos das colunas no Excel
    const headers = ["Status da Nota", "Filial", "Nota", "Série", "Tipo", "Fornecedor", "Recebimento", /* Removido Status Envio */ "Status Compras", "Status Fiscal", "Observação", "Responsável", "Chave"];

    // Mapeia os dados das notas filtradas e ordenadas para o formato de array de arrays
    const data = notasFiltradasOrdenadas.map(nota => {
      return [
        nota.status_lancamento || '',
        nota.filial,
        nota.nf,
        nota.serie,
        nota.tipo_nf || '',
        nota.nome_fornecedor,
        `${nota.dt_recebimento} ${nota.hr_Recebimento}`, // Combina data e hora
        // nota.status_envio_unidade || '', // Removido
        nota.status_compras || '',
        nota.status_fiscal || '',
        nota.observacao || '',
        nota.comprador || '',
        nota.chave
      ];
    });

    // Cria a estrutura de dados para a planilha (cabeçalhos + dados)
    const worksheetData = [headers, ...data];
    // Cria a planilha a partir do array de arrays
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // Define larguras aproximadas das colunas (ajustadas)
    worksheet['!cols'] = [
        { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 10 }, { wch: 10 },
        { wch: 40 }, { wch: 20 }, /* Removido um { wch: 20 } */ { wch: 20 }, { wch: 20 },
        { wch: 50 }, { wch: 25 }, { wch: 50 },
    ];

    // Cria um novo workbook (arquivo Excel)
    const workbook = XLSX.utils.book_new();
    // Adiciona a planilha ao workbook com o nome "Notas Fiscais"
    XLSX.utils.book_append_sheet(workbook, worksheet, "Notas Enviadas BA"); // Nome da aba alterado
    // Gera o arquivo e inicia o download
    XLSX.writeFile(workbook, "Consulta_Notas_Enviadas_BA.xlsx"); // Nome do arquivo alterado
  };

  // Formata o texto da legenda do gráfico
  const renderLegendText = (value: string) => {
    return <span style={{ marginLeft: '4px' }}>{value}</span>;
  };

  // Renderiza estado de carregamento de permissões
  if (authStatus === 'loading') {
    return (
        <div className="main-container" style={{ padding: "2rem", backgroundColor: "#E9ECEF", minHeight: "100vh" }}>
            <LoadingSpinner text="A verificar permissões..." />
        </div>
    );
  }

  // Renderiza estado de acesso negado
  if (authStatus === 'unauthorized') {
    return (
        <div className="main-container" style={{ padding: "2rem", backgroundColor: "#E9ECEF", minHeight: "100vh" }}>
            <AcessoNegado />
        </div>
    );
  }
  
  // Renderização principal da página
  return (<>
    {/* Estilos CSS específicos da página (mantidos) */}
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
        .filter-tabs-container { display: flex; flex-wrap: wrap; gap: 0.75rem; justify-content: center; }
        .tab-button { background: none; border: none; cursor: pointer; padding: 8px 12px 12px 12px; font-size: 1rem; font-weight: 500; color: var(--gcs-gray-dark); position: relative; transition: all 0.2s ease-in-out; }
        .tab-button::after { content: ''; position: absolute; bottom: -2px; right: 0; width: 100%; height: 100%; border-style: solid; border-color: transparent; border-image: none; opacity: 0; transform: scale(0.95); transition: all 0.2s ease-in-out; pointer-events: none; filter: drop-shadow(1px 1px 1px rgba(0,0,0,0.2)); }
        .tab-button:hover:not(.active):not(:disabled) { transform: translateY(-2px); color: var(--gcs-blue); } /* Adicionado :not(:disabled) */
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

        /* Media Queries para responsividade (inalterados) */
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
    `}</style>

    {/* Container Principal */}
    <div className="main-container" style={{ padding: "2rem", backgroundColor: "#E9ECEF", minHeight: "100vh" }}>

      {/* Cabeçalho com Gráfico, Título/Busca e KPIs */}
      <div className="header-wrapper" style={{ display: 'flex', alignItems: 'stretch', gap: '1.5rem', marginBottom: '1.5rem' }}>

        {/* Card do Gráfico */}
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
                    <PieChart key={chartKey}> {/* Usa a chave para forçar re-render */}
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
        
        {/* Card Principal (Título, Busca, Botões) */}
        <div className="main-content-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '1.5rem', paddingTop: '0.5rem', paddingBottom: '0.5rem' }}>
            {/* Título da Página (Alterado) */}
            <h2 className="page-title" style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold', color: 'var(--gcs-blue)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Send size={32} color="var(--gcs-blue)" /> {/* Ícone Send */}
                <span>Notas Enviadas - GCS Bahia</span>
            </h2>
            
            {/* Controles: Busca e Botões */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                {/* Input de Busca */}
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
                {/* Botões e Indicadores */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        {/* Botão Atualizar */}
                        <button onClick={fetchNotas} title="Atualizar Notas Fiscais" className="btn btn-outline-gray" style={{padding: '9px'}}>
                            <RefreshCcw size={20} />
                        </button>
                        {/* Botão Filtros Avançados */}
                        <FilterPopover
                            notas={notas} // Passa as notas atuais para gerar opções
                            onApplyFilters={handleApplyAdvancedFilters}
                            initialFilters={advancedFilters}
                        />
                        {/* Botão Exportar Excel */}
                        <button onClick={handleExportXLSX} title="Exportar para Excel" className="btn btn-outline-blue" style={{padding: '9px'}}>
                            <FileDown size={20} />
                        </button>
                    </div>
                    {/* Indicadores de Atualização e Filtros */}
                    <div style={{ height: 'auto', marginTop: '0.25rem', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                        {/* Mostra quando foi atualizado */}
                        {timeAgo && !loading && (
                          <span style={{ color: 'var(--gcs-gray-dark)', fontSize: '12px', fontStyle: 'italic' }}>
                              Atualizado {timeAgo}
                          </span>
                        )}
                        {/* Mostra se filtros estão aplicados */}
                        {areFiltersApplied && !loading && (
                          <span style={{ color: '#dc3545', fontSize: '12px', fontWeight: 'bold' }}>
                              Existem filtros aplicados
                          </span>
                        )}
                    </div>
                </div>
            </div>
        </div>

        {/* Card de KPIs */}
        <div className="kpi-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-around' }}>
            {/* KPI Notas Hoje */}
            <div style={{ textAlign: 'center' }}>
                <h4 style={{ color: 'var(--gcs-gray-dark)', margin: 0, fontWeight: 500, fontSize: '1rem', marginBottom: '0.25rem' }}>
                    Notas Hoje
                </h4>
                <p style={{ fontSize: '2.2rem', margin: 0, color: 'var(--gcs-green)', fontWeight: 'bold', lineHeight: 1.2 }}>
                    {notasProcessadasHoje}
                </p>
            </div>
            
            <hr style={{ width: '80%', border: 'none', borderTop: '1px solid var(--gcs-border-color)', margin: '0.5rem 0' }} />

            {/* KPI Pendentes */}
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

      {/* Card das Abas de Filtro de Status */}
      <div className="tabs-card" style={{ marginBottom: '1.5rem' }}>
        <div className="filter-tabs-container">
          {/* Mapeia os status disponíveis, exceto 'Enviadas' */}
          {statusDisponiveis.filter(s => s !== 'Enviadas').map((status) => {
            const isSelected = filtroStatus === status;
            const count = statusCounts[status] || 0;
            // Desabilita abas com contagem zero, exceto 'Todos' e a selecionada
            const isDisabled = count === 0 && status !== 'Todos' && !isSelected;
            return (
              <button
                key={status}
                onClick={() => !isDisabled && handleFiltroStatusChange(status)}
                className={`tab-button ${isSelected ? 'active' : ''}`}
                disabled={isDisabled}
                style={{ opacity: isDisabled ? 0.5 : 1, cursor: isDisabled ? 'not-allowed' : 'pointer'}}
              >
                {status} ({count})
              </button>
            )
          })}
        </div>
      </div>
      
      {/* Conteúdo Principal: Tabela ou Mensagens */}
      {loading ? (
        // Indicador de carregamento da tabela
        <LoadingSpinner text="Carregando notas..." />
      ) : notasFiltradasOrdenadas.length === 0 ? (
        // Mensagem se não houver notas para os filtros
        <div style={{ textAlign: "center", color: "var(--gcs-gray-dark)", marginTop: "4rem", fontSize: '1.1rem' }}>
          Nenhuma nota encontrada para os filtros aplicados.
        </div>
      ) : (
        // Tabela e Paginação
        <>
          {/* Wrapper para scroll horizontal em telas menores */}
          <div className="responsive-table-wrapper" style={{ overflowX: "auto", border: "1px solid var(--gcs-border-color)", borderRadius: "12px", background: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <table className="responsive-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: '14px' }}>
              {/* Cabeçalho da Tabela */}
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
              {/* Corpo da Tabela */}
              <tbody>
                {notasPaginadas.map((nota, index) => {
                  
                  const statusLancamento = nota.status_lancamento;
                  const statusNotaTexto = statusLancamento || 'N/A';
                  let statusNotaCor = 'var(--gcs-gray-dark)'; // Cor padrão

                  if (statusLancamento === 'Concluído') {
                      statusNotaCor = 'var(--gcs-green)';
                  } else if (statusLancamento === 'Pendente') {
                      statusNotaCor = 'var(--gcs-orange)';
                  }
                  // Adicionar outras cores se necessário

                  return (
                    // Linha da Tabela
                    <tr
                      key={nota.chave} // Usar chave única da nota como key
                      className="data-row"
                      style={{
                        borderTop: "1px solid var(--gcs-border-color)",
                        backgroundColor: index % 2 === 0 ? "#ffffff" : "var(--gcs-gray-light)" // Zebrado
                      }}
                    >
                      {/* Células da Linha (com data-label para responsividade) */}
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
                            <span style={{ color: 'var(--gcs-gray-dark)' }}>—</span> // Placeholder se não houver tipo
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
                      {/* Célula de Ações */}
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

          {/* Paginação */}
          <div style={{ marginTop: "2rem", display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Pagination
              current={paginaAtual}
              total={notasFiltradasOrdenadas.length}
              pageSize={itensPorPagina}
              onChange={(page) => setPaginaAtual(page)}
              showSizeChanger={false} // Esconde opção de mudar itens por página
            />
          </div>
        </>
      )}
    </div>

    {/* Renderiza o Modal de Detalhes (controlado pelo estado 'modalAberto') */}
    <ModalDetalhes
      chave={notaSelecionada?.chave || ""}
      visivel={modalAberto}
      onClose={() => setModalAberto(false)}
      nomeFornecedor={notaSelecionada?.nome_fornecedor}
      statusNF={notaSelecionada?.status_nf || ""}
      onActionSuccess={fetchNotas} // Passa fetchNotas para atualizar a lista após ação no modal
      statusCompras={notaSelecionada?.status_compras}
      observacao={notaSelecionada?.observacao}
      status_tes={notaSelecionada?.status_fiscal === 'CONCLUÍDO' ? 'PROCESSADA' : 'PENDENTE'} // Exemplo de mapeamento
    />
  </>);

}