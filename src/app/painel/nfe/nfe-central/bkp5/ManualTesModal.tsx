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
            <div onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 2147483650 }}></div>
            <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', zIndex: 2147483651, width: '90%', maxWidth: '500px' }}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
                    <h4 style={{ margin: 0 }}>Buscar TES</h4>
                    <button onClick={onClose} style={{background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer'}}>&times;</button>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') onSearch(searchTerm); }}
                        placeholder="Digite o código ou descrição da TES"
                        style={{ flex: 1, padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}
                        autoFocus
                    />
                    <button onClick={() => onSearch(searchTerm)} disabled={isLoading} style={{ padding: '10px 15px', border: 'none', background: '#1b4c89', color: 'white', borderRadius: '5px', cursor: 'pointer' }}>
                        {isLoading ? <FaSpinner className="animate-spin" /> : <FaSearch />}
                    </button>
                </div>
                {error && <div style={{ color: '#dc3545', marginBottom: '1rem' }}>{error}</div>}
                <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #eee', borderRadius: '5px' }}>
                    {searchResults.length > 0 ? searchResults.map((tes, index) => (
                        <div
                            key={tes.codigo}
                            onClick={() => onSelect(tes)}
                            style={{ padding: '12px', cursor: 'pointer', borderBottom: index === searchResults.length -1 ? 'none' : '1px solid #eee', backgroundColor: '#fff', transition: 'background-color 0.2s' }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f8ff'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff'}
                        >
                            <strong style={{color: '#1b4c89'}}>{tes.codigo}</strong> - <span>{tes.descricao}</span>
                        </div>
                    )) : (
                        !isLoading && <div style={{padding: '20px', textAlign: 'center', color: '#6c757d'}}>Nenhum resultado para exibir.</div>
                    )}
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
    const [position, setPosition] = useState({ x: 0, y: 0 });
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
            const initialX = (window.innerWidth - modal.offsetWidth) / 2.2;
            const initialY = 60;
            setPosition({ x: initialX > 0 ? initialX : 20, y: initialY });
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <>
            <div onClick={isSaving ? undefined : onClose} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 2147483648 }}></div>
            <div 
                ref={modalRef}
                style={{ 
                    position: 'fixed', 
                    top: position.y,
                    left: position.x,
                    backgroundColor: 'white', 
                    borderRadius: '8px', 
                    zIndex: 2147483649, 
                    width: '90%', 
                    maxWidth: '900px', 
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
                        borderBottom: '1px solid #dee2e6',
                        flexShrink: 0,
                        cursor: 'move',
                        backgroundColor: '#f1f5fb',
                        borderTopLeftRadius: '8px',
                        borderTopRightRadius: '8px'
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                         <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Informar TES Manualmente</span>
                        <button onClick={isSaving ? undefined : onClose} disabled={isSaving} style={{background: 'none', border: 'none', fontSize: '1.5rem', cursor: isSaving ? 'not-allowed' : 'pointer'}}>&times;</button>
                    </div>
                </div>
                
                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', overflow: 'hidden', flexGrow: 1}}>
                    {validationError && (
                        <div style={{ color: '#dc3545', fontWeight: 'bold', padding: '8px', background: '#f8d7da', borderRadius: '4px', textAlign: 'center', border: '1px solid #f5c6cb' }}>
                            {validationError}
                        </div>
                    )}
                    <div style={{ overflowY: 'auto', flexGrow: 1 }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                            <thead style={{ backgroundColor: '#f1f5fb', color: '#1b4c89', position: 'sticky', top: 0, zIndex: 1 }}>
                                <tr>
                                    <th style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'center', width: '80px' }}>Item</th>
                                    <th style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'left' }}>Descrição XML</th>
                                    <th style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'center', width: '150px' }}>TES</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item, index) => {
                                    const tesInfo = tesData?.itens.find(t => t.nItem === item.item_xml);
                                    if (!tesInfo || !tesInfo.id) return null;
                                    return (
                                        <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                                            <td style={{ padding: '10px', border: '1px solid #dee2e6', textAlign: 'center', fontWeight: 'bold' }}>{item.item_xml}</td>
                                            <td style={{ padding: '10px', border: '1px solid #dee2e6' }}>{item.descricao_xml}</td>
                                            <td style={{ padding: '10px', border: '1px solid #dee2e6', textAlign: 'center' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                                    <span style={{fontWeight: 'bold', color: '#333', flexGrow: 1, textAlign: 'center', minHeight: '20px'}}>{tesUpdates[tesInfo.id] || ''}</span>
                                                    <button
                                                      onClick={() => handleOpenSearch(tesInfo)}
                                                      title="Buscar TES"
                                                      disabled={isSaving}
                                                      style={{ background: '#eaf2fa', border: '1px solid #a3b8d1', borderRadius: '50%', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: isSaving ? 'not-allowed' : 'pointer' }}
                                                    >
                                                        <FaSearch size={12} color="#1b4c89" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem', marginTop: '1rem', flexShrink: 0 }}>
                        <button onClick={onClose} disabled={isSaving} style={{ padding: '10px 20px', borderRadius: '5px', border: '1px solid #ccc', background: '#f1f1f1', cursor: isSaving ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>Cancelar</button>
                        <button onClick={handleSave} disabled={isSaving} style={{ padding: '10px 20px', borderRadius: '5px', border: 'none', background: '#28a745', color: 'white', cursor: isSaving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', minWidth: '160px' }}>
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