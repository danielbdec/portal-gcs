"use client";

import React, { useEffect, useState, useCallback, useRef } from 'react';
// ATUALIZAÇÃO: Importado 'Modal as AntModal' para o aviso de "Descartar"
import { Form, Input, Select, Button, Spin, InputNumber, Alert, Upload, message, Modal as AntModal } from 'antd';
import { AlertTriangle, Edit, Plus, Trash2, Paperclip, Check, Loader2, X as IconX, Ban } from 'lucide-react';

const { Option } = Select;

// --- ATUALIZAÇÃO: Opções de Cultura Definidas ---
const CULTURAS_OPTIONS = [
  { id: 1, nome: "ALGODAO" },
  { id: 2, nome: "SOJA" },
  { id: 3, nome: "MILHO" },
  { id: 4, nome: "FEIJAO" },
  { id: 5, nome: "MILHETO" },
  { id: 6, nome: "CAFE" },
];

// Interface do Pivo/Talhão (campos removidos)
interface PivoTalhao {
  id: number;
  key: string;
  nome: string;
  // safra: string; // REMOVIDO
  filial: string; 
  bloco: string | null;
  ha: number | null;
  // cultura: string | null; // REMOVIDO
  // id_cultura: number | null; // REMOVIDO
  // variedade: string | null; // REMOVIDO
  gid_telemetria: string | null; 
  kml: string | null; 
  status: string; // "Aberto" ou "Inativo"
  status_original: 'A' | 'I';
  dt_inclusao: string;
  dt_alteracao: string | null;
  [key: string]: any;
}

interface ModalPivoProps {
  visible: boolean;
  mode: 'add' | 'edit' | 'delete';
  initialData: Partial<PivoTalhao> | null;
  onClose: () => void;
  onSave: (data: any, mode: 'add' | 'edit' | 'delete') => Promise<void>;
  isSaving: boolean;
  // --- Adicionado para o KML ---
  onOpenKmlModal: () => void; // Prop para abrir o modal de upload KML
}

// =========================================================================
// --- FUNÇÕES DE NORMALIZAÇÃO E VALIDAÇÃO ---
// =========================================================================

// Normalizador: Converte o texto para maiúsculas
const normalizeUppercase = (value: string) => (value || '').toUpperCase();

/**
 * Validador customizado para o nome do PIVÔ ou TALHÃO.
 * Regras:
 * 1. Deve ter pelo menos 2 palavras.
 * 2. A segunda parte deve conter pelo menos 1 número.
 * 3. Se a primeira palavra for "PIVO", a segunda parte deve ter exatamente 3 números.
 */
const validateNomePivoTalhao = (_: any, value: string) => {
    if (!value) {
        return Promise.reject(new Error('Por favor, insira o nome.'));
    }

    const parts = value.split(' ');
    if (parts.length < 2) {
        return Promise.reject(new Error('O nome deve conter pelo menos 2 palavras (ex: PIVO 001).'));
    }

    const [tipo, ...codigoParts] = parts;
    const codigo = codigoParts.join(' '); // Caso o código tenha espaços (ex: TALHAO A 21)

    // 2. Verifica se a segunda parte contém números
    if (!/\d/.test(codigo)) {
        return Promise.reject(new Error('A segunda parte do nome deve conter pelo menos 1 número.'));
    }

    // 3. Regra específica para "PIVO"
    if (tipo.toUpperCase() === 'PIVO') {
        // Remove não-números e verifica o comprimento
        const numeros = codigo.replace(/\D/g, '');
        if (numeros.length !== 3) {
            return Promise.reject(new Error('Se for PIVO, o código deve ter exatamente 3 números (ex: 035).'));
        }
    }
    
    // Se for "TALHAO" ou outro, a regra de "conter número" já foi validada.
    return Promise.resolve();
};

/**
 * Parser para o InputNumber
 * Remove todos os caracteres que NÃO são dígitos ou a PRIMEIRO separador (vírgula).
 * CORREÇÃO: Tipagem do retorno alterada para 'any' ou 'number' para satisfazer o InputNumber<number>
 * mas mantendo a lógica de string para o parser funcionar corretamente.
 */
const numberParser = (value: string | undefined): number => {
    if (!value) return 0; // Retorna 0 ou outro valor padrão numérico se vazio, ou ajusta conforme necessidade
    
    // 1. Substitui ponto por vírgula (para consistência no Brasil)
    let valueWithComma = value.replace('.', ',');
    
    // 2. Remove todos os caracteres que NÃO são dígitos ou vírgula
    const onlyNumbersAndComma = valueWithComma.replace(/[^0-9,]/g, '');
    
    // 3. Garante que haja apenas UMA vírgula
    const parts = onlyNumbersAndComma.split(',');
    let finalString = onlyNumbersAndComma;
    
    if (parts.length > 2) {
        finalString = `${parts[0]},${parts.slice(1).join('')}`;
    }
    
    // Converte para formato numérico javascript (ponto como separador) para retornar
    return parseFloat(finalString.replace(',', '.')) || 0;
};

// Alternativa: Parser que retorna string (o que o AntD geralmente aceita na prop parser)
// mas precisamos fazer o cast no uso se o TS reclamar.
const stringParser = (value: string | undefined): string => {
    if (!value) return '';
    const valueWithComma = value.replace('.', ',');
    const onlyNumbersAndComma = valueWithComma.replace(/[^0-9,]/g, '');
    const parts = onlyNumbersAndComma.split(',');
    if (parts.length <= 1) return onlyNumbersAndComma;
    return `${parts[0]},${parts.slice(1).join('')}`;
};


// =========================================================================
// --- COMPONENTE DO MODAL ---
// =========================================================================

const ModalPivo: React.FC<ModalPivoProps> = ({ visible, mode, initialData, onClose, onSave, isSaving, onOpenKmlModal }) => {
  const [form] = Form.useForm();
  
  // --- Estado do KML (do exemplo) ---
  const [kmlFile, setKmlFile] = useState<File | null>(null);
  const [kmlStatus, setKmlStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  
  // --- Hooks de Arrastar (do ModalSafra_exemplo.tsx) ---
  const modalRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  // Popula o formulário
  useEffect(() => {
    if (visible) {
        if (mode === 'edit' || mode === 'delete') {
            form.setFieldsValue({
                ...initialData,
                status: initialData?.status || 'Inativo',
            });
            // Define o status do KML
            if (initialData?.kml) {
                setKmlStatus('success');
            } else {
                setKmlStatus('idle');
            }
            setKmlFile(null); // Reseta o input de arquivo

        } else if (mode === 'add') {
            form.resetFields();
            form.setFieldsValue({ status: 'Aberto' });
            setKmlStatus('idle'); // Reseta KML
            setKmlFile(null);
        }
    }
  }, [visible, mode, initialData, form]);

  // Efeito para centralizar o modal ao abrir
  useEffect(() => {
    if (visible && modalRef.current) {
        const modal = modalRef.current;
        const initialX = (window.innerWidth - modal.offsetWidth) / 2;
        const initialY = 40; // Um pouco abaixo do topo
        setPosition({ x: initialX > 0 ? initialX : 20, y: initialY });
    }
  }, [visible]);

  // --- Lógica de Arrastar (do ModalSafra_exemplo.tsx) ---
  const handleMouseDown = (e: React.MouseEvent) => {
      if (modalRef.current) {
          const target = e.target as HTMLElement;
          // Impede o arraste se clicar em campos de formulário ou botões
          if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'BUTTON' || target.closest('button') || target.closest('.ant-select-selector') || target.closest('.ant-input-number')) {
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
  // --- Fim da Lógica de Arrastar ---


  // --- ATUALIZAÇÃO: Handler para fechar com confirmação ---
  const handleTryClose = () => {
    if (isSaving) return; // Não faz nada se estiver salvando

    // ATUALIZAÇÃO: Detecta o tema
    const isDark = document.body.classList.contains('dark');

    // Verifica se o formulário foi alterado (apenas nos modos de edição)
    if (mode !== 'delete' && form.isFieldsTouched()) {
        AntModal.confirm({
            title: 'Descartar alterações?',
            content: 'Você tem alterações não salvas. Se fechar, perderá essas informações.',
            icon: <AlertTriangle size={24} style={{ color: 'var(--gcs-orange)' }} />,
            okText: 'Sim, Descartar',
            // --- CORREÇÃO: Força o botão OK a ser 'danger' ---
            okButtonProps: { 
                danger: true, 
                style: { backgroundColor: 'var(--gcs-brand-red)', borderColor: 'var(--gcs-brand-red)' } 
            },
            cancelText: 'Não, Continuar',
            // --- CORREÇÃO: Força o botão Cancel a ser 'primary' (verde) ---
            cancelButtonProps: { 
                type: 'primary',
                style: { backgroundColor: 'var(--gcs-green-dark)', borderColor: 'var(--gcs-green-dark)' }
            },
            onOk: onClose,
            zIndex: 2147483648, // Maior que o modal principal (..47)
            // ATUALIZAÇÃO: Aplica classe dark se o tema for dark
            className: isDark ? 'ant-modal-dark' : '',
        });
    } else {
        // Se não tiver alterações ou estiver no modo 'delete', fecha direto
        onClose();
    }
  };


  // --- LÓGICA DE UPLOAD KML (do exemplo) ---
  const handleKmlFileChange = (info: any) => {
      const file = info.file.originFileObj;
      if (file) {
          const isKml = file.name.toLowerCase().endsWith('.kml') || file.name.toLowerCase().endsWith('.kmz');
          if (!isKml) {
              message.error('Formato inválido. Use apenas .kml ou .kmz');
              setKmlStatus('error');
              return;
          }
          setKmlFile(file);
          setKmlStatus('idle'); // Pronto para enviar
      }
  };

  // Lógica de "deixe a implementar"
  const handleKmlUpload = () => {
      if (!kmlFile) return;
      setKmlStatus('loading');
      // SIMULAÇÃO DE UPLOAD
      setTimeout(() => {
          console.log("Simulando upload do KML:", kmlFile.name);
          // Aqui viria a lógica real de fetch/axios para a API de upload
          // Por ex: await fetch('/api/upload-kml', { ... });

          // Em caso de sucesso:
          setKmlStatus('success');
          // Em caso de erro:
          // setKmlStatus('error');
          // message.error('Falha no upload.');
      }, 2000);
  };
  
  const handleRemoveKml = () => {
      setKmlFile(null);
      setKmlStatus('idle');
      // Aqui também viria a lógica para notificar a API
      // que o KML foi removido, caso já esteja salvo.
  };

  // Componente de UI para o KML (do exemplo)
  const KMLUploadSection: React.FC = () => {
      let statusText = "Nenhum arquivo KML carregado.";
      let statusColor = "var(--gcs-gray-text, #6c757d)";
      let showUpload = true;
      let showRemove = false;
      let statusData = "idle";

      if (kmlStatus === 'loading') {
          statusText = "Enviando arquivo...";
          statusColor = "var(--gcs-blue-light, #1b4c89)";
          showUpload = false;
          statusData = "loading";
      } else if (kmlStatus === 'success' && !kmlFile) {
          statusText = `KML anexado ao Pivô.`;
          statusColor = "var(--gcs-green-dark, #28a745)";
          showUpload = false;
          showRemove = true;
          statusData = "success";
      } else if (kmlFile) {
          statusText = `Arquivo selecionado: ${kmlFile.name}`;
          statusColor = "var(--gcs-dark-text, #333)";
          showUpload = true;
          showRemove = true;
      } else if (initialData?.kml) {
           statusText = `KML já anexado.`;
           statusColor = "var(--gcs-green-dark, #28a745)";
           showUpload = false;
           showRemove = true;
           statusData = "success";
      }

      return (
          <div className="kml-upload-container">
              <div className="kml-status-text" data-status={statusData} style={{ color: statusColor }}>
                  {kmlStatus === 'loading' ? <Loader2 size={16} className="animate-spin" /> :
                   (kmlStatus === 'success' || initialData?.kml) ? <Check size={16} /> :
                   <Paperclip size={16} />}
                  <span>{statusText}</span>
              </div>
              
              <div style={{ display: 'flex', gap: '8px' }}>
                  {showRemove && (
                      <button 
                          type="button" 
                          className="btn-kml-remove" 
                          onClick={handleRemoveKml}
                          disabled={kmlStatus === 'loading' || isSaving}
                      >
                          <IconX size={16} /> Remover
                      </button>
                  )}
                  {showUpload && (
                      <Upload 
                          beforeUpload={() => false} // Impede o upload automático
                          onChange={handleKmlFileChange}
                          showUploadList={false}
                          accept=".kml,.kmz"
                          disabled={kmlStatus === 'loading' || isSaving}
                      >
                          <button 
                              type="button" 
                              className="btn-kml-upload"
                              disabled={kmlStatus === 'loading' || isSaving}
                          >
                              {kmlFile ? 'Trocar' : 'Procurar...'}
                          </button>
                      </Upload>
                  )}
                  {kmlFile && kmlStatus !== 'loading' && (
                       <button 
                          type="button" 
                          className="btn-kml-upload-go"
                          onClick={handleKmlUpload}
                          disabled={isSaving}
                       >
                          Enviar
                       </button>
                  )}
              </div>
          </div>
      );
  };


  // Handler para submeter o formulário (Add/Edit)
  const handleSubmit = () => {
    form.validateFields()
      .then(values => {
        
        const dataToSave: Partial<PivoTalhao> = {
          ...initialData, // Mantém IDs e outros campos não-editáveis
          ...values,     // Sobrescreve com os valores do formulário
        };
        
        // --- ATUALIZAÇÃO: Remove campos que não devem ser enviados ---
        delete dataToSave.safra;
        delete dataToSave.cultura;
        delete dataToSave.id_cultura;
        delete dataToSave.variedade;

        onSave(dataToSave, mode);
      })
      .catch(info => {
        console.log('Falha na validação:', info);
      });
  };

  // Handler para confirmar a exclusão
  const handleDelete = () => {
    if (initialData) {
      onSave(initialData, 'delete');
    }
  };

  // --- Títulos e Ícones Dinâmicos ---
  const config = {
    add: {
      title: 'Cadastrar Novo Pivô/Talhão',
      icon: <Plus size={20} color="var(--gcs-green, #5FB246)" />,
      okText: 'Salvar',
      okColor: 'var(--gcs-green-dark, #28a745)',
    },
    edit: {
      title: 'Alterar Pivô/Talhão',
      icon: <Edit size={20} color="var(--gcs-blue, #00314A)" />,
      okText: 'Salvar Alterações',
      okColor: 'var(--gcs-green-dark, #28a745)',
    },
    delete: {
      title: 'Excluir Pivô/Talhão',
      icon: <AlertTriangle size={20} color="var(--gcs-brand-red, #d9534f)" />,
      okText: 'Excluir',
      okColor: 'var(--gcs-brand-red, #d9534f)',
    },
  };
  const currentConfig = config[mode];

  const modalTitle = (
    <div className="modal-pivo-crud-title">
      {/* O Ícone no modo escuro precisa ter a cor do texto */}
      <span className="modal-pivo-crud-icon-wrapper">{currentConfig.icon}</span>
      <span>{currentConfig.title}</span>
    </div>
  );

  if (!visible) return null;

  return (
    <>
      {/* --- ESTILOS DO ModalSafra_exemplo.tsx --- */}
      {/* (Classes prefixadas com '.modal-pivo-crud-') */}
      <style>{`
        /* --- Variáveis --- */
        :root {
            --gcs-blue: #00314A;
            --gcs-blue-light: #1b4c89;
            --gcs-orange: #F58220;
            --gcs-green: #5FB246;
            --gcs-green-dark: #28a745;
            --gcs-brand-red: #d9534f;
            --gcs-gray-light: #f1f5fb;
            --gcs-dark-text: #333;
            --gcs-gray-text: #6c757d; /* Adicionado */
            --gcs-dark-bg-transparent: rgba(25, 39, 53, 0.5);
            --gcs-dark-bg-heavy: rgba(25, 39, 53, 0.85);
            --gcs-dark-border: rgba(125, 173, 222, 0.2);
            --gcs-dark-border-hover: rgba(125, 173, 222, 0.4);
            --gcs-dark-text-primary: #F1F5F9;
            --gcs-dark-text-secondary: #CBD5E1;
            --gcs-dark-text-tertiary: #94A3B8;
        }
        
        /* --- Base Modal --- */
        .modal-pivo-crud-backdrop {
            position: fixed;
            top: 0; left: 0;
            width: 100vw; height: 100vh;
            background-color: rgba(0,0,0,0.4);
            z-index: 2147483646;
        }
        .modal-pivo-crud-glass {
            position: fixed;
            border-radius: 12px;
            width: 90%;
            max-width: 600px; /* <-- Largura deste modal */
            min-height: 300px;
            max-height: 90vh;
            display: flex;
            flex-direction: column;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            z-index: 2147483647;
            transition: background 0.3s ease, border 0.3s ease, box-shadow 0.3s ease;
        }
        body.light .modal-pivo-crud-glass {
            background: #fff;
            border: 1px solid #dee2e6;
        }
        body.dark .modal-pivo-crud-glass {
            background: var(--gcs-dark-bg-heavy);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border: 1px solid var(--gcs-dark-border);
        }

        /* --- Modal Header --- */
        .modal-pivo-crud-header {
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
        body.light .modal-pivo-crud-header {
            background-color: var(--gcs-gray-light);
            border-bottom-color: #dee2e6;
        }
        body.dark .modal-pivo-crud-header {
            background-color: rgba(25, 39, 53, 0.5);
            border-bottom-color: var(--gcs-dark-border);
        }
        .modal-pivo-crud-title {
            font-size: 1.2rem;
            font-weight: bold;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        body.light .modal-pivo-crud-title { color: var(--gcs-blue); }
        /* Correção para o ícone do header no modo escuro */
        body.dark .modal-pivo-crud-title,
        body.dark .modal-pivo-crud-icon-wrapper svg { 
            color: var(--gcs-dark-text-primary) !important; 
        }
        
        .modal-pivo-crud-close-btn {
            background: none;
            border: none;
            font-size: 1.75rem;
            cursor: pointer;
            padding: 0;
            line-height: 1;
        }
        body.light .modal-pivo-crud-close-btn { color: var(--gcs-dark-text); }
        body.dark .modal-pivo-crud-close-btn { color: var(--gcs-dark-text-secondary); }
        body.dark .modal-pivo-crud-close-btn:hover { color: var(--gcs-dark-text-primary); }

        /* --- Modal Content --- */
        .modal-pivo-crud-content-wrapper {
            flex-grow: 1;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        }
        .modal-pivo-crud-content-scrollable {
            flex-grow: 1;
            overflow-y: auto;
            padding: 1.5rem;
        }
        /* Correção para o Fundo Branco do Ant Spin no modo escuro */
        body.dark .ant-spin-container,
        body.dark .ant-alert {
            background: transparent !important;
        }
        
        /* --- Modal Footer --- */
        .modal-pivo-crud-footer {
            padding: 1rem 1.5rem;
            border-top: 1px solid;
            flex-shrink: 0;
            border-bottom-left-radius: 12px;
            border-bottom-right-radius: 12px;
            display: flex;
            justify-content: flex-end;
            align-items: center;
            gap: 8px;
            transition: background-color 0.3s ease, border-color 0.3s ease;
        }
        body.light .modal-pivo-crud-footer {
            background-color: var(--gcs-gray-light);
            border-top-color: #dee2e6;
        }
        body.dark .modal-pivo-crud-footer {
            background-color: rgba(25, 39, 53, 0.5);
            border-top-color: var(--gcs-dark-border);
        }

        /* --- Botões AntD (Estilos globais, não precisam de prefixo) --- */
        .btn-cancelar-laranja {
            background-color: var(--gcs-orange) !important;
            border-color: var(--gcs-orange) !important;
            color: white !important;
            font-weight: 600;
        }
        .btn-cancelar-laranja:hover:not(:disabled) {
            background-color: #d17814 !important; /* Laranja mais escuro */
            border-color: #d17814 !important;
        }
        
        .ant-btn-primary[style*="var(--gcs-green-dark)"] {
             background-color: var(--gcs-green-dark);
             border-color: var(--gcs-green-dark);
        }
        .ant-btn-primary[style*="var(--gcs-green-dark)"]:hover:not(:disabled) {
             background-color: #1e7e34;
        }
        
        .ant-btn-primary[style*="var(--gcs-brand-red)"] {
             background-color: var(--gcs-brand-red);
             border-color: var(--gcs-brand-red);
        }
         .ant-btn-primary[style*="var(--gcs-brand-red)"]:hover:not(:disabled) {
             background-color: #b01725;
        }


        /* --- ESTILOS PARA Antd Form (Globais) --- */
        body.dark .ant-form-item-label > label {
            color: var(--gcs-dark-text-primary);
        }
        body.dark .ant-input,
        body.dark .ant-select-selector {
            background: var(--gcs-dark-bg-transparent) !important;
            border: 1px solid var(--gcs-dark-border) !important;
            color: var(--gcs-dark-text-primary) !important;
        }
        body.dark .ant-input:focus,
        body.dark .ant-input-focused,
        body.dark .ant-select-focused .ant-select-selector {
            border-color: var(--gcs-dark-border-hover) !important;
            box-shadow: none !important;
        }
        body.dark .ant-input::placeholder {
            color: var(--gcs-dark-text-tertiary);
        }
        body.dark .ant-select-arrow {
            color: var(--gcs-dark-text-tertiary) !important;
        }
        
        /* --- Correção Placeholders Escuros --- */
        body.dark .ant-select-selection-placeholder {
            color: var(--gcs-dark-text-tertiary) !important;
        }
        body.dark .ant-input-number-input::placeholder {
            color: var(--gcs-dark-text-tertiary) !important;
        }
        /* --- Fim Correção Placeholders --- */

        /* --- InputNumber (CORREÇÃO 10) --- */
        body.dark .ant-input-number {
             background: var(--gcs-dark-bg-transparent) !important;
             border: 1px solid var(--gcs-dark-border) !important;
             color: var(--gcs-dark-text-primary) !important;
        }
        /* Corrigir o texto do input (preto no escuro) */
        body.dark .ant-input-number-input {
             color: var(--gcs-dark-text-primary) !important;
        }
        body.dark .ant-input-number::placeholder {
             color: var(--gcs-dark-text-tertiary);
        }
        body.dark .ant-input-number:focus-within,
        body.dark .ant-input-number-focused {
            border-color: var(--gcs-dark-border-hover) !important;
            box-shadow: none !important;
        }
        /* Corrigir os botões de seta */
        body.dark .ant-input-number-handler {
             background: var(--gcs-dark-bg-transparent) !important;
             color: var(--gcs-dark-text-tertiary) !important;
             border-left-color: var(--gcs-dark-border) !important;
        }
         body.dark .ant-input-number-handler-up:hover,
         body.dark .ant-input-number-handler-down:hover {
            background: var(--gcs-dark-border-hover) !important;
         }

        /* Dropdown do Select */
        body.dark .ant-select-dropdown {
            background: var(--gcs-dark-bg-heavy) !important;
            border: 1px solid var(--gcs-dark-border) !important;
        }
        body.dark .ant-select-item {
            color: var(--gcs-dark-text-primary) !important;
        }
        body.dark .ant-select-item-option-active:not(.ant-select-item-option-selected) {
            background: var(--gcs-dark-bg-transparent) !important;
        }
        body.dark .ant-select-item-option-selected {
            background: var(--gcs-blue-light) !important;
            color: white !important;
        }
        /* --- Fim dos estilos Antd --- */

        /* --- Estilos KML (do exemplo) --- */
        .kml-upload-container {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border: 1px solid #d0d7e2; /* --gcs-gray-border */
            border-radius: 8px;
            padding: 10px 14px;
        }
        body.dark .kml-upload-container {
            border-color: var(--gcs-dark-border);
        }
        
        .kml-status-text {
            display: flex;
            align-items: center;
            gap: 8px;
            font-weight: 500;
            font-size: 14px;
        }
        body.light .kml-status-text { color: var(--gcs-gray-text); }
        body.dark .kml-status-text { color: var(--gcs-dark-text-secondary); }
        body.dark .kml-status-text[data-status="success"] { color: var(--gcs-green-dark); }
        body.light .kml-status-text[data-status="success"] { color: var(--gcs-green-dark); }
        body.dark .kml-status-text[data-status="loading"] { color: var(--gcs-blue-sky); }
        body.light .kml-status-text[data-status="loading"] { color: var(--gcs-blue-light); }

        .btn-kml-upload, .btn-kml-remove, .btn-kml-upload-go {
            font-size: 14px;
            font-weight: 600;
            border: 1px solid #d0d7e2; /* --gcs-gray-border */
            border-radius: 6px;
            padding: 6px 12px;
            cursor: pointer;
            transition: all 0.2s ease;
            display: inline-flex;
            align-items: center;
            gap: 6px;
        }
        .btn-kml-upload { background: #fff; color: var(--gcs-blue-light); }
        .btn-kml-upload-go { background: var(--gcs-green-dark); color: white; border-color: var(--gcs-green-dark); }
        .btn-kml-remove { background: #fff; color: var(--gcs-brand-red); border-color: transparent; }
        .btn-kml-upload:hover:not(:disabled) { background: #f8f9fa; }
        .btn-kml-remove:hover:not(:disabled) { background: #fff5f5; border-color: #ffc9c9; }
        .btn-kml-upload-go:hover:not(:disabled) { background: #218838; }

        body.dark .btn-kml-upload, body.dark .btn-kml-remove {
            background: var(--gcs-dark-bg-transparent);
            border-color: var(--gcs-dark-border-hover);
            color: var(--gcs-dark-text-secondary);
        }
        body.dark .btn-kml-upload:hover:not(:disabled) { background: rgba(125, 173, 222, 0.2); }
        body.dark .btn-kml-remove { color: #F87171; }
        body.dark .btn-kml-remove:hover:not(:disabled) { background: rgba(248, 113, 113, 0.1); }
        body.dark .btn-kml-upload-go { background: var(--gcs-green-dark); border-color: var(--gcs-green-dark); color: white; }
        body.dark .btn-kml-upload-go:hover:not(:disabled) { background: #2f9e44; }
        
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        /* --- Fim Estilos KML --- */


        /* --- Estilos Modo Excluir (Prefixados) --- */
        .delete-confirmation-box {
            padding: 1rem 0;
        }
        body.dark .ant-alert-error {
             background-color: rgba(217, 83, 79, 0.1);
             border-color: rgba(217, 83, 79, 0.3);
        }
        body.dark .ant-alert-error .ant-alert-message {
             color: #F87171; /* Vermelho claro */
        }
        body.dark .ant-alert-error .ant-alert-description p,
        body.dark .ant-alert-error .ant-alert-description strong {
            color: var(--gcs-dark-text-secondary);
        }
        
        /* --- ATUALIZAÇÃO: Estilos do Modal de Confirmação (Dark Mode) --- */
        .ant-modal-dark .ant-modal-content {
            background: var(--gcs-dark-bg-heavy) !important;
        }
        .ant-modal-dark .ant-modal-header {
            background: rgba(25, 39, 53, 0.5) !important;
            border-bottom-color: var(--gcs-dark-border) !important;
        }
        /* CORREÇÃO: Alvo específico para o título e conteúdo do 'confirm' */
        .ant-modal-dark .ant-modal-confirm-title {
            color: var(--gcs-dark-text-primary) !important;
        }
        .ant-modal-dark .ant-modal-confirm-content {
             color: var(--gcs-dark-text-secondary) !important;
        }
        .ant-modal-dark .ant-modal-confirm-btns { /* Target dos botões */
            border-top-color: var(--gcs-dark-border) !important;
            padding-top: 12px !important; /* Ajuste do AntD */
        }

        /* --- CORREÇÃO: Força a cor dos botões do modal de confirmação --- */
        .ant-modal-confirm-btns .ant-btn-primary:not(.ant-btn-dangerous) {
             background-color: var(--gcs-green-dark) !important;
             border-color: var(--gcs-green-dark) !important;
        }
        .ant-modal-confirm-btns .ant-btn-primary:not(.ant-btn-dangerous):hover {
             background-color: #1e7e34 !important;
             border-color: #1e7e34 !important;
        }
        .ant-modal-confirm-btns .ant-btn-dangerous {
            background-color: var(--gcs-brand-red) !important;
            border-color: var(--gcs-brand-red) !important;
        }
        .ant-modal-confirm-btns .ant-btn-dangerous:hover {
            background-color: #b01725 !important;
            border-color: #b01725 !important;
        }
        /* --- Fim da Correção --- */
      `}</style>

      {/* ATUALIZAÇÃO: backdrop agora chama handleTryClose */}
      <div 
        className="modal-pivo-crud-backdrop"
        onClick={handleTryClose}
      ></div>
      
      <div
        ref={modalRef}
        className="modal-pivo-crud-glass"
        style={{
            top: position.y,
            left: position.x,
        }}
      >
          <div
            onMouseDown={handleMouseDown}
            className="modal-pivo-crud-header"
          >
            {modalTitle}
            {/* ATUALIZAÇÃO: "X" agora chama handleTryClose e é desabilitado */}
            <button onClick={handleTryClose} className="modal-pivo-crud-close-btn" disabled={isSaving}>×</button>
          </div>

          {/* ATUALIZAÇÃO: Removido o <Spin> wrapper */}
          <div className="modal-pivo-crud-content-wrapper">
              <div className="modal-pivo-crud-content-scrollable">

                {/* --- Conteúdo do Modal --- */}
                
                {mode === 'delete' ? (
                  // --- MODO EXCLUIR ---
                  <div className="delete-confirmation-box">
                    <Alert
                        message="Confirmação de Exclusão"
                        description={
                          <p>
                            Você tem certeza que deseja excluir o item: <br />
                            <strong>ID: {initialData?.id} - {initialData?.nome}</strong>
                            <br /><br />
                            Esta ação não poderá ser desfeita.
                          </p>
                        }
                        type="error"
                        showIcon
                        icon={<AlertTriangle size={24} />}
                    />
                  </div>
                ) : (
                  // --- MODO ADICIONAR / EDITAR ---
                  // ATUALIZAÇÃO: Formulário é desabilitado se 'isSaving' for true
                  <Form form={form} layout="vertical" name="form_in_modal" disabled={isSaving}>
                    
                    <Form.Item
                      name="nome"
                      label="Nome do Pivô/Talhão"
                      rules={[{ validator: validateNomePivoTalhao }]} // Validador customizado
                      normalize={normalizeUppercase} // Sempre maiúsculo
                      validateTrigger="onBlur" // Valida ao sair do campo
                    >
                      <Input placeholder="Ex: PIVO 001 ou TALHAO A21" />
                    </Form.Item>
                    
                    {/* --- ATUALIZAÇÃO: Linha 2 - Apenas Filial --- */}
                    <Form.Item
                      name="filial"
                      label="Filial"
                      rules={[{ required: true, message: 'Selecione a filial.' }]}
                    >
                      <Select 
                        placeholder="Ex: 0401"
                        // ATUALIZAÇÃO: Força o z-index
                        dropdownStyle={{ zIndex: 2147483648 }}
                      >
                        <Option value="0401">0401</Option>
                        <Option value="0402">0402</Option>
                      </Select>
                    </Form.Item>

                    {/* --- LINHA 3: BLOCO, ÁREA, GID --- */}
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px'}}>
                      <Form.Item
                        name="bloco"
                        label="Bloco"
                        normalize={normalizeUppercase}
                      >
                        <Input placeholder="Ex: BLOCO A" />
                      </Form.Item>

                      <Form.Item
                        name="ha"
                        label="Área (ha)"
                        rules={[{ type: 'number', message: 'Deve ser um número.' }]}
                      >
                        <InputNumber
                            min={0}
                            style={{ width: '100%' }}
                            placeholder="Ex: 63,10"
                            decimalSeparator="," // Aceita vírgula
                            step="0.01" // Permite incrementos decimais
                            // CORREÇÃO AQUI: Cast para satisfazer a tipagem
                            parser={stringParser as any} 
                         />
                      </Form.Item>
                      
                      <Form.Item
                        name="gid_telemetria"
                        label="GID Telemetria"
                        normalize={normalizeUppercase}
                      >
                        <Input placeholder="Ex: GID-001" />
                      </Form.Item>
                    </div>

                    {/* --- LINHA 4: KML --- */}
                    <Form.Item label="Arquivo KML">
                       <KMLUploadSection />
                    </Form.Item>
                    
                    {/* --- ATUALIZAÇÃO: LINHA 5: Status (movido) --- */}
                    <Form.Item
                      name="status"
                      label="Status"
                      rules={[{ required: true, message: 'Por favor, selecione o status.' }]}
                    >
                      {/* ATUALIZAÇÃO: Força o z-index */}
                      <Select dropdownStyle={{ zIndex: 2147483648 }}>
                        <Option value="Aberto">Aberto</Option>
                        <Option value="Inativo">Inativo</Option>
                      </Select>
                    </Form.Item>

                  </Form>
                )}

              </div>
          </div>
          
          <div className="modal-pivo-crud-footer">
            {/* ATUALIZAÇÃO: "Cancelar" agora chama handleTryClose e é desabilitado */}
            <Button 
                key="back" 
                onClick={handleTryClose} 
                disabled={isSaving}
                className="btn-cancelar-laranja"
            >
              Cancelar
            </Button>
            {/* ATUALIZAÇÃO: Botão de "OK" agora tem o loading embutido */}
            <Button
              key="submit"
              type="primary"
              loading={isSaving} // Spinner embutido
              disabled={isSaving} // Desativa o botão
              onClick={mode === 'delete' ? handleDelete : handleSubmit}
              style={{ backgroundColor: currentConfig.okColor, borderColor: currentConfig.okColor }}
            >
              {currentConfig.okText}
            </Button>
          </div>
      </div>
    </>
  );
};

export default ModalPivo;