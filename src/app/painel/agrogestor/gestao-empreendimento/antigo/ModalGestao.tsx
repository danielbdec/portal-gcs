"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Tabs, Button, Card, Empty, Tooltip, Spin } from "antd";
import type { TabsProps } from 'antd';
import {
  X, FileText, Plus, Edit, Trash2, Landmark, Waves, Trees, FileStack,
  CalendarCheck, ShieldCheck, Building, Siren, Recycle, FileUp, Download, AlertTriangle, Map,
  ClipboardList, MapPin, Info, CheckCircle2
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
}

interface ModalGestaoProps {
  visible: boolean;
  onClose: () => void;
  empreendimento: Empreendimento | null;
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
            // Vencido
            return {
                text: 'Vencido',
                icon: <AlertTriangle size={14} style={{ marginRight: '4px' }} />,
                tagStyles: {
                    backgroundColor: '#E03131',
                    color: 'white',
                    fontWeight: 'bold',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    fontSize: '13px'
                },
                cardStyles: {
                    borderLeft: '4px solid #E03131'
                }
            };
        }
        // Vigente
        return {
            text: 'Vigente',
            icon: <CheckCircle2 size={14} style={{ marginRight: '4px' }} />,
            tagStyles: {
                backgroundColor: '#2F9E44',
                color: 'white',
                fontWeight: 'bold',
                padding: '4px 8px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                fontSize: '13px'
            },
            cardStyles: {
                borderLeft: '4px solid #2F9E44'
            }
        };
    }
    
    // Não Aplicável
    return {
        text: 'Não Aplicável',
        icon: <Info size={14} style={{ marginRight: '4px' }} />,
        tagStyles: {
            backgroundColor: '#F1F3F5',
            color: '#495057',
            padding: '2px 6px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
        },
        cardStyles: {
            borderLeft: '4px solid #CED4DA'
        }
    };
};

/* ========================================================================
    Modal Genérico de Upload (Reutilizável)
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
  onSuccess?: () => void;
}> = ({ title, tipoDocumento, modulo, allowedExtensions = [".pdf", ".jpg", ".jpeg", ".png", ".tif", ".tiff", ".zip"], extensionsLabel = "PDF/JPG/PNG/TIF/ZIP", open, onClose, empreendimento, onSuccess }) => {
  const [numero, setNumero] = useState<string>("");
  const [orgao, setOrgao] = useState<string>("");
  const [dataEmissao, setDataEmissao] = useState<string>("");
  const [dataValidade, setDataValidade] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [observacao, setObservacao] = useState<string>("");
  const [sending, setSending] = useState<boolean>(false);
  const [notifVisible, setNotifVisible] = useState<boolean>(false);
  const [notifType, setNotifType] = useState<"success" | "error">("success");
  const [notifMsg, setNotifMsg] = useState<string>("");
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (open && modalRef.current) {
      const { clientWidth, clientHeight } = modalRef.current;
      setPosition({ x: window.innerWidth / 2 - clientWidth / 2, y: window.innerHeight / 2 - clientHeight / 2 });
      modalRef.current.focus();
    }
  }, [open]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const t = e.target as HTMLElement;
    if (!modalRef.current || t.closest('button, input, textarea, select, label')) return;
    setIsDragging(true);
    const modalRect = modalRef.current.getBoundingClientRect();
    dragOffsetRef.current = { x: e.clientX - modalRect.left, y: e.clientY - modalRect.top };
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !modalRef.current) return;
    e.preventDefault();
    const modalRect = modalRef.current.getBoundingClientRect();
    const x = clamp(e.clientX - dragOffsetRef.current.x, 8, window.innerWidth - modalRect.width - 8);
    const y = clamp(e.clientY - dragOffsetRef.current.y, 8, window.innerHeight - modalRect.height - 8);
    setPosition({ x, y });
  };

  const handleMouseUp = () => { setIsDragging(false); };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);
  
  useEffect(() => {
    if (!open) {
      setNumero(""); setOrgao(""); setDataEmissao(""); setDataValidade(""); setFile(null); setObservacao("");
      setSending(false); setNotifVisible(false);
    }
  }, [open]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    if (!f) { setFile(null); return; }
    const okExt = allowedExtensions.some((ext) => f.name.toLowerCase().endsWith(ext.toLowerCase()));
    if (!okExt) {
      setNotifType("error"); setNotifMsg(`Extensão não permitida. Use ${extensionsLabel}.`); setNotifVisible(true); return;
    }
    if (f.size > 30 * 1024 * 1024) {
      setNotifType("error"); setNotifMsg("Arquivo acima de 30MB."); setNotifVisible(true); return;
    }
    setFile(f);
  };

  const submit = async () => {
    if (!file) { setNotifType("error"); setNotifMsg("Selecione um arquivo."); setNotifVisible(true); return; }
    if (!numero || !dataEmissao) { setNotifType("error"); setNotifMsg("Preencha Número do Documento e Data de Emissão."); setNotifVisible(true); return; }

    if (dataValidade && dataEmissao) {
        const em = new Date(dataEmissao); em.setUTCHours(0,0,0,0);
        const va = new Date(dataValidade); va.setUTCHours(0,0,0,0);
        if (va < em) {
          setNotifType("error");
          setNotifMsg("A data de validade não pode ser anterior à data de emissão.");
          setNotifVisible(true);
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
      fd.append("file", file);
      
      const resp = await fetch(url, { method: "POST", body: fd, signal: controller.signal });
      
      const rawResult = await resp.json().catch(() => ({ 
          status: 'error', 
          error: `Falha ao processar a resposta do servidor (${resp.status})` 
      }));

      const result = Array.isArray(rawResult) ? rawResult[0] : rawResult;

      if (!resp.ok || !result || result.status !== 'ok') {
        const errorMessage = result?.error || `Ocorreu um erro desconhecido (${resp.status})`;
        throw new Error(errorMessage);
      }
      
      setNotifType("success");
      setNotifMsg(result.message || `${title} enviado para processamento com sucesso!`);
    } catch (err: any) {
      setNotifType("error");
      setNotifMsg(err.name === 'AbortError' ? 'A requisição demorou muito e foi cancelada.' : (err?.message || "Erro ao enviar."));
    } finally {
      clearTimeout(timer);
      setSending(false);
      setNotifVisible(true);
    }
  };

  const handleCloseNotification = () => {
    setNotifVisible(false);
    if (notifType === 'success') {
      onSuccess?.();
      onClose();
    }
  };

  if (!open) return null;

  return (
    <>
      <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.6)", zIndex: 2100 }} />
      <div 
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="upload-title"
        tabIndex={-1}
        style={{ position: "fixed", top: `${position.y}px`, left: `${position.x}px`, width: "95%", maxWidth: 640, background: "#fff", borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.2)", zIndex: 2101, overflow: "hidden", display: "flex", flexDirection: "column" }}
      >
        <div 
            onMouseDown={handleMouseDown}
            style={{ 
                padding: '1rem 1.5rem', 
                borderBottom: '1px solid #dee2e6', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                backgroundColor: '#f1f5fb',
                cursor: isDragging ? 'grabbing' : 'grab'
            }}
        >
          <div>
            <h3 id="upload-title" style={{ margin: 0, color: 'var(--gcs-blue)' }}>Adicionar {title}</h3>
            <p style={{ margin: '4px 0 0 0', color: 'var(--gcs-gray-dark)', fontWeight: 'bold', fontSize: '14px' }}>
              Empreendimento: {empreendimento.nome}
              {empreendimento.numero_matricula && ` | Matrícula: ${empreendimento.numero_matricula}`}
            </p>
          </div>
          <button type="button" onClick={() => { if (!sending) onClose(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }} title="Fechar" disabled={sending}><X size={24} color="var(--gcs-gray-dark)"/></button>
        </div>
        <div style={{ padding: "16px 18px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 16px", opacity: sending ? 0.6 : 1, pointerEvents: sending ? "none" : "auto" }}>
          <div><label className="modal-label">Número do Documento *</label><input value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="Número de identificação" style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1px solid var(--gcs-border-color)" }} /></div>
          <div><label className="modal-label">Órgão Emissor</label><input value={orgao} onChange={(e) => setOrgao(e.target.value)} placeholder="Órgão responsável" style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1px solid var(--gcs-border-color)" }} /></div>
          <div><label className="modal-label">Data de Emissão *</label><input type="date" value={dataEmissao} onChange={(e) => setDataEmissao(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1px solid var(--gcs-border-color)" }} /></div>
          <div><label className="modal-label">Data de Validade</label><input type="date" value={dataValidade} onChange={(e) => setDataValidade(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1px solid var(--gcs-border-color)" }} /></div>
          <div style={{ gridColumn: "1 / span 2" }}><label className="modal-label">Arquivo ({extensionsLabel} até 30MB) *</label><input type="file" onChange={handleFile} accept={allowedExtensions.join(',')} />{file && (<div style={{ marginTop: 6, fontSize: 12, color: "#555" }}> {file.name} — {(file.size / 1024 / 1024).toFixed(2)} MB </div>)}</div>
          <div style={{ gridColumn: "1 / span 2" }}>
            <label className="modal-label">Observação</label>
            <textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} maxLength={250} placeholder="Observações sobre o documento..." rows={3} style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1px solid var(--gcs-border-color)", resize: "vertical" }} />
            <div style={{ textAlign: 'right', fontSize: '12px', color: '#888', marginTop: '4px' }}>{250 - observacao.length} caracteres restantes</div>
          </div>
        </div>
        <div style={{ padding: "14px 18px", borderTop: "1px solid var(--gcs-border-color)", display: "flex", justifyContent: "flex-end", gap: 8 }}><button type="button" className="btn btn-outline-gray" onClick={() => { if (!sending) onClose(); }} disabled={sending}>Fechar</button><button type="button" className="btn btn-green" onClick={submit} disabled={sending}>{sending ? "Enviando..." : "Salvar & Enviar"}</button></div>
        {sending && (<div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.7)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, zIndex: 2102 }}><Spin size="large" /><div style={{ color: "#333", fontWeight: 600 }}>Enviando arquivo…</div></div>)}
      </div>
      <NotificationModal visible={notifVisible} type={notifType} message={notifMsg} onClose={handleCloseNotification} />
    </>
  );
};


/* ========================================================================
    Modal de Edição de Documento
    ======================================================================== */
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
    const [loading, setLoading] = useState(false);
    const [notification, setNotification] = useState({ visible: false, type: 'success' as 'success' | 'error', message: '' });
    const modalRef = useRef<HTMLDivElement>(null);
    
    const inputStyle: React.CSSProperties = {
        width: '100%', padding: '10px', borderRadius: '6px',
        border: '1px solid #dee2e6', fontSize: '1rem'
    };

    useEffect(() => {
        if (visible && modalRef.current) {
            modalRef.current.focus();
        }
    }, [visible]);

    useEffect(() => {
        if (documento) {
            setNumero(documento.numero || "");
            setOrgao(documento.orgaoEmissor || "");
            setObservacao(documento.observacao || "");
            try { setDataEmissao(documento.dataEmissao ? new Date(documento.dataEmissao).toISOString().split('T')[0] : ""); } catch { setDataEmissao(""); }
            try { setDataValidade(documento.dataValidade ? new Date(documento.dataValidade).toISOString().split('T')[0] : ""); } catch { setDataValidade(""); }
        }
    }, [documento]);

    useEffect(() => {
        if (!visible) return;
        const handleKeyDown = (e: KeyboardEvent) => {
          if (e.key === 'Escape') {
            onClose();
          }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => {
          window.removeEventListener('keydown', handleKeyDown);
        };
    }, [visible, onClose]);

    if (!visible || !documento) return null;

    const handleAlterar = async () => {
        setLoading(true);
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 15000);

        try {
            const response = await fetch('/api/agrogestor/altera-documento', { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id_certidao: documento.id,
                    modulo: modulo,
                    numero_documento: numero,
                    orgao: orgao,
                    data_emissao: dataEmissao,
                    data_validade: dataValidade,
                    observacao: observacao,
                }),
                signal: controller.signal,
            });
            
            const rawResult = await response.json().catch(() => ({ status: 'error', error: 'Falha ao processar a resposta do servidor.' }));
            const result = Array.isArray(rawResult) ? rawResult[0] : rawResult;

            if (!response.ok || !result || result.status !== 'ok') {
                throw new Error(result?.error || 'Falha ao alterar o documento.');
            }

            setNotification({ visible: true, type: 'success', message: 'Documento alterado com sucesso!' });
        } catch (error: any) {
            const message = error.name === 'AbortError' ? 'A requisição demorou muito e foi cancelada.' : error.message;
            setNotification({ visible: true, type: 'error', message });
        } finally {
            clearTimeout(timer);
            setLoading(false);
        }
    };
    
    const handleCloseNotification = () => {
        setNotification({ ...notification, visible: false });
        if (notification.type === 'success') {
            onSuccess();
            onClose(); 
        }
    }

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
                <div style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem 1.5rem' }}>
                    <div><label className="modal-label">Número do Documento</label><input value={numero} onChange={e => setNumero(e.target.value)} style={inputStyle} /></div>
                    <div><label className="modal-label">Órgão Emissor</label><input value={orgao} onChange={e => setOrgao(e.target.value)} style={inputStyle} /></div>
                    <div><label className="modal-label">Data de Emissão</label><input type="date" value={dataEmissao} onChange={e => setDataEmissao(e.target.value)} style={inputStyle} /></div>
                    <div><label className="modal-label">Data de Validade</label><input type="date" value={dataValidade} onChange={e => setDataValidade(e.target.value)} style={inputStyle} /></div>
                    <div style={{ gridColumn: '1 / span 2' }}>
                        <label className="modal-label">Observação</label>
                        <textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} maxLength={250} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
                        <div style={{ textAlign: 'right', fontSize: '12px', color: '#888', marginTop: '4px' }}>{250 - observacao.length} caracteres restantes</div>
                    </div>
                </div>
                <div style={{ padding: "14px 18px", borderTop: "1px solid var(--gcs-border-color)", display: "flex", justifyContent: "flex-end", gap: '0.5rem' }}>
                    <Button onClick={onClose} disabled={loading}>Cancelar</Button>
                    <Button onClick={handleAlterar} loading={loading} className="btn-action-edit">Alterar</Button>
                </div>
            </div>
            <NotificationModal visible={notification.visible} type={notification.type} message={notification.message} onClose={handleCloseNotification} />
        </>
    );
};


/* ========================================================================
    Modal de Confirmação de Exclusão
    ======================================================================== */
const ModalConfirmarExclusao: React.FC<{
    visible: boolean;
    onClose: () => void;
    onConfirm: () => void;
    loading: boolean;
}> = ({ visible, onClose, onConfirm, loading }) => {
    useEffect(() => {
        if (!visible) return;
        const handleKeyDown = (e: KeyboardEvent) => {
          if (e.key === 'Escape') {
            onClose();
          }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => {
          window.removeEventListener('keydown', handleKeyDown);
        };
    }, [visible, onClose]);

    if (!visible) return null;
    return (
        <>
            <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 2300 }} />
            <div 
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="delete-title"
                aria-describedby="delete-desc"
                style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 2301, width: '90%', maxWidth: '450px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', padding: '2rem', textAlign: 'center' }}
            >
                <AlertTriangle size={48} color="var(--gcs-orange)" style={{ marginBottom: '1rem' }} />
                <h3 id="delete-title" style={{ margin: '0 0 0.5rem 0', color: 'var(--gcs-blue)' }}>Confirmar Exclusão</h3>
                <p id="delete-desc" style={{ color: 'var(--gcs-gray-dark)', marginBottom: '2rem' }}>Tem certeza que deseja excluir este documento? Esta ação não pode ser desfeita.</p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                    <Button onClick={onClose} disabled={loading}>Cancelar</Button>
                    <Button type="primary" danger onClick={onConfirm} loading={loading}>Excluir</Button>
                </div>
            </div>
        </>
    );
};

/* ========================================================================
    Componente reutilizável DocumentSection
    ======================================================================== */
const DocumentSection: React.FC<{
  title: string;
  icon: React.ReactNode;
  documents: Documento[];
  loading: boolean;
  onAdd: () => void;
  onEdit: (doc: Documento, modulo: string) => void;
  onDelete: (doc: Documento, modulo: string) => void;
  onDownload: (doc: Documento) => void;
  onViewMap?: (doc: Documento) => void;
  headBg?: string;
  downloadingDocId?: number | string | null;
  modulo: string;
}> = React.memo(({
  title, icon, documents, loading, onAdd, onEdit, onDelete, onDownload, onViewMap,
  headBg, downloadingDocId, modulo
}) => {
    return (
        <Card
          title={<div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><>{icon}</><span style={{ color: 'var(--gcs-blue)', fontWeight: 700, fontSize: '1.1rem' }}>{title}</span></div>}
          style={{ marginBottom: '1.5rem' }}
          headStyle={{ background: headBg ?? undefined, borderTopLeftRadius: 8, borderTopRightRadius: 8 }}
          extra={<Button icon={<Plus size={16} />} onClick={onAdd} className="btn-outline-gcs-blue">Adicionar</Button>}
        >
          {loading ? (<div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100px'}}><Spin /></div>) 
          : (!documents || documents.length === 0) ? (<Empty 
                description={
                    <span style={{ color: 'var(--gcs-gray-dark)', fontStyle: 'italic' }}>
                        {`Nenhum documento do tipo "${title}" cadastrado.`}
                    </span>
                }
                image={Empty.PRESENTED_IMAGE_SIMPLE} 
            />) 
          : (<div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {documents.map((doc) => {
                  const { text, icon, tagStyles, cardStyles } = getStatusStyleProps(doc.dataValidade);
                  return (
                  <Card key={doc.id} bordered size="small" style={cardStyles}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                              <FileText size={32} color="var(--gcs-blue)" style={{ marginTop: '5px' }} />
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, auto)', gap: '8px 24px', flex: 1}}>
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
                              <div style={tagStyles}>
                                  {icon}
                                  <span>{text}</span>
                              </div>
                              <div style={{display: 'flex', gap: '8px'}}>
                                  {(doc.nomeArquivo?.toLowerCase().endsWith('.kml') || doc.nomeArquivo?.toLowerCase().endsWith('.kmz')) && onViewMap &&
                                    <Tooltip title="Visualizar no Mapa">
                                        <Button 
                                            icon={<Map size={16} />} 
                                            onClick={() => onViewMap(doc)}
                                            className="btn-action-map"
                                            aria-label="Visualizar no mapa"
                                        />
                                    </Tooltip>
                                  }
                                  <Tooltip title={doc.nomeArquivo || "Baixar Arquivo"}>
                                    <Button 
                                        icon={<Download size={16} />} 
                                        onClick={() => onDownload(doc)} 
                                        loading={downloadingDocId === doc.id}
                                        className="btn-action-download"
                                        aria-label="Baixar arquivo"
                                    />
                                  </Tooltip>
                                  <Tooltip title="Editar Documento">
                                    <Button 
                                        icon={<Edit size={16} />} 
                                        onClick={() => onEdit(doc, modulo)} 
                                        className="btn-action-edit"
                                        aria-label="Editar documento"
                                        disabled={downloadingDocId === doc.id}
                                    />
                                  </Tooltip>
                                  <Tooltip title="Excluir Documento">
                                    <Button 
                                        icon={<Trash2 size={16} />} 
                                        onClick={() => onDelete(doc, modulo)} 
                                        className="btn-action-delete"
                                        aria-label="Excluir documento"
                                        disabled={downloadingDocId === doc.id}
                                    />
                                  </Tooltip>
                              </div>
                          </div>
                      </div>
                  </Card>
              )})}
            </div>
          )}
        </Card>
    );
});
DocumentSection.displayName = 'DocumentSection';

/* ========================================================================
    Configuração dos Modais de Upload
    ======================================================================== */
const UPLOAD_CONFIGS = [
    // Fundiário
    { title: 'Certidão de Inteiro Teor da Matrícula', tipo: 'certidao_inteiro_teor', modulo: 'fundiario' },
    { title: 'Certidão de ITR', tipo: 'itr', modulo: 'fundiario' },
    { title: 'CCIR', tipo: 'ccir', modulo: 'fundiario' },
    { title: 'GEO', tipo: 'geo', modulo: 'fundiario' },
    { title: 'KML', tipo: 'kml', modulo: 'fundiario', allowedExtensions: ['.kml', '.kmz'], extensionsLabel: 'KML / KMZ' },
    { title: 'CIB', tipo: 'cib', modulo: 'fundiario' },
    // Ambiental
    { title: 'ASV (Autorização de Supressão Vegetal)', tipo: 'asv', modulo: 'ambiental' },
    { title: 'Licença Ambiental', tipo: 'licenca', modulo: 'ambiental' },
    { title: 'Outorga', tipo: 'outorga', modulo: 'ambiental' },
    { title: 'APPO (Autorização para Perfuração de Poço)', tipo: 'appo', modulo: 'ambiental' },
    { title: 'CAR (Cadastro Ambiental Rural)', tipo: 'car', modulo: 'ambiental' },
    { title: 'CEFIR (Cadastro Estadual Florestal de Imóveis Rurais)', tipo: 'cefir', modulo: 'ambiental' },
    // Cadastral / Obrigações
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

/* ========================================================================
    Hook de Notificação
    ======================================================================== */
function useNotify() {
    const [notification, setNotification] = useState({ visible: false, type: 'success' as const, message: '' });
    
    const notifySuccess = useCallback((message: string) => {
        setNotification({ visible: true, type: 'success', message });
    }, []);

    const notifyError = useCallback((message: string) => {
        setNotification({ visible: true, type: 'error', message });
    }, []);

    return {
        notifySuccess,
        notifyError,
        notificationProps: {
            ...notification,
            onClose: () => setNotification(v => ({ ...v, visible: false })),
        }
    };
}


/* ========================================================================
    Modal principal: Gestão de Documentos
    ======================================================================== */
const ModalGestao: React.FC<ModalGestaoProps> = ({ visible, onClose, empreendimento }) => {
  const [activeKey, setActiveKey] = useState('1');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [openModals, setOpenModals] = useState<Record<string, boolean>>({});
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
  
  const { notifySuccess, notifyError, notificationProps } = useNotify();
  
  const [moduloSelecionado, setModuloSelecionado] = useState<string>("");

  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const lastFocusedElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (visible && modalRef.current) {
      const { clientWidth, clientHeight } = modalRef.current;
      setPosition({ x: window.innerWidth / 2 - clientWidth / 2, y: window.innerHeight / 2 - clientHeight / 2 });
      
      // Focus trap: save current focus and focus the modal
      lastFocusedElementRef.current = document.activeElement as HTMLElement;
      modalRef.current.focus();
    }
  }, [visible]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const t = e.target as HTMLElement;
    if (!modalRef.current || t.closest('button, input, textarea, select, label, .ant-tabs-tab')) return;
    setIsDragging(true);
    const modalRect = modalRef.current.getBoundingClientRect();
    dragOffsetRef.current = { x: e.clientX - modalRect.left, y: e.clientY - modalRect.top };
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !modalRef.current) return;
    e.preventDefault();
    const modalRect = modalRef.current.getBoundingClientRect();
    const x = clamp(e.clientX - dragOffsetRef.current.x, 8, window.innerWidth - modalRect.width - 8);
    const y = clamp(e.clientY - dragOffsetRef.current.y, 8, window.innerHeight - modalRect.height - 8);
    setPosition({ x, y });
  }, [isDragging]);

  const handleMouseUp = useCallback(() => { setIsDragging(false); }, []);

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

  useEffect(() => {
    if (!visible) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusableElements.length) return; // Proteção: não circular se não houver focáveis
        
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
            if (document.activeElement === firstElement) {
                lastElement.focus();
                e.preventDefault();
            }
        } else {
            if (document.activeElement === lastElement) {
                firstElement.focus();
                e.preventDefault();
            }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      // Focus trap: restore focus on close
      lastFocusedElementRef.current?.focus();
    };
  }, [visible, onClose]);
  
  const handleOpenModal = useCallback((modalName: string) => setOpenModals(prev => ({ ...prev, [modalName]: true })), []);
  const handleCloseModal = useCallback((modalName: string) => setOpenModals(prev => ({ ...prev, [modalName]: false })), []);
  
  const handleSuccessUpload = useCallback(() => {
    setRefreshTrigger(t => t + 1);
  }, []);
  
  useEffect(() => {
    if (visible && empreendimento) {
      const controller = new AbortController();
      let timedOut = false;
      const timeoutId = setTimeout(() => { 
        timedOut = true; 
        controller.abort(); 
      }, 15000);
      
      const fetchAllDocuments = async () => {
        setLoading(true);
        try {
          const response = await fetch("/api/agrogestor/consulta-certidao", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ empreendimento_id: empreendimento.id }),
            signal: controller.signal
          });

          if (response.status === 204) {
            setDocumentos({});
            return;
          }
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
              observacao: doc.observacao || doc.observacoes || ''
          }));

          const groupedDocs = formattedData.reduce((acc, doc) => {
            const { tipo } = doc;
            if (!acc[tipo]) {
              acc[tipo] = [];
            }
            acc[tipo].push(doc);
            return acc;
          }, {} as Record<string, Documento[]>);

          setDocumentos(groupedDocs);

        } catch (error: any) {
          if (error.name === 'AbortError') {
            if (timedOut) {
              notifyError('A busca por documentos demorou muito e foi cancelada.');
            }
            // Se não foi timeout, foi unmount (usuário fechou modal), então não notificamos.
          } else {
            console.error(`Erro ao carregar documentos:`, error);
            notifyError('Falha ao carregar documentos.');
          }
        } finally {
          clearTimeout(timeoutId);
          setLoading(false);
        }
      };

      fetchAllDocuments();

      return () => {
        controller.abort();
      };
    }
  }, [visible, empreendimento, refreshTrigger, notifyError]);
  
  const handleOpenMapaModal = useCallback(async (doc: Documento) => {
    if (!doc.relKey || !doc.nomeArquivo) return;
    setIsMapaModalVisible(true); 
    setSelectedKmlUrl(null);
    setKmlError(null);
    
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);

    try {
        const response = await fetch('/api/agrogestor/download-arquivo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ relKey: doc.relKey, nome_arquivo: doc.nomeArquivo }),
            signal: controller.signal,
        });
        if (!response.ok) throw new Error('Não foi possível carregar o arquivo KML.');
        const blob = await response.blob();
        if (currentKmlUrlRef.current) URL.revokeObjectURL(currentKmlUrlRef.current);
        const url = URL.createObjectURL(blob);
        currentKmlUrlRef.current = url; 
        setSelectedKmlUrl(url);
    } catch (error: any) {
        const message = error.name === 'AbortError' ? 'A requisição demorou muito.' : (error?.message || 'Não foi possível carregar o KML.');
        setKmlError(message);
    } finally {
        clearTimeout(timer);
    }
  }, []);

  const handleCloseMapaModal = useCallback(() => {
    setIsMapaModalVisible(false);
    setKmlError(null);
  }, []);
  
  useEffect(() => {
      if (!isMapaModalVisible && currentKmlUrlRef.current) {
        URL.revokeObjectURL(currentKmlUrlRef.current);
        currentKmlUrlRef.current = null;
      }
  }, [isMapaModalVisible]);

  const handleDownload = useCallback(async (doc: Documento) => {
    if (!doc.relKey || !doc.nomeArquivo) return;
    setDownloadingDocId(doc.id);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);

    try {
        const response = await fetch('/api/agrogestor/download-arquivo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ relKey: doc.relKey, nome_arquivo: doc.nomeArquivo }),
            signal: controller.signal
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Não foi possível baixar o arquivo.' }));
            throw new Error(errorData.message || 'Não foi possível baixar o arquivo.');
        }
        
        const blob = await response.blob();
        const disp = response.headers.get('content-disposition');
        const suggested = disp?.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/)?.[1];
        
        const ct = response.headers.get('content-type') || '';
        const ext = ct.includes('pdf') ? '.pdf' : ct.includes('kml') ? '.kml' : ct.includes('zip') ? '.zip' : '';

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = suggested ? decodeURIComponent(suggested) : (doc.nomeArquivo || ('arquivo' + ext));
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
    } catch (error: any) {
        const message = error.name === 'AbortError' ? 'O download demorou muito e foi cancelado.' : error.message;
        notifyError(message);
    } finally {
        clearTimeout(timer);
        setDownloadingDocId(null);
    }
  }, [notifyError]);

  const handleAbrirModalEdicao = useCallback((doc: Documento, modulo: string) => {
      setDocumentoParaEditar(doc);
      setModuloSelecionado(modulo);
      setIsEditModalVisible(true);
  }, []);

  const handleAbrirModalExclusao = useCallback((doc: Documento, modulo: string) => {
    setDocumentoParaExcluir(doc);
    setModuloSelecionado(modulo);
    setIsDeleteModalVisible(true);
  }, []);

  const handleConfirmarExclusao = useCallback(async () => {
    if (!documentoParaExcluir) return;
    setIsDeleting(true);
    try {
        const response = await fetch('/api/agrogestor/inativa-documento', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              id_certidao: documentoParaExcluir.id,
              modulo: moduloSelecionado
            }),
        });
        
        if (response.status === 204) {
            // Sucesso sem conteúdo
        } else {
            const rawResult = await response.json().catch(() => ({ status: 'error', error: 'Falha ao processar a resposta do servidor.' }));
            const result = Array.isArray(rawResult) ? rawResult[0] : rawResult;

            if (!response.ok || !result || result.status !== 'ok') {
                throw new Error(result?.error || 'Falha ao excluir o documento.');
            }
        }

        notifySuccess('Documento excluído com sucesso!');
        setRefreshTrigger(t => t + 1);
    } catch (error: any) {
        notifyError(error.message);
    } finally {
        setIsDeleting(false);
        setIsDeleteModalVisible(false);
    }
  }, [documentoParaExcluir, moduloSelecionado, notifySuccess, notifyError]);

  const handleBackdropClick = () => {
    const isAnyUploadModalOpen = Object.values(openModals).some(isOpen => isOpen);
    if (isDeleting || downloadingDocId || isAnyUploadModalOpen) return;
    onClose();
  }
  
  const HEAD_HIGHLIGHT = "rgba(0, 102, 204, 0.10)";
  
  const tabItems = useMemo<TabsProps['items']>(() => [
    {
      key: '1',
      label: <span style={{display:'flex',alignItems:'center',gap:8}}><Landmark size={18}/> Fundiário</span>,
      children: (
        <div style={{ padding:'1rem 1.5rem', overflowY:'auto', height:'calc(90vh - 140px)' }}>
            <DocumentSection modulo="fundiario" title="Certidão de Inteiro Teor da Matrícula" icon={<FileText size={20}/>} documents={documentos['certidao_inteiro_teor'] || []} loading={loading} onAdd={() => handleOpenModal('certidao_inteiro_teor')} onEdit={handleAbrirModalEdicao} onDelete={handleAbrirModalExclusao} onDownload={handleDownload} downloadingDocId={downloadingDocId} headBg={HEAD_HIGHLIGHT} />
            <DocumentSection modulo="fundiario" title="Certidão de ITR" icon={<Recycle size={20}/>} documents={documentos['itr'] || []} loading={loading} onAdd={() => handleOpenModal('itr')} onEdit={handleAbrirModalEdicao} onDelete={handleAbrirModalExclusao} onDownload={handleDownload} downloadingDocId={downloadingDocId} headBg={HEAD_HIGHLIGHT} />
            <DocumentSection modulo="fundiario" title="CCIR" icon={<FileStack size={20}/>} documents={documentos['ccir'] || []} loading={loading} onAdd={() => handleOpenModal('ccir')} onEdit={handleAbrirModalEdicao} onDelete={handleAbrirModalExclusao} onDownload={handleDownload} downloadingDocId={downloadingDocId} headBg={HEAD_HIGHLIGHT} />
            <DocumentSection modulo="fundiario" title="GEO" icon={<Trees size={20}/>} documents={documentos['geo'] || []} loading={loading} onAdd={() => handleOpenModal('geo')} onEdit={handleAbrirModalEdicao} onDelete={handleAbrirModalExclusao} onDownload={handleDownload} downloadingDocId={downloadingDocId} headBg={HEAD_HIGHLIGHT} />
            <DocumentSection modulo="fundiario" title="KML" icon={<FileUp size={20}/>} documents={documentos['kml'] || []} loading={loading} onAdd={() => handleOpenModal('kml')} onEdit={handleAbrirModalEdicao} onDelete={handleAbrirModalExclusao} onDownload={handleDownload} onViewMap={handleOpenMapaModal} downloadingDocId={downloadingDocId} headBg={HEAD_HIGHLIGHT} />
            <DocumentSection modulo="fundiario" title="CIB" icon={<FileStack size={20}/>} documents={documentos['cib'] || []} loading={loading} onAdd={() => handleOpenModal('cib')} onEdit={handleAbrirModalEdicao} onDelete={handleAbrirModalExclusao} onDownload={handleDownload} downloadingDocId={downloadingDocId} headBg={HEAD_HIGHLIGHT} />
        </div>
      )
    },
    {
      key: '2',
      label: <span style={{display:'flex',alignItems:'center',gap:8}}><Trees size={18}/> Ambiental</span>,
      children: (
        <div style={{ padding:'1rem 1.5rem', overflowY:'auto', height:'calc(90vh - 140px)' }}>
            <DocumentSection modulo="ambiental" title="ASV (Autorização de Supressão Vegetal)" icon={<Trees size={20} />} documents={documentos['asv'] || []} loading={loading} onAdd={() => handleOpenModal('asv')} onEdit={handleAbrirModalEdicao} onDelete={handleAbrirModalExclusao} onDownload={handleDownload} headBg={HEAD_HIGHLIGHT}/>
            <DocumentSection modulo="ambiental" title="Licença Ambiental (Licença estadual, municipal e federal)" icon={<ShieldCheck size={20} />} documents={documentos['licenca'] || []} loading={loading} onAdd={() => handleOpenModal('licenca')} onEdit={handleAbrirModalEdicao} onDelete={handleAbrirModalExclusao} onDownload={handleDownload} headBg={HEAD_HIGHLIGHT}/>
            <DocumentSection modulo="ambiental" title="Outorga" icon={<Waves size={20} />} documents={documentos['outorga'] || []} loading={loading} onAdd={() => handleOpenModal('outorga')} onEdit={handleAbrirModalEdicao} onDelete={handleAbrirModalExclusao} onDownload={handleDownload} headBg={HEAD_HIGHLIGHT}/>
            <DocumentSection modulo="ambiental" title="APPO (Autorização para Perfuração de Poço)" icon={<Waves size={20} />} documents={documentos['appo'] || []} loading={loading} onAdd={() => handleOpenModal('appo')} onEdit={handleAbrirModalEdicao} onDelete={handleAbrirModalExclusao} onDownload={handleDownload} headBg={HEAD_HIGHLIGHT}/>
            <DocumentSection modulo="ambiental" title="CAR (Cadastro Ambiental Rural)" icon={<FileText size={20} />} documents={documentos['car'] || []} loading={loading} onAdd={() => handleOpenModal('car')} onEdit={handleAbrirModalEdicao} onDelete={handleAbrirModalExclusao} onDownload={handleDownload} headBg={HEAD_HIGHLIGHT}/>
            <DocumentSection modulo="ambiental" title="CEFIR (Cadastro Estadual Florestal de Imóveis Rurais)" icon={<FileText size={20} />} documents={documentos['cefir'] || []} loading={loading} onAdd={() => handleOpenModal('cefir')} onEdit={handleAbrirModalEdicao} onDelete={handleAbrirModalExclusao} onDownload={handleDownload} headBg={HEAD_HIGHLIGHT}/>
        </div>
      )
    },
    {
      key: '3',
      label: <span style={{display:'flex',alignItems:'center',gap:8}}><Building size={18}/> Cadastral / Obrigações</span>,
      children: (
        <div style={{ padding:'1rem 1.5rem', overflowY:'auto', height:'calc(90vh - 140px)' }}>
            <DocumentSection modulo="cadastral_obrigacoes" title="ADA" icon={<FileText size={20} />} documents={documentos['ada'] || []} loading={loading} onAdd={() => handleOpenModal('ada')} onEdit={handleAbrirModalEdicao} onDelete={handleAbrirModalExclusao} onDownload={handleDownload} headBg={HEAD_HIGHLIGHT} />
            <DocumentSection modulo="cadastral_obrigacoes" title="ITR (Cadastral)" icon={<Recycle size={20} />} documents={documentos['itr_cadastral'] || []} loading={loading} onAdd={() => handleOpenModal('itr_cadastral')} onEdit={handleAbrirModalEdicao} onDelete={handleAbrirModalExclusao} onDownload={handleDownload} headBg={HEAD_HIGHLIGHT} />
            <DocumentSection modulo="cadastral_obrigacoes" title="Relatórios" icon={<FileStack size={20} />} documents={documentos['relatorio'] || []} loading={loading} onAdd={() => handleOpenModal('relatorio')} onEdit={handleAbrirModalEdicao} onDelete={handleAbrirModalExclusao} onDownload={handleDownload} headBg={HEAD_HIGHLIGHT} />
            <DocumentSection modulo="cadastral_obrigacoes" title="Alvarás" icon={<CalendarCheck size={20} />} documents={documentos['alvara'] || []} loading={loading} onAdd={() => handleOpenModal('alvara')} onEdit={handleAbrirModalEdicao} onDelete={handleAbrirModalExclusao} onDownload={handleDownload} headBg={HEAD_HIGHLIGHT} />
            <DocumentSection modulo="cadastral_obrigacoes" title="Inventário de Resíduos" icon={<Trash2 size={20} />} documents={documentos['inventario_residuos'] || []} loading={loading} onAdd={() => handleOpenModal('inventario_residuos')} onEdit={handleAbrirModalEdicao} onDelete={handleAbrirModalExclusao} onDownload={handleDownload} headBg={HEAD_HIGHLIGHT} />
            <DocumentSection modulo="cadastral_obrigacoes" title="Certificado Bombeiros" icon={<Siren size={20} />} documents={documentos['certificado_bombeiros'] || []} loading={loading} onAdd={() => handleOpenModal('certificado_bombeiros')} onEdit={handleAbrirModalEdicao} onDelete={handleAbrirModalExclusao} onDownload={handleDownload} headBg={HEAD_HIGHLIGHT} />
            <DocumentSection modulo="cadastral_obrigacoes" title="CTF – Ibama" icon={<ShieldCheck size={20} />} documents={documentos['ctf_ibama'] || []} loading={loading} onAdd={() => handleOpenModal('ctf_ibama')} onEdit={handleAbrirModalEdicao} onDelete={handleAbrirModalExclusao} onDownload={handleDownload} headBg={HEAD_HIGHLIGHT} />
            <DocumentSection modulo="cadastral_obrigacoes" title="RAPP – Ibama" icon={<ClipboardList size={20} />} documents={documentos['rapp_ibama'] || []} loading={loading} onAdd={() => handleOpenModal('rapp_ibama')} onEdit={handleAbrirModalEdicao} onDelete={handleAbrirModalExclusao} onDownload={handleDownload} headBg={HEAD_HIGHLIGHT} />
            <DocumentSection modulo="cadastral_obrigacoes" title="Certificado de Uso de Solo" icon={<MapPin size={20} />} documents={documentos['certificado_uso_solo'] || []} loading={loading} onAdd={() => handleOpenModal('certificado_uso_solo')} onEdit={handleAbrirModalEdicao} onDelete={handleAbrirModalExclusao} onDownload={handleDownload} headBg={HEAD_HIGHLIGHT} />
        </div>
      )
    }
  ], [documentos, loading, downloadingDocId, handleOpenModal, handleAbrirModalEdicao, handleAbrirModalExclusao, handleDownload, handleOpenMapaModal]);

  if (!visible || !empreendimento) return null;

  return (
    <>
      <div 
        style={{ position: 'fixed', top:0, left:0, width:'100vw', height:'100vh', backgroundColor:'rgba(0,0,0,0.6)', zIndex: 1000 }}
        onClick={handleBackdropClick}
      />
      <div 
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
        style={{ 
            position: 'fixed', 
            top: `${position.y}px`, 
            left: `${position.x}px`, 
            backgroundColor: 'white', 
            borderRadius: '12px', 
            zIndex: 1001, 
            width: '95%', 
            maxWidth: '1200px', 
            height: '90vh', 
            display: 'flex', 
            flexDirection: 'column' 
        }}>
        <div 
            onMouseDown={handleMouseDown}
            style={{ 
                padding: '1rem 1.5rem', 
                borderBottom: '1px solid #dee2e6', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                backgroundColor: '#f1f5fb',
                cursor: isDragging ? 'grabbing' : 'grab'
            }}
        >
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
          <Tabs 
            items={tabItems} 
            activeKey={activeKey}
            onChange={setActiveKey}
            tabPosition="left" 
            style={{ height: '100%' }} 
            animated={{ inkBar: true, tabPane: true }} 
        />
        </div>
        <div style={{ padding:'1rem 1.5rem', borderTop:'1px solid #dee2e6', display:'flex', justifyContent:'flex-end' }}>
          <Button onClick={onClose} size="large" className="btn-gcs-blue" disabled={isDeleting}>Fechar</Button>
        </div>
      </div>
      
      {/* Modais de Upload */}
      {UPLOAD_CONFIGS.map(config => (
        <ModalUploadGenerico
            key={config.tipo}
            title={config.title}
            tipoDocumento={config.tipo}
            modulo={config.modulo}
            allowedExtensions={config.allowedExtensions}
            extensionsLabel={config.extensionsLabel}
            open={!!openModals[config.tipo]}
            onClose={() => handleCloseModal(config.tipo)}
            empreendimento={empreendimento}
            onSuccess={handleSuccessUpload}
        />
      ))}

      {/* Modais de Ação */}
      <ModalEditarDocumento visible={isEditModalVisible} onClose={() => setIsEditModalVisible(false)} documento={documentoParaEditar} empreendimento={empreendimento} modulo={moduloSelecionado} onSuccess={() => { setIsEditModalVisible(false); setRefreshTrigger(t => t + 1); }} />
      <ModalConfirmarExclusao visible={isDeleteModalVisible} onClose={() => setIsDeleteModalVisible(false)} onConfirm={handleConfirmarExclusao} loading={isDeleting} />
      <NotificationModal {...notificationProps} />

      {/* Modal do Mapa */}
      {isMapaModalVisible && (
        <>
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 2400 }} onClick={handleCloseMapaModal} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 2401, width: '90%', maxWidth: '800px', backgroundColor: 'white', borderRadius: '12px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #dee2e6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, color: 'var(--gcs-blue)' }}><Map size={20}/> Visualizador de Limites</h3>
                <button type="button" onClick={handleCloseMapaModal} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24}/></button>
            </div>
            <div style={{ padding: '1.5rem', minHeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {kmlError ? (
                  <div style={{ textAlign: 'center', color: '#E03131' }}>
                      <AlertTriangle size={32} style={{ marginBottom: '1rem' }} />
                      <p style={{ margin: 0, fontWeight: 'bold' }}>Erro ao carregar o mapa</p>
                      <p style={{ margin: '0.5rem 0 0 0', fontSize: '14px' }}>{kmlError}</p>
                  </div>
              ) : !selectedKmlUrl ? (
                <Spin size="large" />
              ) : (
                <MapaKML urlKML={selectedKmlUrl} />
              )}
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