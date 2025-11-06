
"use client";

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Form, Input, Select, Button, Spin } from 'antd'; 
import { Plus } from 'lucide-react';
import { LoadingOutlined } from '@ant-design/icons';

const { Option } = Select;

// --- Listas Chumbadas (Hardcoded) ---
const FILIAIS = [
  { value: '0401', label: '0401 - Piaui' },
  { value: '0402', label: '0402 - Bahia' },
];
const CULTURAS = [
  { value: 'ALGODAO', label: 'ALGODAO' },
  { value: 'SOJA', label: 'SOJA' },
  { value: 'MILHO GRAO', label: 'MILHO GRAO' },
  { value: 'MILHETO', label: 'MILHETO' },
  { value: 'FEIJAO', label: 'FEIJAO' },
  { value: 'SORGO', label: 'SORGO' },
];
// --- Fim das Listas ---

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: any) => void; // A função onSave envia os dados { filial, cultura }
  isSaving: boolean;
  positionHint: { x: number, y: number } | null; // <-- Prop de posição
}

// Interface dos dados do formulário
interface CulturaFormData {
    filial: string;
    cultura: string;
}

const ModalAddCultura: React.FC<ModalProps> = ({ visible, onClose, onSave, isSaving, positionHint }) => {
  const [form] = Form.useForm();
  
  // --- Refs ---
  const modalContentRef = useRef<HTMLDivElement>(null); 
  
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  // --- *** INÍCIO DA CORREÇÃO DE POSICIONAMENTO *** ---
  
  // Flag para garantir que a posição seja calculada apenas uma vez
  const [isPositioned, setIsPositioned] = useState(false); 

  // 1. Lógica de posicionamento (Callback Ref)
  const modalRef = useCallback((node: HTMLDivElement | null) => {
    // Esta função é chamada pelo React quando o 'ref' é anexado (node) ou desanexado (null).
    
    // Só executa se o 'div' (node) existir e se a posição ainda não foi calculada
    // E se a positionHint (garantida pelo ListaCulturas) existir
    if (node !== null && !isPositioned && positionHint) {
      let posX = 0, posY = 0;
      
      const { clientWidth, clientHeight } = node;
      const initialX = positionHint.x + 5;
      const initialY = positionHint.y;
      
      posX = Math.max(10, Math.min(initialX, window.innerWidth - clientWidth - 10));
      posY = Math.max(10, Math.min(initialY, window.innerHeight - clientHeight - 10));
      
      setPosition({ x: posX, y: posY });
      setIsPositioned(true); // Marca como posicionado
    }
  }, [positionHint, isPositioned]); // Depende do 'hint' e do 'flag'

  // 2. Resetar o 'flag' quando o modal for fechado
  useEffect(() => {
    if (!visible) {
      setIsPositioned(false); // Reseta o flag para a próxima abertura
    }
  }, [visible]);

  // --- *** FIM DA CORREÇÃO DE POSICIONAMENTO *** ---

  // Limpa o formulário quando o modal é aberto
  useEffect(() => {
    if (visible) {
      form.resetFields();
    }
  }, [visible, form]);


  // --- Lógica de Arrastar (do ModalDetalhes_exemplo.tsx) ---
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
      const modalNode = e.currentTarget as HTMLDivElement;
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'BUTTON' || target.closest('button') || target.closest('.ant-select-selector')) {
          return;
      }
      setIsDragging(true);
      const modalRect = modalNode.getBoundingClientRect();
      setOffset({
          x: e.clientX - modalRect.left,
          y: e.clientY - modalRect.top
      });
      e.preventDefault();
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

  // Handler para submeter o formulário (Add)
  const handleSubmit = () => {
    form.validateFields()
      .then(values => {
          onSave(values as CulturaFormData);
      })
      .catch(info => {
        console.log('Validação falhou:', info);
      });
  };


  const modalTitle = (
    <div className="modal-add-cultura-title">
      <Plus size={20} color={'var(--gcs-blue)'} />
      <span>Incluir Nova Cultura</span>
    </div>
  );

  if (!visible) return null;

  return (
    <>
      {/* --- ESTILOS DO ModalSafra.tsx (Glassmorphism) --- */}
      <style>{`
        /* As classes foram renomeadas para não conflitarem com ModalCaderno */

        :root {
            --gcs-blue: #00314A;
            --gcs-blue-light: #1b4c89;
            --gcs-blue-lighter: #a3b8d1;
            --gcs-blue-sky: #7DD3FC;
            --gcs-pagination-blue: #3B82F6; 
            --gcs-green: #5FB246;
            --gcs-green-dark: #28a745;
            --gcs-gray-light: #f1f5fb;
            --gcs-gray-border: #d0d7e2;
            --gcs-gray-text: #6c757d;
            --gcs-dark-text: #333;
            --gcs-brand-red: #d9534f;
            --gcs-red-light: #fff0f0;
            --gcs-red-border: #f5c2c7;
            --gcs-red-text: #721c24;
            --gcs-dark-bg-transparent: rgba(25, 39, 53, 0.5);
            /* Tom mais escuro (0.95) para diferenciar do modal de fundo (0.85) */
            --gcs-dark-bg-heavy: rgba(25, 39, 53, 0.95); 
            --gcs-dark-border: rgba(125, 173, 222, 0.2);
            --gcs-dark-border-hover: rgba(125, 173, 222, 0.4);
            --gcs-dark-text-primary: #F1F5F9;
            --gcs-dark-text-secondary: #CBD5E1;
            --gcs-dark-text-tertiary: #94A3B8;
        }
        /* .animate-spin e @keyframes spin já estão definidos no ModalSafra e ModalCaderno */
        
        /* --- Base Modal (Classe renomeada) --- */
        .modal-add-cultura-glass {
            position: fixed;
            border-radius: 12px;
            width: 90%;
            max-width: 400px; 
            min-height: auto; 
            max-height: 90vh;
            display: flex;
            flex-direction: column;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            /* Z-index mais alto que o ModalCaderno (que é ...3647) */
            z-index: 2147483648; 
            
            /* Evita o "flash" na posição 0,0 */
            /* Se isPositioned for falso, ele fica invisível */
            opacity: ${isPositioned ? 1 : 0};
            transition: opacity 0.05s ease;
        }
        body.light .modal-add-cultura-glass {
            background: #fff;
            border: 1px solid #dee2e6;
        }
        body.dark .modal-add-cultura-glass {
            background: var(--gcs-dark-bg-heavy);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border: 1px solid var(--gcs-dark-border);
        }

        /* --- Modal Header (Classe renomeada) --- */
        .modal-add-cultura-header {
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
        body.light .modal-add-cultura-header {
            background-color: var(--gcs-gray-light);
            border-bottom-color: #dee2e6;
        }
        body.dark .modal-add-cultura-header {
            background-color: rgba(25, 39, 53, 0.5);
            border-bottom-color: var(--gcs-dark-border);
        }
        
        /* --- Modal Title (Classe renomeada) --- */
        .modal-add-cultura-title {
            font-size: 1.2rem;
            font-weight: bold;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        body.light .modal-add-cultura-title { color: var(--gcs-blue); }
        body.dark .modal-add-cultura-title { color: var(--gcs-dark-text-primary); }
        body.dark .modal-add-cultura-title svg { color: var(--gcs-dark-text-primary) !important; }
        
        /* --- Modal Close Btn (Classe renomeada) --- */
        .modal-add-cultura-close-btn {
            background: none;
            border: none;
            font-size: 1.75rem;
            cursor: pointer;
            padding: 0;
            line-height: 1;
        }
        body.light .modal-add-cultura-close-btn { color: var(--gcs-dark-text); }
        body.dark .modal-add-cultura-close-btn { color: var(--gcs-dark-text-secondary); }
        body.dark .modal-add-cultura-close-btn:hover { color: var(--gcs-dark-text-primary); }

        /* --- Modal Content (Classes renomeadas) --- */
        .modal-add-cultura-content-wrapper {
            overflow: hidden;
            display: flex;
            flex-direction: column;
        }
        .modal-add-cultura-content-scrollable {
            overflow-y: auto;
            padding: 1.5rem;
        }
        
        /* --- Modal Footer (Classe renomeada) --- */
        .modal-add-cultura-footer {
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
        body.light .modal-add-cultura-footer {
            background-color: var(--gcs-gray-light);
            border-top-color: #dee2e6;
        }
        body.dark .modal-add-cultura-footer {
            background-color: rgba(25, 39, 53, 0.5);
            border-top-color: var(--gcs-dark-border);
        }

        /* --- Estilos AntD (Globais) --- */
        
        body.light .ant-btn-default {
            background: #fff;
            color: var(--gcs-gray-dark);
            border-color: var(--gcs-border-color);
        }
        body.light .ant-btn-default:hover:not(:disabled) {
            background-color: var(--gcs-gray-light);
            border-color: var(--gcs-gray-dark);
        }
        
        body.dark .ant-btn-default {
            background: rgba(59, 130, 246, 0.15) !important; 
            color: var(--gcs-blue-sky) !important; 
            border-color: rgba(59, 130, 246, 0.3) !important;
        }
        body.dark .ant-btn-default:hover:not(:disabled) {
            background: rgba(59, 130, 246, 0.25) !important;
            border-color: rgba(59, 130, 246, 0.5) !important;
        }
        
        body.dark .ant-btn-default[disabled] {
            background: rgba(59, 130, 246, 0.1) !important;
            border-color: rgba(59, 130, 246, 0.2) !important;
            color: rgba(125, 211, 252, 0.4) !important;
        }
        
        /* --- ESTILOS DE FORMULÁRIO DARK MODE ADICIONADOS --- */
        body.dark .ant-form-item-label > label {
            color: var(--gcs-dark-text-primary) !important;
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
        body.dark .ant-select-selection-placeholder {
            color: var(--gcs-dark-text-tertiary) !important;
        }

        body.dark .ant-select-arrow {
            color: var(--gcs-dark-text-tertiary) !important;
        }
        /* Dropdown do Select */
        body.dark .ant-select-dropdown {
            background: var(--gcs-dark-bg-heavy) !important;
            border: 1px solid var(--gcs-dark-border) !important;
            /* Z-index mais alto que o modal */
            z-index: 2147483649 !important; 
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
        
      `}</style>
      
      
      <div
        ref={modalRef}
        className="modal-add-cultura-glass"
        style={{
            top: position.y,
            left: position.x,
        }}
      >
          <div
            onMouseDown={handleMouseDown}
            className="modal-add-cultura-header"
          >
            {modalTitle}
            <button onClick={onClose} className="modal-add-cultura-close-btn">×</button>
          </div>

          <div className="modal-add-cultura-content-wrapper">
              <div 
                ref={modalContentRef} 
                className="modal-add-cultura-content-scrollable"
              >

                {/* --- MODO ADICIONAR / EDITAR --- */}
                <Form form={form} layout="vertical" name="form_add_cultura">
                  
                  <Form.Item
                    name="filial"
                    label="Filial"
                    rules={[{ required: true, message: 'Por favor, selecione a filial!' }]}
                  >
                    <Select 
                      placeholder="Selecione a filial..."
                      getPopupContainer={() => modalContentRef.current || document.body}
                    >
                        {FILIAIS.map(f => (
                            <Option key={f.value} value={f.value}>{f.label}</Option>
                        ))}
                    </Select>
                  </Form.Item>
                  
                  <Form.Item
                    name="cultura"
                    label="Cultura"
                    rules={[{ required: true, message: 'Por favor, selecione a cultura!' }]}
                  >
                    <Select 
                      placeholder="Selecione a cultura..."
                      getPopupContainer={() => modalContentRef.current || document.body}
                    >
                        {CULTURAS.map(c => (
                            <Option key={c.value} value={c.value}>{c.label}</Option>
                        ))}
                    </Select>
                  </Form.Item>

                </Form>

              </div>
          </div>
          
          <div className="modal-add-cultura-footer">
            <Button 
                key="back" 
                onClick={onClose} 
                disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button
              key="submit"
              type="primary"
              loading={isSaving} // Spinner embutido
              disabled={isSaving} // Desativa o botão
              onClick={handleSubmit}
              style={{ backgroundColor: 'var(--gcs-green-dark)', borderColor: 'var(--gcs-green-dark)' }}
            >
              Incluir
            </Button>
          </div>
      </div>
    </>
  );
};

export default ModalAddCultura;