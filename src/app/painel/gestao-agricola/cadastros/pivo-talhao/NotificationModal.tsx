"use client";

import React from 'react';
import { Modal } from 'antd';
import { CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react';

interface NotificationModalProps {
  visible: boolean;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  onClose: () => void;
}

const iconMap = {
  success: <CheckCircle size={48} className="text-green-500" />,
  error: <XCircle size={48} className="text-red-500" />,
  warning: <AlertTriangle size={48} className="text-yellow-500" />,
  info: <Info size={48} className="text-blue-500" />,
};

const titleMap = {
  success: 'Sucesso!',
  error: 'Erro!',
  warning: 'Atenção!',
  info: 'Informação',
};

const NotificationModal: React.FC<NotificationModalProps> = ({ visible, type, message, onClose }) => {
  return (
    <Modal
      open={visible}
      onCancel={onClose}
      onOk={onClose}
      footer={(_, { OkBtn }) => (
        <OkBtn />
      )}
      closable={false}
      width={400}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', padding: '2rem 1rem' }}>
        {iconMap[type] || iconMap['info']}
        <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>{titleMap[type] || 'Notificação'}</h2>
        <p style={{ fontSize: '1rem', color: '#555', textAlign: 'center', margin: 0 }}>
          {message}
        </p>
      </div>
    </Modal>
  );
};

export default NotificationModal;