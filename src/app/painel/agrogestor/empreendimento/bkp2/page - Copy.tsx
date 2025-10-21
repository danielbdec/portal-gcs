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
    RefreshCcw, Search, Filter, X, FileDown, Lock, FolderArchive
} from "lucide-react";
import React from "react";
import "antd/dist/reset.css";

import ModalEmpreendimento, { Empreendimento } from "./ModalEmpreendimento";
// Importando o novo modal de notificação
import NotificationModal from "./NotificationModal";

const { Title } = Typography;

interface EmpreendimentoCompleto extends Empreendimento {
  numero_matricula?: string;
  created_at?: string;
  updated_at?: string;
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
    empreendimentos,
    onApplyFilters,
    initialFilters
}: {
    empreendimentos: EmpreendimentoCompleto[],
    onApplyFilters: (filters: any) => void,
    initialFilters: any
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [estado, setEstado] = useState(initialFilters.estado || 'Todos');
    const [unidade, setUnidade] = useState(initialFilters.unidade || 'Todas');
    const popoverRef = React.useRef<HTMLDivElement>(null);

    const estadosUnicos = useMemo(() => ['Todos', ...Array.from(new Set(empreendimentos.map(e => e.estado).filter(Boolean)))], [empreendimentos]);
    const unidadesUnicas = useMemo(() => ['Todos', ...Array.from(new Set(empreendimentos.map(e => e.unidade).filter(Boolean)))], [empreendimentos]);

    const handleApply = () => {
        onApplyFilters({ estado, unidade });
        setIsOpen(false);
    };

    const handleClear = () => {
        setEstado('Todos');
        setUnidade('Todas');
        onApplyFilters({ estado: 'Todos', unidade: 'Todas' });
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
                    position: 'absolute', top: '100%', right: 0, marginTop: '8px', width: '300px',
                    backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                    border: '1px solid var(--gcs-border-color)', zIndex: 100, padding: '1rem'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h4 style={{ margin: 0, color: 'var(--gcs-blue)' }}>Filtros Avançados</h4>
                        <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} color="var(--gcs-gray-dark)" /></button>
                    </div>
                    <div style={{ marginBottom: '1rem' }}>
                        <label className="modal-label">Estado</label>
                        <select value={estado} onChange={(e) => setEstado(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--gcs-border-color)' }}>
                            {estadosUnicos.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                    </div>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label className="modal-label">Unidade</label>
                        <select value={unidade} onChange={(e) => setUnidade(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--gcs-border-color)' }}>
                            {unidadesUnicas.map(r => <option key={r} value={r}>{r}</option>)}
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
  return (
    <g>
      <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 8} startAngle={startAngle} endAngle={endAngle} fill={fill}/>
    </g>
  );
};

export default function AgrogestorPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [authStatus, setAuthStatus] = useState<'loading' | 'authorized' | 'unauthorized'>('loading');
  const [empreendimentos, setEmpreendimentos] = useState<EmpreendimentoCompleto[]>([]);
  const [busca, setBusca] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [advancedFilters, setAdvancedFilters] = useState({ estado: 'Todos', unidade: 'Todas' });
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'delete'>('add');
  const [currentEmpreendimento, setCurrentEmpreendimento] = useState<EmpreendimentoCompleto | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // ===================== NOVO ESTADO PARA O MODAL DE NOTIFICAÇÃO =====================
  const [notification, setNotification] = useState<{ visible: boolean; type: 'success' | 'error'; message: string }>({
    visible: false,
    type: 'success',
    message: '',
  });
  // =================================================================================

  useEffect(() => {
    if (status === 'loading') {
      setAuthStatus('loading');
      return;
    }
    if (status === 'authenticated') {
      const user = session.user;
      const hasAccess = user?.is_admin === true || user?.funcoes?.includes('agrogestor.empreendimentos');
      
      if (hasAccess) {
        setAuthStatus('authorized');
        fetchEmpreendimentos();
      } else {
        setAuthStatus('unauthorized');
      }
    } else {
        router.push('/login');
    }
  }, [status, session, router]);

  const fetchEmpreendimentos = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/agrogestor/consulta-empreendimento', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
        
        if (!response.ok) {
          throw new Error('Falha ao buscar dados dos empreendimentos.');
        }

        const data: EmpreendimentoCompleto[] = await response.json();
        const empreendimentosComChave = data.map(emp => ({ ...emp, key: emp.id.toString() }));
        setEmpreendimentos(empreendimentosComChave);

      } catch (error: any) {
        console.error("Erro ao buscar os empreendimentos:", error);
        setEmpreendimentos([]);
        // Substituindo o alert()
        setNotification({ visible: true, type: 'error', message: error.message || "Não foi possível carregar os empreendimentos." });
      } finally {
        setLoading(false);
      }
    };

  const kpiData = useMemo(() => {
    const totalEmpreendimentos = empreendimentos.length;
    const totalDocsAlerta = 0;
    return { totalEmpreendimentos, totalDocsAlerta };
  }, [empreendimentos]);

  const dadosGraficoEstados = useMemo(() => {
    const counts: Record<string, number> = {};
    empreendimentos.forEach(emp => {
      if(emp.estado) {
        counts[emp.estado] = (counts[emp.estado] || 0) + 1;
      }
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [empreendimentos]);

  const coresGrafico = ["#00314A", "#5FB246", "#F58220", "#007bff", "#6c757d"];

  const empreendimentosFiltrados = useMemo(() => {
    let dadosFiltrados = [...(empreendimentos || [])];
    if (busca) {
        const termo = busca.toLowerCase();
        dadosFiltrados = dadosFiltrados.filter(emp => 
            (emp.nome?.toLowerCase() ?? '').includes(termo) ||
            (emp.cnpj_cpf ?? '').includes(termo)
        );
    }
    if (advancedFilters.estado && advancedFilters.estado !== 'Todos') {
        dadosFiltrados = dadosFiltrados.filter(emp => emp.estado === advancedFilters.estado);
    }
    if (advancedFilters.unidade && advancedFilters.unidade !== 'Todas') {
        dadosFiltrados = dadosFiltrados.filter(emp => emp.unidade === advancedFilters.unidade);
    }
    return dadosFiltrados;
  }, [empreendimentos, busca, advancedFilters]);

  const handleExportXLSX = () => {
    const headers = ["ID", "Empreendimento", "Matrícula", "CPF/CNPJ", "Unidade", "Estado"];
    const data = empreendimentosFiltrados.map(emp => [
        emp.id, emp.nome, emp.numero_matricula, emp.cnpj_cpf, emp.unidade, emp.estado
    ]);
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
    worksheet['!cols'] = [ { wch: 5 }, { wch: 60 }, { wch: 20 }, { wch: 20 }, { wch: 25 }, { wch: 15 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Empreendimentos");
    XLSX.writeFile(workbook, "Agrogestor_Empreendimentos.xlsx");
  };

  const handleOpenModal = (mode: 'add' | 'edit' | 'delete', empreendimento: EmpreendimentoCompleto | null = null) => {
    setModalMode(mode);
    setCurrentEmpreendimento(empreendimento);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentEmpreendimento(null);
  };

  // ===================== FUNÇÃO DE SALVAR ATUALIZADA PARA USAR O NOVO MODAL =====================
  const handleSaveEmpreendimento = async (data: Partial<Empreendimento>, mode: 'add' | 'edit' | 'delete') => {
      setIsSaving(true);
      try {
        let endpoint = '';
        let body = {};
        switch (mode) {
          case 'add':
            endpoint = '/api/agrogestor/inclui-empreendimento';
            body = data;
            break;
          case 'edit':
            endpoint = '/api/agrogestor/altera-empreendimento';
            body = data;
            break;
          case 'delete':
            endpoint = '/api/agrogestor/exclui-empreendimento';
            body = { id: data.id };
            break;
        }

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        const result = await response.json();
        const isSuccess = response.ok && Array.isArray(result) && result.length > 0 && result[0].status === 'ok';

        if (isSuccess) {
            handleCloseModal();
            setNotification({ visible: true, type: 'success', message: result[0].message || "Operação realizada com sucesso!" });
            fetchEmpreendimentos();
        } else {
            const errorMessage = result?.message || (Array.isArray(result) && result[0]?.message) || `Ocorreu um erro na operação.`;
            throw new Error(errorMessage);
        }
      } catch (error: any) {
        handleCloseModal(); // Fecha o modal de edição/inclusão
        setNotification({ visible: true, type: 'error', message: `Falha na operação: ${error.message}` });
      } finally {
        setIsSaving(false);
      }
  };
  // =================================================================================================

  const columns = [
    { title: "ID", dataIndex: "id", key: "id", width: 80, sorter: (a: Empreendimento, b: Empreendimento) => a.id - b.id },
    { title: "Empreendimento", dataIndex: "nome", key: "nome", sorter: (a: Empreendimento, b: Empreendimento) => a.nome.localeCompare(b.nome) },
    { title: "Matrícula", dataIndex: "numero_matricula", key: "numero_matricula", width: 150 },
    { title: "CPF / CNPJ", dataIndex: "cnpj_cpf", key: "cnpj_cpf", width: 200 },
    { title: "Unidade / Estado", key: "unidade_estado", width: 250, render: (_:any, record: Empreendimento) => `${record.unidade}, ${record.estado}` },
    {
      title: "Ações",
      key: "action",
      align: "center" as const,
      width: 120,
      render: (_: any, record: EmpreendimentoCompleto) => (
        <Space size="middle">
          <Tooltip title="Alterar / Detalhes">
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
        :root { 
            --gcs-blue: #00314A; --gcs-green: #5FB246; --gcs-orange: #F58220;
            --gcs-orange-light: #FDBA74; --gcs-red: #d9534f; --gcs-red-light: #ff6f61;
            --gcs-gray-light: #f8f9fa; --gcs-gray-medium: #e9ecef; --gcs-gray-dark: #6c757d; 
            --gcs-border-color: #dee2e6; 
        }
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
            <h4 style={{ margin: 0, color: 'var(--gcs-gray-dark)', fontWeight: 500, fontSize: '1rem' }}>Empreendimentos por Estado</h4>
            <div style={{ width: 280, height: 160 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie activeIndex={activeIndex} activeShape={renderActiveShape} data={dadosGraficoEstados} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={3} onMouseEnter={(_, index) => setActiveIndex(index)} onMouseLeave={() => setActiveIndex(null)}>
                            {dadosGraficoEstados.map((entry, index) => (<Cell key={`cell-${index}`} fill={coresGrafico[index % coresGrafico.length]} />))}
                        </Pie>
                        <Legend layout="horizontal" align="center" verticalAlign="bottom" iconSize={10} wrapperStyle={{ fontSize: '12px' }}/>
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
        
        <div className="main-content-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '1.5rem', paddingTop: '0.5rem', paddingBottom: '0.5rem' }}>
            <h2 className="page-title" style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold', color: 'var(--gcs-blue)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <FolderArchive size={32} color="var(--gcs-blue)" />
                <span>Cadastro de Empreendimentos</span>
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <Input
                      placeholder="Buscar por nome ou CNPJ/CPF..."
                      value={busca}
                      onChange={(e) => setBusca(e.target.value)}
                      className="search-input"
                      style={{ padding: "12px 16px", fontSize: "1rem", borderRadius: "8px", border: "1px solid var(--gcs-border-color)", width: "350px" }}
                  />
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={fetchEmpreendimentos} title="Atualizar Lista" className="btn btn-outline-gray" style={{padding: '9px'}}> <RefreshCcw size={20} /> </button>
                    <FilterPopover empreendimentos={empreendimentos} onApplyFilters={setAdvancedFilters} initialFilters={advancedFilters} />
                    <button onClick={handleExportXLSX} title="Exportar para Excel" className="btn btn-outline-blue" style={{padding: '9px'}}> <FileDown size={20} /> </button>
                </div>
            </div>
        </div>

        <div className="kpi-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-around' }}>
            <div style={{ textAlign: 'center' }}>
                <h4 style={{ color: 'var(--gcs-gray-dark)', margin: 0, fontWeight: 500, fontSize: '1rem', marginBottom: '0.25rem' }}>Empreendimentos</h4>
                <p style={{ fontSize: '2.2rem', margin: 0, color: 'var(--gcs-blue)', fontWeight: 'bold', lineHeight: 1.2 }}>{kpiData.totalEmpreendimentos}</p>
            </div>
            <hr style={{ width: '80%', border: 'none', borderTop: '1px solid var(--gcs-border-color)', margin: '0.5rem 0' }} />
            <div style={{ textAlign: 'center' }}>
                <h4 style={{ color: 'var(--gcs-gray-dark)', margin: 0, fontWeight: 500, fontSize: '1rem', marginBottom: '0.25rem' }}>Docs em Alerta</h4>
                <p style={{ fontSize: '2.2rem', margin: 0, color: 'var(--gcs-orange)', fontWeight: 'bold', lineHeight: 1.2 }}>{kpiData.totalDocsAlerta}</p>
            </div>
        </div>
      </div>

      <div className="content-card">
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
            <h3 style={{margin: 0, color: 'var(--gcs-blue)'}}>Lista de Empreendimentos</h3>
            <Button type="primary" className="btn-incluir" icon={<PlusOutlined />} onClick={() => handleOpenModal('add')}>
                  Incluir Novo Empreendimento
            </Button>
        </div>
        {loading ? ( <LoadingSpinner text="Carregando empreendimentos..." /> ) : (
            <Table
                columns={columns}
                dataSource={empreendimentosFiltrados}
                pagination={{ defaultPageSize: 10, showSizeChanger: true, pageSizeOptions: ['10', '20', '50'] }}
                scroll={{ x: 'max-content' }}
            />
        )}
      </div>
    </div>

    <ModalEmpreendimento
        visible={isModalOpen}
        mode={modalMode}
        initialData={currentEmpreendimento}
        onClose={handleCloseModal}
        onSave={handleSaveEmpreendimento}
        isSaving={isSaving}
    />

    {/* Renderiza o modal de notificação */}
    <NotificationModal
      visible={notification.visible}
      type={notification.type}
      message={notification.message}
      onClose={() => setNotification({ ...notification, visible: false })}
    />
  </>);
}