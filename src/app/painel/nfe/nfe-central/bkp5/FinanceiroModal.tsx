"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { FaTimes, FaSpinner, FaBarcode } from "react-icons/fa";
import { ChevronsUpDown, ArrowUp, ArrowDown } from 'lucide-react';

// --- INTERFACES ---
interface FinanceiroModalProps {
    isOpen: boolean;
    onClose: () => void;
    chave: string;
}

interface BoletoDDA {
    emissao: string;
    cnpj: string;
    nome: string;
    registro: string;
    Valor: number;
    vencimento: string;
    Status: string;
}

interface SortConfig {
    key: keyof BoletoDDA;
    direction: 'asc' | 'desc';
}

// --- SUB-COMPONENTES E FUNÇÕES AUXILIARES ---

const StatusIndicator = ({ status }: { status: string }) => {
    const statusConfig: { [key: string]: { color: string; text: string } } = {
        'PAGO': { color: '#dc3545', text: 'Pago' },
        'NAO ENCONTRADO PROTHEUS': { color: '#ffc107', text: 'Não Encontrado' },
        'EM ABERTO': { color: '#28a745', text: 'Em Aberto' }
    };

    const config = statusConfig[status.toUpperCase()] || { color: '#6c757d', text: status };

    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '8px' }}>
            <span style={{
                height: '12px', width: '12px', backgroundColor: config.color, borderRadius: '50%',
                display: 'inline-block', flexShrink: 0
            }}></span>
            <span>{config.text}</span>
        </div>
    );
};

const formatDate = (dateStr: string): string => {
    if (!dateStr || dateStr.length !== 8) return 'N/A';
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    return `${day}/${month}/${year}`;
};

// --- COMPONENTE PRINCIPAL ---
const FinanceiroModal = ({ isOpen, onClose, chave }: FinanceiroModalProps) => {
    const [loading, setLoading] = useState(false);
    const [boletos, setBoletos] = useState<BoletoDDA[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'vencimento', direction: 'asc' });
    const [visualizingRegistro, setVisualizingRegistro] = useState<string | null>(null);

    const modalRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);

    const sortedBoletos = useMemo(() => {
        let sortableItems = [...boletos];
        if (sortConfig.key) {
            sortableItems.sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];

                if (aValue < bValue) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [boletos, sortConfig]);

    const requestSort = (key: keyof BoletoDDA) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const SortIcon = ({ columnKey }: { columnKey: keyof BoletoDDA }) => {
        if (sortConfig.key !== columnKey) {
            return <ChevronsUpDown size={14} style={{ color: '#aab1b9' }} />;
        }
        if (sortConfig.direction === 'asc') {
            return <ArrowUp size={14} />;
        }
        return <ArrowDown size={14} />;
    };

    const fetchData = useCallback(async () => {
        if (!isOpen || !chave) return;
        
        setLoading(true);
        setError(null);
        setBoletos([]);

        try {
            const response = await fetch('/api/nfe/nfe-dda-consulta', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chave: chave }),
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Erro ao consultar os boletos.');
            }
            if (Array.isArray(data)) {
                const isEffectivelyEmpty = data.length === 1 && Object.keys(data[0]).length === 0;
                
                if (isEffectivelyEmpty) {
                    setBoletos([]);
                } else {
                    setBoletos(data);
                }
            }

        } catch (err: any) {
             if (err instanceof SyntaxError) {
                setError('A resposta do servidor não é válida. Contate o suporte.');
            } else {
                setError(err.message || 'Ocorreu um problema de comunicação com o servidor.');
            }
        } finally {
            setLoading(false);
        }
    }, [isOpen, chave]);

    useEffect(() => {
        if (isOpen) {
            fetchData();
        }
    }, [isOpen, fetchData]);

    const handleVisualizarBoleto = async (registro: string) => {
        setVisualizingRegistro(registro);
        try {
            const response = await fetch('/api/nfe/nfe-visualiza-boleto', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ registro: registro }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'Falha ao gerar o boleto.');
            }

            const html = await response.text();
            const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
            const url = URL.createObjectURL(blob);

            const boletoWindow = window.open(url, '_blank');
            if (boletoWindow) {
                boletoWindow.focus();
            }
            // Limpa a URL do objeto para liberar memória
            setTimeout(() => URL.revokeObjectURL(url), 100);

        } catch (error: any) {
            console.error("Erro ao visualizar boleto:", error);
            alert(`Não foi possível visualizar o boleto: ${error.message}`);
        } finally {
            setVisualizingRegistro(null);
        }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (modalRef.current) {
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'BUTTON' || target.closest('button')) {
                return;
            }
            setIsDragging(true);
            const modalRect = modalRef.current.getBoundingClientRect();
            setOffset({ x: e.clientX - modalRect.left, y: e.clientY - modalRect.top });
            e.preventDefault();
        }
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isDragging) return;
        setPosition({ x: e.clientX - offset.x, y: e.clientY - offset.y });
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
            const initialY = 100;
            setPosition({ x: initialX > 0 ? initialX : 20, y: initialY });
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <>
            <div onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 2147483650 }}></div>
            <div
                ref={modalRef}
                style={{
                    position: 'fixed', top: position.y, left: position.x, background: '#fff', borderRadius: 12, width: '90%', maxWidth: '1000px',
                    minHeight: '400px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 30px rgba(0,0,0,0.2)', zIndex: 2147483651
                }}
            >
                <div onMouseDown={handleMouseDown} style={{ padding: '1.5rem', borderBottom: '1px solid #dee2e6', cursor: 'move', backgroundColor: '#f1f5fb',
                        borderTopLeftRadius: '12px', borderTopRightRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} >
                    <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Consulta de Boletos (DDA)</span>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', padding: 0 }}><FaTimes /></button>
                </div>

                <div style={{ flexGrow: 1, padding: '1.5rem', overflowY: 'auto' }}>
                    {loading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                            <FaSpinner className="animate-spin" size={32} color="#1b4c89" />
                            <p style={{ marginTop: '1rem', color: '#1b4c89', fontWeight: 'bold' }}>Consultando boletos...</p>
                        </div>
                    ) : error ? (
                        <div style={{ color: '#dc3545', padding: '1rem', background: '#f8d7da', borderRadius: '5px', textAlign: 'center' }}>{error}</div>
                    ) : sortedBoletos.length === 0 ? (
                         <div style={{ textAlign: 'center', color: '#6c757d', paddingTop: '2rem' }}>Não foram encontrados boletos para esta raiz de CNPJ nos últimos 90 dias.</div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                                <thead style={{ backgroundColor: '#f1f5fb', color: '#1b4c89' }}>
                                    <tr>
                                        <th style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'left' }}>Fornecedor</th>
                                        <th style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'center' }}>Emissão</th>
                                        <th style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'center', cursor: 'pointer' }} onClick={() => requestSort('vencimento')}>
                                            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'}}>
                                                Vencimento <SortIcon columnKey="vencimento" />
                                            </div>
                                        </th>
                                        <th style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'right', cursor: 'pointer' }} onClick={() => requestSort('Valor')}>
                                            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px'}}>
                                                Valor <SortIcon columnKey="Valor" />
                                            </div>
                                        </th>
                                        <th style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', cursor: 'pointer' }} onClick={() => requestSort('Status')}>
                                            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '4px'}}>
                                                Status <SortIcon columnKey="Status" />
                                            </div>
                                        </th>
                                        <th style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'center' }}>Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedBoletos.map((boleto) => (
                                        <tr key={boleto.registro} style={{ backgroundColor: '#fff', borderBottom: '1px solid #eee' }}>
                                            <td style={{ padding: '10px', border: '1px solid #dee2e6' }}>
                                                <div>{boleto.nome}</div>
                                                <div style={{ fontSize: '12px', color: '#6c757d', fontFamily: 'monospace' }}>{boleto.cnpj}</div>
                                            </td>
                                            <td style={{ padding: '10px', border: '1px solid #dee2e6', textAlign: 'center' }}>{formatDate(boleto.emissao)}</td>
                                            <td style={{ padding: '10px', border: '1px solid #dee2e6', textAlign: 'center' }}>{formatDate(boleto.vencimento)}</td>
                                            <td style={{ padding: '10px', border: '1px solid #dee2e6', textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold' }}>
                                                {(boleto.Valor ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                            </td>
                                            <td style={{ padding: '10px', border: '1px solid #dee2e6' }}><StatusIndicator status={boleto.Status} /></td>
                                            <td style={{ padding: '10px', border: '1px solid #dee2e6', textAlign: 'center' }}>
                                                <button
                                                    onClick={() => handleVisualizarBoleto(boleto.registro)}
                                                    title="Visualizar Boleto"
                                                    disabled={visualizingRegistro === boleto.registro}
                                                    style={{
                                                        background: '#344054',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '5px',
                                                        padding: '8px 12px',
                                                        cursor: 'pointer',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '6px',
                                                        transition: 'background-color 0.2s',
                                                        minWidth: '110px'
                                                    }}
                                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1d2939'}
                                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#344054'}
                                                >
                                                    {visualizingRegistro === boleto.registro ? (
                                                        <FaSpinner className="animate-spin" size={14} />
                                                    ) : (
                                                        <FaBarcode size={14} />
                                                    )}
                                                    <span>{visualizingRegistro === boleto.registro ? 'Aguarde' : 'Visualizar'}</span>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div style={{ padding: '1.5rem', borderTop: '1px solid #dee2e6', display: 'flex', justifyContent: 'flex-end' }}>
                     <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: '5px', border: '1px solid #ccc', background: '#f1f1f1', cursor: 'pointer', fontWeight: 'bold' }}>Fechar</button>
                </div>
            </div>
        </>
    );
};

export default FinanceiroModal;