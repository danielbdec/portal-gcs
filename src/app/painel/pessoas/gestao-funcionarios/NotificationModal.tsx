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
        setIsBrowser(true); // Garante que o código do portal só rode no cliente (navegador)
    }, []);

    if (!visible || !isBrowser) {
        return null;
    }

    const isSuccess = type === 'success';

    const modalContent = (
        <>
            {/* O BLOCO DE ESTILO É INJETADO AQUI */}
            <style>{`
                :root {
                    --gcs-blue: #00314A;
                    --gcs-green-dark: #28a745;
                    --gcs-brand-red: #E11D2E;
                    --gcs-gray-text: #6c757d;
                    --gcs-dark-bg-heavy: rgba(25, 39, 53, 0.85);
                    --gcs-dark-border: rgba(125, 173, 222, 0.2);
                    --gcs-dark-text-primary: #F1F5F9;
                    --gcs-dark-text-secondary: #CBD5E1;
                    --gcs-blue-sky: #7DD3FC; /* Adicionado para o dark mode error button */
                }

                .notification-modal-backdrop {
                    position: fixed;
                    top: 0; left: 0;
                    width: 100vw; height: 100vh;
                    background-color: rgba(0,0,0,0.6);
                    z-index: 2147483654;
                }
                
                .notification-modal-content {
                    position: fixed;
                    top: 50%; left: 50%;
                    transform: translate(-50%, -50%);
                    border-radius: 12px;
                    box-shadow: 0 8px 32px rgba(0,0,0,0.2);
                    z-index: 2147483655;
                    width: 90%;
                    max-width: 450px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    padding: 2rem 1.5rem;
                    text-align: center;
                    transition: background 0.3s ease, border 0.3s ease;
                }
                
                body.light .notification-modal-content {
                    background-color: white;
                    border: 1px solid #dee2e6;
                }
                body.dark .notification-modal-content {
                    background: var(--gcs-dark-bg-heavy);
                    backdrop-filter: blur(16px);
                    -webkit-backdrop-filter: blur(16px);
                    border: 1px solid var(--gcs-dark-border);
                }

                .notification-modal-icon {
                    margin-bottom: 1rem;
                }
                .notification-modal-icon-success {
                    color: var(--gcs-green-dark);
                }
                .notification-modal-icon-error {
                    color: var(--gcs-brand-red);
                }
                body.dark .notification-modal-icon-success {
                    color: #4ADE80; /* Verde mais claro no escuro */
                }
                body.dark .notification-modal-icon-error {
                    color: #F87171; /* Vermelho mais claro no escuro */
                }

                .notification-modal-title {
                    margin: 0.5rem 0;
                    font-size: 1.75rem;
                    font-weight: bold;
                    transition: color 0.3s ease;
                }
                .notification-modal-content.type-success .notification-modal-title {
                    color: var(--gcs-blue);
                }
                .notification-modal-content.type-error .notification-modal-title {
                    color: var(--gcs-brand-red);
                }
                body.dark .notification-modal-content.type-success .notification-modal-title {
                    color: var(--gcs-dark-text-primary);
                }
                body.dark .notification-modal-content.type-error .notification-modal-title {
                    color: #F87171; /* Vermelho mais claro no escuro */
                }

                .notification-modal-message {
                    font-size: 1rem;
                    line-height: 1.6;
                    margin: 0.5rem 0 2rem 0;
                    transition: color 0.3s ease;
                }
                body.light .notification-modal-message {
                    color: var(--gcs-gray-text);
                }
                body.dark .notification-modal-message {
                    color: var(--gcs-dark-text-secondary);
                }

                .notification-modal-button {
                    color: white;
                    padding: 12px 50px;
                    border: none;
                    border-radius: 8px;
                    font-weight: bold;
                    font-size: 1rem;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                
                .notification-modal-content.type-success .notification-modal-button {
                    background-color: var(--gcs-green-dark);
                }
                .notification-modal-content.type-success .notification-modal-button:hover {
                    background-color: #218838;
                }
                
                .notification-modal-content.type-error .notification-modal-button {
                    background-color: var(--gcs-blue);
                }
                .notification-modal-content.type-error .notification-modal-button:hover {
                    background-color: #002336;
                }
                
                body.dark .notification-modal-content.type-success .notification-modal-button {
                    background-color: var(--gcs-green-dark);
                }
                body.dark .notification-modal-content.type-success .notification-modal-button:hover {
                    background-color: #2f9e44;
                }
                
                body.dark .notification-modal-content.type-error .notification-modal-button {
                    background-color: var(--gcs-blue-sky);
                    color: var(--gcs-blue);
                }
                body.dark .notification-modal-content.type-error .notification-modal-button:hover {
                    background-color: #a7e4ff;
                }
            `}</style>
            
            {/* Fundo escurecido (Backdrop) */}
            <div 
                className="notification-modal-backdrop"
                onClick={onClose}
            />
            
            {/* Janela do Modal */}
            <div className={`notification-modal-content ${isSuccess ? 'type-success' : 'type-error'}`}>
                {isSuccess ? (
                    <CheckCircle size={60} className="notification-modal-icon notification-modal-icon-success" />
                ) : (
                    <XCircle size={60} className="notification-modal-icon notification-modal-icon-error" />
                )}

                <h3 className="notification-modal-title">
                    {isSuccess ? 'Sucesso!' : 'Ocorreu um Erro'}
                </h3>

                <p className="notification-modal-message">
                    {message}
                </p>

                <button 
                    onClick={onClose} 
                    className="notification-modal-button"
                >
                    OK
                </button>
            </div>
        </>
    );

    // Usa o Portal para renderizar o modal diretamente no body do documento
    return createPortal(modalContent, document.body);
};

export default NotificationModal;