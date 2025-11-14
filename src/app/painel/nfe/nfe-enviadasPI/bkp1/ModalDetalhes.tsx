"use client";

import React from "react";
import { useEffect, useState, useCallback, useRef } from "react";
import { FaCheckCircle, FaTimesCircle, FaExclamationTriangle, FaListAlt, FaHistory, FaFileInvoice, FaInfoCircle, FaUserFriends, FaTimes, FaSpinner, FaCopy } from "react-icons/fa";
import { Sparkles } from "lucide-react";
import { useSession } from "next-auth/react";

// Importando APENAS o modal necessário
import NotificationModal from "./NotificationModal";

// --- INTERFACES ---
interface ModalDetalhesProps {
  nomeFornecedor?: string;
  chave: string;
  statusNF: string;
  visivel: boolean;
  onClose: () => void;
  onActionSuccess?: () => void; // Mantido caso haja alguma ação futura ou refresh
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

interface ErroExecAuto {
  dt_movimentacao: string;
  campo: string;
  motivo: string;
  mensagem_original: string;
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


// --- SUB-COMPONENTES ---

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
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: '4px' }}>
            {steps.map((step, index) => {
                const normalizedTesStatus = status_tes?.trim().toUpperCase();
                let isCompleted = index < activeStepIndex;
                const isActive = index === activeStepIndex;
                let circleColor: string, circleBg: string, iconColor: string, textColor: string, icon: React.ReactNode;

                if (isCompleted) {
                    circleColor = '#28a745';
                    circleBg = '#28a745';
                    iconColor = '#fff';
                    textColor = '#343a40';
                    icon = '✔';
                } else if (isActive) {
                    circleColor = '#1b4c89';
                    circleBg = '#fff';
                    iconColor = '#1b4c89';
                    textColor = '#343a40';
                    icon = '🕒';
                } else {
                    circleColor = '#ced4da';
                    circleBg = '#fff';
                    iconColor = '#ced4da';
                    textColor = '#adb5bd';
                    icon = '🕒';
                }

                if (step === 'Processar Pedidos') {
                    const normalizedComprasStatus = statusCompras?.trim().toUpperCase();
                    switch (normalizedComprasStatus) {
                        case 'CONCLUÍDO':
                            circleColor = '#28a745'; circleBg = '#28a745'; iconColor = '#fff'; textColor = '#343a40'; icon = '✔'; isCompleted = true;
                            break;
                        case 'PENDENTE':
                            circleColor = '#dc3545'; circleBg = '#dc3545'; iconColor = '#fff'; textColor = '#dc3545'; icon = '✖'; isCompleted = true;
                            break;
                        case 'EM FILA':
                            isCompleted = false;
                            if (isActive) {
                                circleColor = '#1b4c89'; circleBg = '#fff'; iconColor = '#1b4c89'; textColor = '#343a40'; icon = '🕒';
                            } else {
                                circleColor = '#ced4da'; circleBg = '#fff'; iconColor = '#ced4da'; textColor = '#adb5bd'; icon = '🕒';
                            }
                            break;
                    }
                }

                if (step === 'Definição Fiscal') {
                    switch (normalizedTesStatus) {
                        case 'PROCESSADA':
                            circleColor = '#28a745'; circleBg = '#28a745'; iconColor = '#fff'; textColor = '#343a40'; icon = '✔'; isCompleted = true;
                            break;
                        case 'ERRO':
                            circleColor = '#dc3545'; circleBg = '#dc3545'; iconColor = '#fff'; textColor = '#dc3545'; icon = '✖'; isCompleted = true;
                            break;
                        default:
                            if (isActive) {
                                circleColor = '#1b4c89'; circleBg = '#fff'; iconColor = '#1b4c89'; textColor = '#343a40';
                            } else {
                                circleColor = '#ced4da'; circleBg = '#fff'; iconColor = '#ced4da'; textColor = '#adb5bd';
                            }
                            icon = '🕒'; isCompleted = false;
                            break;
                    }
                }

                if (step === 'Lançada/Finalizada' && statusNF.trim().toLowerCase() === 'erro execauto') {
                    circleColor = '#dc3545';
                    circleBg = '#dc3545';
                    iconColor = '#fff';
                    textColor = '#dc3545';
                    icon = '✖';
                    isCompleted = true;
                }

                let lineColor = '#dee2e6';
                let lineStyle = 'dashed';

                if (isCompleted) {
                    const normalizedComprasStatus = statusCompras?.trim().toUpperCase();
                    lineColor = (step === 'Processar Pedidos' && normalizedComprasStatus === 'PENDENTE') ? '#dc3545' : '#28a745';
                    lineStyle = 'solid';
                }

                return (
                    <React.Fragment key={step}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                            <div style={{
                                width: '26px', height: '26px', borderRadius: '50%',
                                backgroundColor: circleBg, border: `2px solid ${circleColor}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: iconColor, fontWeight: 'bold', fontSize: '14px'
                            }}>
                                {icon}
                            </div>
                            <span style={{
                                marginTop: '8px', fontSize: '11px',
                                fontWeight: isCompleted || isActive ? 'bold' : 'normal',
                                color: textColor, width: '80px',
                            }}>
                                {step}
                            </span>
                        </div>
                        {index < steps.length - 1 && (
                            <div style={{
                                width: '60px', height: '2px',
                                borderTop: `2px ${lineStyle} ${lineColor}`,
                                marginTop: '12px',
                            }} />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
};

const FormattedOriginalMessage = ({ message }: { message: string | null }) => {
  if (!message) {
    return <pre style={preStyle}>N/A</pre>;
  }
  try {
    const data = JSON.parse(message);
    const details = data.detalhes || "";
    const lines = details.split('\\n');
    return (
      <div style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#721c24', lineHeight: '1.6' }}>
        {data.erro && <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>{data.erro}</div>}
        {lines.map((line: string, index: number) => {
          if (line.trim() === '') return <div key={index} style={{ height: '0.5rem' }} />;
          if (line.includes(':-')) {
            const parts = line.split(':-');
            const key = parts[0].trim();
            const value = parts[1].trim();
            return (
              <div key={index} style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '10px' }}>
                <span style={{ color: '#555' }}>{key}</span>
                <span style={{ fontWeight: 'bold' }}>{value}</span>
              </div>
            );
          }
          return <div key={index}>{line.trim()}</div>;
        })}
      </div>
    );
  } catch (error) {
    // Se não for JSON válido, apenas exibe a string formatada
    return <pre style={preStyle}>{message.replace(/\\n/g, '\n')}</pre>;
  }
};

const preStyle: React.CSSProperties = {
  background: '#f8d7da',
  padding: '0.75rem',
  borderRadius: '4px',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-all',
  fontSize: '0.85rem',
  color: '#721c24',
  marginTop: '0.5rem'
};

// ConfirmationModal pode ser removido se nenhuma ação futura o usar, mas por enquanto mantido por segurança
const ConfirmationModal = ({
    isOpen,
    onClose,
    onConfirm,
    message,
    title = "Confirmação Necessária",
    icon = <FaExclamationTriangle size={40} color="#f7941d" />,
    confirmText = "OK, Entendi",
    confirmColor = "#dc3545",
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
    return (
        <>
            <div onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 2147483648 }}></div>
            <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', backgroundColor: 'white', padding: '2rem', borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.2)', zIndex: 2147483649, maxWidth: '450px', textAlign: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                    {icon}
                </div>
                <h3 style={{ marginTop: 0, marginBottom: '1rem', color: '#333' }}>{title}</h3>
                <p style={{ color: '#666', lineHeight: 1.6 }}>{message}</p>
                <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                    {showCancelButton && (
                        <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: '5px', border: '1px solid #ccc', background: '#f1f1f1', cursor: 'pointer', fontWeight: 'bold' }}>Cancelar</button>
                    )}
                    <button onClick={onConfirm} style={{ padding: '10px 20px', borderRadius: '5px', border: 'none', background: confirmColor, color: 'white', cursor: 'pointer', fontWeight: 'bold' }}>{confirmText}</button>
                </div>
            </div>
        </>
    );
};


// --- COMPONENTE PRINCIPAL DO MODAL ---
export default function ModalDetalhes({ chave, statusNF, visivel, onClose, nomeFornecedor, onActionSuccess, status_tes, statusCompras, observacao }: ModalDetalhesProps) {
  const [itens, setItens] = useState<ItemNota[]>([]);
  const [tesData, setTesData] = useState<TesData | null>(null);
  const [numNF, setNumNF] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [respostaInvalida, setRespostaInvalida] = useState(false);
  const [movimentacoes, setMovimentacoes] = useState<any[]>([]);
  const [errosExecAuto, setErrosExecAuto] = useState<ErroExecAuto[]>([]);
  const [activeTab, setActiveTab] = useState<'compras' | 'historico' | 'erros' | 'fiscal' | 'financeiro' | 'responsavel'>('compras');

  // REMOVIDO: Estados relacionados à DANFE
  // const [isDanfeLoading, setIsDanfeLoading] = useState(false);
  // const [danfeError, setDanfeError] = useState<string | null>(null);

  const [internalStatusTes, setInternalStatusTes] = useState(status_tes);

  const [notification, setNotification] = useState({ visible: false, type: 'success' as 'success' | 'error', message: '' });

  const handleCloseNotification = () => {
    // Limpa a notificação. A lógica de fechar o modal principal ou atualizar
    // foi removida pois as ações que a disparavam foram retiradas.
    setNotification({ visible: false, type: 'success', message: '' });
  };

  // session não é mais necessário para ações, mas mantido caso usado para display futuro
  const { data: session } = useSession();

  const modalRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const fetchAllData = useCallback(async (isRefresh = false) => {
    if (!visivel || !chave) return;

    if (!isRefresh) {
        setLoading(true);
    }

    setItens([]);
    setMovimentacoes([]);
    setErrosExecAuto([]);
    setTesData(null);
    setActiveTab('compras'); // Continua começando na aba compras
    setInternalStatusTes(status_tes);

    // As chamadas API continuam as mesmas para buscar os dados
    const fetchDetalhes = fetch("/api/nfe/nfe-consulta-notas-itens", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chave }) }).then(res => res.json());
    const fetchMovimentacoes = fetch("/api/nfe/nfe-consulta-historico", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chave }) }).then(res => res.json());
    const fetchErrosExecAuto = fetch("/api/nfe/nfe-consulta-erro-execauto", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chave }) }).then(res => res.json());
    const fetchTes = fetch("/api/nfe/nfe-consulta-tes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chave }) }).then(res => res.json());

    try {
        const [detalhesData, movimentacoesData, errosData, tesApiResponse] = await Promise.all([ fetchDetalhes, fetchMovimentacoes, fetchErrosExecAuto, fetchTes ]);

        // Processamento dos dados recebidos (inalterado)
        if (Array.isArray(detalhesData) && detalhesData.length > 0) {
            const nota = detalhesData[0];
            const itensDaNota = nota?.itens;

            if (itensDaNota && Array.isArray(itensDaNota) && itensDaNota.length > 0) {
                const itensMapeados = itensDaNota.map((item: any) => ({
                    ...item,
                    valor_unitario_xml: item.valor_unitario, // Renomeia para clareza
                }));
                setItens(itensMapeados);
                setInternalStatusTes(itensDaNota[0]?.status_tes); // Pega o status_tes do primeiro item como referência
            } else {
                setItens([]);
            }

            setNumNF(nota?.num_nf ?? '');
            setRespostaInvalida(false);

        } else {
            setItens([]);
            // Tenta pegar o número da NF mesmo se não houver itens
            if(Array.isArray(detalhesData) && detalhesData.length > 0) {
              setNumNF(detalhesData[0]?.num_nf ?? '');
            }
            setRespostaInvalida(true);
        }
        setMovimentacoes(movimentacoesData || []);
        const validErros = Array.isArray(errosData) ? errosData.filter((err: any) => err.campo || err.motivo || err.mensagem_original) : [];
        setErrosExecAuto(validErros);

        if (Array.isArray(tesApiResponse) && tesApiResponse.length > 0 && tesApiResponse[0].itens) {
            setTesData(tesApiResponse[0]);
        } else {
            setTesData(null);
        }

    } catch (error) {
        console.error("Erro ao buscar dados do modal:", error);
        setRespostaInvalida(true);
    } finally {
        setLoading(false);
    }
  }, [visivel, chave, status_tes]); // Dependências da função de busca

  // Busca inicial quando o modal se torna visível
  useEffect(() => {
    fetchAllData(false);
  }, [fetchAllData]);

  // Limpa notificações ao fechar
  useEffect(() => {
      if (!visivel) {
          setNotification({ visible: false, type: 'success', message: '' });
          // REMOVIDO: Limpeza do danfeError
          // setDanfeError(null);
      }
  }, [visivel]);

  // --- Lógica de Arrastar e Soltar (inalterada) ---
  const handleMouseDown = (e: React.MouseEvent) => {
      if (modalRef.current) {
          const target = e.target as HTMLElement;
          // Impede arrastar se clicar em inputs, textareas ou botões
          if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'BUTTON') {
              return;
          }
          setIsDragging(true);
          const modalRect = modalRef.current.getBoundingClientRect();
          setOffset({
              x: e.clientX - modalRect.left,
              y: e.clientY - modalRect.top
          });
          e.preventDefault(); // Impede seleção de texto ao arrastar
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
      return () => { // Cleanup: remove os listeners quando o componente desmonta ou dragging para
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);
      };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Posiciona o modal inicialmente no centro (ou perto do topo)
  useEffect(() => {
    if (visivel && modalRef.current) {
        const modal = modalRef.current;
        const initialX = (window.innerWidth - modal.offsetWidth) / 2;
        const initialY = 40; // Posição vertical inicial (40px do topo)
        setPosition({ x: initialX > 0 ? initialX : 20, y: initialY }); // Garante que não saia da tela horizontalmente
    }
  }, [visivel]);
  // --- Fim da Lógica de Arrastar e Soltar ---

  // REMOVIDO: Função handleVisualizarDanfe


  if (!visivel) return null; // Não renderiza nada se não estiver visível

  // Helper para ícones de Sim/Não
  const renderStatusIcon = (value: string) => {
    const isPositive = value?.toLowerCase() === "sim";
    return isPositive ? (
      <FaCheckCircle style={{ color: "green" }} title="Sim" />
    ) : (
      <FaTimesCircle style={{ color: "red" }} title="Não" />
    );
  };

  // Lógica para determinar o passo ativo na jornada da nota (inalterada)
  const getJornadaActiveStep = (
      status: string,
      enviadoPelaUnidade: string | undefined,
      statusTes: typeof status_tes
  ): number => {
      const normalizedStatus = status ? status.trim().toLowerCase() : "";
      const enviado = enviadoPelaUnidade ? enviadoPelaUnidade.toLowerCase() === 'sim' : false;
      const normalizedTesStatus = statusTes?.trim().toUpperCase();

      if (normalizedStatus === 'importado' || normalizedStatus === 'manual' || normalizedStatus === 'erro execauto' || normalizedStatus === 'finalizado') {
          return 5; // Último passo
      }
      if (enviado) {
          return 4; // Enviada (Unidade)
      }
      if (normalizedTesStatus === 'PROCESSADA') {
          return 3; // Definição Fiscal OK
      }
      if (normalizedTesStatus === 'PENDENTE' || normalizedTesStatus === 'ERRO') {
          return 2; // Definição Fiscal Pendente/Erro
      }
      return 1; // Processar Pedidos (ou Nota Recebida)
  };

  const activeStepIndex = getJornadaActiveStep(statusNF, itens[0]?.enviada, internalStatusTes);

  // Verifica se algum item tem erro de processamento (valor não bate ou item não OK)
  const hasItemProcessingError = itens.some(item => item.valor_unitario_bate?.toLowerCase() === 'não' || item.item_ok?.toLowerCase() === 'não');

  // Helpers para cores baseadas em similaridade/confiança (inalterados)
  const getSimilaridadeColor = (similaridade: number) => {
    if (similaridade >= 66) return '#28a745'; // Verde
    if (similaridade >= 11) return '#f7941d'; // Laranja
    return '#dc3545'; // Vermelho
  };

  const getConfiancaColor = (confianca: number) => {
    if (confianca >= 90) return '#28a745'; // Verde
    if (confianca >= 70) return '#f7941d'; // Laranja
    return '#dc3545'; // Vermelho
  };

  // Helper para obter iniciais do nome (inalterado)
  const getInitials = (name: string = '') => {
    const nameParts = name.trim().split(' ');
    if (nameParts.length > 1) {
        return `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase();
    }
    // Se só tiver um nome ou for vazio, pega as duas primeiras letras (ou menos se for curto)
    return name.substring(0, 2).toUpperCase();
  };

  // Função para copiar texto para clipboard (usada na aba Erros)
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
        setNotification({ visible: true, type: 'success', message: 'Erro copiado para a área de transferência!' });
    }, (err) => {
        console.error('Erro ao copiar: ', err);
        setNotification({ visible: true, type: 'error', message: 'Falha ao copiar o erro.' });
    });
  };

  // Lógica da caixa do Assistente de Compras (inalterada)
  let assistantBoxStyle = {};
  let assistantMessage = '';
  const normalizedComprasStatus = statusCompras?.trim().toUpperCase();

  switch (normalizedComprasStatus) {
      case 'CONCLUÍDO':
          assistantBoxStyle = { background: '#effaf5', border: '1px solid #b7e4c7' };
          assistantMessage = 'Todos os itens possuem pedidos classificados com os critérios treinados.';
          break;
      case 'PENDENTE':
          assistantBoxStyle = { background: '#fffbe6', border: '1px solid #ffe58f' };
          assistantMessage = 'Um ou mais itens apresentam divergências ou não foram vinculados a um pedido.';
          break;
      case 'EM FILA':
          assistantBoxStyle = { background: '#f8f9fa', border: '1px solid #dee2e6' };
          assistantMessage = 'O item está em fila para reprocessamento, aguarde.';
          break;
      default:
          assistantBoxStyle = { background: '#fffbe6', border: '1px solid #ffe58f' };
          assistantMessage = 'O status do processamento de compras é desconhecido ou não foi iniciado.';
          break;
  }


  return (
    <>
      {/* Modal de Notificação (ainda necessário para copiar erro) */}
      <NotificationModal
          visible={notification.visible}
          type={notification.type}
          message={notification.message}
          onClose={handleCloseNotification}
      />
      {/* Backdrop */}
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 2147483646, display: visivel ? 'block' : 'none' }}></div>
      {/* Conteúdo do Modal */}
      <div
        ref={modalRef}
        style={{
            position: 'fixed',
            top: position.y,
            left: position.x,
            background: '#fff',
            borderRadius: 12,
            width: '90%',
            maxWidth: '1100px',
            minHeight: '400px',
            maxHeight: '90vh',
            display: visivel ? 'flex' : 'none',
            flexDirection: 'column',
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
            zIndex: 2147483647
        }}
      >

          {/* Estilos CSS (inalterados) */}
          <style>{`
            :root {
                --gcs-blue: #00314A;
                --gcs-blue-light: #1b4c89;
                --gcs-blue-lighter: #a3b8d1;
            }
            .modal-tabs-container {
                border-bottom: 1px solid #dee2e6;
                display: flex;
                flex-wrap: wrap;
            }
            .modal-tab-button {
                background: none;
                border: none;
                cursor: pointer;
                padding: 0.75rem 1.5rem;
                font-size: 1rem;
                font-weight: 500;
                color: #555;
                position: relative;
                transition: all 0.2s ease-in-out;
            }
            .modal-tab-button::after {
                content: '';
                position: absolute;
                bottom: -2px;
                right: 0;
                width: 100%;
                height: 100%;
                border-style: solid;
                border-color: transparent;
                border-width: 0 3px 3px 0;
                border-image: linear-gradient(135deg, var(--gcs-blue), var(--gcs-blue-lighter)) 1;
                opacity: 0;
                transform: scale(0.95);
                transition: all 0.2s ease-in-out;
                pointer-events: none;
                filter: drop-shadow(1px 1px 1px rgba(0,0,0,0.2));
            }
            .modal-tab-button:hover:not(.active) {
                transform: translateY(-2px);
                color: var(--gcs-blue);
            }
            .modal-tab-button.active {
                color: var(--gcs-blue);
                font-weight: 600;
                transform: translateY(-2px);
            }
            .modal-tab-button.active::after {
                opacity: 1;
                transform: scale(1);
            }
            .animate-spin {
                animation: spin 1s linear infinite;
            }
            @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
          `}</style>

          {/* Cabeçalho do Modal (arrastável) */}
          <div
            onMouseDown={handleMouseDown}
            style={{
              padding: '1.5rem',
              borderBottom: '1px solid #dee2e6',
              flexShrink: 0,
              cursor: 'move',
              backgroundColor: '#f1f5fb',
              borderTopLeftRadius: '12px',
              borderTopRightRadius: '12px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Detalhes da Nota</span>
                <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', padding: 0 }}>×</button>
            </div>
          </div>

          {/* Corpo do Modal */}
          {loading ? (
            // Indicador de Carregamento
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexGrow: 1, height: '100%' }}>
              <div style={{ width: '40px', height: '40px', border: '4px solid #ccc', borderTop: '4px solid #1b4c89', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
              <div style={{ marginTop: '1rem', color: '#1b4c89', fontWeight: 'bold', fontSize: '1.1rem' }}>Aguarde... Carregando os dados da Nota Fiscal</div>
            </div>
          ) : (
            // Conteúdo Principal após carregar
            <div style={{flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {/* Seção da Jornada da Nota */}
              <div style={{ padding: '1.5rem', borderBottom: '1px solid #dee2e6' }}>
                  <div style={{ marginBottom: '0.75rem', fontSize: '0.8rem', color: '#6c757d', fontWeight: 'bold' }}>Jornada</div>
                  {/* Container da Jornada - Centralizado pois o botão DANFE foi removido */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ maxWidth: '700px', flexGrow: 1, display: 'flex', justifyContent: 'center' }}>
                          <NotaJornada
                              activeStepIndex={activeStepIndex}
                              status_tes={internalStatusTes}
                              hasItemProcessingError={hasItemProcessingError}
                              statusNF={statusNF}
                              statusCompras={statusCompras}
                          />
                      </div>
                      {/* BOTÃO DANFE REMOVIDO DAQUI */}
                  </div>
              </div>

              {/* Área de Conteúdo Rolável (Informações da Nota + Abas) */}
              <div style={{ flexGrow: 1, overflowY: 'scroll', padding: '0 1.5rem 1.5rem 1.5rem' }}>
                {/* REMOVIDO: Mensagem de Erro DANFE */}

                {/* Bloco de Informações Gerais da Nota */}
                <div style={{ background: '#f1f5fb', borderRadius: '8px', padding: '1rem', margin: '1.5rem 0', border: '1px solid #d0d7e2', flexShrink: 0 }}>
                   <div style={{ display: 'grid', gridTemplateColumns: '150px auto 150px 1fr', rowGap: '8px', columnGap: '16px', fontSize: '14px' }}>
                    <div style={{ fontWeight: 'bold' }}>Nota Fiscal:</div>
                    <div>{numNF || '-'}</div>
                    <div style={{ fontWeight: 'bold' }}>Nome Fornecedor:</div>
                    <div>{nomeFornecedor?.trim() || '-'}</div>
                    <div style={{ fontWeight: 'bold' }}>Chave da Nota:</div>
                    <div style={{wordBreak: 'break-all'}}>{chave}</div>
                    <div style={{ fontWeight: 'bold' }}>Enviado pela Unidade:</div>
                    <div>{renderStatusIcon(itens[0]?.enviada ?? '-')}</div>
                    <div style={{ fontWeight: 'bold' }}>Número do Pedido:</div>
                    <div>{Array.from(new Set(itens.map(i => i.num_pedido).filter(p => p))).join(', ') || '-'}</div>
                    <div style={{ fontWeight: 'bold' }}>Data do Envio:</div>
                    <div>{itens[0]?.dt_enviada ? new Date(itens[0].dt_enviada).toLocaleDateString() : '-'}</div>
                    <div style={{ fontWeight: 'bold' }}>Comprador:</div>
                    <div>{(() => {
                      const nomes = itens.map(i => i.nome_usuario?.trim()).filter(n => !!n);
                      if (nomes.length === 0) return '-';
                      const contagem = nomes.reduce((acc, nome) => { acc[nome as string] = (acc[nome as string] || 0) + 1; return acc; }, {} as Record<string, number>);
                      // Pega o nome mais frequente
                      return Object.entries(contagem).sort((a, b) => b[1] - a[1])[0][0];
                    })()}</div>
                    <div style={{ fontWeight: 'bold' }}>Dias do Envio:</div>
                    <div>{(() => {
                      const enviada = itens[0]?.dt_enviada;
                      if (!enviada) return '-';
                      const diff = Math.floor((new Date().getTime() - new Date(enviada).getTime()) / (1000 * 60 * 60 * 24));
                      return diff + ' dias';
                    })()}</div>
                  </div>
                </div>

                {/* Container das Abas */}
                <div className="modal-tabs-container">
                  <button onClick={() => setActiveTab('compras')} className={`modal-tab-button ${activeTab === 'compras' ? 'active' : ''}`}>Compras</button>
                  <button onClick={() => setActiveTab('historico')} className={`modal-tab-button ${activeTab === 'historico' ? 'active' : ''}`}>Histórico</button>
                  <button onClick={() => setActiveTab('erros')} className={`modal-tab-button ${activeTab === 'erros' ? 'active' : ''}`}>Erros</button>
                  <button onClick={() => setActiveTab('fiscal')} className={`modal-tab-button ${activeTab === 'fiscal' ? 'active' : ''}`}>Fiscal</button>
                  <button onClick={() => setActiveTab('financeiro')} className={`modal-tab-button ${activeTab === 'financeiro' ? 'active' : ''}`}>Financeiro</button>
                  <button onClick={() => setActiveTab('responsavel')} className={`modal-tab-button ${activeTab === 'responsavel' ? 'active' : ''}`}>Responsável</button>
                </div>

                {/* Conteúdo da Aba Ativa */}
                <div style={{ position: 'relative', paddingTop: '1.5rem', paddingBottom: '1.5rem' }}>
                    {/* Aba Compras */}
                    {activeTab === 'compras' && (
                      <div>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Sparkles /> Assistente de Compras
                      </h3>
                      {/* Caixa do Assistente */}
                      <div style={{
                          ...assistantBoxStyle,
                          padding: '1rem',
                          borderRadius: '8px',
                          marginBottom: '2.5rem',
                          fontSize: '14px',
                          color: '#333'
                      }}>
                          <p style={{ margin: 0, lineHeight: 1.6 }}>
                              {assistantMessage}
                          </p>
                          {/* BOTÕES REMOVIDOS DESTA DIV */}
                      </div>

                      {/* Tabela de Itens */}
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}><FaListAlt /> Itens da Nota Fiscal</h3>
                      {(respostaInvalida || itens.length === 0) ? (
                        <p style={{ textAlign: 'center', color: '#888', paddingTop: '2rem' }}>Nenhum item a ser exibido para esta nota.</p>
                      ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                          <thead style={{ backgroundColor: '#1b4c89', color: '#fff' }}>
                            <tr>
                              <th style={{ padding: '10px', border: '1px solid #ccc', textAlign: 'left' }}>Item XML</th>
                              <th style={{ padding: '10px', border: '1px solid #ccc', textAlign: 'left' }}>Descrição XML</th>
                              <th style={{ padding: '10px', border: '1px solid #ccc', textAlign: 'left' }}>Un. Med XML</th>
                              <th style={{ padding: '10px', border: '1px solid #ccc', textAlign: 'left' }}>Descrição Pedido</th>
                              <th style={{ padding: '10px', border: '1px solid #ccc' }}>Un. Med. Pedido</th>
                              <th style={{ padding: '10px', border: '1px solid #ccc' }}>Seg.Un. Pedido</th>
                              <th style={{ padding: '10px', border: '1px solid #ccc' }}>Pedido</th>
                              <th style={{ padding: '10px', border: '1px solid #ccc' }}>Similaridade</th>
                              <th style={{ padding: '10px', border: '1px solid #ccc' }}>Valor Bate</th>
                              <th style={{ padding: '10px', border: '1px solid #ccc' }}>Item OK</th>
                              <th style={{ padding: '10px', border: '1px solid #ccc', textAlign: 'left' }}>Justificativa</th>
                            </tr>
                          </thead>
                          <tbody>
                            {itens.map((item, index) => (
                              <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#f9f9f9' : '#fff' }}>
                                <td style={{ padding: '8px', border: '1px solid #ddd' }}>{item.item_xml}</td>
                                <td style={{ padding: '8px', border: '1px solid #ddd' }}>{item.descricao_xml}</td>
                                <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>{item.um_xml ?? '-'}</td>
                                <td style={{ padding: '8px', border: '1px solid #ddd' }}>{item.descricao_pedido ?? '-'}</td>
                                <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>{item.um_pedido ?? '-'}</td>
                                <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>{item.segum_pedido ?? '-'}</td>
                                <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>{item.num_pedido ?? '-'}</td>
                                <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>
                                  <span style={{ color: getSimilaridadeColor(item.similaridade_descricao), fontWeight: 'bold' }}>
                                    {item.similaridade_descricao}%
                                  </span>
                                </td>
                                <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>{renderStatusIcon(item.valor_unitario_bate)}</td>
                                <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>{renderStatusIcon(item.item_ok)}</td>
                                <td style={{ padding: '8px', border: '1px solid #ddd' }}>{item.justificativa}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                    )}
                    {/* Aba Histórico */}
                    {activeTab === 'historico' && (
                      <div>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}><FaHistory /> Histórico de Movimentações</h3>
                        {(movimentacoes.length === 0) ? (
                          <p style={{ textAlign: 'center', color: '#888', paddingTop: '2rem' }}>Não há movimentações no histórico ainda.</p>
                        ) : (
                        <div style={{ backgroundColor: '#f4f6fb', padding: '1rem', borderRadius: '8px', border: '1px solid #d0d7e2' }}>
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                              {movimentacoes.map((mov, idx) => {
                                const isSystem = (mov.cod_usuario || '').toLowerCase().includes('integração') || (mov.cod_usuario || '').toLowerCase().includes('sistema');
                                return (
                                  <li key={idx} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', marginBottom: idx === movimentacoes.length - 1 ? 0 : '1rem', background: '#fff', padding: '1rem', borderRadius: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                                    <div style={{
                                      width: '36px', height: '36px', borderRadius: '50%',
                                      backgroundColor: isSystem ? '#1b4c89' : '#6c757d',
                                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                                      color: '#fff', fontWeight: 'bold', fontSize: '0.9rem', flexShrink: 0
                                    }}>
                                      {isSystem ? '⚙️' : getInitials(mov.nome || mov.cod_usuario)}
                                    </div>
                                    <div style={{ flexGrow: 1 }}>
                                      <strong style={{ color: '#1b4c89' }}>{mov.nome || mov.cod_usuario || 'Sistema'}</strong>
                                      <div style={{ fontSize: '0.8rem', color: '#777', marginBottom: '0.25rem' }}>{new Date(mov.dt_movimentacao).toLocaleString('pt-BR', { timeZone: 'UTC' })}</div>
                                      <div style={{ fontSize: '0.95rem', color: '#333' }}>{mov.mensagem}</div>
                                    </div>
                                  </li>
                                );
                              })}
                            </ul>
                        </div>
                        )}
                      </div>
                    )}
                    {/* Aba Erros */}
                    {activeTab === 'erros' && (
                      <div>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}><FaExclamationTriangle /> Ocorrências de Erro ExecAuto</h3>
                        {(errosExecAuto.length === 0) ? (
                          <p style={{ textAlign: 'center', color: '#888', paddingTop: '2rem' }}>Não há erros a serem exibidos para esta nota.</p>
                        ) : (
                        <div style={{ backgroundColor: '#fff0f0', padding: '1rem', borderRadius: '8px', border: '1px solid #f5c2c7' }}>
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                              {errosExecAuto.map((err, idx) => {
                                const fullErrorText = `Data: ${new Date(err.dt_movimentacao).toLocaleString('pt-BR', { timeZone: 'UTC' })}\nCampo: ${err.campo || '-'}\nMotivo: ${err.motivo || '-'}\nMensagem: ${err.mensagem_original}`;
                                return (
                                  <li key={idx} style={{ position: 'relative', background: '#fff', borderLeft: '4px solid #dc3545', padding: '1rem', borderRadius: '8px', marginBottom: idx === errosExecAuto.length - 1 ? 0 : '1rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                                    {/* Botão Copiar Erro */}
                                    <button
                                      onClick={() => copyToClipboard(fullErrorText)}
                                      title="Copiar erro"
                                      style={{
                                          position: 'absolute', top: '10px', right: '10px', background: '#f8d7da',
                                          border: '1px solid #f5c6cb', borderRadius: '50%', width: '30px', height: '30px',
                                          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                                      }}
                                    >
                                      <FaCopy color="#721c24" />
                                    </button>
                                    <div style={{ fontSize: '0.85rem', color: '#dc3545', fontWeight: 'bold', marginBottom: '0.5rem' }}>{new Date(err.dt_movimentacao).toLocaleString('pt-BR', { timeZone: 'UTC' })}</div>
                                    <div style={{ fontSize: '0.95rem', color: '#333', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                      <div><strong>Campo:</strong> {err.campo || '-'}</div>
                                      <div><strong>Motivo:</strong> {err.motivo || '-'}</div>
                                      <div>
                                        <strong>Mensagem:</strong>
                                        <div style={{ background: '#f8d7da', padding: '0.75rem', borderRadius: '4px', marginTop: '0.5rem' }}>
                                          <FormattedOriginalMessage message={err.mensagem_original} />
                                        </div>
                                      </div>
                                    </div>
                                  </li>
                                );
                              })}
                            </ul>
                        </div>
                        )}
                      </div>
                    )}
                    {/* Aba Fiscal */}
                    {activeTab === 'fiscal' && (() => {
                        const tesItemsWithSuggestion = tesData?.itens?.filter(t => t.tes_codigo).length || 0;
                        const allItemsHaveTesSuggestion = tesData && tesData.itens.length > 0 && tesItemsWithSuggestion === itens.length;
                        const isTesPendente = internalStatusTes === 'PENDENTE';

                        return (
                          <div>
                              <div>
                                  <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <Sparkles /> Assistente de TES
                                  </h3>
                                  {/* Caixa do Assistente Fiscal */}
                                  <div style={{
                                      background: allItemsHaveTesSuggestion && !isTesPendente ? '#effaf5' : '#fffbe6',
                                      border: `1px solid ${allItemsHaveTesSuggestion && !isTesPendente ? '#b7e4c7' : '#ffe58f'}`,
                                      padding: '1rem',
                                      borderRadius: '8px',
                                      marginBottom: '1.5rem',
                                      fontSize: '14px',
                                      color: '#333'
                                  }}>
                                      {isTesPendente ? (
                                          <div>
                                              <p style={{ color: '#495057', fontSize: '0.9rem', marginTop: '0', fontWeight: '500' }}>
                                                  Aguarde o processamento do assistente fiscal para continuar.
                                              </p>
                                          </div>
                                      ) : (
                                          <>
                                              <p style={{ margin: 0, lineHeight: 1.6 }}>
                                                  {allItemsHaveTesSuggestion
                                                      ? 'Todos os itens possuem TES classificadas com os critérios treinados.'
                                                      : 'Um ou mais itens não possuem uma sugestão de TES ou apresentaram erro. Por favor, revise as informações.'
                                                  }
                                              </p>
                                              {/* BOTÕES REMOVIDOS */}
                                          </>
                                      )}
                                  </div>

                                  {/* Tabela de TES */}
                                  {(!tesData || tesData.itens.length === 0) ? (
                                      <p style={{ textAlign: 'center', color: '#888', paddingTop: '2rem', background: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: '8px', padding: '1.5rem' }}>
                                          Informações do assistente de TES não disponíveis para esta nota.
                                      </p>
                                  ) : (
                                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                                          <thead style={{ backgroundColor: '#1b4c89', color: '#fff' }}>
                                              <tr>
                                                  <th style={{ padding: '10px', border: '1px solid #ccc', textAlign: 'center' }}>Item</th>
                                                  <th style={{ padding: '10px', border: '1px solid #ccc', textAlign: 'left' }}>Descrição XML</th>
                                                  <th style={{ padding: '10px', border: '1px solid #ccc', textAlign: 'center' }}>TES Sugerida</th>
                                                  <th style={{ padding: '10px', border: '1px solid #ccc', textAlign: 'center' }}>Classe</th>
                                                  <th style={{ padding: '10px', border: '1px solid #ccc', textAlign: 'center' }}>Confiança</th>
                                                  <th style={{ padding: '10px', border: '1px solid #ccc', textAlign: 'left' }}>Justificativa IA</th>
                                              </tr>
                                          </thead>
                                          <tbody>
                                              {itens.map((item, index) => {
                                                  const tesInfo = tesData.itens.find(t => t.nItem === item.item_xml);
                                                  return (
                                                      <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#f9f9f9' : '#fff' }}>
                                                          <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center', fontWeight: 'bold' }}>{item.item_xml}</td>
                                                          <td style={{ padding: '8px', border: '1px solid #ddd' }}>{item.descricao_xml}</td>
                                                          <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center', fontWeight: 'bold' }}>
                                                              {tesInfo?.tes_codigo ? tesInfo.tes_codigo : (
                                                                  <FaExclamationTriangle color="#f7941d" title="TES não informada." />
                                                              )}
                                                          </td>
                                                          <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>{tesInfo?.classe || '-'}</td>
                                                          <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>
                                                              {tesInfo ? (
                                                                  <span style={{ color: getConfiancaColor(tesInfo.confianca_pct), fontWeight: 'bold' }}>
                                                                      {tesInfo.confianca_pct}%
                                                                  </span>
                                                              ) : '-'}
                                                          </td>
                                                          <td style={{ padding: '8px', border: '1px solid #ddd', fontSize: '13px' }}>
                                                              {tesInfo?.justificativa_texto || '-'}
                                                          </td>
                                                      </tr>
                                                  );
                                              })}
                                          </tbody>
                                      </table>
                                  )}
                              </div>

                              {/* Seção Opções Fiscais (sem botão) */}
                              <div style={{ marginTop: '2.5rem' }}>
                                  <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}><FaFileInvoice /> Opções Fiscais</h3>
                                  <div style={{ background: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: '8px', padding: '1.5rem' }}>
                                      <p style={{ color: '#6c757d', marginTop: '0', lineHeight: 1.6 }}>
                                          Esta seção é destinada a ações fiscais, como marcar a nota para lançamento manual no Protheus.
                                      </p>
                                      {/* BOTÃO REMOVIDO */}
                                  </div>
                              </div>
                          </div>
                      );
                    })()}
                    {/* Aba Financeiro */}
                    {activeTab === 'financeiro' && (
                        <div>
                            <div style={{
                                background: '#f8f9fa',
                                border: `1px solid #dee2e6`,
                                padding: '1.5rem',
                                borderRadius: '8px',
                            }}>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginTop: 0, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Sparkles /> Assistente Financeiro
                                </h3>
                                <p style={{ margin: '0 0 1.5rem 0', lineHeight: 1.6, fontSize: '14px', color: '#333' }}>
                                    Consulte os boletos registrados no DDA (Débito Direto Autorizado) ou os pagamentos financeiros gerados para esta nota fiscal diretamente no ERP.
                                </p>
                                {/* BOTÕES REMOVIDOS */}
                            </div>
                        </div>
                    )}
                    {/* Aba Responsável */}
                    {activeTab === 'responsavel' && (
                      <div>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}><FaUserFriends /> Transferir Responsabilidade</h3>
                        <div style={{ background: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: '8px', padding: '1.5rem' }}>
                          <p style={{ color: '#6c757d', marginTop: '0', lineHeight: 1.6 }}>
                              Esta seção é destinada à transferência de responsabilidade da nota para outro comprador.
                          </p>
                          {/* COMPONENTES E BOTÕES REMOVIDOS */}
                        </div>
                      </div>
                    )}
                </div>
              </div>
            </div>
          )}
        </div>
      {/* Modais ConfirmationModal, ManualPedidoModal, ManualTesModal, FinanceiroModal não são mais renderizados aqui */}
    </>
  );
}