/*
 * =========================================================================
 * MODAL DE DETALHES (LEITURA) PARA VARIEDADES
 * =========================================================================
 * ATUALIZAÇÃO:
 * - Layout e CSS migrados para o padrão "Glassmorfismo" (baseado no ModalPivoDetalhes.tsx).
 * - Campos do <Descriptions> atualizados para a API real (Obtentor, Ciclo, etc.).
 * - Removido o helper de data, pois a API de lista não possui datas.
 * =========================================================================
 */
"use client";

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Button, Descriptions, Tag } from 'antd'; // Importa do AntD
import { Eye } from 'lucide-react';
import { createPortal } from 'react-dom';

// --- Interface da Variedade (baseada na API real) ---
interface Variedade {
  id: number;
  nome: string; // nome_comercial
  cultura: string;
  obtentor: string;
  ciclo_maturacao_dias: number;
  status: 'Aberto' | 'Inativo';
  [key: string]: any;
}

interface ModalVariedadeDetalhesProps {
  visible: boolean;
  onClose: () => void;
  item: Partial<Variedade> | null;
}

const ModalVariedadeDetalhes: React.FC<ModalVariedadeDetalhesProps> = ({ visible, onClose, item }) => {
  const [isBrowser, setIsBrowser] = useState(false);
  
  // --- Lógica de Drag (Arraste) ---
  const modalRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    setIsBrowser(true);
  }, []);

  // Efeito para centralizar o modal ao abrir (apenas uma vez)
  useEffect(() => {
    if (visible && modalRef.current) {
        const modal = modalRef.current;
        const initialX = (window.innerWidth - modal.offsetWidth) / 2;
        const initialY = 40; // Um pouco abaixo do topo
        setPosition({ x: initialX > 0 ? initialX : 20, y: initialY });
    }
  }, [visible]);

  // --- Lógica de Arrastar (do gabarito ModalPivo) ---
  const handleMouseDown = (e: React.MouseEvent) => {
      if (modalRef.current) {
          const target = e.target as HTMLElement;
          if (target.closest('.ant-descriptions-item-content') || target.tagName === 'BUTTON') {
              return;
          }
          setIsDragging(true);
          const modalRect = modalRef.current.getBoundingClientRect();
          setOffset({
              x: e.clientX - modalRect.left,
              y: e.clientY - modalRect.top
          });
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


  if (!visible || !item || !isBrowser) return null;

  const modalTitle = (
    <div className="modal-variedade-detalhes-title">
      <Eye size={20} />
      <span>Detalhes da Variedade (ID: {item.id})</span>
    </div>
  );
  
  const modalContent = (
    <>
      {/* --- ESTILOS (Baseado no ModalPivoDetalhes.tsx) --- */}
      <style global jsx>{`
        /* --- Variáveis --- */
        :root {
            --gcs-blue: #00314A;
            --gcs-orange: #FF7F00; /* Laranja GCS */
            --gcs-gray-light: #f1f5fb;
            --gcs-gray-border: #d0d7e2;
            --gcs-dark-text: #333;
            --gcs-dark-bg-heavy: rgba(25, 39, 53, 0.85);
            --gcs-dark-border: rgba(125, 173, 222, 0.2);
            --gcs-dark-text-primary: #F1F5F9;
            --gcs-dark-text-secondary: #CBD5E1;
        }
        
        /* --- Base Modal --- */
        .modal-variedade-detalhes-backdrop {
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background-color: rgba(0,0,0,0.6); z-index: 2147483646;
        }
        .modal-variedade-detalhes-glass {
            position: fixed; border-radius: 12px; width: 90%; max-width: 600px;
            max-height: 90vh; display: flex; flex-direction: column;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2); z-index: 2147483647;
        }
        body.light .modal-variedade-detalhes-glass { background: #fff; border: 1px solid #dee2e6; }
        body.dark .modal-variedade-detalhes-glass { 
            background: var(--gcs-dark-bg-heavy); backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px); border: 1px solid var(--gcs-dark-border);
        }

        /* --- Modal Header --- */
        .modal-variedade-detalhes-header {
            padding: 1.5rem; border-bottom: 1px solid; flex-shrink: 0; cursor: move;
            border-top-left-radius: 12px; border-top-right-radius: 12px;
            display: flex; justify-content: space-between; align-items: center;
        }
        /* Header Estilo "Glass" (do gabarito Pivô) */
        body.light .modal-variedade-detalhes-header {
            background-color: var(--gcs-gray-light);
            border-bottom-color: #dee2e6;
        }
        body.dark .modal-variedade-detalhes-header {
            background-color: rgba(25, 39, 53, 0.5);
            border-bottom-color: var(--gcs-dark-border);
        }
        .modal-variedade-detalhes-title {
            font-size: 1.2rem; font-weight: bold; display: flex; align-items: center; gap: 10px;
        }
        body.light .modal-variedade-detalhes-title { color: var(--gcs-blue); }
        body.dark .modal-variedade-detalhes-title { color: var(--gcs-dark-text-primary); }
        body.dark .modal-variedade-detalhes-title svg { color: var(--gcs-dark-text-primary) !important; }
        
        .modal-variedade-detalhes-close-btn {
            background: none; border: none; font-size: 1.75rem; cursor: pointer; padding: 0; line-height: 1;
        }
        body.light .modal-variedade-detalhes-close-btn { color: var(--gcs-dark-text); }
        body.dark .modal-variedade-detalhes-close-btn { color: var(--gcs-dark-text-secondary); }

        /* --- Modal Content / Footer --- */
        .modal-variedade-detalhes-content-wrapper { flex-grow: 1; overflow: hidden; display: flex; flex-direction: column; }
        .modal-variedade-detalhes-content-scrollable { flex-grow: 1; overflow-y: auto; padding: 1.5rem; }
        .modal-variedade-detalhes-footer {
            padding: 1rem 1.5rem; border-top: 1px solid; flex-shrink: 0;
            border-bottom-left-radius: 12px; border-bottom-right-radius: 12px;
            display: flex; justify-content: flex-end; gap: 8px;
        }
        body.light .modal-variedade-detalhes-footer {
            background-color: var(--gcs-gray-light);
            border-top-color: #dee2e6;
        }
        body.dark .modal-variedade-detalhes-footer {
            background-color: rgba(25, 39, 53, 0.5);
            border-top-color: var(--gcs-dark-border);
        }

        /* --- Botão Laranja --- */
        .btn-fechar-laranja {
            background-color: var(--gcs-orange) !important;
            border-color: var(--gcs-orange) !important;
            color: white !important;
            font-weight: 600;
        }
        .btn-fechar-laranja:hover:not(:disabled) { background-color: #e57300 !important; border-color: #e57300 !important; }

        /* --- Estilos AntD Descriptions (do gabarito Pivô) --- */
        body.light .ant-descriptions-bordered .ant-descriptions-view {
            border: 1px solid var(--gcs-gray-border) !important; border-radius: 8px;
        }
        body.light .ant-descriptions-bordered .ant-descriptions-item-label {
             background-color: var(--gcs-gray-light); font-weight: 600;
        }
        body.dark .ant-descriptions-bordered .ant-descriptions-view {
            border: 1px solid var(--gcs-dark-border) !important; border-radius: 8px;
        }
        body.dark .ant-descriptions-bordered .ant-descriptions-item-label {
            background-color: rgba(25, 39, 53, 0.5) !important;
            color: var(--gcs-dark-text-primary) !important; font-weight: 600;
        }
        body.dark .modal-variedade-detalhes-glass .ant-descriptions-bordered .ant-descriptions-item-content {
             color: var(--gcs-dark-text-secondary, #CBD5E1) !important;
        }
        
        /* Status Tags */
        .ant-tag-green { background-color: #e6ffed !important; color: #52c41a !important; border-color: #b7eb8f !important; }
        .ant-tag-red { background-color: #fff1f0 !important; color: #ff4d4f !important; border-color: #ffa39e !important; }
        body.dark .ant-tag-green { background-color: #1d3900 !important; color: #95de64 !important; border-color: #1d3900 !important; }
        body.dark .ant-tag-red { background-color: #5c0000 !important; color: #ff7875 !important; border-color: #5c0000 !important; }
      `}</style>

      <div 
        className="modal-variedade-detalhes-backdrop"
        onClick={onClose}
      ></div>
      
      <div
        ref={modalRef}
        className="modal-variedade-detalhes-glass"
        style={{
            top: position.y,
            left: position.x,
        }}
      >
          <div
            onMouseDown={handleMouseDown}
            className="modal-variedade-detalhes-header"
          >
            {modalTitle}
            <button onClick={onClose} className="modal-variedade-detalhes-close-btn" aria-label="Fechar">×</button>
          </div>

          <div className="modal-variedade-detalhes-content-wrapper">
              <div className="modal-variedade-detalhes-content-scrollable">

                {/* ================================================================== */}
                {/* ===               📌 ALTERAÇÃO REALIZADA AQUI                === */}
                {/* ================================================================== */}
                {/* Campos atualizados para a API real */}
                <Descriptions bordered column={2} size="small">
                    <Descriptions.Item label="ID" span={1}>{item.id || '—'}</Descriptions.Item>
                    <Descriptions.Item label="Status" span={1}>
                      <Tag color={item.status === 'Aberto' ? 'green' : 'red'}>
                        {item.status}
                      </Tag>
                    </Descriptions.Item>

                    <Descriptions.Item label="Nome Comercial" span={2}>{item.nome || '—'}</Descriptions.Item>
                    
                    <Descriptions.Item label="Cultura" span={2}>
                        {item.cultura || '—'}
                    </Descriptions.Item>
                    
                    <Descriptions.Item label="Obtentor" span={1}>
                      {item.obtentor || '—'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Ciclo (dias)" span={1}>
                      {item.ciclo_maturacao_dias || '—'}
                    </Descriptions.Item>
                </Descriptions>
                {/* ================================================================== */}
                {/* ===                       FIM DA ALTERAÇÃO                     === */}
                {/* ================================================================== */}

              </div>
          </div>
          
          <div className="modal-variedade-detalhes-footer">
            <Button 
                key="back" 
                onClick={onClose}
                className="btn-fechar-laranja"
            >
              Fechar
            </Button>
          </div>
      </div>
    </>
  );

  return createPortal(modalContent, document.body);
};

export default ModalVariedadeDetalhes;