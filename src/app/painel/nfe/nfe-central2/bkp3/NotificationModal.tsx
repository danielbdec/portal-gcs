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

    const GCS_GREEN = '#28a745';
    const GCS_RED = '#dc3545';
    const GCS_BLUE = '#00314A';
    const GCS_GRAY_DARK = '#6c757d';

    const modalContent = (
        <>
            {/* Fundo escurecido (Backdrop) */}
            <div 
                style={{ 
                    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', 
                    backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 2147483654 
                }}
                onClick={onClose}
            />
            
            {/* Janela do Modal */}
            <div style={{
                position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                zIndex: 2147483655,
                width: '90%', maxWidth: '450px',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: '2rem 1.5rem', textAlign: 'center'
            }}>
                {isSuccess ? (
                    <CheckCircle size={60} color={GCS_GREEN} style={{ marginBottom: '1rem' }} />
                ) : (
                    <XCircle size={60} color={GCS_RED} style={{ marginBottom: '1rem' }} />
                )}

                <h3 style={{
                    margin: '0.5rem 0',
                    color: isSuccess ? GCS_BLUE : GCS_RED,
                    fontSize: '1.75rem',
                    fontWeight: 'bold'
                }}>
                    {isSuccess ? 'Sucesso!' : 'Ocorreu um Erro'}
                </h3>

                <p style={{ color: GCS_GRAY_DARK, fontSize: '1rem', lineHeight: 1.6, margin: '0.5rem 0 2rem 0' }}>
                    {message}
                </p>

                <button 
                    onClick={onClose} 
                    style={{ 
                        backgroundColor: isSuccess ? GCS_GREEN : GCS_BLUE, 
                        color: 'white', 
                        padding: '12px 50px',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: 'bold',
                        fontSize: '1rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                    }}
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