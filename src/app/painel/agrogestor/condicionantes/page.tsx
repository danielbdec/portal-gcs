"use client";

import { useEffect, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Tooltip, Space, Button, Table, Typography, Input } from "antd";
import { EditOutlined, DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import * as XLSX from 'xlsx';
import {
    PieChart, Pie, Cell, Legend, ResponsiveContainer, Sector
} from "recharts";
import {
    RefreshCcw, FileDown, Lock, FolderArchive, Filter, X
} from "lucide-react";
import React from "react";
import "antd/dist/reset.css";

import ModalCondicionante, { Condicionante } from "./ModalCondicionante";
import NotificationModal from "./NotificationModal";

const { Title } = Typography;

const tiposDeDocumento = [
    { code: 'ada', label: 'Ato Declaratório Ambiental (ADA)' },
    { code: 'alvara', label: 'Alvará' },
    { code: 'appo', label: 'Autorização para Pesquisa de Potencial Hídrico (APPO)' },
    { code: 'asv', label: 'Autorização de Supressão de Vegetação (ASV)' },
    { code: 'car', label: 'Cadastro Ambiental Rural (CAR)' },
    { code: 'ccir', label: 'Certificado de Cadastro de Imóvel Rural (CCIR)' },
    { code: 'cefir', label: 'Cadastro Estadual Florestal de Imóveis Rurais (CEFIR)' },
    { code: 'certidao_inteiro_teor', label: 'Certidão de Inteiro Teor da Matrícula' },
    { code: 'certificado_bombeiros', label: 'Certificado de Licenciamento dos Bombeiros' },
    { code: 'certificado_uso_solo', label: 'Certidão de Uso e Ocupação do Solo' },
    { code: 'cib', label: 'Cadastro Imobiliário Brasileiro (CIB)' },
    { code: 'ctf_ibama', label: 'Cadastro Técnico Federal (CTF/IBAMA)' },
    { code: 'geo', label: 'Georreferenciamento' },
    { code: 'inventario_residuos', label: 'Inventário Nacional de Resíduos Sólidos' },
    { code: 'itr', label: 'Imposto sobre a Propriedade Territorial Rural (ITR)' },
    { code: 'itr_cadastral', label: 'Situação Cadastral do Imóvel Rural (ITR)' },
    { code: 'kml', label: 'Arquivo de Mapa (KML/KMZ)' },
    { code: 'licenca', label: 'Licença Ambiental' },
    { code: 'outorga', label: 'Outorga de Uso de Recursos Hídricos' },
    { code: 'rapp_ibama', label: 'Relatório de Atividades Potencialmente Poluidoras (RAPP)' },
    { code: 'relatorio', label: 'Relatório Técnico / Ambiental' },
];
const documentoLabelMap = new Map(tiposDeDocumento.map(doc => [doc.code, doc.label]));


interface CondicionanteCompleto extends Condicionante {
  key: string;
  criado_em?: string;
  incluido_por?: string;
  alterado_por?: string | null;
}

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
        Você não tem as permissões necessárias para visualizar este módulo.
      </p>
      <button onClick={() => router.push('/painel')} className="btn btn-green" style={{ marginTop: '1rem' }}>
        Voltar ao Painel
      </button>
    </div>
  );
};

const FilterPopover = ({
    onApplyFilters,
    initialFilters
}: {
    onApplyFilters: (filters: any) => void,
    initialFilters: any
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [documento, setDocumento] = useState(initialFilters.documento || 'Todos');
    const popoverRef = React.useRef<HTMLDivElement>(null);

    const handleApply = () => {
        onApplyFilters({ documento });
        setIsOpen(false);
    };

    const handleClear = () => {
        setDocumento('Todos');
        onApplyFilters({ documento: 'Todos' });
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
            <button onClick={() => setIsOpen(!isOpen)} title="Filtros" className="btn btn-outline-gray" style={{padding: '9px'}}>
                <Filter size={20} />
            </button>
            {isOpen && (
                <div style={{
                    position: 'absolute', top: '100%', right: 0, marginTop: '8px', width: '300px',
                    backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                    border: '1px solid var(--gcs-border-color)', zIndex: 100, padding: '1rem'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h4 style={{ margin: 0, color: 'var(--gcs-blue)' }}>Filtros</h4>
                        <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} color="var(--gcs-gray-dark)" /></button>
                    </div>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label className="modal-label">Documento</label>
                        <select value={documento} onChange={(e) => setDocumento(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--gcs-border-color)' }}>
                            <option value="Todos">Todos</option>
                            {tiposDeDocumento.map(doc => <option key={doc.code} value={doc.code}>{doc.label}</option>)}
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

const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
    return ( <g> <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 8} startAngle={startAngle} endAngle={endAngle} fill={fill}/> </g> );
};

// ======================= FUNÇÃO PARA RESUMIR TEXTO DA LEGENDA =======================
const formatLegendText = (value: string) => {
    const maxLength = 25;
    if (value.length > maxLength) {
        return `${value.substring(0, maxLength)}...`;
    }
    return value;
};
// ====================================================================================

export default function CondicionantesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [authStatus, setAuthStatus] = useState<'loading' | 'authorized' | 'unauthorized'>('loading');
  const [condicionantes, setCondicionantes] = useState<CondicionanteCompleto[]>([]);
  const [busca, setBusca] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [advancedFilters, setAdvancedFilters] = useState({ documento: 'Todos' });
  // ALTERAÇÃO: Inicializando com undefined em vez de null para satisfazer o tipo do PieChart
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'delete'>('add');
  const [currentCondicionante, setCurrentCondicionante] = useState<CondicionanteCompleto | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [notification, setNotification] = useState<{ visible: boolean; type: 'success' | 'error'; message: string }>({
    visible: false,
    type: 'success',
    message: '',
  });

  useEffect(() => {
    if (status === 'loading') {
      setAuthStatus('loading');
      return;
    }
    if (status === 'authenticated') {
      const user = session.user;
      const hasAccess = user?.is_admin === true || user?.funcoes?.includes('agrogestor.condicionantes');
      
      if (hasAccess) {
        setAuthStatus('authorized');
        fetchCondicionantes();
      } else {
        setAuthStatus('unauthorized');
      }
    } else {
        router.push('/login');
    }
  }, [status, session, router]);

  const fetchCondicionantes = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/agrogestor/condicionantes/consulta-condicionantes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
        
        if (!response.ok) {
          throw new Error('Falha ao buscar dados das condicionantes.');
        }

        const data: CondicionanteCompleto[] = await response.json();
        const dataComChave = data.map(item => ({ ...item, key: item.id.toString() }));
        setCondicionantes(dataComChave);

      } catch (error: any) {
        console.error("Erro ao buscar as condicionantes:", error);
        setCondicionantes([]);
        setNotification({ visible: true, type: 'error', message: error.message || "Não foi possível carregar as condicionantes." });
      } finally {
        setLoading(false);
      }
    };

  const kpiData = useMemo(() => {
    return { totalCondicionantes: condicionantes.length };
  }, [condicionantes]);

  const dadosGraficoDocumentos = useMemo(() => {
    const counts: Record<string, number> = {};
    condicionantes.forEach(item => {
      if(item.documento) {
        const label = documentoLabelMap.get(item.documento) || item.documento;
        counts[label] = (counts[label] || 0) + 1;
      }
    });

    const sortedData = Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    if (sortedData.length > 3) {
      const top3 = sortedData.slice(0, 3);
      const othersValue = sortedData.slice(3).reduce((sum, item) => sum + item.value, 0);

      if (othersValue > 0) {
        return [...top3, { name: 'Outros', value: othersValue }];
      }
      return top3;
    }

    return sortedData;
  }, [condicionantes]);

  const coresGrafico = ["#00314A", "#5FB246", "#F58220", "#007bff", "#6c757d", "#ffc107", "#17a2b8"];

  const condicionantesFiltradas = useMemo(() => {
    let dadosFiltrados = [...(condicionantes || [])];
    if (busca) {
        const termo = busca.toLowerCase();
        dadosFiltrados = dadosFiltrados.filter(item => 
            (item.nome?.toLowerCase() ?? '').includes(termo)
        );
    }
    if (advancedFilters.documento && advancedFilters.documento !== 'Todos') {
        dadosFiltrados = dadosFiltrados.filter(item => item.documento === advancedFilters.documento);
    }
    return dadosFiltrados;
  }, [condicionantes, busca, advancedFilters]);

  const handleExportXLSX = () => {
    const headers = ["ID", "Documento", "Nome", "Status", "Criado Em"];
    const data = condicionantesFiltradas.map(item => [
        item.id,
        documentoLabelMap.get(item.documento) || item.documento,
        item.nome, 
        item.status === 'A' ? 'Ativo' : 'Inativo', 
        item.criado_em
    ]);
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
    worksheet['!cols'] = [ { wch: 5 }, { wch: 45 }, { wch: 60 }, { wch: 15 }, { wch: 25 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Condicionantes");
    XLSX.writeFile(workbook, "Agrogestor_Condicionantes.xlsx");
  };

  const handleOpenModal = (mode: 'add' | 'edit' | 'delete', condicionante: CondicionanteCompleto | null = null) => {
    setModalMode(mode);
    setCurrentCondicionante(condicionante);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentCondicionante(null);
  };

  const handleSaveCondicionante = async (data: Partial<Condicionante>, mode: 'add' | 'edit' | 'delete') => {
      setIsSaving(true);
      try {
        let endpoint = '';
        let body = {};

        switch (mode) {
          case 'add':
            endpoint = '/api/agrogestor/condicionantes/inclui-condicionantes';
            body = data;
            break;
          case 'edit':
            endpoint = '/api/agrogestor/condicionantes/altera-condicionantes';
            body = data;
            break;
          case 'delete':
            endpoint = '/api/agrogestor/condicionantes/inativa-condicionantes';
            body = { id: data.id };
            break;
        }

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        const result = await response.json();
        
        const isSuccess = response.ok && Array.isArray(result) && result.length > 0 && result[0]?.status === 'ok';

        if (isSuccess) {
            handleCloseModal();
            setNotification({ visible: true, type: 'success', message: result[0]?.message || "Operação realizada com sucesso!" });
            fetchCondicionantes();
        } else {
            const errorMessage = result[0]?.message || result?.message || `Ocorreu um erro na operação.`;
            throw new Error(errorMessage);
        }

      } catch (error: any) {
        handleCloseModal();
        setNotification({ visible: true, type: 'error', message: `Falha na operação: ${error.message}` });
      } finally {
        setIsSaving(false);
      }
  };

  const getStatusColor = (status?: string) => {
    const s = (status || '').toString().trim().toUpperCase();
    if (s === 'A') return 'var(--gcs-green)';
    if (s === 'I') return 'var(--gcs-red)';
    return '#BDBDBD';
  };

  const columns = [
    { title: "ID", dataIndex: "id", key: "id", width: 80, sorter: (a: Condicionante, b: Condicionante) => a.id - b.id },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 90,
      align: "center" as const,
      render: (status: string) => {
        const color = getStatusColor(status);
        const label = status === 'A' ? 'ATIVO' : 'INATIVO';
        return (
          <Tooltip title={label}>
            <div
              style={{
                width: 12, height: 12, borderRadius: '50%',
                backgroundColor: color, margin: '0 auto',
                boxShadow: '0 0 0 2px rgba(0,0,0,0.05)'
              }}
            />
          </Tooltip>
        );
      }
    },
    {
        title: "Documento",
        dataIndex: "documento",
        key: "documento",
        width: 300,
        render: (code: string) => documentoLabelMap.get(code) || code,
        sorter: (a: CondicionanteCompleto, b: CondicionanteCompleto) => {
            const labelA = documentoLabelMap.get(a.documento) || '';
            const labelB = documentoLabelMap.get(b.documento) || '';
            return labelA.localeCompare(labelB);
        },
    },
    { title: "Nome da Condicionante", dataIndex: "nome", key: "nome", sorter: (a: Condicionante, b: Condicionante) => a.nome.localeCompare(b.nome) },
    { 
      title: "Criado Em", 
      dataIndex: "criado_em", 
      key: "criado_em", 
      width: 200,
      render: (text: string) => {
        if (!text) return '---';
        try {
          const date = new Date(text);
          if (isNaN(date.getTime())) return text; 
          const dia = String(date.getDate()).padStart(2, '0');
          const mes = String(date.getMonth() + 1).padStart(2, '0');
          const ano = date.getFullYear();
          const horas = String(date.getHours()).padStart(2, '0');
          const minutos = String(date.getMinutes()).padStart(2, '0');
          return `${dia}/${mes}/${ano} ${horas}:${minutos}`;
        } catch (e) {
            return text;
        }
      }
    },
    {
      title: "Ações",
      key: "action",
      align: "center" as const,
      width: 120,
      render: (_: any, record: CondicionanteCompleto) => (
        <Space size="middle">
          <Tooltip title="Alterar">
            <Button className="btn-alterar" shape="circle" icon={<EditOutlined />} onClick={() => handleOpenModal('edit', record)} />
          </Tooltip>
          <Tooltip title="Excluir">
            <Button className="btn-excluir" shape="circle" icon={<DeleteOutlined />} onClick={() => handleOpenModal('delete', record)} />
          </Tooltip>
        </Space>
      ),
    },
  ];

  if (authStatus === 'loading') return <LoadingSpinner text="A verificar permissões..." />;
  if (authStatus === 'unauthorized') return <AcessoNegado />;
  
  return (<>
    <style>{`
        :root { --gcs-blue: #00314A; --gcs-green: #5FB246; --gcs-orange: #F58220; --gcs-orange-light: #FDBA74; --gcs-red: #d9534f; --gcs-red-light: #ff6f61; --gcs-gray-light: #f8f9fa; --gcs-gray-medium: #e9ecef; --gcs-gray-dark: #6c757d; --gcs-border-color: #dee2e6; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .btn { cursor: pointer; font-weight: 600; display: inline-flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s ease-in-out; border: 1px solid transparent; padding: 10px 20px; border-radius: 8px; }
        .btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .btn-green { background-color: var(--gcs-green); color: white; }
        .btn-green:hover:not(:disabled) { background-color: #4a9d3a; }
        .btn-outline-gray { background-color: #fff; color: var(--gcs-gray-dark); border-color: var(--gcs-border-color); }
        .btn-outline-gray:hover:not(:disabled) { border-color: var(--gcs-gray-dark); background-color: var(--gcs-gray-light); }
        .btn-outline-blue { background-color: #fff; color: var(--gcs-blue); border-color: var(--gcs-border-color); }
        .btn-outline-blue:hover:not(:disabled) { border-color: var(--gcs-blue); background-color: #f1f5fb; }
        .btn-incluir { background: var(--gcs-green) !important; border-color: var(--gcs-green) !important; }
        .btn-incluir:hover { background: #4a9d3a !important; border-color: #4a9d3a !important; }
        .btn-alterar { color: white !important; border: none !important; background-image: linear-gradient(135deg, var(--gcs-orange), var(--gcs-orange-light)) !important; box-shadow: 0 2px 8px rgba(0,0,0,0.15); }
        .btn-excluir { color: white !important; border: none !important; background-image: linear-gradient(135deg, var(--gcs-red), var(--gcs-red-light)) !important; box-shadow: 0 2px 8px rgba(0,0,0,0.15); }
        .btn-alterar:hover, .btn-excluir:hover { opacity: 0.9; transform: translateY(-1px); }
        .kpi-card, .chart-card, .main-content-card, .content-card { background-color: #fff; border-radius: 12px; padding: 1.5rem; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08); border: 1px solid var(--gcs-border-color); }
        .modal-label { display: block; margin-bottom: 6px; font-size: 14px; font-weight: 500; color: #333; }
        .modal-input { width: 100%; padding: 10px; border-radius: 6px; border: 1px solid var(--gcs-border-color); font-size: 1rem; transition: border-color 0.2s, box-shadow 0.2s; }
        .modal-input:focus { border-color: var(--gcs-blue); box-shadow: 0 0 0 3px rgba(0, 49, 74, 0.1); outline: none; }
        .modal-input:disabled { background-color: var(--gcs-gray-light); cursor: not-allowed; color: var(--gcs-gray-dark); }
        .animate-spin { animation: spin 1s linear infinite; }
        .ant-table-thead > tr > th { background-color: #00314A !important; color: white !important; font-weight: bold; }
        .ant-pagination-item-active { background-color: var(--gcs-blue) !important; border-color: var(--gcs-blue) !important; }
        .ant-pagination-item-active a { color: white !important; }
    `}</style>

    <div className="main-container" style={{ padding: "2rem", backgroundColor: "#E9ECEF", minHeight: "100vh" }}>
      
      <div className="header-wrapper" style={{ display: 'flex', alignItems: 'stretch', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="chart-card" style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <h4 style={{ margin: 0, color: 'var(--gcs-gray-dark)', fontWeight: 500, fontSize: '1rem' }}>Condicionantes por Documento</h4>
            <div style={{ width: 340, height: 160 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie 
                            activeIndex={activeIndex} 
                            activeShape={renderActiveShape} 
                            data={dadosGraficoDocumentos} 
                            dataKey="value" 
                            nameKey="name" 
                            cx="40%" 
                            cy="50%" 
                            innerRadius={45} 
                            outerRadius={65} 
                            paddingAngle={3} 
                            onMouseEnter={(_, index) => setActiveIndex(index)} 
                            // ALTERAÇÃO: setando para undefined em vez de null
                            onMouseLeave={() => setActiveIndex(undefined)}
                        >
                            {dadosGraficoDocumentos.map((entry, index) => (<Cell key={`cell-${index}`} fill={coresGrafico[index % coresGrafico.length]} />))}
                        </Pie>
                        <Legend 
                            layout="vertical" 
                            align="right" 
                            verticalAlign="middle" 
                            iconSize={10} 
                            wrapperStyle={{ fontSize: '12px' }}
                            // ======================= FORMATADOR APLICADO AQUI =======================
                            formatter={formatLegendText}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
        
        <div className="main-content-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '1.5rem', paddingTop: '0.5rem', paddingBottom: '0.5rem' }}>
            <h2 className="page-title" style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold', color: 'var(--gcs-blue)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <FolderArchive size={32} color="var(--gcs-blue)" />
                <span>Cadastro de Condicionantes</span>
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <Input
                      placeholder="Buscar por nome..."
                      value={busca}
                      onChange={(e) => setBusca(e.target.value)}
                      style={{ padding: "10px 16px", fontSize: "1rem", borderRadius: "8px", border: "1px solid var(--gcs-border-color)", width: "350px" }}
                  />
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={fetchCondicionantes} title="Atualizar Lista" className="btn btn-outline-gray" style={{padding: '9px'}}> <RefreshCcw size={20} /> </button>
                    <FilterPopover onApplyFilters={setAdvancedFilters} initialFilters={advancedFilters} />
                    <button onClick={handleExportXLSX} title="Exportar para Excel" className="btn btn-outline-blue" style={{padding: '9px'}}> <FileDown size={20} /> </button>
                </div>
            </div>
        </div>

        <div className="kpi-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
                <h4 style={{ color: 'var(--gcs-gray-dark)', margin: 0, fontWeight: 500, fontSize: '1rem', marginBottom: '0.25rem' }}>Total de Condicionantes</h4>
                <p style={{ fontSize: '2.5rem', margin: 0, color: 'var(--gcs-blue)', fontWeight: 'bold', lineHeight: 1.2 }}>{kpiData.totalCondicionantes}</p>
            </div>
        </div>
      </div>

      <div className="content-card">
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
            <h3 style={{margin: 0, color: 'var(--gcs-blue)'}}>Lista de Condicionantes</h3>
            <Button type="primary" className="btn-incluir" icon={<PlusOutlined />} onClick={() => handleOpenModal('add')}>
                  Incluir Nova Condicionante
            </Button>
        </div>
        {loading ? ( <LoadingSpinner text="Carregando condicionantes..." /> ) : (
            <Table
                columns={columns}
                dataSource={condicionantesFiltradas}
                pagination={{ defaultPageSize: 10, showSizeChanger: true, pageSizeOptions: ['10', '20', '50'] }}
                scroll={{ x: 'max-content' }}
            />
        )}
      </div>
    </div>

    <ModalCondicionante
        visible={isModalOpen}
        mode={modalMode}
        initialData={currentCondicionante}
        onClose={handleCloseModal}
        onSave={handleSaveCondicionante}
        isSaving={isSaving}
    />

    <NotificationModal
      visible={notification.visible}
      type={notification.type}
      message={notification.message}
      onClose={() => setNotification({ ...notification, visible: false })}
    />
  </>);
}