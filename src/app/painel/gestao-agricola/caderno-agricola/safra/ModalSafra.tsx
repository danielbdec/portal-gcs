"use client";

import React, { useEffect, useState, useCallback, useRef } from 'react';
// *** CORREÇÃO: Importando 'Button' e 'Spin' do AntD ***
import { Form, Input, Select, Button, Spin } from 'antd'; 
import { AlertTriangle, Edit, Plus, Trash2 } from 'lucide-react';
import { LoadingOutlined } from '@ant-design/icons';

const { Option } = Select;

// Interface dos dados do grid (mapeados)
interface Caderno {
  id: number;
  key: string; 
  nome: string; 
  safra: string; 
  versao: string;
  status: string; 
  status_original: 'A' | 'I';
  dt_inclusao: string;
  dt_atualizacao: string;
  [key: string]: any; 
}

interface ModalProps {
  visible: boolean;
  mode: 'add' | 'edit' | 'delete';
  initialData: Partial<Caderno> | null;
  onClose: () => void;
  onSave: (data: Partial<CadernoApiData>, mode: 'add' | 'edit' | 'delete') => void;
  isSaving: boolean;
}

// Interface dos dados da API
interface CadernoApiData {
    id?: number;
    descricao: string;
    codigo_safra: string;
    versao: string;
    status: 'A' | 'I';
}


const ModalSafra: React.FC<ModalProps> = ({ visible, mode, initialData, onClose, onSave, isSaving }) => {
  const [form] = Form.useForm();
  
  // --- Hooks de Arrastar (do ModalDetalhes_exemplo.tsx) ---
  const modalRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  // Popula o formulário
  useEffect(() => {
    if (visible && (mode === 'edit' || mode === 'delete')) {
      form.setFieldsValue({
        descricao: initialData?.descricao,
        codigo_safra: initialData?.codigo_safra,
        versao: initialData?.versao,
        status: initialData?.status_original || 'A', 
      });
    } else if (visible && mode === 'add') {
      form.resetFields();
      form.setFieldsValue({ status: 'A' });
    }
  }, [visible, mode, initialData, form]);

  // Efeito para centralizar o modal ao abrir
  useEffect(() => {
    if (visible && modalRef.current) {
        const modal = modalRef.current;
        const initialX = (window.innerWidth - modal.offsetWidth) / 2;
        const initialY = 40; // Um pouco abaixo do topo
        setPosition({ x: initialX > 0 ? initialX : 20, y: initialY });
    }
  }, [visible]);

  // --- Lógica de Arrastar (do ModalDetalhes_exemplo.tsx) ---
  const handleMouseDown = (e: React.MouseEvent) => {
      if (modalRef.current) {
          const target = e.target as HTMLElement;
          if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'BUTTON' || target.closest('button') || target.closest('.ant-select-selector')) {
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

  // Handler para submeter o formulário (Add/Edit)
  const handleSubmit = () => {
    form.validateFields()
      .then(values => {
        if (mode === 'edit') {
          onSave({ id: initialData?.id, ...values }, 'edit');
        } else {
          onSave(values as CadernoApiData, 'add');
        }
      })
      .catch(info => {
        console.log('Falha na validação:', info);
      });
  };

  // Handler para confirmar a exclusão
  const handleDelete = () => {
    if (initialData) {
      onSave({ id: initialData.id }, 'delete');
    }
  };

  // --- Títulos e Ícones Dinâmicos ---
  let title = '';
  let Icon = Plus;
  let okText = 'Salvar';
  let okColor = 'var(--gcs-green-dark)'; // Verde Padrão

  if (mode === 'add') {
    title = 'Cadastrar Novo Caderno';
    Icon = Plus;
    okText = 'Cadastrar';
  } else if (mode === 'edit') {
    title = 'Alterar Caderno';
    Icon = Edit;
    okText = 'Salvar Alterações';
  } else if (mode === 'delete') {
    title = 'Excluir Caderno';
    Icon = AlertTriangle;
    okText = 'Excluir';
    okColor = 'var(--gcs-brand-red)'; // Vermelho para Excluir
  }

  const modalTitle = (
    <div className="modal-safra-title">
      <Icon size={20} color={mode === 'delete' ? okColor : 'var(--gcs-blue)'} />
      <span>{title}</span>
    </div>
  );

  if (!visible) return null;

  return (
    <>
      {/* --- ESTILOS DO ModalDetalhes_exemplo.tsx --- */}
      <style>{`
        /* --- *** INÍCIO DA CORREÇÃO DE CSS *** --- */
        /* Classes renomeadas para '.modal-safra-' para evitar conflito */
      
        :root {
            --gcs-blue: #00314A;
            --gcs-blue-light: #1b4c89;
            --gcs-blue-lighter: #a3b8d1;
            --gcs-blue-sky: #7DD3FC;
            --gcs-green: #5FB246;
            --gcs-green-dark: #28a745;
            --gcs-orange: #F58220; /* Laranja que você pediu */
            --gcs-gray-light: #f1f5fb;
            --gcs-gray-border: #d0d7e2;
            --gcs-gray-text: #6c757d;
            --gcs-dark-text: #333;
            --gcs-brand-red: #d9534f;
            --gcs-red-light: #fff0f0;
            --gcs-red-border: #f5c2c7;
            --gcs-red-text: #721c24;
            --gcs-dark-bg-transparent: rgba(25, 39, 53, 0.5);
            --gcs-dark-bg-heavy: rgba(25, 39, 53, 0.85);
            --gcs-dark-border: rgba(125, 173, 222, 0.2);
            --gcs-dark-border-hover: rgba(125, 173, 222, 0.4);
            --gcs-dark-text-primary: #F1F5F9;
            --gcs-dark-text-secondary: #CBD5E1;
            --gcs-dark-text-tertiary: #94A3B8;
        }
        .animate-spin {
            animation: spin 1s linear infinite;
        }
        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
        
        /* --- Base Modal --- */
        .modal-safra-backdrop {
            position: fixed;
            top: 0; left: 0;
            width: 100vw; height: 100vh;
            background-color: rgba(0,0,0,0.4);
            z-index: 2147483646;
        }
        .modal-safra-glass {
            position: fixed;
            border-radius: 12px;
            width: 90%;
            max-width: 500px; /* <-- Largura deste modal */
            min-height: 300px;
            max-height: 90vh;
            display: flex;
            flex-direction: column;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            z-index: 2147483647;
            transition: background 0.3s ease, border 0.3s ease, box-shadow 0.3s ease;
        }
        body.light .modal-safra-glass {
            background: #fff;
            border: 1px solid #dee2e6;
        }
        body.dark .modal-safra-glass {
            background: var(--gcs-dark-bg-heavy);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border: 1px solid var(--gcs-dark-border);
        }

        /* --- Modal Header --- */
        .modal-safra-header {
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
        body.light .modal-safra-header {
            background-color: var(--gcs-gray-light);
            border-bottom-color: #dee2e6;
        }
        body.dark .modal-safra-header {
            background-color: rgba(25, 39, 53, 0.5);
            border-bottom-color: var(--gcs-dark-border);
        }
        .modal-safra-title {
            font-size: 1.2rem;
            font-weight: bold;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        body.light .modal-safra-title { color: var(--gcs-blue); }
        body.dark .modal-safra-title { color: var(--gcs-dark-text-primary); }
        body.dark .modal-safra-title svg { color: var(--gcs-dark-text-primary) !important; }
        
        .modal-safra-close-btn {
            background: none;
            border: none;
            font-size: 1.75rem;
            cursor: pointer;
            padding: 0;
            line-height: 1;
        }
        body.light .modal-safra-close-btn { color: var(--gcs-dark-text); }
        body.dark .modal-safra-close-btn { color: var(--gcs-dark-text-secondary); }
        body.dark .modal-safra-close-btn:hover { color: var(--gcs-dark-text-primary); }

        /* --- Modal Content --- */
        .modal-safra-content-wrapper {
            flex-grow: 1;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        }
        .modal-safra-content-scrollable {
            flex-grow: 1;
            overflow-y: auto;
            padding: 1.5rem;
        }
        
        /* --- Modal Footer --- */
        .modal-safra-footer {
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
        body.light .modal-safra-footer {
            background-color: var(--gcs-gray-light);
            border-top-color: #dee2e6;
        }
        body.dark .modal-safra-footer {
            background-color: rgba(25, 39, 53, 0.5);
            border-top-color: var(--gcs-dark-border);
        }

        /* --- Botões AntD (Estilos globais, não precisam de prefixo) --- */
        .btn-cancelar-laranja {
            background-color: var(--gcs-orange) !important;
            border-color: var(--gcs-orange) !important;
            color: white !important;
        }
        .btn-cancelar-laranja:hover:not(:disabled) {
            background-color: #d17814 !important; /* Laranja mais escuro */
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


        /* --- ESTILOS PARA Antd Form (Globais) --- */
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
        /* --- Fim dos estilos Antd --- */

        /* --- Estilos Modo Excluir (Prefixados) --- */
        .delete-confirmation-box {
            display: flex; alignItems: center; gap: 1rem; padding: 1rem 0;
        }
        .delete-confirmation-text p {
            margin: 0;
            font-weight: 500;
        }
        .delete-confirmation-text p.item-name {
             font-size: 0.9rem;
             margin-top: 4px;
        }
        .delete-confirmation-text p.warning {
            margin-top: 10px;
            font-weight: 600;
            color: var(--gcs-brand-red);
        }
        body.light .delete-confirmation-text p { color: #333; }
        body.light .delete-confirmation-text p.item-name { color: #555; }
        
        body.dark .delete-confirmation-text p { color: var(--gcs-dark-text-primary); }
        body.dark .delete-confirmation-text p.item-name { color: var(--gcs-dark-text-secondary); }
        body.dark .delete-confirmation-text p.warning { color: #F87171; }
      `}</style>

      <div 
        className="modal-safra-backdrop"
        onClick={onClose}
      ></div>
      
      <div
        ref={modalRef}
        className="modal-safra-glass"
        style={{
            top: position.y,
            left: position.x,
        }}
      >
          <div
            onMouseDown={handleMouseDown}
            className="modal-safra-header"
          >
            {modalTitle}
            <button onClick={onClose} className="modal-safra-close-btn">×</button>
          </div>

          <div className="modal-safra-content-wrapper">
              <div className="modal-safra-content-scrollable">

                {/* --- Conteúdo do Modal --- */}
                
                {mode === 'delete' ? (
                  // --- MODO EXCLUIR ---
                  <div className="delete-confirmation-box">
                      <AlertTriangle size={40} color={okColor} style={{flexShrink: 0}} />
                      <div className="delete-confirmation-text">
                          <p>
                              Você tem certeza que deseja excluir este caderno?
                          </p>
                          <p className="item-name">
                              <strong>{initialData?.nome}</strong> (ID: {initialData?.id}, Versão: {initialData?.versao})
                          </p>
                          <p className="warning">
                              Esta ação não pode ser desfeita.
                          </p>
                      </div>
                  </div>
                ) : (
                  // --- MODO ADICIONAR / EDITAR ---
                  <Form form={form} layout="vertical" name="form_in_modal">
                    
                    <Form.Item
                      name="descricao"
                      label="Descrição do Caderno"
                      rules={[{ required: true, message: 'Por favor, insira a descrição!' }]}
                    >
                      <Input placeholder="Ex: Safra 2025/2026 - versão inicial" />
                    </Form.Item>
                    
                    <div style={{display: 'flex', gap: '1rem'}}>
                      <Form.Item
                        name="codigo_safra"
                        label="Código da Safra"
                        rules={[{ required: true, message: 'Por favor, insira a safra!' }]}
                        style={{flex: 1}}
                      >
                        <Input placeholder="Ex: 25/26" />
                      </Form.Item>

                      <Form.Item
                        name="versao"
                        label="Versão"
                        rules={[{ required: true, message: 'Por favor, insira a versão!' }]}
                        style={{flex: 1}}
                      >
                        <Input placeholder="Ex: 1" />
                      </Form.Item>
                    </div>

                    <Form.Item
                      name="status"
                      label="Status"
                      rules={[{ required: true, message: 'Por favor, selecione o status!' }]}
                    >
                      <Select>
                        <Option value="A">Ativo</Option>
                        <Option value="I">Inativo</Option>
                      </Select>
                    </Form.Item>
                  </Form>
                )}

              </div>
          </div>
          
          <div className="modal-safra-footer">
            <Button 
                key="back" 
                onClick={onClose} 
                disabled={isSaving}
                // *** CORREÇÃO: Botão Laranja ***
                className="btn-cancelar-laranja"
            >
              Cancelar
            </Button>
            <Button
              key="submit"
              type="primary"
              loading={isSaving} // Spinner embutido
              disabled={isSaving} // Desativa o botão
              onClick={mode === 'delete' ? handleDelete : handleSubmit}
              style={{ backgroundColor: okColor, borderColor: okColor }}
            >
              {okText}
            </Button>
          </div>
      </div>
    </>
  );
};

export default ModalSafra;