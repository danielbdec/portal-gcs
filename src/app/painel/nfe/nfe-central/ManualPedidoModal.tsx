"use client";

import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { FaSearch, FaSpinner, FaPencilAlt, FaExclamationTriangle } from "react-icons/fa";
import { Sparkles, Info, TrendingUp, TrendingDown } from "lucide-react";
import { Table, Tooltip, Descriptions } from "antd";
import type { TableProps } from 'antd';

// --- INTERFACES ---

interface ItemNota {
    item_xml: number;
    descricao_xml: string;
    valor_unitario_xml?: number;
    descricao_pedido: string | null;
    num_pedido: string | null;
    valor_unitario_ped?: number;
    valor_unitario_bate?: string;
    qtd?: number;
    moeda?: number;
    registro_pedido?: number | null;
    ultima_ptax?: number | null;
    data_ultima_ptax?: string | null;
}

interface PedidoEncontrado {
    Pedido: string;
    Produto: string;
    UM: string;
    "Seg. UM": string;
    Saldo: number;
    Valor: number;
    Registro: number;
    moeda?: number;
    ultima_ptax?: number;
    data_ultima_ptax?: string;
}

export interface ItemPedidoManual {
    item_xml: number;
    descricao_xml: string;
    valor_unitario_xml: number | null;
    num_pedido: string | null;
    descricao_pedido_api: string | null;
    valor_pedido_api: number | null;
    registro_pedido: number | null;
    qtd: number | null;
    moeda: number | null;
    ultima_ptax: number | null;
    data_ultima_ptax: string | null;
}

// --- FUNÇÕES E COMPONENTES AUXILIARES DE UI ---

const formatCurrency = (value: number | null, moeda: number | null): string => {
    if (value === null || value === undefined) return '';
    const locales: { [key: number]: string } = { 2: 'en-US', 3: 'de-DE' };
    const currencies: { [key: number]: string } = { 1: 'BRL', 2: 'USD', 3: 'EUR' };
    const currencyCode = currencies[moeda ?? 1];
    const locale = locales[moeda ?? 1] || 'pt-BR';
    if (currencyCode) {
        return value.toLocaleString(locale, { style: 'currency', currency: currencyCode });
    }
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const DiffTag = ({ valueBRL, pct }: { valueBRL: number; pct: number }) => {
    const isLoss = valueBRL > 0.001;
    const isGain = valueBRL < -0.001;
    const Icon = isLoss ? TrendingUp : TrendingDown;
    
    const tagClass = isLoss ? "is-loss" : isGain ? "is-gain" : "is-neutral";
  
    return (
      <span className={`diff-tag ${tagClass}`}>
        <Icon size={16} />
        {valueBRL >= 0 ? "+ " : "- "} {Math.abs(valueBRL).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        <span className="diff-tag-percent">
          ({valueBRL >= 0 ? "+" : ""}{pct.toFixed(2)}%)
        </span>
      </span>
    );
};

const Meta = ({ children, className }: { children: React.ReactNode, className?: string }) => {
    return <div className={`meta-text ${className || ''}`}>{children}</div>;
};

const AproximadoLabel = (
    <Tooltip title="Valor em R$ aproximado, convertido pela PTAX de referência vinda do ERP. O fornecedor pode adotar outra PTAX no fechamento, gerando diferenças.">
      <span className="tooltip-label">
        Aprox. em R$ (PTAX empresa) <Info size={14} />
      </span>
    </Tooltip>
);
  
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

const PedidoSearchModal = ({ isOpen, onClose, onSelect, searchResults, isLoading, error, activeItemInfo }: {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (pedido: PedidoEncontrado) => void;
    searchResults: PedidoEncontrado[];
    isLoading: boolean;
    error: string | null;
    activeItemInfo: { item: string; descricao: string; } | null;
}) => {
    const modalRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState<{ x: number; y: number } | null>(null); // Posição inicial nula
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const handleMouseDown = (e: React.MouseEvent) => {
        if (modalRef.current) {
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'BUTTON' || target.tagName === 'SELECT' || target.closest('button')) {
                return;
            }
            setIsDragging(true);
            
            // Se for o primeiro arraste, calcula a posição atual para evitar o "salto"
            const modalRect = modalRef.current.getBoundingClientRect();
            setPosition({ x: modalRect.left, y: modalRect.top });
            
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
        if (isOpen) {
            setSearchTerm(''); 
            setPosition(null); // Reseta a posição para que o CSS de centralização funcione
        }
    }, [isOpen]);

    const filteredResults = useMemo(() => {
        if (!searchTerm) {
            return searchResults;
        }
        const term = searchTerm.toLowerCase();
        return searchResults.filter(p =>
            p.Pedido.toLowerCase().includes(term) ||
            p.Produto.toLowerCase().includes(term)
        );
    }, [searchResults, searchTerm]);


    if (!isOpen) return null;

    let title = "Selecionar Pedido de Compra";
    if (activeItemInfo) {
        const truncatedDesc = activeItemInfo.descricao.length > 30
            ? `${activeItemInfo.descricao.substring(0, 30)}...`
            : activeItemInfo.descricao;
        title = `Selecionar Pedido - Item ${activeItemInfo.item}: ${truncatedDesc}`;
    }

    // Estilo dinâmico: usa a posição calculada SE o usuário arrastou,
    // senão, deixa o CSS (com transform) cuidar da centralização.
    const modalStyle: React.CSSProperties = position
        ? { top: position.y, left: position.x, transform: 'none' } // Posição pós-arraste
        : { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }; // Posição inicial

    return (
        <>
            <div onClick={onClose} className="search-modal-backdrop" style={{ zIndex: 2147483650 }}></div>
            <div
                ref={modalRef}
                className="search-modal-content" // Reutiliza a classe do ModalDetalhes
                style={{
                    ...modalStyle,
                    position: 'fixed',
                    zIndex: 2147483651,
                    width: '90%',
                    maxWidth: '700px',
                }}
            >
                <div
                    onMouseDown={handleMouseDown}
                    className="search-modal-header" // Reutiliza a classe
                >
                    <h4 className="search-modal-title">{title}</h4>
                    <button onClick={onClose} className="modal-close-btn">&times;</button>
                </div>
                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar por nº do pedido ou descrição..."
                        className="search-modal-input" // Reutiliza a classe
                        autoFocus
                    />
                    {error && <div className="search-modal-error">{error}</div>}
                    <div className="search-modal-results-container">
                        {isLoading ? (
                            <div className="tab-spinner-container" style={{padding: '3rem', minHeight: '100px'}}>
                                <div className="modal-tab-spinner"></div>
                                <div className="modal-tab-spinner-text">Buscando...</div>
                            </div>
                        ) : filteredResults.length > 0 ? (
                             <ul className="search-modal-results">
                                {filteredResults.map((p) => (
                                    <li
                                        key={p.Registro}
                                        onClick={() => { if (p) onSelect(p); }}
                                        className="search-modal-result-item"
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <strong style={{ color: 'var(--gcs-blue-sky)' }}>Pedido:</strong> {p.Pedido}
                                            </div>
                                            <div style={{ fontSize: '0.9em' }}>
                                                <strong>Saldo:</strong> {p.Saldo} {p.UM?.trim()}
                                            </div>
                                        </div>
                                        <div className="search-modal-result-subtext">{p.Produto}</div>
                                        <div style={{ fontSize: '0.8em', textAlign: 'right' }}>
                                            {/* CORREÇÃO AQUI: Converter undefined para null */}
                                            <strong>Valor:</strong> {formatCurrency(p.Valor, p.moeda ?? null)}
                                            {p.moeda === 2 && typeof p.Valor === 'number' && typeof p.ultima_ptax === 'number' && (
                                                <Meta className="meta-text">(aprox. {formatCurrency(p.Valor * p.ultima_ptax, 1)} @ {p.ultima_ptax.toFixed(4)})</Meta>
                                            )}
                                        </div>
                                    </li>
                                ))
                            }
                            </ul>
                        ) : (
                            !error && (
                                <div className="search-modal-no-results">
                                    {searchResults.length === 0 ? 
                                        "Não há pedidos em aberto para essa raiz de CNPJ." :
                                        "Nenhum resultado corresponde à sua busca."
                                    }
                                </div>
                            )
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};


// --- COMPONENTE PRINCIPAL: MODAL DE PEDIDOS ---

const ManualPedidoModal = ({
    isOpen,
    onClose,
    onSave,
    items,
    chave
}: {
    isOpen: boolean,
    onClose: () => void,
    onSave: (updates: ItemPedidoManual[]) => Promise<void>,
    items: ItemNota[],
    chave: string
}) => {
    const [itensManuais, setItensManuais] = useState<ItemPedidoManual[]>([]);
    const [isLoadingContent, setIsLoadingContent] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isAILoading, setIsAILoading] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);
    const [invalidRowIds, setInvalidRowIds] = useState<number[]>([]);
    const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
    const [isPedidoSearchModalOpen, setIsPedidoSearchModalOpen] = useState(false);
    const [isPedidoSearchLoading, setIsPedidoSearchLoading] = useState(false);
    const [pedidoSearchError, setPedidoSearchError] = useState<string | null>(null);
    const [pedidoSearchResults, setPedidoSearchResults] = useState<PedidoEncontrado[]>([]);
    const [activeSearchItem, setActiveSearchItem] = useState<ItemPedidoManual | null>(null);
    const modalRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState<{ x: number; y: number } | null>(null); // Posição inicial nula
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);

    const calcularComparativo = (item: ItemPedidoManual) => {
        const valorXmlBRL = item.valor_unitario_xml ?? 0;
        const valorPedidoOrig = item.valor_pedido_api ?? 0;
    
        let valorPedidoEmBRL = valorPedidoOrig;
        if (item.moeda === 2 && typeof item.ultima_ptax === 'number' && item.ultima_ptax > 0) {
            valorPedidoEmBRL = valorPedidoOrig * item.ultima_ptax;
        }
    
        const diferencaEmBRL = valorXmlBRL - valorPedidoEmBRL;
        
        const diferencaPercentual = valorXmlBRL > 0 ? (diferencaEmBRL / valorXmlBRL) * 100 : 0;
    
        return {
            diferencaEmBRL,
            diferencaPercentual,
        };
    };
    
    const expandedRowRender = (item: ItemPedidoManual) => {
        if (item.moeda !== 2 || !item.valor_pedido_api || !item.ultima_ptax || !item.valor_unitario_xml) {
            return <div className="expanded-row-content-simple">Não há detalhes de conversão para este item.</div>;
        }
    
        const { diferencaEmBRL, diferencaPercentual } = calcularComparativo(item);
    
        const pedidoBRL_aprox = item.valor_pedido_api * item.ultima_ptax;
        const nfUSD_pelaEmpresa = item.ultima_ptax ? (item.valor_unitario_xml / item.ultima_ptax) : 0;
        
        const diffClass = diferencaEmBRL > 0.001 ? "is-loss" : diferencaEmBRL < -0.001 ? "is-gain" : "is-neutral";
      
        return (
            <div className="expanded-row-content">
                <Descriptions size="small" column={3} bordered>
                    <Descriptions.Item label="Pedido (USD)">{formatCurrency(item.valor_pedido_api, 2)}</Descriptions.Item>
                    <Descriptions.Item label="PTAX ref.">
                        {item.ultima_ptax.toFixed(4)} <small>({item.data_ultima_ptax ? new Date(item.data_ultima_ptax).toLocaleDateString('pt-BR') : 'N/A'})</small>
                    </Descriptions.Item>
                    <Descriptions.Item label={AproximadoLabel}>{formatCurrency(pedidoBRL_aprox, 1)}</Descriptions.Item>
                    <Descriptions.Item label="NF (R$ efetivo)">{formatCurrency(item.valor_unitario_xml, 1)}</Descriptions.Item>
                    <Descriptions.Item label="NF (USD pela PTAX ref.)">{formatCurrency(nfUSD_pelaEmpresa, 2)}</Descriptions.Item>
                    <Descriptions.Item label="Diferença total (aprox.)">
                        <span className={`expanded-row-diff ${diffClass}`}>
                            {diferencaEmBRL >= 0 ? "+ " : ""}{formatCurrency(diferencaEmBRL, 1)} ({diferencaPercentual >= 0 ? "+" : ""}{diferencaPercentual.toFixed(2)}%)
                        </span>
                    </Descriptions.Item>
                </Descriptions>
            </div>
        );
    };

    useEffect(() => {
        if (!isOpen) {
            setIsCancelConfirmOpen(false);
            setValidationError(null);
            setInvalidRowIds([]);
        }
    }, [isOpen]);

    // --- ALTERAÇÃO 2: Corrigir lógica de inicialização do estado ---
    useEffect(() => {
        if (isOpen) {
            setIsLoadingContent(true);
            setPosition(null); // Reseta a posição para centralizar
            const timer = setTimeout(() => {
                const initialItensManuais = items.map(item => {
                    // Um item é considerado "pré-preenchido" se ele já tiver um número de pedido.
                    // Isso pode ser da automação (valor_unitario_bate === 'sim') ou
                    // de uma associação manual anterior.
                    const isPrepopulated = !!item.num_pedido;

                    return {
                        item_xml: item.item_xml,
                        descricao_xml: item.descricao_xml,
                        valor_unitario_xml: item.valor_unitario_xml ?? null,
                        qtd: item.qtd ?? null,
                        moeda: item.moeda ?? null,
                        
                        // Se estiver pré-preenchido, usamos os dados do 'item' (prop).
                        // Se não, iniciamos como null.
                        ultima_ptax: isPrepopulated ? (item.ultima_ptax ?? null) : null,
                        data_ultima_ptax: isPrepopulated ? (item.data_ultima_ptax ?? null) : null,
                        num_pedido: isPrepopulated ? item.num_pedido : null,
                        descricao_pedido_api: isPrepopulated ? item.descricao_pedido : null,
                        valor_pedido_api: isPrepopulated ? (item.valor_unitario_ped ?? null) : null,
                        registro_pedido: isPrepopulated ? (item.registro_pedido ?? null) : null,
                    };
                });
                setItensManuais(initialItensManuais);
                setIsLoadingContent(false);
            }, 0);

            return () => clearTimeout(timer);
        }
    }, [isOpen, items]);
    // --- FIM DA ALTERAÇÃO 2 ---

    const { totalDiferenca, totalDiferencaPercentual } = useMemo(() => {
        let totalDiff = 0;
        let totalValorXML = 0;
    
        itensManuais.forEach(item => {
            if (item.valor_pedido_api !== null && item.valor_unitario_xml !== null && item.qtd !== null) {
                const { diferencaEmBRL } = calcularComparativo(item);
                totalDiff += diferencaEmBRL * item.qtd;
                totalValorXML += item.valor_unitario_xml * item.qtd;
            }
        });
    
        const totalPct = totalValorXML > 0 ? (totalDiff / totalValorXML) * 100 : 0;
    
        return { totalDiferenca: totalDiff, totalDiferencaPercentual: totalPct };
    }, [itensManuais]);

    const handleSave = async () => {
        setValidationError(null);
        setInvalidRowIds([]);
        
        const itemsInvalidos = itensManuais
            .filter(item => !item.num_pedido || item.num_pedido.trim() === '')
            .map(item => item.item_xml);

        if (itemsInvalidos.length > 0) {
            setValidationError('Preencha os pedidos para os itens destacados em vermelho.');
            setInvalidRowIds(itemsInvalidos);
            return;
        }
        
        setIsSaving(true);
        try {
            await onSave(itensManuais);
        } catch (error: any) {
            console.error("Falha ao salvar:", error.message);
        } finally {
            setIsSaving(false);
        }
    };
    
    const clearValidationErrors = () => {
        if (validationError) {
            setValidationError(null);
            setInvalidRowIds([]);
        }
    };

    const handleAIAssist = async () => {
        setIsAILoading(true);
        console.log("Chamando assistente de IA para preencher pedidos...");
        await new Promise(resolve => setTimeout(resolve, 1500));
        alert('Assistente de IA: Funcionalidade a ser implementada.');
        setIsAILoading(false);
    };

    const handleSearchPedido = async (item: ItemPedidoManual) => {
        setActiveSearchItem(item);
        setIsPedidoSearchModalOpen(true);
        setIsPedidoSearchLoading(true);
        setPedidoSearchError(null);
        setPedidoSearchResults([]);

        try {
            const response = await fetch('/api/nfe/nfe-busca-pedido-manual-item', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chave: chave,
                    item_xml: item.item_xml
                }),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Erro ao buscar pedidos.');
            }

            setPedidoSearchResults(Array.isArray(data) ? data : []);

        } catch (err: any) {
            setPedidoSearchError(err.message);
        } finally {
            setIsPedidoSearchLoading(false);
        }
    };

    const handleSelectPedido = (pedido: PedidoEncontrado) => {
        if (!pedido || !pedido.Pedido) {
            setIsPedidoSearchModalOpen(false);
            setActiveSearchItem(null);
            return;
        }

        clearValidationErrors();
        if (activeSearchItem !== null) {
            setItensManuais(prevItens =>
                prevItens.map(item => {
                    if (item.item_xml === activeSearchItem.item_xml) {
                        return {
                            ...item,
                            num_pedido: pedido.Pedido,
                            descricao_pedido_api: pedido.Produto,
                            valor_pedido_api: pedido.Valor,
                            registro_pedido: pedido.Registro,
                            moeda: pedido.moeda ?? item.moeda,
                            ultima_ptax: pedido.ultima_ptax ?? null,
                            data_ultima_ptax: pedido.data_ultima_ptax ?? null,
                        };
                    }
                    return item;
                })
            );
        }
        setIsPedidoSearchModalOpen(false);
        setActiveSearchItem(null);
    };

    const handleCloseSearchModal = () => {
        setIsPedidoSearchModalOpen(false);
        setActiveSearchItem(null);
    }

    const handleMouseDown = (e: React.MouseEvent) => {
        if (modalRef.current) {
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'BUTTON' || target.tagName === 'SELECT') {
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
        if (isOpen && modalRef.current) {
            const modal = modalRef.current;
            const initialX = (window.innerWidth - modal.offsetWidth) / 2;
            const initialY = 80;
            setPosition({ x: initialX > 0 ? initialX : 20, y: initialY });
        }
    }, [isOpen]);
    
    const tableColumns: TableProps<ItemPedidoManual>['columns'] = [
        { title: 'Item', dataIndex: 'item_xml', key: 'item', width: '5%', align: 'center', render: (text) => <strong>{text}</strong> },
        { title: 'Descrição XML', dataIndex: 'descricao_xml', key: 'descricao_xml', width: '22%' },
        {
            title: 'Valor Unit. (XML)',
            dataIndex: 'valor_unitario_xml',
            key: 'valor_unitario_xml',
            width: '13%',
            align: 'right',
            render: (_, record) => (
                <div className="currency-cell">
                    {formatCurrency(record.valor_unitario_xml, 1)}
                    {record.moeda === 2 && typeof record.valor_unitario_xml === 'number' && typeof record.ultima_ptax === 'number' && record.ultima_ptax > 0 && (
                        <Meta>(aprox. {formatCurrency(record.valor_unitario_xml / record.ultima_ptax, 2)})</Meta>
                    )}
                </div>
            )
        },
        {
            title: 'Pedido',
            dataIndex: 'num_pedido',
            key: 'num_pedido',
            width: '15%',
            render: (_, record) => (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <div
                        className="pedido-display-box"
                        style={{ color: record.num_pedido ? undefined : 'inherit' }}
                    >
                        {record.num_pedido || 'Nenhum'}
                    </div>
                    <button
                        onClick={() => handleSearchPedido(record)}
                        title="Buscar Pedido"
                        disabled={isSaving || (isPedidoSearchLoading && activeSearchItem?.item_xml === record.item_xml)}
                        className="btn-icon-search"
                    >
                        {isPedidoSearchLoading && activeSearchItem?.item_xml === record.item_xml ? <FaSpinner className="animate-spin" size={12} /> : <FaSearch size={12} />}
                    </button>
                </div>
            )
        },
        { title: 'Descrição Pedido', dataIndex: 'descricao_pedido_api', key: 'descricao_pedido_api', width: '22%' },
        {
            title: (
                <Tooltip title="Valor na moeda do Pedido de Compra. Se for Dólar, exibe uma aproximação em Reais abaixo.">
                    <span className="tooltip-label">
                        Valor Pedido <Info size={14} />
                    </span>
                </Tooltip>
            ),
            dataIndex: 'valor_pedido_api',
            key: 'valor_pedido_api',
            width: '13%',
            align: 'right',
            render: (_, record) => (
                <div className="currency-cell">
                    {formatCurrency(record.valor_pedido_api, record.moeda)}
                    {record.moeda === 2 && typeof record.valor_pedido_api === 'number' && typeof record.ultima_ptax === 'number' && record.ultima_ptax > 0 && (
                        <Meta>(aprox. {formatCurrency(record.valor_pedido_api * record.ultima_ptax, 1)} @ {record.ultima_ptax.toFixed(4)})</Meta>
                    )}
                </div>
            )
        },
        {
            title: (
                <Tooltip title="Diferença calculada em Reais (R$), convertendo o valor do pedido quando necessário.">
                    <span className="tooltip-label">
                        Diferença <Info size={14} />
                    </span>
                </Tooltip>
            ),
            key: 'diferenca',
            width: '10%',
            align: 'right',
            render: (_, record) => {
                if (record.valor_pedido_api === null) return null;
                const { diferencaEmBRL, diferencaPercentual } = calcularComparativo(record);
                return <DiffTag valueBRL={diferencaEmBRL} pct={diferencaPercentual} />;
            }
        },
    ];

    if (!isOpen) return null;

    const TotalBar = () => {
        return (
            <div className="total-bar-wrapper">
                <strong style={{fontSize: '14px'}}>Total Diferença:</strong>
                <DiffTag valueBRL={totalDiferenca} pct={totalDiferencaPercentual} />
            </div>
        );
    }
    
    // Estilo dinâmico: usa a posição calculada SE o usuário arrastou,
    // senão, deixa o CSS (com transform) cuidar da centralização.
    const modalStyle: React.CSSProperties = position
        ? { top: position.y, left: position.x, transform: 'none' } // Posição pós-arraste
        : { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }; // Posição inicial

    return (
        <>
            {/* O BLOCO DE ESTILO É INJETADO AQUI */}
            <style>{`
                /* --- === Base (copiado de ModalDetalhes) === --- */
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
                    position: fixed; top: 0; left: 0;
                    width: 100vw; height: 100vh;
                    background-color: rgba(0,0,0,0.6);
                    z-index: 2147483648;
                }
                .modal-detalhes-glass {
                    position: fixed;
                    border-radius: 12px;
                    width: 95%;
                    
                    /* --- CORREÇÃO 1: Tamanho do Modal Principal --- */
                    max-width: 1200px; 
                    /* --- FIM CORREÇÃO 1 --- */

                    min-height: 400px;
                    max-height: 90vh;
                    display: flex;
                    flex-direction: column;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                    z-index: 2147483649;
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
                    background: none; border: none; font-size: 1.75rem;
                    cursor: pointer; padding: 0; line-height: 1;
                }
                body.light .modal-close-btn { color: var(--gcs-dark-text); }
                body.dark .modal-close-btn { color: var(--gcs-dark-text-secondary); }
                body.dark .modal-close-btn:hover { color: var(--gcs-dark-text-primary); }

                /* --- Modal Content --- */
                .modal-content-wrapper {
                    padding: 1.5rem;
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                    overflow: hidden;
                    flex-grow: 1;
                }
                .modal-content-scrollable {
                    overflow-y: auto;
                    flex-grow: 1;
                    /* Estilização da barra de rolagem para WebKit (Chrome, Safari) */
                }
                .modal-content-scrollable::-webkit-scrollbar {
                    width: 8px;
                }
                .modal-content-scrollable::-webkit-scrollbar-track {
                    background: transparent;
                }
                .modal-content-scrollable::-webkit-scrollbar-thumb {
                    background-color: rgba(0, 0, 0, 0.2);
                    border-radius: 4px;
                }
                body.dark .modal-content-scrollable::-webkit-scrollbar-thumb {
                    background-color: rgba(255, 255, 255, 0.2);
                }
                .modal-footer {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 1rem;
                    margin-top: 1rem;
                    flex-shrink: 0;
                }
                .modal-footer-actions {
                    display: flex;
                    gap: 1rem;
                }

                /* --- Spinners --- */
                .modal-loading-container {
                    display: flex; flex-direction: column; align-items: center;
                    justify-content: center; padding: 3rem; color: var(--gcs-gray-text);
                    min-height: 200px; flex-grow: 1;
                }
                .modal-main-spinner {
                    width: 40px; height: 40px; border-radius: 50%;
                    animation: spin 1s linear infinite;
                }
                .modal-main-spinner-text { margin-top: 1rem; font-size: 1.1em; font-weight: bold; }
                
                body.light .modal-main-spinner { border: 4px solid #ccc; border-top: 4px solid var(--gcs-blue-light); }
                body.light .modal-main-spinner-text { color: var(--gcs-blue-light); }
                body.dark .modal-main-spinner { border: 4px solid var(--gcs-dark-border); border-top: 4px solid var(--gcs-blue-sky); }
                body.dark .modal-main-spinner-text { color: var(--gcs-blue-sky); }
                
                .tab-spinner-container {
                    display: flex; flex-direction: column; align-items: center;
                    justify-content: center; padding-top: 3rem; padding-bottom: 3rem;
                    min-height: 200px;
                }
                .modal-tab-spinner {
                    width: 30px; height: 30px; border-radius: 50%;
                    animation: spin 1s linear infinite;
                }
                .modal-tab-spinner-text { margin-top: 1rem; font-weight: bold; font-size: 1rem; }
                
                body.light .modal-tab-spinner { border: 3px solid #ccc; border-top: 3px solid var(--gcs-blue-light); }
                body.light .modal-tab-spinner-text { color: var(--gcs-blue-light); }
                body.dark .modal-tab-spinner { border: 3px solid var(--gcs-dark-border); border-top: 3px solid var(--gcs-blue-sky); }
                body.dark .modal-tab-spinner-text { color: var(--gcs-blue-sky); }

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
                
                .btn-secondary { border: 1px solid; font-weight: bold; }
                body.light .btn-secondary { background: #f1f1f1; color: var(--gcs-dark-text); border-color: #ccc; }
                body.light .btn-secondary:hover:not(:disabled) { background: #e0e0e0; }
                body.dark .btn-secondary { background: var(--gcs-dark-bg-transparent); color: var(--gcs-dark-text-secondary); border-color: var(--gcs-dark-border); }
                body.dark .btn-secondary:hover:not(:disabled) { background: rgba(25, 39, 53, 0.7); border-color: var(--gcs-dark-border-hover); }

                .btn-danger { background-color: var(--gcs-brand-red); color: white; }
                .btn-danger:hover:not(:disabled) { background-color: #b01725; }
                
                .btn-green { background-color: var(--gcs-green-dark); color: white; }
                .btn-green:hover:not(:disabled) { background-color: #1e7e34; }

                .btn-ai {
                    background: #fff; border: 2px solid #facc15; padding: 8px 16px;
                    border-radius: 8px; cursor: pointer; display: flex;
                    align-items: center; gap: 8px; font-weight: 600;
                    font-size: 0.9rem; transition: all 0.2s ease;
                }
                body.light .btn-ai { color: #0f172a; }
                body.light .btn-ai:hover:not(:disabled) { background: #fffbea; }
                body.dark .btn-ai {
                    background: rgba(250, 204, 21, 0.1); color: #FDE68A;
                    border-color: #facc15;
                }
                body.dark .btn-ai:hover:not(:disabled) { background: rgba(250, 204, 21, 0.2); }
                .btn-ai:disabled { opacity: 0.6; cursor: not-allowed; }

                /* --- ConfirmationModal --- */
                .confirm-modal-backdrop {
                    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
                    background-color: rgba(0,0,0,0.5); z-index: 2147483652;
                }
                .confirm-modal-content {
                    position: fixed; top: 50%; left: 50%;
                    transform: translate(-50%, -50%); border-radius: 8px;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.2); z-index: 2147483653;
                    width: 90%; max-width: 450px; padding: 2rem; text-align: center;
                }
                body.light .confirm-modal-content { background-color: white; }
                body.dark .confirm-modal-content { background: var(--gcs-dark-bg-heavy); border: 1px solid var(--gcs-dark-border); }
                .confirm-modal-icon { display: flex; justify-content: center; margin-bottom: 1rem; }
                .confirm-modal-title { margin-top: 0; margin-bottom: 1rem; font-size: 1.5rem; }
                body.light .confirm-modal-title { color: #333; }
                body.dark .confirm-modal-title { color: var(--gcs-dark-text-primary); }
                .confirm-modal-message { line-height: 1.6; }
                body.light .confirm-modal-message { color: #666; }
                body.dark .confirm-modal-message { color: var(--gcs-dark-text-secondary); }
                .confirm-modal-actions { margin-top: 1.5rem; display: flex; justify-content: center; gap: 1rem; }

                /* --- PedidoSearchModal --- */
                .search-modal-backdrop {
                    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
                    background-color: rgba(0,0,0,0.5); z-index: 2147483650;
                }
                .search-modal-content {
                    position: fixed; border-radius: 8px;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.2); z-index: 2147483651;
                    width: 90%; max-width: 700px;
                }
                body.light .search-modal-content { background-color: white; }
                body.dark .search-modal-content { background: var(--gcs-dark-bg-heavy); border: 1px solid var(--gcs-dark-border); }
                
                .search-modal-header {
                    padding: 1.5rem; border-bottom: 1px solid; cursor: move;
                    border-top-left-radius: 8px; border-top-right-radius: 8px;
                    display: flex; justify-content: space-between; align-items: center;
                }
                body.light .search-modal-header { background-color: var(--gcs-gray-light); border-bottom-color: #dee2e6; }
                body.dark .search-modal-header { background-color: rgba(25, 39, 53, 0.5); border-bottom-color: var(--gcs-dark-border); }
                
                .search-modal-title { margin: 0; font-size: 1.1rem; }
                body.light .search-modal-title { color: var(--gcs-dark-text); }
                body.dark .search-modal-title { color: var(--gcs-dark-text-primary); }
                
                .search-modal-input {
                    width: 100%; padding: 10px; border-radius: 5px;
                    border: 1px solid; font-size: 1rem;
                }
                body.light .search-modal-input { background: #fff; border-color: #ccc; color: var(--gcs-dark-text); }
                body.dark .search-modal-input { background: rgba(25, 39, 53, 0.5); border-color: var(--gcs-dark-border); color: var(--gcs-dark-text-primary); }
                body.dark .search-modal-input:focus { border-color: var(--gcs-dark-border-hover); background: rgba(25, 39, 53, 0.7); }
                
                .search-modal-error {
                    padding: 1rem; border-radius: 5px;
                }
                body.light .search-modal-error { color: #dc3545; background: #f8d7da; }
                body.dark .search-modal-error { color: #F87171; background: rgba(225, 29, 46, 0.15); }

                .search-modal-results-container {
                    max-height: 350px; overflow-y: auto;
                    border: 1px solid; border-radius: 5px;
                }
                body.light .search-modal-results-container { border-color: #eee; }
                body.dark .search-modal-results-container { border-color: var(--gcs-dark-border); }
                
                .search-modal-results { list-style: none; padding: 0; margin: 0; }
                .search-modal-result-item {
                    padding: 12px; cursor: pointer; border-bottom: 1px solid;
                    transition: background-color 0.2s ease-in-out;
                }
                body.light .search-modal-result-item { border-bottom-color: #eee; }
                body.light .search-modal-result-item:hover { background-color: #f0f8ff; }
                body.dark .search-modal-result-item { border-bottom-color: var(--gcs-dark-border); }
                body.dark .search-modal-result-item:hover { background-color: rgba(25, 39, 53, 0.7); }
                
                .search-modal-result-subtext { font-size: 0.9em; margin-top: 4px; }
                body.light .search-modal-result-subtext { color: #6c757d; }
                body.dark .search-modal-result-subtext { color: var(--gcs-dark-text-tertiary); }
                
                .search-modal-no-results { padding: 20px; text-align: center; }
                body.light .search-modal-no-results { color: #6c757d; }
                body.dark .search-modal-no-results { color: var(--gcs-dark-text-tertiary); }

                /* --- === Estilos Específicos deste Modal === --- */

                /* Tabela e overrides Antd */
                .validation-error-box {
                    background: #fff5f5; color: #c53030; border: 1px solid #fc8181;
                    padding: 12px; border-radius: 8px; margin-bottom: 1rem;
                    text-align: center; font-weight: 500;
                }
                body.dark .validation-error-box {
                    background: rgba(225, 29, 46, 0.15); color: #F87171;
                    border-color: rgba(225, 29, 46, 0.3);
                }

                .ant-table-wrapper {
                    border-radius: 8px;
                    border: 1px solid;
                    overflow: hidden; /* Garante que o antd respeite o border-radius */
                }
                body.light .ant-table-wrapper { border-color: #dee2e6; }
                body.dark .ant-table-wrapper { border-color: var(--gcs-dark-border-hover); }

                body.light .ant-table { background: #fff; }
                body.dark .ant-table { background: transparent; }

                .ant-table-thead > tr > th {
                    font-weight: bold;
                    transition: background 0.3s ease, color 0.3s ease;
                }
                body.light .ant-table-thead > tr > th {
                    background: var(--gcs-gray-light);
                    color: var(--gcs-blue-light);
                    border-bottom: 1px solid #dee2e6;
                }
                body.dark .ant-table-thead > tr > th {
                    background: rgba(25, 39, 53, 0.5);
                    color: var(--gcs-blue-sky);
                    border-bottom: 1px solid var(--gcs-dark-border-hover);
                }
                
                .ant-table-tbody > tr > td {
                    border-bottom: 1px solid;
                    transition: background 0.3s ease, border 0.3s ease;
                }
                body.light .ant-table-tbody > tr > td {
                    background: #fff;
                    color: var(--gcs-dark-text);
                    border-bottom-color: #f0f0f0;
                }
                body.dark .ant-table-tbody > tr > td {
                    background: transparent;
                    color: var(--gcs-dark-text-secondary);
                    border-bottom-color: var(--gcs-dark-border);
                }
                
                body.light .ant-table-tbody > tr.ant-table-row:hover > td { background: #f9f9f9; }
                body.dark .ant-table-tbody > tr.ant-table-row:hover > td { background: rgba(25, 39, 53, 0.4); }

                /* Linha Inválida */
                body.light .invalid-row td { background-color: #fff2f0 !important; }
                body.light .invalid-row td:first-child { border-left: 3px solid #f5222d !important; }
                body.dark .invalid-row td { background-color: rgba(225, 29, 46, 0.1) !important; }
                body.dark .invalid-row td:first-child { border-left: 3px solid #F87171 !important; }
                
                /* --- CORREÇÃO 2: Destaque da Linha Ativa (Contorno na TR) --- */
                .active-search-row {
                    outline: 2px solid var(--gcs-green-dark) !important;
                    outline-offset: -1px; /* Ajuste para ficar mais justo */
                }
                body.dark .active-search-row {
                    outline-color: var(--gcs-green) !important; /* Verde mais claro no escuro */
                }
                body.light .active-search-row > td {
                    background-color: var(--gcs-green-light) !important;
                }
                body.dark .active-search-row > td {
                    background-color: rgba(95, 178, 70, 0.1) !important;
                }
                /* --- FIM CORREÇÃO 2 --- */

                /* Linha Expandida */
                body.light .ant-table-expanded-row > td { background: #f8f9fa !important; }
                body.dark .ant-table-expanded-row > td { background: rgba(25, 39, 53, 0.25) !important; }
                
                .expanded-row-content {
                    border: 1px solid; border-left: 4px solid;
                    padding: 12px; border-radius: 10px; margin: 6px 0 4px;
                }
                body.light .expanded-row-content { background: #f8fafc; border-color: #e2e8f0; border-left-color: #3b82f6; }
                body.dark .expanded-row-content { background: rgba(25, 39, 53, 0.4); border-color: var(--gcs-dark-border-hover); border-left-color: var(--gcs-blue-sky); }
                
                .expanded-row-content-simple {
                    padding: 1rem; border-left: 4px solid;
                }
                body.light .expanded-row-content-simple { background: #fafafa; border-left-color: #e2e8f0; }
                body.dark .expanded-row-content-simple { background: rgba(25, 39, 53, 0.4); border-left-color: var(--gcs-dark-border-hover); }

                .expanded-row-diff { font-weight: bold; }
                .expanded-row-diff.is-loss { color: #b91c1c; }
                .expanded-row-diff.is-gain { color: #15803d; }
                body.light .expanded-row-diff.is-neutral { color: #6b7280; }
                body.dark .expanded-row-diff.is-loss { color: #F87171; }
                body.dark .expanded-row-diff.is-gain { color: #4ADE80; }
                body.dark .expanded-row-diff.is-neutral { color: var(--gcs-dark-text-tertiary); }
                
                /* Overrides Antd Descriptions */
                body.light .ant-descriptions { background: #fff; }
                body.dark .ant-descriptions { background: rgba(25, 39, 53, 0.2); }
                body.dark .ant-descriptions-bordered .ant-descriptions-view { border-color: var(--gcs-dark-border-hover); }
                body.dark .ant-descriptions-item-label {
                    background: rgba(25, 39, 53, 0.5) !important;
                    color: var(--gcs-dark-text-primary) !important;
                    border-color: var(--gcs-dark-border-hover) !important;
                }
                body.dark .ant-descriptions-item-content {
                    color: var(--gcs-dark-text-secondary) !important;
                    border-color: var(--gcs-dark-border-hover) !important;
                }
                body.dark .ant-descriptions-item-label small { color: var(--gcs-dark-text-tertiary); }
                
                /* Overrides Antd Tooltip */
                body.light .ant-tooltip-inner {
                    border-radius: 12px !important; border: 1px solid rgba(255,255,255,.35) !important;
                    background: rgba(255,255,255,.25) !important; backdrop-filter: blur(14px) saturate(140%) !important;
                    -webkit-backdrop-filter: blur(14px) saturate(140%) !important; box-shadow: 0 8px 24px rgba(0,0,0,.12) !important;
                    color: #00314A !important;
                }
                body.light .ant-tooltip-arrow::before, body.light .ant-tooltip-arrow::after { background: transparent !important; }
                body.dark .ant-tooltip-inner {
                    border-radius: 12px !important; border: 1px solid rgba(125,173,222,.28) !important;
                    background: rgba(25,39,53,.50) !important; backdrop-filter: blur(14px) saturate(140%) !important;
                    -webkit-backdrop-filter: blur(14px) saturate(140%) !important; box-shadow: 0 8px 24px rgba(0,0,0,.12) !important;
                    color: #E2E8F0 !important;
                }
                body.dark .ant-tooltip-arrow::before, body.dark .ant-tooltip-arrow::after { background: transparent !important; }

                /* Componentes customizados da tabela */
                .currency-cell { font-family: monospace; text-align: right; }
                .meta-text { color: #94a3b8; font-size: 12px; margin-top: 2px; }
                .tooltip-label { display: inline-flex; align-items: center; gap: 4px; cursor: help; }
                body.dark .tooltip-label { color: var(--gcs-dark-text-primary); }
                body.dark .tooltip-label svg { color: var(--gcs-dark-text-tertiary); }

                .pedido-display-box {
                    flex: 1; padding: 8px; border-radius: 6px; border: 1px solid;
                    text-align: center; white-space: nowrap; overflow: hidden;
                    text-overflow: ellipsis; min-height: 37px;
                    display: flex; align-items: center; justify-content: center;
                }
                body.light .pedido-display-box {
                    border-color: #ced4da; background: #e9ecef; color: #495057;
                }
                body.dark .pedido-display-box {
                    border-color: var(--gcs-dark-border-hover); background: rgba(25, 39, 53, 0.5);
                    color: var(--gcs-dark-text-secondary);
                }
                body.light .pedido-display-box:not([style*="color"]) { color: #6c757d; } /* Placeholder */
                body.dark .pedido-display-box:not([style*="color"]) { color: var(--gcs-dark-text-tertiary); } /* Placeholder */

                .btn-icon-search {
                    border: 1px solid; border-radius: 50%;
                    width: 32px; height: 32px;
                    display: flex; align-items: center; justify-content: center;
                    cursor: pointer; flex-shrink: 0; transition: all 0.2s ease;
                }
                body.light .btn-icon-search {
                    background: #eaf2fa; border-color: #a3b8d1; color: #1b4c89;
                }
                body.light .btn-icon-search:hover:not(:disabled) { background: #d4e5f7; }
                body.dark .btn-icon-search {
                    background: rgba(59, 130, 246, 0.15); border-color: rgba(59, 130, 246, 0.3);
                    color: var(--gcs-blue-sky);
                }
                body.dark .btn-icon-search:hover:not(:disabled) { background: rgba(59, 130, 246, 0.25); }
                .btn-icon-search:disabled { opacity: 0.6; cursor: not-allowed; }
                
                /* DiffTag */
                .diff-tag {
                    display: inline-flex; align-items: center; gap: 6px;
                    font-weight: 600; padding: 4px 10px; border-radius: 999px;
                    font-size: 12px; border: 1px solid;
                }
                .diff-tag-percent { opacity: 0.8; }
                
                body.light .diff-tag.is-loss { color: #b91c1c; background-color: #fee2e2; border-color: #fecaca; }
                body.light .diff-tag.is-loss .diff-tag-percent { color: #b91c1c; }
                body.light .diff-tag.is-gain { color: #15803d; background-color: #dcfce7; border-color: #bbf7d0; }
                body.light .diff-tag.is-gain .diff-tag-percent { color: #15803d; }
                body.light .diff-tag.is-neutral { color: #6b7280; background-color: #f1f5f9; border-color: #e2e8f0; }
                body.light .diff-tag.is-neutral .diff-tag-percent { color: #64748b; }
                
                body.dark .diff-tag.is-loss { color: #F87171; background-color: rgba(225, 29, 46, 0.15); border-color: rgba(225, 29, 46, 0.3); }
                body.dark .diff-tag.is-loss .diff-tag-percent { color: #F87171; }
                body.dark .diff-tag.is-gain { color: #4ADE80; background-color: rgba(34, 197, 94, 0.15); border-color: rgba(34, 197, 94, 0.3); }
                body.dark .diff-tag.is-gain .diff-tag-percent { color: #4ADE80; }
                body.dark .diff-tag.is-neutral { color: #94A3B8; background-color: rgba(25, 39, 53, 0.4); border-color: var(--gcs-dark-border); }
                body.dark .diff-tag.is-neutral .diff-tag-percent { color: #94A3B8; }

                /* Total Bar */
                .total-bar-wrapper {
                    display: flex; justify-content: space-between; align-items: center;
                    padding: 10px 16px; border-radius: 8px; border: 1px solid;
                }
                body.light .total-bar-wrapper { background: #f8fafc; border-color: #e2e8f0; color: var(--gcs-dark-text); }
                body.dark .total-bar-wrapper { background: rgba(25, 39, 53, 0.25); border-color: var(--gcs-dark-border); color: var(--gcs-dark-text-primary); }

            `}</style>
            
            <div onClick={isSaving ? undefined : () => setIsCancelConfirmOpen(true)} className="modal-detalhes-backdrop"></div>
            <div
                ref={modalRef}
                className="modal-detalhes-glass"
                style={{
                    position: 'fixed',
                    ...(position ? { top: position.y, left: position.x, transform: 'none' } : { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' })
                }}
            >
                <div
                    onMouseDown={handleMouseDown}
                    className="modal-detalhes-header"
                >
                    <span className="modal-detalhes-title">Informar Pedidos Manualmente</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <button
                            onClick={handleAIAssist}
                            disabled={isSaving || isAILoading}
                            title="Usar assistente de IA para preencher os pedidos"
                            className="btn-ai"
                        >
                            {isAILoading ? <FaSpinner className="animate-spin" /> : <Sparkles size={18} color="#f59e0b" />}
                            <span>{isAILoading ? "Aguarde..." : "Preencher com IA"}</span>
                        </button>
                        <button onClick={isSaving || isAILoading ? undefined : () => setIsCancelConfirmOpen(true)} disabled={isSaving || isAILoading} className="modal-close-btn">&times;</button>
                    </div>
                </div>

                <div className="modal-content-wrapper">
                    {isLoadingContent ? (
                        <div className="modal-loading-container">
                            <div className="modal-main-spinner"></div>
                            <span className="modal-main-spinner-text">Carregando...</span>
                        </div>
                    ) : (
                        <>
                            {validationError && (
                                <div className="validation-error-box">
                                    {validationError}
                                </div>
                            )}
                            <div className="modal-content-scrollable">
                                <Table
                                    dataSource={itensManuais}
                                    columns={tableColumns}
                                    rowKey="item_xml"
                                    pagination={false}
                                    size="small"
                                    sticky
                                    rowClassName={(record) => {
                                        let classes = [];
                                        if (invalidRowIds.includes(record.item_xml)) {
                                            classes.push('invalid-row');
                                        }
                                        if (activeSearchItem && activeSearchItem.item_xml === record.item_xml) {
                                            classes.push('active-search-row'); // Nova classe de destaque
                                        }
                                        return classes.join(' ');
                                    }}
                                    expandable={{
                                        expandedRowRender: (record) => expandedRowRender(record),
                                        rowExpandable: (record) => record.moeda === 2,
                                    }}
                                />
                            </div>
                            <div className="modal-footer">
                                <div style={{flex: 1}}>
                                    <TotalBar />
                                </div>
                                <div className="modal-footer-actions">
                                    <button onClick={() => setIsCancelConfirmOpen(true)} disabled={isSaving} className="btn btn-secondary">Cancelar</button>
                                    <button 
                                        onClick={handleSave} 
                                        disabled={isSaving}
                                        className="btn btn-green"
                                    >
                                        {isSaving ? <><FaSpinner className="animate-spin" /> Salvando...</> : 'Salvar Alterações'}
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            <ConfirmationModal
                isOpen={isCancelConfirmOpen}
                onClose={() => setIsCancelConfirmOpen(false)}
                onConfirm={onClose}
                title="Confirmar Cancelamento"
                message="Você tem certeza que deseja cancelar? Todas as alterações não salvas serão perdidas."
                confirmText="Sim, Cancelar"
                confirmColor="#dc3545"
            />
            
            <PedidoSearchModal
                isOpen={isPedidoSearchModalOpen}
                onClose={handleCloseSearchModal}
                onSelect={handleSelectPedido}
                searchResults={pedidoSearchResults}
                isLoading={isPedidoSearchLoading}
                error={pedidoSearchError}
                activeItemInfo={activeSearchItem ? { item: String(activeSearchItem.item_xml), descricao: activeSearchItem.descricao_xml } : null}
            />
        </>
    );
};

export default ManualPedidoModal;