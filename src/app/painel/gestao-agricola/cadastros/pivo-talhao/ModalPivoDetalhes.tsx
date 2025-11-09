/*
 * =========================================================================
 * MODAL DE DETALHES (LEITURA)
 * =========================================================================
 * - ATUALIZADO: Agora usa o layout de Glasmorfismo do seu exemplo.
 * - ATUALIZADO: Implementada a lógica de arrastar (drag).
 * - ATUALIZADO: Botões e estilos (light/dark) baseados no seu CSS.
 * - CORREÇÃO (Modo Escuro): Texto do conteúdo (como 'Pivô 01')
 * agora é branco, corrigindo o problema de legibilidade.
 * =========================================================================
 */
"use client";

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Descriptions, Tag, Button } from 'antd'; // Mantém Descriptions e Tag
import { Eye } from 'lucide-react';

// Interface completa do item (baseada no page.tsx)
interface PivoTalhao {
  id: number;
  key: string;
  nome: string;
  safra: string;
  bloco: string | null;
  ha: number | null;
  cultura: string | null;
  variedade: string | null;
  status: string; // "Aberto" ou "Inativo"
  status_original: 'A' | 'I';
  dt_inclusao: string;
  dt_alteracao: string | null;
  filial?: string;
  gid_telemetria?: string;
  kml?: string;
  [key: string]: any;
}

// Helper de Data (copiado do page.tsx para autonomia)
const formatProtheusDateTime = (dateString: string | null | undefined): string => {
    if (!dateString) return '—';
    try {
        const dateTest = new Date(dateString);
        if (isNaN(dateTest.getTime())) {
            if (dateString.length === 8) {
                const year = dateString.substring(0, 4);
                const month = dateString.substring(4, 6);
                const day = dateString.substring(6, 8);
                return `${day}/${month}/${year}`;
            }
            return '—';
        }
        const year = dateString.substring(0, 4);
        const month = dateString.substring(5, 7);
        const day = dateString.substring(8, 10);
        if(dateString.length >= 16) {
            const hour = dateString.substring(11, 13);
            const minute = dateString.substring(14, 16);
            return `${day}/${month}/${year} ${hour}:${minute}`;
        }
        return `${day}/${month}/${year}`;
    } catch (error) {
        return '—';
    }
};

interface ModalPivoDetalhesProps {
  visible: boolean;
  onClose: () => void;
  item: Partial<PivoTalhao> | null;
}

const ModalPivoDetalhes: React.FC<ModalPivoDetalhesProps> = ({ visible, onClose, item }) => {
  // --- Hooks de Arrastar (do seu exemplo) ---
  const modalRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  // Efeito para centralizar o modal ao abrir
  useEffect(() => {
    if (visible && modalRef.current) {
        const modal = modalRef.current;
        const modalWidth = 700; // Largura do modal de detalhes
        const initialX = (window.innerWidth - modalWidth) / 2;
        const initialY = 40; 
        setPosition({ x: initialX > 0 ? initialX : 20, y: initialY });
    }
  }, [visible]);

  // --- Lógica de Arrastar (do seu exemplo) ---
  const handleMouseDown = (e: React.MouseEvent) => {
      if (modalRef.current) {
          const target = e.target as HTMLElement;
          // Impede o "arrastar" ao clicar em botões
          if (target.tagName === 'BUTTON' || target.closest('button')) {
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


  if (!visible || !item) return null;

  const modalTitle = (
    <div className="modal-pivo-detalhes-title">
      <Eye size={20} color={'var(--gcs-blue)'} />
      <span>Detalhes do Item (ID: {item.id})</span>
    </div>
  );

  return (
    <>
      {/* --- ESTILOS DO ModalSafra_exemplo.tsx --- */}
      {/* Classes renomeadas para '.modal-pivo-detalhes-' */}
      <style>{`
        :root {
            --gcs-blue: #00314A;
            --gcs-orange: #F58220;
            --gcs-gray-light: #f1f5fb;
            --gcs-dark-text: #333;
            --gcs-dark-bg-heavy: rgba(25, 39, 53, 0.85);
            --gcs-dark-border: rgba(125, 173, 222, 0.2);
            --gcs-dark-text-primary: #F1F5F9;
            --gcs-dark-text-secondary: #CBD5E1;
        }
        
        /* --- Base Modal --- */
        .modal-pivo-detalhes-backdrop {
            position: fixed;
            top: 0; left: 0;
            width: 100vw; height: 100vh;
            background-color: rgba(0,0,0,0.4);
            z-index: 2147483646;
        }
        .modal-pivo-detalhes-glass {
            position: fixed;
            border-radius: 12px;
            width: 90%;
            max-width: 700px; /* <-- Largura deste modal */
            min-height: 300px;
            max-height: 90vh;
            display: flex;
            flex-direction: column;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            z-index: 2147483647;
            transition: background 0.3s ease, border 0.3s ease, box-shadow 0.3s ease;
        }
        body.light .modal-pivo-detalhes-glass {
            background: #fff;
            border: 1px solid #dee2e6;
        }
        body.dark .modal-pivo-detalhes-glass {
            background: var(--gcs-dark-bg-heavy);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border: 1px solid var(--gcs-dark-border);
        }

        /* --- Modal Header --- */
        .modal-pivo-detalhes-header {
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
        body.light .modal-pivo-detalhes-header {
            background-color: var(--gcs-gray-light);
            border-bottom-color: #dee2e6;
        }
        body.dark .modal-pivo-detalhes-header {
            background-color: rgba(25, 39, 53, 0.5);
            border-bottom-color: var(--gcs-dark-border);
        }
        .modal-pivo-detalhes-title {
            font-size: 1.2rem;
            font-weight: bold;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        body.light .modal-pivo-detalhes-title { color: var(--gcs-blue); }
        body.dark .modal-pivo-detalhes-title { color: var(--gcs-dark-text-primary); }
        body.dark .modal-pivo-detalhes-title svg { color: var(--gcs-dark-text-primary) !important; }
        
        .modal-pivo-detalhes-close-btn {
            background: none;
            border: none;
            font-size: 1.75rem;
            cursor: pointer;
            padding: 0;
            line-height: 1;
        }
        body.light .modal-pivo-detalhes-close-btn { color: var(--gcs-dark-text); }
        body.dark .modal-pivo-detalhes-close-btn { color: var(--gcs-dark-text-secondary); }
        body.dark .modal-pivo-detalhes-close-btn:hover { color: var(--gcs-dark-text-primary); }

        /* --- Modal Content --- */
        .modal-pivo-detalhes-content-wrapper {
            flex-grow: 1;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        }
        .modal-pivo-detalhes-content-scrollable {
            flex-grow: 1;
            overflow-y: auto;
            padding: 1.5rem;
        }
        
        /* --- Modal Footer --- */
        .modal-pivo-detalhes-footer {
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
        body.light .modal-pivo-detalhes-footer {
            background-color: var(--gcs-gray-light);
            border-top-color: #dee2e6;
        }
        body.dark .modal-pivo-detalhes-footer {
            background-color: rgba(25, 39, 53, 0.5);
            border-top-color: var(--gcs-dark-border);
        }

        /* --- Botão Laranja --- */
        .btn-cancelar-laranja {
            background-color: var(--gcs-orange) !important;
            border-color: var(--gcs-orange) !important;
            color: white !important;
        }
        .btn-cancelar-laranja:hover:not(:disabled) {
            background-color: #d17814 !important;
            border-color: #d17814 !important;
        }

        /* --- Estilos AntD Descriptions --- */
        body.dark .ant-descriptions-view {
            border: 1px solid var(--gcs-dark-border) !important;
            background: transparent; /* CORREÇÃO */
        }
        body.dark .ant-descriptions-item-label,
        body.dark .ant-descriptions-item-content {
            border-inline-end: 1px solid var(--gcs-dark-border) !important;
            border-bottom: 1px solid var(--gcs-dark-border) !important;
        }
        body.dark .ant-descriptions-row:last-child .ant-descriptions-item-label,
        body.dark .ant-descriptions-row:last-child .ant-descriptions-item-content {
             border-bottom: none !important;
        }
        body.dark .ant-descriptions-item-label {
            background-color: rgba(25, 39, 53, 0.5) !important;
            color: var(--gcs-dark-text-primary);
            font-weight: 600;
        }
        /* CORREÇÃO MODO ESCURO (COM !important) */
        body.dark .ant-descriptions-item-content {
             color: var(--gcs-dark-text-secondary) !important;
        }
        /* FIM CORREÇÃO */
        
        body.dark .ant-tag {
            color: var(--gcs-dark-text-primary) !important;
            background: var(--gcs-dark-bg-transparent) !important;
            border-color: var(--gcs-dark-border) !important;
        }
      `}</style>

      <div 
        className="modal-pivo-detalhes-backdrop"
        onClick={onClose}
      ></div>
      
      <div
        ref={modalRef}
        className="modal-pivo-detalhes-glass"
        style={{
            top: position.y,
            left: position.x,
        }}
      >
          <div
            onMouseDown={handleMouseDown}
            className="modal-pivo-detalhes-header"
          >
            {modalTitle}
            <button onClick={onClose} className="modal-pivo-detalhes-close-btn" aria-label="Fechar">×</button>
          </div>

          <div className="modal-pivo-detalhes-content-wrapper">
              <div className="modal-pivo-detalhes-content-scrollable">

                {/* --- Conteúdo do Modal --- */}
                <Descriptions bordered column={2} size="small">
                    <Descriptions.Item label="Nome" span={2}>{item.nome || '—'}</Descriptions.Item>
                    
                    <Descriptions.Item label="Status">
                      <Tag color={item.status === 'Aberto' ? 'green' : 'red'}>
                        {item.status}
                      </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Safra">{item.safra || '—'}</Descriptions.Item>

                    <Descriptions.Item label="Bloco">{item.bloco || '—'}</Descriptions.Item>
                    <Descriptions.Item label="Área (ha)">
                      {item.ha ? item.ha.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                    </Descriptions.Item>

                    <Descriptions.Item label="Cultura">{item.cultura || '—'}</Descriptions.Item>
                    <Descriptions.Item label="Variedade">{item.variedade || '—'}</Descriptions.Item>
                    
                    <Descriptions.Item label="Filial">{item.filial || '—'}</Descriptions.Item>
                    <Descriptions.Item label="GID Telemetria">{item.gid_telemetria || '—'}</Descriptions.Item>
                    
                    <Descriptions.Item label="Data Inclusão" span={1}>
                      {formatProtheusDateTime(item.dt_inclusao)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Data Alteração" span={1}>
                      {formatProtheusDateTime(item.dt_alteracao)}
                    </Descriptions.Item>

                    <Descriptions.Item label="KML" span={2}>
                      {item.kml ? "Sim" : "Não"}
                    </Descriptions.Item>
                </Descriptions>

              </div>
          </div>
          
          <div className="modal-pivo-detalhes-footer">
            <Button 
                key="back" 
                onClick={onClose} 
                className="btn-cancelar-laranja" // Botão Laranja
            >
              Fechar
            </Button>
          </div>
      </div>
    </>
  );
};

export default ModalPivoDetalhes;