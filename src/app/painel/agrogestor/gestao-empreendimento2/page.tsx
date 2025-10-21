"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Tooltip, Button, Typography, Input, Table, message, Empty, Dropdown, Menu, Space } from "antd";
import type { MenuProps } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import * as XLSX from 'xlsx';
import { PieChart, Pie, Cell, Legend, ResponsiveContainer, Sector } from "recharts";
import {
    RefreshCcw, Filter, X, FileDown, Lock, FolderArchive, FolderGit2, Plus, MoreVertical, Edit, Trash2
} from "lucide-react";
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
        <div style={{ width: '40px', height: '40px', border: '4px solid var(--gcs-gray-medium)', borderTop: '4px solid var(--gcs-blue)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <div style={{ marginTop: '1rem', fontWeight: 'bold', color: 'var(--gcs-blue)' }}>{text}</div>
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

const FilterPopover = ({ empreendimentos, onApplyFilters, initialFilters }: { empreendimentos: EmpreendimentoCompleto[], onApplyFilters: (filters: any) => void, initialFilters: any }) => {
    const [isOpen, setIsOpen] = useState(false); const [estado, setEstado] = useState(initialFilters.estado || ALL_STATES); const [unidade, setUnidade] = useState(initialFilters.unidade || ALL_UNITS); const popoverRef = React.useRef<HTMLDivElement>(null); const estadosUnicos = useMemo(() => [ALL_STATES, ...Array.from(new Set(empreendimentos.map(e => e.estado).filter(Boolean)))], [empreendimentos]); const unidadesUnicas = useMemo(() => [ALL_UNITS, ...Array.from(new Set(empreendimentos.map(e => e.unidade).filter(Boolean)))], [empreendimentos]); const handleApply = () => { onApplyFilters({ estado, unidade }); setIsOpen(false); }; const handleClear = () => { setEstado(ALL_STATES); setUnidade(ALL_UNITS); onApplyFilters({ estado: ALL_STATES, unidade: ALL_UNITS }); setIsOpen(false); }; useEffect(() => { const handleClickOutside = (event: MouseEvent) => { if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) setIsOpen(false); }; document.addEventListener("mousedown", handleClickOutside); return () => document.removeEventListener("mousedown", handleClickOutside); }, [popoverRef]); useEffect(() => { if (!isOpen) return; const onKey = (e: KeyboardEvent) => e.key === "Escape" && setIsOpen(false); window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey); }, [isOpen]);
    return ( <div style={{ position: 'relative' }} ref={popoverRef}> <button onClick={() => setIsOpen(!isOpen)} title="Filtros Avançados" className="btn btn-outline-gray" style={{padding: '9px'}}><Filter size={20} /></button> {isOpen && (<div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '8px', width: '300px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.15)', border: '1px solid var(--gcs-border-color)', zIndex: 100, padding: '1rem' }}> <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}><h4 style={{ margin: 0, color: 'var(--gcs-blue)' }}>Filtros Avançados</h4><button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} color="var(--gcs-gray-dark)" /></button></div> <div style={{ marginBottom: '1rem' }}><label className="modal-label">Estado</label><select value={estado} onChange={(e) => setEstado(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--gcs-border-color)' }}>{estadosUnicos.map(f => <option key={f} value={f}>{f}</option>)}</select></div> <div style={{ marginBottom: '1.5rem' }}><label className="modal-label">Unidade</label><select value={unidade} onChange={(e) => setUnidade(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--gcs-border-color)' }}>{unidadesUnicas.map(r => <option key={r} value={r}>{r}</option>)}</select></div> <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}><button onClick={handleClear} className="btn btn-outline-gray" style={{padding: '8px 16px'}}>Limpar</button><button onClick={handleApply} className="btn btn-green" style={{padding: '8px 16px'}}>Aplicar</button></div> </div>)} </div> );
};

const renderActiveShape = (props: any) => { const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props; return (<g><Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 8} startAngle={startAngle} endAngle={endAngle} fill={fill}/></g>);};

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
  
  // Estados para o Modal de Gestão de Documentos
  const [isGestaoModalOpen, setIsGestaoModalOpen] = useState(false);
  const [selectedEmpreendimento, setSelectedEmpreendimento] = useState<EmpreendimentoCompleto | null>(null);

  // Estados para o Modal de CRUD de Empreendimento
  const [isEmpreendimentoModalOpen, setIsEmpreendimentoModalOpen] = useState(false);
  const [empreendimentoModalMode, setEmpreendimentoModalMode] = useState<'add' | 'edit' | 'delete'>('add');
  const [currentEmpreendimento, setCurrentEmpreendimento] = useState<Partial<Empreendimento> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState({ visible: false, type: 'success' as 'success' | 'error', message: '' });

  const inFlightRef = useRef<AbortController | null>(null);
  const initialFetchDone = useRef(false);

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
  const dadosGraficoEstados = useMemo(() => { const counts: Record<string, number> = {}; empreendimentos.forEach(emp => { if(emp.estado) { counts[emp.estado] = (counts[emp.estado] || 0) + 1; } }); return Object.entries(counts).map(([name, value]) => ({ name, value })); }, [empreendimentos]);
  const coresGrafico = ["#00314A", "#5FB246", "#F58220", "#007bff", "#6c757d"];
  const norm = (s:string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\w]/g,'').toLowerCase();
  
  const empreendimentosFiltrados = useMemo(() => { 
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

  const handleExportXLSX = () => { const rows = empreendimentosFiltrados.map(e => ({ ID: e.id ?? "", Empreendimento: e.nome ?? "", Matricula: e.numero_matricula ?? "", "CPF/CNPJ": e.cnpj_cpf ?? "", Unidade: e.unidade ?? "", Estado: e.estado ?? "" })); const ws = XLSX.utils.json_to_sheet(rows); ws['!cols'] = [{wch:8},{wch:40},{wch:16},{wch:18},{wch:16},{wch:10}]; const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Empreendimentos"); XLSX.writeFile(wb, "empreendimentos_gcs.xlsx"); };
  const handleClearAllFilters = useCallback(() => { setBusca(""); setAdvancedFilters({ estado: ALL_STATES, unidade: ALL_UNITS }); }, []);

  // --- Handlers para MODAL DE GESTÃO ---
  const handleOpenGestaoModal = useCallback((e: EmpreendimentoCompleto) => { setSelectedEmpreendimento(e); setIsGestaoModalOpen(true); }, []);
  const handleCloseGestaoModal = useCallback(() => { setIsGestaoModalOpen(false); setSelectedEmpreendimento(null); }, []);

  // --- Handlers para MODAL DE EMPREENDIMENTO (CRUD) ---
  const handleOpenEmpreendimentoModal = (mode: 'add' | 'edit' | 'delete', empreendimento?: EmpreendimentoCompleto) => { setEmpreendimentoModalMode(mode); setCurrentEmpreendimento(empreendimento || null); setIsEmpreendimentoModalOpen(true); };
  const handleCloseEmpreendimentoModal = () => { setIsEmpreendimentoModalOpen(false); setCurrentEmpreendimento(null); };
  const handleSaveEmpreendimento = async (data: Partial<Empreendimento>, mode: 'add' | 'edit' | 'delete') => {
    setIsSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
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
    { title: "ID", dataIndex: "id", key: "id", width: 90, fixed: "left" as const, sorter: (a, b) => (a.id || 0) - (b.id || 0) },
    { title: "Empreendimento", dataIndex: "nome", key: "nome", width: 320, className: "empreendimento-column", sorter: (a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR', { sensitivity: 'base' }) },
    { title: "Matrícula", dataIndex: "numero_matricula", key: "matricula", width: 140 },
    { title: "CPF/CNPJ", dataIndex: "cnpj_cpf", key: "doc", width: 160 },
    { title: "Unidade", dataIndex: "unidade", key: "unidade", width: 120, sorter: (a, b) => (a.unidade || '').localeCompare(b.unidade || '', 'pt-BR', { sensitivity: 'base' }) },
    { title: "Estado", dataIndex: "estado", key: "estado", width: 90, sorter: (a, b) => (a.estado || '').localeCompare(b.estado || '', 'pt-BR', { sensitivity: 'base' }) },
    {
      title: "Ação", key: "acao", width: 160, align: "center" as const, fixed: "right" as const,
      render: (_: any, item: EmpreendimentoCompleto) => {
        const menuItems: MenuProps['items'] = [
          { key: 'edit', icon: <Edit size={14} style={{ marginRight: 8 }} />, label: 'Alterar Dados', onClick: () => handleOpenEmpreendimentoModal('edit', item) },
          { key: 'delete', icon: <Trash2 size={14} style={{ marginRight: 8 }} />, label: 'Excluir', danger: true, onClick: () => handleOpenEmpreendimentoModal('delete', item) }
        ];
        return (
          <Space>
            <Button type="primary" style={{ backgroundColor: 'var(--gcs-blue)' }} icon={<FolderGit2 size={16} />} onClick={() => handleOpenGestaoModal(item)} aria-haspopup="dialog">
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

  if (status === 'loading' || authStatus === 'loading') { return <LoadingSpinner text="Verificando permissões..." />; }
  if (authStatus === 'unauthorized') { return <AcessoNegado />; }
  
  return (<>
    <style>{`
        :root { 
            --gcs-blue: #00314A; --gcs-green: #5FB246; --gcs-orange: #F58220;
            --gcs-orange-light: #FDBA74; --gcs-red: #d9534f; --gcs-red-light: #ff6f61;
            --gcs-gray-light: #f8f9fa; --gcs-gray-medium: #e9ecef; --gcs-gray-dark: #6c757d; 
            --gcs-border-color: #dee2e6; --gcs-download-color: #007bff; --gcs-edit-color: #F58220;
            --gcs-tab-active-blue: #1E66FF; --gcs-tab-active-bg: #EAF3FF;
            --gcs-tab-inactive-color: #344054; --gcs-tab-hover-bg: #F2F4F7;
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .btn { cursor: pointer; font-weight: 600; display: inline-flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s ease-in-out; border: 1px solid transparent; padding: 10px 20px; border-radius: 8px; }
        .btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .btn-green { background-color: var(--gcs-green); color: white; }
        .btn-excluir { background-color: var(--gcs-red); color: white; border-color: var(--gcs-red); }
        .btn-outline-gray { background-color: #fff; color: var(--gcs-gray-dark); border-color: var(--gcs-border-color); }
        .btn-outline-blue { background-color: #fff; color: var(--gcs-blue); border-color: var(--gcs-border-color); }
        .kpi-card, .chart-card, .main-content-card, .content-card { background-color: #fff; border-radius: 12px; padding: 1.5rem; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08); border: 1px solid var(--gcs-border-color); }
        .modal-label { display: block; margin-bottom: 6px; font-size: 14px; font-weight: 500; color: #333; }
        .modal-input { width: 100%; padding: 10px; border-radius: 6px; border: 1px solid var(--gcs-border-color); }
        .modal-input:disabled { background-color: #f1f3f5; color: #6c757d; }
        .ant-tabs-vertical > .ant-tabs-nav .ant-tabs-ink-bar { width: 3px !important; background: var(--gcs-tab-active-blue) !important; }
        .ant-tabs-vertical > .ant-tabs-nav { padding: 8px; }
        .ant-tabs-tab { padding: 10px 16px !important; margin: 4px 0 !important; border-radius: 8px !important; transition: background-color 0.2s ease-in-out, color 0.2s ease-in-out !important; }
        .ant-tabs-tab .ant-tabs-tab-btn { width: 100%; text-align: left; }
        .ant-tabs-tab .ant-tabs-tab-btn span, .ant-tabs-tab .ant-tabs-tab-btn svg { transition: all 0.2s ease-in-out; }
        .ant-tabs-tab .ant-tabs-tab-btn, .ant-tabs-tab .ant-tabs-tab-btn span { color: var(--gcs-tab-inactive-color) !important; font-weight: 500 !important; }
        .ant-tabs-tab .ant-tabs-tab-btn svg { stroke: var(--gcs-tab-inactive-color) !important; }
        .ant-tabs-tab:not(.ant-tabs-tab-active):hover { background-color: var(--gcs-tab-hover-bg) !important; }
        .ant-tabs-tab.ant-tabs-tab-active { background-color: var(--gcs-tab-active-bg) !important; }
        .ant-tabs-tab.ant-tabs-tab-active .ant-tabs-tab-btn, .ant-tabs-tab.ant-tabs-tab-active .ant-tabs-tab-btn span { color: var(--gcs-tab-active-blue) !important; font-weight: 600 !important; }
        .ant-tabs-tab.ant-tabs-tab-active .ant-tabs-tab-btn svg { stroke: var(--gcs-tab-active-blue) !important; transform: scale(1.05); }
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
        .gcs-table.ant-table-wrapper { border-radius: 10px; overflow: hidden; }
        .gcs-table .ant-table-thead > tr > th { background-color: var(--gcs-blue) !important; color: white !important; font-weight: 600; }
        .gcs-table .ant-table-thead > tr > th .ant-table-column-sorter { color: white !important; }
        .gcs-table .ant-table-thead > tr > th .ant-table-column-sorter-up.active, .gcs-table .ant-table-thead > tr > th .ant-table-column-sorter-down.active { color: var(--gcs-orange) !important; }
        .gcs-table .ant-table-tbody > tr > td.empreendimento-column { white-space: normal !important; word-break: break-word; }
        .gcs-table .ant-table-tbody > .row-even > td { background: #fff; }
        .gcs-table .ant-table-tbody > .row-odd > td { background: #f8f9fa; }
    `}</style>

    <div className="main-container" style={{ padding: "2rem", backgroundColor: "#E9ECEF", minHeight: "100vh" }}>
      <div className="header-wrapper" style={{ display: 'flex', alignItems: 'stretch', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="chart-card" style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <h4 style={{ margin: 0, color: 'var(--gcs-gray-dark)', fontWeight: 500, fontSize: '1rem' }}>Empreendimentos por Estado</h4>
            <div style={{ width: 280, height: 160 }} aria-label="Distribuição de empreendimentos por estado">
                {loading && !hasLoadedOnce ? ( <div style={{height:160, display:'flex',alignItems:'center',justifyContent:'center'}}><LoadingSpinner text="" /></div> ) : 
                 dadosGraficoEstados.length === 0 ? ( <div style={{height:160, display:'flex',alignItems:'center',justifyContent:'center', color: 'var(--gcs-gray-dark)'}}><span>Nenhum dado</span></div> ) : 
                 ( <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie activeIndex={activeIndex} activeShape={renderActiveShape} data={dadosGraficoEstados} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={3} onMouseEnter={(_, index) => setActiveIndex(index)} onMouseLeave={() => setActiveIndex(null)}>
                            {dadosGraficoEstados.map((entry, index) => (<Cell key={`cell-${index}`} fill={coresGrafico[index % coresGrafico.length]} />))}
                        </Pie>
                        <Legend layout="horizontal" align="center" verticalAlign="bottom" iconSize={10} wrapperStyle={{ fontSize: '12px' }}/>
                    </PieChart>
                </ResponsiveContainer> )}
            </div>
        </div>
        <div className="main-content-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '1.5rem' }}>
            <h2 className="page-title" style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold', color: 'var(--gcs-blue)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}><FolderArchive size={32} /> <span>Gestão de Documentos</span></h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <Input aria-label="Buscar empreendimentos" placeholder="Buscar por nome, matrícula ou CNPJ/CPF..." value={busca} onChange={(e) => setBusca(e.target.value)} style={{ padding: "12px 16px", width: "350px", borderRadius: "8px" }}/>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={fetchEmpreendimentos} title="Atualizar Lista" aria-label="Atualizar lista" className="btn btn-outline-gray" style={{padding: '9px'}}> <RefreshCcw size={20} /> </button>
                    <FilterPopover empreendimentos={empreendimentos} onApplyFilters={setAdvancedFilters} initialFilters={advancedFilters} />
                    <button onClick={handleExportXLSX} title="Exportar para Excel" aria-label="Exportar lista para Excel" className="btn btn-outline-blue" style={{padding: '9px'}}> <FileDown size={20} /> </button>
                </div>
            </div>
        </div>
        <div className="kpi-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-around' }}>
            <div style={{ textAlign: 'center' }}><h4 style={{ color: 'var(--gcs-gray-dark)', margin: 0, fontWeight: 500 }}>Empreendimentos</h4><p style={{ fontSize: '2.2rem', margin: 0, color: 'var(--gcs-blue)', fontWeight: 'bold' }}><div aria-live="polite">{kpiData.totalEmpreendimentos}</div></p></div>
            <hr style={{ width: '80%', border: 'none', borderTop: '1px solid var(--gcs-border-color)' }} />
            <div style={{ textAlign: 'center' }}><h4 style={{ color: 'var(--gcs-gray-dark)', margin: 0, fontWeight: 500 }}>Docs em Alerta</h4><p style={{ fontSize: '2.2rem', margin: 0, color: 'var(--gcs-orange)', fontWeight: 'bold' }}><div aria-live="polite">{kpiData.totalDocsAlerta}</div></p></div>
        </div>
      </div>
      <div className="content-card" aria-busy={loading}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
          <h3 style={{margin: 0, color: 'var(--gcs-blue)'}}>Lista de Empreendimentos</h3>
          <button onClick={() => handleOpenEmpreendimentoModal('add')} title="Adicionar Novo Empreendimento" className="btn btn-green">
              <Plus size={16} /> Incluir Novo Empreendimento
          </button>
        </div>
        {!hasLoadedOnce ? (
          <LoadingSpinner text="Carregando empreendimentos..." />
        ) : (
          <Table
            className="gcs-table" rowKey={(record) => record.key} columns={columns} dataSource={empreendimentosFiltrados}
            loading={{ spinning: loading, tip: 'Atualizando...', size: 'large' }} sticky size="middle"
            pagination={{ pageSize: 10, showSizeChanger: true, position: ["bottomRight"] }} scroll={{ x: 1200, y: 520 }}
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

