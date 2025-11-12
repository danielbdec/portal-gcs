/*
 * =========================================================================
 * MODAL DE CRUD (ADICIONAR/EDITAR/EXCLUIR) PARA VARIEDADES
 * =========================================================================
 * CRIADO AGORA.
 * - Baseado no layout e estilo (Glassmorfismo, Drag, Fechar) do ModalPivo.tsx.
 * - Campos do formulário adaptados para Variedade:
 * - Nome (Input)
 * - Cultura (Select)
 * - Status (Select)
 * - Lógica de validação e normalização simplificada.
 * =========================================================================
 */
"use client";

import React, { useEffect, useState, useCallback, useRef } from 'react';
// Importa componentes do AntD, incluindo o 'Modal as AntModal' para confirmação
import { Form, Input, Select, Button, Spin, Alert, Modal as AntModal } from 'antd';
import { AlertTriangle, Edit, Plus, Trash2, Leaf } from 'lucide-react';

const { Option } = Select;

// --- DEFINIÇÃO DAS CULTURAS (Do gabarito ModalPivo) ---
const CULTURAS_OPTIONS = [
  { id: 1, nome: "ALGODAO" },
  { id: 2, nome: "SOJA" },
  { id: 3, nome: "MILHO" },
  { id: 4, nome: "FEIJAO" },
  { id: 5, nome: "MILHETO" },
  { id: 6, nome: "CAFE" },
];

// --- INTERFACE DA VARIEDADE ---
// Esta interface é usada internamente pelo modal
interface Variedade {
  id: number;
  nome: string;
  id_cultura: number; // O formulário precisa do ID
  status: 'Aberto' | 'Inativo';
  [key: string]: any;
}

interface ModalVariedadeProps {
  visible: boolean;
  mode: 'add' | 'edit' | 'delete';
  initialData: Partial<Variedade> | null;
  onClose: () => void;
  // Funções esperadas pelo page.tsx
  onSave: (data: any) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  isSaving: boolean;
}

// =========================================================================
// --- FUNÇÕES DE NORMALIZAÇÃO ---
// =========================================================================
const normalizeUppercase = (value: string) => (value || '').toUpperCase();


// =========================================================================
// --- COMPONENTE DO MODAL ---
// =========================================================================

const ModalVariedade: React.FC<ModalVariedadeProps> = ({ visible, mode, initialData, onClose, onSave, onDelete, isSaving }) => {
  const [form] = Form.useForm();
  
  // --- Hooks de Arraste (do gabarito ModalPivo) ---
  const modalRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  // Popula o formulário
  useEffect(() => {
    if (visible) {
        if (mode === 'edit' || mode === 'delete') {
            // Nota: A API de lista não fornece 'id_cultura',
            // então 'initialData.id_cultura' pode estar undefined no modo 'edit'.
            // O formulário funcionará, mas o select 'Cultura' pode não vir pré-selecionado.
            form.setFieldsValue({
                ...initialData,
                status: initialData?.status || 'Inativo',
            });
        } else if (mode === 'add') {
            form.resetFields();
            form.setFieldsValue({ status: 'Aberto' }); // Padrão
        }
    }
  }, [visible, mode, initialData, form]);

  // Efeito para centralizar o modal ao abrir
  useEffect(() => {
    if (visible && modalRef.current) {
        const modal = modalRef.current;
        const initialX = (window.innerWidth - modal.offsetWidth) / 2;
        const initialY = 40;
        setPosition({ x: initialX > 0 ? initialX : 20, y: initialY });
    }
  }, [visible]);

  // --- Lógica de Arrastar (do gabarito ModalPivo) ---
  const handleMouseDown = (e: React.MouseEvent) => {
      if (modalRef.current) {
          const target = e.target as HTMLElement;
          if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'BUTTON' || target.closest('button') || target.closest('.ant-select-selector') || target.closest('.ant-input-number')) {
              return;
          }
          setIsDragging(true);
          const modalRect = modalRef.current.getBoundingClientRect();
          setOffset({
              x: e.clientX - modalRect.left,
              y: e.clientY - modalRect.top
          });
          e.preventDefault();
      }
  };
  const handleMouseMove = useCallback((e: MouseEvent) => {
      if (!isDragging) return;
      const newX = e.clientX - offset.x;
      const newY = e.clientY - offset.y;
      setPosition({ x: newX, y: newY });
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
  // --- Fim da Lógica de Arrastar ---


  // --- Handler para fechar com confirmação (do gabarito ModalPivo) ---
  const handleTryClose = () => {
    if (isSaving) return; 
    const isDark = document.body.classList.contains('dark');

    if (mode !== 'delete' && form.isFieldsTouched()) {
        AntModal.confirm({
            title: 'Descartar alterações?',
            content: 'Você tem alterações não salvas. Se fechar, perderá essas informações.',
            icon: <AlertTriangle size={24} style={{ color: 'var(--gcs-orange)' }} />,
            okText: 'Sim, Descartar',
            okButtonProps: { 
                danger: true, 
                style: { backgroundColor: 'var(--gcs-brand-red)', borderColor: 'var(--gcs-brand-red)' } 
            },
            cancelText: 'Não, Continuar',
            cancelButtonProps: { 
                type: 'primary',
                style: { backgroundColor: 'var(--gcs-green-dark)', borderColor: 'var(--gcs-green-dark)' }
            },
            onOk: onClose,
            zIndex: 2147483648,
            className: isDark ? 'ant-modal-dark' : '',
        });
    } else {
        onClose();
    }
  };

  // Handler para submeter o formulário (Add/Edit)
  const handleSubmit = () => {
    form.validateFields()
      .then(values => {
        const dataToSave: Partial<Variedade> = {
          ...initialData,
          ...values,
        };
        // 'onSave' é a função do page.tsx, que espera 'dataToSave'
        onSave(dataToSave); 
      })
      .catch(info => {
        console.log('Falha na validação:', info);
      });
  };

  // Handler para confirmar a exclusão
  const handleDelete = () => {
    if (initialData?.id) {
      // 'onDelete' é a função do page.tsx, que espera o 'id'
      onDelete(initialData.id); 
    }
  };

  // --- Títulos e Ícones Dinâmicos ---
  const config = {
    add: {
      title: 'Cadastrar Nova Variedade',
      icon: <Plus size={20} color="var(--gcs-green, #5FB246)" />,
      okText: 'Salvar',
      okColor: 'var(--gcs-green-dark, #28a745)',
    },
    edit: {
      title: 'Alterar Variedade',
      icon: <Edit size={20} color="var(--gcs-blue, #00314A)" />,
      okText: 'Salvar Alterações',
      okColor: 'var(--gcs-green-dark, #28a745)',
    },
    delete: {
      title: 'Excluir Variedade',
      icon: <AlertTriangle size={20} color="var(--gcs-brand-red, #d9534f)" />,
      okText: 'Excluir',
      okColor: 'var(--gcs-brand-red, #d9534f)',
    },
  };
  const currentConfig = config[mode];

  const modalTitle = (
    <div className="modal-variedade-crud-title">
      <span className="modal-variedade-crud-icon-wrapper">{currentConfig.icon}</span>
      <span>{currentConfig.title}</span>
    </div>
  );

  if (!visible) return null;

  return (
    <>
      {/* --- ESTILOS (do gabarito ModalPivo) --- */}
      <style>{`
        /* --- Variáveis --- */
        :root {
            --gcs-blue: #00314A;
            --gcs-blue-light: #1b4c89;
            --gcs-orange: #F58220; /* Laranja do Pivô */
            --gcs-green: #5FB246;
            --gcs-green-dark: #28a745;
            --gcs-brand-red: #d9534f;
            --gcs-gray-light: #f1f5fb;
            --gcs-dark-text: #333;
            --gcs-gray-text: #6c757d;
            --gcs-dark-bg-transparent: rgba(25, 39, 53, 0.5);
            --gcs-dark-bg-heavy: rgba(25, 39, 53, 0.85);
            --gcs-dark-border: rgba(125, 173, 222, 0.2);
            --gcs-dark-border-hover: rgba(125, 173, 222, 0.4);
            --gcs-dark-text-primary: #F1F5F9;
            --gcs-dark-text-secondary: #CBD5E1;
            --gcs-dark-text-tertiary: #94A3B8;
        }
        
        /* --- Base Modal --- */
        .modal-variedade-crud-backdrop {
            position: fixed;
            top: 0; left: 0;
            width: 100vw; height: 100vh;
            background-color: rgba(0,0,0,0.4);
            z-index: 2147483646;
        }
        .modal-variedade-crud-glass {
            position: fixed;
            border-radius: 12px;
            width: 90%;
            max-width: 500px; /* Largura menor para este modal */
            min-height: 300px;
            max-height: 90vh;
            display: flex;
            flex-direction: column;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            z-index: 2147483647;
            transition: background 0.3s ease, border 0.3s ease, box-shadow 0.3s ease;
        }
        body.light .modal-variedade-crud-glass {
            background: #fff;
            border: 1px solid #dee2e6;
        }
        body.dark .modal-variedade-crud-glass {
            background: var(--gcs-dark-bg-heavy);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border: 1px solid var(--gcs-dark-border);
        }

        /* --- Modal Header --- */
        .modal-variedade-crud-header {
            padding: 1.5rem;
            border-bottom: 1px solid;
            flex-shrink: 0;
            cursor: move;
            border-top-left-radius: 12px;
            border-top-right-radius: 12px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            transition: background-color 0.3s ease, border-color 0.3s ease;
        }
        body.light .modal-variedade-crud-header {
            background-color: var(--gcs-gray-light);
            border-bottom-color: #dee2e6;
        }
        body.dark .modal-variedade-crud-header {
            background-color: rgba(25, 39, 53, 0.5);
            border-bottom-color: var(--gcs-dark-border);
        }
        .modal-variedade-crud-title {
            font-size: 1.2rem;
            font-weight: bold;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        body.light .modal-variedade-crud-title { color: var(--gcs-blue); }
        body.dark .modal-variedade-crud-title,
        body.dark .modal-variedade-crud-icon-wrapper svg { 
            color: var(--gcs-dark-text-primary) !important; 
        }
        
        .modal-variedade-crud-close-btn {
            background: none;
            border: none;
            font-size: 1.75rem;
            cursor: pointer;
            padding: 0;
            line-height: 1;
        }
        body.light .modal-variedade-crud-close-btn { color: var(--gcs-dark-text); }
        body.dark .modal-variedade-crud-close-btn { color: var(--gcs-dark-text-secondary); }
        body.dark .modal-variedade-crud-close-btn:hover { color: var(--gcs-dark-text-primary); }

        /* --- Modal Content --- */
        .modal-variedade-crud-content-wrapper {
            flex-grow: 1;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        }
        .modal-variedade-crud-content-scrollable {
            flex-grow: 1;
            overflow-y: auto;
            padding: 1.5rem;
        }
        body.dark .ant-spin-container,
        body.dark .ant-alert {
            background: transparent !important;
        }
        
        /* --- Modal Footer --- */
        .modal-variedade-crud-footer {
            padding: 1rem 1.5rem;
            border-top: 1px solid;
            flex-shrink: 0;
            border-bottom-left-radius: 12px;
            border-bottom-right-radius: 12px;
            display: flex;
            justify-content: flex-end;
            align-items: center;
            gap: 8px;
            transition: background-color 0.3s ease, border-color 0.3s ease;
        }
        body.light .modal-variedade-crud-footer {
            background-color: var(--gcs-gray-light);
            border-top-color: #dee2e6;
        }
        body.dark .modal-variedade-crud-footer {
            background-color: rgba(25, 39, 53, 0.5);
            border-top-color: var(--gcs-dark-border);
        }

        /* --- Botões AntD --- */
        .btn-cancelar-laranja {
            /* Usa o laranja do gabarito Pivo */
            background-color: var(--gcs-orange) !important;
            border-color: var(--gcs-orange) !important;
            color: white !important;
            font-weight: 600;
        }
        .btn-cancelar-laranja:hover:not(:disabled) {
            background-color: #d17814 !important;
            border-color: #d17814 !important;
        }
        
        .ant-btn-primary[style*="var(--gcs-green-dark)"] {
             background-color: var(--gcs-green-dark);
             border-color: var(--gcs-green-dark);
        }
        .ant-btn-primary[style*="var(--gcs-green-dark)"]:hover:not(:disabled) {
             background-color: #1e7e34;
        }
        
        .ant-btn-primary[style*="var(--gcs-brand-red)"] {
             background-color: var(--gcs-brand-red);
             border-color: var(--gcs-brand-red);
        }
         .ant-btn-primary[style*="var(--gcs-brand-red)"]:hover:not(:disabled) {
             background-color: #b01725;
        }

        /* --- ESTILOS PARA Antd Form --- */
        body.dark .ant-form-item-label > label {
            color: var(--gcs-dark-text-primary);
        }
        body.dark .ant-input,
        body.dark .ant-select-selector {
            background: var(--gcs-dark-bg-transparent) !important;
            border: 1px solid var(--gcs-dark-border) !important;
            color: var(--gcs-dark-text-primary) !important;
        }
        body.dark .ant-input:focus,
        body.dark .ant-input-focused,
        body.dark .ant-select-focused .ant-select-selector {
            border-color: var(--gcs-dark-border-hover) !important;
            box-shadow: none !important;
        }
        body.dark .ant-input::placeholder {
            color: var(--gcs-dark-text-tertiary);
        }
        body.dark .ant-select-arrow {
            color: var(--gcs-dark-text-tertiary) !important;
        }
        body.dark .ant-select-selection-placeholder {
            color: var(--gcs-dark-text-tertiary) !important;
        }
        
        /* Dropdown do Select */
        body.dark .ant-select-dropdown {
            background: var(--gcs-dark-bg-heavy) !important;
            border: 1px solid var(--gcs-dark-border) !important;
        }
        body.dark .ant-select-item {
            color: var(--gcs-dark-text-primary) !important;
        }
        body.dark .ant-select-item-option-active:not(.ant-select-item-option-selected) {
            background: var(--gcs-dark-bg-transparent) !important;
        }
        body.dark .ant-select-item-option-selected {
            background: var(--gcs-blue-light) !important;
            color: white !important;
        }

        /* --- Estilos Modo Excluir --- */
        .delete-confirmation-box {
            padding: 1rem 0;
        }
        body.dark .ant-alert-error {
             background-color: rgba(217, 83, 79, 0.1);
             border-color: rgba(217, 83, 79, 0.3);
        }
        body.dark .ant-alert-error .ant-alert-message {
             color: #F87171; /* Vermelho claro */
        }
        body.dark .ant-alert-error .ant-alert-description p,
        body.dark .ant-alert-error .ant-alert-description strong {
            color: var(--gcs-dark-text-secondary);
        }
        
        /* --- Estilos do Modal de Confirmação (Dark Mode) --- */
        .ant-modal-dark .ant-modal-content {
            background: var(--gcs-dark-bg-heavy) !important;
        }
        .ant-modal-dark .ant-modal-header {
            background: rgba(25, 39, 53, 0.5) !important;
            border-bottom-color: var(--gcs-dark-border) !important;
        }
        .ant-modal-dark .ant-modal-confirm-title {
            color: var(--gcs-dark-text-primary) !important;
        }
        .ant-modal-dark .ant-modal-confirm-content {
             color: var(--gcs-dark-text-secondary) !important;
        }
        .ant-modal-dark .ant-modal-confirm-btns {
            border-top-color: var(--gcs-dark-border) !important;
            padding-top: 12px !important;
        }
        .ant-modal-confirm-btns .ant-btn-primary:not(.ant-btn-dangerous) {
             background-color: var(--gcs-green-dark) !important;
             border-color: var(--gcs-green-dark) !important;
        }
        .ant-modal-confirm-btns .ant-btn-primary:not(.ant-btn-dangerous):hover {
             background-color: #1e7e34 !important;
             border-color: #1e7e34 !important;
        }
        .ant-modal-confirm-btns .ant-btn-dangerous {
            background-color: var(--gcs-brand-red) !important;
            border-color: var(--gcs-brand-red) !important;
        }
        .ant-modal-confirm-btns .ant-btn-dangerous:hover {
            background-color: #b01725 !important;
            border-color: #b01725 !important;
        }
      `}</style>

      <div 
        className="modal-variedade-crud-backdrop"
        onClick={handleTryClose}
      ></div>
      
      <div
        ref={modalRef}
        className="modal-variedade-crud-glass"
        style={{
            top: position.y,
            left: position.x,
        }}
      >
          <div
            onMouseDown={handleMouseDown}
            className="modal-variedade-crud-header"
          >
            {modalTitle}
            <button onClick={handleTryClose} className="modal-variedade-crud-close-btn" disabled={isSaving}>×</button>
          </div>

          <div className="modal-variedade-crud-content-wrapper">
              <div className="modal-variedade-crud-content-scrollable">
                
                {mode === 'delete' ? (
                  // --- MODO EXCLUIR ---
                  <div className="delete-confirmation-box">
                    <Alert
                        message="Confirmação de Exclusão"
                        description={
                          <p>
                            Você tem certeza que deseja excluir a variedade: <br />
                            <strong>ID: {initialData?.id} - {initialData?.nome}</strong>
                            <br /><br />
                            Esta ação não poderá ser desfeita.
                          </p>
                        }
                        type="error"
                        showIcon
                        icon={<AlertTriangle size={24} />}
                    />
                  </div>
                ) : (
                  // --- MODO ADICIONAR / EDITAR ---
                  <Form form={form} layout="vertical" name="form_in_modal" disabled={isSaving}>
                    
                    <Form.Item
                      name="nome"
                      label="Nome da Variedade"
                      rules={[{ required: true, message: 'Por favor, insira o nome.' }]}
                      normalize={normalizeUppercase}
                    >
                      <Input placeholder="Ex: TMG 7062 IPRO" />
                    </Form.Item>
                    
                    {/* --- Campos de Cultura e Status --- */}
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px'}}>
                        <Form.Item
                          name="id_cultura"
                          label="Cultura Associada"
                          rules={[{ required: true, message: 'Selecione a cultura.' }]}
                        >
                          <Select 
                            placeholder="Selecione a cultura"
                            dropdownStyle={{ zIndex: 2147483648 }}
                          >
                            {CULTURAS_OPTIONS.map(cultura => (
                                <Option key={cultura.id} value={cultura.id}>{cultura.nome}</Option>
                            ))}
                          </Select>
                        </Form.Item>

                        <Form.Item
                          name="status"
                          label="Status"
                          rules={[{ required: true, message: 'Selecione o status.' }]}
                        >
                          <Select dropdownStyle={{ zIndex: 2147483648 }}>
                            <Option value="Aberto">Aberto</Option>
                            <Option value="Inativo">Inativo</Option>
                          </Select>
                        </Form.Item>
                    </div>

                  </Form>
                )}

              </div>
          </div>
          
          <div className="modal-variedade-crud-footer">
            <Button 
                key="back" 
                onClick={handleTryClose} 
                disabled={isSaving}
                className="btn-cancelar-laranja"
            >
              Cancelar
            </Button>
            <Button
              key="submit"
              type="primary"
              loading={isSaving}
              disabled={isSaving}
              onClick={mode === 'delete' ? handleDelete : handleSubmit}
              style={{ backgroundColor: currentConfig.okColor, borderColor: currentConfig.okColor }}
            >
              {currentConfig.okText}
            </Button>
          </div>
      </div>
    </>
  );
};

export default ModalVariedade;