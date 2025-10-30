"use client";

import { useEffect, useState, useMemo, useRef } from "react"; 
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, Table, Tag, Spin } from "antd";
import {
    PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList, LineChart, Line
} from "recharts";
import { Lock, LayoutDashboard, Sun, Moon } from "lucide-react"; 
import "antd/dist/reset.css";

// --- DEFINIÇÕES DE DADOS E INTERFACES ---

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
}

// Interface para os dados do novo gráfico
interface EnvioWpp {
  id: number;
  data_insercao: string;
  chave_acesso: string;
  telefone_whatsapp: string;
  nome_usuario: string;
  telefone_fmt_canon: string;
}

type RankingFilterType = 'geral' | 'mes' | 'semana';
type ThemeType = 'light' | 'dark'; // Novo tipo para o Tema

// Cores base (ainda usadas nas tags da tabela)
const coresStatusTabela: { [key: string]: string } = {
  lançadas: "#5FB246",
  pendentes: "#F58220",
  "com erro": "#00314A"
};

const labelStatusTabela: { [key: string]: string } = {
  lançadas: "Lançadas",
  pendentes: "Pendentes",
  "com erro": "Com Erro"
};


const availableMonths = ["Todos", "Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const mesesNomes = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

// --- FUNÇÃO HELPER DE DATA ---

const parseDate = (dateString: string | null | undefined): { day: number, month: number, year: number, dateObj: Date, display: string } | null => {
    if (!dateString) return null;
    try {
        let dateObj: Date;
        let displayDate = dateString;
        if (dateString.includes('T')) {
            dateObj = new Date(dateString);
            if (isNaN(dateObj.getTime())) return null;
            displayDate = dateObj.toLocaleString('pt-BR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(',', '');
        } else if (dateString.includes('/')) {
            const parts = dateString.split(' ');
            const dateParts = parts[0].split('/');
            if (dateParts.length !== 3) return null;
            const [day, month, year] = dateParts.map(Number);
            if (parts.length > 1 && parts[1].includes(':')) {
                const timeParts = parts[1].split(':').map(Number);
                dateObj = new Date(year, month - 1, day, timeParts[0] || 0, timeParts[1] || 0, timeParts[2] || 0);
            } else {
                dateObj = new Date(year, month - 1, day);
            }
            if (isNaN(dateObj.getTime())) return null;
        } else {
             return null;
        }
        return { day: dateObj.getDate(), month: dateObj.getMonth() + 1, year: dateObj.getFullYear(), dateObj: dateObj, display: displayDate };
    } catch (e) {
        console.warn("Erro ao parsear data:", dateString, e);
        return null;
    }
};

// --- COMPONENTES AUXILIARES ---

const LoadingSpinner = ({ text }: { text: string }) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center', height: '100vh' }}>
        <Spin size="large" />
        <div style={{ marginTop: '1rem', fontWeight: 'bold', color: 'var(--gcs-blue)' }} className="loading-text">{text}</div>
    </div>
);

const AcessoNegado = () => {
  const router = useRouter();
  return (
    <div className="content-card" style={{ textAlign: 'center', padding: '3rem', maxWidth: '600px', margin: '10vh auto', backgroundColor: '#fff', borderRadius: '12px' }}>
      <Lock size={48} color="var(--gcs-orange)" />
      <h2 style={{ marginTop: '1.5rem', color: 'var(--gcs-blue)' }}>Acesso Negado</h2>
      <p style={{ color: 'var(--gcs-gray-dark)', maxWidth: '400px', margin: '1rem auto' }}>Você não tem as permissões necessárias para visualizar esta página.</p>
      <button onClick={() => router.push('/painel')} className="btn btn-green" style={{ marginTop: '1rem' }}>Voltar ao Painel</button>
    </div>
  );
};

// Função de normalização de strings
const norm = (s: any) => (s ?? '').toString().normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().toLowerCase();

// --- COMPONENTE PRINCIPAL ---

export default function StatusOverview() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [authStatus, setAuthStatus] = useState<'loading' | 'authorized' | 'unauthorized'>('loading');
  const [notas, setNotas] = useState<Nota[]>([]);
  const [rankingEnvio, setRankingEnvio] = useState<EnvioWpp[]>([]); 
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState<string>("Todos");
  const [rankingFilter, setRankingFilter] = useState<RankingFilterType>('geral'); 
  const [theme, setTheme] = useState<ThemeType>('light'); // Estado para o tema
  const fetchFlagRef = useRef(false); 

  // Efeito para carregar o tema do localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('dashboardTheme') as ThemeType;
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  // Efeito para APLICAR E SALVAR o tema no localStorage e <body>
  useEffect(() => {
    localStorage.setItem('dashboardTheme', theme);
    document.body.classList.remove('light', 'dark');
    document.body.classList.add(theme);
  }, [theme]);
  
  const [chartData, setChartData] = useState<{ 
    dadosPorStatusPizza: any[], 
    dadosPorMes: any[], 
    dadosUltimos90Dias: any[],
    dadosLancadosVsEnviados: any[], 
    dadosTempoMedio: any[], 
    topFornecedoresProblema: any[], 
    pendentesPorComprador: any[],
    rankingEnvioData: any[] 
  }>({ 
    dadosPorStatusPizza: [], 
    dadosPorMes: [], 
    dadosUltimos90Dias: [],
    dadosLancadosVsEnviados: [], 
    dadosTempoMedio: [], 
    topFornecedoresProblema: [], 
    pendentesPorComprador: [],
    rankingEnvioData: [] 
  });

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'authenticated') {
      const user = session.user;
      const hasAccess = user?.is_admin === true || user?.funcoes?.includes('nfEntrada.visaoGeral');
      
      if (hasAccess) {
        setAuthStatus('authorized');
        
        if (fetchFlagRef.current === false) { 
          fetchAllData(); 
          fetchFlagRef.current = true; 
        }

      } else {
        setAuthStatus('unauthorized');
      }
    } else {
      router.push('/login');
    }
  }, [status, session, router]); 

  const fetchAllData = async () => {
      try {
        setLoading(true);

        const [resNotas, resRanking] = await Promise.all([
            fetch("/api/nfe/nfe-consulta-notas-cabecalho", { method: "POST" }),
            fetch("/api/nfe/nfe-envio-nfe-wpp", { 
                method: "POST",
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            }) 
        ]);

        if (resNotas.ok) {
            const dataNotas = await resNotas.json();
            setNotas(Array.isArray(dataNotas) ? dataNotas : []);
        } else {
            console.error("Erro ao buscar as notas:", await resNotas.text());
            setNotas([]);
        }

        if (resRanking.ok) {
            const dataRanking = await resRanking.json();
            setRankingEnvio(Array.isArray(dataRanking) ? dataRanking : []);
        } else {
            console.error("Erro ao buscar o ranking:", await resRanking.text());
            setRankingEnvio([]);
        }

      } catch (error) {
        console.error("Erro ao buscar dados do dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    notas.forEach(nota => {
        const parsedDate = parseDate(nota.dt_atualizacao);
        if (parsedDate) years.add(parsedDate.year.toString());
    });
    return ["Todos", ...Array.from(years).sort((a, b) => parseInt(b, 10) - parseInt(a, 10))];
  }, [notas]);

  const computedStats = useMemo(() => {
    const notasFiltradas = notas.filter(nota => {
        const parsedDate = parseDate(nota.dt_atualizacao);
        if (!parsedDate) return false;
        const yearMatch = (selectedYear === "Todos") || (parsedDate.year.toString() === selectedYear);
        const monthMatch = (selectedMonth === "Todos") || (availableMonths[parsedDate.month] === selectedMonth);
        return yearMatch && monthMatch;
    });

    const stats = { lançadasPizza: 0, pendentesPizza: 0, enviadasWhatsApp: 0, pendentesCompras: 0, pendentesFiscal: 0 };
    const processedNotas = [];
    const fornecedoresComProblema = new Map<string, number>();
    const pendentesPorCompradorMap = new Map<string, number>();
    const isCTE = (nota: Nota) => norm(nota.tipo_nf) === 'cte';

    for (const nota of notasFiltradas) {
      const parsedDate = parseDate(nota.dt_atualizacao);
      const nfStatusNorm = norm(nota.status_nf);
      const isLancada = nfStatusNorm === 'manual' || nfStatusNorm === 'importado';
      
      if(isLancada){ stats.lançadasPizza++; } else { stats.pendentesPizza++; }

      let statusTabelaKey: string = "pendentes";
       if (nfStatusNorm.includes('erro')) { statusTabelaKey = "com erro"; }
       else if (norm(nota.status_lancamento) === 'concluido' || nfStatusNorm === 'importado') { statusTabelaKey = "lançadas"; }

      if (nota.status_envio_unidade?.trim().toUpperCase() === 'SIM') stats.enviadasWhatsApp++;
      if (norm(nota.status_compras) !== 'concluido' && !isCTE(nota)) stats.pendentesCompras++;
      if (norm(nota.status_fiscal) !== 'concluido') stats.pendentesFiscal++;

      processedNotas.push({
        key: nota.chave || nota.nf, numero: nota.nf, status: statusTabelaKey,
        descricao: nota.observacao || `Status: ${nota.status_nf || 'N/A'}`,
        data: parsedDate?.display || nota.dt_atualizacao, dateObj: parsedDate?.dateObj || new Date(0),
      });

      const fornecedor = (nota.nome_fornecedor ?? '').trim();
      const isProblemNote = nfStatusNorm === 'manual' || nfStatusNorm.includes('erro');
      if (isProblemNote && fornecedor && !isCTE(nota)) {
        fornecedoresComProblema.set(fornecedor, (fornecedoresComProblema.get(fornecedor) || 0) + 1);
      }
      if (norm(nota.status_compras) !== 'concluido' && !isCTE(nota)) {
        const comprador = nota.comprador || "Sem Responsável";
        pendentesPorCompradorMap.set(comprador, (pendentesPorCompradorMap.get(comprador) || 0) + 1);
      }
    }

    const dadosPorStatusPizza = [
      { name: "Lançadas", value: stats.lançadasPizza },
      { name: "Pendentes", value: stats.pendentesPizza }
    ];
    
    const ultimasNotas = processedNotas.sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime()).slice(0, 5);
    const topFornecedoresProblema = Array.from(fornecedoresComProblema.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5);
    const pendentesPorComprador = Array.from(pendentesPorCompradorMap.entries()).map(([name, pendencias]) => ({ name, pendencias })).sort((a, b) => b.pendencias - a.pendencias);
    
    const mesesContagem = mesesNomes.reduce((acc, mes) => ({ ...acc, [mes]: { manual: 0, automatico: 0, totalDias: 0, count: 0 } }), {} as any);

    if (selectedYear !== "Todos") {
        const notasParaGraficosAnuais = notas.filter(n => {
            const parsedLcto = parseDate(n.dt_lcto_protheus);
            return parsedLcto ? parsedLcto.year.toString() === selectedYear : false;
        });
        for (const nota of notasParaGraficosAnuais) {
            const parsedLcto = parseDate(nota.dt_lcto_protheus)!;
            const mesNome = mesesNomes[parsedLcto.month - 1];
            const statusNf = norm(nota.status_nf);
            if (statusNf === 'manual') mesesContagem[mesNome].manual++;
            else if (statusNf === 'importado') mesesContagem[mesNome].automatico++;
            const parsedRecebimento = parseDate(nota.dt_recebimento);
            if(parsedRecebimento && parsedLcto.dateObj >= parsedRecebimento.dateObj){
                const diffTime = parsedLcto.dateObj.getTime() - parsedRecebimento.dateObj.getTime();
                const diffDays = diffTime / (1000 * 60 * 60 * 24);
                mesesContagem[mesNome].totalDias += diffDays;
                mesesContagem[mesNome].count++;
            }
        }
    }

    const dadosPorMes = mesesNomes.map(mes => ({ mes, manual: mesesContagem[mes].manual, automatico: mesesContagem[mes].automatico })).filter(d => d.manual > 0 || d.automatico > 0);
    const dadosTempoMedio = mesesNomes.map(mes => ({ mes, dias: mesesContagem[mes].count > 0 ? mesesContagem[mes].totalDias / mesesContagem[mes].count : 0 })).filter(d => d.dias > 0);
    
    // --- LÓGICA GRÁFICOS 90 DIAS ---
    const lineChartData = new Map<string, { manual: number, automatico: number }>();
    const today = new Date();
    today.setHours(23, 59, 59, 999); 
    
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(today.getDate() - 90);
    ninetyDaysAgo.setHours(0, 0, 0, 0);

    for (const nota of notas) {
        const parsedDate = parseDate(nota.dt_lcto_protheus);
        if (parsedDate && parsedDate.dateObj >= ninetyDaysAgo && parsedDate.dateObj <= today) {
            const dateKey = parsedDate.dateObj.toISOString().split('T')[0];
            if (!lineChartData.has(dateKey)) lineChartData.set(dateKey, { manual: 0, automatico: 0 });
            const dayData = lineChartData.get(dateKey)!;
            const statusNf = norm(nota.status_nf);
            if (statusNf === 'manual') dayData.manual++;
            else if (statusNf === 'importado') dayData.automatico++;
        }
    }

    const sortedLineChartData = Array.from(lineChartData.entries()).map(([date, counts]) => ({ date: `${date.split('-')[2]}/${date.split('-')[1]}`, fullDate: date, ...counts })).sort((a, b) => a.fullDate.localeCompare(b.fullDate));
    const firstActiveDayIndex = sortedLineChartData.findIndex(d => d.manual > 0 || d.automatico > 0);
    const dadosUltimos90Dias = firstActiveDayIndex > -1 ? sortedLineChartData.slice(firstActiveDayIndex) : [];

    // --- LÓGICA DO GRÁFICO (Lançados vs Enviados) ---
    const lancadosVsEnviadosMap = new Map<string, { lancados: number, enviados: number }>();

    for (const [dateKey, counts] of lineChartData.entries()) {
        lancadosVsEnviadosMap.set(dateKey, {
            lancados: counts.manual + counts.automatico,
            enviados: 0
        });
    }

    for (const envio of rankingEnvio) {
        const parsedDate = parseDate(envio.data_insercao);
        if (parsedDate && parsedDate.dateObj >= ninetyDaysAgo && parsedDate.dateObj <= today) {
            const dateKey = parsedDate.dateObj.toISOString().split('T')[0];
            const entry = lancadosVsEnviadosMap.get(dateKey) || { lancados: 0, enviados: 0 };
            entry.enviados++;
            lancadosVsEnviadosMap.set(dateKey, entry);
        }
    }
    
    const sortedLancadosVsEnviados = Array.from(lancadosVsEnviadosMap.entries())
        .map(([date, counts]) => ({ 
            date: `${date.split('-')[2]}/${date.split('-')[1]}`, 
            fullDate: date, 
            ...counts 
        }))
        .sort((a, b) => a.fullDate.localeCompare(b.fullDate));
        
    const firstActiveDayIndexLvE = sortedLancadosVsEnviados.findIndex(d => d.lancados > 0 || d.enviados > 0);
    const dadosLancadosVsEnviados = firstActiveDayIndexLvE > -1 ? sortedLancadosVsEnviados.slice(firstActiveDayIndexLvE) : [];
    
    // --- LÓGICA DO GRÁFICO RANKING BAR (COM FILTRO) ---
    const todayRanking = new Date();
    todayRanking.setHours(23, 59, 59, 999);
    
    const lastWeek = new Date();
    lastWeek.setDate(todayRanking.getDate() - 7);
    lastWeek.setHours(0, 0, 0, 0);

    const lastMonth = new Date();
    lastMonth.setDate(todayRanking.getDate() - 30);
    lastMonth.setHours(0, 0, 0, 0);

    const filteredRankingEnvio = rankingEnvio.filter(envio => {
        if (rankingFilter === 'geral') return true;
        
        const parsedDate = parseDate(envio.data_insercao);
        if (!parsedDate) return false;
        
        if (rankingFilter === 'semana') {
            return parsedDate.dateObj >= lastWeek && parsedDate.dateObj <= todayRanking;
        }
        if (rankingFilter === 'mes') {
            return parsedDate.dateObj >= lastMonth && parsedDate.dateObj <= todayRanking;
        }
        return false;
    });

    const rankingCounts = new Map<string, number>();
    for (const envio of filteredRankingEnvio) { 
        const user = envio.nome_usuario || "Desconhecido";
        rankingCounts.set(user, (rankingCounts.get(user) || 0) + 1);
    }
    const rankingEnvioData = Array.from(rankingCounts.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10); 

    return { 
        totalNotas: notasFiltradas.length, 
        stats, 
        dadosPorStatusPizza, 
        ultimasNotas, 
        dadosPorMes, 
        dadosUltimos90Dias, 
        dadosTempoMedio, 
        topFornecedoresProblema, 
        pendentesPorComprador,
        rankingEnvioData, 
        dadosLancadosVsEnviados 
    };
  }, [notas, selectedYear, selectedMonth, rankingEnvio, rankingFilter]);

  useEffect(() => {
      if (!loading) {
        const timer = setTimeout(() => setChartData(computedStats), 100);
        return () => clearTimeout(timer);
      }
  }, [loading, computedStats]);


  const columns = [
    { title: "", dataIndex: "status", key: "statusIcon", render: (status: string) => (<span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", backgroundColor: coresStatusTabela[status] || "#ccc", marginRight: 8 }}/>)},
    { title: "Número", dataIndex: "numero", key: "numero" },
    { title: "Status", dataIndex: "status", key: "status", render: (status: string) => (<Tag color={coresStatusTabela[status] || "#ccc"} style={{ color: "#fff", fontWeight: "bold" }}>{labelStatusTabela[status] || "Desconhecido"}</Tag>)},
    { title: "Descrição", dataIndex: "descricao", key: "descricao" },
    { title: "Data Atualização", dataIndex: "data", key: "data" },
  ];

  if (authStatus === 'loading') return <div style={{ backgroundColor: "#E9ECEF", minHeight: "100vh" }}><LoadingSpinner text="A verificar permissões..." /></div>;
  if (authStatus === 'unauthorized') return <div style={{ padding: "2rem", backgroundColor: "#E9ECEF", minHeight: "100vh" }}><AcessoNegado /></div>;

  // --- ESTILOS DINÂMICOS BASEADOS NO TEMA ---
  
  const filterStyle: React.CSSProperties = { 
    background: 'none', 
    border: theme === 'light' ? '1px solid #ccc' : '1px solid #475569', 
    padding: '4px 8px', 
    margin: '0 2px', 
    borderRadius: '4px', 
    cursor: 'pointer', 
    fontSize: '12px',
    fontWeight: '500',
    color: theme === 'light' ? '#555' : '#94A3B8' 
  };
  const activeFilterStyle: React.CSSProperties = { 
    ...filterStyle, 
    background: 'var(--gcs-blue)', 
    color: 'white', 
    borderColor: 'var(--gcs-blue)' 
  };
  
  const glassTooltipStyle: React.CSSProperties = theme === 'light' ? {
    background: 'rgba(255, 255, 255, 0.25) !important',
    backdropFilter: 'blur(16px) !important',
    WebkitBackdropFilter: 'blur(16px) !important',
    border: '1px solid rgba(255, 255, 255, 0.3) !important',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05) !important'
  } : { 
    background: 'rgba(25, 39, 53, 0.5) !important', 
    backdropFilter: 'blur(16px) !important',
    WebkitBackdropFilter: 'blur(16px) !important',
    border: '1px solid rgba(125, 173, 222, 0.2) !important', 
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1) !important'
  };

  const tooltipLabelStyle: React.CSSProperties = {
    color: theme === 'light' ? '#00314A' : '#E2E8F0', 
    fontWeight: 'bold',
    marginBottom: '5px'
  };

  const tooltipItemStyle: React.CSSProperties = {
    color: theme === 'light' ? '#333' : '#CBD5E1' 
  };
  
  return (
    <div className="dashboard-container" style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
      
      {/* --- DEFINIÇÕES DE GRADIENTE SVG --- */}
      <svg width="0" height="0" style={{ position: 'absolute', zIndex: -1 }}>
        <defs>
          {/* Gradiente Azul (Automático / Pendências) - TEMA CLARO */}
          <linearGradient id="gradAzul" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#004a6f" /> 
            <stop offset="100%" stopColor="#00314A" /> 
          </linearGradient>

          {/* NOVO: Gradiente Azul Elétrico (Ciano) - TEMA ESCURO */}
          <linearGradient id="gradEletrico" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00FFFF" /> {/* Ciano Brilhante */}
            <stop offset="100%" stopColor="#00BFFF" /> {/* DeepSkyBlue */}
          </linearGradient>

          {/* Gradiente Laranja (Manual / Pendente) */}
          <linearGradient id="gradLaranja" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f79b4d" /> 
            <stop offset="100%" stopColor="#F58220" /> 
          </linearGradient>
          {/* Gradiente Verde (Lançadas / Enviadas) */}
          <linearGradient id="gradVerde" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7ac962" /> 
            <stop offset="100%" stopColor="#5FB246" /> 
          </linearGradient>
        </defs>
      </svg>
      
      <div className="content-wrapper">
        {loading ? <LoadingSpinner text="Carregando dados do dashboard..." /> : (
          <>
            {/* Cabeçalho */}
            <div className="header-wrapper">
                <div className="main-content-card header-content">
                    <h2 className="page-title">
                        <LayoutDashboard size={28} /> 
                        <span>Visão Geral</span>
                    </h2>
                    <div className="header-controls"> 
                      <div className="filters-container">
                          <div>
                              <label>Ano:</label>
                              <select value={selectedYear} onChange={(e) => { setSelectedYear(e.target.value); setSelectedMonth("Todos"); }}>
                                  {availableYears.map(year => <option key={year} value={year}>{year}</option>)}
                              </select>
                          </div>
                          <div>
                              <label>Mês:</label>
                              <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} disabled={selectedYear === "Todos"}>
                                  {availableMonths.map((month) => <option key={month} value={month}>{month}</option>)}
                              </select>
                          </div>
                      </div>
                      <button 
                        onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} 
                        className="theme-toggle-btn"
                        aria-label={theme === 'light' ? 'Mudar para tema escuro' : 'Mudar para tema claro'}
                      >
                          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                      </button>
                    </div>
                </div>
            </div>

            {/* KPIs */}
            <div className="kpi-grid">
              <Card className="kpi-card"><h3 >Notas Processadas</h3><h2>{computedStats.totalNotas}</h2></Card>
              <Card className="kpi-card"><h3 >Enviadas WhatsApp</h3><h2 style={{ color: "#5FB246" }}>{computedStats.stats.enviadasWhatsApp}</h2></Card>
              <Card className="kpi-card"><h3 >Pendentes Compras</h3><h2 style={{ color: "#F58220" }}>{computedStats.stats.pendentesCompras}</h2></Card>
              <Card className="kpi-card"><h3 >Pendentes Fiscal</h3><h2>{computedStats.stats.pendentesFiscal}</h2></Card>
            </div>

            {/* Gráficos Principais */}
            <div className="chart-grid-two-column">
              <Card title="Notas por Status (Filtro)" className="kpi-card">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={chartData.dadosPorStatusPizza} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                      {chartData.dadosPorStatusPizza.map((entry, index) => {
                          const pieFill = entry.name.toLowerCase() === 'lançadas' ? 'url(#gradVerde)' : 'url(#gradLaranja)';
                          return <Cell key={`cell-${index}`} fill={pieFill} />;
                      })}
                    </Pie>
                    <Tooltip contentStyle={glassTooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
              <Card title={`Lançamentos no Protheus (Ano: ${selectedYear})`} className="kpi-card">
                {selectedYear === "Todos" ? <div className="chart-placeholder">Selecione um ano para ver o detalhamento mensal.</div> : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData.dadosPorMes} margin={{ top: 20, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="mes" />
                      <YAxis />
                      <Tooltip contentStyle={glassTooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} />
                      <Legend verticalAlign="bottom" height={36} />
                      <Bar dataKey="manual" name="Manual" fill="url(#gradLaranja)" stackId="a" />
                      {/* MUDANÇA AQUI */}
                      <Bar 
                        dataKey="automatico" 
                        name="Automático" 
                        fill={theme === 'dark' ? 'url(#gradEletrico)' : 'url(#gradAzul)'} 
                        stackId="a"
                      >
                        <LabelList 
                          position="top" 
                          content={(props: any) => {
                            const {x, y, width, index} = props; 
                            const data = chartData.dadosPorMes[index]; 
                            if (!data) return null; 
                            const total = data.manual + data.automatico; 
                            return (<text x={(x ?? 0) + (width ?? 0) / 2} y={y} className="recharts-bar-total-label" textAnchor="middle" dy={-6} fontSize={12} fontWeight="bold">{total > 0 ? total : ''}</text>)
                          }} 
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Card>
            </div>
            
            {/* Gráfico de Linha 90 dias */}
            <Card title="Lançamentos no Protheus por Dia (Últimos 90 dias)" className="kpi-card chart-full-width">
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={chartData.dadosUltimos90Dias} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip contentStyle={glassTooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} />
                  <Legend verticalAlign="bottom" height={36} />
                  <Line type="monotone" dataKey="manual" name="Manual" stroke="url(#gradLaranja)" strokeWidth={3} />
                  {/* MUDANÇA AQUI */}
                  <Line 
                    type="monotone" 
                    dataKey="automatico" 
                    name="Automático" 
                    stroke={theme === 'dark' ? 'url(#gradEletrico)' : 'url(#gradAzul)'} 
                    strokeWidth={3} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            {/* NOVO GRÁFICO (LANÇADOS VS ENVIADOS) */}
            <Card title="Lançados vs Enviados (Últimos 90 dias)" className="kpi-card chart-full-width">
              <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={chartData.dadosLancadosVsEnviados} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip contentStyle={glassTooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} />
                      <Legend verticalAlign="bottom" height={36} />
                      {/* MUDANÇA AQUI */}
                      <Line 
                        type="monotone" 
                        dataKey="lancados" 
                        name="Total Lançado" 
                        stroke={theme === 'dark' ? 'url(#gradEletrico)' : 'url(#gradAzul)'} 
                        strokeWidth={3} 
                      />
                      <Line type="monotone" dataKey="enviados" name="Total Enviado" stroke="url(#gradVerde)" strokeWidth={3} />
                  </LineChart>
              </ResponsiveContainer>
            </Card>

            {/* Gráfico Tempo Médio */}
            <Card title={`Tempo Médio de Lançamento (Ano: ${selectedYear})`} className="kpi-card chart-full-width">
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={chartData.dadosTempoMedio} margin={{ top: 20, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" />
                  <YAxis label={{ value: 'Dias', angle: -90, position: 'insideLeft' }} />
                  <Tooltip formatter={(value: number) => `${value.toFixed(2)} dias`} contentStyle={glassTooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} />
                  {/* MUDANÇA AQUI */}
                  <Bar 
                    dataKey="dias" 
                    name="Média de Dias" 
                    fill={theme === 'dark' ? 'url(#gradEletrico)' : 'url(#gradAzul)'}
                  >
                    <LabelList dataKey="dias" position="top" formatter={(value: number) => value > 0 ? value.toFixed(1) : ''} className="recharts-bar-days-label" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* Gráficos de Análise */}
            <div className="chart-grid-two-column">
                <Card title="Top 5 Fornecedores com Problemas (Filtro)" className="kpi-card">
                    {chartData.topFornecedoresProblema.length === 0 ? (<div className="chart-placeholder">Nenhum fornecedor com problema no período.</div>) : (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart layout="vertical" data={chartData.topFornecedoresProblema} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" allowDecimals={false} />
                          <YAxis type="category" dataKey="name" width={150} interval={0} scale="band" tickFormatter={(tick) => tick.length > 20 ? `${tick.substring(0, 20)}...` : tick} />
                          <Tooltip contentStyle={glassTooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} />
                          <Bar dataKey="count" name="Notas com Problema" fill="url(#gradLaranja)">
                            <LabelList dataKey="count" position="right" />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                </Card>
                <Card title="Notas Pendentes por Usuário (Filtro)" className="kpi-card">
                   {chartData.pendentesPorComprador.length === 0 ? (<div className="chart-placeholder">Nenhuma pendência no período.</div>) : (
                     <ResponsiveContainer width="100%" height={300}>
                       <BarChart layout="vertical" data={chartData.pendentesPorComprador} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" allowDecimals={false} />
                        <YAxis type="category" dataKey="name" width={120} interval={0} scale="band" />
                        <Tooltip contentStyle={glassTooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} />
                        {/* MUDANÇA AQUI */}
                        <Bar 
                          dataKey="pendencias" 
                          name="Pendências" 
                          fill={theme === 'dark' ? 'url(#gradEletrico)' : 'url(#gradAzul)'}
                        >
                          <LabelList dataKey="pendencias" position="right" />
                        </Bar>
                       </BarChart>
                     </ResponsiveContainer>
                   )}
                </Card>
            </div>

            {/* --- GRÁFICO RANKING DE ENVIO (COM FILTRO) --- */}
            <Card 
              title="Ranking de Envio (Qtd de Notas)" 
              className="kpi-card chart-full-width" 
              style={{ marginTop: '1rem' }}
              extra={(
                <div>
                  <button 
                    style={rankingFilter === 'geral' ? activeFilterStyle : filterStyle} 
                    onClick={() => setRankingFilter('geral')}
                  >
                    Geral
                  </button>
                  <button 
                    style={rankingFilter === 'mes' ? activeFilterStyle : filterStyle} 
                    onClick={() => setRankingFilter('mes')}
                  >
                    Último Mês
                  </button>
                  <button 
                    style={rankingFilter === 'semana' ? activeFilterStyle : filterStyle} 
                    onClick={() => setRankingFilter('semana')}
                  >
                    Última Semana
                  </button>
                </div>
              )}
            >
              {chartData.rankingEnvioData.length === 0 ? (<div className="chart-placeholder">Nenhum envio por WhatsApp no período selecionado.</div>) : (
                  <ResponsiveContainer width="100%" height={300}>
                      <BarChart layout="vertical" data={chartData.rankingEnvioData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" allowDecimals={false} />
                          <YAxis type="category" dataKey="name" width={150} interval={0} scale="band" tickFormatter={(tick) => tick.length > 20 ? `${tick.substring(0, 20)}...` : tick} />
                          <Tooltip contentStyle={glassTooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} />
                          <Bar dataKey="count" name="Notas Enviadas" fill="url(#gradVerde)">
                              <LabelList dataKey="count" position="right" />
                          </Bar>
                      </BarChart>
                  </ResponsiveContainer>
              )}
            </Card>

            {/* Tabela (AGORA COM A CLASSE "kpi-card") */}
            <Card title="Últimas Notas Processadas (Filtro)" className="kpi-card chart-full-width" style={{ marginTop: '1rem' }}>
              <Table columns={columns} dataSource={computedStats.ultimasNotas} pagination={false} scroll={{ x: true }} />
            </Card>
          </>
        )}
      </div> 


      {/* --- ESTILOS GLOBAIS COM TEMA CLARO E ESCURO --- */}
      <style jsx global>{`
        :root { 
          --gcs-blue: #00314A; 
          --gcs-green: #5FB246; 
          --gcs-orange: #F58220; 
          --gcs-gray-dark: #6c757d; 
        }
        
        /* --- TEMA CLARO (LIGHT) - PADRÃO --- */

        body.light { 
          background-color: #D7DDE0 !important; 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          position: relative; 
          overflow-x: hidden !important; 
          transition: background-color 0.3s ease;
        }
        
        @keyframes animateGradient { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        body { background-image: none !important; animation: none !important; }
        body::before, body::after { display: none; }
        
        .dashboard-container { 
          padding: 1rem; 
          position: relative; 
          z-index: 1; 
        } 

        .content-wrapper {
          position: relative;
          z-index: 2; 
        }

        /* --- ESTILO GLASMORFISMO CLARO --- */
        
        body.light .kpi-card.ant-card {
            background: rgba(255, 255, 255, 0.25) !important; 
            backdrop-filter: blur(16px) !important; 
            -webkit-backdrop-filter: blur(16px) !important; 
            border: 1px solid rgba(255, 255, 255, 0.3) !important; 
            border-radius: 12px !important;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05) !important;
            transition: all 0.3s ease;
            margin-bottom: 1rem;
        }
        
        body.light .main-content-card {
            background: rgba(255, 255, 255, 0.25) !important; 
            backdrop-filter: blur(16px) !important; 
            -webkit-backdrop-filter: blur(16px) !important;
            border: 1px solid rgba(255, 255, 255, 0.3) !important; 
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
            transition: all 0.3s ease;
            margin-bottom: 1rem;
            padding: 1rem;
        }

        body.light .kpi-card .ant-card-body,
        body.light .kpi-card .ant-card-head {
            background: transparent !important;
        }
        
        body.light .kpi-card.ant-card:hover,
        body.light .main-content-card:hover {
            transform: translateY(-5px); 
            box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1) !important; 
            background: rgba(255, 255, 255, 0.5) !important; 
        }

        /* --- Textos tema claro --- */
        body.light .ant-card-head {
            color: #333 !important; 
            border-bottom-color: rgba(0, 0, 0, 0.1) !important; 
        }
        body.light .kpi-card h3 { margin: 0 0 0.5rem 0; color: #555; text-align: center; font-size: 0.9rem; font-weight: 500; }
        body.light .kpi-card h2 { margin: 0; font-size: 2rem; color: #00314A; text-align: center; }
        body.light .page-title { color: var(--gcs-blue); }
        body.light .page-title svg { color: var(--gcs-blue); }
        body.light .filters-container label { color: #333; }
        body.light .loading-text { color: var(--gcs-blue); }
        
        /* Estilo Claro para Select */
        body.light .filters-container select { 
            padding: 6px 10px; 
            border-radius: 6px; 
            border: 1px solid #ccc; 
            flex-grow: 1; 
            background-color: #fff;
            color: #333;
        }

        /* --- Tabela Antd (Claro) --- */
        body.light .kpi-card .ant-table { background: transparent !important; }
        body.light .kpi-card .ant-table-thead > tr > th {
            background: transparent !important; color: #333 !important;
            font-weight: 600; border-bottom: 1px solid rgba(0, 0, 0, 0.2) !important;
        }
        body.light .kpi-card .ant-table-tbody > tr > td {
            background: transparent !important; border-bottom: 1px solid rgba(0, 0, 0, 0.1) !important;
            color: #333; 
        }
        body.light .kpi-card .ant-table-tbody > tr.ant-table-row:hover > td {
            background: rgba(255, 255, 255, 0.3) !important; 
        }
        body.light .kpi-card .ant-table-empty .ant-empty-description { color: #555; }

        /* Fontes do Recharts (Claro) */
        body.light .recharts-text.recharts-cartesian-axis-tick-value { font-size: 11px; fill: #555 !important; }
        body.light .recharts-legend-item-text { font-size: 12px; color: #333 !important; }
        body.light .recharts-label { fill: #555 !important; }
        body.light .recharts-bar-total-label { fill: #333; }
        body.light .recharts-bar-days-label { fill: #333 !important; }


        /* --- TEMA ESCURO (DARK) - SCI-FI --- */
        
        body.dark {
          background: radial-gradient(ellipse at bottom, #1B2735 0%, #090A0F 100%) !important;
          background-attachment: fixed !important;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          position: relative; 
          overflow-x: hidden !important; 
          transition: background-color 0.3s ease;
        }

        /* --- ESTILO GLASMORFISMO ESCURO (SCI-FI) --- */

        body.dark .kpi-card.ant-card {
            background: rgba(25, 39, 53, 0.25) !important; 
            backdrop-filter: blur(16px) !important;
            -webkit-backdrop-filter: blur(16px) !important; 
            border: 1px solid rgba(125, 173, 222, 0.2) !important; 
            border-radius: 12px !important;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1) !important;
            transition: all 0.3s ease;
            margin-bottom: 1rem;
        }

        body.dark .main-content-card {
            background: rgba(25, 39, 53, 0.25) !important; 
            backdrop-filter: blur(16px) !important; 
            -webkit-backdrop-filter: blur(16px) !important;
            border: 1px solid rgba(125, 173, 222, 0.2) !important; 
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            transition: all 0.3s ease;
            margin-bottom: 1rem;
            padding: 1rem;
        }

        body.dark .kpi-card .ant-card-body,
        body.dark .kpi-card .ant-card-head {
            background: transparent !important;
        }

        body.dark .kpi-card.ant-card:hover,
        body.dark .main-content-card:hover {
            transform: translateY(-5px); 
            box-shadow: 0 12px 24px rgba(0, 0, 0, 0.2) !important; 
            background: rgba(25, 39, 53, 0.5) !important; 
        }

        /* --- Textos tema escuro --- */
        body.dark .ant-card-head {
            color: #E2E8F0 !important; 
            border-bottom-color: rgba(125, 173, 222, 0.2) !important; 
        }
        body.dark .kpi-card h3 { margin: 0 0 0.5rem 0; color: #94A3B8; text-align: center; font-size: 0.9rem; font-weight: 500; }
        body.dark .kpi-card h2 { margin: 0; font-size: 2rem; color: #F1F5F9; text-align: center; } 
        body.dark .page-title { color: #93C5FD; } 
        body.dark .page-title svg { color: #93C5FD; }
        body.dark .filters-container label { color: #E2E8F0; }
        body.dark .loading-text { color: #93C5FD; }
        
        /* Estilo Escuro para Select */
        body.dark .filters-container select { 
            padding: 6px 10px; 
            border-radius: 6px; 
            border: 1px solid #475569; 
            flex-grow: 1; 
            background-color: #1E293B; 
            color: #E2E8F0; 
        }

        /* --- Tabela Antd (Escuro) --- */
        body.dark .kpi-card .ant-table { background: transparent !important; }
        body.dark .kpi-card .ant-table-thead > tr > th {
            background: transparent !important; color: #E2E8F0 !important;
            font-weight: 600; border-bottom: 1px solid rgba(125, 173, 222, 0.2) !important;
        }
        body.dark .kpi-card .ant-table-tbody > tr > td {
            background: transparent !important; border-bottom: 1px solid rgba(125, 173, 222, 0.1) !important;
            color: #CBD5E1; 
        }
        body.dark .kpi-card .ant-table-tbody > tr.ant-table-row:hover > td {
            background: rgba(40, 60, 80, 0.3) !important; 
        }
        body.dark .kpi-card .ant-table-empty .ant-empty-description { color: #94A3B8; }


        /* Fontes do Recharts (Escuro) */
        body.dark .recharts-text.recharts-cartesian-axis-tick-value { font-size: 11px; fill: #94A3B8 !important; }
        body.dark .recharts-legend-item-text { font-size: 12px; color: #E2E8F0 !important; }
        body.dark .recharts-label { fill: #94A3B8 !important; }
        body.dark .recharts-bar-total-label { fill: #F1F5F9; } 
        body.dark .recharts-bar-days-label { fill: #F1F5F9 !important; } 

        /* --- ESTILOS COMPARTILHADOS --- */

        .kpi-grid { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); margin-bottom: 1rem; }
        .chart-grid-two-column { display: grid; gap: 1rem; grid-template-columns: 1fr; margin-bottom: 1rem; } 
        .chart-full-width { margin-bottom: 1rem; }

        .header-wrapper { margin-bottom: 1rem; }
        .header-content { display: flex; flex-direction: column; align-items: flex-start; gap: 1rem; }
        .page-title { margin: 0; font-size: 1.5rem; font-weight: bold; display: flex; align-items: center; gap: 0.75rem; }
        
        .header-controls { display: flex; flex-direction: column; gap: 1rem; width: 100%; }
        .filters-container { display: flex; flex-direction: column; gap: 0.8rem; width: 100%; }
        .filters-container div { display: flex; align-items: center; gap: 0.5rem; }
        .filters-container label { font-weight: 500; white-space: nowrap; }
        
        .theme-toggle-btn {
          background: none;
          border: 1px solid transparent;
          border-radius: 8px;
          padding: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          align-self: flex-end; 
        }
        body.light .theme-toggle-btn { color: var(--gcs-blue); border-color: #ccc; }
        body.dark .theme-toggle-btn { color: #93C5FD; border-color: #475569; }
        body.light .theme-toggle-btn:hover { background: rgba(0, 0, 0, 0.05); }
        body.dark .theme-toggle-btn:hover { background: rgba(255, 255, 255, 0.1); }


        .chart-placeholder { height: 300px; display: flex; align-items: center; justify-content: center; text-align: center; }
        body.light .chart-placeholder { color: #888; }
        body.dark .chart-placeholder { color: #94A3B8; }

        .btn { cursor: pointer; font-weight: 600; display: inline-flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s ease-in-out; border: 1px solid transparent; padding: 10px 20px; border-radius: 8px; }
        .btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .btn-green { background-color: var(--gcs-green); color: white; }
        .btn-green:hover:not(:disabled) { background-color: #4a9d3a; }

        /* --- Media Query para Telas Maiores --- */
        @media (min-width: 768px) {
            .dashboard-container { padding: 2rem; }
            .kpi-card { margin-bottom: 0; } 
            .chart-grid-two-column { grid-template-columns: repeat(2, 1fr); margin-bottom: 2rem; }
            .chart-full-width { margin-bottom: 2rem; }
            .kpi-card.chart-full-width[style*="margin-top: 1rem"] { margin-top: 2rem !important; }
            .header-wrapper { margin-bottom: 1.5rem; }
            .main-content-card { padding: 1.5rem; }
            .header-content { flex-direction: row; align-items: center; justify-content: space-between; }
            .page-title { font-size: 1.75rem; margin-bottom: 0; }
            
            .header-controls { flex-direction: row; align-items: center; gap: 1.5rem; width: auto; }
            .filters-container { flex-direction: row; gap: 1.5rem; width: auto; }
            .filters-container div { gap: 0.8rem; }
            .filters-container select { padding: 8px 12px; min-width: 100px; flex-grow: 0; }
             
             body.light .recharts-text.recharts-cartesian-axis-tick-value { font-size: 12px; }
             body.light .recharts-legend-item-text { font-size: unset; }
             body.dark .recharts-text.recharts-cartesian-axis-tick-value { font-size: 12px; }
             body.dark .recharts-legend-item-text { font-size: unset; }
             
             .theme-toggle-btn { align-self: center; } 
        }
        
        .ant-card-head-wrapper {
            flex-wrap: wrap; 
        }
        .ant-card-extra {
            margin-left: auto; 
            padding-left: 10px; 
        }

      `}</style>
    </div>
  );
}