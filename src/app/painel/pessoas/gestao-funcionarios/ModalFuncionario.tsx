"use client";

import React, { useEffect, useState, useCallback, useRef } from 'react';
// --- ATUALIZAÇÃO: Importa mais ícones e Spin ---
import { Button, Descriptions, Tag, Tabs, Spin } from 'antd';
import { 
    Eye, 
    CalendarClock, // Férias
    UserX,         // Rescisão
    FileText,      // Documentos
    ClipboardCheck, // Testes (Menu)
    BrainCircuit,  // Testes (Card)
    Download,      // Baixar
    Upload,        // Upload
    FileDigit,     // CNH/RG
    Home,          // Residência
    CheckCircle,   // Status OK
    XCircle,       // Status Faltando
    AlertCircle,   // Status Pendente
    CircleArrowRight, // Detalhe Férias
    CalendarDays,  // Detalhe Férias
    ThumbsUp,      // Detalhe Férias
    ThumbsDown,    // Detalhe Férias
    History,       // Histórico
    TrendingUp,    // Promoção
    Gavel,         // Ocorrências (Menu)
    Award,         // Reconhecimento (Bom)
    TriangleAlert, // Advertência (Ruim)
    Plus,          // (NOVO) Botão Adicionar
} from 'lucide-react';

// Interface do funcionário (baseada no page.tsx)
interface Funcionario {
  id: string; 
  key: string;
  Filial: string;
  "Grupo Filial": string;
  Matricula: string;
  Nome: string;
  "Data admissao": string;
  "Cod.Função": string;
  Função: string;
  "Cod.Centro de Custo": string;
  "Centro de Custo": string;
  "Cod.Departamento": string;
  Departamento: string;
  Grupo: string;
  Registro: string;
  [key: string]: any;
}

// --- ATUALIZAÇÃO: Nova Ordem do Menu de Gestão ---
type MenuGestao = 'documentos' | 'ferias' | 'historico' | 'ocorrencias' | 'testes' | 'rescisao';

// Helper de Data (copiado do page.tsx para autonomia)
const formatProtheusDateTime = (dateString: string | null | undefined): string => {
    if (!dateString) {
        return '—';
    }
    // Formato DD/MM/YYYY já vem pronto
    if (dateString.length === 10 && dateString[2] === '/') {
      return dateString;
    }
    return dateString; // Retorna o que veio se não reconhecer
};

interface ModalFuncionarioProps {
  visible: boolean;
  onClose: () => void;
  item: Funcionario | null;
}

// =========================================================================
// --- (INÍCIO) COMPONENTES MOCKADOS DAS ABAS ---
// =========================================================================

// --- 1. ABA DE FÉRIAS ---
// HOJE: 11/11/2025 (Admissão do mock: 14/06/2014)
const mockFerias = [
  // (NOVO) Período Atual (Verde) - Aquisitivo 14/06/2024 a 13/06/2025. Vence em 13/06/2026
  { id: 1, periodo: "2024/2025", dataLimite: "13/06/2026", totalDias: 30, tirados: 0, saldo: 30, status: "atual" },
  // (NOVO) Período Pendente (Amarelo) - Aquisitivo 14/06/2023 a 13/06/2024. Venceu em 13/06/2025 (URGENTE)
  { id: 2, periodo: "2023/2024", dataLimite: "13/06/2025", totalDias: 30, tirados: 20, saldo: 10, status: "pendente" },
  // (NOVO) Período Esgotado (Cinza) - Aquisitivo 14/06/2022 a 13/06/2023. Venceu em 13/06/2024
  { id: 3, periodo: "2022/2023", dataLimite: "13/06/2024", totalDias: 30, tirados: 30, saldo: 0, status: "esgotado" },
];

const AbaFerias: React.FC<{ item: Funcionario | null }> = ({ item }) => {
  return (
    <div className="ferias-container">
      {mockFerias.map((ferias) => (
        // ATUALIZAÇÃO: Usando data-status para a borda
        <div key={ferias.id} className="ferias-card" data-status={ferias.status}>
          <div className="ferias-card-header">
            <h3>Período Aquisitivo: {ferias.periodo}</h3>
            <span>Data Limite: {ferias.dataLimite}</span>
          </div>
          <div className="ferias-card-body">
            <div className="ferias-card-stats">
              <div className="stat-item">
                <CalendarDays size={20} />
                <strong>{ferias.totalDias}</strong>
                <span>Dias de Direito</span>
              </div>
              <div className="stat-item">
                <ThumbsUp size={20} />
                <strong>{ferias.tirados}</strong>
                <span>Dias Tirados</span>
              </div>
              <div className="stat-item">
                <CircleArrowRight size={20} />
                <strong>{ferias.saldo}</strong>
                <span>Dias de Saldo</span>
              </div>
            </div>
            
            <div className="ferias-card-actions">
              {ferias.saldo > 0 ? (
                <button className="btn-marcar-ferias">
                  <CalendarClock size={16} />
                  Marcar Férias
                </button>
              ) : (
                <button className="btn-marcar-ferias btn-ferias-esgotado" disabled>
                  <ThumbsDown size={16} />
                  Saldo Esgotado
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// --- 2. ABA DE RESCISÃO ---
const AbaRescisao: React.FC<{ item: Funcionario | null }> = ({ item }) => {
  return (
    <div className="rescisao-container">
      <p>Ao solicitar o desligamento, o departamento de Recursos Humanos será notificado para iniciar o processo de rescisão.</p>
      <button className="btn-solicitar-desligamento">
        <UserX size={18} />
        Solicitar Desligamento
      </button>
    </div>
  );
};

// --- 3. ABA DE DOCUMENTOS E TESTES (COMPONENTE REUTILIZÁVEL) ---
type ItemStatus = 'ok' | 'pending' | 'missing';
interface DocItem {
  id: number;
  nome: string;
  status: ItemStatus;
  icon: React.ReactNode;
}

const mockDocumentos: DocItem[] = [
  { id: 1, nome: "CNH", status: "ok", icon: <FileDigit size={32} /> },
  { id: 2, nome: "RG", status: "pending", icon: <FileDigit size={32} /> },
  { id: 3, nome: "Comprovante de Residência", status: "missing", icon: <Home size={32} /> },
  { id: 4, nome: "Cert. Casamento", status: "ok", icon: <FileText size={32} /> },
];

const mockTestes: DocItem[] = [
  { id: 1, nome: "DISC", status: "ok", icon: <BrainCircuit size={32} /> },
  { id: 2, nome: "MBTI", status: "pending", icon: <BrainCircuit size={32} /> },
  { id: 3, nome: "Fit Cultural", status: "missing", icon: <BrainCircuit size={32} /> },
  { id: 4, nome: "Teste Lógico", status: "ok", icon: <BrainCircuit size={32} /> },
];

const statusMap: Record<ItemStatus, { text: string; icon: React.ReactNode; className: string }> = {
  ok: { text: "OK", icon: <CheckCircle size={14} />, className: "status-ok" },
  pending: { text: "Pendente", icon: <AlertCircle size={14} />, className: "status-pending" },
  missing: { text: "Faltando", icon: <XCircle size={14} />, className: "status-missing" },
};

const AbaDocumentosTestes: React.FC<{ itens: DocItem[] }> = ({ itens }) => {
  return (
    <div className="doc-grid">
      {itens.map((item) => {
        const statusInfo = statusMap[item.status];
        return (
          <div key={item.id} className="doc-card">
            <div className="doc-card-icon">{item.icon}</div>
            <h4 className="doc-card-title">{item.nome}</h4>
            <div className={`doc-card-status ${statusInfo.className}`}>
              {statusInfo.icon}
              <span>{statusInfo.text}</span>
            </div>
            
            {/* Overlay de Ações (aparece no hover) */}
            <div className="doc-card-overlay">
              <div className="doc-card-overlay-buttons">
                <button className="btn-doc-action">
                  <Eye size={16} /> Visualizar
                </button>
                <button className="btn-doc-action">
                  <Download size={16} /> Baixar
                </button>
                <button className="btn-doc-action upload">
                  <Upload size={16} /> Upload
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// --- 4. ABA DE HISTÓRICO ---
const AbaHistorico: React.FC<{ item: Funcionario | null }> = ({ item }) => {
  // Admissão: 14/06/2014
  const mockHistorico = [
    { id: 1, cargo: "Auxiliar de Campo", dataInicio: "14/06/2014", dataFim: "31/05/2017" },
    { id: 2, cargo: "Operador de Máquinas I", dataInicio: "01/06/2017", dataFim: "30/11/2020" },
  ];
  
  if (item) {
      mockHistorico.push({
          id: 3,
          cargo: item.Função,
          dataInicio: "01/12/2020", // Data mockada
          dataFim: "Atual"
      });
  }

  return (
    <div className="historico-container">
      <div className="historico-lista">
        {mockHistorico.slice().reverse().map((hist) => (
          <div key={hist.id} className="historico-item" data-atual={hist.dataFim === 'Atual'}>
            <div className="historico-item-icone">
              {hist.dataFim === "Atual" ? <CheckCircle size={20} /> : <History size={20} />}
            </div>
            <div className="historico-item-detalhes">
              <h4>{hist.cargo}</h4>
              <span>{hist.dataInicio} até {hist.dataFim}</span>
            </div>
          </div>
        ))}
      </div>
      
      <div className="historico-acao">
        {/* --- ATUALIZAÇÃO: Texto alterado --- */}
        <p>Após análise do histórico, clique abaixo para iniciar a solicitação de promoção.</p>
        <button className="btn-solicitar-promocao">
          <TrendingUp size={18} />
          Solicitar Promoção
        </button>
      </div>
    </div>
  );
};

// --- 5. ABA DE OCORRÊNCIAS ---
type OcorrenciaType = 'bom' | 'ruim';
interface Ocorrencia {
  id: number;
  tipo: OcorrenciaType;
  titulo: string;
  data: string;
  descricao: string;
}

const mockOcorrencias: Ocorrencia[] = [
  { id: 1, tipo: 'bom', titulo: 'Reconhecimento: Proatividade na Colheita', data: '15/07/2024', descricao: 'Recebeu elogio formal pela proatividade em identificar e solucionar um problema mecânico durante a colheita, evitando atrasos.' },
  { id: 2, tipo: 'ruim', titulo: 'Advertência Verbal: Atraso', data: '02/05/2024', descricao: 'Advertência verbal aplicada por 3 atrasos consecutivos não justificados no início do turno.' },
  { id: 3, tipo: 'ruim', titulo: 'Advertência Escrita: Uso de EPI', data: '10/01/2024', descricao: 'Advertência por escrito por não utilizar o Equipamento de Proteção Individual (Luvas) durante a aplicação de defensivos.' },
];

const AbaOcorrencias: React.FC<{ item: Funcionario | null }> = ({ item }) => {
  return (
    <div className="ocorrencias-container">
      {/* --- ATUALIZAÇÃO: Botão Nova Ocorrência --- */}
      <div className="ocorrencias-toolbar">
        <button className="btn-nova-ocorrencia">
          <Plus size={16} />
          Nova Ocorrência
        </button>
      </div>
      {/* --- Fim da Atualização --- */}

      {mockOcorrencias.map((ocorrencia) => (
        <div key={ocorrencia.id} className="ocorrencia-item" data-tipo={ocorrencia.tipo}>
          <div className="ocorrencia-item-icone">
            {ocorrencia.tipo === 'bom' ? <Award size={24} /> : <TriangleAlert size={24} />}
          </div>
          <div className="ocorrencia-item-detalhes">
            <h4>{ocorrencia.titulo}</h4>
            <span>{ocorrencia.data}</span>
            <p>{ocorrencia.descricao}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

// =========================================================================
// --- (FIM) COMPONENTES MOCKADOS DAS ABAS ---
// =========================================================================


const ModalFuncionario: React.FC<ModalFuncionarioProps> = ({ visible, onClose, item }) => {
  // --- Hooks de Arrastar (do seu exemplo) ---
  const modalRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  // --- ATUALIZAÇÃO: Aba ativa padrão ---
  const [abaAtiva, setAbaAtiva] = useState<MenuGestao>('documentos');

  // Efeito para centralizar o modal ao abrir
  useEffect(() => {
    if (visible && modalRef.current) {
        const modal = modalRef.current;
        const modalWidth = Math.min(window.innerWidth * 0.9, 1400); // 90% ou 1400px
        const initialX = (window.innerWidth - modalWidth) / 2;
        const initialY = 40; // Um pouco abaixo do topo
        setPosition({ x: initialX > 0 ? initialX : 20, y: initialY });
        
        setAbaAtiva('documentos');
    }
  }, [visible]);

  // --- Lógica de Arrastar (do seu exemplo) ---
  const handleMouseDown = (e: React.MouseEvent) => {
      if (modalRef.current) {
          const target = e.target as HTMLElement;
          if (target.tagName === 'INPUT' || 
              target.tagName === 'TEXTAREA' || 
              target.tagName === 'BUTTON' || 
              target.closest('button') || 
              target.closest('.ant-select-selector') ||
              target.closest('.gestao-list-item')
             ) {
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
  

  // --- ATUALIZAÇÃO: Map de Títulos Reordenado ---
  const titulosAba: Record<MenuGestao, { icon: React.ReactNode; title: string }> = {
      documentos: { icon: <FileText size={18} />, title: "Documentos" },
      ferias: { icon: <CalendarClock size={18} />, title: "Férias" },
      historico: { icon: <History size={18} />, title: "Histórico" },
      ocorrencias: { icon: <Gavel size={18} />, title: "Advertências/Reconhecimentos & Ocorrências" },
      testes: { icon: <ClipboardCheck size={18} />, title: "Testes" },
      rescisao: { icon: <UserX size={18} />, title: "Rescisão" },
  };
  const abaAtualInfo = titulosAba[abaAtiva];


  return (
    <>
      {/* --- ESTILOS DO Modal (baseado no ModalCaderno.tsx) --- */}
      <style>{`
        /* --- Variáveis --- */
        :root {
            --gcs-blue: #00314A;
            --gcs-orange: #F58220;
            --gcs-green: #5FB246; /* Verde principal */
            --gcs-green-dark: #28a745; /* Verde escuro (botões) */
            --gcs-red: #d9534f; /* Vermelho principal */
            --gcs-brand-red: #E11D2E; /* Vermelho GCS */
            --gcs-yellow: #FBC02D; /* Amarelo (pendente) */
            --gcs-gray-light: #f1f5fb;
            --gcs-gray-border: #d0d7e2;
            --gcs-gray-dark: #6c757d; 
            --gcs-dark-text: #333;
            --gcs-dark-bg-heavy: rgba(25, 39, 53, 0.85);
            --gcs-dark-border: rgba(125, 173, 222, 0.2);
            --gcs-dark-text-primary: #F1F5F9;
            --gcs-dark-text-secondary: #CBD5E1;
            --gcs-dark-text-tertiary: #94A3B8;
            --gcs-blue-light: #1b4c89;
            --gcs-blue-sky: #7DD3FC;
        }
        
        /* --- Base Modal --- */
        .modal-funcionario-backdrop {
            position: fixed;
            top: 0; left: 0;
            width: 100vw; height: 100vh;
            background-color: rgba(0,0,0,0.4);
            z-index: 2147483646;
        }
        .modal-funcionario-glass {
            position: fixed;
            border-radius: 12px;
            width: 90%;
            max-width: 1400px;
            min-height: 300px;
            height: 90vh; 
            display: flex;
            flex-direction: column;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            z-index: 2147483647;
            transition: background 0.3s ease, border 0.3s ease, box-shadow 0.3s ease;
        }
        body.light .modal-funcionario-glass {
            background: #fff;
            border: 1px solid #dee2e6;
        }
        body.dark .modal-funcionario-glass {
            background: var(--gcs-dark-bg-heavy);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border: 1px solid var(--gcs-dark-border);
        }

        /* --- Modal Header --- */
        .modal-funcionario-header {
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
        body.light .modal-funcionario-header {
            background-color: var(--gcs-gray-light);
            border-bottom-color: #dee2e6;
        }
        body.dark .modal-funcionario-header {
            background-color: rgba(25, 39, 53, 0.5);
            border-bottom-color: var(--gcs-dark-border);
        }
        
        .modal-funcionario-title {
            font-size: 1.2rem;
            font-weight: bold;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .modal-funcionario-subtitle {
            font-size: 0.9rem;
            font-weight: 500;
            display: flex;
            align-items: center;
            gap: 1rem; 
            margin-top: 4px;
            flex-wrap: wrap; 
        }
        .modal-funcionario-subtitle-extra {
            font-size: 0.85rem;
            font-weight: 400;
            display: flex;
            align-items: center;
            gap: 1.5rem; 
            margin-top: 8px;
            flex-wrap: wrap;
        }
        body.light .modal-funcionario-title { color: var(--gcs-blue); }
        body.light .modal-funcionario-subtitle { color: var(--gcs-gray-dark); }
        body.light .modal-funcionario-subtitle-extra { color: var(--gcs-gray-dark); }
        
        body.dark .modal-funcionario-title { color: var(--gcs-dark-text-primary); }
        body.dark .modal-funcionario-subtitle { color: var(--gcs-dark-text-tertiary); }
        body.dark .modal-funcionario-subtitle-extra { color: var(--gcs-dark-text-tertiary); }
        body.dark .modal-funcionario-title svg { color: var(--gcs-dark-text-primary) !important; }
        
        .modal-funcionario-close-btn {
            background: none;
            border: none;
            font-size: 1.75rem;
            cursor: pointer;
            padding: 0;
            line-height: 1;
        }
        body.light .modal-funcionario-close-btn { color: var(--gcs-dark-text); }
        body.dark .modal-funcionario-close-btn { color: var(--gcs-dark-text-secondary); }
        body.dark .modal-funcionario-close-btn:hover { color: var(--gcs-dark-text-primary); }

        .modal-funcionario-content-wrapper {
            flex-grow: 1;
            overflow: hidden;
            display: flex;
            height: 100%;
        }
        
        .modal-funcionario-footer {
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
        body.light .modal-funcionario-footer {
            background-color: var(--gcs-gray-light);
            border-top-color: #dee2e6;
        }
        body.dark .modal-funcionario-footer {
            background-color: rgba(25, 39, 53, 0.5);
            border-top-color: var(--gcs-dark-border);
        }

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

        /* --- === NOVOS ESTILOS PARA O LAYOUT === --- */

        .gestao-sidebar {
            width: 220px;
            flex-shrink: 0;
            display: flex;
            flex-direction: column;
            height: 100%;
            border-right: 1px solid;
        }
        body.light .gestao-sidebar { 
            border-color: #dee2e6; 
            background-color: #f8f9fa; 
        }
        body.dark .gestao-sidebar { 
            border-color: var(--gcs-dark-border); 
            background-color: rgba(25, 39, 53, 0.1); 
        }
        
        .gestao-header {
            padding: 1rem 1.5rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-shrink: 0;
            border-bottom: 1px solid;
        }
        body.light .gestao-header { border-color: #dee2e6; }
        body.dark .gestao-header { border-color: var(--gcs-dark-border); }

        .gestao-header h3 {
            margin: 0;
            font-size: 1.1rem;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        body.light .gestao-header h3 { color: var(--gcs-blue); }
        body.dark .gestao-header h3 { color: var(--gcs-dark-text-primary); }

        .gestao-list {
            flex-grow: 1;
            overflow-y: auto;
            padding: 0.75rem;
        }
        .gestao-list-item {
            display: flex;
            align-items: center;
            gap: 10px;
            width: 100%;
            padding: 12px 14px; 
            border-radius: 8px;
            border: 1px solid transparent;
            background: none;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            margin-bottom: 4px;
            transition: all 0.2s ease-in-out;
            text-align: left;
        }
        body.light .gestao-list-item { color: var(--gcs-dark-text); }
        body.light .gestao-list-item:hover { background-color: var(--gcs-gray-light); }
        body.light .gestao-list-item[aria-selected="true"] {
            background-color: #eaf3ff;
            color: var(--gcs-blue-light);
            font-weight: 600;
        }
        
        body.dark .gestao-list-item { color: var(--gcs-dark-text-secondary); }
        body.dark .gestao-list-item:hover { background-color: rgba(25, 39, 53, 0.7); }
        body.dark .gestao-list-item[aria-selected="true"] {
            background-color: var(--gcs-blue-light);
            color: white;
            font-weight: 600;
        }

        .detalhes-content {
            flex-grow: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }
        .detalhes-header {
            padding: 1rem 1.5rem;
            flex-shrink: 0;
            border-bottom: 1px solid;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        body.light .detalhes-header { border-color: #dee2e6; }
        body.dark .detalhes-header { border-color: var(--gcs-dark-border); }
        
        .detalhes-header h3 {
            margin: 0;
            font-size: 1.1rem;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        body.light .detalhes-header h3 { color: var(--gcs-dark-text); }
        body.dark .detalhes-header h3 { color: var(--gcs-dark-text-primary); }
        body.light .detalhes-header svg { color: var(--gcs-blue); }
        body.dark .detalhes-header svg { color: var(--gcs-blue-sky); }


        .detalhes-scrollable {
            flex-grow: 1;
            overflow-y: auto; 
            padding: 1.5rem; 
        }
        
        /* Placeholder de conteúdo (para abas vazias) */
        .placeholder-content {
            font-size: 1rem;
        }
        body.light .placeholder-content { color: var(--gcs-gray-text); }
        body.dark .placeholder-content { color: var(--gcs-dark-text-secondary); }
        
        
        /* --- === (INÍCIO) ESTILOS DAS ABAS MOCKADAS === --- */
        
        /* --- 1. ESTILOS DE FÉRIAS --- */
        .ferias-container {
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
        }
        .ferias-card {
            border-radius: 8px;
            border: 1px solid;
            /* --- NOVO: Borda Esquerda --- */
            border-left-width: 5px;
            overflow: hidden;
        }
        
        /* --- ESTADOS DA BORDA (light) --- */
        body.light .ferias-card[data-status="atual"] {
            border-color: var(--gcs-gray-border);
            border-left-color: var(--gcs-green);
            background-color: #f6fffb;
        }
        body.light .ferias-card[data-status="pendente"] {
            border-color: var(--gcs-gray-border);
            border-left-color: var(--gcs-yellow);
            background-color: #fffbeb;
        }
        body.light .ferias-card[data-status="esgotado"] {
            border-color: var(--gcs-gray-border);
            border-left-color: var(--gcs-gray-dark);
            background-color: #fff;
        }
        
        /* --- ESTADOS DA BORDA (dark) --- */
        body.dark .ferias-card[data-status="atual"] {
            border-color: var(--gcs-dark-border);
            border-left-color: #4ADE80; /* Verde claro */
            background-color: rgba(74, 222, 128, 0.1);
        }
        body.dark .ferias-card[data-status="pendente"] {
            border-color: var(--gcs-dark-border);
            border-left-color: var(--gcs-yellow);
            background-color: rgba(251, 192, 45, 0.1);
        }
        body.dark .ferias-card[data-status="esgotado"] {
            border-color: var(--gcs-dark-border);
            border-left-color: var(--gcs-dark-text-tertiary);
            background-color: rgba(25, 39, 53, 0.2);
        }
        
        
        .ferias-card-header {
            padding: 0.75rem 1.25rem;
            border-bottom: 1px solid;
        }
        .ferias-card-header h3 {
            font-size: 1.1rem;
            font-weight: 700;
            margin: 0 0 4px 0;
        }
        .ferias-card-header span {
            font-size: 0.85rem;
            font-weight: 500;
        }
        
        /* Cores do Header (baseado no status) */
        body.light .ferias-card[data-status="atual"] .ferias-card-header { border-color: rgba(74, 222, 128, 0.3); }
        body.light .ferias-card[data-status="atual"] h3 { color: var(--gcs-green-dark); }
        body.light .ferias-card[data-status="atual"] span { color: var(--gcs-green-dark); }
        
        body.light .ferias-card[data-status="pendente"] .ferias-card-header { border-color: rgba(251, 192, 45, 0.4); }
        body.light .ferias-card[data-status="pendente"] h3 { color: #d48806; }
        body.light .ferias-card[data-status="pendente"] span { color: #d48806; }

        body.light .ferias-card[data-status="esgotado"] .ferias-card-header { border-color: var(--gcs-gray-border); opacity: 0.7; }
        body.light .ferias-card[data-status="esgotado"] h3 { color: var(--gcs-gray-dark); }
        body.light .ferias-card[data-status="esgotado"] span { color: var(--gcs-gray-dark); }
        
        body.dark .ferias-card[data-status="atual"] .ferias-card-header { border-color: rgba(74, 222, 128, 0.3); }
        body.dark .ferias-card[data-status="atual"] h3 { color: #4ADE80; }
        body.dark .ferias-card[data-status="atual"] span { color: #4ADE80; }

        body.dark .ferias-card[data-status="pendente"] .ferias-card-header { border-color: rgba(251, 192, 45, 0.4); }
        body.dark .ferias-card[data-status="pendente"] h3 { color: var(--gcs-yellow); }
        body.dark .ferias-card[data-status="pendente"] span { color: var(--gcs-yellow); }

        body.dark .ferias-card[data-status="esgotado"] .ferias-card-header { border-color: var(--gcs-dark-border); opacity: 0.6; }
        body.dark .ferias-card[data-status="esgotado"] h3 { color: var(--gcs-dark-text-tertiary); }
        body.dark .ferias-card[data-status="esgotado"] span { color: var(--gcs-dark-text-tertiary); }


        .ferias-card-body {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 1.25rem;
            flex-wrap: wrap;
            gap: 1rem;
        }
        .ferias-card-stats {
            display: flex;
            gap: 1.5rem;
            flex-wrap: wrap;
        }
        .stat-item {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .stat-item strong {
            font-size: 1.5rem;
            font-weight: 700;
        }
        .stat-item span {
            font-size: 0.9rem;
        }
        
        body.light .stat-item svg { color: var(--gcs-blue); }
        body.light .stat-item strong { color: var(--gcs-dark-text); }
        body.light .stat-item span { color: var(--gcs-gray-dark); }
        
        body.dark .stat-item svg { color: var(--gcs-blue-sky); }
        body.dark .stat-item strong { color: var(--gcs-dark-text-primary); }
        body.dark .stat-item span { color: var(--gcs-dark-text-secondary); }

        .btn-marcar-ferias {
            background-color: var(--gcs-green);
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            transition: all 0.2s ease;
        }
        .btn-marcar-ferias:hover:not(:disabled) {
            background-color: var(--gcs-green-dark);
        }
        
        .btn-ferias-esgotado {
            background-color: #adb5bd; 
            color: #495057;
            cursor: not-allowed;
        }
        body.dark .btn-ferias-esgotado {
             background-color: var(--gcs-dark-text-tertiary);
             color: var(--gcs-dark-bg-heavy);
        }
        .btn-ferias-esgotado:hover {
            background-color: #adb5bd !important;
        }
        
        /* --- 2. ESTILOS DE RESCISÃO --- */
        .rescisao-container {
            padding: 1rem;
            text-align: center;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 1.5rem;
            border-radius: 8px;
        }
        .rescisao-container p {
            font-size: 1rem;
            line-height: 1.6;
            max-width: 500px;
        }
        body.light .rescisao-container {
            background-color: #fff8f8;
            border: 1px solid var(--gcs-red);
        }
        body.light .rescisao-container p { color: var(--gcs-dark-text); }
        
        body.dark .rescisao-container {
            background-color: rgba(225, 29, 46, 0.1);
            border: 1px solid rgba(225, 29, 46, 0.4);
        }
        body.dark .rescisao-container p { color: var(--gcs-dark-text-secondary); }

        .btn-solicitar-desligamento {
            background-color: var(--gcs-brand-red);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 1rem;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 10px;
            transition: all 0.2s ease;
        }
        .btn-solicitar-desligamento:hover {
            background-color: #b41623;
        }
        
        /* --- 3. ESTILOS DE DOCUMENTOS E TESTES --- */
        .doc-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 1.5rem;
        }
        .doc-card {
            position: relative; 
            border-radius: 8px;
            border: 1px solid;
            padding: 1.5rem;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0.75rem;
            overflow: hidden; 
            transition: all 0.3s ease;
        }
        
        .doc-card-title {
            font-size: 1rem;
            font-weight: 600;
            text-align: center;
            margin: 0;
        }
        
        .doc-card-status {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            font-size: 0.85rem;
            font-weight: 500;
            padding: 4px 10px;
            border-radius: 16px;
        }
        
        body.light .doc-card {
            border-color: var(--gcs-gray-border);
            background-color: #fff;
        }
        body.light .doc-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.05);
            border-color: #aaa;
        }
        body.light .doc-card-icon { color: var(--gcs-blue); }
        body.light .doc-card-title { color: var(--gcs-dark-text); }
        
        body.light .status-ok { background-color: #e6f7ec; color: #006d75; }
        body.light .status-pending { background-color: #fffbeb; color: #d48806; }
        body.light .status-missing { background-color: #fff1f0; color: #cf1322; }
        body.light .status-ok svg { color: #52c41a; }
        body.light .status-pending svg { color: var(--gcs-yellow); }
        body.light .status-missing svg { color: var(--gcs-red); }

        body.dark .doc-card {
            border-color: var(--gcs-dark-border);
            background-color: rgba(25, 39, 53, 0.2);
        }
        body.dark .doc-card:hover {
            transform: translateY(-4px);
            border-color: var(--gcs-dark-border-hover);
            background-color: rgba(25, 39, 53, 0.5);
        }
        body.dark .doc-card-icon { color: var(--gcs-blue-sky); }
        body.dark .doc-card-title { color: var(--gcs-dark-text-primary); }
        
        body.dark .status-ok { background-color: rgba(74, 222, 128, 0.1); color: #4ADE80; }
        body.dark .status-pending { background-color: rgba(251, 192, 45, 0.1); color: #FBC02D; }
        body.dark .status-missing { background-color: rgba(248, 113, 113, 0.1); color: #F87171; }
        body.dark .status-ok svg,
        body.dark .status-pending svg,
        body.dark .status-missing svg {
            color: inherit; 
        }
        
        .doc-card-overlay {
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            transition: all 0.3s ease;
        }
        .doc-card:hover .doc-card-overlay {
            opacity: 1;
        }
        
        .doc-card-overlay-buttons {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
            padding: 1rem;
            border-radius: 8px;
            width: 100%;
            height: 100%;
            align-items: center;
            justify-content: center;
        }
        
        body.light .doc-card-overlay {
            background-color: rgba(255, 255, 255, 0.85);
            backdrop-filter: blur(4px);
            -webkit-backdrop-filter: blur(4px);
        }
        body.light .btn-doc-action {
            background-color: #fff;
            border: 1px solid var(--gcs-gray-border);
            color: var(--gcs-dark-text);
        }
        body.light .btn-doc-action:hover {
            background-color: var(--gcs-gray-light);
            border-color: var(--gcs-blue);
            color: var(--gcs-blue);
        }
        body.light .btn-doc-action.upload:hover {
             border-color: var(--gcs-green);
             color: var(--gcs-green);
        }

        body.dark .doc-card-overlay {
            background-color: rgba(25, 39, 53, 0.85);
            backdrop-filter: blur(4px);
            -webkit-backdrop-filter: blur(4px);
        }
        body.dark .btn-doc-action {
            background-color: rgba(25, 39, 53, 0.9);
            border: 1px solid var(--gcs-dark-border-hover);
            color: var(--gcs-dark-text-primary);
        }
         body.dark .btn-doc-action:hover {
            background-color: rgba(40, 60, 80, 0.9);
            border-color: var(--gcs-blue-sky);
            color: var(--gcs-blue-sky);
         }
         body.dark .btn-doc-action.upload:hover {
             border-color: var(--gcs-green);
             color: var(--gcs-green);
         }

        .btn-doc-action {
            width: 90%;
            padding: 8px 12px;
            border-radius: 6px;
            font-weight: 600;
            font-size: 0.9rem;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            transition: all 0.2s ease;
        }
        
        /* --- 4. ESTILOS DE HISTÓRICO --- */
        .historico-container {
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
        }
        .historico-lista {
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }
        .historico-item {
            display: flex;
            align-items: center;
            gap: 1rem;
            padding: 1rem;
            border-radius: 8px;
            border: 1px solid;
        }
        .historico-item-detalhes h4 {
            font-size: 1rem;
            font-weight: 600;
            margin: 0 0 4px 0;
        }
        .historico-item-detalhes span {
            font-size: 0.9rem;
            font-weight: 500;
        }
        
        body.light .historico-item[data-atual="true"] {
            border-color: var(--gcs-green-dark);
            background-color: #f6fffb;
        }
        body.light .historico-item[data-atual="true"] .historico-item-icone { color: var(--gcs-green-dark); }
        body.light .historico-item[data-atual="true"] h4 { color: var(--gcs-blue); }
        body.light .historico-item[data-atual="true"] span { color: var(--gcs-gray-dark); }
        
        body.light .historico-item:not([data-atual="true"]) {
            border-color: var(--gcs-gray-border);
            background-color: var(--gcs-gray-light);
            opacity: 0.8;
        }
        body.light .historico-item:not([data-atual="true"]) .historico-item-icone { color: var(--gcs-gray-dark); }
        body.light .historico-item:not([data-atual="true"]) h4 { color: var(--gcs-gray-dark); }
        body.light .historico-item:not([data-atual="true"]) span { color: var(--gcs-gray-dark); }
        
        body.dark .historico-item[data-atual="true"] {
            border-color: rgba(74, 222, 128, 0.4);
            background-color: rgba(74, 222, 128, 0.1);
        }
        body.dark .historico-item[data-atual="true"] .historico-item-icone { color: #4ADE80; }
        body.dark .historico-item[data-atual="true"] h4 { color: var(--gcs-dark-text-primary); }
        body.dark .historico-item[data-atual="true"] span { color: var(--gcs-dark-text-secondary); }

        body.dark .historico-item:not([data-atual="true"]) {
            border-color: var(--gcs-dark-border);
            background-color: rgba(25, 39, 53, 0.3);
            opacity: 0.7;
        }
        body.dark .historico-item:not([data-atual="true"]) .historico-item-icone { color: var(--gcs-dark-text-tertiary); }
        body.dark .historico-item:not([data-atual="true"]) h4 { color: var(--gcs-dark-text-tertiary); }
        body.dark .historico-item:not([data-atual="true"]) span { color: var(--gcs-dark-text-tertiary); }

        .historico-acao {
            margin-top: 1.5rem;
            padding: 1.5rem;
            border-radius: 8px;
            text-align: center;
        }
        .historico-acao p {
            font-size: 1rem;
            font-weight: 500;
            margin: 0 0 1rem 0;
        }
        
        body.light .historico-acao {
             background-color: #f6fffb;
             border: 1px solid var(--gcs-green-dark);
        }
        body.light .historico-acao p { color: var(--gcs-dark-text); }
        
        body.dark .historico-acao {
             background-color: rgba(74, 222, 128, 0.1);
             border: 1px solid rgba(74, 222, 128, 0.4);
        }
        body.dark .historico-acao p { color: var(--gcs-dark-text-secondary); }
        
        .btn-solicitar-promocao {
            background-color: var(--gcs-green);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 1rem;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 10px;
            transition: all 0.2s ease;
        }
        .btn-solicitar-promocao:hover {
            background-color: var(--gcs-green-dark);
        }
        
        /* --- 5. (NOVO) ESTILOS DE OCORRÊNCIAS --- */
        .ocorrencias-container {
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
        }
        /* (NOVO) Toolbar Ocorrências */
        .ocorrencias-toolbar {
            display: flex;
            justify-content: flex-end;
            padding-bottom: 1rem;
            border-bottom: 1px solid var(--gcs-gray-border);
        }
        body.dark .ocorrencias-toolbar {
            border-bottom-color: var(--gcs-dark-border);
        }
        .btn-nova-ocorrencia {
            background-color: var(--gcs-green);
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            transition: all 0.2s ease;
        }
        .btn-nova-ocorrencia:hover {
            background-color: var(--gcs-green-dark);
        }

        .ocorrencia-item {
            display: flex;
            align-items: flex-start;
            gap: 1rem;
            padding: 1rem;
            border-radius: 8px;
            border: 1px solid;
            border-left-width: 5px; /* Borda colorida */
        }
        .ocorrencia-item-icone {
            flex-shrink: 0;
            padding-top: 4px; /* Alinha ícone com o título */
        }
        .ocorrencia-item-detalhes h4 {
            font-size: 1.1rem;
            font-weight: 600;
            margin: 0 0 4px 0;
        }
        .ocorrencia-item-detalhes span {
            font-size: 0.85rem;
            font-weight: 500;
            display: block;
            margin-bottom: 0.5rem;
        }
        .ocorrencia-item-detalhes p {
            font-size: 0.95rem;
            line-height: 1.6;
            margin: 0;
        }
        
        /* Ocorrência BOA (Light) */
        body.light .ocorrencia-item[data-tipo="bom"] {
            border-color: var(--gcs-gray-border);
            border-left-color: var(--gcs-green);
            background-color: #f6fffb;
        }
        body.light .ocorrencia-item[data-tipo="bom"] .ocorrencia-item-icone { color: var(--gcs-green); }
        body.light .ocorrencia-item[data-tipo="bom"] h4 { color: var(--gcs-blue); }
        body.light .ocorrencia-item[data-tipo="bom"] span { color: var(--gcs-gray-dark); }
        body.light .ocorrencia-item[data-tipo="bom"] p { color: var(--gcs-dark-text); }
        
        /* Ocorrência RUIM (Light) */
        body.light .ocorrencia-item[data-tipo="ruim"] {
            border-color: var(--gcs-gray-border);
            border-left-color: var(--gcs-red);
            background-color: #fff8f8;
        }
        body.light .ocorrencia-item[data-tipo="ruim"] .ocorrencia-item-icone { color: var(--gcs-red); }
        body.light .ocorrencia-item[data-tipo="ruim"] h4 { color: var(--gcs-red); }
        body.light .ocorrencia-item[data-tipo="ruim"] span { color: var(--gcs-gray-dark); }
        body.light .ocorrencia-item[data-tipo="ruim"] p { color: var(--gcs-dark-text); }
        
        /* Ocorrência BOA (Dark) */
        body.dark .ocorrencia-item[data-tipo="bom"] {
            border-color: var(--gcs-dark-border);
            border-left-color: #4ADE80;
            background-color: rgba(74, 222, 128, 0.1);
        }
        body.dark .ocorrencia-item[data-tipo="bom"] .ocorrencia-item-icone { color: #4ADE80; }
        body.dark .ocorrencia-item[data-tipo="bom"] h4 { color: #4ADE80; }
        body.dark .ocorrencia-item[data-tipo="bom"] span { color: var(--gcs-dark-text-tertiary); }
        body.dark .ocorrencia-item[data-tipo="bom"] p { color: var(--gcs-dark-text-secondary); }

        /* Ocorrência RUIM (Dark) */
        body.dark .ocorrencia-item[data-tipo="ruim"] {
            border-color: var(--gcs-dark-border);
            border-left-color: #F87171;
            background-color: rgba(248, 113, 113, 0.1);
        }
        body.dark .ocorrencia-item[data-tipo="ruim"] .ocorrencia-item-icone { color: #F87171; }
        body.dark .ocorrencia-item[data-tipo="ruim"] h4 { color: #F87171; }
        body.dark .ocorrencia-item[data-tipo="ruim"] span { color: var(--gcs-dark-text-tertiary); }
        body.dark .ocorrencia-item[data-tipo="ruim"] p { color: var(--gcs-dark-text-secondary); }


        /* --- FIM DOS ESTILOS DAS ABAS --- */
      `}</style>

      <div 
        className="modal-funcionario-backdrop"
        onClick={onClose}
      ></div>
      
      <div
        ref={modalRef}
        className="modal-funcionario-glass"
        style={{
            top: position.y,
            left: position.x,
        }}
      >
          <div
            onMouseDown={handleMouseDown}
            className="modal-funcionario-header"
          >
            {/* --- ATUALIZAÇÃO 2: CABEÇALHO COMPLETO --- */}
            <div>
              <div className="modal-funcionario-title">
                <Eye size={20} />
                <span>{item.Nome}</span>
              </div>
              <div className="modal-funcionario-subtitle">
                <span>Mat: {item.Matricula}</span>
                <span style={{opacity: 0.5}}>|</span>
                <span>{item.Função}</span>
              </div>
              <div className="modal-funcionario-subtitle-extra">
                <span>C. Custo: {item["Centro de Custo"]}</span>
                <span>Admissão: {formatProtheusDateTime(item["Data admissao"])}</span>
              </div>
            </div>
            {/* --- FIM DA ATUALIZAÇÃO --- */}
            <button onClick={onClose} className="modal-funcionario-close-btn" aria-label="Fechar">×</button>
          </div>

          {/* --- ATUALIZAÇÃO: Conteúdo com Layout Flex --- */}
          <div className="modal-funcionario-content-wrapper">
              
              {/* --- 1. Menu da Esquerda (REORDENADO) --- */}
              <div className="gestao-sidebar">
                <div className="gestao-header">
                  <h3>Gestão</h3>
                </div>
                <div className="gestao-list">
                  <button
                    className="gestao-list-item"
                    aria-selected={abaAtiva === 'documentos'}
                    onClick={() => setAbaAtiva('documentos')}
                  >
                    <FileText size={16} /> Documentos
                  </button>
                  <button
                    className="gestao-list-item"
                    aria-selected={abaAtiva === 'ferias'}
                    onClick={() => setAbaAtiva('ferias')}
                  >
                    <CalendarClock size={16} /> Férias
                  </button>
                  <button
                    className="gestao-list-item"
                    aria-selected={abaAtiva === 'historico'}
                    onClick={() => setAbaAtiva('historico')}
                  >
                    <History size={16} /> Histórico
                  </button>
                  {/* --- (NOVO) BOTÃO OCORRÊNCIAS --- */}
                  <button
                    className="gestao-list-item"
                    aria-selected={abaAtiva === 'ocorrencias'}
                    onClick={() => setAbaAtiva('ocorrencias')}
                  >
                    <Gavel size={16} /> Ocorrências
                  </button>
                  <button
                    className="gestao-list-item"
                    aria-selected={abaAtiva === 'testes'}
                    onClick={() => setAbaAtiva('testes')}
                  >
                    <ClipboardCheck size={16} /> Testes
                  </button>
                  <button
                    className="gestao-list-item"
                    aria-selected={abaAtiva === 'rescisao'}
                    onClick={() => setAbaAtiva('rescisao')}
                  >
                    <UserX size={16} /> Rescisão
                  </button>
                </div>
              </div>

              {/* --- 2. Conteúdo da Direita --- */}
              <div className="detalhes-content">
                {/* Cabeçalho do conteúdo */}
                <div className="detalhes-header">
                  <h3>
                    {abaAtualInfo.icon}
                    <span>{abaAtualInfo.title}</span>
                  </h3>
                </div>
                
                {/* Conteúdo scrollável */}
                <div className="detalhes-scrollable">
                  
                  {/* --- ATUALIZAÇÃO 3: Bloco de Descrições REMOVIDO --- */}
                  
                  {/* --- ATUALIZAÇÃO: Conteúdo dinâmico da Aba (REORDENADO) --- */}
                  <div>
                    {abaAtiva === 'documentos' && (
                      <AbaDocumentosTestes itens={mockDocumentos} />
                    )}
                    {abaAtiva === 'ferias' && (
                      <AbaFerias item={item} />
                    )}
                    {abaAtiva === 'historico' && (
                      <AbaHistorico item={item} />
                    )}
                    {/* --- (NOVO) CONTEÚDO OCORRÊNCIAS --- */}
                    {abaAtiva === 'ocorrencias' && (
                      <AbaOcorrencias item={item} />
                    )}
                    {abaAtiva === 'testes' && (
                      <AbaDocumentosTestes itens={mockTestes} />
                    )}
                    {abaAtiva === 'rescisao' && (
                      <AbaRescisao item={item} />
                    )}
                  </div>
                  
                </div>
              </div>

            </div>
          {/* --- Fim do Novo Layout --- */}
          
          <div className="modal-funcionario-footer">
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

export default ModalFuncionario;