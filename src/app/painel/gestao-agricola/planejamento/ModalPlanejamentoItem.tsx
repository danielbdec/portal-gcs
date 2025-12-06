/*
 * =========================================================================
 * MODAL DE CRUD (ADICIONAR/EDITAR) PARA ITENS DO PLANEJAMENTO
 * =========================================================================
 * - Este é o "Sub-Modal" ou "Modal Filho".
 * - Abre a partir do ModalPlanejamentoDetalhe (Mestre-Detalhe).
 * - Recebe as listas de Pivôs e Variedades como props para
 * preencher os <Selects>.
 * =========================================================================
 */
"use client";

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Form, Input, Select, Button, Spin, Alert, Modal as AntModal, DatePicker } from 'antd';
import { AlertTriangle, Edit, Plus, Trash2, ClipboardList, MapPin, Leaf } from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
dayjs.locale('pt-br');


const { Option } = Select;
const { TextArea } = Input;

// --- INTERFACES ---
interface PlanejamentoItem {
    id: number;
    id_plano_cultivo: number;
    id_pivo_talhao: number;
    id_cultivar_rot1: number | null;
    dt_plantio_rot1: string | null;
    id_cultivar_rot2: number | null;
    dt_plantio_rot2: string | null;
    id_cultivar_rot3: number | null;
    dt_plantio_rot3: string | null;
    status: 'A' | 'I';
    observacao: string | null;
    [key: string]: any;
}

interface PivoTalhao {
    id: number;
    nome: string;
    [key: string]: any;
}
interface Variedade {
    id: number;
    nome_comercial: string;
    [key: string]: any;
}

interface ModalPlanejamentoItemProps {
  visible: boolean;
  mode: 'add' | 'edit';
  initialData: Partial<PlanejamentoItem> | null;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  isSaving: boolean;
  // Lookups vindos do modal pai
  pivosList: PivoTalhao[];
  variedadesList: Variedade[];
}

// =========================================================================
// --- FUNÇÕES DE NORMALIZAÇÃO E VALIDAÇÃO ---
// =========================================================================
const normalizeUppercase = (value: string) => (value || '').toUpperCase();

// Helper para converter string 'YYYY-MM-DD' ou ISO para Dayjs
const toDayjs = (dateString: string | null | undefined): dayjs.Dayjs | null => {
    if (!dateString) return null;
    const date = dayjs(dateString);
    return date.isValid() ? date : null;
};

// =========================================================================
// --- COMPONENTE DO MODAL (SUB-MODAL DE ITEM) ---
// =========================================================================

const ModalPlanejamentoItem: React.FC<ModalPlanejamentoItemProps> = ({ 
    visible, mode, initialData, onClose, onSave, isSaving,
    pivosList, variedadesList 
}) => {
  const [form] = Form.useForm();
  
  const modalRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  // Popula o formulário
  useEffect(() => {
    if (visible) {
        if (mode === 'edit') {
            form.setFieldsValue({
                ...initialData,
                status: initialData?.status || 'I',
                // Converte datas para Dayjs
                dt_plantio_rot1: toDayjs(initialData?.dt_plantio_rot1),
                dt_plantio_rot2: toDayjs(initialData?.dt_plantio_rot2),
                dt_plantio_rot3: toDayjs(initialData?.dt_plantio_rot3),
            });

        } else if (mode === 'add') {
            form.resetFields();
            form.setFieldsValue({ status: 'A' }); // Padrão "Aberto"
        }
    }
  }, [visible, mode, initialData, form]);

  // Efeito para centralizar o modal ao abrir
  useEffect(() => {
    if (visible && modalRef.current) {
        const modal = modalRef.current;
        const initialX = (window.innerWidth - modal.offsetWidth) / 2;
        const initialY = 60; // Um pouco mais para baixo (para não cobrir o Mestre)
        setPosition({ x: initialX > 0 ? initialX : 20, y: initialY });
    }
  }, [visible]);

  // --- Lógica de Arrastar ---
  const handleMouseDown = (e: React.MouseEvent) => {
      if (modalRef.current) {
          const target = e.target as HTMLElement;
          if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'BUTTON' || target.closest('button') || target.closest('.ant-select-selector') || target.closest('.ant-input-number') || target.closest('.ant-picker')) {
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


  // --- Handler para fechar com confirmação ---
  const handleTryClose = () => {
    if (isSaving) return; 
    const isDark = document.body.classList.contains('dark');

    if (form.isFieldsTouched()) {
        AntModal.confirm({
            title: 'Descartar alterações?',
            content: 'Você tem alterações não salvas. Se fechar, perderá essas informações.',
            icon: <AlertTriangle size={24} style={{ color: 'var(--gcs-orange)' }} />,
            okText: 'Sim, Descartar',
            okButtonProps: { 
                danger: true, 
                style: { backgroundColor: 'var(--gcs-brand-red)', borderColor: 'var(--gcs-brand-red)' } 
            },
            cancelText: 'Não, Continuar',
            cancelButtonProps: { 
                type: 'primary',
                style: { backgroundColor: 'var(--gcs-green-dark)', borderColor: 'var(--gcs-green-dark)' }
            },
            onOk: onClose,
            zIndex: 2147483651, // Acima do modal Mestre-Detalhe (..49)
            className: isDark ? 'ant-modal-dark' : '',
        });
    } else {
        onClose();
    }
  };

  // Handler para submeter o formulário (Add/Edit Item)
  const handleSubmit = () => {
    form.validateFields()
      .then(values => {
        
        // Formata as datas de Dayjs para string YYYY-MM-DD
        const formattedValues = {
            ...values,
            dt_plantio_rot1: values.dt_plantio_rot1 ? values.dt_plantio_rot1.format('YYYY-MM-DD') : null,
            dt_plantio_rot2: values.dt_plantio_rot2 ? values.dt_plantio_rot2.format('YYYY-MM-DD') : null,
            dt_plantio_rot3: values.dt_plantio_rot3 ? values.dt_plantio_rot3.format('YYYY-MM-DD') : null,
        };

        const dataToSave: Partial<PlanejamentoItem> = {
          ...initialData,
          ...formattedValues,
        };
        onSave(dataToSave); 
      })
      .catch(info => {
        console.log('Falha na validação:', info);
      });
  };

  // --- Títulos e Ícones Dinâmicos ---
  const config = {
    add: {
      title: 'Incluir Item no Plano',
      icon: <Plus size={20} color="var(--gcs-green, #5FB246)" />,
      okText: 'Salvar Item',
      okColor: 'var(--gcs-green-dark, #28a745)',
    },
    edit: {
      title: 'Alterar Item do Plano',
      icon: <Edit size={20} color="var(--gcs-blue, #00314A)" />,
      okText: 'Salvar Alterações',
      okColor: 'var(--gcs-green-dark, #28a745)',
    },
  };
  const currentConfig = config[mode];

  const modalTitle = (
    <div className="modal-planejamento-item-title">
      <span className="modal-planejamento-item-icon-wrapper">{currentConfig.icon}</span>
      <span>{currentConfig.title}</span>
    </div>
  );

  if (!visible) return null;

  // Z-Index para os Dropdowns (Select, DatePicker)
  const dropdownZIndex = 2147483652; // Maior que o modal Mestre-Detalhe (..49) e o Backdrop (..48)

  return (
    <>
      {/* --- ESTILOS (Copiado de ModalVariedade, com Z-Index mais alto) --- */}
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
            --gcs-gray-text: #6c757d;
            --gcs-dark-bg-transparent: rgba(25, 39, 53, 0.5);
            --gcs-dark-bg-heavy: rgba(25, 39, 53, 0.85);
            --gcs-dark-border: rgba(125, 173, 222, 0.2);
            --gcs-dark-border-hover: rgba(125, 173, 222, 0.4);
            --gcs-dark-text-primary: #F1F5F9;
            --gcs-dark-text-secondary: #CBD5E1;
            --gcs-dark-text-tertiary: #94A3B8;
        }
        
        /* --- Base Modal (Sub-Modal) --- */
        .modal-planejamento-item-backdrop {
            position: fixed;
            top: 0; left: 0;
            width: 100vw; height: 100vh;
            background-color: rgba(0,0,0,0.2); /* Mais suave */
            z-index: 2147483650; /* Acima do Mestre-Detalhe */
        }
        .modal-planejamento-item-glass {
            position: fixed;
            border-radius: 12px;
            width: 90%;
            max-width: 600px; /* Largura do Sub-modal */
            min-height: 300px;
            max-height: 90vh;
            display: flex;
            flex-direction: column;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            z-index: 2147483651; /* Acima do backdrop */
            transition: background 0.3s ease, border 0.3s ease, box-shadow 0.3s ease;
        }
        body.light .modal-planejamento-item-glass {
            background: #fff;
            border: 1px solid #dee2e6;
        }
        body.dark .modal-planejamento-item-glass {
            background: var(--gcs-dark-bg-heavy);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border: 1px solid var(--gcs-dark-border);
        }

        /* --- Modal Header --- */
        .modal-planejamento-item-header {
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
        body.light .modal-planejamento-item-header {
            background-color: var(--gcs-gray-light);
            border-bottom-color: #dee2e6;
        }
        body.dark .modal-planejamento-item-header {
            background-color: rgba(25, 39, 53, 0.5);
            border-bottom-color: var(--gcs-dark-border);
        }
        .modal-planejamento-item-title {
            font-size: 1.2rem;
            font-weight: bold;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        body.light .modal-planejamento-item-title { color: var(--gcs-blue); }
        body.dark .modal-planejamento-item-title,
        body.dark .modal-planejamento-item-icon-wrapper svg { 
            color: var(--gcs-dark-text-primary) !important; 
        }
        
        .modal-planejamento-item-close-btn {
            background: none;
            border: none;
            font-size: 1.75rem;
            cursor: pointer;
            padding: 0;
            line-height: 1;
        }
        body.light .modal-planejamento-item-close-btn { color: var(--gcs-dark-text); }
        body.dark .modal-planejamento-item-close-btn { color: var(--gcs-dark-text-secondary); }
        body.dark .modal-planejamento-item-close-btn:hover { color: var(--gcs-dark-text-primary); }

        /* --- Modal Content --- */
        .modal-planejamento-item-content-wrapper {
            flex-grow: 1;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        }
        .modal-planejamento-item-content-scrollable {
            flex-grow: 1;
            overflow-y: auto;
            padding: 1.5rem;
        }
        body.dark .ant-spin-container {
            background: transparent !important;
        }
        
        /* --- Modal Footer --- */
        .modal-planejamento-item-footer {
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
        body.light .modal-planejamento-item-footer {
            background-color: var(--gcs-gray-light);
            border-top-color: #dee2e6;
        }
        body.dark .modal-planejamento-item-footer {
            background-color: rgba(25, 39, 53, 0.5);
            border-top-color: var(--gcs-dark-border);
        }

        /* --- Botões AntD --- */
        .btn-cancelar-laranja {
            background-color: var(--gcs-orange) !important;
            border-color: var(--gcs-orange) !important;
            color: white !important;
            font-weight: 600;
        }
        .btn-cancelar-laranja:hover:not(:disabled) {
            background-color: #d17814 !important;
            border-color: #d17814 !important;
        }
        
        .ant-btn-primary[style*="var(--gcs-green-dark)"] {
             background-color: var(--gcs-green-dark);
             border-color: var(--gcs-green-dark);
        }
        .ant-btn-primary[style*="var(--gcs-green-dark)"]:hover:not(:disabled) {
             background-color: #1e7e34;
        }

        /* --- ESTILOS PARA Antd Form (Sub-Modal) --- */
        body.dark .ant-form-item-label > label {
            color: var(--gcs-dark-text-primary);
        }
        body.dark .ant-input,
        body.dark .ant-select-selector,
        body.dark .ant-input-number,
        body.dark .ant-picker { /* Adicionado DatePicker */
            background: var(--gcs-dark-bg-transparent) !important;
            border: 1px solid var(--gcs-dark-border) !important;
            color: var(--gcs-dark-text-primary) !important;
        }
        body.dark .ant-picker-input > input { /* Texto do DatePicker */
             color: var(--gcs-dark-text-primary) !important;
        }
        body.dark .ant-input:focus,
        body.dark .ant-input-focused,
        body.dark .ant-select-focused .ant-select-selector,
        body.dark .ant-input-number:focus-within,
        body.dark .ant-input-number-focused,
        body.dark .ant-picker-focused { /* Adicionado DatePicker */
            border-color: var(--gcs-dark-border-hover) !important;
            box-shadow: none !important;
        }
        body.dark .ant-input::placeholder,
        body.dark .ant-input-number-input::placeholder,
        body.dark .ant-picker-input > input::placeholder { /* Adicionado DatePicker */
            color: var(--gcs-dark-text-tertiary);
        }
        body.dark .ant-select-arrow,
        body.dark .ant-picker-suffix { /* Adicionado DatePicker */
            color: var(--gcs-dark-text-tertiary) !important;
        }
        body.dark .ant-select-selection-placeholder {
            color: var(--gcs-dark-text-tertiary) !important;
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
        
        /* Dropdown do DatePicker */
        body.dark .ant-picker-dropdown {
             background: var(--gcs-dark-bg-heavy) !important;
             border: 1px solid var(--gcs-dark-border) !important;
        }
        body.dark .ant-picker-panel,
        body.dark .ant-picker-header,
        body.dark .ant-picker-header button {
             background: transparent !important;
             color: var(--gcs-dark-text-primary) !important;
             border-bottom-color: var(--gcs-dark-border) !important;
        }
        body.dark .ant-picker-content th {
             color: var(--gcs-dark-text-primary) !important;
        }
        body.dark .ant-picker-cell,
        body.dark .ant-picker-cell-in-view {
             color: var(--gcs-dark-text-secondary) !important;
        }
        body.dark .ant-picker-cell:hover:not(.ant-picker-cell-selected) .ant-picker-cell-inner {
             background: var(--gcs-dark-bg-transparent) !important;
        }
        body.dark .ant-picker-cell-in-view.ant-picker-cell-today .ant-picker-cell-inner::before {
             border-color: var(--gcs-blue-sky) !important;
        }
        body.dark .ant-picker-cell-selected .ant-picker-cell-inner {
            background: var(--gcs-blue-light) !important;
        }
      `}</style>

      <div 
        className="modal-planejamento-item-backdrop"
        onClick={handleTryClose}
      ></div>
      
      <div
        ref={modalRef}
        className="modal-planejamento-item-glass"
        style={{
            top: position.y,
            left: position.x,
        }}
      >
          <div
            onMouseDown={handleMouseDown}
            className="modal-planejamento-item-header"
          >
            {modalTitle}
            <button onClick={handleTryClose} className="modal-planejamento-item-close-btn" disabled={isSaving}>×</button>
          </div>

          <div className="modal-planejamento-item-content-wrapper">
              <div className="modal-planejamento-item-content-scrollable">
                
                  {/* --- MODO ADICIONAR / EDITAR ITEM --- */}
                  <Form form={form} layout="vertical" name="form_in_modal_item" disabled={isSaving}>
                    
                    {/* LINHA 1: Pivô/Talhão */}
                    <Form.Item
                      name="id_pivo_talhao"
                      label="Pivô/Talhão"
                      rules={[{ required: true, message: 'Selecione o Pivô/Talhão.' }]}
                    >
                      <Select 
                        placeholder="Selecione o Pivô/Talhão"
                        dropdownStyle={{ zIndex: dropdownZIndex }}
                        showSearch
                        optionFilterProp="children"
                        filterOption={(input, option) =>
                          (option?.children ?? '').toString().toLowerCase().includes(input.toLowerCase())
                        }
                      >
                        {pivosList.map(pivo => (
                            <Option key={pivo.id} value={pivo.id}>{pivo.nome}</Option>
                        ))}
                      </Select>
                    </Form.Item>
                    
                    {/* LINHA 2: Rotação 1 */}
                    <div style={{display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px'}}>
                        <Form.Item
                          name="id_cultivar_rot1"
                          label="1ª Rotação (Variedade)"
                        >
                          <Select 
                            placeholder="Selecione a variedade"
                            dropdownStyle={{ zIndex: dropdownZIndex }}
                            allowClear
                            showSearch
                            optionFilterProp="children"
                            filterOption={(input, option) =>
                              (option?.children ?? '').toString().toLowerCase().includes(input.toLowerCase())
                            }
                          >
                            {variedadesList.map(v => (
                                <Option key={v.id} value={v.id}>{v.nome_comercial}</Option>
                            ))}
                          </Select>
                        </Form.Item>
                        <Form.Item
                          name="dt_plantio_rot1"
                          label="Data Plantio (1ª Rot.)"
                        >
                            {/* CORREÇÃO: Usando popupStyle para DatePicker */}
                            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" popupStyle={{ zIndex: dropdownZIndex }} />
                        </Form.Item>
                    </div>
                    
                    {/* LINHA 3: Rotação 2 */}
                    <div style={{display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px'}}>
                        <Form.Item
                          name="id_cultivar_rot2"
                          label="2ª Rotação (Variedade)"
                        >
                          <Select 
                            placeholder="Selecione a variedade"
                            dropdownStyle={{ zIndex: dropdownZIndex }}
                            allowClear
                            showSearch
                            optionFilterProp="children"
                            filterOption={(input, option) =>
                              (option?.children ?? '').toString().toLowerCase().includes(input.toLowerCase())
                            }
                          >
                            {variedadesList.map(v => (
                                <Option key={v.id} value={v.id}>{v.nome_comercial}</Option>
                            ))}
                          </Select>
                        </Form.Item>
                        <Form.Item
                          name="dt_plantio_rot2"
                          label="Data Plantio (2ª Rot.)"
                        >
                             {/* CORREÇÃO: Usando popupStyle para DatePicker */}
                            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" popupStyle={{ zIndex: dropdownZIndex }} />
                        </Form.Item>
                    </div>

                    {/* LINHA 4: Rotação 3 */}
                    <div style={{display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px'}}>
                        <Form.Item
                          name="id_cultivar_rot3"
                          label="3ª Rotação (Variedade)"
                        >
                          <Select 
                            placeholder="Selecione a variedade"
                            dropdownStyle={{ zIndex: dropdownZIndex }}
                            allowClear
                            showSearch
                            optionFilterProp="children"
                            filterOption={(input, option) =>
                              (option?.children ?? '').toString().toLowerCase().includes(input.toLowerCase())
                            }
                          >
                            {variedadesList.map(v => (
                                <Option key={v.id} value={v.id}>{v.nome_comercial}</Option>
                            ))}
                          </Select>
                        </Form.Item>
                        <Form.Item
                          name="dt_plantio_rot3"
                          label="Data Plantio (3ª Rot.)"
                        >
                             {/* CORREÇÃO: Usando popupStyle para DatePicker */}
                            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" popupStyle={{ zIndex: dropdownZIndex }} />
                        </Form.Item>
                    </div>

                    {/* LINHA 5: Status e Observação */}
                     <Form.Item
                      name="status"
                      label="Status do Item"
                      rules={[{ required: true, message: 'Selecione o status.' }]}
                    >
                      <Select dropdownStyle={{ zIndex: dropdownZIndex }}>
                        <Option value="A">Aberto</Option>
                        <Option value="I">Inativo</Option>
                      </Select>
                    </Form.Item>
                    
                    <Form.Item
                      name="observacao"
                      label="Observação"
                      normalize={normalizeUppercase}
                    >
                      <TextArea rows={2} placeholder="Insira observações (opcional)" />
                    </Form.Item>

                  </Form>
              </div>
          </div>
          
          <div className="modal-planejamento-item-footer">
            <Button 
                key="back" 
                onClick={handleTryClose} 
                disabled={isSaving}
                className="btn-cancelar-laranja"
            >
              Cancelar
            </Button>
            <Button
              key="submit"
              type="primary"
              loading={isSaving}
              disabled={isSaving}
              onClick={handleSubmit}
              style={{ backgroundColor: currentConfig.okColor, borderColor: currentConfig.okColor }}
            >
              {currentConfig.okText}
            </Button>
          </div>
      </div>
    </>
  );
};

export default ModalPlanejamentoItem;