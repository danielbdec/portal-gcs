"use client";

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, XCircle } from 'lucide-react';

interface NotificationModalProps {
    visible: boolean;
    type: 'success' | 'error';
    message: string;
    onClose: () => void;
}

const NotificationModal: React.FC<NotificationModalProps> = ({ visible, type, message, onClose }) => {
    const [isBrowser, setIsBrowser] = useState(false);

    useEffect(() => {
        setIsBrowser(true);
    }, []);

    if (!visible || !isBrowser) {
        return null;
    }

    const isSuccess = type === 'success';

    const modalContent = (
        <>
            <style>{`
                :root {
                    --gcs-blue: #00314A;
                    --gcs-green: #5FB246;
                    --gcs-red: #d9534f;
                    --gcs-gray-dark: #6c757d;
                    --gcs-border-color: #dee2e6;
                }

                .notification-backdrop {
                    position: fixed;
                    top: 0; left: 0;
                    width: 100vw; height: 100vh;
                    background-color: rgba(0,0,0,0.6);
                    z-index: 99998;
                }

                .notification-window {
                    position: fixed; 
                    top: 50%; left: 50%; 
                    transform: translate(-50%, -50%);
                    border-radius: 12px; 
                    box-shadow: 0 8px 32px rgba(0,0,0,0.3);
                    z-index: 99999;
                    width: 90%; 
                    max-width: 450px; /* CORRIGIDO: de maxWidth para max-width */
                    display: flex; 
                    flex-direction: column; 
                    align-items: center;
                    padding: 2rem 1.5rem; /* Dimensão original exata */
                    text-align: center;
                    transition: all 0.3s ease;
                }

                /* --- TEMA CLARO (Padrão) --- */
                body.light .notification-window {
                    background-color: white;
                    border: 1px solid transparent;
                }
                body.light .notification-title {
                    color: var(--gcs-blue);
                }
                body.light .notification-title.error {
                    color: var(--gcs-red);
                }
                body.light .notification-message {
                    color: var(--gcs-gray-dark);
                }

                /* --- TEMA ESCURO --- */
                body.dark .notification-window {
                    background-color: rgba(25, 39, 53, 0.95);
                    border: 1px solid rgba(125, 173, 222, 0.2);
                    backdrop-filter: blur(10px);
                }
                body.dark .notification-title {
                    color: #F1F5F9;
                }
                body.dark .notification-title.error {
                    color: #F87171;
                }
                body.dark .notification-message {
                    color: #CBD5E1;
                }

                /* --- ELEMENTOS COMUNS --- */
                .notification-icon {
                    margin-bottom: 1rem;
                }
                .notification-title {
                    margin: 0.5rem 0;
                    font-size: 1.75rem;
                    font-weight: bold;
                }
                .notification-message {
                    font-size: 1rem;
                    line-height: 1.6;
                    margin: 0.5rem 0 2rem 0;
                }
                .notification-btn {
                    padding: 12px 50px;
                    border: none;
                    border-radius: 8px;
                    font-weight: bold;
                    font-size: 1rem;
                    cursor: pointer;
                    transition: transform 0.2s, filter 0.2s;
                    color: white;
                }
                .notification-btn:hover {
                    transform: translateY(-2px);
                    filter: brightness(1.1);
                }

                /* Cores dos Botões e Ícones */
                .btn-success { background-color: var(--gcs-green); }
                .btn-error { background-color: var(--gcs-blue); }
                
                .icon-success { color: var(--gcs-green); }
                .icon-error { color: var(--gcs-red); }

                /* Ajuste ícone erro no escuro para contraste */
                body.dark .icon-error { color: #F87171; }
            `}</style>

            {/* Backdrop */}
            <div className="notification-backdrop" onClick={onClose} />

            {/* Janela */}
            <div className="notification-window">
                {isSuccess ? (
                    <CheckCircle size={60} className="notification-icon icon-success" />
                ) : (
                    <XCircle size={60} className="notification-icon icon-error" />
                )}

                <h3 className={`notification-title ${!isSuccess ? 'error' : ''}`}>
                    {isSuccess ? 'Sucesso!' : 'Ocorreu um Erro'}
                </h3>

                <p className="notification-message">
                    {message}
                </p>

                <button 
                    onClick={onClose} 
                    className={`notification-btn ${isSuccess ? 'btn-success' : 'btn-error'}`}
                >
                    OK
                </button>
            </div>
        </>
    );

    return createPortal(modalContent, document.body);
};

export default NotificationModal;