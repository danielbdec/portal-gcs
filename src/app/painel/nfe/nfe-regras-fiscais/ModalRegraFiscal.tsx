"use client";

import { Table, Button, Space, Tag, Input, Typography, Tooltip } from "antd";
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined,
} from "@ant-design/icons";
import { 
  FileText,
  Search,
  RefreshCcw,
  Filter,
  FileDown,
  X as XIcon,
  Save,
  Trash2,
  Ban
} from 'lucide-react';
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import * as XLSX from 'xlsx';

const { Title } = Typography;

// Interface para a tipagem da regra fiscal
interface RegraFiscal {
  key: string;
  operacao: string;
  tes: string;
  cfop_ref_saida: string;
  cst_pis_cof_saida: string[];
  cst_icms_saida: string[];
}

// === NOVO MODAL SEGUINDO O PADRÃO VISUAL DO ModalDetalhes.tsx ===
const ModalRegraFiscal = ({
    visible,
    mode,
    initialData,
    onClose,
    onSave,
}: {
    visible: boolean;
    mode: 'add' | 'edit' | 'delete';
    initialData: Partial<RegraFiscal> | null;
    onClose: () => void;
    onSave: (data: Partial<RegraFiscal>, mode: 'add' | 'edit' | 'delete') => void;
}) => {
    const [formData, setFormData] = useState<Partial<RegraFiscal>>({});
    
    // Hooks para a funcionalidade de arrastar o modal
    const modalRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);

    useEffect(() => {
        if (visible && initialData) {
            setFormData({
                ...initialData,
                cst_pis_cof_saida: Array.isArray(initialData.cst_pis_cof_saida) ? initialData.cst_pis_cof_saida.join(', ') : '',
                cst_icms_saida: Array.isArray(initialData.cst_icms_saida) ? initialData.cst_icms_saida.join(', ') : ''
            });
        } else if (visible && !initialData) {
            setFormData({
                operacao: '', tes: '', cfop_ref_saida: '', cst_pis_cof_saida: '', cst_icms_saida: ''
            });
        }

        // Centraliza o modal ao abrir
        if (visible && modalRef.current) {
            const modal = modalRef.current;
            const initialX = (window.innerWidth - modal.offsetWidth) / 2;
            const initialY = 60; // Posição fixa no topo
            setPosition({ x: initialX > 0 ? initialX : 20, y: initialY });
        }
    }, [initialData, visible]);

    if (!visible) return null;

    // Funções para arrastar o modal
    const handleMouseDown = (e: React.MouseEvent) => {
      if (modalRef.current) {
          const target = e.target as HTMLElement;
          // Permite arrastar apenas pelo cabeçalho
          if(target.id === 'modal-header' || target.parentElement?.id === 'modal-header') {
            setIsDragging(true);
            const modalRect = modalRef.current.getBoundingClientRect();
            setOffset({ x: e.clientX - modalRect.left, y: e.clientY - modalRect.top });
            e.preventDefault();
          }
      }
    };
  
    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isDragging) return;
        setPosition({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    }, [isDragging, offset]);
  
    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);
  
    useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, handleMouseMove, handleMouseUp]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    
    const handleSaveClick = () => {
        const dataToSave = {
            ...formData,
            cst_pis_cof_saida: typeof formData.cst_pis_cof_saida === 'string' ? formData.cst_pis_cof_saida.split(',').map(s => s.trim()).filter(Boolean) : [],
            cst_icms_saida: typeof formData.cst_icms_saida === 'string' ? formData.cst_icms_saida.split(',').map(s => s.trim()).filter(Boolean) : []
        };
        onSave(dataToSave, mode);
    };

    const isDeleteMode = mode === 'delete';
    const titles = {
        add: 'Incluir Nova Regra',
        edit: 'Alterar Regra Fiscal',
        delete: 'Confirmar Exclusão'
    };

    return (
        <>
            <div onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000 }}></div>
            <div
                ref={modalRef}
                style={{
                    position: 'fixed', top: position.y, left: position.x,
                    backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                    zIndex: 1001, width: '90%', maxWidth: '600px',
                    display: 'flex', flexDirection: 'column'
                }}
            >
                <div
                    id="modal-header"
                    onMouseDown={handleMouseDown}
                    style={{
                        padding: '1rem 1.5rem', borderBottom: '1px solid var(--gcs-border-color)',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        cursor: 'move', backgroundColor: '#f1f5fb',
                        borderTopLeftRadius: '12px', borderTopRightRadius: '12px'
                    }}
                >
                    <h3 style={{ margin: 0, color: 'var(--gcs-blue)' }}>{titles[mode]}</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}><XIcon size={20} color="var(--gcs-gray-dark)" /></button>
                </div>
                
                <div style={{ padding: '1.5rem' }}>
                    {isDeleteMode && (
                        <p style={{ color: '#333', fontSize: '1.1rem', textAlign: 'center', marginBottom: '1.5rem' }}>
                            Você tem certeza que deseja excluir esta regra? Esta ação não pode ser desfeita.
                        </p>
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label className="modal-label">Operação</label>
                            <input className="modal-input" name="operacao" value={formData.operacao || ''} onChange={handleInputChange} disabled={isDeleteMode} />
                        </div>
                        <div>
                            <label className="modal-label">TES</label>
                            <input className="modal-input" name="tes" value={formData.tes || ''} onChange={handleInputChange} disabled={isDeleteMode} />
                        </div>
                        <div>
                            <label className="modal-label">CFOP Ref. Saída</label>
                            <input className="modal-input" name="cfop_ref_saida" value={formData.cfop_ref_saida || ''} onChange={handleInputChange} disabled={isDeleteMode} />
                        </div>
                        <div>
                            <label className="modal-label">CST PIS/COFINS Saída</label>
                            <input className="modal-input" name="cst_pis_cof_saida" value={formData.cst_pis_cof_saida as string || ''} onChange={handleInputChange} disabled={isDeleteMode} placeholder="Valores separados por vírgula" />
                        </div>
                        <div>
                            <label className="modal-label">CST ICMS Saída</label>
                            <input className="modal-input" name="cst_icms_saida" value={formData.cst_icms_saida as string || ''} onChange={handleInputChange} disabled={isDeleteMode} placeholder="Valores separados por vírgula" />
                        </div>
                    </div>
                </div>

                <div style={{ padding: '1.5rem', borderTop: '1px solid var(--gcs-border-color)', display: 'flex', justifyContent: 'flex-end', gap: '1rem', backgroundColor: '#f8f9fa', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
                    <button onClick={onClose} className="btn btn-outline-gray" style={{padding: '8px 16px'}}>
                        <Ban size={16} /> Cancelar
                    </button>
                    {isDeleteMode ? (
                        <button onClick={handleSaveClick} className="btn" style={{ padding: '8px 16px', backgroundColor: '#dc3545', color: 'white' }}>
                            <Trash2 size={16} /> Confirmar Exclusão
                        </button>
                    ) : (
                        <button onClick={handleSaveClick} className="btn btn-green" style={{ padding: '8px 16px' }}>
                            <Save size={16} /> Salvar
                        </button>
                    )}
                </div>
            </div>
        </>
    );
};

// === COMPONENTE DO FILTRO AVANÇADO ===
const FilterPopoverRegras = ({ onApplyFilters, initialFilters }: { onApplyFilters: (filters: any) => void, initialFilters: any }) => {
    // ... (Código do FilterPopoverRegras permanece o mesmo)
};

export default function RegrasFiscaisPage() {
  const [regras, setRegras] = useState<RegraFiscal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [advancedFilters, setAdvancedFilters] = useState({ tes: '', cfop: '', cst: '' });
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'delete'>('add');
  const [currentRegra, setCurrentRegra] = useState<RegraFiscal | null>(null);

  const handleSearch = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/nfe/nfe-consulta-regras-fiscais", {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchTerm: "" }),
      });

      if (!response.ok) throw new Error(`Erro: ${response.statusText}`);
      
      const data = await response.json();
      const arrayDeRegras = Array.isArray(data) ? data : data.regras || [];
      const dataWithKeys = arrayDeRegras.map((item: Omit<RegraFiscal, 'key'>, index: number) => ({
        ...item,
        key: `regra-${index}`,
      }));
      setRegras(dataWithKeys);
    } catch (error) {
      console.error("Erro ao buscar regras fiscais:", error);
      setRegras([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    handleSearch();
  }, [handleSearch]);

  const notasFiltradasOrdenadas = useMemo(() => {
    return (regras || []).filter((regra) => {
      const termoBusca = searchText.toLowerCase();
      
      const buscaOk =
        !searchText ||
        regra.operacao.toLowerCase().includes(termoBusca) ||
        regra.tes.toLowerCase().includes(termoBusca) ||
        regra.cfop_ref_saida.toLowerCase().includes(termoBusca);

      const tesOk = !advancedFilters.tes || regra.tes.toLowerCase().includes(advancedFilters.tes.toLowerCase());
      const cfopOk = !advancedFilters.cfop || regra.cfop_ref_saida.toLowerCase().includes(advancedFilters.cfop.toLowerCase());
      const cstOk = !advancedFilters.cst || regra.cst_pis_cof_saida.some(c => c.includes(advancedFilters.cst));

      return buscaOk && tesOk && cfopOk && cstOk;
    });
  }, [regras, searchText, advancedFilters]);
  
  const handleExportXLSX = () => {
    // ... (handleExportXLSX permanece o mesmo)
  };

  const handleOpenModal = (mode: 'add' | 'edit' | 'delete', regra: RegraFiscal | null = null) => {
    setModalMode(mode);
    setCurrentRegra(regra);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentRegra(null);
  };

  const handleSaveRegra = (data: Partial<RegraFiscal>, mode: 'add' | 'edit' | 'delete') => {
    console.log("MODO:", mode);
    console.log("DADOS PARA SALVAR:", data);
    
    if (mode === 'add') {
        console.log("Ação: SIMULAR CRIAÇÃO DE NOVA REGRA");
    } else if (mode === 'edit') {
        console.log("Ação: SIMULAR ATUALIZAÇÃO DA REGRA COM CHAVE:", currentRegra?.key);
    } else if (mode === 'delete') {
        console.log("Ação: SIMULAR EXCLUSÃO DA REGRA COM CHAVE:", currentRegra?.key);
    }
    
    handleCloseModal();
    setTimeout(() => {
      handleSearch();
    }, 500);
  };

  const columns = [
    { title: "Operação", dataIndex: "operacao", key: "operacao" },
    { title: "TES", dataIndex: "tes", key: "tes" },
    { title: "CFOP Ref. Saída", dataIndex: "cfop_ref_saida", key: "cfop_ref_saida" },
    { title: "CST PIS/COFINS Saída", dataIndex: "cst_pis_cof_saida", key: "cst_pis_cof_saida", render: (tags: string[]) => tags?.map(tag => <Tag className="custom-tag" key={tag}>{tag}</Tag>) },
    { title: "CST ICMS Saída", dataIndex: "cst_icms_saida", key: "cst_icms_saida", render: (tags: string[]) => tags?.map(tag => <Tag className="custom-tag" key={tag}>{tag}</Tag>) },
    {
      title: "Ações",
      key: "action",
      align: "center" as const,
      render: (_: any, record: RegraFiscal) => (
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

  return (
    <div className="page-container">
      <style>{`
        :root {
            --gcs-blue: #00314A;
            --gcs-green: #5FB246;
            --gcs-gray-light: #f8f9fa;
            --gcs-gray-medium: #e9ecef;
            --gcs-gray-dark: #6c757d;
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
        .main-content-card {
            background-color: #fff;
            border-radius: 12px;
            padding: 1.5rem;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
            border: 1px solid var(--gcs-border-color);
        }
        .modal-label {
            display: block; margin-bottom: 6px; font-size: 14px;
            font-weight: 500; color: #333;
        }
        .modal-input {
            width: 100%; padding: 10px; border-radius: 6px;
            border: 1px solid var(--gcs-border-color); font-size: 1rem;
            transition: border-color 0.2s, box-shadow 0.2s;
        }
        .modal-input:focus {
            border-color: var(--gcs-blue);
            box-shadow: 0 0 0 3px rgba(0, 49, 74, 0.1);
            outline: none;
        }
        .modal-input:disabled {
            background-color: var(--gcs-gray-light);
            cursor: not-allowed;
            color: var(--gcs-gray-dark);
        }
      `}</style>
      
      <div className="main-content-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '1.5rem', marginBottom: '24px' }}>
          <h2 className="page-title" style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold', color: 'var(--gcs-blue)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <FileText size={32} />
              <span>Regras Fiscais</span>
          </h2>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '1rem' }}>
                  <Input
                      placeholder="Buscar por Operação, TES ou CFOP..."
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      className="search-input"
                      style={{ padding: "12px 16px", fontSize: "1rem", borderRadius: "8px", border: "1px solid var(--gcs-border-color)", width: "350px" }}
                  />
                  <button className="btn btn-green" style={{cursor: 'default'}}>
                      <Search size={18} /> Pesquisar
                  </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                      <button onClick={handleSearch} title="Atualizar Regras" className="btn btn-outline-gray" style={{padding: '9px'}}>
                          <RefreshCcw size={20} />
                      </button>
                      <FilterPopoverRegras
                          onApplyFilters={setAdvancedFilters}
                          initialFilters={advancedFilters}
                      />
                      <button onClick={handleExportXLSX} title="Exportar para Excel" className="btn btn-outline-blue" style={{padding: '9px'}}>
                          <FileDown size={20} />
                      </button>
                  </div>
                  <div style={{ height: 'auto', marginTop: '0.25rem' }}>
                    <span style={{ color: 'var(--gcs-gray-dark)', fontSize: '12px', fontStyle: 'italic' }}>
                        Atualizado agora mesmo
                    </span>
                  </div>
              </div>
          </div>
      </div>
      
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4rem 2rem', backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)' }}>
          <div style={{ width: '40px', height: '40px', border: '4px solid var(--gcs-gray-medium)', borderTop: '4px solid var(--gcs-blue)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <div style={{ marginTop: '1.5rem', fontWeight: 'bold', color: 'var(--gcs-blue)', fontSize: '1.1rem' }}>
            Carregando as regras Fiscais, aguarde
          </div>
        </div>
      ) : (
        <div className="table-section">
          <div className="table-header-controls">
              <Title level={5} className="table-section-title">
                  <FileText />
                  Listagem de Regras
              </Title>
              <Button type="primary" className="btn-incluir" icon={<PlusOutlined />} onClick={() => handleOpenModal('add')}>
                  Incluir Nova Regra
              </Button>
          </div>
          <Table 
            columns={columns} 
            dataSource={notasFiltradasOrdenadas}
            pagination={{ pageSize: 10 }}
            scroll={{ x: 'max-content' }}
          />
        </div>
      )}

      <ModalRegraFiscal 
        visible={isModalOpen}
        mode={modalMode}
        initialData={currentRegra}
        onClose={handleCloseModal}
        onSave={handleSaveRegra}
      />

      <style jsx global>{`
        .page-container { 
          background-color: #f0f2f5; 
          padding: 24px; 
        }
        .table-section { 
          background: #fff; 
          border-radius: 8px; 
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.09); 
          padding: 24px; 
        }
        .table-header-controls { 
          display: flex; 
          justify-content: space-between; 
          align-items: center; 
          margin-bottom: 24px; 
        }
        .table-section-title {
          margin: 0 !important;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .ant-table-thead > tr > th { 
          background-color: #00314A !important; 
          color: white !important; 
          font-weight: bold; 
        }
        .btn-incluir { 
          background-color: #1677ff !important; 
        }
        .btn-alterar { 
          background-color: #F58220 !important; border: none !important;
        }
        .btn-excluir { 
          background-color: #d9534f !important; border: none !important;
        }
        .custom-tag { 
          background-color: #e6f7ff !important; border-color: #91d5ff !important; color: #096dd9 !important; 
        }
      `}</style>
    </div>
  );
}