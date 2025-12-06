"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Tabs, Button, Spin, Radio, Empty } from "antd";
import type { TabsProps } from 'antd';
import {
  X, FileText, Plus, Edit, Trash2, Landmark, Waves, Trees, FileStack,
  CalendarCheck, ShieldCheck, Building, Siren, Recycle, FileUp, AlertTriangle, Map,
  ClipboardList, MapPin, Search, Save, Ban, Loader2
} from 'lucide-react';
import "antd/dist/reset.css";
import NotificationModal from "./NotificationModal";
import dynamic from 'next/dynamic';
import { useSession } from "next-auth/react";

// --- IMPORTANDO OS COMPONENTES ---
import DocumentSection, { Documento, Ocorrencia } from "./DocumentSection";
import ModalOcorrencia from "./ModalOcorrencia";

const MapaKML = dynamic(() => import('./MapaKML'), {
  ssr: false,
  loading: () => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
      <Spin size="large" />
      <span style={{ marginLeft: '1rem', color: 'var(--gcs-dark-text-primary)' }}>Carregando mapa...</span>
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

interface TipoCondicionante {
    id: number;
    nome: string;
}

export interface CondicionanteCRUD {
  id: number;
  documento: string; 
  nome: string;
  status: string; // 'A' para Ativo, 'I' para Inativo
}

interface ModalGestaoProps {
  visible: boolean;
  onClose: () => void;
  empreendimento: Empreendimento | null;
}

/* ========================================================================
    Hook de Notificação (Reutilizável)
    ======================================================================== */
function useNotify() {
    // Tipagem explícita para permitir 'success' ou 'error'
    const [notification, setNotification] = useState<{
        visible: boolean;
        type: 'success' | 'error';
        message: string;
    }>({ visible: false, type: 'success', message: '' });
    
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
                disabled={true} 
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
    // --- Hooks Drag & Drop ---
    const modalRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const dragOffsetRef = useRef({ x: 0, y: 0 });

    useEffect(() => { 
        if (visible && modalRef.current) { 
            const { clientWidth, clientHeight } = modalRef.current; 
            setPosition({ x: window.innerWidth / 2 - clientWidth / 2, y: window.innerHeight / 2 - clientHeight / 2 });
            setFormData(initialData || { documento: '', nome: '', status: 'A' }); 
        } 
    }, [initialData, visible]);

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => { 
        const t = e.target as HTMLElement; 
        if (!modalRef.current || t.closest('button, input, select')) return; 
        setIsDragging(true); 
        const modalRect = modalRef.current.getBoundingClientRect(); 
        dragOffsetRef.current = { x: e.clientX - modalRect.left, y: e.clientY - modalRect.top }; 
    };
    const handleMouseMove = useCallback((e: MouseEvent) => { 
        if (!isDragging || !modalRef.current) return; 
        e.preventDefault(); 
        setPosition({ 
            x: e.clientX - dragOffsetRef.current.x, 
            y: e.clientY - dragOffsetRef.current.y 
        }); 
    }, [isDragging]);
    const handleMouseUp = useCallback(() => { setIsDragging(false); }, []);
    useEffect(() => { if (isDragging) { document.addEventListener('mousemove', handleMouseMove); document.addEventListener('mouseup', handleMouseUp); } return () => { document.removeEventListener('mousemove', handleMouseMove); document.removeEventListener('mouseup', handleMouseUp); }; }, [isDragging, handleMouseMove, handleMouseUp]);

    if (!visible) return null;

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: name === 'nome' ? value.toUpperCase() : value }));
    };
    const handleSaveClick = () => {
        if (isSaving) return;
        if (!formData.documento || !formData.nome) { alert("Os campos com * são obrigatórios."); return; }
        onSave(formData);
    };
    return (
        <>
            <div onClick={isSaving ? undefined : onClose} className="modal-overlay-backdrop"></div>
            <div ref={modalRef} className="modal-overlay-glass" style={{ top: `${position.y}px`, left: `${position.x}px`, width: '90%', maxWidth: '700px' }}>
                <div onMouseDown={handleMouseDown} className="modal-gestao-header">
                    <h3 className="modal-gestao-title"><FileText size={18} style={{marginRight: '10px'}}/> Incluir Nova Condicionante</h3>
                    <button onClick={isSaving ? undefined : onClose} disabled={isSaving} className="modal-gestao-close-btn"><X size={20} /></button>
                </div>
                <div style={{ padding: '1.5rem' }}> <FormFieldsCondicionante formData={formData} disabled={isSaving} handleInputChange={handleInputChange} /> </div>
                <div className="modal-gestao-footer">
                    {isSaving ? (<div style={{display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--gcs-blue)'}}><Loader2 size={20} className="animate-spin" /><span>Incluindo...</span></div>) : (<><button onClick={onClose} className="btn btn-outline-gray"><Ban size={16} /> Cancelar</button><button onClick={handleSaveClick} className="btn btn-green"><Save size={16} /> Salvar</button></>)}
                </div>
            </div>
        </>
    );
};

const ModalBuscaCondicionante: React.FC<{
    open: boolean; onClose: () => void; onSelect: (condicionante: TipoCondicionante) => void; tipoDocumento: string;
}> = ({ open, onClose, onSelect, tipoDocumento }) => {
    const [resultados, setResultados] = useState<TipoCondicionante[]>([]);
    const [loading, setLoading] = useState(false);
    const [selecionado, setSelecionado] = useState<TipoCondicionante | null>(null);
    const { notifyError, notifySuccess, NotificationComponent } = useNotify();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // --- Hooks Drag & Drop ---
    const modalRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const dragOffsetRef = useRef({ x: 0, y: 0 });

    useEffect(() => { 
        if (open && modalRef.current) { 
            const { clientWidth, clientHeight } = modalRef.current; 
            setPosition({ x: window.innerWidth / 2 - clientWidth / 2, y: window.innerHeight / 2 - clientHeight / 2 }); 
        } 
    }, [open]);
    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => { const t = e.target as HTMLElement; if (!modalRef.current || t.closest('button, input, radio')) return; setIsDragging(true); const modalRect = modalRef.current.getBoundingClientRect(); dragOffsetRef.current = { x: e.clientX - modalRect.left, y: e.clientY - modalRect.top }; };
    const handleMouseMove = useCallback((e: MouseEvent) => { 
        if (!isDragging || !modalRef.current) return; 
        e.preventDefault(); 
        setPosition({ 
            x: e.clientX - dragOffsetRef.current.x, 
            y: e.clientY - dragOffsetRef.current.y 
        }); 
    }, [isDragging]);
    const handleMouseUp = useCallback(() => { setIsDragging(false); }, []);
    useEffect(() => { if (isDragging) { document.addEventListener('mousemove', handleMouseMove); document.addEventListener('mouseup', handleMouseUp); } return () => { document.removeEventListener('mousemove', handleMouseMove); document.removeEventListener('mouseup', handleMouseUp); }; }, [isDragging, handleMouseMove, handleMouseUp]);

    const fetchTipos = useCallback(async () => {
        setLoading(true); setResultados([]); setSelecionado(null);
        try {
            const res = await fetch('/api/agrogestor/condicionantes/consulta-condicionantes-tipo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo_documento: tipoDocumento }) });
            if (!res.ok) throw new Error('Falha ao buscar os tipos de condicionante.');
            const data = await res.json();
            setResultados(Array.isArray(data) ? data : []);
        } catch (error: any) { notifyError(error.message); } finally { setLoading(false); }
    }, [tipoDocumento, notifyError]);

    useEffect(() => { if (open) fetchTipos(); }, [open, fetchTipos]);
    const handleConfirmar = () => { if (selecionado) { onSelect(selecionado); onClose(); } };
    const handleSaveCondicionante = async (data: Partial<CondicionanteCRUD>) => {
        setIsSaving(true);
        try {
            const response = await fetch('/api/agrogestor/condicionantes/inclui-condicionantes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
            const result = await response.json();
            if (!response.ok || !result || (Array.isArray(result) && result[0]?.status !== 'ok')) throw new Error(result[0]?.message || 'Falha ao incluir a condicionante.');
            notifySuccess('Condicionante incluída com sucesso!'); setIsAddModalOpen(false); fetchTipos();
        } catch (error: any) { notifyError(error.message); } finally { setIsSaving(false); }
    };

    if (!open) return null;
    return (
        <>
            <div className="modal-overlay-backdrop" />
            <div ref={modalRef} className="modal-overlay-glass" style={{ top: `${position.y}px`, left: `${position.x}px`, width: '90%', maxWidth: '500px' }}>
                <div onMouseDown={handleMouseDown} className="modal-gestao-header">
                    <h3 className="modal-gestao-title">Selecionar Tipo</h3>
                    <button onClick={onClose} className="modal-gestao-close-btn"><X size={20}/></button>
                </div>
                <div style={{ padding: '1.5rem', maxHeight: '400px', overflowY: 'auto' }}>
                    {loading ? (
                        <div style={{textAlign: 'center'}}><Spin /></div>
                    ) : resultados && resultados.filter(item => item && item.id != null).length > 0 ? (
                        <Radio.Group onChange={(e) => setSelecionado(e.target.value)} value={selecionado}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {resultados.filter(item => item && item.id != null).map(item => (
                                    /* ALTERAÇÃO AQUI: Removido estilo inline e adicionada classe CSS */
                                    <Radio key={item.id} value={item} className="radio-option-text">
                                        {item.nome}
                                    </Radio>
                                ))}
                            </div>
                        </Radio.Group>
                    ) : (
                        <Empty description={<span style={{color: 'var(--gcs-gray-text)'}}>Nenhum tipo encontrado.</span>}/>
                    )}
                </div>
                <div className="modal-gestao-footer" style={{justifyContent: 'space-between'}}>
                    <button onClick={() => setIsAddModalOpen(true)} className="btn btn-gcs-blue"><Plus size={16} /> Incluir Nova</button>
                    <div style={{display: 'flex', gap: 8}}><button onClick={onClose} className="btn btn-outline-gray">Cancelar</button><button onClick={handleConfirmar} disabled={!selecionado} className="btn btn-green">Confirmar</button></div>
                </div>
            </div>
            {NotificationComponent}
            <ModalCondicionante visible={isAddModalOpen} initialData={{ documento: tipoDocumento, status: 'A' }} onClose={() => setIsAddModalOpen(false)} onSave={handleSaveCondicionante} isSaving={isSaving} />
        </>
    );
};

const CamposCondicionante: React.FC<{ tipoCondicionanteNome: string; onSearchClick: () => void; }> = ({ tipoCondicionanteNome, onSearchClick }) => (
    <>
        <div>
            <label className="modal-label">Tipo de Condicionante *</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="text" readOnly className="modal-input" value={tipoCondicionanteNome || ""} placeholder="Clique na lupa para pesquisar" style={{ flex: 1 }} />
                <Button icon={<Search size={16} />} onClick={onSearchClick}>Pesquisar</Button>
            </div>
        </div>
        <div>
            <label className="modal-label">Descrição da Condicionante</label>
            <textarea readOnly className="modal-input" value={tipoCondicionanteNome} rows={3} style={{ width: "100%", resize: "none" }} />
        </div>
    </>
);

const ModalUploadGenerico: React.FC<{ title: string; tipoDocumento: string; modulo: string; allowedExtensions?: string[]; extensionsLabel?: string; open: boolean; onClose: () => void; empreendimento: Empreendimento; onUploadComplete: (message: string) => void; notifyError: (message: string) => void; ehCondicionante: 'S' | 'N'; }> = ({ title, tipoDocumento, modulo, allowedExtensions = [".pdf", ".jpg", ".jpeg", ".png", ".tif", ".tiff", ".zip"], extensionsLabel = "PDF/JPG/PNG/TIF/ZIP", open, onClose, empreendimento, onUploadComplete, notifyError, ehCondicionante }) => {
  const [numero, setNumero] = useState<string>(""); const [orgao, setOrgao] = useState<string>(""); const [dataEmissao, setDataEmissao] = useState<string>(""); const [dataValidade, setDataValidade] = useState<string>(""); const [file, setFile] = useState<File | null>(null); const [observacao, setObservacao] = useState<string>(""); const [idCondicionante, setIdCondicionante] = useState<string>(""); const [tipoCondicionanteNome, setTipoCondicionanteNome] = useState<string>(""); const [sending, setSending] = useState<boolean>(false); const [buscaModalOpen, setBuscaModalOpen] = useState(false); const [position, setPosition] = useState({ x: 0, y: 0 }); const [isDragging, setIsDragging] = useState(false); const modalRef = useRef<HTMLDivElement>(null); const dragOffsetRef = useRef({ x: 0, y: 0 });
  useEffect(() => { if (open && modalRef.current) { const { clientWidth, clientHeight } = modalRef.current; setPosition({ x: window.innerWidth / 2 - clientWidth / 2, y: window.innerHeight / 2 - clientHeight / 2 }); modalRef.current.focus(); } }, [open]);
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => { const t = e.target as HTMLElement; if (!modalRef.current || t.closest('button, input, textarea, select, label')) return; setIsDragging(true); const modalRect = modalRef.current.getBoundingClientRect(); dragOffsetRef.current = { x: e.clientX - modalRect.left, y: e.clientY - modalRect.top }; };
  
  // --- ALTERAÇÃO AQUI: Funções de drag com useCallback para serem usadas no useEffect ---
  const handleMouseMove = useCallback((e: MouseEvent) => { 
      if (!isDragging || !modalRef.current) return; 
      e.preventDefault(); 
      setPosition({ x: e.clientX - dragOffsetRef.current.x, y: e.clientY - dragOffsetRef.current.y }); 
  }, [isDragging]);

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

  useEffect(() => { if (!open) return; const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') { onClose(); } }; window.addEventListener('keydown', handleKeyDown); return () => { window.removeEventListener('keydown', handleKeyDown); }; }, [open, onClose]);
  useEffect(() => { if (!open) { setNumero(""); setOrgao(""); setDataEmissao(""); setDataValidade(""); setFile(null); setObservacao(""); setIdCondicionante(""); setTipoCondicionanteNome(""); setSending(false); } }, [open]);
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0] || null; if (!f) { setFile(null); return; } const fName = f.name.toLowerCase(); const okExt = allowedExtensions.some((ext) => fName.endsWith(ext.toLowerCase())); if (!okExt) { notifyError(`Extensão não permitida. Use ${extensionsLabel}.`); return; } if (f.size > 30 * 1024 * 1024) { notifyError("Arquivo acima de 30MB."); return; } setFile(f); };
  const handleSelectCondicionante = (condicionante: TipoCondicionante) => { setIdCondicionante(condicionante.id.toString()); setTipoCondicionanteNome(condicionante.nome); };
  const submit = async () => { 
      // Validações
      if (ehCondicionante === 'S' && !idCondicionante) { notifyError("Selecione um Tipo de Condicionante."); return; } 
      if (!file) { notifyError("Selecione um arquivo."); return; } 
      if (!numero || !dataEmissao) { notifyError("Preencha Número do Documento e Data de Emissão."); return; } 
      if (dataValidade && dataEmissao) { const em = new Date(dataEmissao); em.setUTCHours(0,0,0,0); const va = new Date(dataValidade); va.setUTCHours(0,0,0,0); if (va < em) { notifyError("A data de validade não pode ser anterior à data de emissão."); return; } } 
      
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
          if (ehCondicionante === 'S') { fd.append("id_condicionante", idCondicionante); } 
          fd.append("file", file, file.name); 
          
          console.log("Enviando para API:", url);
          const resp = await fetch(url, { method: "POST", body: fd, signal: controller.signal }); 
          const rawResult = await resp.json().catch(() => ({ status: 'error', error: `Falha ao processar a resposta do servidor (${resp.status})` })); 
          const result = Array.isArray(rawResult) ? rawResult[0] : rawResult; 
          
          if (!resp.ok || !result || result.status !== 'ok') { 
              throw new Error(result?.error || `Ocorreu um erro desconhecido (${resp.status})`); 
          } 
          const successMessage = result.message || ( ehCondicionante === 'S' ? `Condicionante para ${title} enviada para processamento com sucesso!` : `${title} enviado para processamento com sucesso!` ); 
          onUploadComplete(successMessage); 
      } catch (err: any) { 
          console.error("Erro no submit:", err);
          notifyError(err.name === 'AbortError' ? 'A requisição demorou muito e foi cancelada.' : (err?.message || "Erro ao enviar.")); 
      } finally { 
          clearTimeout(timer); 
          setSending(false); 
      } 
  };
  if (!open) return null;
  return ( <><div className="modal-overlay-backdrop" /><div ref={modalRef} className="modal-overlay-glass" role="dialog" aria-modal="true" aria-labelledby="upload-title" tabIndex={-1} style={{ top: `${position.y}px`, left: `${position.x}px`, width: "95%", maxWidth: 640 }}>
    <div onMouseDown={handleMouseDown} className="modal-gestao-header">
        <div>
            <h3 id="upload-title" className="modal-gestao-title">{ehCondicionante === 'S' ? `Adicionar Condicionante para ${title}` : `Adicionar ${title}`}</h3>
            <p className="modal-detalhes-subtitle">Empreendimento: {empreendimento.nome}{empreendimento.numero_matricula && ` | Matrícula: ${empreendimento.numero_matricula}`}</p>
        </div>
        <button type="button" onClick={() => { if (!sending) onClose(); }} className="modal-gestao-close-btn" disabled={sending}><X size={24}/></button>
    </div>
    <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: "12px", opacity: sending ? 0.6 : 1, pointerEvents: sending ? "none" : "auto" }}>
        {ehCondicionante === 'S' && (<CamposCondicionante tipoCondicionanteNome={tipoCondicionanteNome} onSearchClick={() => setBuscaModalOpen(true)} />)}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 16px" }}>
            <div><label className="modal-label">Número do Documento *</label><input className="modal-input" value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="Número de identificação" style={{ width: "100%" }} /></div>
            <div><label className="modal-label">Órgão Emissor</label><input className="modal-input" value={orgao} onChange={(e) => setOrgao(e.target.value)} placeholder="Órgão responsável" style={{ width: "100%" }} /></div>
            <div><label className="modal-label">Data de Emissão *</label><input className="modal-input" type="date" value={dataEmissao} onChange={(e) => setDataEmissao(e.target.value)} style={{ width: "100%" }} /></div>
            <div><label className="modal-label">Data de Validade</label><input className="modal-input" type="date" value={dataValidade} onChange={(e) => setDataValidade(e.target.value)} style={{ width: "100%" }} /></div>
        </div>
        <div>
            <label className="modal-label">Arquivo ({extensionsLabel} até 30MB) *</label>
            <input type="file" onChange={handleFile} accept={allowedExtensions.join(',')} className="modal-input" style={{padding: '8px'}}/>
            {file && (<div style={{ marginTop: 6, fontSize: 12, color: "var(--gcs-gray-text)" }}> {file.name} — {(file.size / 1024 / 1024).toFixed(2)} MB </div>)}
        </div>
        <div>
            <label className="modal-label">Observação</label>
            <textarea className="modal-input" value={observacao} onChange={(e) => setObservacao(e.target.value)} maxLength={250} placeholder="Observações sobre o documento..." rows={3} style={{ width: "100%", resize: "vertical" }} /><div style={{ textAlign: 'right', fontSize: '12px', color: '#888', marginTop: '4px' }}>{250 - observacao.length} caracteres restantes</div>
        </div>
    </div>
    <div className="modal-gestao-footer">
        <button type="button" className="btn btn-outline-gray" onClick={() => { if (!sending) onClose(); }} disabled={sending}>Fechar</button>
        <button type="button" className="btn btn-green" onClick={submit} disabled={sending}>{sending ? "Enviando..." : "Salvar & Enviar"}</button>
    </div>
    {sending && (<div style={{ position: "absolute", inset: 0, background: "var(--gcs-dark-bg-heavy)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, zIndex: 2102, borderRadius: 12 }}><Spin size="large" /><div style={{ color: "var(--gcs-dark-text-primary)", fontWeight: 600 }}>Enviando arquivo…</div></div>)}
    </div><ModalBuscaCondicionante open={buscaModalOpen} onClose={() => setBuscaModalOpen(false)} onSelect={handleSelectCondicionante} tipoDocumento={tipoDocumento} /></> );
};

const ModalEditarDocumento: React.FC<{ visible: boolean; onClose: () => void; documento: Documento | null; empreendimento: Empreendimento | null; modulo: string; onSuccess: () => void; }> = ({ visible, onClose, documento, empreendimento, modulo, onSuccess }) => {
    const [numero, setNumero] = useState(""); const [orgao, setOrgao] = useState(""); const [dataEmissao, setDataEmissao] = useState(""); const [dataValidade, setDataValidade] = useState(""); const [observacao, setObservacao] = useState(""); const [idCondicionante, setIdCondicionante] = useState<string>(""); const [tipoCondicionanteNome, setTipoCondicionanteNome] = useState<string>(""); const [loading, setLoading] = useState(false); const { notifyError, notifySuccess, NotificationComponent } = useNotify(); const modalRef = useRef<HTMLDivElement>(null); const [buscaModalOpen, setBuscaModalOpen] = useState(false);
    // --- Hooks Drag & Drop ---
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const dragOffsetRef = useRef({ x: 0, y: 0 });

    useEffect(() => { if (documento) { setNumero(documento.numero || ""); setOrgao(documento.orgaoEmissor || ""); setObservacao(documento.observacao || ""); try { setDataEmissao(documento.dataEmissao ? new Date(documento.dataEmissao).toISOString().split('T')[0] : ""); } catch { setDataEmissao(""); } try { setDataValidade(documento.dataValidade ? new Date(documento.dataValidade).toISOString().split('T')[0] : ""); } catch { setDataValidade(""); } if(documento.condicionante === 'S' && documento.id_condicionante) { setIdCondicionante(documento.id_condicionante.toString()); setTipoCondicionanteNome(documento.tipo_condicionante_nome || ""); } else { setIdCondicionante(""); setTipoCondicionanteNome(""); } } }, [documento]);
    useEffect(() => { if (visible && modalRef.current) { const { clientWidth, clientHeight } = modalRef.current; setPosition({ x: window.innerWidth / 2 - clientWidth / 2, y: window.innerHeight / 2 - clientHeight / 2 }); } }, [visible]);

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => { const t = e.target as HTMLElement; if (!modalRef.current || t.closest('button, input, textarea')) return; setIsDragging(true); const modalRect = modalRef.current.getBoundingClientRect(); dragOffsetRef.current = { x: e.clientX - modalRect.left, y: e.clientY - modalRect.top }; };
    const handleMouseMove = useCallback((e: MouseEvent) => { if (!isDragging || !modalRef.current) return; e.preventDefault(); setPosition({ x: e.clientX - dragOffsetRef.current.x, y: e.clientY - dragOffsetRef.current.y }); }, [isDragging]);
    const handleMouseUp = useCallback(() => { setIsDragging(false); }, []);
    useEffect(() => { if (isDragging) { document.addEventListener('mousemove', handleMouseMove); document.addEventListener('mouseup', handleMouseUp); } return () => { document.removeEventListener('mousemove', handleMouseMove); document.removeEventListener('mouseup', handleMouseUp); }; }, [isDragging, handleMouseMove, handleMouseUp]);
    
    useEffect(() => { if (!visible) return; const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') { onClose(); } }; window.addEventListener('keydown', handleKeyDown); return () => { window.removeEventListener('keydown', handleKeyDown); }; }, [visible, onClose]);
    if (!visible || !documento) return null;
    const handleSelectCondicionante = (condicionante: TipoCondicionante) => { setIdCondicionante(condicionante.id.toString()); setTipoCondicionanteNome(condicionante.nome); };
    const handleAlterar = async () => { if (documento?.condicionante === 'S' && !idCondicionante) { notifyError('O campo "Tipo de Condicionante" é obrigatório.'); return; } setLoading(true); const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 15000); try { const body: any = { id_certidao: documento.id, modulo: modulo, numero_documento: numero, orgao: orgao, data_emissao: dataEmissao, data_validade: dataValidade, observacao: observacao, }; if (documento?.condicionante === 'S') { body.id_condicionante = idCondicionante; } const response = await fetch('/api/agrogestor/altera-documento', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: controller.signal, }); const rawResult = await response.json().catch(() => ({ status: 'error', error: 'Falha ao processar a resposta do servidor.' })); const result = Array.isArray(rawResult) ? rawResult[0] : rawResult; if (!response.ok || !result || result.status !== 'ok') { throw new Error(result?.error || 'Falha ao alterar o documento.'); } notifySuccess('Documento alterado com sucesso!'); onSuccess(); onClose(); } catch (error: any) { const message = error.name === 'AbortError' ? 'A requisição demorou muito e foi cancelada.' : error.message; notifyError(message); } finally { clearTimeout(timer); setLoading(false); } };
    
    return ( 
        <>
            <div className="modal-overlay-backdrop" />
            <div ref={modalRef} className="modal-overlay-glass" role="dialog" aria-modal="true" aria-labelledby="edit-title" tabIndex={-1} style={{ top: `${position.y}px`, left: `${position.x}px`, width: '90%', maxWidth: '640px' }}>
                <div onMouseDown={handleMouseDown} className="modal-gestao-header">
                    <div>
                        <h3 id="edit-title" className="modal-gestao-title">Alterar Documento</h3>
                        {empreendimento && <p className="modal-detalhes-subtitle">Empreendimento: {empreendimento.nome}{empreendimento.numero_matricula && ` | Matrícula: ${empreendimento.numero_matricula}`}</p>}
                    </div>
                    <button type="button" onClick={onClose} disabled={loading} className="modal-gestao-close-btn"><X size={24}/></button>
                </div>
                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {documento?.condicionante === 'S' && (<CamposCondicionante tipoCondicionanteNome={tipoCondicionanteNome} onSearchClick={() => setBuscaModalOpen(true)} />)}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem 1.5rem' }}>
                        <div><label className="modal-label">Número do Documento</label><input className="modal-input" value={numero} onChange={e => setNumero(e.target.value)} style={{width: '100%'}} placeholder="Número de identificação"/></div>
                        <div><label className="modal-label">Órgão Emissor</label><input className="modal-input" value={orgao} onChange={e => setOrgao(e.target.value)} style={{width: '100%'}} placeholder="Órgão responsável"/></div>
                        <div><label className="modal-label">Data de Emissão</label><input className="modal-input" type="date" value={dataEmissao} onChange={e => setDataEmissao(e.target.value)} style={{width: '100%'}} /></div>
                        <div><label className="modal-label">Data de Validade</label><input className="modal-input" type="date" value={dataValidade} onChange={e => setDataValidade(e.target.value)} style={{width: '100%'}} /></div>
                    </div>
                    <div>
                        <label className="modal-label">Observação</label>
                        <textarea className="modal-input" value={observacao} onChange={(e) => setObservacao(e.target.value)} maxLength={250} rows={3} style={{ width: '100%', resize: 'vertical' }} placeholder="Observações sobre o documento..."/><div style={{ textAlign: 'right', fontSize: '12px', color: '#888', marginTop: '4px' }}>{250 - observacao.length} caracteres restantes</div>
                    </div>
                </div>
                <div className="modal-gestao-footer">
                    <button onClick={onClose} className="btn btn-outline-gray" disabled={loading}>Cancelar</button>
                    <button onClick={handleAlterar} className="btn btn-action-edit" disabled={loading}>
                        {loading ? <><Loader2 size={16} className="animate-spin" /> Alterando...</> : <><Edit size={16} /> Alterar</>}
                    </button>
                </div>
            </div>
            {NotificationComponent}
            {documento && <ModalBuscaCondicionante open={buscaModalOpen} onClose={() => setBuscaModalOpen(false)} onSelect={handleSelectCondicionante} tipoDocumento={documento.tipo} />}
        </> 
    );
};

const ModalConfirmarExclusao: React.FC<{ visible: boolean; onClose: () => void; onConfirm: () => void; loading: boolean; }> = ({ visible, onClose, onConfirm, loading }) => {
    useEffect(() => { if (!visible) return; const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') { onClose(); } }; window.addEventListener('keydown', handleKeyDown); return () => { window.removeEventListener('keydown', handleKeyDown); }; }, [visible, onClose]);
    if (!visible) return null;
    return ( <> <div className="modal-overlay-backdrop" /> <div role="alertdialog" aria-modal="true" aria-labelledby="delete-title" aria-describedby="delete-desc" className="modal-overlay-glass" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '90%', maxWidth: '450px', padding: '2rem', textAlign: 'center' }} > <AlertTriangle size={48} color="var(--gcs-orange)" style={{ marginBottom: '1rem' }} /> <h3 id="delete-title" style={{ margin: '0 0 0.5rem 0', color: 'var(--gcs-blue)' }}>Confirmar Exclusão</h3> <p id="delete-desc" style={{ color: 'var(--gcs-gray-text)', marginBottom: '2rem' }}>Tem certeza que deseja excluir este documento? Esta ação não pode ser desfeita.</p> <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}> <Button onClick={onClose} disabled={loading}>Cancelar</Button> <Button type="primary" danger onClick={onConfirm} loading={loading}>Excluir</Button> </div> </div> </> );
};

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
  const [ocorrencias, setOcorrencias] = useState<Record<string, Ocorrencia[]>>({});
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

  // --- HOOK PARA PEGAR DADOS DA SESSÃO ---
  const { data: session } = useSession();

  // --- NOVOS STATES PARA O MODAL DE OCORRÊNCIA ---
  const [isOcorrenciaModalOpen, setIsOcorrenciaModalOpen] = useState(false);
  const [ocorrenciaModalTipo, setOcorrenciaModalTipo] = useState<string>("");
  const [ocorrenciaSelecionada, setOcorrenciaSelecionada] = useState<Ocorrencia | null>(null); 
  const [isSavingOcorrencia, setIsSavingOcorrencia] = useState(false);

  useEffect(() => { if (visible && modalRef.current) { const { clientWidth, clientHeight } = modalRef.current; setPosition({ x: window.innerWidth / 2 - clientWidth / 2, y: window.innerHeight / 2 - clientHeight / 2 }); lastFocusedElementRef.current = document.activeElement as HTMLElement; modalRef.current.focus(); } }, [visible]);
  // --- HANDLER DO MODAL PRINCIPAL SEM CLAMP ---
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => { const t = e.target as HTMLElement; if (!modalRef.current || t.closest('button, input, textarea, select, label, .ant-tabs-tab')) return; setIsDragging(true); const modalRect = modalRef.current.getBoundingClientRect(); dragOffsetRef.current = { x: e.clientX - modalRect.left, y: e.clientY - modalRect.top }; };
  const handleMouseMove = useCallback((e: MouseEvent) => { 
      if (!isDragging || !modalRef.current) return; 
      e.preventDefault(); 
      setPosition({ 
          x: e.clientX - dragOffsetRef.current.x, 
          y: e.clientY - dragOffsetRef.current.y 
      }); 
  }, [isDragging]);
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

  const handleOpenAddOcorrencia = useCallback((tipo: string) => {
      setOcorrenciaModalTipo(tipo);
      setOcorrenciaSelecionada(null); 
      setIsOcorrenciaModalOpen(true);
  }, []);

  const handleOpenEditOcorrencia = useCallback((ocorrencia: Ocorrencia) => {
      setOcorrenciaModalTipo(ocorrencia.tipo_documento);
      setOcorrenciaSelecionada(ocorrencia);
      setIsOcorrenciaModalOpen(true);
  }, []);

  const handleSaveOcorrencia = useCallback(async (data: any) => {
      if(!empreendimento) return;
      setIsSavingOcorrencia(true);
      try {
          const modulo = UPLOAD_CONFIGS.find(c => c.tipo === ocorrenciaModalTipo)?.modulo || "geral";
          
          let url = '/api/agrogestor/ocorrencias-inclui';
          let payload: any = {
              empreendimento_id: empreendimento.id,
              modulo: modulo,
              tipo_documento: ocorrenciaModalTipo,
              data_ocorrencia: `${data.data_ocorrencia}T00:00:00.000Z`, 
              descricao: data.descricao,
              criado_em: new Date().toISOString(),
              criado_por: session?.user?.email || 'usuario_sistema'
          };

          if (ocorrenciaSelecionada) {
              url = '/api/agrogestor/ocorrencias-altera';
              payload = {
                  ...payload,
                  id: ocorrenciaSelecionada.id,
                  status: data.status || 'A',
                  atualizado_em: new Date().toISOString(),
                  atualizado_por: session?.user?.email || 'usuario_sistema'
              };
          }

          const response = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
          });

          const result = await response.json().catch(() => ({}));
          const isValidArray = Array.isArray(result) && result.length > 0 && (result[0].id || result[0].status === 'ok');
          const isValidObject = result.status === 'ok' || (result.id && result.id !== null);

          if (response.ok && (isValidArray || isValidObject)) {
               notifySuccess(ocorrenciaSelecionada ? "Ocorrência alterada com sucesso!" : "Ocorrência registrada com sucesso!");
               setIsOcorrenciaModalOpen(false);
               setOcorrenciaSelecionada(null);
               setRefreshTrigger(t => t + 1); 
          } else {
              const errorMessage = result.message || result.error || (Array.isArray(result) && result[0]?.message) || 'Falha ao salvar a ocorrência.';
              throw new Error(errorMessage);
          }
      } catch (error: any) {
          notifyError(error.message || "Erro desconhecido ao salvar ocorrência.");
      } finally {
          setIsSavingOcorrencia(false);
      }
  }, [empreendimento, ocorrenciaModalTipo, session, notifySuccess, notifyError, ocorrenciaSelecionada]);
  
  useEffect(() => {
    if (visible && empreendimento) {
      const controller = new AbortController();
      let timedOut = false;
      const timeoutId = setTimeout(() => { timedOut = true; controller.abort(); }, 15000);
      
      const fetchAllData = async () => {
        setLoading(true);
        try {
          const docsPromise = fetch("/api/agrogestor/consulta-certidao", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ empreendimento_id: empreendimento.id }),
            signal: controller.signal
          });

          const occPromise = fetch("/api/agrogestor/ocorrencias-consulta", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ empreendimento_id: empreendimento.id }),
            signal: controller.signal
          });

          const [docsRes, occRes] = await Promise.all([docsPromise, occPromise]);

          if (docsRes.ok && docsRes.status !== 204) {
              const data: any[] = await docsRes.json();
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
                  // CORREÇÃO AQUI: Cast explícito para 'S' | 'N'
                  condicionante: (doc.condicionante === 'S' ? 'S' : 'N') as 'S' | 'N',
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
          } else {
              setDocumentos({});
          }

          if (occRes.ok) {
              const occData: any[] = await occRes.json();
              if (Array.isArray(occData)) {
                  const groupedOcc = occData.reduce((acc, occ) => {
                      const tipo = occ.tipo_documento;
                      if (!tipo) return acc; 
                      if (!acc[tipo]) acc[tipo] = [];
                      acc[tipo].push(occ);
                      return acc;
                  }, {} as Record<string, Ocorrencia[]>);
                  setOcorrencias(groupedOcc);
              } else {
                  setOcorrencias({});
              }
          } else {
              setOcorrencias({});
          }

        } catch (error: any) {
          if (error.name === 'AbortError') { if (timedOut) notifyError('A busca por dados demorou muito e foi cancelada.'); } 
          else { console.error(`Erro ao carregar dados:`, error); notifyError('Falha ao carregar dados do empreendimento.'); }
        } finally {
          clearTimeout(timeoutId);
          setLoading(false);
        }
      };
      
      fetchAllData();
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
  
  const handleBackdropClick = () => { const isAnyUploadModalOpen = uploadModalState.open; if (isDeleting || downloadingDocId || isAnyUploadModalOpen || isOcorrenciaModalOpen) return; onClose(); }
  const HEAD_HIGHLIGHT = "rgba(0, 102, 204, 0.10)";
  
  const tabItems = useMemo<TabsProps['items']>(() => [
    {
      key: '1',
      label: <span style={{display:'flex',alignItems:'center',gap:8}}><Landmark size={18}/> Fundiário</span>,
      children: loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(90vh - 140px)', flexDirection: 'column', gap: '1rem', color: 'var(--gcs-blue)' }}>
            <Spin size="large" />
            <span style={{color: 'var(--gcs-dark-text-primary)'}}>Carregando documentos...</span>
        </div>
      ) : (
        <div style={{ padding:'1rem 1.5rem', overflowY:'auto', height:'calc(90vh - 140px)' }}>
            <DocumentSection modulo="fundiario" title="Certidão de Inteiro Teor da Matrícula" icon={<FileText size={20}/>} documents={documentos['certidao_inteiro_teor'] || []} ocorrencias={ocorrencias['certidao_inteiro_teor'] || []} loading={loading} onAddDocumento={() => handleOpenUploadModal('certidao_inteiro_teor', 'N')} onAddCondicionante={() => handleOpenUploadModal('certidao_inteiro_teor', 'S')} onAddOcorrencia={() => handleOpenAddOcorrencia('certidao_inteiro_teor')} onEditOcorrencia={handleOpenEditOcorrencia} onEdit={handleAbrirModalEdicao} onDelete={handleAbrirModalExclusao} onDownload={handleDownload} downloadingDocId={downloadingDocId} headBg={HEAD_HIGHLIGHT} />
            <DocumentSection modulo="fundiario" title="Certidão de ITR" icon={<Recycle size={20}/>} documents={documentos['itr'] || []} ocorrencias={ocorrencias['itr'] || []} loading={loading} onAddDocumento={() => handleOpenUploadModal('itr', 'N')} onAddCondicionante={() => handleOpenUploadModal('itr', 'S')} onAddOcorrencia={() => handleOpenAddOcorrencia('itr')} onEditOcorrencia={handleOpenEditOcorrencia} onEdit={handleAbrirModalEdicao} onDelete={handleAbrirModalExclusao} onDownload={handleDownload} downloadingDocId={downloadingDocId} headBg={HEAD_HIGHLIGHT} />
            <DocumentSection modulo="fundiario" title="CCIR" icon={<FileStack size={20}/>} documents={documentos['ccir'] || []} ocorrencias={ocorrencias['ccir'] || []} loading={loading} onAddDocumento={() => handleOpenUploadModal('ccir', 'N')} onAddCondicionante={() => handleOpenUploadModal('ccir', 'S')} onAddOcorrencia={() => handleOpenAddOcorrencia('ccir')} onEditOcorrencia={handleOpenEditOcorrencia} onEdit={handleAbrirModalEdicao} onDelete={handleAbrirModalExclusao} onDownload={handleDownload} downloadingDocId={downloadingDocId} headBg={HEAD_HIGHLIGHT} />
            <DocumentSection modulo="fundiario" title="GEO" icon={<Trees size={20}/>} documents={documentos['geo'] || []} ocorrencias={ocorrencias['geo'] || []} loading={loading} onAddDocumento={() => handleOpenUploadModal('geo', 'N')} onAddCondicionante={() => handleOpenUploadModal('geo', 'S')} onAddOcorrencia={() => handleOpenAddOcorrencia('geo')} onEditOcorrencia={handleOpenEditOcorrencia} onEdit={handleAbrirModalEdicao} onDelete={handleAbrirModalExclusao} onDownload={handleDownload} downloadingDocId={downloadingDocId} headBg={HEAD_HIGHLIGHT} />
            <DocumentSection modulo="fundiario" title="KML" icon={<FileUp size={20}/>} documents={documentos['kml'] || []} ocorrencias={ocorrencias['kml'] || []} loading={loading} onAddDocumento={() => handleOpenUploadModal('kml', 'N')} onAddCondicionante={() => handleOpenUploadModal('kml', 'S')} onAddOcorrencia={() => handleOpenAddOcorrencia('kml')} onEditOcorrencia={handleOpenEditOcorrencia} onEdit={handleAbrirModalEdicao} onDelete={handleAbrirModalExclusao} onDownload={handleDownload} onViewMap={handleOpenMapaModal} downloadingDocId={downloadingDocId} headBg={HEAD_HIGHLIGHT} />
            <DocumentSection modulo="fundiario" title="CIB" icon={<FileStack size={20}/>} documents={documentos['cib'] || []} ocorrencias={ocorrencias['cib'] || []} loading={loading} onAddDocumento={() => handleOpenUploadModal('cib', 'N')} onAddCondicionante={() => handleOpenUploadModal('cib', 'S')} onAddOcorrencia={() => handleOpenAddOcorrencia('cib')} onEditOcorrencia={handleOpenEditOcorrencia} onEdit={handleAbrirModalEdicao} onDelete={handleAbrirModalExclusao} onDownload={handleDownload} downloadingDocId={downloadingDocId} headBg={HEAD_HIGHLIGHT} />
        </div>
      )
    },
    {
      key: '2',
      label: <span style={{display:'flex',alignItems:'center',gap:8}}><Trees size={18}/> Ambiental</span>,
      children: (
        <div style={{ padding:'1rem 1.5rem', overflowY:'auto', height:'calc(90vh - 140px)' }}>
            <DocumentSection modulo="ambiental" title="ASV (Autorização de Supressão Vegetal)" icon={<Trees size={20} />} documents={documentos['asv'] || []} ocorrencias={ocorrencias['asv'] || []} loading={loading} onAddDocumento={() => handleOpenUploadModal('asv', 'N')} onAddCondicionante={() => handleOpenUploadModal('asv', 'S')} onAddOcorrencia={() => handleOpenAddOcorrencia('asv')} onEditOcorrencia={handleOpenEditOcorrencia} onEdit={handleAbrirModalEdicao} onDelete={handleAbrirModalExclusao} onDownload={handleDownload} headBg={HEAD_HIGHLIGHT}/>
            <DocumentSection modulo="ambiental" title="Licença Ambiental (Licença estadual, municipal e federal)" icon={<ShieldCheck size={20} />} documents={documentos['licenca'] || []} ocorrencias={ocorrencias['licenca'] || []} loading={loading} onAddDocumento={() => handleOpenUploadModal('licenca', 'N')} onAddCondicionante={() => handleOpenUploadModal('licenca', 'S')} onAddOcorrencia={() => handleOpenAddOcorrencia('licenca')} onEditOcorrencia={handleOpenEditOcorrencia} onEdit={handleAbrirModalEdicao} onDelete={handleAbrirModalExclusao} onDownload={handleDownload} headBg={HEAD_HIGHLIGHT}/>
            <DocumentSection modulo="ambiental" title="Outorga" icon={<Waves size={20} />} documents={documentos['outorga'] || []} ocorrencias={ocorrencias['outorga'] || []} loading={loading} onAddDocumento={() => handleOpenUploadModal('outorga', 'N')} onAddCondicionante={() => handleOpenUploadModal('outorga', 'S')} onAddOcorrencia={() => handleOpenAddOcorrencia('outorga')} onEditOcorrencia={handleOpenEditOcorrencia} onEdit={handleAbrirModalEdicao} onDelete={handleAbrirModalExclusao} onDownload={handleDownload} headBg={HEAD_HIGHLIGHT}/>
            <DocumentSection modulo="ambiental" title="APPO (Autorização para Perfuração de Poço)" icon={<Waves size={20} />} documents={documentos['appo'] || []} ocorrencias={ocorrencias['appo'] || []} loading={loading} onAddDocumento={() => handleOpenUploadModal('appo', 'N')} onAddCondicionante={() => handleOpenUploadModal('appo', 'S')} onAddOcorrencia={() => handleOpenAddOcorrencia('appo')} onEditOcorrencia={handleOpenEditOcorrencia} onEdit={handleAbrirModalEdicao} onDelete={handleAbrirModalExclusao} onDownload={handleDownload} headBg={HEAD_HIGHLIGHT}/>
            <DocumentSection modulo="ambiental" title="CAR (Cadastro Ambiental Rural)" icon={<FileText size={20} />} documents={documentos['car'] || []} ocorrencias={ocorrencias['car'] || []} loading={loading} onAddDocumento={() => handleOpenUploadModal('car', 'N')} onAddCondicionante={() => handleOpenUploadModal('car', 'S')} onAddOcorrencia={() => handleOpenAddOcorrencia('car')} onEditOcorrencia={handleOpenEditOcorrencia} onEdit={handleAbrirModalEdicao} onDelete={handleAbrirModalExclusao} onDownload={handleDownload} headBg={HEAD_HIGHLIGHT}/>
            <DocumentSection modulo="ambiental" title="CEFIR (Cadastro Estadual Florestal de Imóveis Rurais)" icon={<FileText size={20} />} documents={documentos['cefir'] || []} ocorrencias={ocorrencias['cefir'] || []} loading={loading} onAddDocumento={() => handleOpenUploadModal('cefir', 'N')} onAddCondicionante={() => handleOpenUploadModal('cefir', 'S')} onAddOcorrencia={() => handleOpenAddOcorrencia('cefir')} onEditOcorrencia={handleOpenEditOcorrencia} onEdit={handleAbrirModalEdicao} onDelete={handleAbrirModalExclusao} onDownload={handleDownload} headBg={HEAD_HIGHLIGHT}/>
        </div>
      )
    },
    {
      key: '3',
      label: <span style={{display:'flex',alignItems:'center',gap:8}}><Building size={18}/> Cadastral / Obrigações</span>,
      children: (
        <div style={{ padding:'1rem 1.5rem', overflowY:'auto', height:'calc(90vh - 140px)' }}>
            <DocumentSection modulo="cadastral_obrigacoes" title="ADA" icon={<FileText size={20} />} documents={documentos['ada'] || []} ocorrencias={ocorrencias['ada'] || []} loading={loading} onAddDocumento={() => handleOpenUploadModal('ada', 'N')} onAddCondicionante={() => handleOpenUploadModal('ada', 'S')} onAddOcorrencia={() => handleOpenAddOcorrencia('ada')} onEditOcorrencia={handleOpenEditOcorrencia} onEdit={handleAbrirModalEdicao} onDelete={handleAbrirModalExclusao} onDownload={handleDownload} headBg={HEAD_HIGHLIGHT} />
            <DocumentSection modulo="cadastral_obrigacoes" title="ITR (Cadastral)" icon={<Recycle size={20} />} documents={documentos['itr_cadastral'] || []} ocorrencias={ocorrencias['itr_cadastral'] || []} loading={loading} onAddDocumento={() => handleOpenUploadModal('itr_cadastral', 'N')} onAddCondicionante={() => handleOpenUploadModal('itr_cadastral', 'S')} onAddOcorrencia={() => handleOpenAddOcorrencia('itr_cadastral')} onEditOcorrencia={handleOpenEditOcorrencia} onEdit={handleAbrirModalEdicao} onDelete={handleAbrirModalExclusao} onDownload={handleDownload} headBg={HEAD_HIGHLIGHT} />
            <DocumentSection modulo="cadastral_obrigacoes" title="Relatórios" icon={<FileStack size={20} />} documents={documentos['relatorio'] || []} ocorrencias={ocorrencias['relatorio'] || []} loading={loading} onAddDocumento={() => handleOpenUploadModal('relatorio', 'N')} onAddCondicionante={() => handleOpenUploadModal('relatorio', 'S')} onAddOcorrencia={() => handleOpenAddOcorrencia('relatorio')} onEditOcorrencia={handleOpenEditOcorrencia} onEdit={handleAbrirModalEdicao} onDelete={handleAbrirModalExclusao} onDownload={handleDownload} headBg={HEAD_HIGHLIGHT} />
            <DocumentSection modulo="cadastral_obrigacoes" title="Alvarás" icon={<CalendarCheck size={20} />} documents={documentos['alvara'] || []} ocorrencias={ocorrencias['alvara'] || []} loading={loading} onAddDocumento={() => handleOpenUploadModal('alvara', 'N')} onAddCondicionante={() => handleOpenUploadModal('alvara', 'S')} onAddOcorrencia={() => handleOpenAddOcorrencia('alvara')} onEditOcorrencia={handleOpenEditOcorrencia} onEdit={handleAbrirModalEdicao} onDelete={handleAbrirModalExclusao} onDownload={handleDownload} headBg={HEAD_HIGHLIGHT} />
            <DocumentSection modulo="cadastral_obrigacoes" title="Inventário de Resíduos" icon={<Trash2 size={20} />} documents={documentos['inventario_residuos'] || []} ocorrencias={ocorrencias['inventario_residuos'] || []} loading={loading} onAddDocumento={() => handleOpenUploadModal('inventario_residuos', 'N')} onAddCondicionante={() => handleOpenUploadModal('inventario_residuos', 'S')} onAddOcorrencia={() => handleOpenAddOcorrencia('inventario_residuos')} onEditOcorrencia={handleOpenEditOcorrencia} onEdit={handleAbrirModalEdicao} onDelete={handleAbrirModalExclusao} onDownload={handleDownload} headBg={HEAD_HIGHLIGHT} />
            <DocumentSection modulo="cadastral_obrigacoes" title="Certificado Bombeiros" icon={<Siren size={20} />} documents={documentos['certificado_bombeiros'] || []} ocorrencias={ocorrencias['certificado_bombeiros'] || []} loading={loading} onAddDocumento={() => handleOpenUploadModal('certificado_bombeiros', 'N')} onAddCondicionante={() => handleOpenUploadModal('certificado_bombeiros', 'S')} onAddOcorrencia={() => handleOpenAddOcorrencia('certificado_bombeiros')} onEditOcorrencia={handleOpenEditOcorrencia} onEdit={handleAbrirModalEdicao} onDelete={handleAbrirModalExclusao} onDownload={handleDownload} headBg={HEAD_HIGHLIGHT} />
            <DocumentSection modulo="cadastral_obrigacoes" title="CTF – Ibama" icon={<ShieldCheck size={20} />} documents={documentos['ctf_ibama'] || []} ocorrencias={ocorrencias['ctf_ibama'] || []} loading={loading} onAddDocumento={() => handleOpenUploadModal('ctf_ibama', 'N')} onAddCondicionante={() => handleOpenUploadModal('ctf_ibama', 'S')} onAddOcorrencia={() => handleOpenAddOcorrencia('ctf_ibama')} onEditOcorrencia={handleOpenEditOcorrencia} onEdit={handleAbrirModalEdicao} onDelete={handleAbrirModalExclusao} onDownload={handleDownload} headBg={HEAD_HIGHLIGHT} />
            <DocumentSection modulo="cadastral_obrigacoes" title="RAPP – Ibama" icon={<ClipboardList size={20} />} documents={documentos['rapp_ibama'] || []} ocorrencias={ocorrencias['rapp_ibama'] || []} loading={loading} onAddDocumento={() => handleOpenUploadModal('rapp_ibama', 'N')} onAddCondicionante={() => handleOpenUploadModal('rapp_ibama', 'S')} onAddOcorrencia={() => handleOpenAddOcorrencia('rapp_ibama')} onEditOcorrencia={handleOpenEditOcorrencia} onEdit={handleAbrirModalEdicao} onDelete={handleAbrirModalExclusao} onDownload={handleDownload} headBg={HEAD_HIGHLIGHT} />
            <DocumentSection modulo="cadastral_obrigacoes" title="Certificado de Uso de Solo" icon={<MapPin size={20} />} documents={documentos['certificado_uso_solo'] || []} ocorrencias={ocorrencias['certificado_uso_solo'] || []} loading={loading} onAddDocumento={() => handleOpenUploadModal('certificado_uso_solo', 'N')} onAddCondicionante={() => handleOpenUploadModal('certificado_uso_solo', 'S')} onAddOcorrencia={() => handleOpenAddOcorrencia('certificado_uso_solo')} onEditOcorrencia={handleOpenEditOcorrencia} onEdit={handleAbrirModalEdicao} onDelete={handleAbrirModalExclusao} onDownload={handleDownload} headBg={HEAD_HIGHLIGHT} />
        </div>
      )
    }
    // --- ALTERAÇÃO AQUI: Adicionado handleOpenEditOcorrencia ao array de dependências ---
  ], [documentos, ocorrencias, loading, downloadingDocId, handleOpenUploadModal, handleAbrirModalEdicao, handleAbrirModalExclusao, handleDownload, handleOpenMapaModal, handleOpenAddOcorrencia, handleOpenEditOcorrencia]);

  if (!visible || !empreendimento) return null;

  return (
    <>
      <style>{`
        :root {
            --gcs-blue: #00314A;
            --gcs-blue-light: #1b4c89;
            --gcs-blue-lighter: #a3b8d1;
            --gcs-blue-sky: #7DD3FC;
            --gcs-green: #5FB246;
            --gcs-green-dark: #28a745;
            --gcs-orange: #F58220;
            --gcs-gray-light: #f1f5fb;
            --gcs-gray-border: #d0d7e2;
            --gcs-gray-text: #6c757d;
            --gcs-dark-text: #333;
            --gcs-brand-red: #d9534f;
            --gcs-red-light: #fff0f0;
            --gcs-red-border: #f5c2c7;
            --gcs-red-text: #721c24;
            --gcs-dark-bg-transparent: rgba(25, 39, 53, 0.5);
            --gcs-dark-bg-heavy: rgba(25, 39, 53, 0.85);
            --gcs-dark-border: rgba(125, 173, 222, 0.2);
            --gcs-dark-border-hover: rgba(125, 173, 222, 0.4);
            --gcs-dark-text-primary: #F1F5F9;
            --gcs-dark-text-secondary: #CBD5E1;
            --gcs-dark-text-tertiary: #94A3B8;
        }

        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        /* --- Custom Scrollbar (Webkit) --- */
        ::-webkit-scrollbar {
            width: 12px;
            height: 12px;
        }
        ::-webkit-scrollbar-track {
            background: transparent; 
        }
        ::-webkit-scrollbar-thumb {
            background: rgba(156, 163, 175, 0.5); 
            border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
            background: rgba(156, 163, 175, 0.7); 
        }
        
        /* Dark Mode Scrollbar refinement */
        body.dark ::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.2);
        }
        body.dark ::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.3);
        }


        /* --- Base Modal (Glassmorphism) --- */
        .modal-gestao-backdrop {
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background-color: rgba(0,0,0,0.4); z-index: 1000;
        }
        .modal-gestao-glass {
            position: fixed; border-radius: 12px; display: flex; flex-direction: column;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2); z-index: 1001;
            transition: background 0.3s ease, border 0.3s ease;
        }
        
        body.light .modal-gestao-glass {
            background: #fff; border: 1px solid #dee2e6;
        }
        body.dark .modal-gestao-glass {
            background: var(--gcs-dark-bg-heavy);
            backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
            border: 1px solid var(--gcs-dark-border);
        }

        /* --- Layer 2: Modais sobrepostos (Upload, Edição, etc) --- */
        .modal-overlay-backdrop {
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background-color: rgba(0, 0, 0, 0.6); 
            backdrop-filter: blur(4px); 
            z-index: 2100;
        }
        .modal-overlay-glass {
            position: fixed; border-radius: 12px; display: flex; flex-direction: column;
            z-index: 2101; 
            box-shadow: 0 20px 50px rgba(0,0,0,0.5); 
            transition: background 0.3s ease, border 0.3s ease;
        }
        body.light .modal-overlay-glass {
            background: #fff; border: 1px solid #dee2e6;
        }
        body.dark .modal-overlay-glass {
            background: var(--gcs-dark-bg-heavy);
            backdrop-filter: blur(16px);
            border: 1px solid var(--gcs-dark-border);
        }


        /* --- Header --- */
        .modal-gestao-header {
            padding: 1rem 1.5rem; border-bottom: 1px solid; flex-shrink: 0;
            cursor: move; border-top-left-radius: 12px; border-top-right-radius: 12px;
            display: flex; justify-content: space-between; align-items: center;
        }
        body.light .modal-gestao-header {
            background-color: var(--gcs-gray-light); border-bottom-color: #dee2e6;
        }
        body.dark .modal-gestao-header {
            background-color: rgba(25, 39, 53, 0.5); border-bottom-color: var(--gcs-dark-border);
        }

        .modal-gestao-title { font-size: 1.2rem; font-weight: bold; display: flex; align-items: center; }
        body.light .modal-gestao-title { color: var(--gcs-blue); }
        body.dark .modal-gestao-title { color: var(--gcs-dark-text-primary); }
        
        .modal-detalhes-subtitle { margin: 4px 0 0 0; font-weight: bold; font-size: 14px; }
        body.light .modal-detalhes-subtitle { color: var(--gcs-gray-text); }
        body.dark .modal-detalhes-subtitle { color: var(--gcs-dark-text-tertiary); }

        .modal-gestao-close-btn { background: none; border: none; font-size: 1.75rem; cursor: pointer; padding: 0; line-height: 1; }
        body.light .modal-gestao-close-btn { color: var(--gcs-dark-text); }
        body.dark .modal-gestao-close-btn { color: var(--gcs-dark-text-secondary); }

        /* --- Footer --- */
        .modal-gestao-footer {
            padding: 1rem 1.5rem; border-top: 1px solid; flex-shrink: 0;
            border-bottom-left-radius: 12px; border-bottom-right-radius: 12px;
            display: flex; justify-content: flex-end; align-items: center; gap: 8px;
        }
        body.light .modal-gestao-footer {
            background-color: var(--gcs-gray-light); border-top-color: #dee2e6;
        }
        body.dark .modal-gestao-footer {
            background-color: rgba(25, 39, 53, 0.5); border-top-color: var(--gcs-dark-border);
        }

        /* --- Buttons --- */
        .btn-gcs-blue { background-color: var(--gcs-blue) !important; color: white !important; border-color: var(--gcs-blue) !important; }
        .btn-gcs-blue:hover { background-color: #001f30 !important; border-color: #001f30 !important; }

        /* --- Dark Mode Input Overrides --- */
        body.dark .modal-input, body.dark input, body.dark textarea, body.dark select {
            background-color: var(--gcs-dark-bg-transparent) !important;
            color: var(--gcs-dark-text-primary) !important;
            border: 1px solid var(--gcs-dark-border) !important;
        }
        body.dark .modal-label { color: var(--gcs-dark-text-primary) !important; }
        body.dark .modal-input:focus { border-color: var(--gcs-dark-border-hover) !important; }
        
        /* --- Dark Mode Ant Design Tabs Override --- */
        /* Cor base do texto (não selecionado) */
        body.dark .ant-tabs { color: var(--gcs-dark-text-secondary); }
        body.dark .ant-tabs-tab { 
            background: transparent !important;
            color: var(--gcs-dark-text-secondary) !important; /* Texto inativo mais visível */
            transition: all 0.3s ease;
        }
        
        /* Hover no Tab */
        body.dark .ant-tabs-tab:hover { 
            color: var(--gcs-dark-text-primary) !important; 
        }

        /* Tab Ativa */
        body.dark .ant-tabs-tab-active {
            background-color: rgba(125, 211, 252, 0.15) !important; /* Fundo azul translúcido */
            border-radius: 8px;
        }
        body.dark .ant-tabs-tab-active .ant-tabs-tab-btn { 
            color: var(--gcs-blue-sky) !important; /* Texto azul claro */
            font-weight: 600;
        }
        
        /* Barra lateral indicadora (se houver) */
        body.dark .ant-tabs-ink-bar { background: var(--gcs-blue-sky) !important; }
        
        /* Conteúdo da Tab */
        body.dark .ant-tabs-content { color: var(--gcs-dark-text-secondary); }

        /* --- CSS CORRIGIDO: Cores do Radio Button no Modal de Busca --- */
        .radio-option-text { color: var(--gcs-dark-text); }
        body.dark .radio-option-text { color: var(--gcs-dark-text-primary); }

        /* Opcional: Ajuste para o wrapper do AntD no Dark Mode, se necessário */
        body.dark .ant-radio-wrapper { color: var(--gcs-dark-text-primary); }

      `}</style>
      
      <div className="modal-gestao-backdrop" onClick={handleBackdropClick} />
      <div 
        ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="modal-title" tabIndex={-1}
        className="modal-gestao-glass"
        style={{ top: `${position.y}px`, left: `${position.x}px`, width: '95%', maxWidth: '1200px', height: '90vh' }}
      >
        <div onMouseDown={handleMouseDown} className="modal-gestao-header">
          <div>
            <h3 id="modal-title" className="modal-gestao-title">Gestão de Documentos</h3>
            <p className="modal-detalhes-subtitle">
              Empreendimento: {empreendimento.nome}
              {empreendimento.numero_matricula && ` | Matrícula: ${empreendimento.numero_matricula}`}
            </p>
          </div>
          <button type="button" onClick={onClose} className="modal-gestao-close-btn"><X size={24}/></button>
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <Tabs items={tabItems} activeKey={activeKey} onChange={setActiveKey} tabPosition="left" style={{ height: '100%' }} animated={{ inkBar: true, tabPane: true }} />
        </div>
        <div className="modal-gestao-footer">
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
      
      {/* --- NOVO: Modal de Ocorrência --- */}
      <ModalOcorrencia
          visible={isOcorrenciaModalOpen}
          onClose={() => setIsOcorrenciaModalOpen(false)}
          onSave={handleSaveOcorrencia}
          isSaving={isSavingOcorrencia}
          initialData={ocorrenciaSelecionada} // PASSANDO DADOS DE EDIÇÃO
          titulo={ocorrenciaSelecionada ? `Editar Ocorrência - ${ocorrenciaModalTipo}` : `Nova Ocorrência - ${ocorrenciaModalTipo}`} 
      />

      {NotificationComponent}

      {isMapaModalVisible && (
        <>
          <div className="modal-gestao-backdrop" onClick={handleCloseMapaModal} />
          <div className="modal-gestao-glass" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '90%', maxWidth: '800px', height: 'auto' }}>
            <div className="modal-gestao-header">
                <h3 className="modal-gestao-title"><Map size={20} style={{marginRight: 8}}/> Visualizador de Limites</h3>
                <button type="button" onClick={handleCloseMapaModal} className="modal-gestao-close-btn"><X size={24}/></button>
            </div>
            <div style={{ padding: '1.5rem', minHeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {kmlError ? ( <div style={{ textAlign: 'center', color: '#E03131' }}> <AlertTriangle size={32} style={{ marginBottom: '1rem' }} /> <p style={{ margin: 0, fontWeight: 'bold' }}>Erro ao carregar o mapa</p> <p style={{ margin: '0.5rem 0 0 0', fontSize: '14px' }}>{kmlError}</p> </div> ) : !selectedKmlUrl ? ( <Spin size="large" /> ) : ( <MapaKML urlKML={selectedKmlUrl} /> )}
            </div>
             <div className="modal-gestao-footer">
                <Button onClick={handleCloseMapaModal}>Fechar</Button>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default ModalGestao;