"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { 
  X as XIcon,
  Save,
  Trash2,
  Ban,
  Loader2,
  AlertTriangle,
  FileText, // Ícone para o campo de documento
} from 'lucide-react';
import React from "react";

// --- INTERFACE ATUALIZADA ---
export interface Condicionante {
  id: number;
  documento: string; // código do documento (ex: 'ada', 'car')
  nome: string;
  status: string; // 'A' para Ativo, 'I' para Inativo
}

// --- LISTA DE DOCUMENTOS COM CÓDIGOS E LABELS ---
const tiposDeDocumento = [
    { code: '', label: 'Selecione um documento...' },
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

// ===================== COMPONENTE DO FORMULÁRIO ATUALIZADO =====================
const FormFields = ({ formData, disabled, handleInputChange }: {
    formData: Partial<Condicionante>;
    disabled: boolean;
    handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
}) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', alignItems: 'flex-end' }}>
        <div style={{ gridColumn: '1 / 2' }}>
            <label className="modal-label">Documento *</label>
            <select
                className="modal-input"
                name="documento"
                value={formData.documento || ''}
                onChange={handleInputChange}
                disabled={disabled}
            >
                {tiposDeDocumento.map(doc => (
                    <option key={doc.code} value={doc.code}>
                        {doc.label}
                    </option>
                ))}
            </select>
        </div>
        <div style={{ gridColumn: '2 / 3' }}>
            <label className="modal-label">Nome da Condicionante *</label>
            <input 
                className="modal-input" 
                name="nome" 
                value={formData.nome || ''} 
                onChange={handleInputChange} 
                disabled={disabled}
                placeholder="Ex: Obter Licença de Operação"
            />
        </div>
        <div style={{ gridColumn: '3 / 4' }}>
            <label className="modal-label">Status *</label>
            <select 
                className="modal-input" 
                name="status" 
                value={formData.status || ''} 
                onChange={handleInputChange} 
                disabled={disabled}
            >
                <option value="">Selecione...</option>
                <option value="A">Ativo</option>
                <option value="I">Inativo</option>
            </select>
        </div>
    </div>
);
// =================================================================================

const ModalCondicionante = ({
    visible,
    mode,
    initialData,
    onClose,
    onSave,
    isSaving,
}: {
    visible: boolean;
    mode: 'add' | 'edit' | 'delete';
    initialData: Partial<Condicionante> | null;
    onClose: () => void;
    onSave: (data: Partial<Condicionante>, mode: 'add' | 'edit' | 'delete') => void;
    isSaving: boolean;
}) => {
    const [formData, setFormData] = useState<Partial<Condicionante>>({});
    
    // ... (lógica de arrastar o modal - sem alterações)
    const modalRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);

    useEffect(() => {
        if (visible && initialData) {
            setFormData(initialData);
        } else if (visible && !initialData) {
            // Valor inicial para inclusão
            setFormData({
                documento: '',
                nome: '',
                status: 'A', // Padrão 'Ativo'
            });
        }

        if (visible && modalRef.current) {
            const modal = modalRef.current;
            const initialX = (window.innerWidth - modal.offsetWidth) / 2;
            const initialY = 60;
            setPosition({ x: initialX > 0 ? initialX : 20, y: initialY });
        }
    }, [initialData, visible]);
    
    // --- Lógica de arrastar o modal (mantida do original) ---
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
    // --- Fim da lógica de arrastar ---


    if (!visible) return null;

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        const finalValue = name === 'nome' ? value.toUpperCase() : value;
        setFormData(prev => ({ ...prev, [name]: finalValue }));
    };
    
    const handleSaveClick = () => {
        if (isSaving) return;
        
        if (mode === 'add' || mode === 'edit') {
            // VALIDAÇÃO ATUALIZADA
            if (!formData.documento || !formData.nome || !formData.status) {
                alert("Os campos com * são obrigatórios.");
                return;
            }
        }
        
        onSave(formData, mode);
    };

    const isDeleteMode = mode === 'delete';
    const titles = {
        add: 'Incluir Nova Condicionante',
        edit: 'Alterar Condicionante',
        delete: 'Confirmar Exclusão'
    };
    
    const getLoadingMessage = () => {
        switch(mode) {
            case 'add': return 'Incluindo, por favor aguarde...';
            case 'edit': return 'Alterando, por favor aguarde...';
            case 'delete': return 'Excluindo, por favor aguarde...';
            default: return 'Processando, por favor aguarde...';
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
                    zIndex: 1001, width: '90%', maxWidth: '900px', // Largura ajustada
                    display: 'flex', flexDirection: 'column'
                }}
            >
                <div id="modal-header" onMouseDown={handleMouseDown} style={{
                    padding: '1rem 1.5rem', borderBottom: '1px solid var(--gcs-border-color)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    cursor: 'move', backgroundColor: '#f1f5fb',
                    borderTopLeftRadius: '12px', borderTopRightRadius: '12px'
                }}>
                    <h3 style={{ margin: 0, color: 'var(--gcs-blue)' }}><FileText size={18} style={{marginRight: '10px', verticalAlign: 'middle'}}/> {titles[mode]}</h3>
                    <button onClick={isSaving ? undefined : onClose} disabled={isSaving} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}><XIcon size={20} color="var(--gcs-gray-dark)" /></button>
                </div>
                
                <div style={{ padding: '1.5rem' }}>
                    {isDeleteMode ? (
                        <div>
                            <div style={{textAlign: 'center', marginBottom: '1.5rem'}}>
                                <AlertTriangle size={40} color="var(--gcs-red)" style={{marginBottom: '1rem'}}/>
                                <p style={{ color: '#333', fontSize: '1.1rem' }}>
                                    Tem certeza que deseja excluir a condicionante abaixo?
                                </p>
                                <p style={{marginTop: '0.5rem', color: 'var(--gcs-gray-dark)'}}>Esta ação não pode ser desfeita.</p>
                            </div>
                            <FormFields formData={formData} disabled={true} handleInputChange={handleInputChange} />
                        </div>
                    ) : (
                       <FormFields formData={formData} disabled={isSaving} handleInputChange={handleInputChange} />
                    )}
                </div>

                <div style={{ padding: '1.5rem', borderTop: '1px solid var(--gcs-border-color)', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem', backgroundColor: '#f8f9fa', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
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
                                <button onClick={handleSaveClick} className="btn btn-excluir" style={{ padding: '8px 16px' }}>
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
        </>
    );
};

export default ModalCondicionante;