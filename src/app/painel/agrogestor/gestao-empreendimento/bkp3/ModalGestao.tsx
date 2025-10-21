"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Tabs, Button, Card, Empty, Tooltip, Spin, Divider, Select, Radio } from "antd";
import type { TabsProps } from 'antd';
import {
  X, FileText, Plus, Edit, Trash2, Landmark, Waves, Trees, FileStack,
  CalendarCheck, ShieldCheck, Building, Siren, Recycle, FileUp, Download, AlertTriangle, Map,
  ClipboardList, MapPin, Info, CheckCircle2, ChevronDown, ChevronRight, Search, Save, Ban, Loader2
} from 'lucide-react';
import "antd/dist/reset.css";
import NotificationModal from "./NotificationModal";
import dynamic from 'next/dynamic';

const MapaKML = dynamic(() => import('./MapaKML'), {
  ssr: false,
  loading: () => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
      <Spin size="large" />
      <span style={{ marginLeft: '1rem' }}>Carregando mapa...</span>
    </div>
  )
});

/* ========================================================================
    Tipos e Interfaces
    ======================================================================== */
export interface Empreendimento {
  id: number;
  nome: string;
  cnpj_cpf: string;
  numero_matricula?: string | null;
}

type DocumentoStatus = 'Vigente' | 'Vencido' | 'Não Aplicável';

interface Documento {
  id: number | string;
  tipo: string;
  numero: string;
  orgaoEmissor?: string;
  dataEmissao: string;
  dataValidade?: string;
  nomeArquivo?: string;
  id_arquivo?: number;
  relKey?: string;
  observacao?: string;
  condicionante: 'S' | 'N';
  id_condicionante?: number | null;
  tipo_condicionante_nome?: string | null;
}

interface TipoCondicionante {
    id: number;
    nome: string;
}

// --- INTERFACE PARA O NOVO MODAL DE CADASTRO ---
export interface CondicionanteCRUD {
  id: number;
  documento: string; 
  nome: string;
  status: string; // 'A' para Ativo, 'I' para Inativo
}

// Funções auxiliares
const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(date);
    } catch (e) {
        return 'Data Inválida';
    }
};

const isEmptyDate = (d?: string | null) => {
  if (!d) return true;
  const s = String(d).trim().toUpperCase();
  return s === "N/A" || s === "NA" || s === "NULL" || s === "";
};

const getStatusStyleProps = (dataValidade: string | null | undefined): {
    text: DocumentoStatus;
    icon: React.ReactNode;
    tagStyles: React.CSSProperties;
    cardStyles: React.CSSProperties;
} => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    if (!isEmptyDate(dataValidade)) {
        const validade = new Date(dataValidade as string);
        validade.setHours(0, 0, 0, 0);

        if (validade < hoje) {
            return {
                text: 'Vencido',
                icon: <AlertTriangle size={14} style={{ marginRight: '4px' }} />,
                tagStyles: { backgroundColor: '#E03131', color: 'white', fontWeight: 'bold', padding: '4px 8px', borderRadius: '6px', display: 'flex', alignItems: 'center', fontSize: '13px' },
                cardStyles: { borderLeft: '4px solid #E03131' }
            };
        }
        return {
            text: 'Vigente',
            icon: <CheckCircle2 size={14} style={{ marginRight: '4px' }} />,
            tagStyles: { backgroundColor: '#2F9E44', color: 'white', fontWeight: 'bold', padding: '4px 8px', borderRadius: '6px', display: 'flex', alignItems: 'center', fontSize: '13px' },
            cardStyles: { borderLeft: '4px solid #2F9E44' }
        };
    }
    
    return {
        text: 'Não Aplicável',
        icon: <Info size={14} style={{ marginRight: '4px' }} />,
        tagStyles: { backgroundColor: '#F1F3F5', color: '#495057', padding: '2px 6px', borderRadius: '6px', display: 'flex', alignItems: 'center' },
        cardStyles: { borderLeft: '4px solid #CED4DA' }
    };
};

/* ========================================================================
    Hook de Notificação (Reutilizável)
    ======================================================================== */
function useNotify() {
    const [notification, setNotification] = useState({ visible: false, type: 'success' as const, message: '' });
    
    const notifySuccess = useCallback((message: string) => {
        setNotification({ visible: true, type: 'success', message });
    }, []);

    const notifyError = useCallback((message: string) => {
        setNotification({ visible: true, type: 'error', message });
    }, []);

    const NotificationComponent = (
        <NotificationModal 
            {...notification}
            onClose={() => setNotification(v => ({ ...v, visible: false }))}
        />
    );

    return { notifySuccess, notifyError, NotificationComponent };
}


/* ========================================================================
    NOVO COMPONENTE: Modal de Cadastro de Condicionante (Integrado)
    ======================================================================== */
const tiposDeDocumento = [
    { code: '', label: 'Selecione um documento...' },
    { code: 'ada', label: 'Ato Declaratório Ambiental (ADA)' },
    { code: 'alvara', label: 'Alvará' },
    { code: 'appo', label: 'Autorização para Pesquisa de Potencial Hídrico (APPO)' },
    { code: 'asv', label: 'Autorização de Supressão de Vegetação (ASV)' },
    { code: 'car', label: 'Cadastro Ambiental Rural (CAR)' },
    { code: 'ccir', label: 'Certificado de Cadastro de Imóvel Rural (CCIR)' },
    { code: 'cefir', label: 'Cadastro Estadual Florestal de Imóveis Rurais (CEFIR)' },
    { code: 'certidao_inteiro_teor', label: 'Certidão de Inteiro Teor da Matrícula' },
    { code: 'certificado_bombeiros', label: 'Certificado de Licenciamento dos Bombeiros' },
    { code: 'certificado_uso_solo', label: 'Certidão de Uso e Ocupação do Solo' },
    { code: 'cib', label: 'Cadastro Imobiliário Brasileiro (CIB)' },
    { code: 'ctf_ibama', label: 'Cadastro Técnico Federal (CTF/IBAMA)' },
    { code: 'geo', label: 'Georreferenciamento' },
    { code: 'inventario_residuos', label: 'Inventário Nacional de Resíduos Sólidos' },
    { code: 'itr', label: 'Imposto sobre a Propriedade Territorial Rural (ITR)' },
    { code: 'itr_cadastral', label: 'Situação Cadastral do Imóvel Rural (ITR)' },
    { code: 'kml', label: 'Arquivo de Mapa (KML/KMZ)' },
    { code: 'licenca', label: 'Licença Ambiental' },
    { code: 'outorga', label: 'Outorga de Uso de Recursos Hídricos' },
    { code: 'rapp_ibama', label: 'Relatório de Atividades Potencialmente Poluidoras (RAPP)' },
    { code: 'relatorio', label: 'Relatório Técnico / Ambiental' },
];

const FormFieldsCondicionante = ({ formData, disabled, handleInputChange }: {
    formData: Partial<CondicionanteCRUD>;
    disabled: boolean;
    handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
}) => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
        <div>
            <label className="modal-label">Documento *</label>
            <select
                className="modal-input"
                name="documento"
                value={formData.documento || ''}
                onChange={handleInputChange}
                disabled={true} // O documento é definido pelo contexto
                style={{ width: '100%' }}
            >
                {tiposDeDocumento.map(doc => (
                    <option key={doc.code} value={doc.code}>
                        {doc.label}
                    </option>
                ))}
            </select>
        </div>
        <div>
            <label className="modal-label">Nome da Condicionante *</label>
            <input 
                className="modal-input" 
                name="nome" 
                value={formData.nome || ''} 
                onChange={handleInputChange} 
                disabled={disabled}
                placeholder="Ex: Obter Licença de Operação"
                style={{ width: '100%' }}
            />
        </div>
    </div>
);

const ModalCondicionante: React.FC<{
    visible: boolean;
    initialData: Partial<CondicionanteCRUD> | null;
    onClose: () => void;
    onSave: (data: Partial<CondicionanteCRUD>) => void;
    isSaving: boolean;
}> = ({ visible, initialData, onClose, onSave, isSaving }) => {
    const [formData, setFormData] = useState<Partial<CondicionanteCRUD>>({});
    
    useEffect(() => {
        if (visible) {
            setFormData(initialData || { documento: '', nome: '', status: 'A' });
        }
    }, [initialData, visible]);
    
    if (!visible) return null;

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        const finalValue = name === 'nome' ? value.toUpperCase() : value;
        setFormData(prev => ({ ...prev, [name]: finalValue }));
    };
    
    const handleSaveClick = () => {
        if (isSaving) return;
        if (!formData.documento || !formData.nome) {
            alert("Os campos com * são obrigatórios.");
            return;
        }
        onSave(formData);
    };

    return (
        <>
            <div onClick={isSaving ? undefined : onClose} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 2300 }}></div>
            <div style={{
                position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                zIndex: 2301, width: '90%', maxWidth: '700px', display: 'flex', flexDirection: 'column'
            }}>
                <div style={{
                    padding: '1rem 1.5rem', borderBottom: '1px solid #dee2e6', display: 'flex', 
                    justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f1f5fb',
                }}>
                    <h3 style={{ margin: 0, color: 'var(--gcs-blue)' }}><FileText size={18} style={{marginRight: '10px'}}/> Incluir Nova Condicionante</h3>
                    <button onClick={isSaving ? undefined : onClose} disabled={isSaving} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
                </div>
                
                <div style={{ padding: '1.5rem' }}>
                    <FormFieldsCondicionante formData={formData} disabled={isSaving} handleInputChange={handleInputChange} />
                </div>

                <div style={{ padding: '1.5rem', borderTop: '1px solid #dee2e6', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem', backgroundColor: '#f8f9fa' }}>
                    {isSaving ? (
                        <div style={{display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--gcs-blue)'}}>
                            <Loader2 size={20} className="animate-spin" />
                            <span>Incluindo, por favor aguarde...</span>
                        </div>
                    ) : (
                        <>
                            <button onClick={onClose} className="btn btn-outline-gray"><Ban size={16} /> Cancelar</button>
                            <button onClick={handleSaveClick} className="btn btn-green"><Save size={16} /> Salvar</button>
                        </>
                    )}
                </div>
            </div>
        </>
    );
};


/* ========================================================================
    MODAL DE BUSCA DE CONDICIONANTE (ATUALIZADO)
    ======================================================================== */
const ModalBuscaCondicionante: React.FC<{
    open: boolean;
    onClose: () => void;
    onSelect: (condicionante: TipoCondicionante) => void;
    tipoDocumento: string;
}> = ({ open, onClose, onSelect, tipoDocumento }) => {
    const [resultados, setResultados] = useState<TipoCondicionante[]>([]);
    const [loading, setLoading] = useState(false);
    const [selecionado, setSelecionado] = useState<TipoCondicionante | null>(null);
    const { notifyError, notifySuccess, NotificationComponent } = useNotify();

    // --- State para o novo modal de inclusão ---
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // --- Lógica de busca refatorada para poder ser chamada novamente ---
    const fetchTipos = useCallback(async () => {
        setLoading(true);
        setResultados([]);
        setSelecionado(null);
        try {
            const res = await fetch('/api/agrogestor/condicionantes/consulta-condicionantes-tipo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tipo_documento: tipoDocumento })
            });
            if (!res.ok) throw new Error('Falha ao buscar os tipos de condicionante.');
            const data = await res.json();
            setResultados(Array.isArray(data) ? data : []);
        } catch (error: any) {
            notifyError(error.message);
        } finally {
            setLoading(false);
        }
    }, [tipoDocumento, notifyError]);

    useEffect(() => {
        if (open) {
            fetchTipos();
        }
    }, [open, fetchTipos]);

    const handleConfirmar = () => {
        if (selecionado) {
            onSelect(selecionado);
            onClose();
        }
    };
    
    // --- Lógica para salvar a nova condicionante ---
    const handleSaveCondicionante = async (data: Partial<CondicionanteCRUD>) => {
        setIsSaving(true);
        try {
            const response = await fetch('/api/agrogestor/condicionantes/inclui-condicionantes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            const result = await response.json();
            if (!response.ok || !result || (Array.isArray(result) && result[0]?.status !== 'ok')) {
                throw new Error(result[0]?.message || 'Falha ao incluir a condicionante.');
            }
            notifySuccess('Condicionante incluída com sucesso!');
            setIsAddModalOpen(false);
            fetchTipos(); // Atualiza a lista!
        } catch (error: any) {
            notifyError(error.message);
        } finally {
            setIsSaving(false);
        }
    };

    if (!open) return null;

    return (
        <>
            <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 2200 }} />
            <div style={{
                position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 2201,
                width: '90%', maxWidth: '500px', background: '#fff', borderRadius: '12px', boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
                display: 'flex', flexDirection: 'column'
            }}>
                <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #dee2e6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0 }}>Selecionar Tipo de Condicionante</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20}/></button>
                </div>
                <div style={{ padding: '1.5rem', maxHeight: '400px', overflowY: 'auto' }}>
                    {loading ? (
                        <div style={{textAlign: 'center'}}><Spin /></div>
                    ) : resultados && resultados.filter(item => item && item.id != null).length > 0 ? (
                        <Radio.Group onChange={(e) => setSelecionado(e.target.value)} value={selecionado}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {resultados.filter(item => item && item.id != null).map(item => (
                                    <Radio key={item.id} value={item}>{item.nome}</Radio>
                                ))}
                            </div>
                        </Radio.Group>
                    ) : (
                        <Empty description="Nenhum tipo de condicionante encontrado para este grupo."/>
                    )}
                </div>
                <div style={{ padding: "14px 18px", borderTop: "1px solid #dee2e6", display: "flex", justifyContent: "space-between", alignItems: 'center' }}>
                    <button onClick={() => setIsAddModalOpen(true)} className="btn btn-gcs-blue">
                        <Plus size={16} /> Incluir Nova
                    </button>
                    <div style={{display: 'flex', gap: 8}}>
                        <button onClick={onClose} className="btn btn-outline-gray">Cancelar</button>
                        <button onClick={handleConfirmar} disabled={!selecionado} className="btn btn-green">Confirmar</button>
                    </div>
                </div>
            </div>
            {NotificationComponent}
            <ModalCondicionante
                visible={isAddModalOpen}
                initialData={{ documento: tipoDocumento, status: 'A' }}
                onClose={() => setIsAddModalOpen(false)}
                onSave={handleSaveCondicionante}
                isSaving={isSaving}
            />
        </>
    );
};

/* ========================================================================
    Modal Genérico de Upload (Componente corrigido)
    ======================================================================== */
const ModalUploadGenerico: React.FC<{
  title: string;
  tipoDocumento: string;
  modulo: string;
  allowedExtensions?: string[];
  extensionsLabel?: string;
  open: boolean;
  onClose: () => void;
  empreendimento: Empreendimento;
  onUploadComplete: (message: string) => void;
  notifyError: (message: string) => void;
  ehCondicionante: 'S' | 'N';
}> = ({ 
    title, tipoDocumento, modulo, 
    allowedExtensions = [".pdf", ".jpg", ".jpeg", ".png", ".tif", ".tiff", ".zip"], 
    extensionsLabel = "PDF/JPG/PNG/TIF/ZIP", 
    open, onClose, empreendimento, 
    onUploadComplete, notifyError, ehCondicionante 
}) => {
  const [numero, setNumero] = useState<string>("");
  const [orgao, setOrgao] = useState<string>("");
  const [dataEmissao, setDataEmissao] = useState<string>("");
  const [dataValidade, setDataValidade] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [observacao, setObservacao] = useState<string>("");
  const [idCondicionante, setIdCondicionante] = useState<string>("");
  const [tipoCondicionanteNome, setTipoCondicionanteNome] = useState<string>("");
  const [sending, setSending] = useState<boolean>(false);
  const [buscaModalOpen, setBuscaModalOpen] = useState(false);

  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  useEffect(() => { if (open && modalRef.current) { const { clientWidth, clientHeight } = modalRef.current; setPosition({ x: window.innerWidth / 2 - clientWidth / 2, y: window.innerHeight / 2 - clientHeight / 2 }); modalRef.current.focus(); } }, [open]);
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => { const t = e.target as HTMLElement; if (!modalRef.current || t.closest('button, input, textarea, select, label')) return; setIsDragging(true); const modalRect = modalRef.current.getBoundingClientRect(); dragOffsetRef.current = { x: e.clientX - modalRect.left, y: e.clientY - modalRect.top }; };
  const handleMouseMove = (e: MouseEvent) => { if (!isDragging || !modalRef.current) return; e.preventDefault(); const modalRect = modalRef.current.getBoundingClientRect(); const x = clamp(e.clientX - dragOffsetRef.current.x, 8, window.innerWidth - modalRect.width - 8); const y = clamp(e.clientY - dragOffsetRef.current.y, 8, window.innerHeight - modalRect.height - 8); setPosition({ x, y }); };
  const handleMouseUp = () => { setIsDragging(false); };
  useEffect(() => { if (isDragging) { document.addEventListener('mousemove', handleMouseMove); document.addEventListener('mouseup', handleMouseUp); } return () => { document.removeEventListener('mousemove', handleMouseMove); document.removeEventListener('mouseup', handleMouseUp); }; }, [isDragging]);
  useEffect(() => { if (!open) return; const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') { onClose(); } }; window.addEventListener('keydown', handleKeyDown); return () => { window.removeEventListener('keydown', handleKeyDown); }; }, [open, onClose]);
  useEffect(() => { if (!open) { setNumero(""); setOrgao(""); setDataEmissao(""); setDataValidade(""); setFile(null); setObservacao(""); setIdCondicionante(""); setTipoCondicionanteNome(""); setSending(false); } }, [open]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0] || null; if (!f) { setFile(null); return; } const okExt = allowedExtensions.some((ext) => f.name.toLowerCase().endsWith(ext.toLowerCase())); if (!okExt) { notifyError(`Extensão não permitida. Use ${extensionsLabel}.`); return; } if (f.size > 30 * 1024 * 1024) { notifyError("Arquivo acima de 30MB."); return; } setFile(f); };
  
  const handleSelectCondicionante = (condicionante: TipoCondicionante) => {
    setIdCondicionante(condicionante.id.toString());
    setTipoCondicionanteNome(condicionante.nome);
  };
  
  const submit = async () => {
    if (ehCondicionante === 'S' && !idCondicionante) { notifyError("Selecione um Tipo de Condicionante."); return; }
    if (!file) { notifyError("Selecione um arquivo."); return; }
    if (!numero || !dataEmissao) { notifyError("Preencha Número do Documento e Data de Emissão."); return; }
    if (dataValidade && dataEmissao) {
        const em = new Date(dataEmissao); em.setUTCHours(0,0,0,0);
        const va = new Date(dataValidade); va.setUTCHours(0,0,0,0);
        if (va < em) {
          notifyError("A data de validade não pode ser anterior à data de emissão.");
          return;
        }
    }
    
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);

    try {
      setSending(true);
      const url = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/agrogestor/uploads`;
      const fd = new FormData();

      fd.append("empreendimentoId", String(empreendimento.id));
      fd.append("modulo", modulo);
      fd.append("tipo", tipoDocumento);
      fd.append("numero_documento", numero);
      fd.append("orgao", orgao);
      fd.append("data_emissao", dataEmissao);
      fd.append("data_validade", dataValidade);
      fd.append("observacao", observacao);
      fd.append("condicionante", ehCondicionante);
      if (ehCondicionante === 'S') {
        fd.append("id_condicionante", idCondicionante);
      }
      
      fd.append("file", file, file.name);

      const resp = await fetch(url, { method: "POST", body: fd, signal: controller.signal });
      const rawResult = await resp.json().catch(() => ({ status: 'error', error: `Falha ao processar a resposta do servidor (${resp.status})` }));
      const result = Array.isArray(rawResult) ? rawResult[0] : rawResult;
      if (!resp.ok || !result || result.status !== 'ok') { throw new Error(result?.error || `Ocorreu um erro desconhecido (${resp.status})`); }
      
      const successMessage = result.message || (
          ehCondicionante === 'S'
          ? `Condicionante para ${title} enviada para processamento com sucesso!`
          : `${title} enviado para processamento com sucesso!`
      );
      onUploadComplete(successMessage);

    } catch (err: any) {
      notifyError(err.name === 'AbortError' ? 'A requisição demorou muito e foi cancelada.' : (err?.message || "Erro ao enviar."));
    } finally {
      clearTimeout(timer);
      setSending(false);
    }
  };

  if (!open) return null;

  return (
    <>
      <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.6)", zIndex: 2100 }} />
      <div 
        ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="upload-title" tabIndex={-1}
        style={{ position: "fixed", top: `${position.y}px`, left: `${position.x}px`, width: "95%", maxWidth: 640, background: "#fff", borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.2)", zIndex: 2101, overflow: "hidden", display: "flex", flexDirection: "column" }}
      >
        <div onMouseDown={handleMouseDown} style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #dee2e6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f1f5fb', cursor: isDragging ? 'grabbing' : 'grab' }}>
          <div>
            <h3 id="upload-title" style={{ margin: 0, color: 'var(--gcs-blue)' }}>
              {ehCondicionante === 'S' ? `Adicionar Condicionante para ${title}` : `Adicionar ${title}`}
            </h3>
            <p style={{ margin: '4px 0 0 0', color: 'var(--gcs-gray-dark)', fontWeight: 'bold', fontSize: '14px' }}>
              Empreendimento: {empreendimento.nome}
              {empreendimento.numero_matricula && ` | Matrícula: ${empreendimento.numero_matricula}`}
            </p>
          </div>
          <button type="button" onClick={() => { if (!sending) onClose(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }} title="Fechar" disabled={sending}><X size={24} color="var(--gcs-gray-dark)"/></button>
        </div>
        <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: "12px", opacity: sending ? 0.6 : 1, pointerEvents: sending ? "none" : "auto" }}>
            
            {ehCondicionante === 'S' && (
                <>
                    <div>
                        <label className="modal-label">Tipo de Condicionante *</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input
                                type="text"
                                readOnly
                                value={tipoCondicionanteNome || ""}
                                placeholder="Clique na lupa para pesquisar"
                                style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid var(--gcs-border-color)", backgroundColor: '#f8f9fa' }}
                            />
                            <Button icon={<Search size={16} />} onClick={() => setBuscaModalOpen(true)}>
                                Pesquisar
                            </Button>
                        </div>
                    </div>
                    <div>
                        <label className="modal-label">Descrição da Condicionante</label>
                        <textarea
                            readOnly
                            value={tipoCondicionanteNome}
                            rows={3}
                            style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1px solid var(--gcs-border-color)", resize: "none", backgroundColor: '#f8f9fa', color: '#6c757d' }}
                        />
                    </div>
                </>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 16px" }}>
                <div><label className="modal-label">Número do Documento *</label><input value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="Número de identificação" style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1px solid var(--gcs-border-color)" }} /></div>
                <div><label className="modal-label">Órgão Emissor</label><input value={orgao} onChange={(e) => setOrgao(e.target.value)} placeholder="Órgão responsável" style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1px solid var(--gcs-border-color)" }} /></div>
                <div><label className="modal-label">Data de Emissão *</label><input type="date" value={dataEmissao} onChange={(e) => setDataEmissao(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1px solid var(--gcs-border-color)" }} /></div>
                <div><label className="modal-label">Data de Validade</label><input type="date" value={dataValidade} onChange={(e) => setDataValidade(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1px solid var(--gcs-border-color)" }} /></div>
            </div>
            <div><label className="modal-label">Arquivo ({extensionsLabel} até 30MB) *</label><input type="file" onChange={handleFile} accept={allowedExtensions.join(',')} />{file && (<div style={{ marginTop: 6, fontSize: 12, color: "#555" }}> {file.name} — {(file.size / 1024 / 1024).toFixed(2)} MB </div>)}</div>
            <div>
                <label className="modal-label">Observação</label>
                <textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} maxLength={250} placeholder="Observações sobre o documento..." rows={3} style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1px solid var(--gcs-border-color)", resize: "vertical" }} />
                <div style={{ textAlign: 'right', fontSize: '12px', color: '#888', marginTop: '4px' }}>{250 - observacao.length} caracteres restantes</div>
            </div>
        </div>
        <div style={{ padding: "14px 18px", borderTop: "1px solid var(--gcs-border-color)", display: "flex", justifyContent: "flex-end", gap: 8 }}><button type="button" className="btn btn-outline-gray" onClick={() => { if (!sending) onClose(); }} disabled={sending}>Fechar</button><button type="button" className="btn btn-green" onClick={submit} disabled={sending}>{sending ? "Enviando..." : "Salvar & Enviar"}</button></div>
        {sending && (<div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.7)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, zIndex: 2102 }}><Spin size="large" /><div style={{ color: "#333", fontWeight: 600 }}>Enviando arquivo…</div></div>)}
      </div>
      <ModalBuscaCondicionante 
        open={buscaModalOpen} 
        onClose={() => setBuscaModalOpen(false)}
        onSelect={handleSelectCondicionante}
        tipoDocumento={tipoDocumento}
      />
    </>
  );
};

// --- O restante do arquivo (ModalEditarDocumento, ModalConfirmarExclusao, DocumentSection, etc.) permanece sem alterações ---
// ... (COLE O RESTANTE DO SEU CÓDIGO ORIGINAL DE ModalGestao.tsx AQUI)
// ...

const ModalEditarDocumento: React.FC<{
    visible: boolean;
    onClose: () => void;
    documento: Documento | null;
    empreendimento: Empreendimento | null;
    modulo: string;
    onSuccess: () => void;
}> = ({ visible, onClose, documento, empreendimento, modulo, onSuccess }) => {
    const [numero, setNumero] = useState("");
    const [orgao, setOrgao] = useState("");
    const [dataEmissao, setDataEmissao] = useState("");
    const [dataValidade, setDataValidade] = useState("");
    const [observacao, setObservacao] = useState("");
    const [idCondicionante, setIdCondicionante] = useState<string>("");
    const [tipoCondicionanteNome, setTipoCondicionanteNome] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const { notifyError, notifySuccess, NotificationComponent } = useNotify();
    const modalRef = useRef<HTMLDivElement>(null);
    const [buscaModalOpen, setBuscaModalOpen] = useState(false);
    
    const inputStyle: React.CSSProperties = {
        width: '100%', padding: '10px', borderRadius: '6px',
        border: '1px solid #dee2e6', fontSize: '1rem'
    };

    useEffect(() => {
        if (documento) {
            setNumero(documento.numero || "");
            setOrgao(documento.orgaoEmissor || "");
            setObservacao(documento.observacao || "");
            try { setDataEmissao(documento.dataEmissao ? new Date(documento.dataEmissao).toISOString().split('T')[0] : ""); } catch { setDataEmissao(""); }
            try { setDataValidade(documento.dataValidade ? new Date(documento.dataValidade).toISOString().split('T')[0] : ""); } catch { setDataValidade(""); }

            if(documento.condicionante === 'S' && documento.id_condicionante) {
                setIdCondicionante(documento.id_condicionante.toString());
                setTipoCondicionanteNome(documento.tipo_condicionante_nome || "");
            } else {
                setIdCondicionante("");
                setTipoCondicionanteNome("");
            }
        }
    }, [documento]);

    useEffect(() => { if (!visible) return; const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') { onClose(); } }; window.addEventListener('keydown', handleKeyDown); return () => { window.removeEventListener('keydown', handleKeyDown); }; }, [visible, onClose]);
    if (!visible || !documento) return null;

    const handleSelectCondicionante = (condicionante: TipoCondicionante) => {
        setIdCondicionante(condicionante.id.toString());
        setTipoCondicionanteNome(condicionante.nome);
    };

    const handleAlterar = async () => {
        if (documento?.condicionante === 'S' && !idCondicionante) {
            notifyError('O campo "Tipo de Condicionante" é obrigatório.');
            return;
        }

        setLoading(true);
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 15000);

        try {
            const body: any = {
                id_certidao: documento.id,
                modulo: modulo,
                numero_documento: numero,
                orgao: orgao,
                data_emissao: dataEmissao,
                data_validade: dataValidade,
                observacao: observacao,
            };

            if (documento?.condicionante === 'S') {
                body.id_condicionante = idCondicionante;
            }

            const response = await fetch('/api/agrogestor/altera-documento', { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
                signal: controller.signal,
            });
            
            const rawResult = await response.json().catch(() => ({ status: 'error', error: 'Falha ao processar a resposta do servidor.' }));
            const result = Array.isArray(rawResult) ? rawResult[0] : rawResult;

            if (!response.ok || !result || result.status !== 'ok') {
                throw new Error(result?.error || 'Falha ao alterar o documento.');
            }

            notifySuccess('Documento alterado com sucesso!');
            onSuccess();
            onClose();
        } catch (error: any) {
            const message = error.name === 'AbortError' ? 'A requisição demorou muito e foi cancelada.' : error.message;
            notifyError(message);
        } finally {
            clearTimeout(timer);
            setLoading(false);
        }
    };
    
    return (
        <>
            <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 2200 }} />
            <div 
                ref={modalRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="edit-title"
                tabIndex={-1}
                style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 2201, width: '90%', maxWidth: '640px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', overflow: 'hidden' }}
            >
                <div 
                    style={{ 
                        padding: '1rem 1.5rem', 
                        borderBottom: '1px solid #dee2e6', 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        backgroundColor: '#f1f5fb',
                        cursor: 'grab'
                    }}
                >
                  <div>
                    <h3 id="edit-title" style={{ margin: 0, color: 'var(--gcs-blue)' }}>Alterar Documento</h3>
                    {empreendimento &&
                        <p style={{ margin: '4px 0 0 0', color: 'var(--gcs-gray-dark)', fontWeight: 'bold', fontSize: '14px' }}>
                          Empreendimento: {empreendimento.nome}
                          {empreendimento.numero_matricula && ` | Matrícula: ${empreendimento.numero_matricula}`}
                        </p>
                    }
                  </div>
                  <button type="button" onClick={onClose} disabled={loading} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}><X size={24} color="var(--gcs-gray-dark)"/></button>
                </div>
                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {documento?.condicionante === 'S' && (
                        <>
                            <div>
                                <label className="modal-label">Tipo de Condicionante *</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <input
                                        type="text"
                                        readOnly
                                        value={tipoCondicionanteNome || ""}
                                        placeholder="Clique na lupa para pesquisar"
                                        style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid var(--gcs-border-color)", backgroundColor: '#f8f9fa' }}
                                    />
                                    <Button icon={<Search size={16} />} onClick={() => setBuscaModalOpen(true)}>
                                        Pesquisar
                                    </Button>
                                </div>
                            </div>
                            <div>
                                <label className="modal-label">Descrição da Condicionante</label>
                                <textarea
                                    readOnly
                                    value={tipoCondicionanteNome}
                                    rows={3}
                                    style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1px solid var(--gcs-border-color)", resize: "none", backgroundColor: '#f8f9fa', color: '#6c757d' }}
                                />
                            </div>
                        </>
                    )}
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem 1.5rem' }}>
                        <div><label className="modal-label">Número do Documento</label><input value={numero} onChange={e => setNumero(e.target.value)} style={inputStyle} placeholder="Número de identificação"/></div>
                        <div><label className="modal-label">Órgão Emissor</label><input value={orgao} onChange={e => setOrgao(e.target.value)} style={inputStyle} placeholder="Órgão responsável"/></div>
                        <div><label className="modal-label">Data de Emissão</label><input type="date" value={dataEmissao} onChange={e => setDataEmissao(e.target.value)} style={inputStyle} /></div>
                        <div><label className="modal-label">Data de Validade</label><input type="date" value={dataValidade} onChange={e => setDataValidade(e.target.value)} style={inputStyle} /></div>
                    </div>
                    <div>
                        <label className="modal-label">Observação</label>
                        <textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} maxLength={250} rows={3} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Observações sobre o documento..."/>
                        <div style={{ textAlign: 'right', fontSize: '12px', color: '#888', marginTop: '4px' }}>{250 - observacao.length} caracteres restantes</div>
                    </div>
                </div>
                <div style={{ padding: "14px 18px", borderTop: "1px solid var(--gcs-border-color)", display: "flex", justifyContent: "flex-end", gap: '0.5rem' }}>
                    <Button onClick={onClose} disabled={loading}>Cancelar</Button>
                    <Button onClick={handleAlterar} loading={loading} className="btn-action-edit">Alterar</Button>
                </div>
            </div>
            {NotificationComponent}
            {documento && 
                <ModalBuscaCondicionante 
                    open={buscaModalOpen} 
                    onClose={() => setBuscaModalOpen(false)}
                    onSelect={handleSelectCondicionante}
                    tipoDocumento={documento.tipo}
                />
            }
        </>
    );
};

const ModalConfirmarExclusao: React.FC<{
    visible: boolean;
    onClose: () => void;
    onConfirm: () => void;
    loading: boolean;
}> = ({ visible, onClose, onConfirm, loading }) => {
    useEffect(() => { if (!visible) return; const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') { onClose(); } }; window.addEventListener('keydown', handleKeyDown); return () => { window.removeEventListener('keydown', handleKeyDown); }; }, [visible, onClose]);
    if (!visible) return null;
    return ( <> <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 2300 }} /> <div role="alertdialog" aria-modal="true" aria-labelledby="delete-title" aria-describedby="delete-desc" style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 2301, width: '90%', maxWidth: '450px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', padding: '2rem', textAlign: 'center' }} > <AlertTriangle size={48} color="var(--gcs-orange)" style={{ marginBottom: '1rem' }} /> <h3 id="delete-title" style={{ margin: '0 0 0.5rem 0', color: 'var(--gcs-blue)' }}>Confirmar Exclusão</h3> <p id="delete-desc" style={{ color: 'var(--gcs-gray-dark)', marginBottom: '2rem' }}>Tem certeza que deseja excluir este documento? Esta ação não pode ser desfeita.</p> <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}> <Button onClick={onClose} disabled={loading}>Cancelar</Button> <Button type="primary" danger onClick={onConfirm} loading={loading}>Excluir</Button> </div> </div> </> );
};

const DocumentSection: React.FC<{
  title: string;
  icon: React.ReactNode;
  documents: Documento[];
  loading: boolean;
  onAddDocumento: () => void;
  onAddCondicionante: () => void;
  onEdit: (doc: Documento, modulo: string) => void;
  onDelete: (doc: Documento, modulo: string) => void;
  onDownload: (doc: Documento) => void;
  onViewMap?: (doc: Documento) => void;
  headBg?: string;
  downloadingDocId?: number | string | null;
  modulo: string;
}> = React.memo(({
  title, icon, documents, loading, onAddDocumento, onAddCondicionante, onEdit, onDelete, onDownload, onViewMap,
  headBg, downloadingDocId, modulo
}) => {
    const { documentosPrincipais, condicionantesDoGrupo } = useMemo(() => {
        const principais: Documento[] = [];
        const condicionantes: Documento[] = [];
        (documents || []).forEach(doc => {
            if (doc.condicionante === 'S') {
                condicionantes.push(doc);
            } else {
                principais.push(doc);
            }
        });
        return { documentosPrincipais: principais, condicionantesDoGrupo: condicionantes };
    }, [documents]);

    const [condicionantesExpanded, setCondicionantesExpanded] = useState(false);
    
    const renderDocumentCard = (doc: Documento) => {
        const { text, icon, tagStyles, cardStyles } = getStatusStyleProps(doc.dataValidade);
        return (
            <Card key={doc.id} bordered size="small" style={cardStyles}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                        <FileText size={32} color="var(--gcs-blue)" style={{ marginTop: '5px' }} />
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, auto)', gap: '8px 24px', flex: 1}}>
                            {doc.condicionante === 'S' && doc.tipo_condicionante_nome &&
                                <p style={{ 
                                    margin: '0 0 6px 0', 
                                    gridColumn: '1 / span 2', 
                                    fontWeight: 600, 
                                    color: 'var(--gcs-blue)', 
                                    fontSize: '0.9rem', 
                                    borderBottom: '1px solid #eee', 
                                    paddingBottom: '6px' 
                                }}>
                                    {doc.tipo_condicionante_nome}
                                </p>
                            }
                            <p style={{ margin: 0 }}><strong style={{color: 'var(--gcs-gray-dark)'}}>N° Documento:</strong> {doc.numero || '-'}</p>
                            <p style={{ margin: 0 }}><strong style={{color: 'var(--gcs-gray-dark)'}}>Órgão Emissor:</strong> {doc.orgaoEmissor || '-'}</p>
                            <p style={{ margin: 0 }}><strong style={{color: 'var(--gcs-gray-dark)'}}>Data Emissão:</strong> {formatDate(doc.dataEmissao)}</p>
                            <p style={{ margin: 0 }}><strong style={{color: 'var(--gcs-gray-dark)'}}>Data Validade:</strong> {formatDate(doc.dataValidade)}</p>
                            {doc.observacao && (
                                <p style={{ margin: 0, gridColumn: '1 / span 2', marginTop: '8px', paddingTop: '8px', borderTop: '1px dotted #ccc', whiteSpace: 'normal' }}>
                                    <strong>Observação:</strong> {doc.observacao}
                                </p>
                            )}
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', flexShrink: 0 }}>
                        <div style={tagStyles}>{icon}<span>{text}</span></div>
                        <div style={{display: 'flex', gap: '8px'}}>
                            {(doc.nomeArquivo?.toLowerCase().endsWith('.kml') || doc.nomeArquivo?.toLowerCase().endsWith('.kmz')) && onViewMap &&
                                <Tooltip title="Visualizar no Mapa"><Button icon={<Map size={16} />} onClick={() => onViewMap(doc)} className="btn-action-map" /></Tooltip>
                            }
                            <Tooltip title={doc.nomeArquivo || "Baixar Arquivo"}><Button icon={<Download size={16} />} onClick={() => onDownload(doc)} loading={downloadingDocId === doc.id} className="btn-action-download" /></Tooltip>
                            <Tooltip title="Editar Documento"><Button icon={<Edit size={16} />} onClick={() => onEdit(doc, modulo)} className="btn-action-edit" disabled={downloadingDocId === doc.id}/></Tooltip>
                            <Tooltip title="Excluir Documento"><Button icon={<Trash2 size={16} />} onClick={() => onDelete(doc, modulo)} className="btn-action-delete" disabled={downloadingDocId === doc.id} /></Tooltip>
                        </div>
                    </div>
                </div>
            </Card>
        );
    };

    return (
        <Card
          title={<div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><>{icon}</><span style={{ color: 'var(--gcs-blue)', fontWeight: 700, fontSize: '1.1rem' }}>{title}</span></div>}
          style={{ marginBottom: '1.5rem' }}
          headStyle={{ background: headBg ?? undefined, borderTopLeftRadius: 8, borderTopRightRadius: 8 }}
          extra={<Button icon={<Plus size={16} />} onClick={onAddDocumento} className="btn-outline-gcs-blue">Documento</Button>}
        >
          {loading ? (<div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100px'}}><Spin /></div>) : (
          <>
            {documentosPrincipais.length === 0 ? (
                <Empty description={<span style={{ color: 'var(--gcs-gray-dark)', fontStyle: 'italic' }}>Nenhum documento principal cadastrado.</span>} image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {documentosPrincipais.map(renderDocumentCard)}
                </div>
            )}

            <Divider style={{ margin: '24px 0' }} />
            <div style={{ padding: '8px', backgroundColor: '#F8F9FA', borderRadius: '8px' }}>
                <div onClick={() => setCondicionantesExpanded(!condicionantesExpanded)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                    <h4 style={{ margin: 0, color: 'var(--gcs-blue)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {condicionantesExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                        Condicionantes do Grupo ({condicionantesDoGrupo.length})
                    </h4>
                    <div className="ant-card-extra" style={{ float: 'none', marginLeft: 'auto' }}>
                        <Button
                            icon={<Plus size={16} />}
                            onClick={(e) => { e.stopPropagation(); onAddCondicionante(); }}
                            className="btn-outline-gcs-blue"
                            size="small"
                        >
                            Condicionante
                        </Button>
                    </div>
                </div>

                {condicionantesExpanded && (
                    <div style={{ marginTop: '16px', paddingLeft: '1rem', borderLeft: '2px solid var(--gcs-border-color)' }}>
                        {condicionantesDoGrupo.length === 0 ? (
                            <Empty description={<span style={{ color: 'var(--gcs-gray-dark)', fontStyle: 'italic' }}>Nenhuma condicionante cadastrada para este grupo.</span>} image={Empty.PRESENTED_IMAGE_SIMPLE} />
                        ) : (
                             <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {condicionantesDoGrupo.map(renderDocumentCard)}
                            </div>
                        )}
                    </div>
                )}
            </div>
          </>
          )}
        </Card>
    );
});
DocumentSection.displayName = 'DocumentSection';

const UPLOAD_CONFIGS = [
    { title: 'Certidão de Inteiro Teor da Matrícula', tipo: 'certidao_inteiro_teor', modulo: 'fundiario' },
    { title: 'Certidão de ITR', tipo: 'itr', modulo: 'fundiario' },
    { title: 'CCIR', tipo: 'ccir', modulo: 'fundiario' },
    { title: 'GEO', tipo: 'geo', modulo: 'fundiario' },
    { title: 'KML', tipo: 'kml', modulo: 'fundiario', allowedExtensions: ['.kml', '.kmz'], extensionsLabel: 'KML / KMZ' },
    { title: 'CIB', tipo: 'cib', modulo: 'fundiario' },
    { title: 'ASV (Autorização de Supressão Vegetal)', tipo: 'asv', modulo: 'ambiental' },
    { title: 'Licença Ambiental', tipo: 'licenca', modulo: 'ambiental' },
    { title: 'Outorga', tipo: 'outorga', modulo: 'ambiental' },
    { title: 'APPO (Autorização para Perfuração de Poço)', tipo: 'appo', modulo: 'ambiental' },
    { title: 'CAR (Cadastro Ambiental Rural)', tipo: 'car', modulo: 'ambiental' },
    { title: 'CEFIR (Cadastro Estadual Florestal de Imóveis Rurais)', tipo: 'cefir', modulo: 'ambiental' },
    { title: 'ADA', tipo: 'ada', modulo: 'cadastral_obrigacoes' },
    { title: 'ITR (Cadastral)', tipo: 'itr_cadastral', modulo: 'cadastral_obrigacoes' },
    { title: 'Relatórios', tipo: 'relatorio', modulo: 'cadastral_obrigacoes' },
    { title: 'Alvarás', tipo: 'alvara', modulo: 'cadastral_obrigacoes' },
    { title: 'Inventário de Resíduos', tipo: 'inventario_residuos', modulo: 'cadastral_obrigacoes' },
    { title: 'Certificado Bombeiros', tipo: 'certificado_bombeiros', modulo: 'cadastral_obrigacoes' },
    { title: 'CTF – Ibama', tipo: 'ctf_ibama', modulo: 'cadastral_obrigacoes' },
    { title: 'RAPP – Ibama', tipo: 'rapp_ibama', modulo: 'cadastral_obrigacoes' },
    { title: 'Certificado de Uso de Solo', tipo: 'certificado_uso_solo', modulo: 'cadastral_obrigacoes' },
];

const ModalGestao: React.FC<ModalGestaoProps> = ({ visible, onClose, empreendimento }) => {
  const [activeKey, setActiveKey] = useState('1');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [uploadModalState, setUploadModalState] = useState<{ open: boolean; config: typeof UPLOAD_CONFIGS[0] | null; ehCondicionante: 'S' | 'N'; }>({ open: false, config: null, ehCondicionante: 'N' });
  const [isMapaModalVisible, setIsMapaModalVisible] = useState(false);
  const [selectedKmlUrl, setSelectedKmlUrl] = useState<string | null>(null);
  const [kmlError, setKmlError] = useState<string | null>(null);
  const currentKmlUrlRef = useRef<string | null>(null);
  const [documentos, setDocumentos] = useState<Record<string, Documento[]>>({});
  const [loading, setLoading] = useState(true);
  const [downloadingDocId, setDownloadingDocId] = useState<number | string | null>(null);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [documentoParaEditar, setDocumentoParaEditar] = useState<Documento | null>(null);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [documentoParaExcluir, setDocumentoParaExcluir] = useState<Documento | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { notifySuccess, notifyError, NotificationComponent } = useNotify();
  const [moduloSelecionado, setModuloSelecionado] = useState<string>("");
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const lastFocusedElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => { if (visible && modalRef.current) { const { clientWidth, clientHeight } = modalRef.current; setPosition({ x: window.innerWidth / 2 - clientWidth / 2, y: window.innerHeight / 2 - clientHeight / 2 }); lastFocusedElementRef.current = document.activeElement as HTMLElement; modalRef.current.focus(); } }, [visible]);
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => { const t = e.target as HTMLElement; if (!modalRef.current || t.closest('button, input, textarea, select, label, .ant-tabs-tab')) return; setIsDragging(true); const modalRect = modalRef.current.getBoundingClientRect(); dragOffsetRef.current = { x: e.clientX - modalRect.left, y: e.clientY - modalRect.top }; };
  const handleMouseMove = useCallback((e: MouseEvent) => { if (!isDragging || !modalRef.current) return; e.preventDefault(); const modalRect = modalRef.current.getBoundingClientRect(); const x = clamp(e.clientX - dragOffsetRef.current.x, 8, window.innerWidth - modalRect.width - 8); const y = clamp(e.clientY - dragOffsetRef.current.y, 8, window.innerHeight - modalRect.height - 8); setPosition({ x, y }); }, [isDragging]);
  const handleMouseUp = useCallback(() => { setIsDragging(false); }, []);
  useEffect(() => { if (isDragging) { document.addEventListener('mousemove', handleMouseMove); document.addEventListener('mouseup', handleMouseUp); } return () => { document.removeEventListener('mousemove', handleMouseMove); document.removeEventListener('mouseup', handleMouseUp); }; }, [isDragging, handleMouseMove, handleMouseUp]);
  useEffect(() => { if (!visible) return; const prevOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') { onClose(); return; } if (e.key === 'Tab' && modalRef.current) { const focusableElements = modalRef.current.querySelectorAll<HTMLElement>( 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])' ); if (!focusableElements.length) return; const firstElement = focusableElements[0]; const lastElement = focusableElements[focusableElements.length - 1]; if (e.shiftKey) { if (document.activeElement === firstElement) { lastElement.focus(); e.preventDefault(); } } else { if (document.activeElement === lastElement) { firstElement.focus(); e.preventDefault(); } } } }; window.addEventListener('keydown', handleKeyDown); return () => { document.body.style.overflow = prevOverflow; window.removeEventListener('keydown', handleKeyDown); lastFocusedElementRef.current?.focus(); }; }, [visible, onClose]);
  
  const handleOpenUploadModal = useCallback((tipo: string, ehCondicionante: 'S' | 'N') => {
    const config = UPLOAD_CONFIGS.find(c => c.tipo === tipo);
    if (config) {
        setUploadModalState({ open: true, config, ehCondicionante });
    }
  }, []);

  const handleCloseUploadModal = useCallback(() => {
    setUploadModalState(prev => ({ ...prev, open: false }));
  }, []);
  
  const handleUploadComplete = useCallback((message: string) => {
    notifySuccess(message);
    setRefreshTrigger(t => t + 1);
    handleCloseUploadModal();
  }, [notifySuccess, handleCloseUploadModal]);
  
  useEffect(() => {
    if (visible && empreendimento) {
      const controller = new AbortController();
      let timedOut = false;
      const timeoutId = setTimeout(() => { timedOut = true; controller.abort(); }, 15000);
      
      const fetchAllDocuments = async () => {
        setLoading(true);
        try {
          const response = await fetch("/api/agrogestor/consulta-certidao", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ empreendimento_id: empreendimento.id }),
            signal: controller.signal
          });

          if (response.status === 204) { setDocumentos({}); return; }
          if (!response.ok) throw new Error(`Falha na API: ${response.statusText}`);
          const data: any[] = await response.json();
          
          const formattedData = data.map((doc: any) => ({ 
              id: doc.id_certidao,
              tipo: doc.tipo,
              numero: doc.numero_documento, 
              orgaoEmissor: doc.orgao, 
              dataEmissao: doc.data_emissao, 
              dataValidade: doc.data_validade, 
              nomeArquivo: doc.nome_arquivo,
              relKey: doc.relKey,
              observacao: doc.observacao || doc.observacoes || '',
              condicionante: doc.condicionante === 'S' ? 'S' : 'N',
              id_condicionante: doc.id_condicionante,
              tipo_condicionante_nome: doc.nome_condicionante,
          }));

          const groupedDocs = formattedData.reduce((acc, doc) => {
            const { tipo } = doc;
            if (!acc[tipo]) acc[tipo] = [];
            acc[tipo].push(doc);
            return acc;
          }, {} as Record<string, Documento[]>);

          setDocumentos(groupedDocs);

        } catch (error: any) {
          if (error.name === 'AbortError') { if (timedOut) notifyError('A busca por documentos demorou muito e foi cancelada.'); } 
          else { console.error(`Erro ao carregar documentos:`, error); notifyError('Falha ao carregar documentos.'); }
        } finally {
          clearTimeout(timeoutId);
          setLoading(false);
        }
      };
      fetchAllDocuments();
      return () => controller.abort();
    }
  }, [visible, empreendimento, refreshTrigger, notifyError]);
  
  const handleOpenMapaModal = useCallback(async (doc: Documento) => { if (!doc.relKey || !doc.nomeArquivo) return; setIsMapaModalVisible(true); setSelectedKmlUrl(null); setKmlError(null); const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 15000); try { const response = await fetch('/api/agrogestor/download-arquivo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ relKey: doc.relKey, nome_arquivo: doc.nomeArquivo }), signal: controller.signal, }); if (!response.ok) throw new Error('Não foi possível carregar o arquivo KML.'); const blob = await response.blob(); if (currentKmlUrlRef.current) URL.revokeObjectURL(currentKmlUrlRef.current); const url = URL.createObjectURL(blob); currentKmlUrlRef.current = url; setSelectedKmlUrl(url); } catch (error: any) { const message = error.name === 'AbortError' ? 'A requisição demorou muito.' : (error?.message || 'Não foi possível carregar o KML.'); setKmlError(message); } finally { clearTimeout(timer); } }, []);
  const handleCloseMapaModal = useCallback(() => { setIsMapaModalVisible(false); setKmlError(null); }, []);
  useEffect(() => { if (!isMapaModalVisible && currentKmlUrlRef.current) { URL.revokeObjectURL(currentKmlUrlRef.current); currentKmlUrlRef.current = null; } }, [isMapaModalVisible]);
  const handleDownload = useCallback(async (doc: Documento) => { if (!doc.relKey || !doc.nomeArquivo) return; setDownloadingDocId(doc.id); const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 15000); try { const response = await fetch('/api/agrogestor/download-arquivo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ relKey: doc.relKey, nome_arquivo: doc.nomeArquivo }), signal: controller.signal }); if (!response.ok) { const errorData = await response.json().catch(() => ({ message: 'Não foi possível baixar o arquivo.' })); throw new Error(errorData.message || 'Não foi possível baixar o arquivo.'); } const blob = await response.blob(); const disp = response.headers.get('content-disposition'); const suggested = disp?.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/)?.[1]; const ct = response.headers.get('content-type') || ''; const ext = ct.includes('pdf') ? '.pdf' : ct.includes('kml') ? '.kml' : ct.includes('zip') ? '.zip' : ''; const url = window.URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = suggested ? decodeURIComponent(suggested) : (doc.nomeArquivo || ('arquivo' + ext)); document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url); } catch (error: any) { const message = error.name === 'AbortError' ? 'O download demorou muito e foi cancelado.' : error.message; notifyError(message); } finally { clearTimeout(timer); setDownloadingDocId(null); } }, [notifyError]);
  const handleAbrirModalEdicao = useCallback((doc: Documento, modulo: string) => { setDocumentoParaEditar(doc); setModuloSelecionado(modulo); setIsEditModalVisible(true); }, []);
  const handleAbrirModalExclusao = useCallback((doc: Documento, modulo: string) => { setDocumentoParaExcluir(doc); setModuloSelecionado(modulo); setIsDeleteModalVisible(true); }, []);
  const handleConfirmarExclusao = useCallback(async () => { if (!documentoParaExcluir) return; setIsDeleting(true); try { const response = await fetch('/api/agrogestor/inativa-documento', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id_certidao: documentoParaExcluir.id, modulo: moduloSelecionado }), }); if (response.status === 204) { } else { const rawResult = await response.json().catch(() => ({ status: 'error', error: 'Falha ao processar a resposta do servidor.' })); const result = Array.isArray(rawResult) ? rawResult[0] : rawResult; if (!response.ok || !result || result.status !== 'ok') { throw new Error(result?.error || 'Falha ao excluir o documento.'); } } notifySuccess('Documento excluído com sucesso!'); setRefreshTrigger(t => t + 1); } catch (error: any) { notifyError(error.message); } finally { setIsDeleting(false); setIsDeleteModalVisible(false); } }, [documentoParaExcluir, moduloSelecionado, notifySuccess, notifyError]);
  
  const handleBackdropClick = () => { const isAnyUploadModalOpen = uploadModalState.open; if (isDeleting || downloadingDocId || isAnyUploadModalOpen) return; onClose(); }
  const HEAD_HIGHLIGHT = "rgba(0, 102, 204, 0.10)";
  
  const tabItems = useMemo<TabsProps['items']>(() => [
    {
      key: '1',
      label: <span style={{display:'flex',alignItems:'center',gap:8}}><Landmark size={18}/> Fundiário</span>,
      children: (
        <div style={{ padding:'1rem 1.5rem', overflowY:'auto', height:'calc(90vh - 140px)' }}>
            <DocumentSection modulo="fundiario" title="Certidão de Inteiro Teor da Matrícula" icon={<FileText size={20}/>} documents={documentos['certidao_inteiro_teor'] || []} loading={loading} onAddDocumento={() => handleOpenUploadModal('certidao_inteiro_teor', 'N')} onAddCondicionante={() => handleOpenUploadModal('certidao_inteiro_teor', 'S')} onEdit={handleAbrirModalEdicao} onDelete={handleAbrirModalExclusao} onDownload={handleDownload} downloadingDocId={downloadingDocId} headBg={HEAD_HIGHLIGHT} />
            <DocumentSection modulo="fundiario" title="Certidão de ITR" icon={<Recycle size={20}/>} documents={documentos['itr'] || []} loading={loading} onAddDocumento={() => handleOpenUploadModal('itr', 'N')} onAddCondicionante={() => handleOpenUploadModal('itr', 'S')} onEdit={handleAbrirModalEdicao} onDelete={handleAbrirModalExclusao} onDownload={handleDownload} downloadingDocId={downloadingDocId} headBg={HEAD_HIGHLIGHT} />
            <DocumentSection modulo="fundiario" title="CCIR" icon={<FileStack size={20}/>} documents={documentos['ccir'] || []} loading={loading} onAddDocumento={() => handleOpenUploadModal('ccir', 'N')} onAddCondicionante={() => handleOpenUploadModal('ccir', 'S')} onEdit={handleAbrirModalEdicao} onDelete={handleAbrirModalExclusao} onDownload={handleDownload} downloadingDocId={downloadingDocId} headBg={HEAD_HIGHLIGHT} />
            <DocumentSection modulo="fundiario" title="GEO" icon={<Trees size={20}/>} documents={documentos['geo'] || []} loading={loading} onAddDocumento={() => handleOpenUploadModal('geo', 'N')} onAddCondicionante={() => handleOpenUploadModal('geo', 'S')} onEdit={handleAbrirModalEdicao} onDelete={handleAbrirModalExclusao} onDownload={handleDownload} downloadingDocId={downloadingDocId} headBg={HEAD_HIGHLIGHT} />
            <DocumentSection modulo="fundiario" title="KML" icon={<FileUp size={20}/>} documents={documentos['kml'] || []} loading={loading} onAddDocumento={() => handleOpenUploadModal('kml', 'N')} onAddCondicionante={() => handleOpenUploadModal('kml', 'S')} onEdit={handleAbrirModalEdicao} onDelete={handleAbrirModalExclusao} onDownload={handleDownload} onViewMap={handleOpenMapaModal} downloadingDocId={downloadingDocId} headBg={HEAD_HIGHLIGHT} />
            <DocumentSection modulo="fundiario" title="CIB" icon={<FileStack size={20}/>} documents={documentos['cib'] || []} loading={loading} onAddDocumento={() => handleOpenUploadModal('cib', 'N')} onAddCondicionante={() => handleOpenUploadModal('cib', 'S')} onEdit={handleAbrirModalEdicao} onDelete={handleAbrirModalExclusao} onDownload={handleDownload} downloadingDocId={downloadingDocId} headBg={HEAD_HIGHLIGHT} />
        </div>
      )
    },
    {
      key: '2',
      label: <span style={{display:'flex',alignItems:'center',gap:8}}><Trees size={18}/> Ambiental</span>,
      children: (
        <div style={{ padding:'1rem 1.5rem', overflowY:'auto', height:'calc(90vh - 140px)' }}>
            <DocumentSection modulo="ambiental" title="ASV (Autorização de Supressão Vegetal)" icon={<Trees size={20} />} documents={documentos['asv'] || []} loading={loading} onAddDocumento={() => handleOpenUploadModal('asv', 'N')} onAddCondicionante={() => handleOpenUploadModal('asv', 'S')} onEdit={handleAbrirModalEdicao} onDelete={handleAbrirModalExclusao} onDownload={handleDownload} headBg={HEAD_HIGHLIGHT}/>
            <DocumentSection modulo="ambiental" title="Licença Ambiental (Licença estadual, municipal e federal)" icon={<ShieldCheck size={20} />} documents={documentos['licenca'] || []} loading={loading} onAddDocumento={() => handleOpenUploadModal('licenca', 'N')} onAddCondicionante={() => handleOpenUploadModal('licenca', 'S')} onEdit={handleAbrirModalEdicao} onDelete={handleAbrirModalExclusao} onDownload={handleDownload} headBg={HEAD_HIGHLIGHT}/>
            <DocumentSection modulo="ambiental" title="Outorga" icon={<Waves size={20} />} documents={documentos['outorga'] || []} loading={loading} onAddDocumento={() => handleOpenUploadModal('outorga', 'N')} onAddCondicionante={() => handleOpenUploadModal('outorga', 'S')} onEdit={handleAbrirModalEdicao} onDelete={handleAbrirModalExclusao} onDownload={handleDownload} headBg={HEAD_HIGHLIGHT}/>
            <DocumentSection modulo="ambiental" title="APPO (Autorização para Perfuração de Poço)" icon={<Waves size={20} />} documents={documentos['appo'] || []} loading={loading} onAddDocumento={() => handleOpenUploadModal('appo', 'N')} onAddCondicionante={() => handleOpenUploadModal('appo', 'S')} onEdit={handleAbrirModalEdicao} onDelete={handleAbrirModalExclusao} onDownload={handleDownload} headBg={HEAD_HIGHLIGHT}/>
            <DocumentSection modulo="ambiental" title="CAR (Cadastro Ambiental Rural)" icon={<FileText size={20} />} documents={documentos['car'] || []} loading={loading} onAddDocumento={() => handleOpenUploadModal('car', 'N')} onAddCondicionante={() => handleOpenUploadModal('car', 'S')} onEdit={handleAbrirModalEdicao} onDelete={handleAbrirModalExclusao} onDownload={handleDownload} headBg={HEAD_HIGHLIGHT}/>
            <DocumentSection modulo="ambiental" title="CEFIR (Cadastro Estadual Florestal de Imóveis Rurais)" icon={<FileText size={20} />} documents={documentos['cefir'] || []} loading={loading} onAddDocumento={() => handleOpenUploadModal('cefir', 'N')} onAddCondicionante={() => handleOpenUploadModal('cefir', 'S')} onEdit={handleAbrirModalEdicao} onDelete={handleAbrirModalExclusao} onDownload={handleDownload} headBg={HEAD_HIGHLIGHT}/>
        </div>
      )
    },
    {
      key: '3',
      label: <span style={{display:'flex',alignItems:'center',gap:8}}><Building size={18}/> Cadastral / Obrigações</span>,
      children: (
        <div style={{ padding:'1rem 1.5rem', overflowY:'auto', height:'calc(90vh - 140px)' }}>
            <DocumentSection modulo="cadastral_obrigacoes" title="ADA" icon={<FileText size={20} />} documents={documentos['ada'] || []} loading={loading} onAddDocumento={() => handleOpenUploadModal('ada', 'N')} onAddCondicionante={() => handleOpenUploadModal('ada', 'S')} onEdit={handleAbrirModalEdicao} onDelete={handleAbrirModalExclusao} onDownload={handleDownload} headBg={HEAD_HIGHLIGHT} />
            <DocumentSection modulo="cadastral_obrigacoes" title="ITR (Cadastral)" icon={<Recycle size={20} />} documents={documentos['itr_cadastral'] || []} loading={loading} onAddDocumento={() => handleOpenUploadModal('itr_cadastral', 'N')} onAddCondicionante={() => handleOpenUploadModal('itr_cadastral', 'S')} onEdit={handleAbrirModalEdicao} onDelete={handleAbrirModalExclusao} onDownload={handleDownload} headBg={HEAD_HIGHLIGHT} />
            <DocumentSection modulo="cadastral_obrigacoes" title="Relatórios" icon={<FileStack size={20} />} documents={documentos['relatorio'] || []} loading={loading} onAddDocumento={() => handleOpenUploadModal('relatorio', 'N')} onAddCondicionante={() => handleOpenUploadModal('relatorio', 'S')} onEdit={handleAbrirModalEdicao} onDelete={handleAbrirModalExclusao} onDownload={handleDownload} headBg={HEAD_HIGHLIGHT} />
            <DocumentSection modulo="cadastral_obrigacoes" title="Alvarás" icon={<CalendarCheck size={20} />} documents={documentos['alvara'] || []} loading={loading} onAddDocumento={() => handleOpenUploadModal('alvara', 'N')} onAddCondicionante={() => handleOpenUploadModal('alvara', 'S')} onEdit={handleAbrirModalEdicao} onDelete={handleAbrirModalExclusao} onDownload={handleDownload} headBg={HEAD_HIGHLIGHT} />
            <DocumentSection modulo="cadastral_obrigacoes" title="Inventário de Resíduos" icon={<Trash2 size={20} />} documents={documentos['inventario_residuos'] || []} loading={loading} onAddDocumento={() => handleOpenUploadModal('inventario_residuos', 'N')} onAddCondicionante={() => handleOpenUploadModal('inventario_residuos', 'S')} onEdit={handleAbrirModalEdicao} onDelete={handleAbrirModalExclusao} onDownload={handleDownload} headBg={HEAD_HIGHLIGHT} />
            <DocumentSection modulo="cadastral_obrigacoes" title="Certificado Bombeiros" icon={<Siren size={20} />} documents={documentos['certificado_bombeiros'] || []} loading={loading} onAddDocumento={() => handleOpenUploadModal('certificado_bombeiros', 'N')} onAddCondicionante={() => handleOpenUploadModal('certificado_bombeiros', 'S')} onEdit={handleAbrirModalEdicao} onDelete={handleAbrirModalExclusao} onDownload={handleDownload} headBg={HEAD_HIGHLIGHT} />
            <DocumentSection modulo="cadastral_obrigacoes" title="CTF – Ibama" icon={<ShieldCheck size={20} />} documents={documentos['ctf_ibama'] || []} loading={loading} onAddDocumento={() => handleOpenUploadModal('ctf_ibama', 'N')} onAddCondicionante={() => handleOpenUploadModal('ctf_ibama', 'S')} onEdit={handleAbrirModalEdicao} onDelete={handleAbrirModalExclusao} onDownload={handleDownload} headBg={HEAD_HIGHLIGHT} />
            <DocumentSection modulo="cadastral_obrigacoes" title="RAPP – Ibama" icon={<ClipboardList size={20} />} documents={documentos['rapp_ibama'] || []} loading={loading} onAddDocumento={() => handleOpenUploadModal('rapp_ibama', 'N')} onAddCondicionante={() => handleOpenUploadModal('rapp_ibama', 'S')} onEdit={handleAbrirModalEdicao} onDelete={handleAbrirModalExclusao} onDownload={handleDownload} headBg={HEAD_HIGHLIGHT} />
            <DocumentSection modulo="cadastral_obrigacoes" title="Certificado de Uso de Solo" icon={<MapPin size={20} />} documents={documentos['certificado_uso_solo'] || []} loading={loading} onAddDocumento={() => handleOpenUploadModal('certificado_uso_solo', 'N')} onAddCondicionante={() => handleOpenUploadModal('certificado_uso_solo', 'S')} onEdit={handleAbrirModalEdicao} onDelete={handleAbrirModalExclusao} onDownload={handleDownload} headBg={HEAD_HIGHLIGHT} />
        </div>
      )
    }
  ], [documentos, loading, downloadingDocId, handleOpenUploadModal, handleAbrirModalEdicao, handleAbrirModalExclusao, handleDownload, handleOpenMapaModal]);

  if (!visible || !empreendimento) return null;

  return (
    <>
      <div style={{ position: 'fixed', top:0, left:0, width:'100vw', height:'100vh', backgroundColor:'rgba(0,0,0,0.6)', zIndex: 1000 }} onClick={handleBackdropClick} />
      <div 
        ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="modal-title" tabIndex={-1}
        style={{ position: 'fixed', top: `${position.y}px`, left: `${position.x}px`, backgroundColor: 'white', borderRadius: '12px', zIndex: 1001, width: '95%', maxWidth: '1200px', height: '90vh', display: 'flex', flexDirection: 'column' }}
      >
        <div onMouseDown={handleMouseDown} style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #dee2e6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f1f5fb', cursor: isDragging ? 'grabbing' : 'grab' }}>
          <div>
            <h3 id="modal-title" style={{ margin: 0, color: 'var(--gcs-blue)' }}>Gestão de Documentos</h3>
            <p style={{ margin: 0, color: 'var(--gcs-gray-dark)', fontWeight: 'bold' }}>
              Empreendimento: {empreendimento.nome}
              {empreendimento.numero_matricula && ` | Matrícula: ${empreendimento.numero_matricula}`}
            </p>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}><X size={24} color="var(--gcs-gray-dark)"/></button>
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <Tabs items={tabItems} activeKey={activeKey} onChange={setActiveKey} tabPosition="left" style={{ height: '100%' }} animated={{ inkBar: true, tabPane: true }} />
        </div>
        <div style={{ padding:'1rem 1.5rem', borderTop:'1px solid #dee2e6', display:'flex', justifyContent:'flex-end' }}>
          <Button onClick={onClose} size="large" className="btn-gcs-blue" disabled={isDeleting}>Fechar</Button>
        </div>
      </div>
      
      {uploadModalState.open && uploadModalState.config && (
        <ModalUploadGenerico
            key={uploadModalState.config.tipo + uploadModalState.ehCondicionante}
            title={uploadModalState.config.title}
            tipoDocumento={uploadModalState.config.tipo}
            modulo={uploadModalState.config.modulo}
            allowedExtensions={uploadModalState.config.allowedExtensions}
            extensionsLabel={uploadModalState.config.extensionsLabel}
            open={uploadModalState.open}
            onClose={handleCloseUploadModal}
            empreendimento={empreendimento}
            onUploadComplete={handleUploadComplete}
            notifyError={notifyError}
            ehCondicionante={uploadModalState.ehCondicionante}
        />
      )}

      <ModalEditarDocumento 
        visible={isEditModalVisible} 
        onClose={() => setIsEditModalVisible(false)} 
        documento={documentoParaEditar} 
        empreendimento={empreendimento} 
        modulo={moduloSelecionado} 
        onSuccess={() => { setIsEditModalVisible(false); setRefreshTrigger(t => t + 1); }}
      />
      <ModalConfirmarExclusao visible={isDeleteModalVisible} onClose={() => setIsDeleteModalVisible(false)} onConfirm={handleConfirmarExclusao} loading={isDeleting} />
      {NotificationComponent}

      {isMapaModalVisible && (
        <>
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 2400 }} onClick={handleCloseMapaModal} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 2401, width: '90%', maxWidth: '800px', backgroundColor: 'white', borderRadius: '12px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #dee2e6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, color: 'var(--gcs-blue)' }}><Map size={20}/> Visualizador de Limites</h3>
                <button type="button" onClick={handleCloseMapaModal} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24}/></button>
            </div>
            <div style={{ padding: '1.5rem', minHeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {kmlError ? ( <div style={{ textAlign: 'center', color: '#E03131' }}> <AlertTriangle size={32} style={{ marginBottom: '1rem' }} /> <p style={{ margin: 0, fontWeight: 'bold' }}>Erro ao carregar o mapa</p> <p style={{ margin: '0.5rem 0 0 0', fontSize: '14px' }}>{kmlError}</p> </div> ) : !selectedKmlUrl ? ( <Spin size="large" /> ) : ( <MapaKML urlKML={selectedKmlUrl} /> )}
            </div>
             <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #dee2e6', display: 'flex', justifyContent: 'flex-end' }}>
                <Button onClick={handleCloseMapaModal}>Fechar</Button>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default ModalGestao;