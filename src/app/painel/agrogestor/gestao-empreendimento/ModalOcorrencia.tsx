"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { X, Save, Ban, FileText, Loader2 } from "lucide-react";

interface OcorrenciaData {
    id?: number | string;
    data_ocorrencia: string;
    descricao: string;
    status?: string;
}

interface ModalOcorrenciaProps {
    visible: boolean;
    onClose: () => void;
    onSave: (data: OcorrenciaData) => void;
    titulo?: string;
    isSaving?: boolean;
    initialData?: OcorrenciaData | null;
}

const ModalOcorrencia: React.FC<ModalOcorrenciaProps> = ({ 
    visible, 
    onClose, 
    onSave, 
    titulo = "Nova Ocorrência", 
    isSaving = false,
    initialData = null
}) => {
    const [dataOcorrencia, setDataOcorrencia] = useState("");
    const [descricao, setDescricao] = useState("");
    const [status, setStatus] = useState("A"); 
    
    // --- Estados para Drag & Drop ---
    const modalRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const dragOffsetRef = useRef({ x: 0, y: 0 });

    // Centraliza o modal ao abrir e carrega dados
    useEffect(() => {
        if (visible && modalRef.current) {
            const { clientWidth, clientHeight } = modalRef.current;
            setPosition({ 
                x: window.innerWidth / 2 - clientWidth / 2, 
                y: window.innerHeight / 2 - clientHeight / 2 
            });
            
            // Lógica de carregamento de dados
            if (initialData) {
                const dataFormatada = initialData.data_ocorrencia ? initialData.data_ocorrencia.split('T')[0] : "";
                setDataOcorrencia(dataFormatada);
                setDescricao(initialData.descricao || "");
                setStatus(initialData.status || "A");
            } else {
                setDataOcorrencia(new Date().toISOString().split('T')[0]);
                setDescricao("");
                setStatus("A");
            }
        }
    }, [visible, initialData]);

    // --- Handlers de Drag & Drop ---
    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        // Permite arrastar apenas pelo cabeçalho, ignorando botão de fechar e inputs
        const target = e.target as HTMLElement;
        if (!modalRef.current || target.closest('button, input, select, textarea')) return;
        
        setIsDragging(true);
        const modalRect = modalRef.current.getBoundingClientRect();
        dragOffsetRef.current = { 
            x: e.clientX - modalRect.left, 
            y: e.clientY - modalRect.top 
        };
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isDragging || !modalRef.current) return;
        e.preventDefault();
        
        // Permite arrastar e atualiza posição
        setPosition({ 
            x: e.clientX - dragOffsetRef.current.x, 
            y: e.clientY - dragOffsetRef.current.y 
        });
    }, [isDragging]);

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

    // Fecha ao pressionar ESC
    useEffect(() => {
        if (!visible) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [visible, onClose]);

    if (!visible) return null;

    const handleSubmit = () => {
        if (!dataOcorrencia || !descricao.trim()) {
            alert("Por favor, preencha a data e a descrição.");
            return;
        }
        onSave({ 
            id: initialData?.id, 
            data_ocorrencia: dataOcorrencia, 
            descricao,
            status 
        });
    };

    return (
        <>
            {/* INJETANDO CSS LOCAL PARA CONTROLAR O SPINNER E TEXTO 
                O seletor body.dark garante a troca de cor no modo escuro.
            */}
            <style>{`
                .ocorrencia-saving-container {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    color: var(--gcs-blue); /* Cor padrão (Light Mode) */
                    font-weight: 500;
                }
                
                /* Override para Dark Mode */
                body.dark .ocorrencia-saving-container {
                    color: #F1F5F9 !important; /* Branco/Cinza claro no Dark Mode */
                }
            `}</style>

            <div 
                className="modal-overlay-backdrop"
                onClick={!isSaving ? onClose : undefined} 
                style={{ zIndex: 2300 }} 
            />
            
            <div 
                ref={modalRef}
                className="modal-overlay-glass"
                role="dialog"
                aria-modal="true"
                style={{
                    top: `${position.y}px`, 
                    left: `${position.x}px`, 
                    zIndex: 2301, 
                    width: '90%', 
                    maxWidth: '600px'
                }}
            >
                <div 
                    className="modal-gestao-header"
                    onMouseDown={handleMouseDown}
                >
                    <h3 className="modal-gestao-title">
                        <FileText size={20} style={{marginRight: '10px'}} /> {titulo}
                    </h3>
                    <button 
                        onClick={!isSaving ? onClose : undefined} 
                        disabled={isSaving}
                        className="modal-gestao-close-btn"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label className="modal-label">Data da Ocorrência *</label>
                            <input 
                                type="date" 
                                className="modal-input" 
                                value={dataOcorrencia} 
                                onChange={(e) => setDataOcorrencia(e.target.value)}
                                disabled={isSaving}
                                style={{ width: '100%' }} 
                            />
                        </div>
                        <div>
                            <label className="modal-label">Status</label>
                            <select
                                className="modal-input"
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                disabled={isSaving}
                                style={{ width: '100%' }}
                            >
                                <option value="A">Ativa</option>
                                <option value="I">Inativa</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="modal-label">Descrição do Fato *</label>
                        <textarea 
                            className="modal-input"
                            value={descricao}
                            onChange={(e) => setDescricao(e.target.value)}
                            rows={4}
                            maxLength={500}
                            placeholder="Descreva a ocorrência..." 
                            disabled={isSaving}
                            style={{ width: '100%', resize: 'vertical' }}
                        />
                        <div style={{ textAlign: 'right', fontSize: '12px', color: 'var(--gcs-gray-text)', marginTop: '4px' }}>
                            {500 - descricao.length} caracteres restantes
                        </div>
                    </div>
                </div>

                <div className="modal-gestao-footer">
                    {isSaving ? (
                        /* Aplica a classe CSS definida acima para controlar a cor */
                        <div className="ocorrencia-saving-container">
                            <Loader2 size={20} className="animate-spin" />
                            <span>Salvando...</span>
                        </div>
                    ) : (
                        <>
                            <button onClick={onClose} className="btn btn-outline-gray">
                                <Ban size={16} /> Cancelar
                            </button>
                            <button onClick={handleSubmit} className="btn btn-green">
                                <Save size={16} /> Salvar
                            </button>
                        </>
                    )}
                </div>
            </div>
        </>
    );
};

export default ModalOcorrencia;