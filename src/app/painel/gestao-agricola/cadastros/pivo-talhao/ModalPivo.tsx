/*
 * =========================================================================
 * MODAL DE CRUD (ADICIONAR / EDITAR / EXCLUIR)
 * =========================================================================
 * - ATUALIZADO: Agora usa o layout de Glasmorfismo do seu exemplo.
 * - ATUALIZADO: Implementada a lógica de arrastar (drag).
 * - ATUALIZADO: Botões e estilos (light/dark) baseados no seu CSS.
 * - CORREÇÃO (Modo Escuro): Fundo do formulário e alertas agora
 * usam o glasmorfismo e não são mais brancos.
 * - ATUALIZAÇÃO (Validação): Adicionada regra de negócio para o campo NOME
 * (Uppercase, PIVO XXX, TALHAO AXX).
 * - ATUALIZAÇÃO (Padronização): Todos os campos de texto agora são
 * convertidos para MAIÚSCULAS automaticamente.
 * =========================================================================
 */
"use client";

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Form, Input, InputNumber, Select, Button, Spin, Alert } from 'antd';
import { AlertTriangle, Edit, Plus, Trash2 } from 'lucide-react';

const { Option } = Select;

// Interface dos dados
interface PivoTalhaoData {
  id?: number;
  nome?: string;
  safra?: string;
  bloco?: string | null;
  ha?: number | null;
  cultura?: string | null;
  variedade?: string | null;
  status?: string; // "Aberto" ou "Inativo"
}

interface ModalPivoProps {
  visible: boolean;
  mode: 'add' | 'edit' | 'delete';
  initialData: Partial<PivoTalhaoData> | null;
  onClose: () => void;
  onSave: (data: any, mode: 'add' | 'edit' | 'delete') => Promise<void>;
  isSaving: boolean;
}

const ModalPivo: React.FC<ModalPivoProps> = ({ visible, mode, initialData, onClose, onSave, isSaving }) => {
  const [form] = Form.useForm();
  
  // --- Hooks de Arrastar (do seu exemplo) ---
  const modalRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  // Popula o formulário
  useEffect(() => {
    if (visible) {
      if (mode === 'add') {
        form.resetFields();
        form.setFieldsValue({ status: 'Aberto' });
      } else if (initialData) {
        form.setFieldsValue({
          ...initialData,
          status: initialData.status || 'Inativo',
        });
      }
    }
  }, [visible, initialData, mode, form]);

  // Efeito para centralizar o modal ao abrir
  useEffect(() => {
    if (visible && modalRef.current) {
        const modal = modalRef.current;
        // Garante que o modal de formulário seja um pouco maior
        const modalWidth = 600; 
        const initialX = (window.innerWidth - modalWidth) / 2;
        const initialY = 40; 
        setPosition({ x: initialX > 0 ? initialX : 20, y: initialY });
        
        // Foca no primeiro campo de input quando é 'add' ou 'edit'
        if (mode === 'add' || mode === 'edit') {
            const firstInput = modal.querySelector('input');
            firstInput?.focus();
        }
    }
  }, [visible, mode]);


  // --- Lógica de Arrastar (do seu exemplo) ---
  const handleMouseDown = (e: React.MouseEvent) => {
      if (modalRef.current) {
          const target = e.target as HTMLElement;
          // Impede o "arrastar" ao clicar em inputs, selects ou botões
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
        const dataToSave = {
          ...initialData,
          ...values,
        };
        onSave(dataToSave, mode);
      })
      .catch(info => {
        console.log('Falha na validação:', info);
      });
  };

  // Handler para confirmar a exclusão
  const handleDelete = () => {
    if (initialData) {
      onSave(initialData, 'delete');
    }
  };

  // --- ATUALIZAÇÃO: Validador Customizado para o Nome ---
  const validateNome = (_, value: string) => {
    if (!value) {
      return Promise.reject(new Error('Por favor, insira o nome.'));
    }
    
    // A normalização já faz o uppercase, mas garantimos o trim
    const upperValue = value.trim(); 
    const parts = upperValue.split(' ').filter(p => p.length > 0); // Split e remove espaços extras

    if (parts.length < 2) {
      return Promise.reject(new Error('O nome deve ter pelo menos duas palavras (ex: PIVO 001, TALHAO A21).'));
    }

    const primeiraPalavra = parts[0];
    const resto = parts.slice(1).join(' ');

    // Regra 1: O resto deve conter um número
    if (!/\d/.test(resto)) {
      return Promise.reject(new Error('A segunda parte do nome deve conter pelo menos um número.'));
    }

    // Regra 2: Regra específica para PIVO
    if (primeiraPalavra === 'PIVO' && !/^\d{3}$/.test(resto)) {
      return Promise.reject(new Error('Para "PIVO", a segunda parte deve ser exatamente 3 números (ex: PIVO 035).'));
    }
    
    // Se for TALHAO ou outro, a regra 1 (conter um número) é suficiente.
    return Promise.resolve();
  };

  // --- Títulos e Ícones Dinâmicos ---
  let title = '';
  let Icon = Plus;
  let okText = 'Salvar';
  let okColor = 'var(--gcs-green-dark)'; // Verde Padrão

  if (mode === 'add') {
    title = 'Cadastrar Novo Pivô/Talhão';
    Icon = Plus;
    okText = 'Cadastrar';
  } else if (mode === 'edit') {
    title = 'Alterar Pivô/Talhão';
    Icon = Edit;
    okText = 'Salvar Alterações';
  } else if (mode === 'delete') {
    title = 'Excluir Pivô/Talhão';
    Icon = AlertTriangle;
    okText = 'Excluir';
    okColor = 'var(--gcs-brand-red)'; // Vermelho para Excluir
  }

  const modalTitle = (
    <div className="modal-pivo-crud-title">
      <Icon size={20} color={mode === 'delete' ? okColor : 'var(--gcs-blue)'} />
      <span>{title}</span>
    </div>
  );

  if (!visible) return null;

  // ATUALIZAÇÃO: Helper para normalização
  const normalizeUpper = (value: string) => (value ? value.toUpperCase() : '');

  return (
    <>
      {/* --- ESTILOS DO ModalSafra_exemplo.tsx --- */}
      {/* Classes renomeadas para '.modal-pivo-crud-' */}
      <style>{`
        :root {
            --gcs-blue: #00314A;
            --gcs-blue-light: #1b4c89;
            --gcs-blue-lighter: #a3b8d1;
            --gcs-blue-sky: #7DD3FC;
            --gcs-green: #5FB246;
            --gcs-green-dark: #28a745;
            --gcs-orange: #F58220;
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
        
        /* --- Base Modal --- */
        .modal-pivo-crud-backdrop {
            position: fixed;
            top: 0; left: 0;
            width: 100vw; height: 100vh;
            background-color: rgba(0,0,0,0.4);
            z-index: 2147483646;
        }
        .modal-pivo-crud-glass {
            position: fixed;
            border-radius: 12px;
            width: 90%;
            max-width: 600px; /* <-- Largura deste modal */
            min-height: 300px;
            max-height: 90vh;
            display: flex;
            flex-direction: column;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            z-index: 2147483647;
            transition: background 0.3s ease, border 0.3s ease, box-shadow 0.3s ease;
        }
        body.light .modal-pivo-crud-glass {
            background: #fff;
            border: 1px solid #dee2e6;
        }
        body.dark .modal-pivo-crud-glass {
            background: var(--gcs-dark-bg-heavy);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border: 1px solid var(--gcs-dark-border);
        }

        /* --- Modal Header --- */
        .modal-pivo-crud-header {
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
        body.light .modal-pivo-crud-header {
            background-color: var(--gcs-gray-light);
            border-bottom-color: #dee2e6;
        }
        body.dark .modal-pivo-crud-header {
            background-color: rgba(25, 39, 53, 0.5);
            border-bottom-color: var(--gcs-dark-border);
        }
        .modal-pivo-crud-title {
            font-size: 1.2rem;
            font-weight: bold;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        body.light .modal-pivo-crud-title { color: var(--gcs-blue); }
        body.dark .modal-pivo-crud-title { color: var(--gcs-dark-text-primary); }
        body.dark .modal-pivo-crud-title svg { color: var(--gcs-dark-text-primary) !important; }
        
        .modal-pivo-crud-close-btn {
            background: none;
            border: none;
            font-size: 1.75rem;
            cursor: pointer;
            padding: 0;
            line-height: 1;
        }
        body.light .modal-pivo-crud-close-btn { color: var(--gcs-dark-text); }
        body.dark .modal-pivo-crud-close-btn { color: var(--gcs-dark-text-secondary); }
        body.dark .modal-pivo-crud-close-btn:hover { color: var(--gcs-dark-text-primary); }

        /* --- Modal Content --- */
        .modal-pivo-crud-content-wrapper {
            flex-grow: 1;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        }
        .modal-pivo-crud-content-scrollable {
            flex-grow: 1;
            overflow-y: auto;
            padding: 1.5rem;
        }
        
        /* CORREÇÃO MODO ESCURO */
        body.dark .modal-pivo-crud-content-wrapper .ant-spin-container,
        body.dark .modal-pivo-crud-content-wrapper .ant-spin-blur {
            background: transparent !important;
        }
        /* FIM CORREÇÃO */

        /* --- Modal Footer --- */
        .modal-pivo-crud-footer {
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
        body.light .modal-pivo-crud-footer {
            background-color: var(--gcs-gray-light);
            border-top-color: #dee2e6;
        }
        body.dark .modal-pivo-crud-footer {
            background-color: rgba(25, 39, 53, 0.5);
            border-top-color: var(--gcs-dark-border);
        }

        /* --- Botões AntD (Estilos globais) --- */
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
        body.dark .ant-input-number-input,
        body.dark .ant-input-number,
        body.dark .ant-select-selector {
            background: var(--gcs-dark-bg-transparent) !important;
            border: 1px solid var(--gcs-dark-border) !important;
            color: var(--gcs-dark-text-primary) !important;
        }
        body.dark .ant-input:focus,
        body.dark .ant-input-focused,
        body.dark .ant-input-number-focused,
        body.dark .ant-select-focused .ant-select-selector {
            border-color: var(--gcs-dark-border-hover) !important;
            box-shadow: none !important;
        }
        body.dark .ant-input::placeholder,
        body.dark .ant-input-number-input::placeholder {
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
        
        /* CORREÇÃO MODO ESCURO */
        body.dark .ant-alert-error {
            background-color: rgba(217, 83, 79, 0.1) !important;
            border: 1px solid rgba(217, 83, 79, 0.3) !important;
        }
        body.dark .ant-alert-error .ant-alert-message {
            color: #F87171 !important;
        }
        body.dark .ant-alert-error .ant-alert-description p {
             color: var(--gcs-dark-text-secondary);
        }
        body.dark .ant-alert-error .ant-alert-description strong {
             color: var(--gcs-dark-text-primary);
        }
        /* FIM CORREÇÃO */
      `}</style>

      <div 
        className="modal-pivo-crud-backdrop"
        onClick={onClose}
      ></div>
      
      <div
        ref={modalRef}
        className="modal-pivo-crud-glass"
        style={{
            top: position.y,
            left: position.x,
        }}
      >
          <div
            onMouseDown={handleMouseDown}
            className="modal-pivo-crud-header"
          >
            {modalTitle}
            <button onClick={onClose} className="modal-pivo-crud-close-btn" aria-label="Fechar">×</button>
          </div>

          <div className="modal-pivo-crud-content-wrapper">
              <Spin spinning={isSaving} tip="Processando...">
                  <div className="modal-pivo-crud-content-scrollable">

                    {/* --- Conteúdo do Modal --- */}
                    
                    {mode === 'delete' ? (
                      // --- MODO EXCLUIR ---
                      <Alert
                        message="Confirmação de Exclusão"
                        description={
                          <p>
                            Você tem certeza que deseja excluir o item: <br />
                            <strong>ID: {initialData?.id} - {initialData?.nome}</strong>
                            <br /><br />
                            Esta ação não poderá ser desfeita.
                          </p>
                        }
                        type="error"
                        showIcon
                        icon={<AlertTriangle size={24} />}
                      />
                    ) : (
                      // --- MODO ADICIONAR / EDITAR ---
                      <Form form={form} layout="vertical" name="form_in_modal">
                        
                        <Form.Item
                          name="nome"
                          label="Nome do Pivô/Talhão"
                          // ATUALIZAÇÃO: Adiciona normalize (uppercase) e validador customizado
                          normalize={normalizeUpper}
                          rules={[{ validator: validateNome }]}
                        >
                          <Input placeholder="Ex: PIVO 001" />
                        </Form.Item>
                        
                        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px'}}>
                          <Form.Item
                            name="safra"
                            label="Safra"
                            rules={[{ required: true, message: 'Por favor, insira a safra.' }]}
                            normalize={normalizeUpper} // <-- ATUALIZAÇÃO
                          >
                            <Input placeholder="Ex: 2024/25" />
                          </Form.Item>

                          <Form.Item
                            name="status"
                            label="Status"
                            rules={[{ required: true, message: 'Por favor, selecione o status.' }]}
                          >
                            <Select>
                              <Option value="Aberto">Aberto</Option>
                              <Option value="Inativo">Inativo</Option>
                            </Select>
                          </Form.Item>
                        </div>
                        
                        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px'}}>
                            <Form.Item
                                name="bloco"
                                label="Bloco"
                                normalize={normalizeUpper} // <-- ATUALIZAÇÃO
                            >
                                <Input placeholder="Ex: Bloco A" />
                            </Form.Item>

                            <Form.Item
                                name="ha"
                                label="Área (ha)"
                                rules={[{ type: 'number', message: 'Deve ser um número.' }]}
                            >
                                <InputNumber min={0} style={{ width: '100%' }} placeholder="Ex: 63.10" decimalSeparator="," />
                            </Form.Item>
                        </div>

                        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px'}}>
                            <Form.Item
                                name="cultura"
                                label="Cultura"
                                normalize={normalizeUpper} // <-- ATUALIZAÇÃO
                            >
                                <Input placeholder="Ex: Soja" />
                            </Form.Item>

                            <Form.Item
                                name="variedade"
                                label="Variedade"
                                normalize={normalizeUpper} // <-- ATUALIZAÇÃO
                            >
                                <Input placeholder="Ex: TMG 7062 IPRO" />
                            </Form.Item>
                        </div>
                      </Form>
                    )}

                  </div>
              </Spin>
          </div>
          
          <div className="modal-pivo-crud-footer">
            <Button 
                key="back" 
                onClick={onClose} 
                disabled={isSaving}
                className="btn-cancelar-laranja" // Botão Laranja
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

export default ModalPivo;