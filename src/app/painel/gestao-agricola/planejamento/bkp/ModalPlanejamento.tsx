/*
 * =========================================================================
 * MODAL DE CONFIRMAÇÃO DE EXCLUSÃO
 * =========================================================================
 * - ATUALIZADO: Este modal agora é usado APENAS para confirmar a
 * exclusão de um plano de cultivo.
 * =========================================================================
 */
"use client";

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Form, Input, Select, Button, Spin, Alert, Modal as AntModal } from 'antd';
import { AlertTriangle, Edit, Plus, Trash2, ClipboardList } from 'lucide-react';

const { Option } = Select;
const { TextArea } = Input;

// --- INTERFACE DO CABEÇALHO (plano_cultivo) ---
interface PlanejamentoCabec {
  id: number;
  safra: string;
  descricao: string;
  status: 'Aberto' | 'Inativo';
  observacao: string | null;
  [key: string]: any;
}

interface ModalPlanejamentoProps {
  visible: boolean;
  mode: 'delete'; // Este modal só trata de 'delete'
  initialData: Partial<PlanejamentoCabec> | null;
  onClose: () => void;
  onSave: (data: any, mode: 'delete') => Promise<void>;
  isSaving: boolean;
}

// =========================================================================
// --- COMPONENTE DO MODAL ---
// =========================================================================

const ModalPlanejamento: React.FC<ModalPlanejamentoProps> = ({ visible, mode, initialData, onClose, onSave, isSaving }) => {
  const [form] = Form.useForm();
  
  const modalRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);


  // Efeito para centralizar o modal ao abrir
  useEffect(() => {
    if (visible && modalRef.current) {
        const modal = modalRef.current;
        const initialX = (window.innerWidth - modal.offsetWidth) / 2;
        const initialY = 40;
        setPosition({ x: initialX > 0 ? initialX : 20, y: initialY });
    }
  }, [visible]);

  // --- Lógica de Arrastar ---
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


  // --- Handler para fechar (simplificado) ---
  const handleTryClose = () => {
    if (isSaving) return; 
    onClose();
  };

  // Handler para confirmar a exclusão (Delete)
  const handleDelete = () => {
    if (initialData?.id) {
      onSave(initialData, 'delete'); 
    }
  };

  // --- Títulos e Ícones (Apenas Delete) ---
  const config = {
    delete: {
      title: 'Excluir Plano de Cultivo',
      icon: <AlertTriangle size={20} color="var(--gcs-brand-red, #d9534f)" />,
      okText: 'Sim, Excluir',
      okColor: 'var(--gcs-brand-red, #d9534f)',
    },
  };
  
  const currentConfig = config['delete'];

  const modalTitle = (
    <div className="modal-planejamento-add-title">
      <span className="modal-planejamento-add-icon-wrapper">{currentConfig.icon}</span>
      <span>{currentConfig.title}</span>
    </div>
  );

  if (!visible) return null;

  return (
    <>
      {/* --- ESTILOS (Copiado de ModalVariedade) --- */}
      <style>{`
        /* --- Variáveis --- */
        :root {
            --gcs-blue: #00314A;
            --gcs-blue-light: #1b4c89;
            --gcs-orange: #F58220;
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
        .modal-planejamento-add-backdrop {
            position: fixed;
            top: 0; left: 0;
            width: 100vw; height: 100vh;
            background-color: rgba(0,0,0,0.4);
            z-index: 2147483646;
        }
        .modal-planejamento-add-glass {
            position: fixed;
            border-radius: 12px;
            width: 90%;
            max-width: 500px;
            min-height: 250px; /* Menor */
            max-height: 90vh;
            display: flex;
            flex-direction: column;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            z-index: 2147483647;
            transition: background 0.3s ease, border 0.3s ease, box-shadow 0.3s ease;
        }
        body.light .modal-planejamento-add-glass {
            background: #fff;
            border: 1px solid #dee2e6;
        }
        body.dark .modal-planejamento-add-glass {
            background: var(--gcs-dark-bg-heavy);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border: 1px solid var(--gcs-dark-border);
        }

        /* --- Modal Header --- */
        .modal-planejamento-add-header {
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
        body.light .modal-planejamento-add-header {
            background-color: var(--gcs-gray-light);
            border-bottom-color: #dee2e6;
        }
        body.dark .modal-planejamento-add-header {
            background-color: rgba(25, 39, 53, 0.5);
            border-bottom-color: var(--gcs-dark-border);
        }
        .modal-planejamento-add-title {
            font-size: 1.2rem;
            font-weight: bold;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        body.light .modal-planejamento-add-title { color: var(--gcs-blue); }
        body.dark .modal-planejamento-add-title,
        body.dark .modal-planejamento-add-icon-wrapper svg { 
            color: var(--gcs-dark-text-primary) !important; 
        }
        
        .modal-planejamento-add-close-btn {
            background: none;
            border: none;
            font-size: 1.75rem;
            cursor: pointer;
            padding: 0;
            line-height: 1;
        }
        body.light .modal-planejamento-add-close-btn { color: var(--gcs-dark-text); }
        body.dark .modal-planejamento-add-close-btn { color: var(--gcs-dark-text-secondary); }
        body.dark .modal-planejamento-add-close-btn:hover { color: var(--gcs-dark-text-primary); }

        /* --- Modal Content --- */
        .modal-planejamento-add-content-wrapper {
            flex-grow: 1;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        }
        .modal-planejamento-add-content-scrollable {
            flex-grow: 1;
            overflow-y: auto;
            padding: 1.5rem;
        }
        body.dark .ant-spin-container,
        body.dark .ant-alert {
            background: transparent !important;
        }
        
        /* --- Modal Footer --- */
        .modal-planejamento-add-footer {
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
        body.light .modal-planejamento-add-footer {
            background-color: var(--gcs-gray-light);
            border-top-color: #dee2e6;
        }
        body.dark .modal-planejamento-add-footer {
            background-color: rgba(25, 39, 53, 0.5);
            border-top-color: var(--gcs-dark-border);
        }

        /* --- Botões AntD --- */
        .btn-cancelar-laranja {
            background-color: var(--gcs-orange) !important;
            border-color: var(--gcs-orange) !important;
            color: white !important;
            font-weight: 600;
        }
        .btn-cancelar-laranja:hover:not(:disabled) {
            background-color: #d17814 !important;
            border-color: #d17814 !important;
        }
        
        .ant-btn-primary[style*="var(--gcs-brand-red)"] {
             background-color: var(--gcs-brand-red);
             border-color: var(--gcs-brand-red);
        }
         .ant-btn-primary[style*="var(--gcs-brand-red)"]:hover:not(:disabled) {
             background-color: #b01725;
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
      `}</style>

      <div 
        className="modal-planejamento-add-backdrop"
        onClick={handleTryClose}
      ></div>
      
      <div
        ref={modalRef}
        className="modal-planejamento-add-glass"
        style={{
            top: position.y,
            left: position.x,
        }}
      >
          <div
            onMouseDown={handleMouseDown}
            className="modal-planejamento-add-header"
          >
            {modalTitle}
            <button onClick={handleTryClose} className="modal-planejamento-add-close-btn" disabled={isSaving}>×</button>
          </div>

          <div className="modal-planejamento-add-content-wrapper">
              <div className="modal-planejamento-add-content-scrollable">
                
                  {/* --- MODO EXCLUIR --- */}
                  <div className="delete-confirmation-box">
                    <Alert
                        message="Confirmação de Exclusão"
                        description={
                          <p>
                            Você tem certeza que deseja excluir o plano: <br />
                            <strong>ID: {initialData?.id} - {initialData?.descricao}</strong>
                            <br /><br />
                            Esta ação não poderá ser desfeita.
                          </p>
                        }
                        type="error"
                        showIcon
                        icon={<AlertTriangle size={24} />}
                    />
                  </div>
              </div>
          </div>
          
          <div className="modal-planejamento-add-footer">
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
              onClick={handleDelete}
              style={{ backgroundColor: currentConfig.okColor, borderColor: currentConfig.okColor }}
            >
              {currentConfig.okText}
            </Button>
          </div>
      </div>
    </>
  );
};

export default ModalPlanejamento;