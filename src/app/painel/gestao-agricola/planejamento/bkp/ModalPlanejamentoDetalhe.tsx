/*
 * =========================================================================
 * MODAL DE EDIÇÃO (MESTRE-DETALHE) PARA PLANEJAMENTO
 * =========================================================================
 * - ATUALIZADO: Agora é o modal ÚNICO para 'add' e 'edit'.
 * - Modo 'add': Campos do cabeçalho habilitados. Salva o cabeçalho
 * antes de habilitar a adição de itens.
 * - Modo 'edit': Campos do cabeçalho desabilitados. Carrega itens.
 * =========================================================================
 */
"use client";

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Form, Input, Select, Button, Spin, Alert, Modal as AntModal, Table, message, Dropdown, Menu } from 'antd';
import type { MenuProps } from 'antd';
import { AlertTriangle, Edit, Plus, Trash2, ClipboardList, Settings2, MoreVertical, Eye, Save } from 'lucide-react';
import ModalPlanejamentoItem from './ModalPlanejamentoItem'; // O sub-modal de itens

const { Option } = Select;
const { TextArea } = Input;

// --- INTERFACES ---
interface PlanejamentoCabec {
  id: number;
  safra: string;
  descricao: string;
  status: 'Aberto' | 'Inativo';
  observacao: string | null;
  [key: string]: any;
}

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

interface ModalPlanejamentoDetalheProps {
  visible: boolean;
  mode: 'add' | 'edit';
  initialData: Partial<PlanejamentoCabec> | null; // null se 'add', preenchido se 'edit'
  onClose: () => void;
  onSaveHeader: (data: any) => Promise<PlanejamentoCabec | null>; // Função da página para salvar o cabeçalho
  isSavingGlobal: boolean; // Recebe o isSaving da página
}

// Helper de Data (Formato DD/MM/YYYY)
const formatLocalDate = (dateString: string | null | undefined): string => {
    if (!dateString) return '—';
    try {
        const date = new Date(dateString);
        // Adiciona 1 dia (se necessário) para corrigir fuso horário
        date.setUTCDate(date.getUTCDate() + 1);
        const day = String(date.getUTCDate()).padStart(2, '0');
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const year = date.getUTCFullYear();
        if (isNaN(day as any)) return '—';
        return `${day}/${month}/${year}`;
    } catch (e) {
        return '—';
    }
};

// =========================================================================
// --- FUNÇÕES DE NORMALIZAÇÃO ---
// =========================================================================
const normalizeUppercase = (value: string) => (value || '').toUpperCase();

// =========================================================================
// --- COMPONENTE DO MODAL (MESTRE-DETALHE) ---
// =========================================================================

const ModalPlanejamentoDetalhe: React.FC<ModalPlanejamentoDetalheProps> = ({ 
    visible, mode, initialData, onClose, onSaveHeader, isSavingGlobal 
}) => {
  const [form] = Form.useForm();
  
  // --- Estados Internos ---
  const [loadingItens, setLoadingItens] = useState(false);
  const [isSavingItem, setIsSavingItem] = useState(false);
  
  // Dados Mestre-Detalhe
  const [planejamentoItens, setPlanejamentoItens] = useState<PlanejamentoItem[]>([]);
  
  // (NOVO) Estado interno para o cabeçalho
  const [headerData, setHeaderData] = useState<Partial<PlanejamentoCabec> | null>(null);

  // Lookups
  const [pivosMap, setPivosMap] = useState<Map<number, string>>(new Map());
  const [variedadesMap, setVariedadesMap] = useState<Map<number, string>>(new Map());
  const [pivosList, setPivosList] = useState<PivoTalhao[]>([]);
  const [variedadesList, setVariedadesList] = useState<Variedade[]>([]);

  // Sub-Modal de Itens
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [itemModalMode, setItemModalMode] = useState<'add' | 'edit'>('add');
  const [currentItem, setCurrentItem] = useState<Partial<PlanejamentoItem> | null>(null);

  // --- Lógica de Arrastar ---
  const modalRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  // (MODIFICADO) Popula o formulário (Cabeçalho) e o estado interno
  useEffect(() => {
    if (visible) {
        if (mode === 'edit' && initialData) {
            setHeaderData(initialData);
            form.setFieldsValue({
                ...initialData,
                status: initialData?.status || 'Inativo',
            });
        } else if (mode === 'add') {
            const defaultData = { status: 'Aberto' };
            setHeaderData(defaultData); // Estado interno
            form.resetFields();
            form.setFieldsValue(defaultData); // Formulário
        }
    }
  }, [visible, mode, initialData, form]);

  // (MODIFICADO) Busca os dados (Itens, Pivôs, Variedades) ao abrir o modal
  // SÓ BUSCA SE TIVER UM ID (ou seja, modo 'edit' ou 'add' pós-salvar)
  useEffect(() => {
    if (visible && headerData?.id) {
        const fetchData = async () => {
            setLoadingItens(true);
            try {
                const [itensRes, pivosRes, variedadesRes] = await Promise.all([
                    fetch("/api/gestao-agricola/planejamento/gestao-planej-item-consulta", { method: "POST", cache: "no-store" }),
                    fetch("/api/gestao-agricola/pivo/consulta", { method: "POST", cache: "no-store" }),
                    fetch("/api/gestao-agricola/cultura/consulta", { method: "POST", cache: "no-store" }) // API de Variedades
                ]);

                // 1. Processar Itens
                if (itensRes.status === 204) {
                    setPlanejamentoItens([]); // Nenhum item encontrado
                } else if (!itensRes.ok) {
                    throw new Error('Falha ao buscar itens');
                } else {
                    const allItens: PlanejamentoItem[] = await itensRes.json();
                    const itensFiltrados = allItens.filter(i => i.id_plano_cultivo === headerData.id);
                    setPlanejamentoItens(itensFiltrados);
                }

                // 2. Processar Pivôs
                if (pivosRes.status === 204) {
                    setPivosList([]);
                    setPivosMap(new Map());
                } else if (!pivosRes.ok) {
                    throw new Error('Falha ao buscar pivôs');
                } else {
                    const pivosData: PivoTalhao[] = await pivosRes.json();
                    const pMap = new Map<number, string>();
                    pivosData.forEach(p => pMap.set(p.id, p.nome));
                    setPivosMap(pMap);
                    setPivosList(pivosData); // Lista para o <Select>
                }


                // 3. Processar Variedades
                if (variedadesRes.status === 204) {
                    setVariedadesList([]);
                    setVariedadesMap(new Map());
                } else if (!variedadesRes.ok) {
                    throw new Error('Falha ao buscar variedades');
                } else {
                    const variedadesData: Variedade[] = await variedadesRes.json();
                    const vMap = new Map<number, string>();
                    variedadesData.forEach(v => vMap.set(v.id, v.nome_comercial));
                    setVariedadesMap(vMap);
                    setVariedadesList(variedadesData); // Lista para o <Select>
                }


            } catch (error: any) {
                message.error(`Erro ao carregar dados: ${error.message}`);
                console.error("Erro ao buscar dados Mestre-Detalhe:", error);
            } finally {
                setLoadingItens(false);
            }
        };
        fetchData();
    } else {
        // Limpa os dados se não houver ID
        setPlanejamentoItens([]);
        setPivosMap(new Map());
        setVariedadesMap(new Map());
        setPivosList([]);
        setVariedadesList([]);
    }
  }, [visible, headerData?.id]); // Depende do ID do headerData


  // Efeito para centralizar o modal ao abrir
  useEffect(() => {
    if (visible && modalRef.current) {
        const modal = modalRef.current;
        const initialX = (window.innerWidth - modal.offsetWidth) / 2;
        const initialY = 20; // Mais perto do topo
        setPosition({ x: initialX > 0 ? initialX : 10, y: initialY });
    }
  }, [visible]);

  // --- Lógica de Arrastar ---
  const handleMouseDown = (e: React.MouseEvent) => {
      if (modalRef.current) {
          const target = e.target as HTMLElement;
          // Impede o arraste se clicar em inputs, botões, ou na tabela
          if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'BUTTON' || target.closest('button') || target.closest('.ant-select-selector') || target.closest('.ant-input-number') || target.closest('.ant-table-wrapper')) {
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

  // (NOVO) Handler para salvar o CABEÇALHO (modo 'add')
  const handleSaveHeaderClick = async () => {
    try {
        const values = await form.validateFields();
        const savedHeader = await onSaveHeader(values); // Chama a função da page.tsx
        
        if (savedHeader) {
            // Atualiza o estado interno com o cabeçalho salvo (que agora tem ID)
            setHeaderData(savedHeader);
            message.success('Cabeçalho salvo. Agora você pode adicionar itens.');
        }
    } catch (info) {
        console.log('Falha na validação:', info);
        message.error('Por favor, preencha os campos obrigatórios do cabeçalho.');
    }
  };


  // --- Handlers do Sub-Modal (Item) ---
  const handleOpenItemModal = (mode: 'add' | 'edit', item?: PlanejamentoItem) => {
    setItemModalMode(mode);
    setCurrentItem(item || null);
    setIsItemModalOpen(true);
  };
  
  const handleCloseItemModal = () => setIsItemModalOpen(false);

  // Salva o Item (Add ou Edit)
  const handleSaveItem = async (data: any) => {
    setIsSavingItem(true);
    // TODO: Implementar APIs de 'gestao-planej-item-inclui' e 'gestao-planej-item-altera'
    
    try {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulação
        
        if (itemModalMode === 'add') {
            // Simula adição
            const newItem: PlanejamentoItem = {
                ...data,
                id: Math.floor(Math.random() * 1000) + 10,
                id_plano_cultivo: headerData!.id, // Usa o ID do cabeçalho salvo
            };
            setPlanejamentoItens(prev => [...prev, newItem]);
            message.success("Item adicionado (simulação)");
        } else {
            // Simula edição
            setPlanejamentoItens(prev => 
                prev.map(item => item.id === data.id ? { ...item, ...data } : item)
            );
            message.success("Item alterado (simulação)");
        }
        
        handleCloseItemModal();
        
    } catch (error: any) {
        message.error(`Falha ao salvar item: ${error.message}`);
    } finally {
        setIsSavingItem(false);
    }
  };
  
  // Deleta o Item
  const handleDeleteItem = (id: number) => {
      // TODO: Implementar API 'gestao-planej-item-exclui'
      
      AntModal.confirm({
          title: 'Excluir Item?',
          content: 'Tem certeza que deseja excluir este item do planejamento?',
          icon: <AlertTriangle size={24} style={{ color: 'var(--gcs-brand-red)' }} />,
          okText: 'Sim, Excluir',
          okButtonProps: { danger: true, style: { backgroundColor: 'var(--gcs-brand-red)', borderColor: 'var(--gcs-brand-red)' } },
          cancelText: 'Não, Cancelar',
          cancelButtonProps: { type: 'primary', style: { backgroundColor: 'var(--gcs-green-dark)', borderColor: 'var(--gcs-green-dark)' } },
          zIndex: 2147483650, // Acima do modal Mestre-Detalhe
          className: document.body.classList.contains('dark') ? 'ant-modal-dark' : '',
          onOk: async () => {
              try {
                  await new Promise(resolve => setTimeout(resolve, 500)); // Simulação
                  setPlanejamentoItens(prev => prev.filter(item => item.id !== id));
                  message.success("Item excluído (simulação)");
              } catch (error: any) {
                  message.error(`Falha ao excluir item: ${error.message}`);
              }
          }
      });
  };


  // --- Definição das Colunas da Tabela de Itens ---
  const colunasItens = [
    {
      title: 'Pivô/Talhão',
      dataIndex: 'id_pivo_talhao',
      key: 'pivo',
      render: (id: number) => pivosMap.get(id) || `ID: ${id}`,
    },
    {
      title: '1ª Rotação',
      dataIndex: 'id_cultivar_rot1',
      key: 'rot1',
      render: (id: number) => variedadesMap.get(id) || (id ? `ID: ${id}` : '—'),
    },
    {
      title: 'Plantio 1ª Rot.',
      dataIndex: 'dt_plantio_rot1',
      key: 'dt1',
      render: (data: string) => formatLocalDate(data),
    },
    {
      title: '2ª Rotação',
      dataIndex: 'id_cultivar_rot2',
      key: 'rot2',
      render: (id: number) => variedadesMap.get(id) || (id ? `ID: ${id}` : '—'),
    },
    {
      title: 'Plantio 2ª Rot.',
      dataIndex: 'dt_plantio_rot2',
      key: 'dt2',
      render: (data: string) => formatLocalDate(data),
    },
    {
      title: '3ª Rotação',
      dataIndex: 'id_cultivar_rot3',
      key: 'rot3',
      render: (id: number) => variedadesMap.get(id) || (id ? `ID: ${id}` : '—'),
    },
    {
      title: 'Plantio 3ª Rot.',
      dataIndex: 'dt_plantio_rot3',
      key: 'dt3',
      render: (data: string) => formatLocalDate(data),
    },
    {
      title: 'Ações',
      key: 'action',
      align: 'center' as 'center',
      render: (_: any, record: PlanejamentoItem) => {
        const menuItems: MenuProps['items'] = [
          { key: 'edit', icon: <Edit size={14} style={{ marginRight: 8 }} />, label: 'Alterar Item', onClick: () => handleOpenItemModal('edit', record) },
          { key: 'delete', icon: <Trash2 size={14} style={{ marginRight: 8 }} />, label: 'Excluir Item', danger: true, onClick: () => handleDeleteItem(record.id) }
        ];
        return (
          <Dropdown menu={{ items: menuItems }} trigger={['click']} placement="bottomRight">
            <Button icon={<MoreVertical size={16} />} />
          </Dropdown>
        );
      },
    },
  ];

  // (MODIFICADO) Título dinâmico
  const isEditMode = (headerData?.id); // Modo 'add' vira 'edit' após salvar o header
  const modalTitle = (
    <div className="modal-planejamento-edit-title">
      <span className="modal-planejamento-edit-icon-wrapper">
        {isEditMode ? 
            <Edit size={20} color="var(--gcs-blue, #00314A)" /> : 
            <Plus size={20} color="var(--gcs-green, #5FB246)" />
        }
      </span>
      <span>
        {isEditMode ? 'Alterar Planejamento (Mestre-Detalhe)' : 'Novo Planejamento'}
      </span>
    </div>
  );

  if (!visible) return null;

  return (
    <>
      {/* --- ESTILOS --- */}
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
        
        /* --- Base Modal (Mestre-Detalhe) --- */
        .modal-planejamento-edit-backdrop {
            position: fixed;
            top: 0; left: 0;
            width: 100vw; height: 100vh;
            background-color: rgba(0,0,0,0.4);
            z-index: 2147483648; /* Z-index alto para o Mestre-Detalhe */
        }
        .modal-planejamento-edit-glass {
            position: fixed;
            border-radius: 12px;
            width: 95%;
            max-width: 1200px; /* BEM LARGO */
            min-height: 400px;
            max-height: 95vh;
            display: flex;
            flex-direction: column;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            z-index: 2147483649; /* Acima do backdrop */
            transition: background 0.3s ease, border 0.3s ease, box-shadow 0.3s ease;
        }
        body.light .modal-planejamento-edit-glass {
            background: #fff;
            border: 1px solid #dee2e6;
        }
        body.dark .modal-planejamento-edit-glass {
            background: var(--gcs-dark-bg-heavy);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border: 1px solid var(--gcs-dark-border);
        }

        /* --- Modal Header --- */
        .modal-planejamento-edit-header {
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
        body.light .modal-planejamento-edit-header {
            background-color: var(--gcs-gray-light);
            border-bottom-color: #dee2e6;
        }
        body.dark .modal-planejamento-edit-header {
            background-color: rgba(25, 39, 53, 0.5);
            border-bottom-color: var(--gcs-dark-border);
        }
        .modal-planejamento-edit-title {
            font-size: 1.2rem;
            font-weight: bold;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        body.light .modal-planejamento-edit-title { color: var(--gcs-blue); }
        body.dark .modal-planejamento-edit-title,
        body.dark .modal-planejamento-edit-icon-wrapper svg { 
            color: var(--gcs-dark-text-primary) !important; 
        }
        
        .modal-planejamento-edit-close-btn {
            background: none;
            border: none;
            font-size: 1.75rem;
            cursor: pointer;
            padding: 0;
            line-height: 1;
        }
        body.light .modal-planejamento-edit-close-btn { color: var(--gcs-dark-text); }
        body.dark .modal-planejamento-edit-close-btn { color: var(--gcs-dark-text-secondary); }
        body.dark .modal-planejamento-edit-close-btn:hover { color: var(--gcs-dark-text-primary); }

        /* --- Modal Content --- */
        .modal-planejamento-edit-content-wrapper {
            flex-grow: 1;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        }
        .modal-planejamento-edit-content-scrollable {
            flex-grow: 1;
            overflow-y: auto;
            padding: 1.5rem;
        }
        body.dark .ant-spin-container,
        body.dark .ant-alert {
            background: transparent !important;
        }
        
        /* --- Modal Footer --- */
        .modal-planejamento-edit-footer {
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
        body.light .modal-planejamento-edit-footer {
            background-color: var(--gcs-gray-light);
            border-top-color: #dee2e6;
        }
        body.dark .modal-planejamento-edit-footer {
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
        
        /* --- ESTILOS PARA Antd Form (Habilitado e Desabilitado) --- */
        body.dark .ant-form-item-label > label {
            color: var(--gcs-dark-text-primary);
        }
        
        /* Habilitado (Modo ADD) */
        body.dark .ant-input,
        body.dark .ant-select-selector,
        body.dark .ant-input-number {
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
        body.dark .ant-select-arrow { color: var(--gcs-dark-text-tertiary) !important; }
        
        /* (CORREÇÃO) Placeholders */
        body.dark .ant-select-selection-placeholder {
            color: var(--gcs-dark-text-tertiary) !important;
        }
        body.dark .ant-input::placeholder,
        body.dark textarea.ant-input::placeholder {
            color: var(--gcs-dark-text-tertiary) !important;
        }

        /* Desabilitado (Modo EDIT) */
        body.dark .ant-input[disabled] {
            background-color: rgba(45, 55, 72, 0.3) !important;
            border-color: rgba(125, 173, 222, 0.1) !important;
            color: var(--gcs-dark-text-tertiary) !important;
        }
        
        /* Dropdown do Select (para modo ADD) */
        body.dark .ant-select-dropdown {
            background: var(--gcs-dark-bg-heavy) !important;
            border: 1px solid var(--gcs-dark-border) !important;
        }
        body.dark .ant-select-item { color: var(--gcs-dark-text-primary) !important; }
        body.dark .ant-select-item-option-active:not(.ant-select-item-option-selected) {
            background: var(--gcs-dark-bg-transparent) !important;
        }
        body.dark .ant-select-item-option-selected {
            background: var(--gcs-blue-light) !important;
            color: white !important;
        }
        
        /* --- ESTILOS PARA Antd Table (Mestre-Detalhe) --- */
        body.light .ant-table-wrapper {
            border: 1px solid var(--gcs-border-color);
            border-radius: 8px;
            overflow: hidden;
        }
        body.light .ant-table-thead > tr > th {
            background-color: var(--gcs-gray-light);
            color: var(--gcs-blue);
            font-weight: 600;
        }
        
        body.dark .ant-table-wrapper {
            border: 1px solid var(--gcs-dark-border);
            border-radius: 8px;
            overflow: hidden;
        }
        body.dark .ant-table {
            background: var(--gcs-dark-bg-transparent) !important;
        }
        body.dark .ant-table-thead > tr > th {
            background-color: rgba(25, 39, 53, 0.5) !important;
            color: var(--gcs-dark-text-primary) !important;
            font-weight: 600;
            border-bottom-color: var(--gcs-dark-border) !important;
        }
        body.dark .ant-table-tbody > tr > td {
            color: var(--gcs-dark-text-secondary) !important;
            border-bottom-color: var(--gcs-dark-border) !important;
        }
        body.dark .ant-table-tbody > tr.ant-table-row:hover > td {
            background: rgba(40, 60, 80, 0.3) !important;
        }
        body.dark .ant-pagination-total-text { color: #CBD5E1 !important; }
        body.dark .ant-pagination-item a, body.dark .ant-pagination-item-link { color: #CBD5E1 !important; }
        body.dark .ant-pagination-item { background-color: transparent !important; border-color: rgba(125, 173, 222, 0.3) !important; }
        body.dark .ant-pagination-item-active { background-color: var(--gcs-blue-light) !important; border-color: var(--gcs-blue-light) !important; }
        body.dark .ant-pagination-item-active a { color: white !important; }
        body.dark .ant-pagination-disabled .ant-pagination-item-link { color: #475569 !important; }
        body.dark .ant-table-placeholder .ant-empty-description {
            color: var(--gcs-dark-text-secondary);
        }
        
        /* --- Título da Seção (Itens) --- */
        .section-title {
            font-size: 1.1rem;
            font-weight: 600;
            padding-bottom: 8px;
            border-bottom: 1px solid;
            margin-bottom: 1rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        body.light .section-title {
            color: var(--gcs-blue);
            border-bottom-color: var(--gcs-border-color);
        }
        body.dark .section-title {
            color: var(--gcs-dark-text-primary);
            border-bottom-color: var(--gcs-dark-border);
        }
        
        /* --- Estilos do Modal de Confirmação (Dark Mode) --- */
        .ant-modal-dark .ant-modal-content {
            background: var(--gcs-dark-bg-heavy) !important;
        }
        .ant-modal-dark .ant-modal-header {
            background: rgba(25, 39, 53, 0.5) !important;
            border-bottom-color: var(--gcs-dark-border) !important;
        }
        .ant-modal-dark .ant-modal-confirm-title {
            color: var(--gcs-dark-text-primary) !important;
        }
        .ant-modal-dark .ant-modal-confirm-content {
             color: var(--gcs-dark-text-secondary) !important;
        }
        .ant-modal-dark .ant-modal-confirm-btns {
            border-top-color: var(--gcs-dark-border) !important;
            padding-top: 12px !important;
        }
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
      `}</style>

      <div 
        className="modal-planejamento-edit-backdrop"
        onClick={onClose} // Fecha ao clicar no fundo
      ></div>
      
      <div
        ref={modalRef}
        className="modal-planejamento-edit-glass"
        style={{
            top: position.y,
            left: position.x,
        }}
      >
          <div
            onMouseDown={handleMouseDown}
            className="modal-planejamento-edit-header"
          >
            {modalTitle}
            <button onClick={onClose} className="modal-planejamento-edit-close-btn" disabled={isSavingGlobal}>×</button>
          </div>

          <div className="modal-planejamento-edit-content-wrapper">
              <div className="modal-planejamento-edit-content-scrollable">
                
                {/* --- SEÇÃO 1: CABEÇALHO (Formulário Habilitado/Desabilitado) --- */}
                <h3 className="section-title">Dados do Plano (Cabeçalho)</h3>
                
                <Form 
                    form={form} 
                    layout="vertical" 
                    name="form_in_modal_edit" 
                    disabled={isEditMode || isSavingGlobal} // Desabilita se modo 'edit' ou se estiver salvando
                >
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px'}}>
                        <Form.Item
                          name="safra"
                          label="Safra"
                          rules={[{ required: true, message: 'Insira a safra.' }]}
                          normalize={normalizeUppercase}
                        >
                          <Input placeholder="Ex: 24/25" />
                        </Form.Item>
                        
                        <Form.Item
                          name="status"
                          label="Status"
                          rules={[{ required: true, message: 'Selecione o status.' }]}
                        >
                          <Select 
                            dropdownStyle={{ zIndex: 2147483648 }}
                            placeholder="Selecione o status"
                        >
                            <Option value="Aberto">Aberto</Option>
                            <Option value="Inativo">Inativo</Option>
                          </Select>
                        </Form.Item>
                    </div>

                    <Form.Item
                      name="descricao"
                      label="Descrição do Plano"
                      rules={[{ required: true, message: 'Insira a descrição.' }]}
                      normalize={normalizeUppercase}
                    >
                      <Input placeholder="Ex: PLANEJAMENTO SAFRA 24/25 GCS" />
                    </Form.Item>
                    
                    <Form.Item
                      name="observacao"
                      label="Observação"
                      normalize={normalizeUppercase}
                    >
                      <TextArea rows={2} placeholder="Insira observações (opcional)" />
                    </Form.Item>
                </Form>

                <div style={{height: '24px'}}></div> 

                {/* --- SEÇÃO 2: ITENS (Tabela) --- */}
                {/* (NOVO) Só mostra a seção de itens se o cabeçalho já foi salvo (tem ID) */}
                {isEditMode ? (
                  <>
                    <h3 className="section-title">
                      <span>Itens do Plano (Rotações)</span>
                      <Button
                          type="primary"
                          icon={<Plus size={16} />}
                          onClick={() => handleOpenItemModal('add')}
                          style={{ backgroundColor: 'var(--gcs-green-dark)', borderColor: 'var(--gcs-green-dark)' }}
                          disabled={isSavingGlobal} // Desabilita se a página estiver salvando
                      >
                          Incluir Item
                      </Button>
                    </h3>
                    
                    <Spin spinning={loadingItens} tip="Carregando itens...">
                        <Table
                            columns={colunasItens}
                            dataSource={planejamentoItens}
                            rowKey="id"
                            size="small"
                            pagination={{ pageSize: 5, hideOnSinglePage: true }}
                            locale={{ emptyText: 'Nenhum item adicionado a este plano.' }}
                        />
                    </Spin>
                  </>
                ) : (
                    <Alert
                        message="Salve o cabeçalho para adicionar itens"
                        description="Você precisa salvar os dados do plano (cabeçalho) antes de poder incluir os itens de rotação."
                        type="info"
                        showIcon
                    />
                )}

              </div>
          </div>
          
          <div className="modal-planejamento-edit-footer">
            <Button 
                key="back" 
                onClick={onClose} 
                disabled={isSavingGlobal}
                className="btn-cancelar-laranja"
            >
              {isEditMode ? 'Fechar' : 'Cancelar'}
            </Button>
            
            {/* (NOVO) Botão de Salvar Cabeçalho (só modo 'add') */}
            {!isEditMode && (
                <Button
                    key="save_header"
                    type="primary"
                    icon={<Save size={16} />}
                    loading={isSavingGlobal}
                    disabled={isSavingGlobal}
                    onClick={handleSaveHeaderClick}
                    style={{ backgroundColor: 'var(--gcs-green-dark)', borderColor: 'var(--gcs-green-dark)' }}
                >
                    Salvar Cabeçalho e Add Itens
                </Button>
            )}
          </div>
      </div>
      
      {/* --- SUB-MODAL (Renderizado dentro do Mestre-Detalhe) --- */}
      <ModalPlanejamentoItem
          visible={isItemModalOpen}
          mode={itemModalMode}
          initialData={currentItem}
          onClose={handleCloseItemModal}
          onSave={handleSaveItem}
          isSaving={isSavingItem}
          pivosList={pivosList}
          variedadesList={variedadesList}
      />
    </>
  );
};

export default ModalPlanejamentoDetalhe;