"use client";

import React, { useState, useMemo } from "react";
import { Button, Card, Empty, Tooltip, Divider, Spin } from "antd";
import {
  FileText, Plus, Edit, Trash2, Download, AlertTriangle, Map,
  ClipboardList, Info, CheckCircle2, ChevronDown, ChevronRight,
  CalendarCheck
} from 'lucide-react';

// --- Interfaces ---
export interface Documento {
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

export interface Ocorrencia {
  id: number | string;
  empreendimento_id: number;
  tipo_documento: string;
  data_ocorrencia: string;
  descricao: string;
  criado_em?: string;
  criado_por?: string;
  status?: string;
}

type DocumentoStatus = 'Vigente' | 'Vencido' | 'Não Aplicável';

// --- Funções Auxiliares ---
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

// Retorna a CLASSE CSS e o Ícone, em vez de estilos inline hardcoded
const getStatusProps = (dataValidade: string | null | undefined): {
    text: DocumentoStatus;
    icon: React.ReactNode;
    cssClass: string;
    cardBorderColor: string;
} => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    if (!isEmptyDate(dataValidade)) {
        const validade = new Date(dataValidade as string);
        validade.setHours(0, 0, 0, 0);

        if (validade < hoje) {
            return {
                text: 'Vencido',
                icon: <AlertTriangle size={14} style={{ marginRight: '6px' }} />,
                cssClass: 'status-tag-vencido',
                cardBorderColor: '#E03131'
            };
        }
        return {
            text: 'Vigente',
            icon: <CheckCircle2 size={14} style={{ marginRight: '6px' }} />,
            cssClass: 'status-tag-vigente',
            cardBorderColor: '#2F9E44'
        };
    }
    
    return {
        text: 'Não Aplicável',
        icon: <Info size={14} style={{ marginRight: '6px' }} />,
        cssClass: 'status-tag-na',
        cardBorderColor: '#CED4DA' // Será sobrescrito pelo CSS no dark mode se necessário, ou mantido sutil
    };
};

interface DocumentSectionProps {
  title: string;
  icon: React.ReactNode;
  documents: Documento[];
  ocorrencias: Ocorrencia[];
  loading: boolean;
  onAddDocumento: () => void;
  onAddCondicionante: () => void;
  onAddOcorrencia: () => void;
  onEditOcorrencia: (ocorrencia: Ocorrencia) => void;
  onEdit: (doc: Documento, modulo: string) => void;
  onDelete: (doc: Documento, modulo: string) => void;
  onDownload: (doc: Documento) => void;
  onViewMap?: (doc: Documento) => void;
  headBg?: string; 
  downloadingDocId?: number | string | null;
  modulo: string;
}

const DocumentSection: React.FC<DocumentSectionProps> = React.memo(({
  title, icon, documents, ocorrencias = [], loading, 
  onAddDocumento, onAddCondicionante, onAddOcorrencia, onEditOcorrencia, 
  onEdit, onDelete, onDownload, onViewMap,
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
    const [eventosExpanded, setEventosExpanded] = useState(false);

    const renderDocumentCard = (doc: Documento) => {
        const { text, icon, cssClass, cardBorderColor } = getStatusProps(doc.dataValidade);
        
        // Ajuste dinâmico da borda do card para o modo escuro (caso N/A)
        // Se for N/A, deixamos o CSS controlar a borda do card via classe ou usamos uma cor neutra
        const finalBorderColor = text === 'Não Aplicável' ? 'rgba(125, 173, 222, 0.3)' : cardBorderColor;

        return (
            <Card 
                key={doc.id} 
                bordered 
                size="small" 
                className="doc-inner-card"
                style={{ 
                    borderLeft: `4px solid ${cardBorderColor}`, // Cor da borda esquerda baseada no status
                }}
            >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                        <FileText size={32} className="doc-icon-color" style={{ marginTop: '5px' }} />
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, auto)', gap: '8px 24px', flex: 1}}>
                            {doc.condicionante === 'S' && doc.tipo_condicionante_nome &&
                                <p style={{ 
                                    margin: '0 0 6px 0', 
                                    gridColumn: '1 / span 2', 
                                    fontWeight: 600, 
                                    fontSize: '0.9rem', 
                                    borderBottom: '1px solid var(--gcs-border-color)',
                                    paddingBottom: '6px' 
                                }} className="doc-title-highlight">
                                    {doc.tipo_condicionante_nome}
                                </p>
                            }
                            <p style={{ margin: 0 }} className="doc-text"><strong className="doc-label">N° Documento:</strong> {doc.numero || '-'}</p>
                            <p style={{ margin: 0 }} className="doc-text"><strong className="doc-label">Órgão Emissor:</strong> {doc.orgaoEmissor || '-'}</p>
                            <p style={{ margin: 0 }} className="doc-text"><strong className="doc-label">Data Emissão:</strong> {formatDate(doc.dataEmissao)}</p>
                            <p style={{ margin: 0 }} className="doc-text"><strong className="doc-label">Data Validade:</strong> {formatDate(doc.dataValidade)}</p>
                            {doc.observacao && (
                                <p style={{ margin: 0, gridColumn: '1 / span 2', marginTop: '8px', paddingTop: '8px', borderTop: '1px dotted #ccc', whiteSpace: 'normal' }} className="doc-text">
                                    <strong>Observação:</strong> {doc.observacao}
                                </p>
                            )}
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', flexShrink: 0 }}>
                        
                        {/* TAG DE STATUS COM CLASSE CSS */}
                        <div className={`status-tag ${cssClass}`}>
                            {icon}<span>{text}</span>
                        </div>

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
        <>
        <style>{`
            /* --- VARIÁVEIS DE SUPORTE --- */
            :root {
                --gcs-blue: #00314A;
                --gcs-gray-dark: #6c757d;
                --gcs-border-color: #dee2e6;
                --gcs-gray-light: #f8f9fa;
                --gcs-blue-sky: #7DD3FC;
                --gcs-dark-text-primary: #F1F5F9;
                --gcs-dark-text-secondary: #CBD5E1;
            }

            /* --- ESTILOS DAS TAGS DE STATUS --- */
            .status-tag {
                padding: 4px 8px;
                border-radius: 6px;
                display: flex;
                align-items: center;
                font-size: 13px;
                font-weight: 600;
                line-height: 1;
            }

            /* VIGENTE (Verde) */
            .status-tag-vigente {
                background-color: #2F9E44;
                color: white;
                border: 1px solid #2F9E44;
            }

            /* VENCIDO (Vermelho) */
            .status-tag-vencido {
                background-color: #E03131;
                color: white;
                border: 1px solid #E03131;
            }

            /* NÃO APLICÁVEL (Cinza no Light / Transparente no Dark) */
            .status-tag-na {
                background-color: #F1F3F5;
                color: #495057;
                border: 1px solid #CED4DA;
                font-weight: 500;
            }

            /* --- MODO CLARO (PADRÃO) --- */
            .doc-section-card {
                margin-bottom: 1.5rem;
                background-color: #fff;
                border: 1px solid var(--gcs-border-color);
            }
            .doc-section-card .ant-card-head {
                background-color: rgba(0, 102, 204, 0.10);
                border-bottom: 1px solid var(--gcs-border-color);
            }
            .doc-section-title { color: var(--gcs-blue); }
            
            /* Botões Outline Blue (Light) */
            .btn-outline-gcs-blue {
                background-color: transparent !important;
                border: 1px solid var(--gcs-blue) !important;
                color: var(--gcs-blue) !important;
                transition: all 0.2s ease !important;
            }
            .btn-outline-gcs-blue:hover {
                background-color: var(--gcs-blue) !important;
                color: white !important;
            }

            /* Card Interno */
            .doc-inner-card.ant-card {
                background: #fff;
                border: 1px solid rgba(0, 102, 204, 0.25);
                /* Border Left é controlado inline pelo JS para a cor do status */
            }
            .doc-icon-color { color: var(--gcs-blue); }
            .doc-title-highlight { color: var(--gcs-blue); }
            .doc-label { color: var(--gcs-gray-dark); }
            .doc-text { color: #333; }

            /* Seções Expansíveis */
            .expandable-section {
                background-color: #F8F9FA;
                border: 1px solid transparent;
            }
            .expandable-section-title { color: var(--gcs-blue); }
            .expandable-divider { border-color: var(--gcs-border-color); }
            
            /* Ocorrências */
            .ocorrencia-item {
                background: #fff;
                border: 1px solid #eee;
            }
            .ocorrencia-header { color: var(--gcs-blue); }
            .ocorrencia-subtext { color: var(--gcs-gray-dark); }
            .ocorrencia-desc { color: #555; }


            /* --- MODO ESCURO (DARK) --- */
            
            /* Card Principal */
            body.dark .doc-section-card.ant-card {
                background-color: rgba(25, 39, 53, 0.4) !important;
                border: 1px solid rgba(125, 173, 222, 0.2) !important;
            }
            body.dark .doc-section-card .ant-card-head {
                background-color: rgba(25, 39, 53, 0.6) !important;
                border-bottom: 1px solid rgba(125, 173, 222, 0.2) !important;
                color: var(--gcs-dark-text-primary) !important;
            }
            body.dark .doc-section-title { color: var(--gcs-blue-sky) !important; }
            body.dark .doc-section-card .ant-card-body {
                background-color: transparent !important;
            }

            /* Botões Outline - Correção de Contraste */
            body.dark .btn-outline-gcs-blue {
                border-color: var(--gcs-blue-sky) !important;
                color: var(--gcs-blue-sky) !important;
                background: transparent !important;
            }
            body.dark .btn-outline-gcs-blue:hover {
                background-color: rgba(125, 211, 252, 0.15) !important;
                color: #fff !important;
                border-color: #fff !important;
            }

            /* Card Interno */
            body.dark .doc-inner-card.ant-card {
                background-color: rgba(25, 39, 53, 0.6) !important;
                border-color: rgba(125, 173, 222, 0.2) !important;
            }
            body.dark .doc-inner-card .ant-card-body {
                background-color: transparent !important;
                color: var(--gcs-dark-text-primary) !important;
            }
            
            /* --- CORREÇÃO DA TAG N/A NO DARK MODE --- */
            body.dark .status-tag-na {
                background-color: transparent !important; /* Fundo transparente */
                border: 1px solid rgba(125, 173, 222, 0.3) !important; /* Borda azulada sutil */
                color: rgba(125, 173, 222, 0.7) !important; /* Texto azulado sutil */
            }
            /* A borda esquerda do card N/A também deve ser sutil */
            body.dark .doc-inner-card.ant-card[style*="border-left: 4px solid #CED4DA"] {
                 border-left-color: rgba(125, 173, 222, 0.3) !important;
            }

            /* Ícones e Textos Internos */
            body.dark .doc-icon-color { color: var(--gcs-blue-sky) !important; }
            body.dark .doc-title-highlight { 
                color: var(--gcs-blue-sky) !important; 
                border-bottom-color: rgba(125, 173, 222, 0.2) !important;
            }
            body.dark .doc-label { color: var(--gcs-dark-text-secondary) !important; }
            body.dark .doc-text { color: var(--gcs-dark-text-primary) !important; }

            /* Seções Expansíveis */
            body.dark .expandable-section {
                background-color: rgba(0, 0, 0, 0.2) !important;
                border: 1px solid rgba(125, 173, 222, 0.1) !important;
            }
            body.dark .expandable-section-title { color: var(--gcs-dark-text-primary) !important; }
            body.dark .expandable-divider { border-color: rgba(125, 173, 222, 0.2) !important; }

            /* Ocorrências */
            body.dark .ocorrencia-item {
                background: rgba(25, 39, 53, 0.6) !important;
                border-color: rgba(125, 173, 222, 0.2) !important;
            }
            body.dark .ocorrencia-header { color: var(--gcs-blue-sky) !important; }
            body.dark .ocorrencia-subtext { color: var(--gcs-dark-text-secondary) !important; }
            body.dark .ocorrencia-desc { color: var(--gcs-dark-text-primary) !important; }
            
            body.dark .ant-empty-description { color: var(--gcs-dark-text-secondary) !important; }

        `}</style>

        <Card
          title={<div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><>{icon}</><span className="doc-section-title" style={{ fontWeight: 700, fontSize: '1.1rem' }}>{title}</span></div>}
          className="doc-section-card"
          headStyle={{ borderTopLeftRadius: 8, borderTopRightRadius: 8 }} 
          extra={<Button icon={<Plus size={16} />} onClick={onAddDocumento} className="btn-outline-gcs-blue">Documento</Button>}
        >
          {loading ? (
             <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100px'}}>
                <Spin />
             </div>
          ) : (
          <>
            {documentosPrincipais.length === 0 ? (
                <Empty description={<span style={{ color: 'var(--gcs-gray-dark)', fontStyle: 'italic' }}>Nenhum documento principal cadastrado.</span>} image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {documentosPrincipais.map(renderDocumentCard)}
                </div>
            )}

            {/* SEÇÃO DE CONDICIONANTES */}
            <Divider className="expandable-divider" style={{ margin: '24px 0' }} />
            <div className="expandable-section" style={{ padding: '8px', borderRadius: '8px' }}>
                <div onClick={() => setCondicionantesExpanded(!condicionantesExpanded)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                    <h4 className="expandable-section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
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

            {/* === NOVA SEÇÃO: OCORRÊNCIAS (EVENTOS) DO GRUPO === */}
            <Divider className="expandable-divider" style={{ margin: '24px 0' }} />
            <div className="expandable-section" style={{ padding: '8px', borderRadius: '8px' }}>
                <div 
                    onClick={() => setEventosExpanded(!eventosExpanded)} 
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                >
                    <h4 className="expandable-section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem' }}>
                        {eventosExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <ClipboardList size={18} /> Ocorrências ({ocorrencias.length})
                        </span>
                    </h4>
                    <div className="ant-card-extra" style={{ float: 'none', marginLeft: 'auto' }}>
                        <Button
                            icon={<Plus size={16} />}
                            onClick={(e) => { e.stopPropagation(); onAddOcorrencia(); }}
                            className="btn-outline-gcs-blue"
                            size="small"
                        >
                            Ocorrência
                        </Button>
                    </div>
                </div>

                {eventosExpanded && (
                    <div style={{ marginTop: '16px', paddingLeft: '1rem', borderLeft: '2px solid var(--gcs-border-color)' }}>
                        {ocorrencias.length === 0 ? (
                            <Empty 
                                description={<span style={{ color: 'var(--gcs-gray-dark)', fontStyle: 'italic' }}>Nenhuma ocorrência registrada.</span>} 
                                image={Empty.PRESENTED_IMAGE_SIMPLE} 
                            />
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {ocorrencias.map((evt) => (
                                    <div 
                                        key={evt.id} 
                                        className="ocorrencia-item"
                                        style={{ 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            justifyContent: 'space-between', 
                                            padding: '10px', 
                                            borderRadius: '6px', 
                                        }}
                                    >
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <div className="ocorrencia-header" style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <CalendarCheck size={14} /> 
                                                {formatDate(evt.data_ocorrencia)}
                                                {evt.criado_por && (
                                                    <span className="ocorrencia-subtext" style={{ fontWeight: 'normal', marginLeft: '4px', fontSize: '0.85rem' }}>
                                                        - Por: {evt.criado_por}
                                                    </span>
                                                )}
                                            </div>
                                            <span className="ocorrencia-desc">{evt.descricao}</span>
                                        </div>
                                        
                                        <div style={{ display: 'flex', gap: '6px' }}>
                                            <Tooltip title="Editar Ocorrência">
                                                <Button size="small" icon={<Edit size={14} />} onClick={() => onEditOcorrencia(evt)} className="btn-action-edit" />
                                            </Tooltip>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

          </>
          )}
        </Card>
        </>
    );
});

DocumentSection.displayName = 'DocumentSection';
export default DocumentSection;