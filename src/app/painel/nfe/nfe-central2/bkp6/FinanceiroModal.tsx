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
    let statusClass = '';
    let statusText = status;

    switch (status.toUpperCase()) {
        case 'PAGO':
            statusClass = 'status-pago';
            statusText = 'Pago';
            break;
        case 'NAO ENCONTRADO PROTHEUS':
            statusClass = 'status-nao-encontrado';
            statusText = 'Não Encontrado';
            break;
        case 'EM ABERTO':
            statusClass = 'status-em-aberto';
            statusText = 'Em Aberto';
            break;
        default:
            statusClass = 'status-outro';
            break;
    }

    return (
        <div className="status-indicator">
            <span className={`status-dot ${statusClass}`}></span>
            <span className="status-text">{statusText}</span>
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
            return <ChevronsUpDown size={14} className="sort-icon-default" />;
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
                .financeiro-modal-backdrop {
                    position: fixed; top: 0; left: 0;
                    width: 100vw; height: 100vh;
                    background-color: rgba(0,0,0,0.6);
                    z-index: 2147483650;
                }
                .financeiro-modal-glass {
                    position: fixed;
                    border-radius: 12px;
                    width: 90%;
                    max-width: 1000px;
                    min-height: 400px;
                    max-height: 80vh;
                    display: flex;
                    flex-direction: column;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                    z-index: 2147483651;
                    transition: background 0.3s ease, border 0.3s ease, box-shadow 0.3s ease;
                }
                body.light .financeiro-modal-glass {
                    background: #fff;
                    border: 1px solid #dee2e6;
                }
                body.dark .financeiro-modal-glass {
                    background: var(--gcs-dark-bg-heavy);
                    backdrop-filter: blur(16px);
                    -webkit-backdrop-filter: blur(16px);
                    border: 1px solid var(--gcs-dark-border);
                }

                /* --- Modal Header --- */
                .financeiro-modal-header {
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
                body.light .financeiro-modal-header {
                    background-color: var(--gcs-gray-light);
                    border-bottom-color: #dee2e6;
                }
                body.dark .financeiro-modal-header {
                    background-color: rgba(25, 39, 53, 0.5);
                    border-bottom-color: var(--gcs-dark-border);
                }
                .financeiro-modal-title {
                    font-size: 1.2rem;
                    font-weight: bold;
                }
                body.light .financeiro-modal-title { color: var(--gcs-dark-text); }
                body.dark .financeiro-modal-title { color: var(--gcs-dark-text-primary); }
                
                .financeiro-modal-close-btn {
                    background: none; border: none; font-size: 1.5rem;
                    cursor: pointer; padding: 0; line-height: 1;
                }
                body.light .financeiro-modal-close-btn { color: var(--gcs-dark-text); }
                body.dark .financeiro-modal-close-btn { color: var(--gcs-dark-text-secondary); }
                body.dark .financeiro-modal-close-btn:hover { color: var(--gcs-dark-text-primary); }
                
                /* --- Modal Content --- */
                .financeiro-modal-content {
                    flex-grow: 1;
                    padding: 1.5rem;
                    overflow-y: auto;
                }
                
                /* --- Spinner --- */
                .modal-spinner-container {
                    display: flex; flex-direction: column; align-items: center;
                    justify-content: center; height: 100%; min-height: 200px;
                }
                .modal-spinner {
                    width: 32px; height: 32px;
                    animation: spin 1s linear infinite;
                }
                .modal-spinner-text {
                    margin-top: 1rem; font-weight: bold;
                }
                body.light .modal-spinner { color: var(--gcs-blue-light); }
                body.light .modal-spinner-text { color: var(--gcs-blue-light); }
                body.dark .modal-spinner { color: var(--gcs-blue-sky); }
                body.dark .modal-spinner-text { color: var(--gcs-blue-sky); }

                /* --- Error/Empty States --- */
                .modal-error-box {
                    padding: 1rem; border-radius: 5px; text-align: center;
                }
                body.light .modal-error-box {
                    color: #dc3545; background: #f8d7da;
                }
                body.dark .modal-error-box {
                    color: #F87171; background: rgba(225, 29, 46, 0.15);
                }
                
                .modal-empty-state {
                    text-align: center; padding-top: 2rem;
                }
                body.light .modal-empty-state { color: #6c757d; }
                body.dark .modal-empty-state { color: var(--gcs-dark-text-tertiary); }
                
                /* --- Tabela --- */
                .modal-table-container { overflow-x: auto; }
                .modal-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 14px;
                }
                .modal-table th, .modal-table td {
                    padding: 10px;
                    border: 1px solid;
                    transition: all 0.3s ease;
                }
                .modal-table th { font-size: 13px; padding: 12px 10px; }
                
                /* Tabela Light */
                body.light .modal-table { border-color: #dee2e6; }
                body.light .modal-table th {
                    background-color: var(--gcs-gray-light);
                    color: var(--gcs-blue-light);
                    border-color: #dee2e6;
                }
                body.light .modal-table td {
                    border-color: #dee2e6;
                    color: var(--gcs-dark-text);
                }
                body.light .modal-table tbody tr { background-color: #fff; }
                body.light .modal-table tbody tr:hover { background-color: #f9f9f9; }

                /* Tabela Dark */
                body.dark .modal-table { border-color: var(--gcs-dark-border-hover); }
                body.dark .modal-table th {
                    background-color: rgba(25, 39, 53, 0.5);
                    color: var(--gcs-blue-sky);
                    border-color: var(--gcs-dark-border-hover);
                }
                body.dark .modal-table td {
                    border-color: var(--gcs-dark-border);
                    color: var(--gcs-dark-text-secondary);
                }
                body.dark .modal-table tbody tr { background-color: rgba(25, 39, 53, 0.1); }
                body.dark .modal-table tbody tr:hover { background-color: rgba(25, 39, 53, 0.4); }

                /* --- Componentes da Tabela --- */
                .th-sortable {
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }
                .th-sortable.justify-start { justify-content: flex-start; }
                .th-sortable.justify-center { justify-content: center; }
                .th-sortable.justify-end { justify-content: flex-end; }
                
                body.dark .sort-icon-default { color: #aab1b9; }

                .currency-cell {
                    font-family: monospace;
                    font-weight: bold;
                }
                body.light .currency-cell { color: #333; }
                body.dark .currency-cell { color: var(--gcs-dark-text-primary); }
                
                .monospace-cell {
                    font-family: monospace;
                }
                body.light .monospace-cell { color: #6c757d; }
                body.dark .monospace-cell { color: var(--gcs-dark-text-tertiary); }

                /* --- Status Indicator --- */
                .status-indicator {
                    display: flex;
                    align-items: center;
                    justify-content: flex-start;
                    gap: 8px;
                }
                .status-dot {
                    height: 12px; width: 12px;
                    border-radius: 50%;
                    display: inline-block;
                    flex-shrink: 0;
                }
                body.light .status-text { color: var(--gcs-dark-text); }
                body.dark .status-text { color: var(--gcs-dark-text-secondary); }

                .status-dot.status-pago { background-color: #dc3545; }
                .status-dot.status-nao-encontrado { background-color: #ffc107; }
                .status-dot.status-em-aberto { background-color: #28a745; }
                .status-dot.status-outro { background-color: #6c757d; }

                /* --- Botões --- */
                .btn {
                    display: inline-flex; align-items: center; justify-content: center;
                    gap: 8px; padding: 10px 20px; border-radius: 5px;
                    border: none; font-weight: bold; cursor: pointer;
                    transition: all 0.2s ease;
                }
                .btn:disabled { cursor: not-allowed; opacity: 0.6; }
                
                .btn-secondary { border: 1px solid; font-weight: bold; }
                body.light .btn-secondary { background: #f1f1f1; color: var(--gcs-dark-text); border-color: #ccc; }
                body.light .btn-secondary:hover:not(:disabled) { background: #e0e0e0; }
                body.dark .btn-secondary { background: var(--gcs-dark-bg-transparent); color: var(--gcs-dark-text-secondary); border-color: var(--gcs-dark-border); }
                body.dark .btn-secondary:hover:not(:disabled) { background: rgba(25, 39, 53, 0.7); border-color: var(--gcs-dark-border-hover); }

                .btn-visualizar {
                    background: #344054; color: white; border: none;
                    border-radius: 5px; padding: 8px 12px; cursor: pointer;
                    display: inline-flex; align-items: center;
                    justify-content: center; gap: 6px;
                    transition: background-color 0.2s;
                }
                body.light .btn-visualizar:hover:not(:disabled) { background-color: #1d2939; }
                body.dark .btn-visualizar {
                    background: var(--gcs-dark-bg-transparent); color: var(--gcs-dark-text-secondary);
                    border: 1px solid var(--gcs-dark-border);
                }
                body.dark .btn-visualizar:hover:not(:disabled) {
                    background: rgba(25, 39, 53, 0.7);
                    border-color: var(--gcs-dark-border-hover);
                }

                /* --- Modal Footer --- */
                .financeiro-modal-footer {
                    padding: 1.5rem;
                    border-top: 1px solid;
                    display: flex;
                    justify-content: flex-end;
                }
                body.light .financeiro-modal-footer { border-top-color: #dee2e6; }
                body.dark .financeiro-modal-footer { border-top-color: var(--gcs-dark-border); }

            `}</style>
            
            <div onClick={onClose} className="financeiro-modal-backdrop"></div>
            <div
                ref={modalRef}
                className="financeiro-modal-glass"
                style={{
                    position: 'fixed',
                    top: position.y,
                    left: position.x
                }}
            >
                <div onMouseDown={handleMouseDown} className="financeiro-modal-header">
                    <span className="financeiro-modal-title">{modalTitle}</span>
                    <button onClick={onClose} className="financeiro-modal-close-btn"><FaTimes /></button>
                </div>

                <div className="financeiro-modal-content">
                    
                    {consultaType === 'dda' && (
                        <div>
                            {loadingBoletos ? (
                                <div className="modal-spinner-container">
                                    <FaSpinner className="animate-spin modal-spinner" />
                                    <p className="modal-spinner-text">Consultando boletos...</p>
                                </div>
                            ) : errorBoletos ? (
                                <div className="modal-error-box">{errorBoletos}</div>
                            ) : sortedBoletos.length === 0 ? (
                                <div className="modal-empty-state">Não foram encontrados boletos para esta raiz de CNPJ nos últimos 90 dias.</div>
                            ) : (
                                <div className="modal-table-container">
                                    <table className="modal-table">
                                        <thead>
                                            <tr>
                                                <th>Fornecedor</th>
                                                <th style={{ textAlign: 'center' }}>Emissão</th>
                                                <th style={{ textAlign: 'center' }}>
                                                    <div className="th-sortable justify-center" onClick={() => requestSortBoletos('vencimento')}>
                                                        Vencimento <SortIcon columnKey="vencimento" sortConfig={sortConfigBoletos} />
                                                    </div>
                                                </th>
                                                <th style={{ textAlign: 'right' }}>
                                                    <div className="th-sortable justify-end" onClick={() => requestSortBoletos('Valor')}>
                                                        Valor <SortIcon columnKey="Valor" sortConfig={sortConfigBoletos} />
                                                    </div>
                                                </th>
                                                <th>
                                                    <div className="th-sortable justify-start" onClick={() => requestSortBoletos('Status')}>
                                                        Status <SortIcon columnKey="Status" sortConfig={sortConfigBoletos} />
                                                    </div>
                                                </th>
                                                <th style={{ textAlign: 'center' }}>Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {sortedBoletos.map((boleto) => (
                                                <tr key={boleto.registro}>
                                                    <td>
                                                        <div>{boleto.nome}</div>
                                                        <div className="monospace-cell" style={{ fontSize: '12px' }}>{boleto.cnpj}</div>
                                                    </td>
                                                    <td style={{ textAlign: 'center' }}>{formatDate(boleto.emissao)}</td>
                                                    <td style={{ textAlign: 'center' }}>{formatDate(boleto.vencimento)}</td>
                                                    <td className="currency-cell" style={{ textAlign: 'right' }}>
                                                        {(boleto.Valor ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                    </td>
                                                    <td><StatusIndicator status={boleto.Status} /></td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <button
                                                            onClick={() => handleVisualizarBoleto(boleto.registro)}
                                                            title="Visualizar Boleto"
                                                            disabled={visualizingRegistro === boleto.registro}
                                                            className="btn-visualizar"
                                                            style={{ minWidth: '110px' }}
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
                                <div className="modal-spinner-container">
                                    <FaSpinner className="animate-spin modal-spinner" />
                                    <p className="modal-spinner-text">Consultando títulos...</p>
                                </div>
                            ) : errorPagamentos ? (
                                <div className="modal-error-box">{errorPagamentos}</div>
                            ) : sortedPagamentos.length === 0 ? (
                                <div className="modal-empty-state">Nenhum título de pagamento foi encontrado para esta nota.</div>
                            ) : (
                                <div className="modal-table-container">
                                   <table className="modal-table">
                                       <thead>
                                           <tr>
                                               <th>Fornecedor</th>
                                               <th>
                                                    <div className="th-sortable justify-start" onClick={() => requestSortPagamentos('numero')}>
                                                        Título <SortIcon columnKey="numero" sortConfig={sortConfigPagamentos} />
                                                    </div>
                                                </th>
                                               <th style={{ textAlign: 'center' }}>
                                                    <div className="th-sortable justify-center" onClick={() => requestSortPagamentos('dt_pgto')}>
                                                        Data Pagamento <SortIcon columnKey="dt_pgto" sortConfig={sortConfigPagamentos} />
                                                    </div>
                                                </th>
                                               <th style={{ textAlign: 'right' }}>
                                                    <div className="th-sortable justify-end" onClick={() => requestSortPagamentos('valor')}>
                                                        Valor <SortIcon columnKey="valor" sortConfig={sortConfigPagamentos} />
                                                    </div>
                                                </th>
                                               <th style={{ textAlign: 'center' }}>Ações</th>
                                           </tr>
                                       </thead>
                                       <tbody>
                                           {sortedPagamentos.map((pag, index) => (
                                               <tr key={`${pag.numero}-${pag.registro}-${index}`}>
                                                   <td>
                                                       <div>{pag.nome}</div>
                                                       <div className="monospace-cell" style={{ fontSize: '12px' }}>{pag.cnpj}</div>
                                                   </td>
                                                   <td>{pag.numero}</td>
                                                   <td style={{ textAlign: 'center' }}>{formatDate(pag.dt_pgto)}</td>
                                                   <td className="currency-cell" style={{ textAlign: 'right' }}>
                                                       {pag.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                   </td>
                                                   <td style={{ textAlign: 'center' }}>
                                                       <button
                                                           onClick={() => handleVisualizarComprovante(pag.registro)}
                                                           disabled={visualizingComprovante === pag.registro}
                                                           title="Visualizar Comprovante"
                                                           className="btn-visualizar"
                                                           style={{ minWidth: '130px' }}
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

                <div className="financeiro-modal-footer">
                     <button onClick={onClose} className="btn btn-secondary">Fechar</button>
                </div>
            </div>
        </>
    );
};

export default FinanceiroModal;