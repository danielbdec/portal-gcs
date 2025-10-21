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
  Ban,
  Loader2,
  AlertTriangle,
  Lock
} from 'lucide-react';
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import * as XLSX from 'xlsx';

const { Title } = Typography;

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
    <div className="main-content-card" style={{ textAlign: 'center', padding: '3rem', maxWidth: '600px', margin: 'auto' }}>
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


// --- INTERFACES ---
interface RegraFiscal {
  id: number;
  key: string;
  operacao: string;
  tes: string;
  cfop_ref_saida: string;
  cst_pis_cof_saida: string[];
  cst_icms_saida: string[];
  icms_st_nf: 'Sim' | 'Não';
  icms_desonerado: 'Sim' | 'Não';
  insumo_direto: 'S' | 'N';
  insumo_indireto: 'S' | 'N';
  insumo_outro: 'S' | 'N';
}

interface TesResult {
    F4_CODIGO: string;
    F4_TEXTO: string;
}


// === COMPONENTE DE MODAL DE CONFIRMAÇÃO ===
const ConfirmationModal = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    recordId,
}: {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    recordId?: number | string | null;
}) => {
    if (!isOpen) return null;
    return (
        <>
            <div onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1004 }}></div>
            <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', backgroundColor: 'white', padding: '2rem', borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.2)', zIndex: 1005, maxWidth: '450px', textAlign: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                    <AlertTriangle size={40} color="#F58220" />
                </div>
                <h3 style={{ marginTop: 0, marginBottom: '1rem', color: '#333' }}>{title}</h3>
                <p style={{ color: '#666', lineHeight: 1.6 }}>{message}</p>
                {recordId && (
                    <p style={{ marginTop: '1rem', fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--gcs-red)', background: '#fff0f0', padding: '8px', borderRadius: '6px' }}>
                        ID do Registro: {recordId}
                    </p>
                )}
                <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                    <button onClick={onClose} className="btn btn-outline-gray">Cancelar</button>
                    <button onClick={onConfirm} className="btn" style={{backgroundColor: '#d9534f', color: 'white'}}>Sim, Excluir</button>
                </div>
            </div>
        </>
    );
};


// === COMPONENTE DO MODAL DE BUSCA DE TES ===
const TesSearchModal = ({
    isOpen,
    onClose,
    onSelect,
    onSearch,
    results,
    isLoading
}: {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (tes: TesResult) => void;
    onSearch: () => void;
    results: TesResult[];
    isLoading: boolean;
}) => {
    if (!isOpen) return null;

    return (
        <>
            <div onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1002 }}></div>
            <div style={{
                position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                zIndex: 1003, width: '90%', maxWidth: '500px', display: 'flex', flexDirection: 'column'
            }}>
                <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--gcs-border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ margin: 0, color: 'var(--gcs-blue)' }}>Buscar TES</h4>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><XIcon size={20} color="var(--gcs-gray-dark)" /></button>
                </div>
                
                <div style={{ minHeight: '150px', maxHeight: '300px', overflowY: 'auto' }}>
                    {results.length > 0 ? (
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                            {results.map((res, index) => (
                                <li key={index} onClick={() => onSelect(res)} className="search-result-item">
                                    <strong>{res.F4_CODIGO}</strong> - <span>{res.F4_TEXTO}</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', height: '150px', color: 'var(--gcs-gray-dark)'}}>
                            Nenhum resultado para exibir.
                        </div>
                    )}
                </div>

                <div style={{ padding: '1.5rem', display: 'flex', justifyContent: 'center', borderTop: '1px solid var(--gcs-border-color)' }}>
                    <button onClick={onSearch} className="btn btn-green" disabled={isLoading}>
                        {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                        {isLoading ? 'Buscando...' : 'Buscar TES com o código informado'}
                    </button>
                </div>
            </div>
        </>
    );
};


// === COMPONENTE DO MODAL DE INCLUSÃO/ALTERAÇÃO/EXCLUSÃO ===
const ModalRegraFiscal = ({
    visible,
    mode,
    initialData,
    onClose,
    onSave,
    isSaving,
}: {
    visible: boolean;
    mode: 'add' | 'edit' | 'delete';
    initialData: Partial<RegraFiscal> | null;
    onClose: () => void;
    onSave: (data: Partial<RegraFiscal>, mode: 'add' | 'edit' | 'delete') => void;
    isSaving: boolean;
}) => {
    const [formData, setFormData] = useState<Partial<RegraFiscal>>({});
    const modalRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    
    const [isTesSearchOpen, setIsTesSearchOpen] = useState(false);
    const [tesResults, setTesResults] = useState<TesResult[]>([]);
    const [isTesLoading, setIsTesLoading] = useState(false);

    useEffect(() => {
        if (visible && initialData) {
            setFormData({
                ...initialData,
                cst_pis_cof_saida: Array.isArray(initialData.cst_pis_cof_saida) ? initialData.cst_pis_cof_saida.join(', ') : '',
                cst_icms_saida: Array.isArray(initialData.cst_icms_saida) ? initialData.cst_icms_saida.join(', ') : ''
            });
        } else if (visible && !initialData) {
            setFormData({
                operacao: '', tes: '', cfop_ref_saida: '', cst_pis_cof_saida: '', cst_icms_saida: '',
                icms_st_nf: 'Não', icms_desonerado: 'Não', insumo_direto: 'N', insumo_indireto: 'N', insumo_outro: 'N'
            });
        }

        if (visible && modalRef.current) {
            const modal = modalRef.current;
            const initialX = (window.innerWidth - modal.offsetWidth) / 2;
            const initialY = 60;
            setPosition({ x: initialX > 0 ? initialX : 20, y: initialY });
        }
    }, [initialData, visible]);

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

    if (!visible) return null;

    const handleMouseDown = (e: React.MouseEvent) => {
      if (modalRef.current) {
          const target = e.target as HTMLElement;
          if(target.id === 'modal-header' || target.parentElement?.id === 'modal-header') {
            setIsDragging(true);
            const modalRect = modalRef.current.getBoundingClientRect();
            setOffset({ x: e.clientX - modalRect.left, y: e.clientY - modalRect.top });
            e.preventDefault();
          }
      }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        let finalValue = value;

        if (name === 'operacao' || name === 'tes') {
            finalValue = value.toUpperCase();
        } else if (name === 'cfop_ref_saida') {
            finalValue = value.replace(/[^0-9]/g, '');
        } else if (name === 'cst_pis_cof_saida' || name === 'cst_icms_saida') {
            finalValue = value.replace(/[^0-9,]/g, '');
        }

        setFormData(prev => ({ ...prev, [name]: finalValue }));
    };
    
    const handleSaveClick = () => {
        if (isSaving) return;
        
        if (mode !== 'delete' && (!formData.operacao || !formData.tes || !formData.cfop_ref_saida)) {
            alert("Os campos 'Operação', 'TES' e 'CFOP Ref. Saída' são obrigatórios.");
            return;
        }

        if (mode !== 'delete' &&
            formData.insumo_direto === 'N' &&
            formData.insumo_indireto === 'N' &&
            formData.insumo_outro === 'N'
        ) {
            alert("Pelo menos um dos campos de Insumo (Direto, Indireto ou Outro) deve ser marcado como 'Sim'.");
            return;
        }

        const dataToSave = {
            ...formData,
            cst_pis_cof_saida: typeof formData.cst_pis_cof_saida === 'string' ? formData.cst_pis_cof_saida.split(',').map(s => s.trim()).filter(Boolean) : [],
            cst_icms_saida: typeof formData.cst_icms_saida === 'string' ? formData.cst_icms_saida.split(',').map(s => s.trim()).filter(Boolean) : []
        };
        onSave(dataToSave, mode);
    };

    const handleTesSearch = async () => {
        if (!formData.tes) {
            alert("Digite um código no campo TES para buscar.");
            return;
        }
        setIsTesLoading(true);
        try {
            const response = await fetch('/api/nfe/nfe-busca-tes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tesCode: formData.tes })
            });
            const data = await response.json();
            if (data && !data.erro) {
                setTesResults(Array.isArray(data) ? data : []);
            } else {
                setTesResults([]);
                alert(data.message || "Nenhum resultado encontrado.");
            }
        } catch (error) {
            console.error("Erro ao buscar TES:", error);
            alert("Falha ao buscar TES. Verifique o console.");
        } finally {
            setIsTesLoading(false);
        }
    };

    const handleSelectTes = (tes: TesResult) => {
        setFormData(prev => ({ ...prev, tes: tes.F4_CODIGO }));
        setIsTesSearchOpen(false);
    };

    const isDeleteMode = mode === 'delete';
    const titles = {
        add: 'Incluir Nova Regra',
        edit: 'Alterar Regra Fiscal',
        delete: 'Confirmar Exclusão'
    };
    
    const getLoadingMessage = () => {
        switch(mode) {
            case 'add': return 'Incluindo Registro...';
            case 'edit': return 'Alterando Registro...';
            case 'delete': return 'Excluindo Registro...';
            default: return 'Processando...';
        }
    };

    return (
        <>
            <div onClick={isSaving ? undefined : onClose} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000 }}></div>
            <div
                ref={modalRef}
                style={{
                    position: 'fixed', top: position.y, left: position.x,
                    backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                    zIndex: 1001, width: '90%', maxWidth: '750px',
                    display: 'flex', flexDirection: 'column'
                }}
            >
                <div id="modal-header" onMouseDown={handleMouseDown} style={{
                    padding: '1rem 1.5rem', borderBottom: '1px solid var(--gcs-border-color)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    cursor: 'move', backgroundColor: '#f1f5fb',
                    borderTopLeftRadius: '12px', borderTopRightRadius: '12px'
                }}>
                    <h3 style={{ margin: 0, color: 'var(--gcs-blue)' }}>{titles[mode]}</h3>
                    <button onClick={isSaving ? undefined : onClose} disabled={isSaving} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}><XIcon size={20} color="var(--gcs-gray-dark)" /></button>
                </div>
                
                <div style={{ padding: '1.5rem' }}>
                    {isDeleteMode && (
                        <p style={{ color: '#333', fontSize: '1.1rem', textAlign: 'center', marginBottom: '1.5rem' }}>
                            Os dados da regra a ser excluída são exibidos abaixo. Esta ação não pode ser desfeita.
                        </p>
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                        { mode !== 'add' && (
                            <div style={{ gridColumn: '1 / 2' }}>
                                <label className="modal-label">ID</label>
                                <input className="modal-input" name="id" value={formData.id || ''} disabled />
                            </div>
                        )}
                        <div style={{ gridColumn: mode !== 'add' ? '2 / -1' : '1 / -1' }}>
                            <label className="modal-label">Operação *</label>
                            <input className="modal-input" name="operacao" value={formData.operacao || ''} onChange={handleInputChange} disabled={isDeleteMode || isSaving} />
                        </div>
                        <div style={{ gridColumn: '1 / 2' }}>
                            <label className="modal-label">TES *</label>
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <input className="modal-input" name="tes" value={formData.tes || ''} onChange={handleInputChange} disabled={isDeleteMode || isSaving} style={{ paddingRight: '40px' }}/>
                                <button onClick={() => { setTesResults([]); setIsTesSearchOpen(true); }} disabled={isDeleteMode || isSaving} title="Buscar TES" style={{ position: 'absolute', right: '5px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gcs-blue)', height: '100%', display: 'flex', alignItems: 'center' }}>
                                    <Search size={18} />
                                </button>
                            </div>
                        </div>
                        <div style={{ gridColumn: '2 / 4' }}>
                            <label className="modal-label">CFOP Ref. Saída *</label>
                            <input className="modal-input" name="cfop_ref_saida" value={formData.cfop_ref_saida || ''} onChange={handleInputChange} disabled={isDeleteMode || isSaving} />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label className="modal-label">CST PIS/COFINS Saída</label>
                            <input className="modal-input" name="cst_pis_cof_saida" value={formData.cst_pis_cof_saida as string || ''} onChange={handleInputChange} disabled={isDeleteMode || isSaving} placeholder="Valores separados por vírgula" />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label className="modal-label">CST ICMS Saída</label>
                            <input className="modal-input" name="cst_icms_saida" value={formData.cst_icms_saida as string || ''} onChange={handleInputChange} disabled={isDeleteMode || isSaving} placeholder="Valores separados por vírgula" />
                        </div>
                        
                        <div>
                            <label className="modal-label">ICMS ST NF</label>
                            <select className="modal-input" name="icms_st_nf" value={formData.icms_st_nf || 'Não'} onChange={handleInputChange} disabled={isDeleteMode || isSaving}>
                                <option value="Sim">Sim</option>
                                <option value="Não">Não</option>
                            </select>
                        </div>
                        <div>
                            <label className="modal-label">ICMS Desonerado</label>
                            <select className="modal-input" name="icms_desonerado" value={formData.icms_desonerado || 'Não'} onChange={handleInputChange} disabled={isDeleteMode || isSaving}>
                                <option value="Sim">Sim</option>
                                <option value="Não">Não</option>
                            </select>
                        </div>
                        <div>
                            <label className="modal-label">Insumo Direto</label>
                            <select className="modal-input" name="insumo_direto" value={formData.insumo_direto || 'N'} onChange={handleInputChange} disabled={isDeleteMode || isSaving}>
                                <option value="S">Sim</option>
                                <option value="N">Não</option>
                            </select>
                        </div>
                        <div>
                            <label className="modal-label">Insumo Indireto</label>
                            <select className="modal-input" name="insumo_indireto" value={formData.insumo_indireto || 'N'} onChange={handleInputChange} disabled={isDeleteMode || isSaving}>
                                <option value="S">Sim</option>
                                <option value="N">Não</option>
                            </select>
                        </div>
                        <div>
                            <label className="modal-label">Insumo Outro</label>
                            <select className="modal-input" name="insumo_outro" value={formData.insumo_outro || 'N'} onChange={handleInputChange} disabled={isDeleteMode || isSaving}>
                                <option value="S">Sim</option>
                                <option value="N">Não</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div style={{ padding: '1.5rem', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem', backgroundColor: '#f8f9fa', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
                    {isSaving ? (
                        <div style={{display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--gcs-blue)', fontWeight: 'bold'}}>
                            <Loader2 size={20} className="animate-spin" />
                            <span>{getLoadingMessage()}</span>
                        </div>
                    ) : (
                        <>
                            <button onClick={onClose} className="btn btn-outline-gray" style={{padding: '8px 16px'}}>
                                <Ban size={16} /> Cancelar
                            </button>
                            {isDeleteMode ? (
                                <button onClick={handleSaveClick} className="btn btn-excluir" style={{ padding: '8px 16px', color: 'white' }}>
                                    <Trash2 size={16} /> Confirmar Exclusão
                                </button>
                            ) : (
                                <button onClick={handleSaveClick} className="btn btn-green" style={{ padding: '8px 16px' }}>
                                    <Save size={16} /> Salvar
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>
            
            <TesSearchModal
                isOpen={isTesSearchOpen}
                onClose={() => setIsTesSearchOpen(false)}
                onSelect={handleSelectTes}
                onSearch={handleTesSearch}
                results={tesResults}
                isLoading={isTesLoading}
            />
        </>
    );
};

const FilterPopoverRegras = ({ onApplyFilters, initialFilters }: { onApplyFilters: (filters: any) => void, initialFilters: any }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [tes, setTes] = useState(initialFilters.tes || '');
    const [cfop, setCfop] = useState(initialFilters.cfop || '');
    const [cst, setCst] = useState(initialFilters.cst || '');
    const popoverRef = useRef<HTMLDivElement>(null);

    const handleApply = () => {
        onApplyFilters({ tes, cfop, cst });
        setIsOpen(false);
    };

    const handleClear = () => {
        setTes('');
        setCfop('');
        setCst('');
        onApplyFilters({ tes: '', cfop: '', cst: '' });
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
                    position: 'absolute', top: '100%', right: 0, marginTop: '8px', width: '320px',
                    backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                    border: '1px solid var(--gcs-border-color)', zIndex: 100, padding: '1rem'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h4 style={{ margin: 0, color: 'var(--gcs-blue)' }}>Filtros Avançados</h4>
                        <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><XIcon size={18} color="var(--gcs-gray-dark)" /></button>
                    </div>
                    <div style={{ marginBottom: '1rem' }}>
                        <label className="modal-label">TES</label>
                        <input value={tes} onChange={(e) => setTes(e.target.value)} placeholder="Filtrar por TES..." style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--gcs-border-color)' }} />
                    </div>
                    <div style={{ marginBottom: '1rem' }}>
                        <label className="modal-label">CFOP Ref. Saída</label>
                        <input value={cfop} onChange={(e) => setCfop(e.target.value)} placeholder="Filtrar por CFOP..." style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--gcs-border-color)' }} />
                    </div>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label className="modal-label">CST PIS/COFINS Saída</label>
                        <input value={cst} onChange={(e) => setCst(e.target.value)} placeholder="Filtrar por CST..." style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--gcs-border-color)' }} />
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

export default function RegrasFiscaisPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [authStatus, setAuthStatus] = useState<'loading' | 'authorized' | 'unauthorized'>('loading');

  const [regras, setRegras] = useState<RegraFiscal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [advancedFilters, setAdvancedFilters] = useState({ tes: '', cfop: '', cst: '' });
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'delete'>('add');
  const [currentRegra, setCurrentRegra] = useState<RegraFiscal | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);

  // --- GUARDA DE ROTA ---
  useEffect(() => {
    if (status === 'loading') {
      setAuthStatus('loading');
      return;
    }
    if (status === 'authenticated') {
      const user = session.user;
      // Chave de permissão para esta página específica
      const hasAccess = user?.is_admin === true || user?.funcoes?.includes('nfEntrada.regrasFiscais');
      
      if (hasAccess) {
        setAuthStatus('authorized');
        handleSearch(); // Carrega os dados da página apenas se o utilizador for autorizado
      } else {
        setAuthStatus('unauthorized');
      }
    } else {
        router.push('/login'); // Redireciona se não estiver autenticado
    }
  }, [status, session, router]);

  const handleSearch = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/nfe/nfe-consulta-regras-fiscais", {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchTerm: "" }),
        cache: 'no-store' // CORREÇÃO DE CACHE
      });
      if (!response.ok) throw new Error(`Erro: ${response.statusText}`);
      const data = await response.json();
      const arrayDeRegras = (Array.isArray(data) ? data : data.regras || []).map((item: any, index: number) => ({
        ...item,
        id: item.id || index + 1,
        key: `regra-${item.id || index + 1}`,
      }));
      setRegras(arrayDeRegras);
    } catch (error) {
      console.error("Erro ao buscar regras fiscais:", error);
      setRegras([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const notasFiltradasOrdenadas = useMemo(() => {
    return (regras || []).filter((regra) => {
      const termoBusca = searchText.toLowerCase();
      const buscaOk = !searchText || regra.operacao.toLowerCase().includes(termoBusca) || regra.tes.toLowerCase().includes(termoBusca) || regra.cfop_ref_saida.toLowerCase().includes(termoBusca);
      const tesOk = !advancedFilters.tes || regra.tes.toLowerCase().includes(advancedFilters.tes.toLowerCase());
      const cfopOk = !advancedFilters.cfop || regra.cfop_ref_saida.toLowerCase().includes(advancedFilters.cfop.toLowerCase());
      const cstOk = !advancedFilters.cst || regra.cst_pis_cof_saida.some(c => c.includes(advancedFilters.cst));
      return buscaOk && tesOk && cfopOk && cstOk;
    });
  }, [regras, searchText, advancedFilters]);
  
  const handleExportXLSX = () => {
    const headers = ["ID", "Operação", "TES", "CFOP Ref. Saída", "ICMS ST", "ICMS Desonerado", "Insumo Direto", "Insumo Indireto", "Insumo Outro", "CST PIS/COFINS Saída", "CST ICMS Saída"];
    const data = notasFiltradasOrdenadas.map(regra => [
        regra.id, regra.operacao, regra.tes, regra.cfop_ref_saida,
        regra.icms_st_nf, regra.icms_desonerado, regra.insumo_direto, regra.insumo_indireto, regra.insumo_outro,
        regra.cst_pis_cof_saida.join(', '), regra.cst_icms_saida.join(', '),
    ]);
    const worksheetData = [headers, ...data];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Regras Fiscais");
    XLSX.writeFile(workbook, "Regras_Fiscais_Filtradas.xlsx");
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
  
  const handleConfirmDelete = async () => {
    setIsConfirmDeleteOpen(false);
    if (!currentRegra || !currentRegra.id) return;

    setIsSaving(true);
    try {
        const response = await fetch('/api/nfe/nfe-exclui-regras-fiscais', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: currentRegra.id }),
        });
        const result = await response.json();
        if (response.ok && Array.isArray(result) && result.length > 0 && result[0].status === 'ok') {
            alert('Regra excluída com sucesso!');
            handleCloseModal();
            handleSearch();
        } else {
            const errorMessage = result?.message || (Array.isArray(result) && result[0]?.message) || 'Falha ao excluir a regra.';
            throw new Error(errorMessage);
        }
    } catch (error) {
        console.error("Erro ao excluir regra:", error);
        alert("Não foi possível excluir a regra nesse momento, tente novamente mais tarde.");
    } finally {
        setIsSaving(false);
    }
  };

  const handleSaveRegra = async (data: Partial<RegraFiscal>, mode: 'add' | 'edit' | 'delete') => {
    if (mode === 'add' || mode === 'edit') {
        setIsSaving(true);
        const endpoint = mode === 'add' ? '/api/nfe/nfe-inclui-regras-fiscais' : '/api/nfe/nfe-altera-regras-fiscais';
        const successMessage = mode === 'add' ? 'Regra incluída com sucesso!' : 'Regra alterada com sucesso!';
        const failureMessage = mode === 'add' ? 'Falha ao incluir a regra.' : 'Falha ao alterar a regra.';
        const genericErrorMessage = `Não foi possível ${mode === 'add' ? 'cadastrar' : 'alterar'} a regra nesse momento, tente novamente mais tarde.`;
        
        const payload = mode === 'edit' ? { ...data, id: currentRegra?.id } : data;

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const result = await response.json();
            if (response.ok && Array.isArray(result) && result.length > 0 && result[0].status === 'ok') {
                alert(successMessage);
                handleCloseModal();
                handleSearch();
            } else {
                const errorMessage = result?.message || (Array.isArray(result) && result[0]?.message) || failureMessage;
                throw new Error(errorMessage);
            }
        } catch (error) {
            console.error(`Erro ao salvar no modo ${mode}:`, error);
            alert(genericErrorMessage);
        } finally {
            setIsSaving(false);
        }
    } else if (mode === 'delete') {
        setIsConfirmDeleteOpen(true);
    }
  };

  const columns: any[] = [
    { title: "ID", dataIndex: "id", key: "id", width: 80, fixed: 'left' },
    { 
      title: "Operação", 
      dataIndex: "operacao", 
      key: "operacao",
      width: 300,
      render: (text: string) => (
        <Tooltip title={text} placement="topLeft">
            <div className="truncate-text">{text}</div>
        </Tooltip>
      )
    },
    { title: "TES", dataIndex: "tes", key: "tes", width: 100 },
    { title: "CFOP Ref. Saída", dataIndex: "cfop_ref_saida", key: "cfop_ref_saida", width: 150 },
    { title: "ICMS ST", dataIndex: "icms_st_nf", key: "icms_st_nf", width: 100 },
    { title: "ICMS Deson.", dataIndex: "icms_desonerado", key: "icms_desonerado", width: 120 },
    { title: "Ins. Direto", dataIndex: "insumo_direto", key: "insumo_direto", width: 120 },
    { title: "Ins. Indireto", dataIndex: "insumo_indireto", key: "insumo_indireto", width: 120 },
    { title: "Ins. Outro", dataIndex: "insumo_outro", key: "insumo_outro", width: 120 },
    {
      title: "Ações",
      key: "action",
      align: "center" as const,
      fixed: 'right',
      width: 100,
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

  // Se a sessão ainda está a carregar, mostra um spinner
  if (authStatus === 'loading') {
    return (
        <div className="page-container">
            <LoadingSpinner text="A verificar permissões..." />
        </div>
    );
  }

  // Se o utilizador não está autorizado, mostra a página de acesso negado
  if (authStatus === 'unauthorized') {
    return (
        <div className="page-container">
            <AcessoNegado />
        </div>
    );
  }

  return (
    <div className="page-container">
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
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .btn { cursor: pointer; font-weight: 600; display: inline-flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s ease-in-out; border: 1px solid transparent; padding: 10px 20px; border-radius: 8px; }
        .btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .btn-green { background-color: var(--gcs-green); color: white; }
        .btn-green:hover:not(:disabled) { background-color: #4a9d3a; }
        
        .btn-outline-gray { background-color: #fff; color: var(--gcs-gray-dark); border-color: var(--gcs-border-color); }
        .btn-outline-blue { background-color: #fff; color: var(--gcs-blue); border-color: var(--gcs-border-color); }
        .btn-outline-gray:hover:not(:disabled) { background-color: var(--gcs-gray-light) !important; border-color: var(--gcs-gray-dark) !important; color: var(--gcs-gray-dark) !important; }
        .btn-outline-blue:hover:not(:disabled) { background-color: #f1f5fb !important; border-color: var(--gcs-blue) !important; color: var(--gcs-blue) !important; }

        .main-content-card {
            background-color: #fff; border-radius: 12px; padding: 1.5rem;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08); border: 1px solid var(--gcs-border-color);
        }
        .modal-label { display: block; margin-bottom: 6px; font-size: 14px; font-weight: 500; color: #333; }
        .modal-input {
            width: 100%; padding: 10px; border-radius: 6px; border: 1px solid var(--gcs-border-color);
            font-size: 1rem; transition: border-color 0.2s, box-shadow 0.2s;
        }
        .modal-input:focus { border-color: var(--gcs-blue); box-shadow: 0 0 0 3px rgba(0, 49, 74, 0.1); outline: none; }
        .modal-input:disabled { background-color: var(--gcs-gray-light); cursor: not-allowed; color: var(--gcs-gray-dark); }
        .search-result-item {
            padding: 12px 15px; cursor: pointer;
            border-bottom: 1px solid var(--gcs-border-color);
            transition: background-color 0.2s ease-in-out;
        }
        .search-result-item:last-child { border-bottom: none; }
        .search-result-item:hover { background-color: #eaf2fa; }
        .animate-spin { animation: spin 1s linear infinite; }
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
                      <FilterPopoverRegras onApplyFilters={setAdvancedFilters} initialFilters={advancedFilters} />
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
            pagination={{ defaultPageSize: 10, showSizeChanger: false }}
            scroll={{ x: 1800 }}
          />
        </div>
      )}

      <ModalRegraFiscal 
        visible={isModalOpen}
        mode={modalMode}
        initialData={currentRegra}
        onClose={handleCloseModal}
        onSave={handleSaveRegra}
        isSaving={isSaving}
      />
      
      <ConfirmationModal
        isOpen={isConfirmDeleteOpen}
        onClose={() => setIsConfirmDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Confirmar Exclusão"
        message="Você tem certeza que deseja excluir esta regra permanentemente? Esta ação não poderá ser desfeita."
        recordId={currentRegra?.id}
      />

      <style jsx global>{`
        .page-container { background-color: #f0f2f5; padding: 24px; }
        .table-section { background: #fff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.09); padding: 24px; }
        .table-header-controls { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
        .table-section-title { margin: 0 !important; display: flex; align-items: center; gap: 10px; }
        .ant-table-thead > tr > th { background-color: #00314A !important; color: white !important; font-weight: bold; }
        
        .truncate-text {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 250px;
          display: inline-block;
          vertical-align: middle;
        }

        .ant-pagination-item-active { 
          background-color: var(--gcs-blue) !important; 
          border-color: var(--gcs-blue) !important; 
        }
        .ant-pagination-item-active a { 
          color: white !important; 
        }
        
        .custom-tag { background-color: #e6f7ff !important; border-color: #91d5ff !important; color: #096dd9 !important; }

        .btn-incluir { 
          background: var(--gcs-green) !important;
          border-color: var(--gcs-green) !important;
        }
        .btn-incluir:hover {
          background: #4a9d3a !important;
          border-color: #4a9d3a !important;
        }

        .btn-alterar {
            color: white !important;
            border: none !important;
            background-image: linear-gradient(135deg, var(--gcs-orange), var(--gcs-orange-light)) !important;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }
        .btn-excluir { 
            color: white !important;
            border: none !important;
            background-image: linear-gradient(135deg, var(--gcs-red), var(--gcs-red-light)) !important;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }
        .btn-alterar:hover, .btn-excluir:hover {
            opacity: 0.9;
            transform: translateY(-1px);
        }
      `}</style>
    </div>
  );
}
