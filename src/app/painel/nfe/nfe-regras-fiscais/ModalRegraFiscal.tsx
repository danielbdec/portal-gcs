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
                // CORREÇÃO: Cast 'as any' permite atribuir a string formatada ao estado que espera array
                cst_pis_cof_saida: (Array.isArray(initialData.cst_pis_cof_saida) ? initialData.cst_pis_cof_saida.join(', ') : '') as any,
                cst_icms_saida: (Array.isArray(initialData.cst_icms_saida) ? initialData.cst_icms_saida.join(', ') : '') as any
            });
        } else if (visible && !initialData) {
            setFormData({
                operacao: '', 
                tes: '', 
                cfop_ref_saida: '', 
                // CORREÇÃO: Inicialização vazia com cast
                cst_pis_cof_saida: '' as any, 
                cst_icms_saida: '' as any
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

    // --- CORREÇÃO: Hooks movidos para ANTES do return condicional ---
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
    // ----------------------------------------------------------------

    // Verificação de visibilidade movida para cá (após os hooks)
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

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    
    const handleSaveClick = () => {
        // CORREÇÃO: Cast 'as any' para permitir o split(), já que o TS acha que é um array
        const pisValue = formData.cst_pis_cof_saida as unknown as string;
        const icmsValue = formData.cst_icms_saida as unknown as string;

        const dataToSave = {
            ...formData,
            // Converte a string de volta para array ao salvar
            cst_pis_cof_saida: typeof pisValue === 'string' ? pisValue.split(',').map(s => s.trim()).filter(Boolean) : [],
            cst_icms_saida: typeof icmsValue === 'string' ? icmsValue.split(',').map(s => s.trim()).filter(Boolean) : []
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
                            {/* Cast para any no value para evitar erro de tipo ao renderizar string */}
                            <input className="modal-input" name="cst_pis_cof_saida" value={formData.cst_pis_cof_saida as any || ''} onChange={handleInputChange} disabled={isDeleteMode} placeholder="Valores separados por vírgula" />
                        </div>
                        <div>
                            <label className="modal-label">CST ICMS Saída</label>
                            {/* Cast para any no value para evitar erro de tipo ao renderizar string */}
                            <input className="modal-input" name="cst_icms_saida" value={formData.cst_icms_saida as any || ''} onChange={handleInputChange} disabled={isDeleteMode} placeholder="Valores separados por vírgula" />
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

export default ModalRegraFiscal;