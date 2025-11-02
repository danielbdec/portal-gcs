"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { FaSearch, FaSpinner } from "react-icons/fa";

// --- INTERFACES ESPECÍFICAS PARA ESTE MODAL ---

interface ItemNota {
    item_xml: number;
    descricao_xml: string;
}

interface TesItem {
    id: number;
    nItem: number;
    tes_codigo: string;
}

interface TesData {
    itens: TesItem[];
}

interface TesBuscaResult {
    codigo: string;
    descricao: string;
}

// --- SUB-COMPONENTE: MODAL DE BUSCA DE TES ---

const TesSearchModal = ({ isOpen, onClose, onSelect, onSearch, searchResults, isLoading, error }: {
    isOpen: boolean,
    onClose: () => void,
    onSelect: (tes: TesBuscaResult) => void,
    onSearch: (term: string) => void,
    searchResults: TesBuscaResult[],
    isLoading: boolean,
    error: string | null
}) => {
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (!isOpen) {
            setSearchTerm('');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <>
            <div onClick={onClose} className="search-modal-backdrop" style={{ zIndex: 2147483650 }}></div>
            <div 
                className="search-modal-content"
                style={{
                    position: 'fixed',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 2147483651,
                    width: '90%',
                    maxWidth: '500px'
                }}
            >
                <div className="search-modal-header" style={{cursor: 'default'}}>
                    <h4 className="search-modal-title">Buscar TES</h4>
                    <button onClick={onClose} className="modal-close-btn">&times;</button>
                </div>
                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') onSearch(searchTerm); }}
                            placeholder="Digite o código ou descrição da TES"
                            className="search-modal-input"
                            autoFocus
                        />
                        <button onClick={() => onSearch(searchTerm)} disabled={isLoading} className="btn btn-primary" style={{padding: '10px 15px'}}>
                            {isLoading ? <FaSpinner className="animate-spin" /> : <FaSearch />}
                        </button>
                    </div>
                    {error && <div className="search-modal-error">{error}</div>}
                    <div className="search-modal-results-container">
                        {isLoading ? (
                            <div className="tab-spinner-container" style={{padding: '3rem', minHeight: '100px'}}>
                                <div className="modal-tab-spinner"></div>
                                <div className="modal-tab-spinner-text">Buscando...</div>
                            </div>
                        ) : searchResults.length > 0 ? (
                            <div className="search-modal-results">
                                {searchResults.map((tes, index) => (
                                    <div
                                        key={tes.codigo}
                                        onClick={() => onSelect(tes)}
                                        className="search-modal-result-item"
                                    >
                                        <strong>{tes.codigo}</strong> - <span>{tes.descricao}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            !isLoading && <div className="search-modal-no-results">Nenhum resultado para exibir.</div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};


// --- COMPONENTE PRINCIPAL: MODAL DE EDIÇÃO MANUAL DE TES ---

const ManualTesModal = ({
    isOpen,
    onClose,
    onSave,
    items,
    tesData,
    isSaving,
}: {
    isOpen: boolean,
    onClose: () => void,
    onSave: (updates: { id: number; tes: string }[]) => Promise<void>,
    items: ItemNota[],
    tesData: TesData | null,
    isSaving: boolean,
}) => {
    const [tesUpdates, setTesUpdates] = useState<Record<number, string>>({});
    const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
    const [activeItem, setActiveItem] = useState<TesItem | null>(null);
    const [searchResults, setSearchResults] = useState<TesBuscaResult[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);
    const [validationError, setValidationError] = useState<string | null>(null);

    const modalRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState<{ x: number; y: number } | null>(null); // Posição inicial nula
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);

    useEffect(() => {
        if (isOpen && tesData) {
            setValidationError(null);
            const initialTes = tesData.itens.reduce((acc, item) => {
                if(item.id) {
                    acc[item.id] = item.tes_codigo;
                }
                return acc;
            }, {} as Record<number, string>);
            setTesUpdates(initialTes);
            setPosition(null); // Reseta a posição para centralizar
        }
    }, [isOpen, tesData]);

    const handleOpenSearch = (item: TesItem) => {
        setActiveItem(item);
        setSearchResults([]);
        setSearchError(null);
        setIsSearchModalOpen(true);
    };

    const handleSearchTes = async (term: string) => {
        if (term.length < 2) {
            setSearchError("Digite pelo menos 2 caracteres.");
            setSearchResults([]);
            return;
        }
        setSearchLoading(true);
        setSearchError(null);
        try {
            const response = await fetch('/api/nfe/nfe-busca-tes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tesCode: term }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Erro na busca');

            const results = Array.isArray(data) ? data : [];
            setSearchResults(results.map((r: any) => ({ codigo: r.F4_CODIGO, descricao: r.F4_TEXTO })));

            if (results.length === 0) {
                setSearchError("Nenhuma TES encontrada com este termo.");
            }
        } catch (err: any) {
            setSearchError(err.message);
        } finally {
            setSearchLoading(false);
        }
    };

    const handleSelectTes = (tes: TesBuscaResult) => {
        if (activeItem) {
            setValidationError(null);
            setTesUpdates(prev => ({ ...prev, [activeItem.id]: tes.codigo }));
        }
        setIsSearchModalOpen(false);
    };
    
    const handleSave = async () => {
        if (!tesData) return;

        const allItemsFilled = tesData.itens.every(item => {
            return tesUpdates[item.id] && tesUpdates[item.id].trim() !== '';
        });

        if (!allItemsFilled) {
            setValidationError("Todos os itens devem ter uma TES preenchida para salvar.");
            return;
        }
        
        setValidationError(null);

        const originalTesState = tesData.itens.reduce((acc, item) => {
            if(item.id) acc[item.id] = item.tes_codigo;
            return acc;
        }, {} as Record<number, string>);

        const updates = Object.entries(tesUpdates)
            .filter(([id, tes]) => tes !== originalTesState[Number(id)])
            .map(([id, tes]) => ({
                id: Number(id),
                tes: tes
            }));

        if (updates.length > 0) {
            try {
                await onSave(updates);
                // Notificação de sucesso é responsabilidade do pai
            } catch (error: any) {
                // Notificação de erro é responsabilidade do pai
                console.error("Erro ao salvar TES:", error);
            }
        } else {
            onClose(); // Nenhuma alteração, apenas fecha o modal
        }
    };

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

    if (!isOpen) return null;

    // Estilo dinâmico: usa a posição calculada SE o usuário arrastou,
    // senão, deixa o CSS (com transform) cuidar da centralização.
    const modalStyle: React.CSSProperties = position
        ? { top: position.y, left: position.x, transform: 'none' } // Posição pós-arraste
        : { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }; // Posição inicial

    return (
        <>
            {/* O BLOCO DE ESTILO É INJETADO AQUI */}
            <style>{`
                /* --- === Base (copiado de ModalDetalhes/ManualPedido) === --- */
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
                    width: 90%;
                    min-height: 400px;
                    max-height: 90vh;
                    display: flex;
                    flex-direction: column;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                    z-index: 2147483649;
                    transition: background 0.3s ease, border 0.3s ease, box-shadow 0.3s ease;
                }
                /* --- Classe específica para este modal --- */
                .modal-tes {
                    max-width: 900px; 
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
                }
                .modal-footer-actions {
                    display: flex;
                    justify-content: flex-end;
                    align-items: center;
                    gap: 1rem;
                    margin-top: 1rem;
                    flex-shrink: 0;
                }
                
                /* --- Spinners --- */
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

                /* --- TesSearchModal --- */
                .search-modal-backdrop {
                    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
                    background-color: rgba(0,0,0,0.5); z-index: 2147483650;
                }
                .search-modal-content {
                    position: fixed; border-radius: 8px;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.2); z-index: 2147483651;
                    width: 90%; max-width: 500px;
                }
                body.light .search-modal-content { background-color: white; }
                body.dark .search-modal-content { background: var(--gcs-dark-bg-heavy); border: 1px solid var(--gcs-dark-border); }
                
                .search-modal-header {
                    padding: 1.5rem; border-bottom: 1px solid;
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
                
                /* Estilo específico para o strong da TesSearchModal */
                body.light .search-modal-result-item strong { color: #1b4c89; }
                body.dark .search-modal-result-item strong { color: var(--gcs-blue-sky); }

                .search-modal-no-results { padding: 20px; text-align: center; }
                body.light .search-modal-no-results { color: #6c757d; }
                body.dark .search-modal-no-results { color: var(--gcs-dark-text-tertiary); }

                /* --- === Estilos Específicos deste Modal === --- */

                /* Tabela */
                .validation-error-box {
                    background: #fff5f5; color: #c53030; border: 1px solid #fc8181;
                    padding: 12px; border-radius: 8px; margin-bottom: 1rem;
                    text-align: center; font-weight: 500;
                }
                body.dark .validation-error-box {
                    background: rgba(225, 29, 46, 0.15); color: #F87171;
                    border-color: rgba(225, 29, 46, 0.3);
                }

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
                    background-color: var(--gcs-gray-light);
                    color: var(--gcs-blue-light);
                    border-color: #dee2e6;
                }
                body.light .modal-table td {
                    border-color: #ddd;
                    color: var(--gcs-dark-text);
                }
                body.light .modal-table tbody tr:nth-of-type(even) { background-color: #f9f9f9; }
                body.light .modal-table tbody tr:hover { background-color: #f1f1f1; }

                /* Tabela Dark */
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
                body.dark .modal-table tbody tr:nth-of-type(even) { background-color: rgba(25, 39, 53, 0.25); }
                body.dark .modal-table tbody tr:hover { background-color: rgba(25, 39, 53, 0.4); }

                /* Componentes da Tabela */
                .tes-code-display {
                    font-weight: bold;
                    flex-grow: 1;
                    text-align: center;
                    min-height: 20px;
                }
                body.light .tes-code-display { color: var(--gcs-dark-text); }
                body.dark .tes-code-display { color: var(--gcs-dark-text-primary); }

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

            `}</style>
            
            <div onClick={isSaving ? undefined : onClose} className="modal-detalhes-backdrop"></div>
            <div
                ref={modalRef}
                className="modal-detalhes-glass modal-tes"
                style={{
                    position: 'fixed',
                    ...(position ? { top: position.y, left: position.x, transform: 'none' } : { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' })
                }}
            >
                <div 
                    onMouseDown={handleMouseDown}
                    className="modal-detalhes-header"
                >
                    <span className="modal-detalhes-title">Informar TES Manualmente</span>
                    <button onClick={isSaving ? undefined : onClose} disabled={isSaving} className="modal-close-btn">&times;</button>
                </div>
                
                <div className="modal-content-wrapper">
                    {validationError && (
                        <div className="validation-error-box">
                            {validationError}
                        </div>
                    )}
                    <div className="modal-content-scrollable">
                        <table className="modal-table">
                            <thead>
                                <tr>
                                    <th style={{width: '80px', textAlign: 'center'}}>Item</th>
                                    <th>Descrição XML</th>
                                    <th style={{width: '150px', textAlign: 'center'}}>TES</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item, index) => {
                                    const tesInfo = tesData?.itens.find(t => t.nItem === item.item_xml);
                                    if (!tesInfo || !tesInfo.id) return null;
                                    return (
                                        <tr key={index}>
                                            <td style={{textAlign: 'center', fontWeight: 'bold' }}>{item.item_xml}</td>
                                            <td>{item.descricao_xml}</td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                                    <span className="tes-code-display">{tesUpdates[tesInfo.id] || ''}</span>
                                                    <button
                                                      onClick={() => handleOpenSearch(tesInfo)}
                                                      title="Buscar TES"
                                                      disabled={isSaving}
                                                      className="btn-icon-search"
                                                    >
                                                        <FaSearch size={12} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <div className="modal-footer-actions">
                        <button onClick={onClose} disabled={isSaving} className="btn btn-secondary">Cancelar</button>
                        <button onClick={handleSave} disabled={isSaving} className="btn btn-green" style={{minWidth: '160px'}}>
                            {isSaving ? <><FaSpinner className="animate-spin" /> Salvando...</> : 'Salvar Alterações'}
                        </button>
                    </div>
                </div>
            </div>
            <TesSearchModal
                isOpen={isSearchModalOpen}
                onClose={() => setIsSearchModalOpen(false)}
                onSelect={handleSelectTes}
                onSearch={handleSearchTes}
                searchResults={searchResults}
                isLoading={searchLoading}
                error={searchError}
            />
        </>
    );
};

export default ManualTesModal;