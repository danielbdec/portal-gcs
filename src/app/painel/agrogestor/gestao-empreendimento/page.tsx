"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Tooltip, Button, Typography, Input, Table, message, Empty, Dropdown, Menu, Space, Tag, Segmented, Spin } from "antd";
import type { MenuProps } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { createPortal } from "react-dom";
import * as XLSX from 'xlsx';
import { PieChart, Pie, Cell, Legend, ResponsiveContainer, Sector, Tooltip as RechartsTooltip } from "recharts";
import {
    RefreshCcw, Filter, X, FileDown, Lock, FolderArchive, FolderGit2, Plus, MoreVertical, Edit, Trash2, CheckCircle2, AlertTriangle, XCircle, HelpCircle,
    Sun, Moon
} from "lucide-react";
import { LoadingOutlined } from "@ant-design/icons";
import React from "react";
import "antd/dist/reset.css";

// Importando TODOS os modais que serão usados na página
import ModalGestao from "./ModalGestao"; 
import ModalEmpreendimento, { Empreendimento } from "./ModalEmpreendimento";
import NotificationModal from "./NotificationModal";

const { Title } = Typography;

function useDebouncedValue<T>(value: T, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => { setDebouncedValue(value); }, delay);
    return () => { clearTimeout(handler); };
  }, [value, delay]);
  return debouncedValue;
}

interface EmpreendimentoCompleto extends Empreendimento {
  key: string;
}

const LoadingSpinner = ({ text }: { text: string }) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
        <Spin size="large" />
        <div style={{ marginTop: '1rem', fontWeight: 'bold' }} className="loading-text">{text}</div>
    </div>
);

const AcessoNegado = () => {
  const router = useRouter();
  return (
    <div className="content-card" style={{ textAlign: 'center', padding: '3rem', maxWidth: '600px', margin: 'auto' }}>
      <Lock size={48} color="var(--gcs-orange)" />
      <h2 style={{ marginTop: '1.5rem', color: 'var(--gcs-blue)' }}>Acesso Negado</h2>
      <p style={{ color: 'var(--gcs-gray-dark)', maxWidth: '400px', margin: '1rem auto' }}>Você não tem as permissões necessárias para visualizar este módulo.</p>
      <button onClick={() => router.push('/painel')} className="btn btn-green" style={{ marginTop: '1rem' }}>Voltar ao Painel</button>
    </div>
  );
};

const ALL_STATES = "Todos";
const ALL_UNITS = "Todas";

function getScrollParent(node: HTMLElement | null): HTMLElement | null {
  if (!node) return null;
  const style = (el: HTMLElement) => getComputedStyle(el);
  let cur: HTMLElement | null = node.parentElement;
  while (cur && cur !== document.body) {
    const s = style(cur);
    const overflowY = s.overflowY;
    const isScrollable = overflowY === "auto" || overflowY === "scroll";
    if (isScrollable) return cur;
    cur = cur.parentElement;
  }
  return document.scrollingElement as HTMLElement;
}

const FilterPopover = ({ empreendimentos, onApplyFilters, initialFilters }: { empreendimentos: EmpreendimentoCompleto[], onApplyFilters: (filters: any) => void, initialFilters: any }) => {
    const [isOpen, setIsOpen] = useState(false); 
    const [estado, setEstado] = useState(initialFilters.estado || ALL_STATES); 
    const [unidade, setUnidade] = useState(initialFilters.unidade || ALL_UNITS); 
    
    const popoverRef = useRef<HTMLDivElement>(null); 
    const buttonRef = useRef<HTMLButtonElement>(null);
    
    const [coords, setCoords] = useState({ top: 0, left: 0 });
    const [isBrowser, setIsBrowser] = useState(false);

    const estadosUnicos = useMemo(() => [ALL_STATES, ...Array.from(new Set(empreendimentos.map(e => e.estado).filter(Boolean)))], [empreendimentos]); 
    const unidadesUnicas = useMemo(() => [ALL_UNITS, ...Array.from(new Set(empreendimentos.map(e => e.unidade).filter(Boolean)))], [empreendimentos]); 
    
    const handleApply = () => { onApplyFilters({ estado, unidade }); setIsOpen(false); }; 
    const handleClear = () => { setEstado(ALL_STATES); setUnidade(ALL_UNITS); onApplyFilters({ estado: ALL_STATES, unidade: ALL_UNITS }); setIsOpen(false); }; 

    useEffect(() => { setIsBrowser(true); }, []);

    const updatePosition = useCallback(() => {
        if (buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            const scrollY = window.scrollY || document.documentElement.scrollTop;
            const scrollX = window.scrollX || document.documentElement.scrollLeft;
            
            setCoords({
                top: rect.bottom + scrollY + 8,
                left: rect.right + scrollX - 300 
            });
        }
    }, []);

    const toggleOpen = () => {
        if (!isOpen) updatePosition();
        setIsOpen(!isOpen);
    };

    useEffect(() => {
        if(isOpen) {
            window.addEventListener('resize', updatePosition);
            window.addEventListener('scroll', updatePosition);
        }
        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition);
        }
    }, [isOpen, updatePosition]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (
                isOpen && 
                popoverRef.current && 
                !popoverRef.current.contains(target) &&
                buttonRef.current && 
                !buttonRef.current.contains(target)
            ) {
                setIsOpen(false);
            }
        };
        
        if (isOpen) document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

    const popoverContent = (
        <div 
            ref={popoverRef}
            className="filter-popover-content" 
            style={{ 
                position: 'absolute', 
                top: coords.top, 
                left: coords.left, 
                width: '300px', 
                borderRadius: '8px', 
                border: '1px solid var(--gcs-border-color)', 
                zIndex: 99999, 
                padding: '1rem' 
            }}
        > 
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h4 style={{ margin: 0 }}>Filtros Avançados</h4>
                <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div> 
            <div style={{ marginBottom: '1rem' }}>
                <label className="modal-label">Estado</label>
                <select value={estado} onChange={(e) => setEstado(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--gcs-border-color)' }}>{estadosUnicos.map(f => <option key={f} value={f}>{f}</option>)}</select>
            </div> 
            <div style={{ marginBottom: '1.5rem' }}>
                <label className="modal-label">Unidade</label>
                <select value={unidade} onChange={(e) => setUnidade(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--gcs-border-color)' }}>{unidadesUnicas.map(r => <option key={r} value={r}>{r}</option>)}</select>
            </div> 
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button onClick={handleClear} className="btn btn-outline-gray" style={{padding: '8px 16px'}}>Limpar</button>
                <button onClick={handleApply} className="btn btn-green btn-custom-dark-green" style={{padding: '8px 16px'}}>Aplicar</button>
            </div> 
        </div>
    );

    return ( 
        <>
            <button 
                ref={buttonRef}
                onClick={toggleOpen} 
                title="Filtros Avançados" 
                className="btn btn-outline-gray" 
                style={{padding: '9px'}}
            >
                <Filter size={20} />
            </button> 
            {isOpen && isBrowser && typeof document !== 'undefined' && createPortal(popoverContent, document.body)}
        </> 
    );
};

const renderActiveShape = (props: any) => {
    const RADIAN = Math.PI / 180;
    const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value, theme } = props;
    const sin = Math.sin(-RADIAN * midAngle);
    const cos = Math.cos(-RADIAN * midAngle);
    const sx = cx + (outerRadius + 2) * cos;
    const sy = cy + (outerRadius + 2) * sin;
    const mx = cx + (outerRadius + 15) * cos;
    const my = cy + (outerRadius + 15) * sin;
    const ex = mx + (cos >= 0 ? 1 : -1) * 15;
    const ey = my;
    const textAnchor = cos >= 0 ? 'start' : 'end';
    
    const labelFillColor = theme === 'dark' ? '#F1F5F9' : '#333';
    const percentFillColor = theme === 'dark' ? '#94A3B8' : '#999';

    return (
      <g>
        <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius} startAngle={startAngle} endAngle={endAngle} fill={fill} />
        <Sector cx={cx} cy={cy} startAngle={startAngle} endAngle={endAngle} innerRadius={outerRadius + 4} outerRadius={outerRadius + 8} fill={fill} />
        <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
        <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
        <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={textAnchor} fill={labelFillColor} className="chart-label-text" style={{ fontSize: '13px', fontWeight: 'bold' }}>{`${payload.name}`}</text>
        <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} dy={18} textAnchor={textAnchor} fill={percentFillColor} className="chart-sublabel-text" style={{ fontSize: '12px' }}>{`(${value} - ${(percent * 100).toFixed(1)}%)`}</text>
      </g>
    );
};

export default function AgrogestorPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [authStatus, setAuthStatus] = useState<'loading' | 'authorized' | 'unauthorized'>('loading');
  const [empreendimentos, setEmpreendimentos] = useState<EmpreendimentoCompleto[]>([]);
  const [busca, setBusca] = useState<string>("");
  const buscaDebounced = useDebouncedValue(busca, 300);
  const [loading, setLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState({ estado: ALL_STATES, unidade: ALL_UNITS });
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isSavingTheme, setIsSavingTheme] = useState(false);
  const hasFetchedTheme = useRef(false);

  const [situacaoFilter, setSituacaoFilter] = useState<string>('ATIVO');

  const [isGestaoModalOpen, setIsGestaoModalOpen] = useState(false);
  const [selectedEmpreendimento, setSelectedEmpreendimento] = useState<EmpreendimentoCompleto | null>(null);

  const [isEmpreendimentoModalOpen, setIsEmpreendimentoModalOpen] = useState(false);
  const [empreendimentoModalMode, setEmpreendimentoModalMode] = useState<'add' | 'edit' | 'delete'>('add');
  const [currentEmpreendimento, setCurrentEmpreendimento] = useState<Partial<Empreendimento> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState({ visible: false, type: 'success' as 'success' | 'error', message: '' });

  const inFlightRef = useRef<AbortController | null>(null);
  const initialFetchDone = useRef(false);

  useEffect(() => {
    const fetchThemeData = async () => {
      if (!session?.user?.email) return;
      try {
        const res = await fetch("/api/portal/consulta-tema", { method: "POST" }).catch(() => null);
        if (res && res.ok) {
            const userData = await res.json(); 
            if (userData && userData.tema) {
              setTheme(userData.tema === 'E' ? 'dark' : 'light');
              return;
            }
        }
        const localTheme = localStorage.getItem('theme') as 'light' | 'dark';
        if (localTheme) setTheme(localTheme);
      } catch (err) {
        console.error("Erro ao buscar tema:", err);
      }
    };

    if (status === 'authenticated' && session && !hasFetchedTheme.current) {
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
    } catch (error) {
      console.error("Erro ao salvar tema na API (usando local):", error);
    } finally {
      setIsSavingTheme(false);
    }
  };

  const fetchEmpreendimentos = useCallback(async () => {
    inFlightRef.current?.abort();
    const controller = new AbortController();
    inFlightRef.current = controller;

    setLoading(true);
    const timer = setTimeout(() => controller.abort(), 15000);

    try {
        const res = await fetch('/api/agrogestor/consulta-empreendimento', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}),
            signal: controller.signal
        });
        if (res.status === 204) { setEmpreendimentos([]); return; }
        if (!res.ok) throw new Error(`Falha na requisição: ${res.statusText}`);
        const data: any[] = await res.json();
        setEmpreendimentos(data.map((emp, i) => ({ ...emp, key: emp.id?.toString() ?? `fallback-${i}` })));
    } catch (e: any) {
        if (e.name !== 'AbortError') { message.error(e?.message ?? "Falha ao carregar empreendimentos."); }
    } finally {
        if (inFlightRef.current === controller) { inFlightRef.current = null; }
        clearTimeout(timer);
        setLoading(false);
        setHasLoadedOnce(true);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated') {
      if (initialFetchDone.current) return;
      const user = session.user;
      const hasAccess = user?.is_admin === true || user?.funcoes?.includes('agrogestor.empreendimentos');
      if (hasAccess) { initialFetchDone.current = true; setAuthStatus('authorized'); fetchEmpreendimentos(); } 
      else { setAuthStatus('unauthorized'); }
    } else if (status === 'unauthenticated') { router.push('/login'); }
  }, [status, session, router, fetchEmpreendimentos]);

  const kpiData = useMemo(() => ({ totalEmpreendimentos: empreendimentos.length, totalDocsAlerta: 0 }), [empreendimentos]);
  
  const dadosGraficoEstados = useMemo(() => { 
      const counts: Record<string, number> = {}; 
      empreendimentos.forEach(emp => { if(emp.estado) { counts[emp.estado] = (counts[emp.estado] || 0) + 1; } }); 
      return Object.entries(counts).map(([name, value]) => ({ name, value })); 
  }, [empreendimentos]);

  const coresGraficoDonut = ["url(#gradAzul)", "url(#gradVerde)", "url(#gradLaranja)", "url(#gradAzulClaro)", "url(#gradCinza)"];
  
  const norm = (s:string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\w]/g,'').toLowerCase();
  
  const empreendimentosParaContagem = useMemo(() => {
    let dados = [...(empreendimentos || [])];
    const termo = norm(buscaDebounced || "");
    if (termo) {
        dados = dados.filter(emp => 
            norm(emp.nome ?? "").includes(termo) || 
            norm(emp.cnpj_cpf ?? "").includes(termo) ||
            norm(emp.numero_matricula ?? "").includes(termo)
        );
    }
    if (advancedFilters.estado !== ALL_STATES) { dados = dados.filter(e => e.estado === advancedFilters.estado); } 
    if (advancedFilters.unidade !== ALL_UNITS) { dados = dados.filter(e => e.unidade === advancedFilters.unidade); }
    return dados;
  }, [empreendimentos, buscaDebounced, advancedFilters]);

  const statusCounts = useMemo(() => {
      const counts: Record<string, number> = {
          'ATIVO': 0, 'ARRENDO': 0, 'LITIGIO': 0, 'INATIVO': 0
      };
      empreendimentosParaContagem.forEach(emp => {
          const sit = (emp.situacao || '').toUpperCase();
          if (counts[sit] !== undefined) counts[sit]++;
      });
      return counts;
  }, [empreendimentosParaContagem]);

  const empreendimentosFiltrados = useMemo(() => { 
    let dados = [...empreendimentosParaContagem]; 
    if (situacaoFilter !== 'TODOS') {
        dados = dados.filter(e => (e.situacao || '').toUpperCase() === situacaoFilter);
    }
    return dados; 
  }, [empreendimentosParaContagem, situacaoFilter]);

  const handleExportXLSX = () => { const rows = empreendimentosFiltrados.map(e => ({ ID: e.id ?? "", Empreendimento: e.nome ?? "", Matricula: e.numero_matricula ?? "", "CPF/CNPJ": e.cnpj_cpf ?? "", Unidade: e.unidade ?? "", Estado: e.estado ?? "", Situacao: e.situacao ?? "" })); const ws = XLSX.utils.json_to_sheet(rows); ws['!cols'] = [{wch:8},{wch:40},{wch:16},{wch:18},{wch:16},{wch:10}, {wch:12}]; const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Empreendimentos"); XLSX.writeFile(wb, "empreendimentos_gcs.xlsx"); };
  const handleClearAllFilters = useCallback(() => { 
    setBusca(""); 
    setAdvancedFilters({ estado: ALL_STATES, unidade: ALL_UNITS });
    setSituacaoFilter("TODOS"); 
  }, []);

  const handleOpenGestaoModal = useCallback((e: EmpreendimentoCompleto) => { setSelectedEmpreendimento(e); setIsGestaoModalOpen(true); }, []);
  const handleCloseGestaoModal = useCallback(() => { setIsGestaoModalOpen(false); setSelectedEmpreendimento(null); }, []);

  const handleOpenEmpreendimentoModal = (mode: 'add' | 'edit' | 'delete', empreendimento?: EmpreendimentoCompleto) => { setEmpreendimentoModalMode(mode); setCurrentEmpreendimento(empreendimento || null); setIsEmpreendimentoModalOpen(true); };
  const handleCloseEmpreendimentoModal = () => { setIsEmpreendimentoModalOpen(false); setCurrentEmpreendimento(null); };

  const handleSaveEmpreendimento = async (data: Partial<Empreendimento>, mode: 'add' | 'edit' | 'delete') => {
    setIsSaving(true);
    try {
      let url = '';
      let body = {};
      let method = 'POST';

      if (mode === 'add') {
        url = '/api/agrogestor/inclui-empreendimento';
        body = data;
      } else if (mode === 'edit') {
        url = '/api/agrogestor/altera-empreendimento';
        body = data;
      } else if (mode === 'delete') {
        url = '/api/agrogestor/exclui-empreendimento'; 
        body = { id: data.id };
      }

      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (!response.ok || (result.status && result.status !== 'ok')) {
         const errorMessage = result.message || result.error || (Array.isArray(result) ? result[0]?.message : null) || `Falha ao ${mode === 'add' ? 'incluir' : mode === 'edit' ? 'alterar' : 'excluir'} o empreendimento.`;
         throw new Error(errorMessage);
      }

      const action = mode === 'add' ? 'incluído' : mode === 'edit' ? 'alterado' : 'excluído';
      setNotification({ visible: true, type: 'success', message: `Empreendimento ${action} com sucesso!` });
      handleCloseEmpreendimentoModal();
      fetchEmpreendimentos();
    } catch (error: any) {
      setNotification({ visible: true, type: 'error', message: error.message || `Falha ao ${mode} o empreendimento.` });
    } finally {
      setIsSaving(false);
    }
  };

  const columns: ColumnsType<EmpreendimentoCompleto> = useMemo(() => [
    { title: "ID", dataIndex: "id", key: "id", width: 70, fixed: "left" as const, sorter: (a, b) => (a.id || 0) - (b.id || 0) },
    { 
      title: "Situação", 
      dataIndex: "situacao", 
      key: "situacao", 
      width: 120,
      render: (situacao: string) => {
        let color = 'default';
        let label = situacao || '-';
        
        switch (situacao?.toUpperCase()) {
            case 'ATIVO': color = '#5FB246'; break;
            case 'ARRENDO': color = '#E6A23C'; break;
            case 'LITIGIO': color = '#F58220'; break;
            case 'INATIVO': color = '#d9534f'; break;
            default: color = 'default';
        }

        return (
            <Tag color={color} style={{ fontWeight: 600, border: 'none', padding: '2px 10px' }}>
                {label}
            </Tag>
        );
      }
    },
    { title: "Empreendimento", dataIndex: "nome", key: "nome", width: 280, className: "empreendimento-column", sorter: (a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR', { sensitivity: 'base' }) },
    { title: "Matrícula", dataIndex: "numero_matricula", key: "matricula", width: 130 },
    { title: "CPF/CNPJ", dataIndex: "cnpj_cpf", key: "doc", width: 150 },
    { title: "Unidade", dataIndex: "unidade", key: "unidade", width: 120, sorter: (a, b) => (a.unidade || '').localeCompare(b.unidade || '', 'pt-BR', { sensitivity: 'base' }) },
    { title: "Estado", dataIndex: "estado", key: "estado", width: 90, sorter: (a, b) => (a.estado || '').localeCompare(b.estado || '', 'pt-BR', { sensitivity: 'base' }) },
    {
      title: "Ação", key: "acao", width: 160, align: "center" as const, fixed: "right" as const,
      render: (_: any, item: EmpreendimentoCompleto) => {
        const menuItems: MenuProps['items'] = [
          { key: 'edit', icon: <Edit size={14} style={{ marginRight: 8 }} />, label: 'Alterar Dados', onClick: () => handleOpenEmpreendimentoModal('edit', item) },
        ];
        return (
          <Space>
            <Button type="primary" style={{ backgroundColor: '#5FB246', borderColor: '#5FB246' }} icon={<FolderGit2 size={16} />} onClick={() => handleOpenGestaoModal(item)} aria-haspopup="dialog">
              Gestão
            </Button>
            <Dropdown menu={{ items: menuItems }} trigger={['click']} placement="bottomRight">
              <Button icon={<MoreVertical size={16} />} />
            </Dropdown>
          </Space>
        );
      }
    }
  ], [handleOpenGestaoModal]);

  const tabOptions = [
      { key: 'ATIVO', label: 'Ativos', color: '#5FB246', icon: <CheckCircle2 size={16}/> },
      { key: 'ARRENDO', label: 'Arrendo', color: '#E6A23C', icon: <HelpCircle size={16}/> },
      { key: 'LITIGIO', label: 'Litígio', color: '#F58220', icon: <AlertTriangle size={16}/> },
      { key: 'INATIVO', label: 'Inativos', color: '#d9534f', icon: <XCircle size={16}/> },
      { key: 'TODOS', label: 'Todos', color: '#6c757d', icon: null }
  ];

  const glassTooltipStyle: React.CSSProperties = {
    borderRadius: '12px',
    border: '1px solid',
    backdropFilter: 'blur(14px) saturate(140%)',
    WebkitBackdropFilter: 'blur(14px) saturate(140%)',
    boxShadow: '0 8px 24px rgba(0,0,0,.12)',
    color: theme === 'dark' ? '#E2E8F0' : '#00314A',
    background: theme === 'dark' ? 'rgba(25,39,53,.50)' : 'rgba(255,255,255,.85)',
    borderColor: theme === 'dark' ? 'rgba(125,173,222,.28)' : 'rgba(0,0,0,.1)',
  };

  const tooltipLabelStyle: React.CSSProperties = {
    color: theme === 'dark' ? '#E2E8F0' : '#00314A',
    fontWeight: 'bold',
  };

  const tooltipItemStyle: React.CSSProperties = {
    color: theme === 'dark' ? '#E2E8F0' : '#00314A',
  };

  const renderLegendText = (value: string) => {
    return <span className="recharts-legend-item-text" style={{ marginLeft: '4px' }}>{value}</span>;
  };

  if (status === 'loading' || authStatus === 'loading') { return <LoadingSpinner text="Verificando permissões..." />; }
  if (authStatus === 'unauthorized') { return <AcessoNegado />; }
  
  return (<>
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
          <linearGradient id="gradVermelho" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ff6f61" />
            <stop offset="100%" stopColor="#E11D2E" />
          </linearGradient>
          <linearGradient id="gradAmarelo" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FDE68A" />
            <stop offset="100%" stopColor="#FACC15" />
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

    <style>{`
        :root { 
            --gcs-blue: #00314A; 
            --gcs-green: #5FB246; 
            --gcs-orange: #F58220;
            --gcs-orange-light: #FDBA74; 
            --gcs-red: #d9534f; 
            --gcs-red-light: #ff6f61;
            --gcs-gray-light: #f8f9fa; 
            --gcs-gray-medium: #e9ecef; 
            --gcs-gray-dark: #6c757d; 
            --gcs-border-color: #dee2e6; 
            --gcs-download-color: #007bff; 
            --gcs-edit-color: #F58220;
            --gcs-tab-active-blue: #1E66FF; 
            --gcs-tab-active-bg: #EAF3FF;
            --gcs-tab-inactive-color: #344054; 
            --gcs-tab-hover-bg: #F2F4F7;
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        
        .btn { cursor: pointer; font-weight: 600; display: inline-flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s ease-in-out; border: 1px solid transparent; padding: 10px 20px; border-radius: 8px; }
        .btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        
        /* Botão de Tema */
        .theme-toggle-btn {
          background: none; border: 1px solid transparent; border-radius: 8px; padding: 9px; cursor: pointer;
          display: flex; align-items: center; justify-content: center; transition: all 0.2s ease;
          min-width: 42px; min-height: 42px;
        }

        /* --- ESTILOS PARA BOTÕES DE AÇÃO --- */
        .btn-action-download, .btn-action-edit, .btn-action-delete, .btn-action-map { background-color: transparent !important; border-width: 1.5px !important; border-style: solid !important; transition: all 0.2s ease-in-out !important; }
        .btn-action-download { color: var(--gcs-download-color) !important; border-color: var(--gcs-download-color) !important; }
        .btn-action-download:hover { background-color: var(--gcs-download-color) !important; color: white !important; }
        .btn-action-edit { color: var(--gcs-edit-color) !important; border-color: var(--gcs-edit-color) !important; }
        .btn-action-edit:hover { background-color: var(--gcs-edit-color) !important; color: white !important; }
        .btn-action-delete { color: var(--gcs-red) !important; border-color: var(--gcs-red) !important; }
        .btn-action-delete:hover { background-color: var(--gcs-red) !important; color: white !important; }
        .btn-action-map { color: var(--gcs-green) !important; border-color: var(--gcs-green) !important; }
        .btn-action-map:hover { background-color: var(--gcs-green) !important; color: white !important; }
        .btn-gcs-blue { background-color: var(--gcs-blue) !important; color: white !important; border-color: var(--gcs-blue) !important; }
        .btn-gcs-blue:hover { background-color: #001f30 !important; border-color: #001f30 !important; }
        .ant-card-extra .btn-outline-gcs-blue { background-color: transparent !important; border: 1.5px solid var(--gcs-blue) !important; color: var(--gcs-blue) !important; transition: all 0.2s ease-in-out !important; }
        .ant-card-extra .btn-outline-gcs-blue:hover { background-color: var(--gcs-blue) !important; color: white !important; }
        
        /* Pagination Select Styling */
        .ant-pagination-options-size-changer .ant-select-selector {
            border-radius: 6px !important;
            transition: all 0.2s !important;
        }
        
        /* Light Mode Pagination */
        body.light .ant-pagination-options-size-changer .ant-select-selector {
            background-color: #fff !important;
            border-color: var(--gcs-border-color) !important;
            color: var(--gcs-gray-dark) !important;
        }
        body.light .ant-pagination-options-size-changer:hover .ant-select-selector {
            border-color: var(--gcs-blue) !important;
        }

        /* Dark Mode Pagination */
        body.dark .ant-pagination-options-size-changer .ant-select-selector {
            background-color: rgba(25, 39, 53, 0.5) !important;
            border-color: rgba(125, 173, 222, 0.3) !important;
            color: #CBD5E1 !important;
        }
        body.dark .ant-pagination-options-size-changer:hover .ant-select-selector {
            border-color: rgba(125, 173, 222, 0.6) !important;
        }
        body.dark .ant-select-dropdown {
            background-color: #1e293b !important; 
            border: 1px solid rgba(125, 173, 222, 0.3) !important;
        }
        body.dark .ant-select-item {
            color: #CBD5E1 !important;
        }
        body.dark .ant-select-item-option-selected {
            background-color: rgba(59, 130, 246, 0.2) !important;
            color: #fff !important;
        }
        body.dark .ant-select-item-option-active {
            background-color: rgba(255, 255, 255, 0.08) !important;
        }
        body.dark .ant-select-arrow {
            color: #94A3B8 !important;
        }

        /* --- MODO CLARO --- */
        body.light .main-container { background-color: #E9ECEF; }
        body.light .kpi-card, body.light .chart-card, body.light .main-content-card, body.light .content-card { 
            background-color: #fff; border-radius: 12px; padding: 1.5rem; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08); border: 1px solid var(--gcs-border-color); 
        }
        body.light .page-title { color: var(--gcs-blue); }
        body.light .theme-toggle-btn { color: var(--gcs-gray-dark); border-color: var(--gcs-border-color); background: #fff; }
        body.light .theme-toggle-btn:hover:not(:disabled) { background: var(--gcs-gray-light); border-color: var(--gcs-gray-dark); }
        body.light .btn-green { background-color: var(--gcs-green); color: white; }
        body.light .btn-excluir { background-color: var(--gcs-red); color: white; border-color: var(--gcs-red); }
        body.light .btn-outline-gray { background-color: #fff; color: var(--gcs-gray-dark); border-color: var(--gcs-border-color); }
        body.light .btn-outline-blue { background-color: #fff; color: var(--gcs-blue); border-color: var(--gcs-border-color); }

        body.light .loading-text { color: var(--gcs-blue); }
        
        body.light .btn-status-tab {
            display: flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 20px; border: 1px solid transparent;
            font-weight: 600; font-size: 14px; cursor: pointer; transition: all 0.2s;
            background-color: white; color: var(--gcs-gray-dark); border-color: var(--gcs-border-color);
        }
        body.light .btn-status-tab:hover { background-color: var(--gcs-gray-light); }
        body.light .btn-status-tab.active { color: white; border-color: transparent; box-shadow: 0 4px 10px rgba(0,0,0,0.15); }

        body.light .gcs-table.ant-table-wrapper { border-radius: 10px; overflow: hidden; }
        body.light .gcs-table .ant-table-thead > tr > th { background-color: var(--gcs-blue) !important; color: white !important; font-weight: 600; }
        body.light .gcs-table .ant-table-tbody > .row-even > td { background: #fff; }
        body.light .gcs-table .ant-table-tbody > .row-odd > td { background: #f8f9fa; }
        body.light .gcs-table .ant-table-tbody > tr > td.empreendimento-column { white-space: normal !important; word-break: break-word; }

        body.light .filter-popover-content { background-color: white; border: 1px solid var(--gcs-border-color); }
        body.light .filter-popover-content h4 { color: var(--gcs-blue); }
        body.light .filter-popover-content label { color: #333; }
        body.light .filter-popover-content input, body.light .filter-popover-content select { background-color: #fff; color: #333; border: 1px solid var(--gcs-border-color); }

        body.light .chart-label-text { fill: #333; }
        body.light .chart-sublabel-text { fill: #999; }

        /* Modais Light */
        body.light .modal-window { background-color: #fff; }
        body.light .modal-header { background-color: #f1f5fb; border-bottom-color: var(--gcs-border-color); }
        body.light .modal-footer { background-color: #f8f9fa; border-top-color: var(--gcs-border-color); }
        body.light .modal-label { color: #333; }
        body.light .modal-input { background-color: #fff; color: #333; border-color: var(--gcs-border-color); }
        body.light .modal-input:disabled { background-color: #f1f3f5; color: #6c757d; }
        body.light h3 { color: var(--gcs-blue); }

        .modal-window {
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            border-radius: 12px; 
            display: flex; 
            flex-direction: column; 
            box-shadow: 0 8px 32px rgba(0,0,0,0.2); z-index: 2201;
            overflow: hidden;
            max-height: 90vh;
        }
        .modal-header {
            padding: 1rem 1.5rem; border-bottom: 1px solid;
            display: flex; justify-content: space-between; align-items: center;
            cursor: grab;
        }
        .modal-footer {
            padding: 1.5rem; border-top: 1px solid;
            display: flex; justify-content: flex-end; align-items: center; gap: 1rem;
        }
        .modal-label { display: block; margin-bottom: 6px; font-size: 14px; font-weight: 500; }
        .modal-input { width: 100%; padding: 10px; border-radius: 6px; border: 1px solid; }


        /* --- MODO ESCURO --- */
        body.dark {
          background-image: url('/img_fundo_glass.png') !important;
          background-size: cover !important;
          background-position: center center !important;
          background-attachment: fixed !important;
        }
        body.dark .main-container { background-color: transparent !important; }
        
        body.dark .kpi-card, body.dark .chart-card, body.dark .main-content-card, body.dark .content-card {
          background: rgba(25, 39, 53, 0.25) !important;
          backdrop-filter: blur(16px) !important;
          -webkit-backdrop-filter: blur(16px) !important;
          border: 1px solid rgba(125, 173, 222, 0.2) !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1) !important;
          border-radius: 12px; padding: 1.5rem;
          /* ISOLATION MODE: Crucial para proteger a cor do texto do vidro */
          isolation: isolate; 
        }

        /* --- EMPTY STATE (CORREÇÃO FUNDO BRANCO E CORES) --- */
        body.dark .ant-table-placeholder {
            background: transparent !important; /* Remove fundo branco */
            border-color: rgba(125, 173, 222, 0.2) !important;
        }
        body.dark .ant-table-placeholder .ant-table-cell {
            color: #CBD5E1 !important;
        }
        /* Ajuste do ícone e texto do Empty State */
        body.dark .ant-empty-description {
            color: #E2E8F0 !important;
        }
        body.dark .ant-empty-image svg {
            filter: drop-shadow(0 0 2px rgba(255,255,255,0.3)); /* Leve brilho no ícone se for SVG padrão */
        }
        /* Botão "Limpar Filtros" no Empty State */
        body.dark .ant-empty-footer button {
            background-color: var(--gcs-green) !important;
            border-color: var(--gcs-green) !important;
            color: white !important;
            font-weight: 600;
        }
        body.dark .ant-empty-footer button:hover {
            filter: brightness(1.1);
        }

        /* --- SPINNER NO MODO ESCURO (CORREÇÃO DE VISIBILIDADE) --- */
        body.dark .ant-spin-dot-item {
            background-color: #ffffff !important;
        }
        body.dark .loading-text, body.dark .ant-spin-text { 
            color: #ffffff !important; 
            text-shadow: 0 1px 3px rgba(0,0,0,0.5);
        }

        body.dark .page-title, body.dark h3, body.dark h4 { color: #F1F5F9 !important; }
        body.dark .chart-label-text { fill: #F1F5F9; }
        body.dark .chart-sublabel-text { fill: #94A3B8; }
        body.dark .recharts-legend-item-text { color: #E2E8F0 !important; }

        body.dark .theme-toggle-btn { background-color: rgba(25, 39, 53, 0.5) !important; color: #E2E8F0 !important; border-color: rgba(125, 173, 222, 0.3) !important; }
        body.dark .theme-toggle-btn:hover { background-color: rgba(40, 60, 80, 0.7) !important; border-color: rgba(125, 173, 222, 0.5) !important; }
        
        body.dark .btn-outline-gray, body.dark .btn-outline-blue {
          background-color: rgba(25, 39, 53, 0.5) !important; color: #E2E8F0 !important; border-color: rgba(125, 173, 222, 0.3) !important;
        }
        body.dark .btn-green { background-color: var(--gcs-green); color: white; }

        /* --- CLASSE ESPECIAL PARA BOTÕES VERDES NO MODO ESCURO --- */
        body.dark .btn-custom-dark-green {
            background-color: var(--gcs-green) !important;
            border-color: var(--gcs-green) !important;
            color: white !important;
        }
        body.dark .btn-custom-dark-green:hover {
             filter: brightness(1.1);
        }

        /* --- FILTRO AVANÇADO ESCURO (CORREÇÃO DE FUNDO E INPUTS) --- */
        /* Caixa Externa */
        body.dark .filter-popover-content {
            background-color: #1e293b !important; /* Slate 800 - Sólido */
            border: 1px solid #334155 !important;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.3) !important;
        }
        /* Inputs e Selects */
        body.dark .filter-popover-content select, 
        body.dark .filter-popover-content input {
            background-color: #0f172a !important; /* Slate 900 - Mais escuro que o fundo */
            color: #f8fafc !important; /* Texto claro */
            border: 1px solid #334155 !important;
        }
        body.dark .filter-popover-content option {
             background-color: #0f172a;
             color: #f8fafc;
        }
        /* Labels */
        body.dark .filter-popover-content h4,
        body.dark .filter-popover-content label {
            color: #f1f5f9 !important;
        }

        body.dark input.ant-input, body.dark input {
            background-color: rgba(25, 39, 53, 0.5) !important; color: #E2E8F0 !important; border-color: rgba(125, 173, 222, 0.3) !important;
        }
        body.dark input::placeholder { color: #94A3B8 !important; opacity: 1; }

        body.dark .btn-status-tab {
            display: flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 20px;
            font-weight: 600; font-size: 14px; cursor: pointer; transition: all 0.2s;
            color: #E2E8F0; background: linear-gradient(180deg, rgba(25, 39, 53, 0.25), rgba(25, 39, 53, 0.4)); 
            border: 1px solid rgba(125, 173, 222, 0.2);
        }
        body.dark .btn-status-tab:hover { 
            border-color: rgba(125, 173, 222, 0.5); transform: translateY(-0.5px) scale(1.01); 
            box-shadow: 0 10px 22px rgba(0,0,0,.12); filter: brightness(1.02);
        }
        body.dark .btn-status-tab.active {
             color: #F1F5F9; border-color: transparent; 
             box-shadow: 0 6px 16px rgba(0,0,0,.06);
        }

        body.dark .gcs-table { background: transparent; }
        body.dark .gcs-table .ant-table { background: transparent; color: #E2E8F0; }
        body.dark .gcs-table .ant-table-thead > tr > th { background-color: var(--gcs-blue) !important; color: white !important; border-bottom: 1px solid rgba(125, 173, 222, 0.2); }
        body.dark .gcs-table .ant-table-tbody > tr > td { border-bottom: 1px solid rgba(125, 173, 222, 0.1); color: #CBD5E1; }
        body.dark .gcs-table .ant-table-tbody > .row-even > td { background-color: rgba(25, 39, 53, 0.15) !important; }
        body.dark .gcs-table .ant-table-tbody > .row-odd > td { background-color: transparent !important; }
        body.dark .gcs-table .ant-table-tbody > tr:hover > td { background-color: rgba(40, 60, 80, 0.3) !important; }
        
        body.dark .ant-pagination-item {
            background-color: rgba(25, 39, 53, 0.5) !important;
            border-color: rgba(125, 173, 222, 0.3) !important;
        }
        body.dark .ant-pagination-item a { color: #CBD5E1 !important; }
        body.dark .ant-pagination-item-active { 
            background-color: rgba(59, 130, 246, 0.2) !important; 
            border-color: #3B82F6 !important; 
        }
        body.dark .ant-pagination-item-active a { color: #ffffff !important; }
        
        body.dark .ant-pagination-total-text { color: #CBD5E1 !important; }
        body.dark .ant-pagination-prev button, body.dark .ant-pagination-next button { 
            color: #CBD5E1 !important; 
            background-color: rgba(25, 39, 53, 0.5) !important;
        }
        body.dark .ant-pagination-prev .ant-pagination-item-link, body.dark .ant-pagination-next .ant-pagination-item-link { 
            background-color: rgba(25, 39, 53, 0.5) !important; 
            border-color: rgba(125, 173, 222, 0.3) !important; 
            color: #CBD5E1 !important; 
        }

        body.dark .ant-pagination-options-size-changer .ant-select-selector {
            background-color: rgba(25, 39, 53, 0.5) !important;
            border-color: rgba(125, 173, 222, 0.3) !important;
            color: #CBD5E1 !important;
        }
        body.dark .ant-pagination-options-size-changer:hover .ant-select-selector {
            border-color: rgba(125, 173, 222, 0.6) !important;
        }
        body.dark .ant-select-dropdown {
            background-color: #1e293b !important; 
            border: 1px solid rgba(125, 173, 222, 0.3) !important;
        }
        body.dark .ant-select-item {
            color: #CBD5E1 !important;
        }
        body.dark .ant-select-item-option-selected {
            background-color: rgba(59, 130, 246, 0.2) !important;
            color: #fff !important;
        }
        body.dark .ant-select-item-option-active {
            background-color: rgba(255, 255, 255, 0.08) !important;
        }
        body.dark .ant-select-arrow {
            color: #94A3B8 !important;
        }
        
        body.dark .modal-window { background-color: rgba(25, 39, 53, 0.95); border: 1px solid rgba(125, 173, 222, 0.2); }
        body.dark .modal-header { background-color: rgba(25, 39, 53, 0.5); border-bottom-color: rgba(125, 173, 222, 0.2); }
        body.dark .modal-footer { background-color: rgba(25, 39, 53, 0.5); border-top-color: rgba(125, 173, 222, 0.2); }
        body.dark .modal-label { color: #E2E8F0; }
        body.dark .modal-input { background-color: rgba(25, 39, 53, 0.5); color: #E2E8F0; border-color: rgba(125, 173, 222, 0.3); }
        body.dark .modal-input:disabled { background-color: rgba(40, 60, 80, 0.5); color: #94A3B8; }

        /* KPI VALUE FIX - REFORÇO VISUAL MANTENDO GRID INTACTO */
        .kpi-value {
            font-size: 2.2rem;
            margin: 0;
            font-weight: 800; /* Extra bold */
            position: relative; 
            z-index: 20;
        }
        body.light .kpi-value-green { color: var(--gcs-green); }
        body.light .kpi-value-orange { color: var(--gcs-orange); }
        
        body.dark .kpi-value-green { 
            color: #5FB246 !important; 
            /* Filtro de brilho e saturação para "acender" a cor no fundo escuro */
            filter: brightness(1.2) saturate(1.2) drop-shadow(0 2px 2px rgba(0,0,0,0.8));
            opacity: 1 !important;
            mix-blend-mode: normal !important;
        }
        body.dark .kpi-value-orange { 
            color: #F58220 !important; 
            /* Filtro de brilho e saturação para "acender" a cor no fundo escuro */
            filter: brightness(1.2) saturate(1.2) drop-shadow(0 2px 2px rgba(0,0,0,0.8));
            opacity: 1 !important;
            mix-blend-mode: normal !important;
        }

    `}</style>

    <div className="main-container" style={{ padding: "2rem", minHeight: "100vh" }}>
      <div className="header-wrapper" style={{ display: 'flex', alignItems: 'stretch', gap: '1.5rem', marginBottom: '1.5rem' }}>
        
        <div className="chart-card clickable-chart" style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', minWidth: '280px' }}>
            <h4 style={{ margin: 0, fontWeight: 500, fontSize: '1rem', color: theme === 'dark' ? '#E2E8F0' : 'var(--gcs-gray-dark)' }}>Empreendimentos por Estado</h4>
            <div style={{ width: 280, height: 220 }} aria-label="Distribuição de empreendimentos por estado">
                {loading && !hasLoadedOnce ? ( <div style={{height:220, display:'flex',alignItems:'center',justifyContent:'center'}}><LoadingSpinner text="" /></div> ) : 
                 dadosGraficoEstados.length === 0 ? ( <div style={{height:220, display:'flex',alignItems:'center',justifyContent:'center', color: 'var(--gcs-gray-dark)'}}><span>Nenhum dado</span></div> ) : 
                 ( <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie 
                            activeIndex={activeIndex} 
                            activeShape={renderActiveShape} 
                            data={dadosGraficoEstados} 
                            dataKey="value" 
                            nameKey="name" 
                            cx="50%" 
                            cy="45%" 
                            innerRadius={50} 
                            outerRadius={80} 
                            cornerRadius={8}
                            stroke={theme === 'dark' ? "rgba(25, 39, 53, 0.5)" : "rgba(255,255,255,.35)"}
                            strokeWidth={1}
                            paddingAngle={3} 
                            onMouseEnter={(_, index) => setActiveIndex(index)} 
                            onMouseLeave={() => setActiveIndex(null)}
                        >
                            {dadosGraficoEstados.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={coresGraficoDonut[index % coresGraficoDonut.length]} />
                            ))}
                        </Pie>
                        <Legend 
                            layout="horizontal" 
                            align="center" 
                            verticalAlign="bottom" 
                            iconSize={10} 
                            wrapperStyle={{ fontSize: '12px', marginTop: '10px' }}
                            formatter={renderLegendText}
                        />
                        <RechartsTooltip 
                            contentStyle={glassTooltipStyle} 
                            labelStyle={tooltipLabelStyle} 
                            itemStyle={tooltipItemStyle} 
                        />
                    </PieChart>
                </ResponsiveContainer> )}
            </div>
        </div>

        <div className="main-content-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '1.5rem' }}>
            <h2 className="page-title" style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <FolderArchive size={32} /> <span>Gestão de Documentos</span>
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <Input aria-label="Buscar empreendimentos" placeholder="Buscar por nome, matrícula ou CNPJ/CPF..." value={busca} onChange={(e) => setBusca(e.target.value)} style={{ padding: "12px 16px", width: "350px", borderRadius: "8px" }}/>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={fetchEmpreendimentos} title="Atualizar Lista" aria-label="Atualizar lista" className="btn btn-outline-gray" style={{padding: '9px'}}> <RefreshCcw size={20} /> </button>
                    <FilterPopover empreendimentos={empreendimentos} onApplyFilters={setAdvancedFilters} initialFilters={advancedFilters} />
                    <button onClick={handleExportXLSX} title="Exportar para Excel" aria-label="Exportar lista para Excel" className="btn btn-outline-blue" style={{padding: '9px'}}> <FileDown size={20} /> </button>
                    
                    <button
                      onClick={() => handleThemeChange(theme === 'light' ? 'dark' : 'light')}
                      className="theme-toggle-btn"
                      title={theme === 'light' ? 'Mudar para tema escuro' : 'Mudar para tema claro'}
                      disabled={isSavingTheme}
                    >
                      {isSavingTheme ? (
                        <Spin indicator={<LoadingOutlined style={{ fontSize: 20, color: 'currentColor' }} spin />} />
                      ) : (
                        theme === 'light' ? <Moon size={20} /> : <Sun size={20} />
                      )}
                    </button>

                </div>
            </div>
        </div>
        <div className="kpi-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-around' }}>
            <div style={{ textAlign: 'center' }}>
                <h4 style={{ color: theme === 'dark' ? '#E2E8F0' : 'var(--gcs-gray-dark)', margin: 0, fontWeight: 500 }}>Empreendimentos</h4>
                <div className="kpi-value kpi-value-green" aria-live="polite">{kpiData.totalEmpreendimentos}</div>
            </div>
            <hr style={{ width: '80%', border: 'none', borderTop: '1px solid var(--gcs-border-color)' }} />
            <div style={{ textAlign: 'center' }}>
                <h4 style={{ color: theme === 'dark' ? '#E2E8F0' : 'var(--gcs-gray-dark)', margin: 0, fontWeight: 500 }}>Docs em Alerta</h4>
                <div className="kpi-value kpi-value-orange" aria-live="polite">{kpiData.totalDocsAlerta}</div>
            </div>
        </div>
      </div>
      
      <div className="content-card" aria-busy={loading}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
          <h3 style={{margin: 0, color: theme === 'dark' ? '#F1F5F9' : 'var(--gcs-blue)'}}>Lista de Empreendimentos</h3>
          <button onClick={() => handleOpenEmpreendimentoModal('add')} title="Adicionar Novo Empreendimento" className="btn btn-green btn-custom-dark-green">
              <Plus size={16} /> Incluir Novo Empreendimento
          </button>
        </div>

        <div className="status-tabs-container" style={{ display: 'flex', gap: '8px', marginBottom: '16px', overflowX: 'auto', paddingBottom: '4px' }}>
            {tabOptions.map(option => (
                <button
                    key={option.key}
                    className={`btn-status-tab ${situacaoFilter === option.key ? 'active' : ''}`}
                    onClick={() => setSituacaoFilter(option.key)}
                    style={{
                        background: situacaoFilter === option.key ? option.color : undefined,
                    }}
                >
                    {option.icon}
                    {option.label}
                </button>
            ))}
        </div>

        {!hasLoadedOnce ? (
          <LoadingSpinner text="Carregando empreendimentos..." />
        ) : (
          <Table
            className="gcs-table" rowKey={(record) => record.key} columns={columns} dataSource={empreendimentosFiltrados}
            loading={{ spinning: loading, tip: 'Atualizando...', size: 'large' }} sticky size="middle"
            pagination={{ defaultPageSize: 10, showSizeChanger: true, position: ["bottomRight"], locale: { items_per_page: '/ pág.' } }} scroll={{ x: 1200, y: 520 }}
            locale={{ emptyText: (empreendimentos.length > 0 && empreendimentosFiltrados.length === 0 ? (<Empty description="Nenhum resultado para os filtros."> <Button type="primary" onClick={handleClearAllFilters}>Limpar Filtros</Button> </Empty>) : "Nenhum dado para exibir." )}}
            rowClassName={(_, index) => index % 2 === 0 ? 'row-even' : 'row-odd'}
            onRow={(record) => ({ onDoubleClick: () => handleOpenGestaoModal(record), })}
          />
        )}
      </div>
    </div>
    
    <ModalGestao visible={isGestaoModalOpen} onClose={handleCloseGestaoModal} empreendimento={selectedEmpreendimento}/>
    <ModalEmpreendimento visible={isEmpreendimentoModalOpen} mode={empreendimentoModalMode} initialData={currentEmpreendimento} onClose={handleCloseEmpreendimentoModal} onSave={handleSaveEmpreendimento} isSaving={isSaving} />
    <NotificationModal visible={notification.visible} type={notification.type} message={notification.message} onClose={() => setNotification(v => ({...v, visible: false}))} />
  </>);
}