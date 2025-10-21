"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { 
  X as XIcon,
  Save,
  Trash2,
  Ban,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import React from "react";

// --- INTERFACE ---
export interface Empreendimento {
  id: number;
  key: string;
  nome: string;
  cnpj_cpf: string;
  numero_matricula?: string;
  unidade: string;
  estado:string;
  area?: number;
  situacao?: string;
  area_agricultavel?: number; // NOVO CAMPO
  area_reserva_legal?: number; // NOVO CAMPO
}

// --- LISTA DE ESTADOS DO BRASIL ---
const estadosBrasileiros = [
    { sigla: '', nome: 'Selecione um Estado...' }, { sigla: 'AC', nome: 'Acre' },
    { sigla: 'AL', nome: 'Alagoas' }, { sigla: 'AP', nome: 'Amapá' },
    { sigla: 'AM', nome: 'Amazonas' }, { sigla: 'BA', nome: 'Bahia' },
    { sigla: 'CE', nome: 'Ceará' }, { sigla: 'DF', nome: 'Distrito Federal' },
    { sigla: 'ES', nome: 'Espírito Santo' }, { sigla: 'GO', nome: 'Goiás' },
    { sigla: 'MA', nome: 'Maranhão' }, { sigla: 'MT', nome: 'Mato Grosso' },
    { sigla: 'MS', nome: 'Mato Grosso do Sul' }, { sigla: 'MG', nome: 'Minas Gerais' },
    { sigla: 'PA', nome: 'Pará' }, { sigla: 'PB', nome: 'Paraíba' },
    { sigla: 'PR', nome: 'Paraná' }, { sigla: 'PE', nome: 'Pernambuco' },
    { sigla: 'PI', nome: 'Piauí' }, { sigla: 'RJ', nome: 'Rio de Janeiro' },
    { sigla: 'RN', nome: 'Rio Grande do Norte' }, { sigla: 'RS', nome: 'Rio Grande do Sul' },
    { sigla: 'RO', nome: 'Rondônia' }, { sigla: 'RR', nome: 'Roraima' },
    { sigla: 'SC', nome: 'Santa Catarina' }, { sigla: 'SP', nome: 'São Paulo' },
    { sigla: 'SE', nome: 'Sergipe' }, { sigla: 'TO', nome: 'Tocantins' }
];

// --- FUNÇÕES DE VALIDAÇÃO E MÁSCARA ---
const validaCpfCnpj = (val: string = ''): boolean => {
    const cleanVal = val.replace(/\D/g, '');
    if (cleanVal.length === 11) { // CPF
        if (/^(\d)\1+$/.test(cleanVal)) return false;
        let d = cleanVal.split('');
        let soma = 0, resto;
        for (let i = 0; i < 9; i++) soma += parseInt(d[i]) * (10 - i);
        resto = 11 - (soma % 11);
        if (resto === 10 || resto === 11) resto = 0;
        if (resto !== parseInt(d[9])) return false;
        soma = 0;
        for (let i = 0; i < 10; i++) soma += parseInt(d[i]) * (11 - i);
        resto = 11 - (soma % 11);
        if (resto === 10 || resto === 11) resto = 0;
        if (resto !== parseInt(d[10])) return false;
        return true;
    } else if (cleanVal.length === 14) { // CNPJ
        if (/^(\d)\1+$/.test(cleanVal)) return false;
        let tamanho = cleanVal.length - 2;
        let numeros = cleanVal.substring(0, tamanho);
        let digitos = cleanVal.substring(tamanho);
        let soma = 0;
        let pos = tamanho - 7;
        for (let i = tamanho; i >= 1; i--) {
            soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
            if (pos < 2) pos = 9;
        }
        let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
        if (resultado !== parseInt(digitos.charAt(0))) return false;
        tamanho = tamanho + 1;
        numeros = cleanVal.substring(0, tamanho);
        soma = 0;
        pos = tamanho - 7;
        for (let i = tamanho; i >= 1; i--) {
            soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
            if (pos < 2) pos = 9;
        }
        resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
        if (resultado !== parseInt(digitos.charAt(1))) return false;
        return true;
    }
    return false;
};

const maskCpfCnpj = (value: string) => {
    const cleanValue = value.replace(/\D/g, '');
    if (cleanValue.length <= 11) { // CPF
        return cleanValue
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d{1,2})/, '$1-$2')
            .substring(0, 14);
    } else { // CNPJ
        return cleanValue
            .replace(/(\d{2})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1/$2')
            .replace(/(\d{4})(\d{1,2})/, '$1-$2')
            .substring(0, 18);
    }
};

// ===================== COMPONENTE DO FORMULÁRIO MOVIDO PARA FORA =====================
const FormFields = ({ formData, mode, disabled, handleInputChange }: {
    formData: Partial<Empreendimento>;
    mode: 'add' | 'edit' | 'delete';
    disabled: boolean;
    handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
}) => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem' }}>
        {mode !== 'add' && (
            <div style={{ gridColumn: '1 / 2' }}>
                <label className="modal-label">ID</label>
                <input className="modal-input" name="id" value={formData.id || ''} disabled />
            </div>
        )}
        <div style={{ gridColumn: mode !== 'add' ? '2 / -1' : '1 / -1' }}>
            <label className="modal-label">Nome do Empreendimento *</label>
            <input className="modal-input" name="nome" value={formData.nome || ''} onChange={handleInputChange} disabled={disabled} />
        </div>
        <div style={{ gridColumn: '1 / 2' }}>
            <label className="modal-label">CPF / CNPJ *</label>
            <input className="modal-input" name="cnpj_cpf" value={formData.cnpj_cpf || ''} onChange={handleInputChange} disabled={disabled} placeholder="Digite o CPF ou CNPJ" />
        </div>
        <div style={{ gridColumn: '2 / 3' }}>
            <label className="modal-label">Número da Matrícula</label>
            <input className="modal-input" name="numero_matricula" value={formData.numero_matricula || ''} onChange={handleInputChange} disabled={disabled} />
        </div>
        <div style={{ gridColumn: '3 / 4' }}>
            <label className="modal-label">Unidade (Fazenda) *</label>
            <input className="modal-input" name="unidade" value={formData.unidade || ''} onChange={handleInputChange} disabled={disabled} />
        </div>
        <div style={{ gridColumn: '4 / 5' }}>
            <label className="modal-label">Estado *</label>
            <select className="modal-input" name="estado" value={formData.estado || ''} onChange={handleInputChange} disabled={disabled}>
                {estadosBrasileiros.map(estado => (
                    <option key={estado.sigla} value={estado.sigla}>
                        {estado.nome}
                    </option>
                ))}
            </select>
        </div>
        <div style={{ gridColumn: '1 / 2' }}>
            <label className="modal-label">Situação do Imóvel *</label>
            <select 
                className="modal-input" 
                name="situacao" 
                value={formData.situacao || ''} 
                onChange={handleInputChange} 
                disabled={disabled}
            >
                <option value="">Selecione...</option>
                <option value="ATIVO">Ativo</option>
                <option value="ARRENDO">Arrendo</option>
                <option value="LITIGIO">Litígio</option>
		        <option value="INATIVO">Inativo</option>
            </select>
        </div>
        <div style={{ gridColumn: '2 / 3' }}>
            <label className="modal-label">Área Total (ha)</label>
            <input 
                type="number"
                className="modal-input" 
                name="area" 
                value={formData.area ?? ''} 
                onChange={handleInputChange} 
                disabled={disabled} 
                placeholder="Ex: 120.5"
            />
        </div>
        <div style={{ gridColumn: '3 / 4' }}>
            <label className="modal-label">Área Agricultável (ha)</label>
            <input 
                type="number"
                className="modal-input" 
                name="area_agricultavel" 
                value={formData.area_agricultavel ?? ''} 
                onChange={handleInputChange} 
                disabled={disabled} 
                placeholder="Ex: 100.2"
            />
        </div>
        <div style={{ gridColumn: '4 / 5' }}>
            <label className="modal-label">Reserva Legal (ha)</label>
            <input 
                type="number"
                className="modal-input" 
                name="area_reserva_legal" 
                value={formData.area_reserva_legal ?? ''} 
                onChange={handleInputChange} 
                disabled={disabled} 
                placeholder="Ex: 20.3"
            />
        </div>
    </div>
);
// =================================================================================

const ModalEmpreendimento = ({
    visible,
    mode,
    initialData,
    onClose,
    onSave,
    isSaving,
}: {
    visible: boolean;
    mode: 'add' | 'edit' | 'delete';
    initialData: Partial<Empreendimento> | null;
    onClose: () => void;
    onSave: (data: Partial<Empreendimento>, mode: 'add' | 'edit' | 'delete') => void;
    isSaving: boolean;
}) => {
    const [formData, setFormData] = useState<Partial<Empreendimento>>({});
    
    const modalRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);

    useEffect(() => {
        if (visible && initialData) {
            setFormData({
              ...initialData,
              cnpj_cpf: initialData.cnpj_cpf ? maskCpfCnpj(initialData.cnpj_cpf) : ''
            });
        } else if (visible && !initialData) {
            setFormData({
                nome: '',
                cnpj_cpf: '',
                numero_matricula: '',
                unidade: '',
                estado: '',
                area: undefined,
                situacao: '',
                area_agricultavel: undefined, // NOVO CAMPO
                area_reserva_legal: undefined, // NOVO CAMPO
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
        let finalValue: any = value;

        if (name === 'cnpj_cpf') {
            finalValue = maskCpfCnpj(value);
        } else if (name === 'nome' || name === 'unidade' || name === 'numero_matricula') {
            finalValue = value.toUpperCase();
        } else if (name === 'area' || name === 'area_agricultavel' || name === 'area_reserva_legal') { // INCLUÍDOS NOVOS CAMPOS
            finalValue = value ? parseFloat(value) : undefined;
        }

        setFormData(prev => ({ ...prev, [name]: finalValue }));
    };
    
    const handleSaveClick = () => {
        if (isSaving) return;
        
        if (mode === 'add' || mode === 'edit') {
            if (!formData.nome || !formData.cnpj_cpf || !formData.unidade || !formData.estado || !formData.situacao) {
                alert("Os campos com * são obrigatórios. Situação do imóvel deve ser informada.");
                return;
            }
            if (!validaCpfCnpj(formData.cnpj_cpf)) {
                alert("O CPF ou CNPJ informado é inválido. Por favor, verifique.");
                return;
            }
        }
        
        const dataToSave = {
            ...formData,
            cnpj_cpf: formData.cnpj_cpf?.replace(/\D/g, '')
        };
        onSave(dataToSave, mode);
    };

    const isDeleteMode = mode === 'delete';
    const titles = {
        add: 'Incluir Novo Empreendimento',
        edit: 'Alterar Empreendimento',
        delete: 'Confirmar Exclusão'
    };
    
    const getLoadingMessage = () => {
        switch(mode) {
            case 'add': return 'Incluindo Empreendimento, por favor aguarde...';
            case 'edit': return 'Alterando Empreendimento, por favor aguarde...';
            case 'delete': return 'Excluindo Empreendimento, por favor aguarde...';
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
                    zIndex: 1001, width: '90%', maxWidth: '1000px',
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
                    {isDeleteMode ? (
                        <div>
                            <div style={{textAlign: 'center', marginBottom: '1.5rem'}}>
                                <AlertTriangle size={40} color="var(--gcs-red)" style={{marginBottom: '1rem'}}/>
                                <p style={{ color: '#333', fontSize: '1.1rem' }}>
                                    Tem certeza que deseja excluir o empreendimento abaixo?
                                </p>
                                <p style={{marginTop: '0.5rem', color: 'var(--gcs-gray-dark)'}}>Esta ação não pode ser desfeita.</p>
                            </div>
                            <FormFields formData={formData} mode={mode} disabled={true} handleInputChange={handleInputChange} />
                        </div>
                    ) : (
                       <FormFields formData={formData} mode={mode} disabled={isSaving} handleInputChange={handleInputChange} />
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

export default ModalEmpreendimento;