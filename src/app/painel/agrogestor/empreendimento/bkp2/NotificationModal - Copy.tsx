"use client";

import { CheckCircle, XCircle } from 'lucide-react';
import React from 'react';

interface NotificationModalProps {
    visible: boolean;
    type: 'success' | 'error';
    message: string;
    onClose: () => void;
}

const NotificationModal: React.FC<NotificationModalProps> = ({ visible, type, message, onClose }) => {
    if (!visible) {
        return null;
    }

    const isSuccess = type === 'success';

    return (
        <>
            {/* Fundo escurecido */}
            <div 
                style={{ 
                    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', 
                    backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 2000 
                }}
                onClick={onClose}
            />
            {/* Janela do Modal */}
            <div style={{
                position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                zIndex: 2001, width: '90%', maxWidth: '450px',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: '2rem', textAlign: 'center'
            }}>
                {isSuccess ? (
                    <CheckCircle size={60} color="var(--gcs-green)" style={{ marginBottom: '1rem' }} />
                ) : (
                    <XCircle size={60} color="var(--gcs-red)" style={{ marginBottom: '1rem' }} />
                )}

                <h3 style={{
                    margin: '0.5rem 0',
                    color: isSuccess ? 'var(--gcs-blue)' : 'var(--gcs-red)',
                    fontSize: '1.5rem'
                }}>
                    {isSuccess ? 'Sucesso!' : 'Ocorreu um Erro'}
                </h3>

                <p style={{ color: 'var(--gcs-gray-dark)', fontSize: '1rem', lineHeight: 1.6, margin: '0.5rem 0 1.5rem 0' }}>
                    {message}
                </p>

                <button 
                    onClick={onClose} 
                    className="btn" 
                    style={{ 
                        backgroundColor: isSuccess ? 'var(--gcs-green)' : 'var(--gcs-blue)', 
                        color: 'white', 
                        padding: '10px 40px' 
                    }}
                >
                    OK
                </button>
            </div>
        </>
    );
};

export default NotificationModal;