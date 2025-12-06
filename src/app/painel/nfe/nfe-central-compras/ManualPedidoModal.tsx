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
    // --- ALTERAÇÃO 1: Adicionar campos opcionais para preservar o estado pré-existente ---
    registro_pedido?: number | null;
    ultima_ptax?: number | null;
    data_ultima_ptax?: string | null;
    // --- FIM DA ALTERAÇÃO 1 ---
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
    const color = isLoss ? "#b91c1c" : isGain ? "#15803d" : "#6b7280";
    const backgroundColor = isLoss ? "#fee2e2" : isGain ? "#dcfce7" : "#f1f5f9";
    const borderColor = isLoss ? "#fecaca" : isGain ? "#bbf7d0" : "#e2e8f0";
  
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontWeight: 600,
          color,
          backgroundColor,
          border: `1px solid ${borderColor}`,
          padding: "4px 10px",
          borderRadius: 999,
          fontSize: '12px'
        }}
      >
        <Icon size={16} />
        {valueBRL >= 0 ? "+ " : "- "} {Math.abs(valueBRL).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        <span style={{ color: isLoss ? "#b91c1c" : isGain ? "#15803d" : "#64748b" }}>
          ({valueBRL >= 0 ? "+" : ""}{pct.toFixed(2)}%)
        </span>
      </span>
    );
};

const Meta = ({ children }: { children: React.ReactNode }) => {
    return <div style={{ color: "#94a3b8", fontSize: 12, marginTop: '2px' }}>{children}</div>;
};

const AproximadoLabel = (
    <Tooltip title="Valor em R$ aproximado, convertido pela PTAX de referência vinda do ERP. O fornecedor pode adotar outra PTAX no fechamento, gerando diferenças.">
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
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
    return (
        <>
            <div onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 2147483652 }}></div>
            <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', backgroundColor: 'white', padding: '2rem', borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.2)', zIndex: 2147483653, maxWidth: '450px', textAlign: 'center' }}>
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
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

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
        if (isOpen) {
            setSearchTerm(''); 
            if (modalRef.current) {
                const modal = modalRef.current;
                const initialX = (window.innerWidth - modal.offsetWidth) / 1.6;
                const initialY = 100;
                setPosition({ x: initialX > 0 ? initialX : 20, y: initialY });
            }
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

    return (
        <>
            <div onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 2147483650 }}></div>
            <div
                ref={modalRef}
                style={{
                    position: 'fixed',
                    top: position.y,
                    left: position.x,
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    zIndex: 2147483651,
                    width: '90%',
                    maxWidth: '700px',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
                }}
            >
                <div
                    onMouseDown={handleMouseDown}
                    style={{
                        padding: '1.5rem',
                        borderBottom: '1px solid #dee2e6',
                        cursor: 'move',
                        backgroundColor: '#f1f5fb',
                        borderTopLeftRadius: '8px',
                        borderTopRightRadius: '8px'
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h4 style={{ margin: 0, fontSize: '1.1rem' }}>{title}</h4>
                        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
                    </div>
                </div>
                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar por nº do pedido ou descrição..."
                        style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}
                        autoFocus
                    />
                    {error && <div style={{ color: '#dc3545', padding: '1rem', background: '#f8d7da', borderRadius: '5px' }}>{error}</div>}
                    <div style={{ maxHeight: '350px', overflowY: 'auto', border: '1px solid #eee', borderRadius: '5px' }}>
                        {isLoading ? (
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '3rem' }}>
                                <FaSpinner className="animate-spin" size={24} color="#1b4c89" />
                            </div>
                        ) : filteredResults.length > 0 ? (
                            filteredResults.map((p) => (
                                <div
                                    key={p.Registro}
                                    onClick={() => { if (p) onSelect(p); }}
                                    style={{ padding: '12px', cursor: 'pointer', borderBottom: '1px solid #eee', backgroundColor: '#fff', transition: 'background-color 0.2s' }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f8ff'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff'}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <strong style={{ color: '#1b4c89' }}>Pedido:</strong> {p.Pedido}
                                        </div>
                                        <div style={{ fontSize: '0.9em' }}>
                                            <strong>Saldo:</strong> {p.Saldo} {p.UM?.trim()}
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '0.9em', color: '#6c757d', marginTop: '4px' }}>{p.Produto}</div>
                                    <div style={{ fontSize: '0.8em', color: '#888', textAlign: 'right' }}>
                                        {/* --- CORREÇÃO: p.moeda ?? null para garantir que não passe undefined --- */}
                                        <strong>Valor:</strong> {formatCurrency(p.Valor, p.moeda ?? null)}
                                        {p.moeda === 2 && typeof p.Valor === 'number' && typeof p.ultima_ptax === 'number' && (
                                            <Meta>
                                                (aprox. {formatCurrency(p.Valor * p.ultima_ptax, 1)} @ {p.ultima_ptax.toFixed(4)})
                                            </Meta>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            !error && (
                                <div style={{ padding: '20px', textAlign: 'center', color: '#6c757d' }}>
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
    const [position, setPosition] = useState({ x: 0, y: 0 });
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
            return <div style={{padding: '1rem', background: '#fafafa', borderLeft: '4px solid #e2e8f0'}}>Não há detalhes de conversão para este item.</div>;
        }
    
        const { diferencaEmBRL, diferencaPercentual } = calcularComparativo(item);
    
        const pedidoBRL_aprox = item.valor_pedido_api * item.ultima_ptax;
        const nfUSD_pelaEmpresa = item.ultima_ptax ? (item.valor_unitario_xml / item.ultima_ptax) : 0;
      
        return (
            <div style={{ background: "#f8fafc", borderLeft: "4px solid #3b82f6", border: "1px solid #e2e8f0", padding: 12, borderRadius: 10, margin: "6px 0 4px" }}>
                <Descriptions size="small" column={3} bordered>
                    <Descriptions.Item label="Pedido (USD)">{formatCurrency(item.valor_pedido_api, 2)}</Descriptions.Item>
                    <Descriptions.Item label="PTAX ref.">
                        {item.ultima_ptax.toFixed(4)} <small>({item.data_ultima_ptax ? new Date(item.data_ultima_ptax).toLocaleDateString('pt-BR') : 'N/A'})</small>
                    </Descriptions.Item>
                    <Descriptions.Item label={AproximadoLabel}>{formatCurrency(pedidoBRL_aprox, 1)}</Descriptions.Item>
                    <Descriptions.Item label="NF (R$ efetivo)">{formatCurrency(item.valor_unitario_xml, 1)}</Descriptions.Item>
                    <Descriptions.Item label="NF (USD pela PTAX ref.)">{formatCurrency(nfUSD_pelaEmpresa, 2)}</Descriptions.Item>
                    <Descriptions.Item label="Diferença total (aprox.)">
                        <span style={{ color: diferencaEmBRL > 0.001 ? "#b91c1c" : diferencaEmBRL < -0.001 ? "#15803d" : '#6b7280', fontWeight: 'bold' }}>
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
                <div style={{fontFamily: 'monospace', textAlign: 'right'}}>
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
                        style={{
                            flex: 1,
                            padding: '8px',
                            borderRadius: '6px',
                            border: '1px solid #ced4da',
                            background: '#e9ecef',
                            color: record.num_pedido ? '#495057' : '#6c757d',
                            textAlign: 'center',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            minHeight: '37px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >{record.num_pedido || 'Nenhum'}</div>
                    <button
                        onClick={() => handleSearchPedido(record)}
                        title="Buscar Pedido"
                        disabled={isSaving || (isPedidoSearchLoading && activeSearchItem?.item_xml === record.item_xml)}
                        style={{ background: '#eaf2fa', border: '1px solid #a3b8d1', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
                    >
                        {isPedidoSearchLoading && activeSearchItem?.item_xml === record.item_xml ? <FaSpinner className="animate-spin" size={12} color="#1b4c89" /> : <FaSearch size={12} color="#1b4c89" />}
                    </button>
                </div>
            )
        },
        { title: 'Descrição Pedido', dataIndex: 'descricao_pedido_api', key: 'descricao_pedido_api', width: '22%' },
        {
            title: (
                <Tooltip title="Valor na moeda do Pedido de Compra. Se for Dólar, exibe uma aproximação em Reais abaixo.">
                    <span style={{display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'help'}}>
                        Valor Pedido <Info size={14} style={{ color: '#94a3b8' }} />
                    </span>
                </Tooltip>
            ),
            dataIndex: 'valor_pedido_api',
            key: 'valor_pedido_api',
            width: '13%',
            align: 'right',
            render: (_, record) => (
                <div style={{fontFamily: 'monospace', textAlign: 'right'}}>
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
                    <span style={{display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'help'}}>
                        Diferença <Info size={14} style={{ color: '#94a3b8' }} />
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
            <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "#f8fafc",
                padding: "10px 16px",
                borderRadius: 8,
                border: "1px solid #e2e8f0",
                marginTop: 12
              }}>
                <strong style={{fontSize: '14px'}}>Total Diferença:</strong>
                <DiffTag valueBRL={totalDiferenca} pct={totalDiferencaPercentual} />
            </div>
        );
    }

    return (
        <>
            <style>{`
                .invalid-row td {
                    background-color: #fff2f0 !important;
                }
                .invalid-row td:first-child {
                    border-left: 3px solid #f5222d !important;
                }
            `}</style>
            <div onClick={isSaving ? undefined : () => setIsCancelConfirmOpen(true)} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 2147483648 }}></div>
            <div
                ref={modalRef}
                style={{
                    position: 'fixed',
                    top: position.y,
                    left: position.x,
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    zIndex: 2147483649,
                    width: '95%',
                    maxWidth: '1500px',
                    display: 'flex',
                    flexDirection: 'column',
                    maxHeight: '90vh',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
                }}
            >
                <div
                    onMouseDown={handleMouseDown}
                    style={{
                        padding: '1.5rem',
                        borderBottom: '1px solid #e2e8f0',
                        flexShrink: 0,
                        cursor: 'move',
                        backgroundColor: '#f8fafc',
                        borderTopLeftRadius: '8px',
                        borderTopRightRadius: '8px'
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Informar Pedidos Manualmente</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <button
                                onClick={handleAIAssist}
                                disabled={isSaving || isAILoading}
                                title="Usar assistente de IA para preencher os pedidos"
                                style={{
                                    background: '#fff', border: '2px solid #facc15', padding: '8px 16px', borderRadius: '8px',
                                    cursor: (isSaving || isAILoading) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center',
                                    gap: '8px', color: '#0f172a', fontWeight: 600, fontSize: '0.9rem',
                                    transition: 'all 0.2s ease', opacity: (isSaving || isAILoading) ? 0.6 : 1,
                                }}
                                onMouseEnter={(e) => { if (!isSaving && !isAILoading) e.currentTarget.style.background = '#fffbea'; }}
                                onMouseLeave={(e) => { if (!isSaving && !isAILoading) e.currentTarget.style.background = '#fff'; }}
                            >
                                {isAILoading ? <FaSpinner className="animate-spin" /> : <Sparkles size={18} color="#f59e0b" />}
                                <span>{isAILoading ? "Aguarde..." : "Preencher com IA"}</span>
                            </button>
                            <button onClick={isSaving || isAILoading ? undefined : () => setIsCancelConfirmOpen(true)} disabled={isSaving || isAILoading} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: (isSaving || isAILoading) ? 'not-allowed' : 'pointer' }}>&times;</button>
                        </div>
                    </div>
                </div>

                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', overflow: 'hidden', flexGrow: 1 }}>
                    {isLoadingContent ? (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '3rem', color: '#6c757d', minHeight: '200px' }}>
                            <FaSpinner className="animate-spin" size={24} color="#1b4c89" />
                            <span style={{marginLeft: '10px', fontSize: '1.1em'}}>Carregando...</span>
                        </div>
                    ) : (
                        <>
                            <div style={{ overflowY: 'auto', flexGrow: 1 }}>
                                {validationError && (
                                    <div style={{
                                        background: '#fff5f5',
                                        color: '#c53030',
                                        border: '1px solid #fc8181',
                                        padding: '12px',
                                        borderRadius: '8px',
                                        marginBottom: '1rem',
                                        textAlign: 'center',
                                        fontWeight: 500
                                    }}>
                                        {validationError}
                                    </div>
                                )}
                                <Table
                                    dataSource={itensManuais}
                                    columns={tableColumns}
                                    rowKey="item_xml"
                                    pagination={false}
                                    size="small"
                                    sticky
                                    rowClassName={(record) => invalidRowIds.includes(record.item_xml) ? 'invalid-row' : ''}
                                    expandable={{
                                        expandedRowRender: (record) => expandedRowRender(record),
                                        rowExpandable: (record) => record.moeda === 2,
                                    }}
                                />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginTop: '1rem', flexShrink: 0 }}>
                                <div style={{flex: 1}}>
                                    <TotalBar />
                                </div>
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <button onClick={() => setIsCancelConfirmOpen(true)} disabled={isSaving} style={{ padding: '10px 20px', borderRadius: '5px', border: '1px solid #ccc', background: '#f1f1f1', cursor: isSaving ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>Cancelar</button>
                                    <button 
                                        onClick={handleSave} 
                                        disabled={isSaving}
                                        style={{ 
                                            padding: '10px 20px', 
                                            borderRadius: '5px', 
                                            border: 'none', 
                                            background: isSaving ? '#6c757d' : '#28a745', 
                                            color: 'white', 
                                            cursor: isSaving ? 'not-allowed' : 'pointer', 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            gap: '8px', 
                                            fontWeight: 'bold'
                                        }}
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