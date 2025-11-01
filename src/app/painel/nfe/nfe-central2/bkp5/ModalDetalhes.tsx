"use client";

import React from "react";
import { useEffect, useState, useCallback, useRef } from "react";
import { FaCheckCircle, FaTimesCircle, FaExclamationTriangle, FaListAlt, FaHistory, FaFileInvoice, FaSyncAlt, FaInfoCircle, FaUserFriends, FaSearch, FaTimes, FaSpinner, FaCopy, FaShieldAlt, FaPencilAlt, FaPlus } from "react-icons/fa";
import { Sparkles } from "lucide-react";
import { useSession } from "next-auth/react";

// Importando os modais refatorados
import ManualPedidoModal from "./ManualPedidoModal";
import ManualTesModal from "./ManualTesModal";
import NotificationModal from "./NotificationModal";
import FinanceiroModal from "./FinanceiroModal"; // Importação do novo modal

// --- INTERFACES ---
interface ModalDetalhesProps {
  nomeFornecedor?: string;
  chave: string;
  statusNF: string;
  visivel: boolean;
  onClose: () => void;
  onActionSuccess?: () => void;
  status_tes?: 'PROCESSADA' | 'PENDENTE' | 'ERRO';
  statusCompras?: string;
  observacao?: string;
}
interface ItemNota {
  item_xml: number;
  descricao_xml: string;
  um_xml: string;
  valor_unitario_xml?: number;
  descricao_pedido: string | null;
  unidade_pedido: string | null;
  um_pedido: string | null;
  segum_pedido: string | null;
  num_pedido: string | null;
  similaridade_descricao: number;
  valor_unitario_bate: string;
  justificativa: string;
  item_ok: string;
  enviada?: string;
  dt_enviada?: string;
  nome_fornecedor?: string;
  nome_usuario?: string;
  status_tes?: 'PROCESSADA' | 'PENDENTE' | 'ERRO';
  valor_unitario_ped?: number;
  qtd?: number;
  moeda?: number;
  data_ultima_ptax?: string;
}
interface ItemPedidoManual {
    item_xml: number;
    descricao_xml: string;
    valor_unitario_xml: number | null;
    num_pedido: string | null;
    descricao_pedido_api: string | null;
    valor_pedido_api: number | null;
    registro_pedido: number | null;
}
interface ErroExecAuto {
  dt_movimentacao: string;
  campo: string;
  motivo: string;
  mensagem_original: string;
}
interface Comprador {
    cod: string;
    nome: string;
}
interface TesItem {
    id: number;
    nItem: number;
    classe: string;
    tes_codigo: string;
    justificativa_curta: string;
    justificativa_texto: string;
    tes_escolhida: string;
    confianca_pct: number;
}
interface TesData {
    chave: string;
    total_itens: number;
    itens: TesItem[];
}
interface PagamentoFinanceiro {
    FILIAL: string;
    PREFIXO: string;
    TITULO: string;
    PARCELA: string;
    TIPO: string;
    VALOR: number;
    VENCIMENTO: string;
    STATUS: string;
    PAGAMENTO: string | null;
}


// --- SUB-COMPONENTES (AGORA ESTILIZADOS COM CLASSES) ---

const NotaJornada = ({ activeStepIndex, status_tes, hasItemProcessingError, statusNF, statusCompras }: {
    activeStepIndex: number,
    status_tes?: 'PROCESSADA' | 'PENDENTE' | 'ERRO',
    hasItemProcessingError: boolean,
    statusNF: string,
    statusCompras?: string;
}) => {
    const steps = [
        "Nota Recebida",
        "Processar Pedidos",
        "Definição Fiscal",
        "Enviada (Unidade)",
        "Lançada/Finalizada"
    ];

    return (
        <div className="jornada-wrapper">
            {steps.map((step, index) => {
                const normalizedTesStatus = status_tes?.trim().toUpperCase();
                let isCompleted = index < activeStepIndex;
                const isActive = index === activeStepIndex;
                let stepStatus: 'completed' | 'active' | 'pending' | 'error' = 'pending';
                let icon = '🕒';

                if (isCompleted) {
                    stepStatus = 'completed';
                    icon = '✔';
                } else if (isActive) {
                    stepStatus = 'active';
                    icon = '🕒';
                }

                if (step === 'Processar Pedidos') {
                    const normalizedComprasStatus = statusCompras?.trim().toUpperCase();
                    switch (normalizedComprasStatus) {
                        case 'CONCLUÍDO':
                            stepStatus = 'completed'; icon = '✔'; isCompleted = true;
                            break;
                        case 'PENDENTE':
                            stepStatus = 'error'; icon = '✖'; isCompleted = true;
                            break;
                        case 'EM FILA':
                            isCompleted = false;
                            stepStatus = isActive ? 'active' : 'pending';
                            icon = '🕒';
                            break;
                    }
                }

                if (step === 'Definição Fiscal') {
                    switch (normalizedTesStatus) {
                        case 'PROCESSADA':
                            stepStatus = 'completed'; icon = '✔'; isCompleted = true;
                            break;
                        case 'ERRO':
                            stepStatus = 'error'; icon = '✖'; isCompleted = true;
                            break;
                        default:
                            stepStatus = isActive ? 'active' : 'pending';
                            icon = '🕒'; isCompleted = false;
                            break;
                    }
                }

                if (step === 'Lançada/Finalizada' && statusNF.trim().toLowerCase() === 'erro execauto') {
                    stepStatus = 'error'; icon = '✖'; isCompleted = true;
                }

                let lineStatus = 'pending';
                if (isCompleted) {
                    const normalizedComprasStatus = statusCompras?.trim().toUpperCase();
                    lineStatus = (step === 'Processar Pedidos' && normalizedComprasStatus === 'PENDENTE') ? 'error' : 'completed';
                }

                return (
                    <React.Fragment key={step}>
                        <div className={`jornada-step ${stepStatus}`}>
                            <div className="jornada-circle">
                                {icon}
                            </div>
                            <span className="jornada-text">
                                {step}
                            </span>
                        </div>
                        {index < steps.length - 1 && (
                            <div className={`jornada-line ${lineStatus}`} />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
};

const FormattedOriginalMessage = ({ message }: { message: string | null }) => {
  if (!message) {
    return <pre className="error-message-pre">N/A</pre>;
  }
  try {
    const data = JSON.parse(message);
    const details = data.detalhes || "";
    const lines = details.split('\\n');
    return (
      <div className="error-message-formatted">
        {data.erro && <div className="error-message-title">{data.erro}</div>}
        {lines.map((line: string, index: number) => {
          if (line.trim() === '') return <div key={index} style={{ height: '0.5rem' }} />;
          if (line.includes(':-')) {
            const parts = line.split(':-');
            const key = parts[0].trim();
            const value = parts[1].trim();
            return (
              <div key={index} className="error-message-grid">
                <span className="error-message-key">{key}</span>
                <span className="error-message-value">{value}</span>
              </div>
            );
          }
          return <div key={index}>{line.trim()}</div>;
        })}
      </div>
    );
  } catch (error) {
    return <pre className="error-message-pre">{message.replace(/\\n/g, '\n')}</pre>;
  }
};

const ConfirmationModal = ({
    isOpen,
    onClose,
    onConfirm,
    message,
    title = "Confirmação Necessária",
    icon = <FaExclamationTriangle size={40} color="#f7941d" />,
    confirmText = "OK, Entendi",
    confirmColor = "#dc3545", // Este será substituído por classes
    showCancelButton = true
}: {
    isOpen: boolean,
    onClose: () => void,
    onConfirm: () => void,
    message: string,
    title?: string,
    icon?: React.ReactNode,
    confirmText?: string,
    confirmColor?: string,
    showCancelButton?: boolean
}) => {
    if (!isOpen) return null;

    let confirmButtonClass = "btn ";
    if (confirmColor === "#dc3545") {
        confirmButtonClass += "btn-danger";
    } else if (confirmColor === "#007bff") {
        confirmButtonClass += "btn-primary";
    } else {
        confirmButtonClass += "btn-primary"; // Fallback
    }


    return (
        <>
            <div onClick={onClose} className="confirm-modal-backdrop"></div>
            <div className="confirm-modal-content">
                <div className="confirm-modal-icon">
                    {icon}
                </div>
                <h3 className="confirm-modal-title">{title}</h3>
                <p className="confirm-modal-message">{message}</p>
                <div className="confirm-modal-actions">
                    {showCancelButton && (
                        <button onClick={onClose} className="btn btn-secondary">Cancelar</button>
                    )}
                    <button onClick={onConfirm} className={confirmButtonClass}>{confirmText}</button>
                </div>
            </div>
        </>
    );
};

const SearchModal = ({ isOpen, onClose, onSelect, chave, email }: { isOpen: boolean, onClose: () => void, onSelect: (comprador: Comprador) => void, chave: string, email: string | null | undefined }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState<Comprador[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSearch = async () => {
        if (searchTerm.length < 3) {
            setError('Digite pelo menos 3 caracteres para buscar.');
            setResults([]);
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/nfe/nfe-busca-comprador', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chave, email, nome: searchTerm }),
            });
            const data = await response.json();
            if (response.ok) {
                if (Array.isArray(data) && data.length > 0 && data[0].comprador) {
                    const compradoresFormatados = data.map((item: { comprador: string }) => {
                        const [cod, ...nomeParts] = item.comprador.split('-');
                        const nome = nomeParts.join('-').trim();
                        return { cod: cod.trim(), nome };
                    });
                    setResults(compradoresFormatados);
                    if(compradoresFormatados.length === 0){
                        setError('Nenhum comprador encontrado com este termo.');
                    }
                } else {
                     setResults([]);
                     setError('Nenhum comprador encontrado com este termo.');
                }
            } else {
                throw new Error(data.message || 'Erro ao buscar compradores.');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectComprador = (comprador: Comprador) => {
        onSelect(comprador);
        onClose();
    };

    useEffect(() => {
        if (isOpen) {
            setSearchTerm('');
            setResults([]);
            setError(null);
            setIsLoading(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <>
            <div onClick={onClose} className="search-modal-backdrop"></div>
            <div className="search-modal-content">
                <div className="search-modal-header">
                    <h4 className="search-modal-title">Buscar Comprador</h4>
                    <button onClick={onClose} className="modal-close-btn">&times;</button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                        placeholder="Digite o nome para pesquisar..."
                        className="search-modal-input"
                        autoFocus
                    />
                    <button onClick={handleSearch} disabled={isLoading} className="btn btn-primary" style={{padding: '10px 15px'}}>
                        {isLoading ? <FaSpinner className="animate-spin" /> : <FaSearch />}
                    </button>
                </div>
                {error && <div className="search-modal-error">{error}</div>}
                <div className="search-modal-results-container">
                    {results.length > 0 ? (
                        <ul className="search-modal-results">
                            {results.map((res) => (
                                <li
                                    key={res.cod}
                                    onClick={() => handleSelectComprador(res)}
                                    className="search-modal-result-item"
                                >
                                    {res.nome} <span className="search-modal-result-code">({res.cod})</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                         !isLoading && <div className="search-modal-no-results">Nenhum resultado para exibir.</div>
                    )}
                </div>
            </div>
        </>
    );
};

const CompradorSearch = ({ chave, email, onSelect, selectedComprador, disabled }: { chave: string, email: string | null | undefined, onSelect: (comprador: Comprador | null) => void, selectedComprador: Comprador | null, disabled: boolean }) => {
    const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

    return (
        <div>
            <label htmlFor="comprador-display" className="form-label">Comprador de Destino:</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div id="comprador-display" className="comprador-display">
                    {selectedComprador ? `${selectedComprador.nome} (${selectedComprador.cod})` : 'Nenhum comprador selecionado'}
                </div>
                <button
                    type="button"
                    onClick={() => setIsSearchModalOpen(true)}
                    disabled={disabled}
                    className="btn btn-primary"
                    title="Pesquisar comprador"
                >
                    <FaSearch /> Pesquisar
                </button>
            </div>
            <SearchModal
                isOpen={isSearchModalOpen}
                onClose={() => setIsSearchModalOpen(false)}
                onSelect={onSelect}
                chave={chave}
                email={email}
            />
        </div>
    );
};


// --- COMPONENTE PRINCIPAL DO MODAL ---
export default function ModalDetalhes({ chave, statusNF, visivel, onClose, nomeFornecedor, onActionSuccess, status_tes, statusCompras, observacao }: ModalDetalhesProps) {
  const [itens, setItens] = useState<ItemNota[]>([]);
  const [tesData, setTesData] = useState<TesData | null>(null);
  const [numNF, setNumNF] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true); // Loader principal (Itens/Compras)
  const [respostaInvalida, setRespostaInvalida] = useState(false);
  const [movimentacoes, setMovimentacoes] = useState<any[]>([]);
  const [errosExecAuto, setErrosExecAuto] = useState<ErroExecAuto[]>([]);
  const [activeTab, setActiveTab] = useState<'compras' | 'historico' | 'erros' | 'fiscal' | 'financeiro' | 'responsavel'>('compras');
  
  // --- Estados de carregamento e controle para Lazy Loading ---
  const [loadingHistorico, setLoadingHistorico] = useState<boolean>(false);
  const [loadingErros, setLoadingErros] = useState<boolean>(false);
  const [loadingTes, setLoadingTes] = useState<boolean>(false);
  const [hasLoadedHistorico, setHasLoadedHistorico] = useState<boolean>(false);
  const [hasLoadedErros, setHasLoadedErros] = useState<boolean>(false);
  const [hasLoadedTes, setHasLoadedTes] = useState<boolean>(false);
  // ---

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showTransferConfirmModal, setShowTransferConfirmModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReprocessing, setIsReprocessing] = useState(false);
  const [isReprocessingTes, setIsReprocessingTes] = useState(false);
  const [selectedComprador, setSelectedComprador] = useState<Comprador | null>(null);
  const [motivoTransferencia, setMotivoTransferencia] = useState('');
  const [isDanfeLoading, setIsDanfeLoading] = useState(false);
  const [danfeError, setDanfeError] = useState<string | null>(null);
  const [internalStatusTes, setInternalStatusTes] = useState(status_tes);
  const [consultaFinanceiraType, setConsultaFinanceiraType] = useState<'dda' | 'titulos' | null>(null);

  const [isManualTesModalOpen, setIsManualTesModalOpen] = useState(false);
  const [isSavingTes, setIsSavingTes] = useState(false);

  const [isManualPedidoModalOpen, setIsManualPedidoModalOpen] = useState(false);
  const [isFinanceiroModalOpen, setIsFinanceiroModalOpen] = useState(false);

  const [notification, setNotification] = useState({ visible: false, type: 'success' as 'success' | 'error', message: '' });

  // --- Estados para o novo comentário ---
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isSendingComment, setIsSendingComment] = useState(false);
  const MAX_COMMENT_LENGTH = 1000;

  const handleOpenFinanceiroModal = (type: 'dda' | 'titulos') => {
    setConsultaFinanceiraType(type);
    setIsFinanceiroModalOpen(true);
  };

  const handleCloseNotification = () => {
    const success = notification.type === 'success';
    const message = notification.message;

    setNotification({ visible: false, type: 'success', message: '' });

    if (success) {
        if (message.includes('Alterações salvas com sucesso')) {
            setIsManualPedidoModalOpen(false);
            fetchAllData(true); // Recarrega os dados principais
        }
        else if (
            message.includes('manual com sucesso') ||
            message.includes('reprocessamento com sucesso') ||
            message.includes('reprocessamento fiscal') ||
            message.includes('transferida com sucesso')
        ) {
            onClose();
            if (onActionSuccess) onActionSuccess();
        }
    }
  };

  const { data: session } = useSession();

  const modalRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  // --- Funções de Fetch Individuais ---

  const fetchHistorico = useCallback(async () => {
    if (!chave) return;
    setLoadingHistorico(true);
    try {
        const fetchMovimentacoes = await fetch("/api/nfe/nfe-consulta-historico", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chave }) }).then(res => res.json());
        setMovimentacoes(fetchMovimentacoes || []);
        setHasLoadedHistorico(true);
    } catch (error) {
        console.error("Erro ao buscar histórico:", error);
        setMovimentacoes([]);
    } finally {
        setLoadingHistorico(false);
    }
  }, [chave]);

  const fetchErros = useCallback(async () => {
    if (!chave) return;
    setLoadingErros(true);
    try {
        const fetchErrosExecAuto = await fetch("/api/nfe/nfe-consulta-erro-execauto", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chave }) }).then(res => res.json());
        const validErros = Array.isArray(fetchErrosExecAuto) ? fetchErrosExecAuto.filter((err: any) => err.campo || err.motivo || err.mensagem_original) : [];
        setErrosExecAuto(validErros);
        setHasLoadedErros(true);
    } catch (error) {
        console.error("Erro ao buscar erros ExecAuto:", error);
        setErrosExecAuto([]);
    } finally {
        setLoadingErros(false);
    }
  }, [chave]);

  const fetchTes = useCallback(async () => {
    if (!chave) return;
    setLoadingTes(true);
    try {
        const fetchTes = await fetch("/api/nfe/nfe-consulta-tes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chave }) }).then(res => res.json());
        if (Array.isArray(fetchTes) && fetchTes.length > 0 && fetchTes[0].itens) {
            setTesData(fetchTes[0]);
        } else {
            setTesData(null);
        }
        setHasLoadedTes(true);
    } catch (error) {
        console.error("Erro ao buscar dados da TES:", error);
        setTesData(null);
    } finally {
        setLoadingTes(false);
    }
  }, [chave]);

  // --- Função de Carga Principal (Apenas Itens/Compras) ---

  const fetchAllData = useCallback(async (isRefresh = false) => {
    if (!visivel || !chave) return;

    if (!isRefresh) {
        setLoading(true);
    }

    // Reseta todos os estados de dados e flags de lazy load
    setItens([]);
    setMovimentacoes([]);
    setErrosExecAuto([]);
    setTesData(null);
    setHasLoadedHistorico(false);
    setHasLoadedErros(false);
    setHasLoadedTes(false);

    // Reseta estados de controle
    setActiveTab('compras');
    setIsSubmitting(false);
    setSelectedComprador(null);
    setMotivoTransferencia('');
    setInternalStatusTes(status_tes);

    // Carrega apenas os dados essenciais (Itens)
    const fetchDetalhes = fetch("/api/nfe/nfe-consulta-notas-itens", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chave }) }).then(res => res.json());
    
    try {
        const detalhesData = await fetchDetalhes;

        if (Array.isArray(detalhesData) && detalhesData.length > 0) {
            const nota = detalhesData[0];
            const itensDaNota = nota?.itens;

            if (itensDaNota && Array.isArray(itensDaNota) && itensDaNota.length > 0) {
                const itensMapeados = itensDaNota.map((item: any) => ({
                    ...item,
                    valor_unitario_xml: item.valor_unitario,
                }));
                setItens(itensMapeados);
                setInternalStatusTes(itensDaNota[0]?.status_tes);
            } else {
                setItens([]);
            }

            setNumNF(nota?.num_nf ?? '');
            setRespostaInvalida(false);

        } else {
            setItens([]);
            if(Array.isArray(detalhesData) && detalhesData.length > 0) {
              setNumNF(detalhesData[0]?.num_nf ?? '');
            }
            setRespostaInvalida(true);
        }
        // As outras chamadas (movimentacoes, erros, tes) foram removidas daqui
    } catch (error) {
        console.error("Erro ao buscar dados do modal:", error);
        setRespostaInvalida(true);
    } finally {
        setLoading(false); // Desativa o loader principal
    }
  }, [visivel, chave, status_tes]);

  // Efeito para carregar dados principais ao abrir o modal
  useEffect(() => {
    fetchAllData(false);
  }, [fetchAllData]);

  // --- Efeito para Lazy Loading das Abas ---
  useEffect(() => {
    if (!visivel) return; // Não fazer nada se o modal estiver fechado

    // Verifica a aba ativa e carrega se ainda não foi carregada
    switch (activeTab) {
        case 'historico':
            if (!hasLoadedHistorico) {
                fetchHistorico();
            }
            break;
        case 'erros':
            if (!hasLoadedErros) {
                fetchErros();
            }
            break;
        case 'fiscal':
            if (!hasLoadedTes) {
                fetchTes();
            }
            break;
        default:
            // 'compras', 'financeiro', 'responsavel' não disparam fetch ao clicar na aba
            break;
    }
  }, [activeTab, visivel, hasLoadedHistorico, hasLoadedErros, hasLoadedTes, fetchHistorico, fetchErros, fetchTes]);


  useEffect(() => {
      if (!visivel) {
          setNotification({ visible: false, type: 'success', message: '' });
          setDanfeError(null);
      }
  }, [visivel]);

  const handleMouseDown = (e: React.MouseEvent) => {
      if (modalRef.current) {
          const target = e.target as HTMLElement;
          // Impede o arraste em inputs, textareas e botões
          if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'BUTTON' || target.closest('button')) {
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

  useEffect(() => {
    if (visivel && modalRef.current) {
        const modal = modalRef.current;
        const initialX = (window.innerWidth - modal.offsetWidth) / 2;
        const initialY = 40;
        setPosition({ x: initialX > 0 ? initialX : 20, y: initialY });
    }
  }, [visivel]);


  const handleVisualizarDanfe = async () => {
    setIsDanfeLoading(true);
    setDanfeError(null);
    try {
      const response = await fetch('/api/nfe/nfe-danfe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chave: chave }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Falha ao gerar a DANFE.');
      }

      const html = await response.text();
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);

      const danfeWindow = window.open(url, '_blank');
      if (danfeWindow) {
        danfeWindow.focus();
      }

      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 100);

    } catch (error: any) {
      console.error(error);
      setDanfeError(error.message);
      setTimeout(() => setDanfeError(null), 5000);
    } finally {
      setIsDanfeLoading(false);
    }
  };

  const handleMarcarManual = async () => {
    setShowConfirmModal(false);
    setIsSubmitting(true);

    try {
        const response = await fetch('/api/nfe/nfe-marca-manuais', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chave: chave,
                email: session?.user?.email
            })
        });
        const result = await response.json();
        if (response.ok && result.status === 'ok') {
            setNotification({ visible: true, type: 'success', message: 'Nota marcada para lançamento manual com sucesso!' });
        } else {
            throw new Error(result.message || 'Resposta da API não foi "ok" ou falhou.');
        }
    } catch (error: any) {
        console.error(error);
        setNotification({ visible: true, type: 'error', message: error.message || 'Nao foi possivel realizar a operacao no momento, tente novamente.' });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleReprocessar = async () => {
    setIsSubmitting(true);
    setIsReprocessing(true);
    try {
        const response = await fetch('/api/nfe/nfe-reprocessa', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chave: chave,
                email: session?.user?.email
            })
        });
        const result = await response.json();
        if (response.ok && result.status === 'ok') {
            setNotification({ visible: true, type: 'success', message: 'Nota enviada para reprocessamento com sucesso!' });
        } else {
            throw new Error(result.message || 'Resposta da API não foi "ok" ou falhou.');
        }
    } catch (error: any) {
        console.error(error);
        setNotification({ visible: true, type: 'error', message: error.message || 'Nao foi possivel realizar a operacao no momento, tente novamente.' });
    } finally {
        setIsSubmitting(false);
        setIsReprocessing(false);
    }
  };

  const handleReprocessarFiscal = async () => {
    setIsSubmitting(true);
    setIsReprocessingTes(true);

    try {
        const response = await fetch('/api/nfe/nfe-reprocessa-fiscal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chave: chave,
                email: session?.user?.email
            })
        });

        const result = await response.json();

        if (response.ok && result.status === 'ok') {
            setNotification({ visible: true, type: 'success', message: 'Nota colocada na fila para reprocessamento fiscal.' });
        } else {
            throw new Error(result.message || 'A resposta da API não indicou sucesso.');
        }
    } catch (error: any) {
        console.error("Erro ao reprocessar fiscal:", error);
        setNotification({ visible: true, type: 'error', message: 'Não foi possível enviar para reprocessamento, tente novamente.' });
    } finally {
        setIsSubmitting(false);
        setIsReprocessingTes(false);
    }
  };

  const handleTransferirResponsavel = async () => {
    setShowTransferConfirmModal(false);
    if (!selectedComprador || !motivoTransferencia.trim()) {
      setNotification({ visible: true, type: 'error', message: 'Selecione um comprador e preencha o motivo.' });
      return;
    }

    setIsSubmitting(true);

    try {
        const response = await fetch('/api/nfe/nfe-transfere-comprador', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chave: chave,
                codigo_comprador_destino: selectedComprador.cod,
                nome_comprador_destino: selectedComprador.nome,
                motivo: motivoTransferencia
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || `Erro ${response.status}`);
        }

        setNotification({ visible: true, type: 'success', message: result.message || 'Responsabilidade transferida com sucesso!' });

    } catch (error: any) {
        console.error("--- ERRO NO FETCH ---", error);
        setNotification({ visible: true, type: 'error', message: error.message || 'Não foi possível realizar a operação no momento, tente novamente.' });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleSaveChangesTes = async (updates: { id: number; tes: string }[]) => {
    setIsSavingTes(true);
    try {
        const response = await fetch('/api/nfe/nfe-altera-tes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chave: chave,
                email: session?.user?.email,
                updates: updates
            })
        });
        const result = await response.json();
        if (response.ok && result.status === 'ok') {
            setNotification({ visible: true, type: 'success', message: 'TES alterada com sucesso!' });
            fetchAllData(true); // Recarrega tudo
            setIsManualTesModalOpen(false);

        } else {
            throw new Error(result.message || 'Falha ao atualizar a TES.');
        }
    } catch (error: any) {
        setNotification({ visible: true, type: 'error', message: 'Não foi possível realizar a alteração nesse momento, por favor tente novamente.' });
        setIsSavingTes(false);
        throw error;
    } finally {
        setIsSavingTes(false);
    }
  };

  const handleSavePedidos = async (updates: ItemPedidoManual[]) => {
    try {
        const payloadItens = updates.map(item => ({
            item_xml: item.item_xml,
            num_pedido: item.num_pedido,
            registro_pedido: item.registro_pedido,
            descricao_pedido: item.descricao_pedido_api,
        }));

        const response = await fetch('/api/nfe/nfe-altera-item-pedido', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chave: chave,
                email: session?.user?.email,
                itens: payloadItens,
            }),
        });

        const result = await response.json();

        if (response.ok && result.status === 'ok') {
            setNotification({ visible: true, type: 'success', message: 'Alterações salvas com sucesso!' });
        } else {
            throw new Error(result.message || 'Falha ao salvar as alterações nos pedidos.');
        }
    } catch (error: any) {
        setNotification({ visible: true, type: 'error', message: error.message || 'Ocorreu um erro ao salvar.' });
        throw error;
    }
  };

  const handleEnviarComentario = async () => {
    if (!newComment.trim()) {
        setNotification({ visible: true, type: 'error', message: 'O comentário não pode estar vazio.' });
        return;
    }
    setIsSendingComment(true);
    try {
        const response = await fetch('/api/nfe/nfe-historico-manual', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chave: chave,
                email_solicitante: session?.user?.email,
                historico: newComment.trim()
            }),
        });
        const result = await response.json();
        if (response.ok && result.status === 'ok') {
            setNotification({ visible: true, type: 'success', message: 'Comentário adicionado com sucesso!' });
            setNewComment('');
            setIsAddingComment(false);
            fetchHistorico(); // Recarrega o histórico para mostrar o novo comentário
        } else {
            throw new Error(result.message || 'Falha ao adicionar comentário.');
        }
    } catch (error: any) {
        setNotification({ visible: true, type: 'error', message: error.message || 'Não foi possível enviar o comentário.' });
    } finally {
        setIsSendingComment(false);
    }
  };

  if (!visivel) return null;

  // --- Componente de Spinner para Abas ---
  const TabSpinner = () => (
    <div className="tab-spinner-container">
      <div className="modal-tab-spinner"></div>
      <div className="modal-tab-spinner-text">Carregando...</div>
    </div>
  );

  const renderStatusIcon = (value: string) => {
    const isPositive = value?.toLowerCase() === "sim";
    return isPositive ? (
      <FaCheckCircle style={{ color: "var(--gcs-green)" }} title="Sim" />
    ) : (
      <FaTimesCircle style={{ color: "var(--gcs-brand-red)" }} title="Não" />
    );
  };

  const getJornadaActiveStep = (
      status: string,
      enviadoPelaUnidade: string | undefined,
      statusTes: typeof status_tes
  ): number => {
      const normalizedStatus = status ? status.trim().toLowerCase() : "";
      const enviado = enviadoPelaUnidade ? enviadoPelaUnidade.toLowerCase() === 'sim' : false;
      const normalizedTesStatus = statusTes?.trim().toUpperCase();

      if (normalizedStatus === 'importado' || normalizedStatus === 'manual' || normalizedStatus === 'finalizado') {
          return 5;
      }
      if (enviado) {
          return 4;
      }
      if (normalizedTesStatus === 'PROCESSADA') {
          return 3;
      }
      if (normalizedTesStatus === 'PENDENTE' || normalizedTesStatus === 'ERRO') {
          return 2;
      }
      return 1;
  };

  const activeStepIndex = getJornadaActiveStep(statusNF, itens[0]?.enviada, internalStatusTes);

  const isButtonDisabled = statusNF?.trim().toLowerCase() === 'importado' || statusNF?.trim().toLowerCase() === 'manual' || statusNF?.trim().toLowerCase() === 'finalizado';
  const MAX_MOTIVO_LENGTH = 255;

  const hasItemProcessingError = itens.some(item => item.valor_unitario_bate?.toLowerCase() === 'não' || item.item_ok?.toLowerCase() === 'não');

  const getSimilaridadeColor = (similaridade: number) => {
    if (similaridade >= 66) return 'var(--gcs-green)';
    if (similaridade >= 11) return 'var(--gcs-orange)';
    return 'var(--gcs-brand-red)';
  };

  const getConfiancaColor = (confianca: number) => {
    if (confianca >= 90) return 'var(--gcs-green)';
    if (confianca >= 70) return 'var(--gcs-orange)';
    return 'var(--gcs-brand-red)';
  };

  const getInitials = (name: string = '') => {
    const nameParts = name.trim().split(' ');
    if (nameParts.length > 1) {
        return `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
        setNotification({ visible: true, type: 'success', message: 'Erro copiado para a área de transferência!' });
    }, (err) => {
        console.error('Erro ao copiar: ', err);
        setNotification({ visible: true, type: 'error', message: 'Falha ao copiar o erro.' });
    });
  };

  // Define a classe do assistente com base no status
  const normalizedComprasStatus = statusCompras?.trim().toUpperCase() || 'DEFAULT';
  let assistantBoxClass = "assistant-box ";
  let assistantMessage = '';
  let areAssistantButtonsDisabled = false;

  switch (normalizedComprasStatus) {
      case 'CONCLUÍDO':
          assistantBoxClass += "status-concluido";
          assistantMessage = 'Todos os itens possuem pedidos classificados com os critérios treinados.';
          if (observacao?.trim() === "Não é necessário pedido") {
              areAssistantButtonsDisabled = true;
          }
          break;
      case 'PENDENTE':
          assistantBoxClass += "status-pendente";
          assistantMessage = 'Um ou mais itens apresentam divergências ou não foram vinculados a um pedido. Por favor, verifique no ERP se o pedido está ok, e se estiver utilize o botão de Forçar Reprocessamento, caso contrário, você pode clicar no botão Pedido manual e informar manually o pedido dos itens.';
          break;
      case 'EM FILA':
          assistantBoxClass += "status-em-fila";
          assistantMessage = 'O item está em fila para reprocessamento, aguarde.';
          areAssistantButtonsDisabled = true;
          break;
      default:
          assistantBoxClass += "status-pendente"; // Fallback para pendente
          assistantMessage = 'O status do processamento de compras é desconhecido ou não foi iniciado. Revise os itens e, se necessário, inicie uma ação manual.';
          break;
  }


  return (
    <>
      <NotificationModal
          visible={notification.visible}
          type={notification.type}
          message={notification.message}
          onClose={handleCloseNotification}
      />
      <div 
        className="modal-detalhes-backdrop"
        style={{ display: visivel ? 'block' : 'none' }}
      ></div>
      <div
        ref={modalRef}
        className="modal-detalhes-glass"
        style={{
            top: position.y,
            left: position.x,
            display: visivel ? 'flex' : 'none',
        }}
      >

          {/* O BLOCO DE ESTILO É INJETADO AQUI */}
          <style>{`
            :root {
                --gcs-blue: #00314A;
                --gcs-blue-light: #1b4c89;
                --gcs-blue-lighter: #a3b8d1;
                --gcs-blue-sky: #7DD3FC;
                --gcs-green: #5FB246;
                --gcs-green-dark: #28a745;
                --gcs-green-light: #effaf5;
                --gcs-green-border: #b7e4c7;
                --gcs-orange: #F58220;
                --gcs-orange-dark: #f7941d;
                --gcs-orange-light: #fffbe6;
                --gcs-orange-border: #ffe58f;
                --gcs-brand-red: #E11D2E;
                --gcs-red-light: #fff0f0;
                --gcs-red-border: #f5c2c7;
                --gcs-red-text: #721c24;
                --gcs-gray-light: #f1f5fb;
                --gcs-gray-border: #d0d7e2;
                --gcs-gray-text: #6c757d;
                --gcs-dark-text: #333;
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
            .modal-detalhes-backdrop {
                position: fixed;
                top: 0; left: 0;
                width: 100vw; height: 100vh;
                background-color: rgba(0,0,0,0.4);
                z-index: 2147483646;
            }
            .modal-detalhes-glass {
                position: fixed;
                border-radius: 12px;
                width: 90%;
                max-width: 1100px;
                min-height: 400px;
                max-height: 90vh;
                display: flex;
                flex-direction: column;
                box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                z-index: 2147483647;
                transition: background 0.3s ease, border 0.3s ease, box-shadow 0.3s ease;
            }
            body.light .modal-detalhes-glass {
                background: #fff;
                border: 1px solid #dee2e6;
            }
            body.dark .modal-detalhes-glass {
                background: var(--gcs-dark-bg-heavy);
                backdrop-filter: blur(16px);
                -webkit-backdrop-filter: blur(16px);
                border: 1px solid var(--gcs-dark-border);
            }

            /* --- Modal Header --- */
            .modal-detalhes-header {
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
            body.light .modal-detalhes-header {
                background-color: var(--gcs-gray-light);
                border-bottom-color: #dee2e6;
            }
            body.dark .modal-detalhes-header {
                background-color: rgba(25, 39, 53, 0.5);
                border-bottom-color: var(--gcs-dark-border);
            }
            .modal-detalhes-title {
                font-size: 1.2rem;
                font-weight: bold;
            }
            body.light .modal-detalhes-title { color: var(--gcs-dark-text); }
            body.dark .modal-detalhes-title { color: var(--gcs-dark-text-primary); }
            
            .modal-close-btn {
                background: none;
                border: none;
                font-size: 1.75rem;
                cursor: pointer;
                padding: 0;
                line-height: 1;
            }
            body.light .modal-close-btn { color: var(--gcs-dark-text); }
            body.dark .modal-close-btn { color: var(--gcs-dark-text-secondary); }
            body.dark .modal-close-btn:hover { color: var(--gcs-dark-text-primary); }

            /* --- Modal Content --- */
            .modal-content-wrapper {
                flex-grow: 1;
                overflow: hidden;
                display: flex;
                flex-direction: column;
            }
            .modal-content-scrollable {
                flex-grow: 1;
                overflow-y: scroll;
                padding: 0 1.5rem 1.5rem 1.5rem;
            }
            
            /* --- === CORREÇÃO SPINNER === --- */
            .modal-loading-container {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                flex-grow: 1;
                height: 100%;
            }
            .tab-spinner-container {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding-top: 3rem;
                padding-bottom: 3rem;
                min-height: 200px;
            }
            /* Main Modal Spinner */
            .modal-main-spinner {
                width: 40px;
                height: 40px;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }
            body.light .modal-main-spinner {
                border: 4px solid #ccc;
                border-top: 4px solid var(--gcs-blue-light);
            }
            body.dark .modal-main-spinner {
                border: 4px solid rgba(125, 173, 222, 0.2);
                border-top: 4px solid var(--gcs-blue-sky);
            }
            .modal-main-spinner-text {
                margin-top: 1rem;
                font-weight: bold;
                font-size: 1.1rem;
            }
            body.light .modal-main-spinner-text { color: var(--gcs-blue-light); }
            body.dark .modal-main-spinner-text { color: var(--gcs-blue-sky); }

            /* Tab Spinner */
            .modal-tab-spinner {
                width: 30px;
                height: 30px;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }
            body.light .modal-tab-spinner {
                border: 3px solid #ccc;
                border-top: 3px solid var(--gcs-blue-light);
            }
            body.dark .modal-tab-spinner {
                border: 3px solid rgba(125, 173, 222, 0.2);
                border-top: 3px solid var(--gcs-blue-sky);
            }
            .modal-tab-spinner-text {
                margin-top: 1rem;
                font-weight: bold;
                font-size: 1rem;
            }
            body.light .modal-tab-spinner-text { color: var(--gcs-blue-light); }
            body.dark .modal-tab-spinner-text { color: var(--gcs-blue-sky); }
            /* --- === FIM CORREÇÃO SPINNER === --- */

            /* --- Jornada --- */
            .jornada-header {
                padding: 1.5rem;
                border-bottom: 1px solid;
                transition: border-color 0.3s ease;
            }
            body.light .jornada-header { border-bottom-color: #dee2e6; }
            body.dark .jornada-header { border-bottom-color: var(--gcs-dark-border); }
            
            .jornada-title {
                margin-bottom: 0.75rem;
                font-size: 0.8rem;
                font-weight: bold;
            }
            body.light .jornada-title { color: var(--gcs-gray-text); }
            body.dark .jornada-title { color: var(--gcs-dark-text-tertiary); }

            .jornada-body {
                display: flex;
                align-items: center;
                justify-content: space-between;
            }
            .jornada-wrapper {
                max-width: 700px;
                flex-grow: 1;
                display: flex;
                align-items: flex-start;
                justify-content: center;
                gap: 4px;
            }
            .jornada-step {
                display: flex;
                flex-direction: column;
                align-items: center;
                text-align: center;
            }
            .jornada-circle {
                width: 26px;
                height: 26px;
                border-radius: 50%;
                border: 2px solid;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                font-size: 14px;
                transition: all 0.3s ease;
            }
            .jornada-text {
                margin-top: 8px;
                font-size: 11px;
                width: 80px;
                transition: color 0.3s ease;
            }
            .jornada-line {
                width: 60px;
                height: 2px;
                border-top: 2px;
                margin-top: 12px;
                transition: border-color 0.3s ease;
            }

            /* Jornada Light Theme */
            body.light .jornada-step.completed .jornada-circle { background-color: var(--gcs-green-dark); border-color: var(--gcs-green-dark); color: #fff; }
            body.light .jornada-step.completed .jornada-text { color: var(--gcs-dark-text); font-weight: bold; }
            body.light .jornada-line.completed { border-color: var(--gcs-green-dark); border-style: solid; }
            
            body.light .jornada-step.active .jornada-circle { background-color: #fff; border-color: var(--gcs-blue-light); color: var(--gcs-blue-light); }
            body.light .jornada-step.active .jornada-text { color: var(--gcs-dark-text); font-weight: bold; }
            
            body.light .jornada-step.pending .jornada-circle { background-color: #fff; border-color: #ced4da; color: #ced4da; }
            body.light .jornada-step.pending .jornada-text { color: #adb5bd; font-weight: normal; }
            body.light .jornada-line.pending { border-color: #dee2e6; border-style: dashed; }

            body.light .jornada-step.error .jornada-circle { background-color: var(--gcs-brand-red); border-color: var(--gcs-brand-red); color: #fff; }
            body.light .jornada-step.error .jornada-text { color: var(--gcs-brand-red); font-weight: bold; }
            body.light .jornada-line.error { border-color: var(--gcs-brand-red); border-style: solid; }

            /* Jornada Dark Theme */
            body.dark .jornada-step.completed .jornada-circle { background-color: var(--gcs-green); border-color: var(--gcs-green); color: var(--gcs-blue); }
            body.dark .jornada-step.completed .jornada-text { color: var(--gcs-dark-text-primary); font-weight: bold; }
            body.dark .jornada-line.completed { border-color: var(--gcs-green); border-style: solid; }
            
            body.dark .jornada-step.active .jornada-circle { background-color: transparent; border-color: var(--gcs-blue-sky); color: var(--gcs-blue-sky); }
            body.dark .jornada-step.active .jornada-text { color: var(--gcs-dark-text-primary); font-weight: bold; }
            
            body.dark .jornada-step.pending .jornada-circle { background-color: transparent; border-color: #475569; color: #475569; }
            body.dark .jornada-step.pending .jornada-text { color: #475569; font-weight: normal; }
            body.dark .jornada-line.pending { border-color: #475569; border-style: dashed; }

            body.dark .jornada-step.error .jornada-circle { background-color: var(--gcs-brand-red); border-color: var(--gcs-brand-red); color: #fff; }
            body.dark .jornada-step.error .jornada-text { color: #F87171; font-weight: bold; }
            body.dark .jornada-line.error { border-color: var(--gcs-brand-red); border-style: solid; }

            /* --- DANFE Button --- */
            .btn-danfe {
                display: flex; flex-direction: column; align-items: center;
                justify-content: center; gap: 4px; padding: 8px;
                border: 1px solid; border-radius: 8px;
                font-weight: bold; font-size: 11px; cursor: pointer;
                transition: all 0.2s ease-in-out;
                min-width: 70px; min-height: 50px; margin-left: 2rem;
            }
            .btn-danfe:disabled { cursor: wait; opacity: 0.7; }
            body.light .btn-danfe { background-color: #e7f5ff; color: var(--gcs-blue-light); border-color: #bde0fe; }
            body.light .btn-danfe:hover:not(:disabled) { background-color: #d0ebff; }
            body.dark .btn-danfe { background-color: rgba(59, 130, 246, 0.15); color: var(--gcs-blue-sky); border-color: rgba(59, 130, 246, 0.3); }
            body.dark .btn-danfe:hover:not(:disabled) { background-color: rgba(59, 130, 246, 0.25); border-color: rgba(59, 130, 246, 0.5); }
            .danfe-error {
                color: var(--gcs-brand-red); text-align: center; padding: 5px; font-size: 0.9em; 
                border: 1px solid; border-radius: 5px; margin: 1rem 0 0 0; flex-shrink: 0;
            }
            body.light .danfe-error { background: var(--gcs-red-light); border-color: var(--gcs-red-border); }
            body.dark .danfe-error { background: rgba(225, 29, 46, 0.15); border-color: rgba(225, 29, 46, 0.3); }

            /* --- Info Box --- */
            .modal-info-box {
                border-radius: 8px;
                padding: 1rem;
                margin: 1.5rem 0;
                border: 1px solid;
                flex-shrink: 0;
                display: grid;
                grid-template-columns: 150px auto 150px 1fr;
                row-gap: 8px;
                column-gap: 16px;
                font-size: 14px;
                transition: all 0.3s ease;
            }
            body.light .modal-info-box {
                background: var(--gcs-gray-light);
                border-color: var(--gcs-gray-border);
            }
            body.dark .modal-info-box {
                background: rgba(25, 39, 53, 0.25);
                border-color: var(--gcs-dark-border);
            }
            .modal-info-box > div { word-break: break-all; }
            body.light .modal-info-box > div:nth-child(odd) { font-weight: bold; color: var(--gcs-dark-text); }
            body.light .modal-info-box > div:nth-child(even) { color: #212529; }
            body.dark .modal-info-box > div:nth-child(odd) { font-weight: bold; color: var(--gcs-dark-text-primary); }
            body.dark .modal-info-box > div:nth-child(even) { color: var(--gcs-dark-text-secondary); }

            /* --- Tabs --- */
            .modal-tabs-container {
                border-bottom: 1px solid;
                display: flex;
                flex-wrap: wrap;
                flex-shrink: 0;
            }
            body.light .modal-tabs-container { border-bottom-color: #dee2e6; }
            body.dark .modal-tabs-container { border-bottom-color: var(--gcs-dark-border); }
            
            .modal-tab-button {
                background: none; border: none; cursor: pointer;
                padding: 0.75rem 1.5rem; font-size: 1rem; font-weight: 500;
                position: relative; transition: all 0.2s ease-in-out;
            }
            .modal-tab-button::after {
                content: '';
                position: absolute;
                bottom: -2px; right: 0;
                width: 100%; height: 100%;
                border-style: solid; border-width: 0 3px 3px 0;
                opacity: 0; transform: scale(0.95);
                transition: all 0.2s ease-in-out;
                pointer-events: none;
            }
            .modal-tab-button:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
            
            /* Tabs Light */
            body.light .modal-tab-button { color: #555; }
            body.light .modal-tab-button::after {
                border-image: linear-gradient(135deg, var(--gcs-blue), var(--gcs-blue-lighter)) 1;
                filter: drop-shadow(1px 1px 1px rgba(0,0,0,0.2));
            }
            body.light .modal-tab-button:hover:not(.active):not(:disabled) {
                transform: translateY(-2px);
                color: var(--gcs-blue);
            }
            body.light .modal-tab-button.active {
                color: var(--gcs-blue);
                font-weight: 600;
                transform: translateY(-2px);
            }
            body.light .modal-tab-button.active::after { opacity: 1; transform: scale(1); }

            /* Tabs Dark */
            body.dark .modal-tab-button { color: var(--gcs-dark-text-tertiary); }
            body.dark .modal-tab-button::after {
                border-image: linear-gradient(135deg, var(--gcs-blue-sky), var(--gcs-blue-light)) 1;
            }
            body.dark .modal-tab-button:hover:not(.active):not(:disabled) {
                transform: translateY(-2px);
                color: var(--gcs-dark-text-primary);
            }
            body.dark .modal-tab-button.active {
                color: var(--gcs-dark-text-primary);
                font-weight: 600;
                transform: translateY(-2px);
            }
            body.dark .modal-tab-button.active::after { opacity: 1; transform: scale(1); }

            /* --- Tab Content --- */
            .modal-tab-content {
                position: relative;
                padding-top: 1.5rem;
                padding-bottom: 1.5rem;
            }
            .modal-h3 {
                font-size: 1.1rem;
                font-weight: bold;
                margin-top: 0;
                margin-bottom: 1rem;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            body.light .modal-h3 { color: var(--gcs-dark-text); }
            body.dark .modal-h3 { color: var(--gcs-dark-text-primary); }
            
            .no-data-message {
                text-align: center;
                padding-top: 2rem;
            }
            body.light .no-data-message { color: #888; }
            body.dark .no-data-message { color: var(--gcs-dark-text-tertiary); }

            /* --- Botões --- */
            .btn {
                display: inline-flex; align-items: center; justify-content: center;
                gap: 8px; padding: 10px 20px; border-radius: 5px;
                border: none; font-weight: bold; cursor: pointer;
                transition: all 0.2s ease;
            }
            .btn:disabled { cursor: not-allowed; opacity: 0.6; }
            
            .btn-primary { background-color: #007bff; color: white; }
            .btn-primary:hover:not(:disabled) { background-color: #0056b3; }
            
            .btn-secondary {
                border: 1px solid;
                font-weight: bold;
            }
            body.light .btn-secondary {
                background: #f1f1f1; color: var(--gcs-dark-text); border-color: #ccc;
            }
            body.light .btn-secondary:hover:not(:disabled) { background: #e0e0e0; }
            body.dark .btn-secondary {
                background: var(--gcs-dark-bg-transparent); color: var(--gcs-dark-text-secondary); border-color: var(--gcs-dark-border);
            }
            body.dark .btn-secondary:hover:not(:disabled) { background: rgba(25, 39, 53, 0.7); border-color: var(--gcs-dark-border-hover); }

            .btn-danger { background-color: var(--gcs-brand-red); color: white; }
            .btn-danger:hover:not(:disabled) { background-color: #b01725; }
            
            .btn-warning { background-color: var(--gcs-orange-dark); color: white; }
            .btn-warning:hover:not(:disabled) { background-color: #d17814; }
            
            .btn-info { background-color: #17a2b8; color: white; }
            .btn-info:hover:not(:disabled) { background-color: #117a8b; }
            
            .btn-green { background-color: var(--gcs-green-dark); color: white; }
            .btn-green:hover:not(:disabled) { background-color: #1e7e34; }

            .btn-add-comment {
                background: var(--gcs-blue-light); color: white; border: none;
                border-radius: 5px; padding: 8px 16px; cursor: pointer;
                display: flex; align-items: center; gap: 8px;
                font-weight: bold; font-size: 14px;
                transition: background-color 0.2s ease;
            }
            body.light .btn-add-comment:hover { background-color: var(--gcs-blue); }
            body.dark .btn-add-comment { background-color: var(--gcs-blue-sky); color: var(--gcs-blue); }
            body.dark .btn-add-comment:hover { background-color: #a7e4ff; }

            /* --- Assistant Box --- */
            .assistant-box {
                padding: 1rem; border-radius: 8px; border: 1px solid;
                margin-bottom: 2.5rem; font-size: 14px;
                transition: all 0.3s ease;
            }
            .assistant-box p { margin: 0; line-height: 1.6; }
            .assistant-box-buttons { margin-top: 1.5rem; display: flex; gap: 1rem; flex-wrap: wrap; }

            body.light .assistant-box { color: var(--gcs-dark-text); }
            body.light .assistant-box.status-concluido { background: var(--gcs-green-light); border-color: var(--gcs-green-border); }
            body.light .assistant-box.status-pendente { background: var(--gcs-orange-light); border-color: var(--gcs-orange-border); }
            body.light .assistant-box.status-em-fila { background: #f8f9fa; border-color: #dee2e6; }
            body.light .assistant-box.status-default { background: var(--gcs-orange-light); border-color: var(--gcs-orange-border); }
            
            body.dark .assistant-box { color: var(--gcs-dark-text-secondary); }
            body.dark .assistant-box.status-concluido { background: rgba(95, 178, 70, 0.1); border-color: rgba(95, 178, 70, 0.3); }
            body.dark .assistant-box.status-pendente { background: rgba(245, 130, 32, 0.1); border-color: rgba(245, 130, 32, 0.3); }
            body.dark .assistant-box.status-em-fila { background: rgba(25, 39, 53, 0.25); border-color: var(--gcs-dark-border); }
            body.dark .assistant-box.status-default { background: rgba(245, 130, 32, 0.1); border-color: rgba(245, 130, 32, 0.3); }

            /* --- Tabelas --- */
            .modal-table-container { overflow-x: auto; }
            .modal-table {
                width: 100%;
                border-collapse: collapse;
                font-size: 14px;
            }
            .modal-table th, .modal-table td {
                padding: 10px;
                border: 1px solid;
                text-align: left;
                transition: all 0.3s ease;
            }
            .modal-table th { font-size: 13px; }
            
            /* Tabela Light */
            body.light .modal-table th {
                background-color: var(--gcs-blue-light);
                color: #fff;
                border-color: #ccc;
            }
            body.light .modal-table td {
                border-color: #ddd;
                color: var(--gcs-dark-text);
            }
            body.light .modal-table tbody tr:nth-of-type(even) { background-color: #f9f9f9; }
            body.light .modal-table tbody tr:hover { background-color: #f1f1f1; }

            /* Tabela Dark */
            body.dark .modal-table th {
                background-color: var(--gcs-blue);
                color: var(--gcs-dark-text-primary);
                border-color: var(--gcs-dark-border-hover);
            }
            body.dark .modal-table td {
                border-color: var(--gcs-dark-border);
                color: var(--gcs-dark-text-secondary);
            }
            body.dark .modal-table tbody tr { background-color: rgba(25, 39, 53, 0.1); }
            body.dark .modal-table tbody tr:nth-of-type(even) { background-color: rgba(25, 39, 53, 0.25); }
            body.dark .modal-table tbody tr:hover { background-color: rgba(25, 39, 53, 0.4); }

            /* --- Histórico Tab --- */
            .comment-box {
                border: 1px solid;
                border-radius: 8px;
                padding: 1rem;
                margin-bottom: 1.5rem;
            }
            body.light .comment-box { background: #f8f9fa; border-color: #dee2e6; }
            body.dark .comment-box { background: rgba(25, 39, 53, 0.25); border-color: var(--gcs-dark-border); }

            .comment-textarea {
                width: 100%; padding: 10px; border-radius: 5px;
                border: 1px solid; resize: vertical; font-size: 14px;
                box-sizing: border-box; transition: all 0.3s ease;
            }
            body.light .comment-textarea { background: #fff; border-color: #ccc; color: var(--gcs-dark-text); }
            body.dark .comment-textarea { background: rgba(25, 39, 53, 0.5); border-color: var(--gcs-dark-border); color: var(--gcs-dark-text-primary); }
            body.dark .comment-textarea:focus { border-color: var(--gcs-dark-border-hover); background: rgba(25, 39, 53, 0.7); }
            
            .comment-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 0.75rem; }
            .comment-char-count { font-size: 12px; }
            body.light .comment-char-count { color: var(--gcs-gray-text); }
            body.dark .comment-char-count { color: var(--gcs-dark-text-tertiary); }
            .comment-actions { display: flex; gap: 8px; }
            
            .historico-list-container {
                padding: 1rem;
                border-radius: 8px;
                border: 1px solid;
            }
            body.light .historico-list-container { background: #f4f6fb; border-color: var(--gcs-gray-border); }
            body.dark .historico-list-container { background: rgba(25, 39, 53, 0.25); border-color: var(--gcs-dark-border); }
            
            .historico-list { list-style: none; padding: 0; margin: 0; }
            
            /* === AJUSTE HISTÓRICO === */
            .historico-item {
                display: flex; gap: 0.75rem; align-items: flex-start;
                padding: 1.25rem 0.5rem;
                border-bottom: 1px solid;
            }
            .historico-item:first-child {
                padding-top: 0.5rem;
            }
            .historico-item:last-child {
                border-bottom: none;
                padding-bottom: 0.5rem;
            }
            body.light .historico-item { border-bottom-color: #dee2e6; }
            body.dark .historico-item { border-bottom-color: var(--gcs-dark-border); }
            /* === FIM AJUSTE === */
            
            .historico-avatar {
                width: 36px; height: 36px; border-radius: 50%;
                display: flex; align-items: center; justify-content: center;
                color: #fff; font-weight: bold; font-size: 0.9rem; flex-shrink: 0;
            }
            .historico-avatar.system { background-color: var(--gcs-blue-light); }
            .historico-avatar.user { background-color: var(--gcs-gray-text); }
            
            .historico-content strong {
                font-size: 1rem;
            }
            body.light .historico-content strong { color: var(--gcs-blue-light); }
            body.dark .historico-content strong { color: var(--gcs-blue-sky); }
            .historico-date { font-size: 0.8rem; margin-bottom: 0.25rem; }
            body.light .historico-date { color: #777; }
            body.dark .historico-date { color: var(--gcs-dark-text-tertiary); }
            .historico-message { font-size: 0.95rem; }
            body.light .historico-message { color: var(--gcs-dark-text); }
            body.dark .historico-message { color: var(--gcs-dark-text-secondary); }

            /* --- Erros Tab --- */
            .erros-list-container {
                padding: 1rem;
                border-radius: 8px;
                border: 1px solid;
            }
            body.light .erros-list-container { background: var(--gcs-red-light); border-color: var(--gcs-red-border); }
            body.dark .erros-list-container { background: rgba(225, 29, 46, 0.1); border-color: rgba(225, 29, 46, 0.3); }

            .erros-list { list-style: none; padding: 0; margin: 0; }
            .erros-item {
                position: relative;
                border-left: 4px solid var(--gcs-brand-red);
                padding: 1rem; border-radius: 8px;
                box-shadow: 0 1px 2px rgba(0,0,0,0.05);
                transition: background-color 0.3s ease;
            }
            .erros-item:not(:last-child) { margin-bottom: 1rem; }
            body.light .erros-item { background: #fff; }
            body.dark .erros-item { background: rgba(25, 39, 53, 0.5); }

            .btn-copy-error {
                position: absolute; top: 10px; right: 10px;
                border: 1px solid; border-radius: 50%;
                width: 30px; height: 30px;
                display: flex; align-items: center; justify-content: center;
                cursor: pointer; transition: all 0.3s ease;
            }
            body.light .btn-copy-error { background: #f8d7da; border-color: #f5c6cb; color: var(--gcs-red-text); }
            body.light .btn-copy-error:hover { background: #f1c2c7; }
            body.dark .btn-copy-error { background: rgba(225, 29, 46, 0.2); border-color: rgba(225, 29, 46, 0.4); color: #F87171; }
            body.dark .btn-copy-error:hover { background: rgba(225, 29, 46, 0.3); }

            .erros-item-date { font-size: 0.85rem; font-weight: bold; margin-bottom: 0.5rem; }
            body.light .erros-item-date { color: var(--gcs-brand-red); }
            body.dark .erros-item-date { color: #F87171; }
            
            .erros-item-content { font-size: 0.95rem; display: flex; flex-direction: column; gap: 0.5rem; }
            body.light .erros-item-content { color: var(--gcs-dark-text); }
            body.dark .erros-item-content { color: var(--gcs-dark-text-secondary); }
            
            .error-message-pre, .error-message-formatted {
                padding: 0.75rem; border-radius: 4px; margin-top: 0.5rem;
                font-family: monospace; font-size: 0.85rem;
                line-height: 1.6; white-space: pre-wrap; word-break: break-all;
            }
            body.light .error-message-pre, body.light .error-message-formatted {
                background: #f8d7da; color: var(--gcs-red-text);
            }
            body.dark .error-message-pre, body.dark .error-message-formatted {
                background: rgba(225, 29, 46, 0.15); color: #FCCFCF;
            }
            
            .error-message-title { font-weight: bold; margin-bottom: 0.5rem; }
            .error-message-grid { display: grid; grid-template-columns: 160px 1fr; gap: 10px; }
            body.light .error-message-key { color: #555; }
            body.dark .error-message-key { color: var(--gcs-dark-text-tertiary); }
            .error-message-value { font-weight: bold; }

            /* --- Fiscal/Financeiro/Responsavel Tab Box --- */
            .tab-section-box {
                border: 1px solid;
                border-radius: 8px;
                padding: 1.5rem;
                transition: all 0.3s ease;
            }
            body.light .tab-section-box { background: #f8f9fa; border-color: #dee2e6; }
            body.dark .tab-section-box { background: rgba(25, 39, 53, 0.25); border-color: var(--gcs-dark-border); }
            
            .tab-section-box p { margin: 0; line-height: 1.6; font-size: 14px; }
            body.light .tab-section-box p { color: var(--gcs-gray-text); }
            body.dark .tab-section-box p { color: var(--gcs-dark-text-secondary); }
            .tab-section-box .btn-container { margin-top: 1.5rem; display: flex; gap: 1rem; }
            
            .form-label { font-weight: bold; display: block; margin-bottom: 8px; }
            body.light .form-label { color: var(--gcs-dark-text); }
            body.dark .form-label { color: var(--gcs-dark-text-primary); }

            .form-textarea {
                width: 100%; padding: 10px; border-radius: 5px;
                border: 1px solid; resize: vertical; box-sizing: border-box;
                font-size: 14px;
            }
            body.light .form-textarea { background: #fff; border-color: #ccc; color: var(--gcs-dark-text); }
            body.dark .form-textarea { background: rgba(25, 39, 53, 0.5); border-color: var(--gcs-dark-border); color: var(--gcs-dark-text-primary); }
            body.dark .form-textarea:focus { border-color: var(--gcs-dark-border-hover); background: rgba(25, 39, 53, 0.7); }
            
            .char-count-footer { text-align: right; font-size: 0.8rem; margin-top: 4px; }
            body.light .char-count-footer { color: var(--gcs-gray-text); }
            body.dark .char-count-footer { color: var(--gcs-dark-text-tertiary); }
            
            .action-disabled-message { font-size: 0.9rem; margin-top: 1rem; font-weight: bold; }
            body.light .action-disabled-message { color: var(--gcs-brand-red); }
            body.dark .action-disabled-message { color: #F87171; }

            /* --- ConfirmationModal --- */
            .confirm-modal-backdrop {
                position: fixed; top: 0; left: 0;
                width: 100vw; height: 100vh;
                background-color: rgba(0,0,0,0.5);
                z-index: 2147483648;
            }
            .confirm-modal-content {
                position: fixed; top: 50%; left: 50%;
                transform: translate(-50%, -50%);
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.2);
                z-index: 2147483649;
                width: 90%; max-width: 450px;
                padding: 2rem;
                text-align: center;
            }
            body.light .confirm-modal-content { background-color: white; }
            body.dark .confirm-modal-content {
                background: var(--gcs-dark-bg-heavy);
                border: 1px solid var(--gcs-dark-border);
            }
            .confirm-modal-icon { display: flex; justify-content: center; margin-bottom: 1rem; }
            .confirm-modal-title { margin-top: 0; margin-bottom: 1rem; font-size: 1.5rem; }
            body.light .confirm-modal-title { color: #333; }
            body.dark .confirm-modal-title { color: var(--gcs-dark-text-primary); }
            .confirm-modal-message { line-height: 1.6; }
            body.light .confirm-modal-message { color: #666; }
            body.dark .confirm-modal-message { color: var(--gcs-dark-text-secondary); }
            .confirm-modal-actions { margin-top: 1.5rem; display: flex; justify-content: center; gap: 1rem; }

            /* --- SearchModal (Comprador) --- */
            .search-modal-backdrop {
                position: fixed; top: 0; left: 0;
                width: 100vw; height: 100vh;
                background-color: rgba(0,0,0,0.6);
                z-index: 2147483648;
            }
            .search-modal-content {
                position: fixed; top: 50%; left: 50%;
                transform: translate(-50%, -50%);
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.2);
                z-index: 2147483649;
                width: 90%; max-width: 500px;
                display: flex; flex-direction: column; gap: 1rem;
                padding: 1.5rem;
            }
            body.light .search-modal-content { background-color: white; }
            body.dark .search-modal-content {
                background: var(--gcs-dark-bg-heavy);
                border: 1px solid var(--gcs-dark-border);
            }
            .search-modal-header { display: flex; justify-content: space-between; align-items: center; }
            .search-modal-title { margin: 0; font-size: 1.2rem; }
            body.light .search-modal-title { color: var(--gcs-dark-text); }
            body.dark .search-modal-title { color: var(--gcs-dark-text-primary); }
            
            .search-modal-input {
                flex: 1; padding: 10px; border-radius: 5px;
                border: 1px solid; font-size: 1rem;
            }
            body.light .search-modal-input { background: #fff; border-color: #ccc; color: var(--gcs-dark-text); }
            body.dark .search-modal-input { background: rgba(25, 39, 53, 0.5); border-color: var(--gcs-dark-border); color: var(--gcs-dark-text-primary); }
            body.dark .search-modal-input:focus { border-color: var(--gcs-dark-border-hover); background: rgba(25, 39, 53, 0.7); }
            
            .search-modal-error { font-size: 0.9rem; }
            body.light .search-modal-error { color: var(--gcs-brand-red); }
            body.dark .search-modal-error { color: #F87171; }
            
            .search-modal-results-container {
                max-height: 250px; overflow-y: auto;
                border-top: 1px solid;
            }
            body.light .search-modal-results-container { border-top-color: #eee; }
            body.dark .search-modal-results-container { border-top-color: var(--gcs-dark-border); }
            
            .search-modal-results { list-style: none; padding: 0; margin: 0.5rem 0 0 0; }
            .search-modal-result-item {
                padding: 12px 10px; cursor: pointer;
                border-bottom: 1px solid;
                transition: background-color 0.2s ease-in-out;
            }
            body.light .search-modal-result-item { border-bottom-color: #f0f0f0; color: var(--gcs-dark-text); }
            body.light .search-modal-result-item:hover { background-color: #eaf2fa; }
            body.dark .search-modal-result-item { border-bottom-color: var(--gcs-dark-border); color: var(--gcs-dark-text-secondary); }
            body.dark .search-modal-result-item:hover { background-color: rgba(25, 39, 53, 0.7); }
            
            .search-modal-result-code { font-size: 0.9em; }
            body.light .search-modal-result-code { color: var(--gcs-gray-text); }
            body.dark .search-modal-result-code { color: var(--gcs-dark-text-tertiary); }

            .search-modal-no-results { padding: 20px; text-align: center; }
            body.light .search-modal-no-results { color: var(--gcs-gray-text); }
            body.dark .search-modal-no-results { color: var(--gcs-dark-text-tertiary); }

            /* --- CompradorSearch Component --- */
            .comprador-display {
                flex: 1; padding: 10px; border: 1px solid;
                border-radius: 5px;
            }
            body.light .comprador-display {
                background: #e9ecef; border-color: #ccc;
                color: var(--gcs-dark-text);
            }
            body.light .comprador-display:empty { color: var(--gcs-gray-text); }
            body.dark .comprador-display {
                background: rgba(25, 39, 53, 0.5); border-color: var(--gcs-dark-border);
                color: var(--gcs-dark-text-secondary);
            }
            body.dark .comprador-display:empty { color: var(--gcs-dark-text-tertiary); }

          `}</style>

          <div
            onMouseDown={handleMouseDown}
            className="modal-detalhes-header"
          >
            <span className="modal-detalhes-title">Detalhes da Nota</span>
            <button onClick={onClose} className="modal-close-btn">×</button>
          </div>

          {loading ? (
            <div className="modal-loading-container">
                <div className="modal-main-spinner"></div>
                <div className="modal-main-spinner-text">Aguarde... Carregando os dados da Nota Fiscal</div>
            </div>
          ) : (
            <div className="modal-content-wrapper">
              <div className="jornada-header">
                  <div className="jornada-title">Jornada</div>
                  <div className="jornada-body">
                      <div className="jornada-wrapper">
                          <NotaJornada
                              activeStepIndex={activeStepIndex}
                              status_tes={internalStatusTes}
                              hasItemProcessingError={hasItemProcessingError}
                              statusNF={statusNF}
                              statusCompras={statusCompras}
                          />
                      </div>
                      <button
                          onClick={handleVisualizarDanfe}
                          disabled={isDanfeLoading}
                          title="Visualizar DANFE"
                          className="btn-danfe"
                      >
                          {isDanfeLoading ? <FaSpinner className="animate-spin" style={{ fontSize: '1.2rem' }} /> : <FaFileInvoice style={{ fontSize: '1.2rem' }} />}
                          <span style={{marginTop: '2px'}}>{isDanfeLoading ? '' : 'DANFE'}</span>
                      </button>
                  </div>
              </div>

              <div className="modal-content-scrollable">
                {danfeError && (
                    <div className="danfe-error">{danfeError}</div>
                )}

                <div className="modal-info-box">
                    <div>Nota Fiscal:</div>
                    <div>{numNF || '-'}</div>
                    <div>Nome Fornecedor:</div>
                    <div>{nomeFornecedor?.trim() || '-'}</div>
                    <div>Chave da Nota:</div>
                    <div>{chave}</div>
                    <div>Enviado pela Unidade:</div>
                    <div>{renderStatusIcon(itens[0]?.enviada ?? '-')}</div>
                    <div>Número do Pedido:</div>
                    <div>{Array.from(new Set(itens.map(i => i.num_pedido).filter(p => p))).join(', ') || '-'}</div>
                    <div>Data do Envio:</div>
                    <div>{itens[0]?.dt_enviada ? new Date(itens[0].dt_enviada).toLocaleDateString() : '-'}</div>
                    <div>Comprador:</div>
                    <div>{(() => {
                      const nomes = itens.map(i => i.nome_usuario?.trim()).filter(n => !!n);
                      if (nomes.length === 0) return '-';
                      const contagem = nomes.reduce((acc, nome) => { acc[nome as string] = (acc[nome as string] || 0) + 1; return acc; }, {} as Record<string, number>);
                      return Object.entries(contagem).sort((a, b) => b[1] - a[1])[0][0];
                    })()}</div>
                    <div>Dias do Envio:</div>
                    <div>{(() => {
                      const enviada = itens[0]?.dt_enviada;
                      if (!enviada) return '-';
                      const diff = Math.floor((new Date().getTime() - new Date(enviada).getTime()) / (1000 * 60 * 60 * 24));
                      return diff + ' dias';
                    })()}</div>
                </div>

                <div className="modal-tabs-container">
                  <button onClick={() => setActiveTab('compras')} className={`modal-tab-button ${activeTab === 'compras' ? 'active' : ''}`}>Compras</button>
                  <button onClick={() => setActiveTab('historico')} className={`modal-tab-button ${activeTab === 'historico' ? 'active' : ''}`}>Histórico</button>
                  <button onClick={() => setActiveTab('erros')} className={`modal-tab-button ${activeTab === 'erros' ? 'active' : ''}`}>Erros</button>
                  <button onClick={() => setActiveTab('fiscal')} className={`modal-tab-button ${activeTab === 'fiscal' ? 'active' : ''}`}>Fiscal</button>
                  <button onClick={() => setActiveTab('financeiro')} className={`modal-tab-button ${activeTab === 'financeiro' ? 'active' : ''}`}>Financeiro</button>
                  <button onClick={() => setActiveTab('responsavel')} className={`modal-tab-button ${activeTab === 'responsavel' ? 'active' : ''}`}>Responsável</button>
                </div>

                <div className="modal-tab-content">
                    {activeTab === 'compras' && (
                      <div>
                      <h3 className="modal-h3">
                          <Sparkles /> Assistente de Compras
                      </h3>
                      <div className={assistantBoxClass}>
                          <p>
                              {assistantMessage}
                          </p>
                          <div className="assistant-box-buttons">
                              <button
                                  onClick={() => setIsManualPedidoModalOpen(true)}
                                  disabled={isButtonDisabled || isSubmitting || areAssistantButtonsDisabled}
                                  className="btn btn-info"
                              >
                                  <FaPencilAlt size={14} />
                                  Pedido Manual
                              </button>
                              <button
                                  onClick={handleReprocessar}
                                  disabled={isButtonDisabled || isSubmitting || areAssistantButtonsDisabled}
                                  className="btn btn-warning"
                                  style={{ minWidth: '230px' }}
                              >
                                  {isReprocessing ? (
                                    <>
                                        <FaSpinner className="animate-spin" size={14} />
                                        <span>Aguarde...</span>
                                    </>
                                  ) : (
                                    <>
                                        <FaSyncAlt size={14} />
                                        <span>Forçar Reprocessamento</span>
                                    </>
                                  )}
                              </button>
                          </div>
                      </div>

                      <h3 className="modal-h3"><FaListAlt /> Itens da Nota Fiscal</h3>
                      {(respostaInvalida || itens.length === 0) ? (
                        <p className="no-data-message">Nenhum item a ser exibido para esta nota.</p>
                      ) : (
                        <div className="modal-table-container">
                            <table className="modal-table">
                              <thead>
                                <tr>
                                  <th>Item XML</th>
                                  <th>Descrição XML</th>
                                  <th>Un. Med XML</th>
                                  <th>Descrição Pedido</th>
                                  <th>Un. Med. Pedido</th>
                                  <th>Seg.Un. Pedido</th>
                                  <th>Pedido</th>
                                  <th>Similaridade</th>
                                  <th>Valor Bate</th>
                                  <th>Item OK</th>
                                  <th>Justificativa</th>
                                </tr>
                              </thead>
                              <tbody>
                                {itens.map((item, index) => (
                                  <tr key={index}>
                                    <td style={{ textAlign: 'center' }}>{item.item_xml}</td>
                                    <td>{item.descricao_xml}</td>
                                    <td style={{ textAlign: 'center' }}>{item.um_xml ?? '-'}</td>
                                    <td>{item.descricao_pedido ?? '-'}</td>
                                    <td style={{ textAlign: 'center' }}>{item.um_pedido ?? '-'}</td>
                                    <td style={{ textAlign: 'center' }}>{item.segum_pedido ?? '-'}</td>
                                    <td style={{ textAlign: 'center' }}>{item.num_pedido ?? '-'}</td>
                                    <td style={{ textAlign: 'center' }}>
                                      <span style={{ color: getSimilaridadeColor(item.similaridade_descricao), fontWeight: 'bold' }}>
                                        {item.similaridade_descricao}%
                                      </span>
                                    </td>
                                    <td style={{ textAlign: 'center' }}>{renderStatusIcon(item.valor_unitario_bate)}</td>
                                    <td style={{ textAlign: 'center' }}>{renderStatusIcon(item.item_ok)}</td>
                                    <td>{item.justificativa}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                        </div>
                      )}
                    </div>
                    )}
                    {activeTab === 'historico' && (
                      <div>
                        {loadingHistorico ? <TabSpinner /> : (
                            <>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                    <h3 className="modal-h3" style={{ margin: 0 }}><FaHistory /> Histórico de Movimentações</h3>
                                    {!isAddingComment && (
                                        <button 
                                            onClick={() => setIsAddingComment(true)}
                                            className="btn-add-comment"
                                        >
                                            <FaPlus size={12} /> Adicionar Comentário
                                        </button>
                                    )}
                                </div>
                                
                                {isAddingComment && (
                                    <div className="comment-box">
                                        <textarea
                                            value={newComment}
                                            onChange={(e) => setNewComment(e.target.value)}
                                            maxLength={MAX_COMMENT_LENGTH}
                                            placeholder="Digite seu comentário aqui..."
                                            rows={4}
                                            className="comment-textarea"
                                            autoFocus
                                        />
                                        <div className="comment-footer">
                                            <span className="comment-char-count">
                                                {MAX_COMMENT_LENGTH - newComment.length} caracteres restantes
                                            </span>
                                            <div className="comment-actions">
                                                <button 
                                                    onClick={() => { setIsAddingComment(false); setNewComment(''); }}
                                                    disabled={isSendingComment}
                                                    className="btn btn-secondary"
                                                >
                                                    Cancelar
                                                </button>
                                                <button 
                                                    onClick={handleEnviarComentario} 
                                                    disabled={isSendingComment || !newComment.trim()}
                                                    className="btn btn-green"
                                                >
                                                    {isSendingComment ? <><FaSpinner className="animate-spin" size={14} /> <span>Enviando...</span></> : 'Enviar'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {(movimentacoes.length === 0) ? (
                                <p className="no-data-message">Não há movimentações no histórico ainda.</p>
                                ) : (
                                <div className="historico-list-container">
                                    <ul className="historico-list">
                                    {movimentacoes.map((mov, idx) => {
                                        const isSystem = (mov.cod_usuario || '').toLowerCase().includes('integração') || (mov.cod_usuario || '').toLowerCase().includes('sistema');
                                        return (
                                        <li key={idx} className="historico-item">
                                            <div className={`historico-avatar ${isSystem ? 'system' : 'user'}`}>
                                            {isSystem ? '⚙️' : getInitials(mov.nome || mov.cod_usuario)}
                                            </div>
                                            <div className="historico-content">
                                                <strong>{mov.nome || mov.cod_usuario || 'Sistema'}</strong>
                                                <div className="historico-date">{new Date(mov.dt_movimentacao).toLocaleString('pt-BR', { timeZone: 'UTC' })}</div>
                                                <div className="historico-message">{mov.mensagem}</div>
                                            </div>
                                        </li>
                                        );
                                    })}
                                    </ul>
                                </div>
                                )}
                            </>
                        )}
                      </div>
                    )}
                    {activeTab === 'erros' && (
                      <div>
                        {loadingErros ? <TabSpinner /> : (
                            <>
                                <h3 className="modal-h3"><FaExclamationTriangle /> Ocorrências de Erro ExecAuto</h3>
                                {(errosExecAuto.length === 0) ? (
                                <p className="no-data-message">Não há erros a serem exibidos para esta nota.</p>
                                ) : (
                                <div className="erros-list-container">
                                    <ul className="erros-list">
                                    {errosExecAuto.map((err, idx) => {
                                        const fullErrorText = `Data: ${new Date(err.dt_movimentacao).toLocaleString('pt-BR', { timeZone: 'UTC' })}\nCampo: ${err.campo || '-'}\nMotivo: ${err.motivo || '-'}\nMensagem: ${err.mensagem_original}`;
                                        return (
                                        <li key={idx} className="erros-item">
                                            <button
                                                onClick={() => copyToClipboard(fullErrorText)}
                                                title="Copiar erro"
                                                className="btn-copy-error"
                                            >
                                                <FaCopy />
                                            </button>
                                            <div className="erros-item-date">{new Date(err.dt_movimentacao).toLocaleString('pt-BR', { timeZone: 'UTC' })}</div>
                                            <div className="erros-item-content">
                                                <div><strong>Campo:</strong> {err.campo || '-'}</div>
                                                <div><strong>Motivo:</strong> {err.motivo || '-'}</div>
                                                <div>
                                                    <strong>Mensagem:</strong>
                                                    <FormattedOriginalMessage message={err.mensagem_original} />
                                                </div>
                                            </div>
                                        </li>
                                        );
                                    })}
                                    </ul>
                                </div>
                                )}
                            </>
                        )}
                      </div>
                    )}
                    {activeTab === 'fiscal' && (() => {
                        const tesItemsWithSuggestion = tesData?.itens?.filter(t => t.tes_codigo).length || 0;
                        const allItemsHaveTesSuggestion = tesData && tesData.itens.length > 0 && tesItemsWithSuggestion === itens.length;
                        const isTesPendente = internalStatusTes === 'PENDENTE';

                        return (
                          <div>
                            {loadingTes ? <TabSpinner /> : (
                                <>
                                    <div>
                                        <h3 className="modal-h3">
                                            <Sparkles /> Assistente de TES
                                        </h3>

                                        <div className={`assistant-box ${allItemsHaveTesSuggestion && !isTesPendente ? 'status-concluido' : 'status-pendente'}`}>
                                            {isTesPendente && !hasLoadedTes ? ( // Adicionado !hasLoadedTes para mostrar pendente antes do spinner
                                                <div>
                                                    <button
                                                        disabled
                                                        className="btn btn-info"
                                                    >
                                                        <FaPencilAlt size={14} />
                                                        Informar TES manual
                                                    </button>
                                                    <p style={{ fontSize: '0.9rem', marginTop: '0.75rem', fontWeight: '500' }}>
                                                        Aguarde o processamento do assistente fiscal para continuar.
                                                    </p>
                                                </div>
                                            ) : (
                                                <>
                                                    <p>
                                                        {allItemsHaveTesSuggestion
                                                            ? 'Todos os itens possuem TES classificadas com os critérios treinados.'
                                                            : 'Um ou mais itens não possuem uma sugestão de TES ou apresentaram erro. Por favor, revise as informações para dar continuidade ao processo.'
                                                        }
                                                    </p>
                                                    <div className="assistant-box-buttons">
                                                            <button
                                                                onClick={() => setIsManualTesModalOpen(true)}
                                                                disabled={isButtonDisabled || isSubmitting}
                                                                className="btn btn-info"
                                                            >
                                                                <FaPencilAlt size={14} />
                                                                Informar TES manual
                                                            </button>
                                                            <button
                                                                onClick={handleReprocessarFiscal}
                                                                disabled={isButtonDisabled || isSubmitting || isReprocessingTes}
                                                                className="btn btn-warning"
                                                                style={{ minWidth: '180px' }}
                                                            >
                                                                {isReprocessingTes ? (
                                                                <>
                                                                    <FaSpinner className="animate-spin" size={14} />
                                                                    <span>Reprocessando...</span>
                                                                </>
                                                                ) : (
                                                                <>
                                                                    <FaSyncAlt size={14} />
                                                                    <span>Reprocessar TES</span>
                                                                </>
                                                                )}
                                                            </button>
                                                        </div>
                                                </>
                                            )}
                                        </div>

                                        {(!tesData || tesData.itens.length === 0) ? (
                                            <p className="no-data-message" style={{ background: 'var(--gcs-gray-light)', border: '1px solid var(--gcs-gray-border)', borderRadius: '8px', padding: '1.5rem' }}>
                                                {(isTesPendente && !hasLoadedTes) 
                                                    ? 'Aguardando processamento do assistente fiscal...' 
                                                    : 'Informações do assistente de TES não disponíveis para esta nota.'
                                                }
                                            </p>
                                        ) : (
                                            <div className="modal-table-container">
                                                <table className="modal-table">
                                                    <thead>
                                                        <tr>
                                                            <th style={{ textAlign: 'center' }}>Item</th>
                                                            <th>Descrição XML</th>
                                                            <th style={{ textAlign: 'center' }}>TES Sugerida</th>
                                                            <th style={{ textAlign: 'center' }}>Classe</th>
                                                            <th style={{ textAlign: 'center' }}>Confiança</th>
                                                            <th>Justificativa IA</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {itens.map((item, index) => {
                                                            const tesInfo = tesData.itens.find(t => t.nItem === item.item_xml);
                                                            return (
                                                                <tr key={index}>
                                                                    <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{item.item_xml}</td>
                                                                    <td>{item.descricao_xml}</td>
                                                                    <td style={{ textAlign: 'center', fontWeight: 'bold' }}>
                                                                        {tesInfo?.tes_codigo ? tesInfo.tes_codigo : (
                                                                            <FaExclamationTriangle color="var(--gcs-orange-dark)" title="TES não informada." />
                                                                        )}
                                                                    </td>
                                                                    <td style={{ textAlign: 'center' }}>{tesInfo?.classe || '-'}</td>
                                                                    <td style={{ textAlign: 'center' }}>
                                                                        {tesInfo ? (
                                                                            <span style={{ color: getConfiancaColor(tesInfo.confianca_pct), fontWeight: 'bold' }}>
                                                                                {tesInfo.confianca_pct}%
                                                                            </span>
                                                                        ) : '-'}
                                                                    </td>
                                                                    <td style={{ fontSize: '13px' }}>
                                                                        {tesInfo?.justificativa_texto || '-'}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ marginTop: '2.5rem' }}>
                                        <h3 className="modal-h3"><FaFileInvoice /> Opções Fiscais</h3>
                                        <div className="tab-section-box">
                                            {isSubmitting && activeTab === 'fiscal' ? (
                                                <div className="tab-spinner-container" style={{padding: '1rem', minHeight: '0'}}>
                                                    <div className="modal-tab-spinner"></div>
                                                    <div className="modal-tab-spinner-text">Processando...</div>
                                                </div>
                                            ) : (
                                                <>
                                                    <p>
                                                        Ao clicar no botão abaixo, você marcará esta nota para ser lançada manualmente no Protheus.
                                                        Esta ação é irreversível e impedirá o lançamento automático através deste portal.
                                                    </p>
                                                    <div className="btn-container">
                                                        <button
                                                            onClick={() => setShowConfirmModal(true)}
                                                            disabled={isButtonDisabled || isSubmitting }
                                                            className="btn btn-danger"
                                                        >
                                                            <FaShieldAlt style={{ marginRight: '8px' }} />
                                                            Lançamento Manual
                                                        </button>
                                                        {isButtonDisabled && (
                                                            <p className="action-disabled-message">
                                                                Esta opção não está disponível pois a nota já foi importada ou marcada como manual/finalizada.
                                                            </p>
                                                        )}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                          </div>
                      );
                    })()}
                    {activeTab === 'financeiro' && (
                        <div>
                            <div className="tab-section-box">
                                <h3 className="modal-h3" style={{ marginTop: 0 }}>
                                    <Sparkles /> Assistente Financeiro
                                </h3>
                                <p>
                                    Consulte os boletos registrados no DDA (Débito Direto Autorizado) ou os pagamentos financeiros gerados para esta nota fiscal diretamente no ERP.
                                </p>
                                <div className="btn-container">
                                    <button
                                        onClick={() => handleOpenFinanceiroModal('dda')}
                                        className="btn btn-info"
                                    >
                                        Consultar Boletos (DDA)
                                    </button>
                                    <button
                                        onClick={() => handleOpenFinanceiroModal('titulos')}
                                        className="btn btn-warning"
                                    >
                                        Consultar pagamentos (ERP)
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                    {activeTab === 'responsavel' && (
                      <div>
                        <h3 className="modal-h3"><FaUserFriends /> Transferir Responsabilidade</h3>
                        <div className="tab-section-box">
                          {isSubmitting && activeTab === 'responsavel' ? (
                            <div className="tab-spinner-container" style={{padding: '1rem', minHeight: '0'}}>
                              <div className="modal-tab-spinner"></div>
                              <div className="modal-tab-spinner-text">Transferindo...</div>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                              <CompradorSearch
                                  chave={chave}
                                  email={session?.user?.email}
                                  onSelect={setSelectedComprador}
                                  selectedComprador={selectedComprador}
                                  disabled={isButtonDisabled}
                              />

                              <div>
                                  <label htmlFor="motivo" className="form-label">Motivo:</label>
                                  <textarea
                                      id="motivo"
                                      value={motivoTransferencia}
                                      onChange={(e) => setMotivoTransferencia(e.target.value)}
                                      maxLength={MAX_MOTIVO_LENGTH}
                                      rows={4}
                                      className="form-textarea"
                                      placeholder="Descreva o motivo da transferência..."
                                      disabled={isSubmitting || isButtonDisabled}
                                  />
                                  <div className="char-count-footer">
                                      {MAX_MOTIVO_LENGTH - motivoTransferencia.length} caracteres restantes
                                  </div>
                              </div>

                              <div>
                                  <button
                                      onClick={() => setShowTransferConfirmModal(true)}
                                      disabled={!selectedComprador || !motivoTransferencia.trim() || isSubmitting || isButtonDisabled}
                                      className="btn btn-primary"
                                  >
                                      Transferir
                                  </button>
                                  {isButtonDisabled && (
                                      <p className="action-disabled-message">
                                          Esta opção não está disponível pois a nota já foi importada ou marcada como manual/finalizada.
                                      </p>
                                  )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                </div>
              </div>
            </div>
          )}
        </div>
      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleMarcarManual}
        message="Caso marque a opção de manual, o lançamento da nota somente poderá ser feito diretamente no Protheus, e essa ação não poderá ser desfeita. Deseja continuar?"
        confirmColor="#dc3545" // Mantido, pois o componente ConfirmationModal usa isso para definir a classe
      />
      <ConfirmationModal
        isOpen={showTransferConfirmModal}
        onClose={() => setShowTransferConfirmModal(false)}
        onConfirm={handleTransferirResponsavel}
        title="Confirmar Transferência"
        icon={<FaUserFriends size={40} color="#007bff" />}
        message={`Você tem certeza que deseja transferir a responsabilidade desta nota para ${selectedComprador?.nome || 'o comprador selecionado'}? Esta ação não poderá ser desfeita.`}
        confirmText="Sim, Transferir"
        confirmColor="#007bff" // Mantido para definir a classe
      />

      {/* Modais importados */}
      <ManualTesModal
        isOpen={isManualTesModalOpen}
        onClose={() => setIsManualTesModalOpen(false)}
        onSave={handleSaveChangesTes}
        items={itens}
        tesData={tesData}
        isSaving={isSavingTes}
      />
      <ManualPedidoModal
        isOpen={isManualPedidoModalOpen}
        onClose={() => setIsManualPedidoModalOpen(false)}
        items={itens}
        chave={chave}
        onSave={handleSavePedidos}
       />
      <FinanceiroModal
        isOpen={isFinanceiroModalOpen}
        onClose={() => setIsFinanceiroModalOpen(false)}
        chave={chave}
        consultaType={consultaFinanceiraType}
      />
    </>
  );
}