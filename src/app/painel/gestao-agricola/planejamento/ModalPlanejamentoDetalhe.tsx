/*
 * =========================================================================
 * MODAL DE EDIÇÃO (MESTRE-DETALHE) PARA PLANEJAMENTO
 * =========================================================================
 * - ATUALIZAÇÃO: Lógica de "Salvar Cabeçalho" removida.
 * - O modal agora abre com cabeçalho E grade de itens visíveis
 * imediatamente, mesmo no modo 'add'.
 * - O botão "Buscar Pivôs" funciona lendo os dados do formulário
 * (mesmo sem salvar).
 * - Um único botão "Salvar" envia o cabeçalho e os itens
 * de uma só vez.
 * - ATUALIZAÇÃO UI: Colunas da grade agrupadas por Rotação (1ª, 2ª, 3ª)
 * com cores e Tooltips para economizar espaço.
 * - UI: As colunas de DADOS (tbody) agora também têm
 * um fundo colorido suave para facilitar a leitura.
 * - UI: A tabela de itens agora é AGRUPADA visualmente
 * pelo campo "Bloco", com cabeçalhos de grupo.
 * - CORREÇÃO (z-index): Aplicado 'getPopupContainer' ao
 * DatePicker para que apareça na frente do modal.
 * - CORREÇÃO (Estilo): Adicionado CSS para o DatePicker
 * no modo escuro.
 * - CORREÇÃO (Estilo): Aplicado fundo sólido aos cabeçalhos
 * de Bloco para maior destaque.
 * - CORREÇÃO (Estilo): Corrigido fundo/texto do Spinner
 * e da Tabela Vazia no modo escuro.
 * =========================================================================
 */
"use client";

import React, { useEffect, useState, useCallback, useRef } from 'react';
// (NOVO) Tooltip importado
import { Form, Input, Select, Button, Spin, Alert, Modal as AntModal, Table, message, Dropdown, Menu, DatePicker, Tooltip } from 'antd';
import type { MenuProps } from 'antd';
import { AlertTriangle, Edit, Plus, Trash2, ClipboardList, Settings2, MoreVertical, Eye, Save, Search } from 'lucide-react';

import dayjs from 'dayjs'; // Necessário para o DatePicker

const { Option } = Select;
const { TextArea } = Input;

// --- INTERFACES ---
interface PlanejamentoCabec {
  id: number;
  filial: string; 
  safra: string;
  descricao: string;
  status: 'Aberto' | 'Inativo';
  observacao: string | null;
  [key: string]: any;
}

// ATUALIZADO: Interface do Item com campos de cultura
interface PlanejamentoItem {
    id: number; // ID do item (se existente) ou ID do Pivo (se novo)
    id_plano_cultivo: number;
    id_pivo_talhao: number;
    
    // Rotação 1
    id_cultura_rot1: number | null; // NOVO
    id_cultivar_rot1: number | null; // Variedade
    dt_plantio_rot1: string | null;
    
    // Rotação 2
    id_cultura_rot2: number | null; // NOVO
    id_cultivar_rot2: number | null; // Variedade
    dt_plantio_rot2: string | null;
    
    // Rotação 3
    id_cultura_rot3: number | null; // NOVO
    id_cultivar_rot3: number | null; // Variedade
    dt_plantio_rot3: string | null;
    
    status: 'A' | 'I';
    observacao: string | null;
    [key: string]: any;
}

interface PivoTalhao {
    id: number;
    nome: string;
    bloco: string | null; 
    [key: string]: any;
}
interface Variedade {
    id: number;
    nome_comercial: string;
    [key: string]: any;
}
// NOVO: Interface (placeholder) para Cultura
interface Cultura {
    id: number;
    nome: string;
}


interface ModalPlanejamentoDetalheProps {
  visible: boolean;
  mode: 'add' | 'edit';
  initialData: Partial<PlanejamentoCabec> | null; // null se 'add', preenchido se 'edit'
  onClose: () => void;
  onSave: (data: { header: any, items: PlanejamentoItem[] }) => Promise<void>; // (MODIFICADO)
  isSaving: boolean; // (MODIFICADO) Renomeado de isSavingGlobal
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
// Helper para converter string 'YYYY-MM-DD' ou ISO para Dayjs
const toDayjs = (dateString: string | null | undefined): dayjs.Dayjs | null => {
    if (!dateString) return null;
    const date = dayjs(dateString);
    return date.isValid() ? date : null;
};


// =========================================================================
// --- FUNÇÕES DE NORMALIZAÇÃO ---
// =========================================================================
const normalizeUppercase = (value: string) => (value || '').toUpperCase();

// =========================================================================
// --- COMPONENTE DO MODAL (MESTRE-DETALHE) ---
// =========================================================================

const ModalPlanejamentoDetalhe: React.FC<ModalPlanejamentoDetalheProps> = ({ 
    visible, mode, initialData, onClose, onSave, isSaving 
}) => {
  const [form] = Form.useForm();
  
  // --- Estados Internos ---
  const [loadingItens, setLoadingItens] = useState(false);
  // const [isSavingItem, setIsSavingItem] = useState(false); // (REMOVIDO) Usa isSaving
  const [isBuscandoPivos, setIsBuscandoPivos] = useState(false);
  
  // (MODIFICADO) Agora é any[] para aceitar linhas de grupo
  const [planejamentoItens, setPlanejamentoItens] = useState<any[]>([]);
  
  // Lookups
  const [pivosMap, setPivosMap] = useState<Map<number, string>>(new Map());
  const [variedadesMap, setVariedadesMap] = useState<Map<number, string>>(new Map());
  const [pivosList, setPivosList] = useState<PivoTalhao[]>([]);
  const [variedadesList, setVariedadesList] = useState<Variedade[]>([]);
  
  const [culturasList, setCulturasList] = useState<Cultura[]>([
      { id: 1, nome: 'SOJA' },
      { id: 2, nome: 'MILHO' },
      { id: 3, nome: 'FEIJÃO' },
      { id: 4, nome: 'SORGO' },
  ]);

  // --- Lógica de Arrastar ---
  const modalRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  // (MODIFICADO) Popula o formulário (Cabeçalho)
  useEffect(() => {
    if (visible) {
        if (mode === 'edit' && initialData) {
            form.setFieldsValue({
                ...initialData,
                status: initialData?.status || 'Inativo',
            });
            // (NOVO) Busca os itens no modo 'edit'
            fetchItensDoPlano(initialData.id!); // Busca itens
            
        } else if (mode === 'add') {
            const defaultData = { status: 'Aberto' };
            form.resetFields();
            form.setFieldsValue(defaultData); // Formulário
            setPlanejamentoItens([]); // Limpa itens
        }
        
        // (NOVO) Busca lookups (Pivos e Variedades) em ambos os modos
        fetchLookups();
        
    }
  }, [visible, mode, initialData, form]);
  
  
  // (NOVA FUNÇÃO) Busca apenas os itens de um plano existente
  const fetchItensDoPlano = async (planoId: number) => {
    setLoadingItens(true);
    try {
        const itensRes = await fetch("/api/gestao-agricola/planejamento/gestao-planej-item-consulta", { method: "POST", cache: "no-store" });

        if (itensRes.status === 204) {
            setPlanejamentoItens([]);
        } else if (!itensRes.ok) {
            throw new Error('Falha ao buscar itens');
        } else {
            const allItens: PlanejamentoItem[] = await itensRes.json();
            const itensFiltrados = allItens.filter(i => i.id_plano_cultivo === planoId);
            
            // (NOVO) Adiciona o agrupamento por bloco ao carregar
            const pivosRes = await fetch("/api/gestao-agricola/pivo/consulta", { method: "POST", cache: "no-store" });
            const pivosData: PivoTalhao[] = (pivosRes.ok && pivosRes.status !== 204) ? await pivosRes.json() : [];
            const pivoBlocoMap = new Map<number, string | null>();
            pivosData.forEach(p => pivoBlocoMap.set(p.id, p.bloco || null));
            
            const itensComBloco = itensFiltrados.map(item => ({
                ...item,
                bloco: pivoBlocoMap.get(item.id_pivo_talhao) || 'Sem Bloco'
            })).sort((a, b) => a.bloco.localeCompare(b.bloco));

            setPlanejamentoItens(addGrupoBloco(itensComBloco));
        }
    } catch (error: any) {
        message.error(`Erro ao carregar itens: ${error.message}`);
    } finally {
        setLoadingItens(false);
    }
  };

  // (NOVA FUNÇÃO) Busca Pivôs e Variedades (Lookups)
  const fetchLookups = async () => {
    try {
        const [pivosRes, variedadesRes] = await Promise.all([
            fetch("/api/gestao-agricola/pivo/consulta", { method: "POST", cache: "no-store" }),
            fetch("/api/gestao-agricola/cultura/consulta", { method: "POST", cache: "no-store" })
        ]);

        // Processar Pivôs
        if (pivosRes.status !== 204 && pivosRes.ok) {
            const pivosData: PivoTalhao[] = await pivosRes.json();
            const pMap = new Map<number, string>();
            pivosData.forEach(p => pMap.set(p.id, p.nome));
            setPivosMap(pMap);
            setPivosList(pivosData);
        } else {
            setPivosList([]);
            setPivosMap(new Map());
        }

        // Processar Variedades
        if (variedadesRes.status !== 204 && variedadesRes.ok) {
            const variedadesData: Variedade[] = await variedadesRes.json();
            const vMap = new Map<number, string>();
            variedadesData.forEach(v => vMap.set(v.id, v.nome_comercial));
            setVariedadesMap(vMap);
            setVariedadesList(variedadesData);
        } else {
            setVariedadesList([]);
            setVariedadesMap(new Map());
        }
    } catch (error: any) {
        message.error(`Erro ao carregar dados de lookup: ${error.message}`);
    }
  };


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
          if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'BUTTON' || target.closest('button') || target.closest('.ant-select-selector') || target.closest('.ant-input-number') || target.closest('.ant-table-wrapper') || target.closest('.ant-picker')) {
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

  // (NOVO) Helper para adicionar linhas de grupo
  const addGrupoBloco = (itens: any[]) => {
      const pMap = new Map(pivosMap);
      const novosItensComGrupos: any[] = [];
      let currentBloco: string | null = null;
      
      itens.forEach((item) => {
          // Atualiza o pivosMap (caso venha da busca)
          if(item.nome) {
            pMap.set(item.id_pivo_talhao || item.id, item.nome);
          }
          
          const bloco = item.bloco || 'Sem Bloco';
          
          // Add group header row
          if (bloco !== currentBloco) {
              novosItensComGrupos.push({
                  id: `bloco-${bloco}`, // Unique key for the group row
                  isGroup: true,
                  bloco: bloco,
              });
              currentBloco = bloco;
          }

          // Add item row
          novosItensComGrupos.push({
              ...item,
              isGroup: false, // Mark as data row
          });
      });
      setPivosMap(pMap); // Atualiza o map
      return novosItensComGrupos;
  }

  // =========================================================================
  // --- (MODIFICADO) Handler para Buscar Pivôs/Talhões ---
  // =========================================================================
  const handleBuscarPivos = async () => {
    // Pega os dados direto do FORM
    const formValues = form.getFieldsValue();
    const filial = formValues.filial;
    const safra = formValues.safra;
    
    if (!filial || !safra) {
        message.warning('Filial e Safra são obrigatórios no cabeçalho para buscar pivôs.');
        form.validateFields(['filial', 'safra']); // Mostra erro
        return;
    }

    const runFetch = async () => {
        setIsBuscandoPivos(true);
        try {
            const response = await fetch("/api/gestao-agricola/pivo/consulta", {
                method: "POST",
                cache: "no-store",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    filial: filial,
                    safra: safra
                })
            });

            if (response.status === 204) {
                message.info('Nenhum pivô/talhão encontrado para os filtros (Filial/Safra) informados.');
                setPlanejamentoItens([]); // Limpa a lista
                return;
            }
            if (!response.ok) {
                throw new Error(`Falha na API: ${response.statusText}`);
            }

            const pivosData: PivoTalhao[] = await response.json();

            // Ordena pelo Bloco
            const pivosOrdenados = pivosData.sort((a, b) => (a.bloco || '').localeCompare(b.bloco || ''));

            // Transforma Pivos em PlanejamentoItens
            const novosItens: PlanejamentoItem[] = pivosOrdenados.map((pivo, index) => {
                return {
                    id: pivo.id, 
                    id_plano_cultivo: (initialData?.id || 0), 
                    id_pivo_talhao: pivo.id,
                    bloco: pivo.bloco || null, // (NOVO) Adiciona o bloco
                    nome: pivo.nome, // (NOVO) Adiciona o nome para o map
                    // Rotação 1
                    id_cultura_rot1: null, id_cultivar_rot1: null, dt_plantio_rot1: null,
                    // Rotação 2
                    id_cultura_rot2: null, id_cultivar_rot2: null, dt_plantio_rot2: null,
                    // Rotação 3
                    id_cultura_rot3: null, id_cultivar_rot3: null, dt_plantio_rot3: null,
                    status: 'A', observacao: null,
                };
            });
            
            // (MODIFICADO) Adiciona linhas de grupo
            const itensComGrupos = addGrupoBloco(novosItens);
            setPlanejamentoItens(itensComGrupos);
            
            message.success(`${pivosData.length} pivôs/talhões carregados e agrupados por bloco.`);

        } catch (error: any) {
            message.error(`Erro ao buscar pivôs: ${error.message}`);
            console.error("Erro ao buscar pivôs:", error);
        } finally {
            setIsBuscandoPivos(false);
        }
    };

    // Se já existem itens, pede confirmação
    if (planejamentoItens.length > 0) {
        AntModal.confirm({
            title: 'Substituir Itens?',
            content: 'Já existem itens neste plano. Deseja substituí-los pela nova busca de pivôs?',
            icon: <AlertTriangle size={24} style={{ color: 'var(--gcs-brand-red)' }} />,
            okText: 'Sim, Substituir',
            okButtonProps: { danger: true, style: { backgroundColor: 'var(--gcs-brand-red)', borderColor: 'var(--gcs-brand-red)' } },
            cancelText: 'Não, Cancelar',
            cancelButtonProps: { type: 'primary', style: { backgroundColor: 'var(--gcs-green-dark)', borderColor: 'var(--gcs-green-dark)' } },
            zIndex: 2147483650,
            className: document.body.classList.contains('dark') ? 'ant-modal-dark' : '',
            onOk: runFetch,
        });
    } else {
        runFetch(); // Se não tem itens, apenas executa
    }
  };


  // --- (NOVO) Handler para SALVAR TUDO (Submissão) ---
  const handleSubmit = async () => {
    
    try {
        // 1. Valida o cabeçalho
        const headerValues = await form.validateFields();
        
        // 2. Adiciona o ID (se estiver em modo 'edit')
        const headerData = {
            ...initialData, // Mantém o ID e outros campos
            ...headerValues  // Sobrescreve com valores do form
        };
        
        // 3. Pega os itens e FILTRA as linhas de grupo
        const itemsData = planejamentoItens.filter(item => !item.isGroup);
        
        // 4. Monta o pacote de dados
        const dataToSave = {
            header: headerData,
            items: itemsData
        };
        
        // 5. Envia para a 'page.tsx' tratar
        await onSave(dataToSave);
        
    } catch (errorInfo) {
        console.log('Falha na validação:', errorInfo);
        message.error('Por favor, preencha os campos obrigatórios do cabeçalho.');
    }
  };


  // --- (NOVO) Handler para atualizar a grade editável ---
  const handleItemChange = (id_pivo_talhao: number, field: keyof PlanejamentoItem, value: any) => {
    
    // Formata o valor se for Dayjs (DatePicker)
    let formattedValue = value;
    if (dayjs.isDayjs(value)) {
        formattedValue = value.format('YYYY-MM-DD');
    }
    
    setPlanejamentoItens(prevItens => {
      return prevItens.map(item => {
        if (item.id_pivo_talhao === id_pivo_talhao) {
          return { ...item, [field]: formattedValue };
        }
        return item;
      });
    });
  };


  // --- (MODIFICADO) Definição das Colunas da GRADE EDITÁVEL com Grupos ---
  
  // Helper function for onCell para esconder células em linhas de grupo
  const handleCell = (record: any) => ({
      colSpan: record.isGroup ? 0 : 1,
  });

  const colunasItensEditaveis: any[] = [
    {
      title: 'Talhão/Pivô',
      dataIndex: 'id_pivo_talhao',
      key: 'pivo',
      width: 180,
      fixed: 'left',
      className: 'col-pivo-talhao', 
      onCell: (record: any) => ({
          colSpan: record.isGroup ? 10 : 1, // Span all 10 columns (1 + 3 + 3 + 3)
      }),
      render: (id: number, record: any) => {
          if (record.isGroup) {
              return <strong className="bloco-header">{record.bloco}</strong>;
          }
          return pivosMap.get(id) || `ID: ${id}`;
      },
    },
    // --- Rotação 1 ---
    {
      title: (
        <Tooltip title="Primeira Rotação de Cultivo">
          <span style={{ color: 'var(--gcs-blue-sky)', fontWeight: 'bold' }}>1ª Rotação</span>
        </Tooltip>
      ),
      className: 'col-group-rot1', 
      children: [
        {
          title: 'Cultura',
          dataIndex: 'id_cultura_rot1',
          key: 'cult1',
          width: 150,
          className: 'col-group-rot1',
          onCell: handleCell,
          render: (value: number | null, record: PlanejamentoItem) => (
            <Select
                value={value}
                onChange={(val) => handleItemChange(record.id_pivo_talhao, 'id_cultura_rot1', val)}
                placeholder="Cultura..."
                style={{ width: '100%' }}
                allowClear
                dropdownStyle={{ zIndex: 2147483650 }} 
            >
                {culturasList.map(c => <Option key={c.id} value={c.id}>{c.nome}</Option>)}
            </Select>
          )
        },
        {
          title: 'Variedade',
          dataIndex: 'id_cultivar_rot1',
          key: 'var1',
          width: 200,
          className: 'col-group-rot1',
          onCell: handleCell,
          render: (value: number | null, record: PlanejamentoItem) => (
            <Select
                value={value}
                onChange={(val) => handleItemChange(record.id_pivo_talhao, 'id_cultivar_rot1', val)}
                placeholder="Variedade..."
                style={{ width: '100%' }}
                allowClear
                showSearch
                optionFilterProp="children"
                dropdownStyle={{ zIndex: 2147483650 }} 
            >
                {variedadesList.map(v => <Option key={v.id} value={v.id}>{v.nome_comercial}</Option>)}
            </Select>
          )
        },
        {
          title: 'Plantio',
          dataIndex: 'dt_plantio_rot1',
          key: 'dt1',
          width: 150,
          className: 'col-group-rot1',
          onCell: handleCell,
          render: (value: string | null, record: PlanejamentoItem) => (
            <DatePicker 
                value={toDayjs(value)}
                onChange={(date) => handleItemChange(record.id_pivo_talhao, 'dt_plantio_rot1', date)}
                format="DD/MM/YYYY" 
                style={{ width: '100%' }}
                getPopupContainer={() => modalRef.current || document.body} // (CORREÇÃO Z-INDEX)
            />
          )
        },
      ]
    },
    // --- Rotação 2 ---
    {
      title: (
        <Tooltip title="Segunda Rotação de Cultivo">
          <span style={{ color: 'var(--gcs-green)', fontWeight: 'bold' }}>2ª Rotação</span>
        </Tooltip>
      ),
      className: 'col-group-rot2',
      children: [
        {
          title: 'Cultura',
          dataIndex: 'id_cultura_rot2',
          key: 'cult2',
          width: 150,
          className: 'col-group-rot2',
          onCell: handleCell,
          render: (value: number | null, record: PlanejamentoItem) => (
            <Select
                value={value}
                onChange={(val) => handleItemChange(record.id_pivo_talhao, 'id_cultura_rot2', val)}
                placeholder="Cultura..."
                style={{ width: '100%' }}
                allowClear
                dropdownStyle={{ zIndex: 2147483650 }} 
            >
                {culturasList.map(c => <Option key={c.id} value={c.id}>{c.nome}</Option>)}
            </Select>
          )
        },
        {
          title: 'Variedade',
          dataIndex: 'id_cultivar_rot2',
          key: 'var2',
          width: 200,
          className: 'col-group-rot2',
          onCell: handleCell,
          render: (value: number | null, record: PlanejamentoItem) => (
            <Select
                value={value}
                onChange={(val) => handleItemChange(record.id_pivo_talhao, 'id_cultivar_rot2', val)}
                placeholder="Variedade..."
                style={{ width: '100%' }}
                allowClear
                showSearch
                optionFilterProp="children"
                dropdownStyle={{ zIndex: 2147483650 }} 
            >
                {variedadesList.map(v => <Option key={v.id} value={v.id}>{v.nome_comercial}</Option>)}
            </Select>
          )
        },
        {
          title: 'Plantio',
          dataIndex: 'dt_plantio_rot2',
          key: 'dt2',
          width: 150,
          className: 'col-group-rot2',
          onCell: handleCell,
          render: (value: string | null, record: PlanejamentoItem) => (
            <DatePicker 
                value={toDayjs(value)}
                onChange={(date) => handleItemChange(record.id_pivo_talhao, 'dt_plantio_rot2', date)}
                format="DD/MM/YYYY" 
                style={{ width: '100%' }}
                getPopupContainer={() => modalRef.current || document.body} // (CORREÇÃO Z-INDEX)
            />
          )
        },
      ]
    },
    // --- Rotação 3 ---
    {
      title: (
        <Tooltip title="Terceira Rotação de Cultivo">
          <span style={{ color: 'var(--gcs-orange)', fontWeight: 'bold' }}>3ª Rotação</span>
        </Tooltip>
      ),
      className: 'col-group-rot3',
      children: [
        {
          title: 'Cultura',
          dataIndex: 'id_cultura_rot3',
          key: 'cult3',
          width: 150,
          className: 'col-group-rot3',
          onCell: handleCell,
          render: (value: number | null, record: PlanejamentoItem) => (
            <Select
                value={value}
                onChange={(val) => handleItemChange(record.id_pivo_talhao, 'id_cultura_rot3', val)}
                placeholder="Cultura..."
                style={{ width: '100%' }}
                allowClear
                dropdownStyle={{ zIndex: 2147483650 }} 
            >
                {culturasList.map(c => <Option key={c.id} value={c.id}>{c.nome}</Option>)}
            </Select>
          )
        },
        {
          title: 'Variedade',
          dataIndex: 'id_cultivar_rot3',
          key: 'var3',
          width: 200,
          className: 'col-group-rot3',
          onCell: handleCell,
          render: (value: number | null, record: PlanejamentoItem) => (
            <Select
                value={value}
                onChange={(val) => handleItemChange(record.id_pivo_talhao, 'id_cultivar_rot3', val)}
                placeholder="Variedade..."
                style={{ width: '100%' }}
                allowClear
                showSearch
                optionFilterProp="children"
                dropdownStyle={{ zIndex: 2147483650 }} 
            >
                {variedadesList.map(v => <Option key={v.id} value={v.id}>{v.nome_comercial}</Option>)}
            </Select>
          )
        },
        {
          title: 'Plantio',
          dataIndex: 'dt_plantio_rot3',
          key: 'dt3',
          width: 150,
          className: 'col-group-rot3',
          onCell: handleCell,
          render: (value: string | null, record: PlanejamentoItem) => (
            <DatePicker 
                value={toDayjs(value)}
                onChange={(date) => handleItemChange(record.id_pivo_talhao, 'dt_plantio_rot3', date)}
                format="DD/MM/YYYY" 
                style={{ width: '100%' }}
                getPopupContainer={() => modalRef.current || document.body} // (CORREÇÃO Z-INDEX)
            />
          )
        },
      ]
    },
  ];


  // Título dinâmico
  const modalTitle = (
    <div className="modal-planejamento-edit-title">
      <span className="modal-planejamento-edit-icon-wrapper">
        {mode === 'edit' ? 
            <Edit size={20} color="var(--gcs-blue, #00314A)" /> : 
            <Plus size={20} color="var(--gcs-green, #5FB246)" />
        }
      </span>
      <span>
        {mode === 'edit' ? 'Alterar Planejamento (Mestre-Detalhe)' : 'Novo Planejamento'}
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
            --gcs-gray-medium: #e9ecef; /* (NOVO) Adicionado */
            --gcs-dark-text: #333;
            --gcs-gray-text: #6c757d;
            --gcs-blue-sky: #38BDF8; /* Cor 1ª Rot */
            
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
            max-width: 1400px; /* (AUMENTADO) BEM LARGO */
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
        /* (NOVO) Estilo do texto do Spinner (Carregando...) */
        body.dark .ant-spin-tip {
            color: var(--gcs-dark-text-primary) !important;
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
        
        /* NOVO: Botão Azul */
        .btn-buscar-azul {
            background-color: var(--gcs-blue-light) !important;
            border-color: var(--gcs-blue-light) !important;
            color: white !important;
        }
        .btn-buscar-azul:hover:not(:disabled) {
            background-color: var(--gcs-blue) !important;
            border-color: var(--gcs-blue) !important;
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
        body.dark .ant-picker-focused { /* Adicionado DatePicker */
            border-color: var(--gcs-dark-border-hover) !important;
            box-shadow: none !important;
        }
        body.dark .ant-select-arrow,
        body.dark .ant-picker-suffix { /* Adicionado DatePicker */
             color: var(--gcs-dark-text-tertiary) !important;
        }
        
        /* (CORREÇÃO) Placeholders */
        body.dark .ant-select-selection-placeholder {
            color: var(--gcs-dark-text-tertiary) !important;
        }
        body.dark .ant-input::placeholder,
        body.dark textarea.ant-input::placeholder,
        body.dark .ant-picker-input > input::placeholder { /* Adicionado DatePicker */
            color: var(--gcs-dark-text-tertiary) !important;
        }

        /* Desabilitado (Modo EDIT) */
        body.dark .ant-input[disabled] {
            background-color: rgba(45, 55, 72, 0.3) !important;
            border-color: rgba(125, 173, 222, 0.1) !important;
            color: var(--gcs-dark-text-tertiary) !important;
        }
        
        /* Dropdown do Select (para modo ADD e Grade) */
        body.dark .ant-select-dropdown {
            background: var(--gcs-dark-bg-heavy) !important;
            border: 1px solid var(--gcs-dark-border) !important;
            z-index: 2147483650 !important; /* (NOVO) Z-Index */
        }
        body.dark .ant-select-item { color: var(--gcs-dark-text-primary) !important; }
        body.dark .ant-select-item-option-active:not(.ant-select-item-option-selected) {
            background: var(--gcs-dark-bg-transparent) !important;
        }
        body.dark .ant-select-item-option-selected {
            background: var(--gcs-blue-light) !important;
            color: white !important;
        }
        
        /* (MODIFICADO) Dropdown do DatePicker (Modo Escuro) */
        body.dark .ant-picker-dropdown {
             background: var(--gcs-dark-bg-heavy) !important;
             border: 1px solid var(--gcs-dark-border) !important;
             z-index: 2147483650 !important;
        }
        body.dark .ant-picker-panel-container {
             background: var(--gcs-dark-bg-heavy) !important;
        }
        body.dark .ant-picker-panel,
        body.dark .ant-picker-header,
        body.dark .ant-picker-header button {
             background: transparent !important;
             color: var(--gcs-dark-text-primary) !important;
             border-bottom-color: var(--gcs-dark-border) !important;
        }
        body.dark .ant-picker-cell,
        body.dark .ant-picker-cell-in-view {
             color: var(--gcs-dark-text-secondary) !important; 
        }
        body.dark .ant-picker-cell-disabled {
            color: var(--gcs-dark-text-tertiary) !important;
            opacity: 0.5;
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
        /* (NOVO) Fundo branco para células da grade editável */
        body.light .ant-table-tbody > tr > td {
             background: #fff !important;
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
            background: var(--gcs-dark-bg-transparent) !important;
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
        
        /* (MODIFICADO) Estilos do Placeholder da Tabela (vazia) */
        body.dark .ant-table-placeholder {
            background: rgba(25, 39, 53, 0.5) !important;
            border-bottom-color: var(--gcs-dark-border) !important;
        }
        body.dark .ant-table-placeholder .ant-empty-description {
            color: var(--gcs-dark-text-primary) !important; /* (MODIFICADO) Mais claro */
        }
        
        /* --- (MODIFICADO) Estilos de Colunas Coloridas --- */
        body.light .ant-table-thead .col-group-rot1 { background-color: rgba(56, 189, 248, 0.1) !important; }
        body.light .ant-table-thead .col-group-rot2 { background-color: rgba(95, 178, 70, 0.1) !important; }
        body.light .ant-table-thead .col-group-rot3 { background-color: rgba(245, 130, 32, 0.1) !important; }
        body.light .ant-table-tbody .col-pivo-talhao { background-color: #f8f9fa !important; }
        /* (NOVO) Cor de fundo para as células de dados (tbody) */
        body.light .ant-table-tbody .col-group-rot1 { background-color: rgba(56, 189, 248, 0.03) !important; }
        body.light .ant-table-tbody .col-group-rot2 { background-color: rgba(95, 178, 70, 0.03) !important; }
        body.light .ant-table-tbody .col-group-rot3 { background-color: rgba(245, 130, 32, 0.03) !important; }
        
        body.dark .ant-table-thead .col-group-rot1 { background-color: rgba(56, 189, 248, 0.1) !important; }
        body.dark .ant-table-thead .col-group-rot2 { background-color: rgba(95, 178, 70, 0.1) !important; }
        body.dark .ant-table-thead .col-group-rot3 { background-color: rgba(245, 130, 32, 0.1) !important; }
        body.dark .ant-table-tbody .col-pivo-talhao { background-color: rgba(25, 39, 53, 0.3) !important; }
        /* (NOVO) Cor de fundo para as células de dados (tbody) */
        body.dark .ant-table-tbody .col-group-rot1 { background-color: rgba(56, 189, 248, 0.05) !important; }
        body.dark .ant-table-tbody .col-group-rot2 { background-color: rgba(95, 178, 70, 0.05) !important; }
        body.dark .ant-table-tbody .col-group-rot3 { background-color: rgba(245, 130, 32, 0.05) !important; }
        
        
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
        /* (NOVO) Wrapper para botões da seção */
        .section-title-actions {
            display: flex;
            gap: 8px;
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
        
        /* (MODIFICADO) Estilos para Linha de Grupo de Bloco */
        .bloco-header {
            font-size: 1.1em;
            font-weight: bold;
            padding: 8px 16px; 
            display: block;
        }
        body.light .bloco-header {
            color: var(--gcs-blue);
            background-color: var(--gcs-gray-medium); /* (MODIFICADO) */
        }
        body.dark .bloco-header {
            color: var(--gcs-dark-text-primary);
            background-color: var(--gcs-blue-light); /* (MODIFICADO) */
        }
        /* Remove padding da célula que contém o header */
        .ant-table-cell[colspan="10"] {
            padding: 0 !important;
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
            <button onClick={onClose} className="modal-planejamento-edit-close-btn" disabled={isSaving}>×</button>
          </div>

          <div className="modal-planejamento-edit-content-wrapper">
              <div className="modal-planejamento-edit-content-scrollable">
                
                {/* --- SEÇÃO 1: CABEÇALHO (Formulário Habilitado/Desabilitado) --- */}
                <h3 className="section-title">Dados do Plano (Cabeçalho)</h3>
                
                <Form 
                    form={form} 
                    layout="vertical" 
                    name="form_in_modal_edit" 
                    // (MODIFICADO) Desabilita em 'edit' ou se estiver salvando
                    disabled={(mode === 'edit' && !!initialData?.id) || isSaving} // (Ajuste) Desabilita se modo edit E tem ID
                >
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px'}}>
                        
                        <Form.Item
                          name="filial"
                          label="Filial"
                          rules={[{ required: true, message: 'Insira a filial.' }]}
                          normalize={normalizeUppercase}
                        >
                          <Input placeholder="Ex: 0401" maxLength={4} />
                        </Form.Item>
                        
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
                {/* (MODIFICADO) Esta seção agora está sempre visível */}
                <>
                  <h3 className="section-title">
                    <span>Itens do Plano (Rotações)</span>
                    
                    <div className="section-title-actions">
                        <Button
                            type="primary"
                            icon={<Search size={16} />}
                            onClick={handleBuscarPivos}
                            className="btn-buscar-azul"
                            loading={isBuscandoPivos}
                            disabled={isSaving || isBuscandoPivos}
                        >
                            Buscar Pivôs/Talhões
                        </Button>
                    </div>
                  </h3>
                  
                  <Spin spinning={loadingItens || isBuscandoPivos} tip={isBuscandoPivos ? "Buscando pivôs..." : "Carregando itens..."}>
                      <Table
                          columns={colunasItensEditaveis} 
                          dataSource={planejamentoItens}
                          rowKey={(record: any) => record.isGroup ? record.id : record.id_pivo_talhao} // (CORREÇÃO) Chave robusta
                          size="small"
                          pagination={false} 
                          locale={{ emptyText: 'Nenhum item adicionado. Clique em "Buscar Pivôs" para carregar.' }}
                          scroll={{ x: 1500 }} // Habilita scroll horizontal
                      />
                  </Spin>
                </>
              </div>
          </div>
          
          <div className="modal-planejamento-edit-footer">
            <Button 
                key="back" 
                onClick={onClose} 
                disabled={isSaving}
                className="btn-cancelar-laranja"
            >
              Cancelar
            </Button>
            
            {/* (REMOVIDO) Botão de Salvar Cabeçalho */}
            
            {/* (MODIFICADO) Botão de Salvar TUDO */}
            <Button
                key="save_all"
                type="primary"
                icon={<Save size={16} />}
                loading={isSaving}
                disabled={isSaving || isBuscandoPivos}
                onClick={handleSubmit} // (MODIFICADO) Chama o novo handler
                style={{ backgroundColor: 'var(--gcs-green-dark)', borderColor: 'var(--gcs-green-dark)' }}
            >
                Salvar Planejamento
            </Button>
          </div>
      </div>
    </>
  );
};

export default ModalPlanejamentoDetalhe;