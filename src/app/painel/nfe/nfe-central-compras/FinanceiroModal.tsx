"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { FaTimes, FaSpinner, FaBarcode, FaFileInvoice } from "react-icons/fa";
import { ChevronsUpDown, ArrowUp, ArrowDown } from 'lucide-react';

// --- INTERFACES ---
interface FinanceiroModalProps {
    isOpen: boolean;
    onClose: () => void;
    chave: string;
    consultaType: 'dda' | 'titulos' | null;
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

interface PagamentoFinanceiro {
    numero: string;
    nome: string;
    valor: number;
    cnpj: string;
    dt_pgto: string;
    registro: number;
}

interface SortConfig<T> {
    key: keyof T;
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
const FinanceiroModal = ({ isOpen, onClose, chave, consultaType }: FinanceiroModalProps) => {
    const [loadingBoletos, setLoadingBoletos] = useState(false);
    const [boletos, setBoletos] = useState<BoletoDDA[]>([]);
    const [errorBoletos, setErrorBoletos] = useState<string | null>(null);

    const [loadingPagamentos, setLoadingPagamentos] = useState(false);
    const [pagamentos, setPagamentos] = useState<PagamentoFinanceiro[]>([]);
    const [errorPagamentos, setErrorPagamentos] = useState<string | null>(null);

    const [sortConfigBoletos, setSortConfigBoletos] = useState<SortConfig<BoletoDDA>>({ key: 'vencimento', direction: 'asc' });
    const [sortConfigPagamentos, setSortConfigPagamentos] = useState<SortConfig<PagamentoFinanceiro>>({ key: 'dt_pgto', direction: 'asc' });

    const [visualizingRegistro, setVisualizingRegistro] = useState<string | null>(null);
    const [visualizingComprovante, setVisualizingComprovante] = useState<number | null>(null);

    const modalRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);

    const sortedBoletos = useMemo(() => {
        let sortableItems = [...boletos];
        if (sortConfigBoletos.key) {
            sortableItems.sort((a, b) => {
                const aValue = a[sortConfigBoletos.key];
                const bValue = b[sortConfigBoletos.key];

                if (aValue < bValue) return sortConfigBoletos.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfigBoletos.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sortableItems;
    }, [boletos, sortConfigBoletos]);

    const sortedPagamentos = useMemo(() => {
        let sortableItems = [...pagamentos];
        if (sortConfigPagamentos.key) {
            sortableItems.sort((a, b) => {
                const aValue = a[sortConfigPagamentos.key];
                const bValue = b[sortConfigPagamentos.key];

                if (aValue < bValue) return sortConfigPagamentos.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfigPagamentos.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sortableItems;
    }, [pagamentos, sortConfigPagamentos]);


    const requestSortBoletos = (key: keyof BoletoDDA) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfigBoletos.key === key && sortConfigBoletos.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfigBoletos({ key, direction });
    };

    const requestSortPagamentos = (key: keyof PagamentoFinanceiro) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfigPagamentos.key === key && sortConfigPagamentos.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfigPagamentos({ key, direction });
    };

    const SortIcon = <T,>({ columnKey, sortConfig }: { columnKey: keyof T, sortConfig: SortConfig<T> }) => {
        if (sortConfig.key !== columnKey) {
            return <ChevronsUpDown size={14} style={{ color: '#aab1b9' }} />;
        }
        return sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />;
    };


    const fetchBoletosData = useCallback(async () => {
        setLoadingBoletos(true);
        setErrorBoletos(null);
        setBoletos([]);
        try {
            const response = await fetch('/api/nfe/nfe-dda-consulta', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chave: chave }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Erro ao consultar os boletos.');
            const isEffectivelyEmpty = Array.isArray(data) && data.length === 1 && Object.keys(data[0]).length === 0;
            setBoletos(isEffectivelyEmpty ? [] : data);
        } catch (err: any) {
            setErrorBoletos(err.message || 'Ocorreu um problema de comunicação com o servidor.');
        } finally {
            setLoadingBoletos(false);
        }
    }, [chave]);

    const fetchPagamentosData = useCallback(async () => {
        setLoadingPagamentos(true);
        setErrorPagamentos(null);
        setPagamentos([]);
        try {
            const response = await fetch('/api/nfe/nfe-consulta-pagto-financeiro', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chave: chave }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Erro ao consultar os pagamentos.');
            if (Array.isArray(data)) {
                 setPagamentos(data.filter(p => p.numero));
            }
        } catch (err: any) {
            setErrorPagamentos(err.message || 'Não foi possível buscar os pagamentos no momento.');
        } finally {
            setLoadingPagamentos(false);
        }
    }, [chave]);

    useEffect(() => {
        if (isOpen && consultaType) {
            if (consultaType === 'dda') {
                setPagamentos([]);
                setErrorPagamentos(null);
                fetchBoletosData();
            } else if (consultaType === 'titulos') {
                setBoletos([]);
                setErrorBoletos(null);
                fetchPagamentosData();
            }
        }
    }, [isOpen, consultaType, fetchBoletosData, fetchPagamentosData]);

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
            if (boletoWindow) boletoWindow.focus();
            
            setTimeout(() => URL.revokeObjectURL(url), 100);

        } catch (error: any) {
            alert(`Não foi possível visualizar o boleto: ${error.message}`);
        } finally {
            setVisualizingRegistro(null);
        }
    };

    const handleVisualizarComprovante = async (registro: number) => {
        setVisualizingComprovante(registro);
        try {
            const response = await fetch('/api/nfe/nfe-consulta-comprovante', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ registro }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'Falha ao gerar o comprovante.');
            }

            const fileBlob = await response.blob();
            const url = URL.createObjectURL(fileBlob);

            const comprovanteWindow = window.open(url, '_blank');
            if (comprovanteWindow) {
                comprovanteWindow.focus();
            }
            
            setTimeout(() => URL.revokeObjectURL(url), 100);

        } catch (error: any) {
            alert(`Não foi possível visualizar o comprovante: ${error.message}`);
        } finally {
            setVisualizingComprovante(null);
        }
    };
    
    // Funções de arrastar e soltar
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

    const modalTitle = consultaType === 'dda' ? "Consulta de Boletos (DDA)" : "Consulta de Títulos (Protheus)";

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
                    <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{modalTitle}</span>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', padding: 0 }}><FaTimes /></button>
                </div>

                <div style={{ flexGrow: 1, padding: '1.5rem', overflowY: 'auto' }}>
                    
                    {consultaType === 'dda' && (
                        <div>
                            {loadingBoletos ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '200px' }}>
                                    <FaSpinner className="animate-spin" size={32} color="#1b4c89" />
                                    <p style={{ marginTop: '1rem', color: '#1b4c89', fontWeight: 'bold' }}>Consultando boletos...</p>
                                </div>
                            ) : errorBoletos ? (
                                <div style={{ color: '#dc3545', padding: '1rem', background: '#f8d7da', borderRadius: '5px', textAlign: 'center' }}>{errorBoletos}</div>
                            ) : sortedBoletos.length === 0 ? (
                                <div style={{ textAlign: 'center', color: '#6c757d', paddingTop: '2rem' }}>Não foram encontrados boletos para esta raiz de CNPJ nos últimos 90 dias.</div>
                            ) : (
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                                        <thead style={{ backgroundColor: '#f1f5fb', color: '#1b4c89' }}>
                                            <tr>
                                                <th style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'left' }}>Fornecedor</th>
                                                <th style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'center' }}>Emissão</th>
                                                <th style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'center', cursor: 'pointer' }} onClick={() => requestSortBoletos('vencimento')}>
                                                    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'}}>
                                                        Vencimento <SortIcon columnKey="vencimento" sortConfig={sortConfigBoletos} />
                                                    </div>
                                                </th>
                                                <th style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'right', cursor: 'pointer' }} onClick={() => requestSortBoletos('Valor')}>
                                                    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px'}}>
                                                        Valor <SortIcon columnKey="Valor" sortConfig={sortConfigBoletos} />
                                                    </div>
                                                </th>
                                                <th style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', cursor: 'pointer' }} onClick={() => requestSortBoletos('Status')}>
                                                    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '4px'}}>
                                                        Status <SortIcon columnKey="Status" sortConfig={sortConfigBoletos} />
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
                                                                background: '#344054', color: 'white', border: 'none', borderRadius: '5px', padding: '8px 12px', cursor: 'pointer',
                                                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'background-color 0.2s', minWidth: '110px'
                                                            }}
                                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1d2939'}
                                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#344054'}
                                                        >
                                                            {visualizingRegistro === boleto.registro ? <FaSpinner className="animate-spin" size={14} /> : <FaBarcode size={14} />}
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
                    )}
                    
                    {consultaType === 'titulos' && (
                        <div>
                            {loadingPagamentos ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '200px' }}>
                                    <FaSpinner className="animate-spin" size={32} color="#1b4c89" />
                                    <p style={{ marginTop: '1rem', color: '#1b4c89', fontWeight: 'bold' }}>Consultando títulos...</p>
                                </div>
                            ) : errorPagamentos ? (
                                <div style={{ color: '#dc3545', padding: '1rem', background: '#f8d7da', borderRadius: '5px', textAlign: 'center' }}>{errorPagamentos}</div>
                            ) : sortedPagamentos.length === 0 ? (
                                <div style={{ textAlign: 'center', color: '#6c757d', paddingTop: '2rem' }}>Nenhum título de pagamento foi encontrado para esta nota.</div>
                            ) : (
                                <div style={{ overflowX: 'auto' }}>
                                   <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                                       <thead style={{ backgroundColor: '#f1f5fb', color: '#1b4c89' }}>
                                           <tr>
                                               <th style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'left' }}>Fornecedor</th>
                                               <th style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', cursor: 'pointer' }} onClick={() => requestSortPagamentos('numero')}>
                                                    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '4px'}}>
                                                        Título <SortIcon columnKey="numero" sortConfig={sortConfigPagamentos} />
                                                    </div>
                                                </th>
                                               <th style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'center', cursor: 'pointer' }} onClick={() => requestSortPagamentos('dt_pgto')}>
                                                    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'}}>
                                                        Data Pagamento <SortIcon columnKey="dt_pgto" sortConfig={sortConfigPagamentos} />
                                                    </div>
                                                </th>
                                               <th style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'right', cursor: 'pointer' }} onClick={() => requestSortPagamentos('valor')}>
                                                    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px'}}>
                                                        Valor <SortIcon columnKey="valor" sortConfig={sortConfigPagamentos} />
                                                    </div>
                                                </th>
                                               <th style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'center' }}>Ações</th>
                                           </tr>
                                       </thead>
                                       <tbody>
                                           {sortedPagamentos.map((pag, index) => (
                                               <tr key={`${pag.numero}-${pag.registro}-${index}`} style={{ backgroundColor: '#fff', borderBottom: '1px solid #eee' }}>
                                                   <td style={{ padding: '10px', border: '1px solid #dee2e6' }}>
                                                       <div>{pag.nome}</div>
                                                       <div style={{ fontSize: '12px', color: '#6c757d', fontFamily: 'monospace' }}>{pag.cnpj}</div>
                                                   </td>
                                                   <td style={{ padding: '10px', border: '1px solid #dee2e6' }}>{pag.numero}</td>
                                                   <td style={{ padding: '10px', border: '1px solid #dee2e6', textAlign: 'center' }}>{formatDate(pag.dt_pgto)}</td>
                                                   <td style={{ padding: '10px', border: '1px solid #dee2e6', textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold' }}>
                                                       {pag.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                   </td>
                                                   <td style={{ padding: '10px', border: '1px solid #dee2e6', textAlign: 'center' }}>
                                                       <button
                                                           onClick={() => handleVisualizarComprovante(pag.registro)}
                                                           disabled={visualizingComprovante === pag.registro}
                                                           title="Visualizar Comprovante"
                                                           style={{
                                                               background: '#344054', color: 'white', border: 'none', borderRadius: '5px', padding: '8px 12px', cursor: 'pointer',
                                                               display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'background-color 0.2s', minWidth: '130px'
                                                           }}
                                                           onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1d2939'}
                                                           onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#344054'}
                                                       >
                                                          {visualizingComprovante === pag.registro ? <FaSpinner className="animate-spin" size={14} /> : <FaFileInvoice size={14} />}
                                                          <span>{visualizingComprovante === pag.registro ? 'Aguarde' : 'Comprovante'}</span>
                                                       </button>
                                                   </td>
                                               </tr>
                                           ))}
                                       </tbody>
                                   </table>
                               </div>
                           )}
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

