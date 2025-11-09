"use client";

// Usamos os hooks de arrastar e de estado
import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Spin, Button } from "antd"; // Import do Button
import { X } from 'lucide-react';
import "antd/dist/reset.css";

// --- NOVOS IMPORTS DOS COMPONENTES FILHOS (com extensão .tsx) ---
import ListaCulturas from "./ListaCulturas.tsx";
import DetalhesCultura from "./DetalhesCultura.tsx";

/* ========================================================================
    Tipos e Interfaces
    ======================================================================== */
// Interface dos dados do Caderno (Safra) que vem da página
interface Caderno {
  id: number;
  key: string; 
  nome: string; // Veio de 'descricao'
  safra: string; // Veio de 'codigo_safra'
  versao: string;
  status: string; // Veio como 'Ativo' ou 'Inativo'
  [key: string]: any; 
}

// Props do Modal
interface ModalProps {
  visible: boolean;
  onClose: () => void;
  caderno: Partial<Caderno> | null;
}

// Funções auxiliares
// const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

/* ========================================================================
    Modal Principal de Lançamentos
    ======================================================================== */

const ModalCaderno: React.FC<ModalProps> = ({ visible, onClose, caderno }) => {
  
  // --- ATUALIZADO: Estado compartilhado: Começa com null ---
  const [selectedCulturaId, setSelectedCulturaId] = useState<number | null>(null); 

  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const lastFocusedElementRef = useRef<HTMLElement | null>(null);

  // Lógica de arrastar
  useEffect(() => { if (visible && modalRef.current) { const { clientWidth, clientHeight } = modalRef.current; setPosition({ x: window.innerWidth / 2 - clientWidth / 2, y: window.innerHeight / 2 - clientHeight / 2 }); lastFocusedElementRef.current = document.activeElement as HTMLElement; modalRef.current.focus(); } }, [visible]);
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => { const t = e.target as HTMLElement; if (!modalRef.current || t.closest('button, input, textarea, select, label, .culturas-list-item')) return; setIsDragging(true); const modalRect = modalRef.current.getBoundingClientRect(); dragOffsetRef.current = { x: e.clientX - modalRect.left, y: e.clientY - modalRect.top }; };
  
  const handleMouseMove = useCallback((e: MouseEvent) => { 
    if (!isDragging || !modalRef.current) return; 
    e.preventDefault(); 
    const x = e.clientX - dragOffsetRef.current.x;
    const y = e.clientY - dragOffsetRef.current.y;
    setPosition({ x, y }); 
  }, [isDragging]);
  
  const handleMouseUp = useCallback(() => { setIsDragging(false); }, []);
  useEffect(() => { if (isDragging) { document.addEventListener('mousemove', handleMouseMove); document.addEventListener('mouseup', handleMouseUp); } return () => { document.removeEventListener('mousemove', handleMouseMove); document.removeEventListener('mouseup', handleMouseUp); }; }, [isDragging, handleMouseMove, handleMouseUp]);
  
  // Lógica de Fechar
  useEffect(() => { if (!visible) return; const prevOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') { onClose(); return; } }; window.addEventListener('keydown', handleKeyDown); return () => { document.body.style.overflow = prevOverflow; window.removeEventListener('keydown', handleKeyDown); lastFocusedElementRef.current?.focus(); }; }, [visible, onClose]);
  
  // --- ATUALIZADO: Handler aceita null ---
  const handleSelectCultura = (id: number | null) => {
    setSelectedCulturaId(id);
  };

  if (!visible || !caderno) return null;

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
            --gcs-green-light: #effaf5;
            --gcs-green-border: #b7e4c7;
            --gcs-orange: #F58220;
            --gcs-orange-dark: #f7941d;
            --gcs-orange-light: #fffbe6;
            --gcs-orange-border: #ffe58f;
            --gcs-brand-red: #E11D2E;
            --gcs-red-light: #fff0f0;
            --gcs-red-border: #f5c2c7;
            --gcs-red-text: #721c24;
            --gcs-gray-light: #f1f5fb;
            --gcs-gray-border: #d0d7e2;
            --gcs-gray-text: #6c757d;
            --gcs-dark-text: #333;
            --gcs-dark-bg-transparent: rgba(25, 39, 53, 0.5);
            --gcs-dark-bg-heavy: rgba(25, 39, 53, 0.85);
            --gcs-dark-border: rgba(125, 173, 222, 0.2);
            --gcs-dark-border-hover: rgba(125, 173, 222, 0.4);
            --gcs-dark-text-primary: #F1F5F9;
            --gcs-dark-text-secondary: #CBD5E1;
            --gcs-dark-text-tertiary: #94A3B8;

            /* Cores Editável/Readonly */
            --gcs-readonly-bg-light: #f8f9fa;
            --gcs-readonly-bg-dark: rgba(25, 39, 53, 0.2);
            --gcs-editable-bg-light: #f0fff4; /* Verde bem claro */
            --gcs-editable-bg-dark: rgba(46, 139, 87, 0.2); /* Verde escuro transparente */
        }

        .animate-spin {
            animation: spin 1s linear infinite;
        }
        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
        
        /* --- Base Modal --- */
        .modal-detalhes-backdrop {
            position: fixed;
            top: 0; left: 0;
            width: 100vw; height: 100vh;
            background-color: rgba(0,0,0,0.4);
            z-index: 2147483646;
        }
        .modal-detalhes-glass {
            position: fixed;
            border-radius: 12px;
            width: 90%;
            /* Aumentado para comportar a tabela nova */
            max-width: 1800px; 
            min-height: 400px;
            height: 95vh; 
            display: flex;
            flex-direction: column;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            z-index: 2147483647;
            transition: background 0.3s ease, border 0.3s ease, box-shadow 0.3s ease;
        }
        body.light .modal-detalhes-glass {
            background: #fff;
            border: 1px solid #dee2e6;
        }
        body.dark .modal-detalhes-glass {
            background: var(--gcs-dark-bg-heavy);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border: 1px solid var(--gcs-dark-border);
        }

        /* --- Modal Header --- */
        .modal-detalhes-header {
            padding: 1rem 1.5rem;
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
        /* Header Modo Claro */
        body.light .modal-detalhes-header {
            background-color: var(--gcs-gray-light);
            border-bottom-color: #dee2e6;
        }
        /* Header Modo Escuro (Glassmorphism) */
        body.dark .modal-detalhes-header {
            background-color: rgba(25, 39, 53, 0.5);
            border-bottom-color: var(--gcs-dark-border);
        }
        
        .modal-detalhes-title {
            font-size: 1.2rem;
            font-weight: bold;
        }
        /* Título Modo Claro */
        body.light .modal-detalhes-title { color: var(--gcs-blue); }
        /* Título Modo Escuro */
        body.dark .modal-detalhes-title { color: var(--gcs-dark-text-primary); }

        /* Subtítulo (Safra) */
        .modal-detalhes-subtitle {
             margin: 4px 0 0 0;
             font-weight: bold;
             font-size: 14px;
        }
        body.light .modal-detalhes-subtitle { color: var(--gcs-gray-dark); }
        body.dark .modal-detalhes-subtitle { color: var(--gcs-dark-text-tertiary); }
        
        .modal-close-btn {
            background: none;
            border: none;
            font-size: 1.75rem;
            cursor: pointer;
            padding: 0;
            line-height: 1;
        }
        body.light .modal-close-btn { color: var(--gcs-dark-text); }
        body.dark .modal-close-btn { color: var(--gcs-dark-text-secondary); }
        body.dark .modal-close-btn:hover { color: var(--gcs-dark-text-primary); }
        
        /* --- Modal Footer --- */
        .modal-detalhes-footer {
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
        body.light .modal-detalhes-footer {
            background-color: var(--gcs-gray-light);
            border-top-color: #dee2e6;
        }
        body.dark .modal-detalhes-footer {
            background-color: rgba(25, 39, 53, 0.5);
            border-top-color: var(--gcs-dark-border);
        }

        /* --- Botão Azul (copiado do seu exemplo) --- */
        .btn-gcs-blue {
            background-color: var(--gcs-blue) !important;
            color: white !important;
            border-color: var(--gcs-blue) !important;
        }
        .btn-gcs-blue:hover {
            background-color: #001f30 !important;
            border-color: #001f30 !important;
        }

        /* --- === NOVOS ESTILOS PARA O LAYOUT === --- */
        
        /* O Wrapper que substitui o <Tabs> */
        .modal-content-wrapper-flex {
            flex-grow: 1;
            overflow: hidden;
            display: flex;
            height: 100%;
        }

        /* Coluna da Esquerda (Culturas) */
        .culturas-sidebar {
            width: 220px; /* <-- REDUZIDO DE 280px */
            flex-shrink: 0;
            display: flex;
            flex-direction: column;
            height: 100%;
            border-right: 1px solid;
        }
        body.light .culturas-sidebar { 
            border-color: #dee2e6; 
            background-color: #f8f9fa; /* Fundo levemente cinza no modo claro */
        }
        body.dark .culturas-sidebar { 
            border-color: var(--gcs-dark-border); 
            background-color: rgba(25, 39, 53, 0.1); /* Fundo de vidro leve */
        }
        
        .culturas-header {
            padding: 1rem 1.5rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-shrink: 0;
            border-bottom: 1px solid;
        }
        body.light .culturas-header { border-color: #dee2e6; }
        body.dark .culturas-header { border-color: var(--gcs-dark-border); }

        .culturas-header h3 {
            margin: 0;
            font-size: 1.1rem;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        body.light .culturas-header h3 { color: var(--gcs-blue); }
        body.dark .culturas-header h3 { color: var(--gcs-dark-text-primary); }

        .btn-add-cultura {
            background: none;
            border: none;
            cursor: pointer;
            padding: 4px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
        }
        body.light .btn-add-cultura { color: var(--gcs-blue-light); }
        body.light .btn-add-cultura:hover { background: #e0eafc; }
        body.dark .btn-add-cultura { color: var(--gcs-blue-sky); }
        body.dark .btn-add-cultura:hover { background: rgba(59, 130, 246, 0.2); }

        /* Lista de Culturas */
        .culturas-list {
            flex-grow: 1;
            overflow-y: auto;
            padding: 0.75rem;
        }
        .culturas-list-item {
            display: flex;
            align-items: center;
            gap: 10px;
            width: 100%;
            padding: 10px 12px;
            border-radius: 8px;
            border: 1px solid transparent;
            background: none;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            margin-bottom: 4px;
            transition: all 0.2s ease-in-out;
            text-align: left;
        }
        body.light .culturas-list-item { color: var(--gcs-dark-text); }
        body.light .culturas-list-item:hover { background-color: var(--gcs-gray-light); }
        body.light .culturas-list-item[aria-selected="true"] {
            background-color: #eaf3ff;
            color: var(--gcs-blue-light);
            font-weight: 600;
        }
        
        body.dark .culturas-list-item { color: var(--gcs-dark-text-secondary); }
        body.dark .culturas-list-item:hover { background-color: rgba(25, 39, 53, 0.7); }
        body.dark .culturas-list-item[aria-selected="true"] {
            background-color: var(--gcs-blue-light);
            color: white;
            font-weight: 600;
        }
        
        /* --- NOVO: Estilo para Fallback (Lista Vazia) --- */
        body.light .culturas-list-fallback {
            color: var(--gcs-gray-text);
        }
        body.dark .culturas-list-fallback {
            color: var(--gcs-dark-text-tertiary);
        }
        body.dark .culturas-list-fallback svg {
            color: var(--gcs-dark-text-tertiary);
        }
        /* --- FIM DO NOVO ESTILO --- */


        /* Coluna da Direita (Detalhes) */
        .detalhes-content {
            flex-grow: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }
        .detalhes-header {
            padding: 1rem 1.5rem;
            flex-shrink: 0;
            border-bottom: 1px solid;
        }
        body.light .detalhes-header { border-color: #dee2e6; }
        body.dark .detalhes-header { border-color: var(--gcs-dark-border); }
        
        .detalhes-header h3 {
            margin: 0;
            font-size: 1.1rem;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        body.light .detalhes-header h3 { color: var(--gcs-dark-text); }
        body.dark .detalhes-header h3 { color: var(--gcs-dark-text-primary); }

        .detalhes-scrollable {
            flex-grow: 1;
            overflow-y: auto; /* Scroll vertical da página inteira */
            padding: 1.5rem; /* Padding geral */
            display: flex;
            flex-direction: column;
        }
        
        /* Spinner da Aba (reutilizado) */
        .tab-spinner-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding-top: 3rem;
            padding-bottom: 3rem;
            min-height: 200px;
        }
        .modal-tab-spinner {
            width: 30px;
            height: 30px;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        body.light .modal-tab-spinner {
            border: 3px solid #ccc;
            border-top: 3px solid var(--gcs-blue-light);
        }
        body.dark .modal-tab-spinner {
            border: 3px solid rgba(125, 173, 222, 0.2);
            border-top: 3px solid var(--gcs-blue-sky);
        }
        .modal-tab-spinner-text {
            margin-top: 1rem;
            font-weight: bold;
            font-size: 1rem;
        }
        body.light .modal-tab-spinner-text { color: var(--gcs-blue-light); }
        body.dark .modal-tab-spinner-text { color: var(--gcs-blue-sky); }

        /* Tabela de Detalhes (reutilizada) */
        .modal-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 14px;
        }
        .modal-table th, .modal-table td {
            padding: 10px 12px; 
            border: 1px solid;
            text-align: left;
            transition: all 0.3s ease;
            white-space: nowrap; /* Impede quebra de linha */
        }
        .modal-table th { 
            font-size: 13px; 
            padding: 12px; 
        }
        
        body.light .modal-table th {
            background-color: var(--gcs-blue); 
            color: #fff;
            border-color: var(--gcs-blue);
        }
        body.light .modal-table td {
            border-color: #ddd;
            color: var(--gcs-dark-text);
        }
        body.light .modal-table tbody tr:hover { background-color: #f1f1f1; }

        body.dark .modal-table th {
            background-color: var(--gcs-blue);
            color: var(--gcs-dark-text-primary);
            border-color: var(--gcs-dark-border-hover);
        }
        body.dark .modal-table td {
            border-color: var(--gcs-dark-border);
            color: var(--gcs-dark-text-secondary);
        }
        body.dark .modal-table tbody tr:hover { background-color: rgba(25, 39, 53, 0.4); }

        /* --- === INÍCIO DOS NOVOS ESTILOS (DetalhesCultura) === --- */

        /* --- 0. Container Paralelo (Flex) --- */
        .detalhes-top-summary-container {
            display: flex;
            flex-wrap: wrap; /* Permite quebra em telas menores */
            gap: 1.5rem;
            align-items: flex-start; /* Alinha os blocos no topo */
            padding-bottom: 1.5rem;
            border-bottom: 1px solid;
            margin-bottom: 1.5rem;
        }
        body.light .detalhes-top-summary-container { border-bottom-color: var(--gcs-gray-border); }
        body.dark .detalhes-top-summary-container { border-bottom-color: var(--gcs-dark-border); }


        /* --- 1. Cabeçalho de Informações (Grid 2x6) --- */
        .detalhes-info-header {
            flex: 2; /* Ocupa 2 partes do espaço */
            min-width: 450px; /* Largura mínima */
            display: grid;
            grid-template-columns: 1fr 1fr; /* Força 2 colunas */
            gap: 10px 1.5rem; /* 10px vertical, 1.5rem horizontal */
        }
        
        .info-grid-item {
            display: flex;
            flex-direction: column;
            gap: 2px;
        }
        .info-grid-item .label {
            font-size: 0.8rem;
            font-weight: 600;
            text-transform: uppercase;
        }
        .info-grid-item .value {
            font-size: 1.1rem;
            font-weight: 700;
        }
        
        /* Cores (Light) */
        body.light .info-grid-item .label { color: var(--gcs-gray-text); }
        body.light .info-grid-item .value { color: var(--gcs-blue); }

        /* Cores (Dark) */
        body.dark .info-grid-item .label { color: var(--gcs-dark-text-tertiary); }
        body.dark .info-grid-item .value { color: var(--gcs-dark-text-primary); }
        
        
        /* --- 2. Tabelas de Resumo (Grupo) --- */
        .summary-table {
            flex: 1; /* Ocupa 1 parte do espaço */
            min-width: 320px; /* Largura mínima */
            border-collapse: collapse;
            font-size: 13px;
        }
        .summary-table th, .summary-table td {
            border: 1px solid;
            padding: 8px 10px;
            text-align: left;
        }
        .summary-table thead th {
            font-size: 12px;
            white-space: nowrap;
        }
        .summary-table tbody td {
            font-weight: 500;
        }
        .summary-table tbody td:not(:first-child) {
            text-align: right;
        }
        .summary-table tfoot tr {
            font-weight: 700;
        }
        .summary-table tfoot td {
            text-align: right;
        }
        .summary-table tfoot td:first-child {
            text-align: left;
        }

        /* --- *** CORREÇÃO DA COR DO CABEÇALHO (Light) *** --- */
        body.light .summary-table th {
            background-color: var(--gcs-blue);
            border-color: var(--gcs-blue);
            color: #fff;
        }
        body.light .summary-table td {
            border-color: var(--gcs-gray-border);
            color: var(--gcs-dark-text);
        }
        body.light .summary-table tfoot td {
            background-color: var(--gcs-gray-light);
            color: var(--gcs-blue);
        }

        /* --- *** CORREÇÃO DA COR DO CABEÇALHO (Dark) *** --- */
        body.dark .summary-table th {
            background-color: var(--gcs-blue);
            border-color: var(--gcs-dark-border-hover);
            color: var(--gcs-dark-text-primary);
        }
        body.dark .summary-table td {
            border-color: var(--gcs-dark-border);
            color: var(--gcs-dark-text-secondary);
        }
        body.dark .summary-table tfoot td {
            background-color: rgba(25, 39, 53, 0.5);
            color: var(--gcs-dark-text-primary);
        }

        /* --- 3. Barra de Ferramentas (Botões Add/Remove) --- */
        .detalhes-toolbar {
            display: flex;
            gap: 0.5rem;
            padding: 0 0 1rem 0; /* Ajustado para o padding do scrollable */
        }
        .btn-grid-action {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 6px 12px;
            font-size: 13px;
            font-weight: 600;
            border: 1px solid;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s ease;
        }
        /* Desabilitado */
        .btn-grid-action:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            background-color: var(--gcs-gray-light);
            border-color: var(--gcs-gray-border);
            color: var(--gcs-gray-text);
        }
        body.dark .btn-grid-action:disabled {
            background-color: rgba(25, 39, 53, 0.2);
            border-color: var(--gcs-dark-border);
            color: var(--gcs-dark-text-tertiary);
        }
        
        /* Botão Adicionar (Light) */
        body.light .btn-grid-action.add {
            background-color: var(--gcs-green-light);
            border-color: var(--gcs-green-border);
            color: var(--gcs-green-dark);
        }
        body.light .btn-grid-action.add:hover:not(:disabled) {
            background-color: var(--gcs-green);
            color: #fff;
        }
        
        /* Botão Remover (Light) */
        body.light .btn-grid-action.remove {
            background-color: var(--gcs-red-light);
            border-color: var(--gcs-red-border);
            color: var(--gcs-red-text);
        }
        body.light .btn-grid-action.remove:hover:not(:disabled) {
            background-color: var(--gcs-brand-red);
            color: #fff;
        }
        
        /* Botão Adicionar (Dark) */
        body.dark .btn-grid-action.add {
            background-color: rgba(74, 222, 128, 0.1);
            border-color: rgba(74, 222, 128, 0.3);
            color: #4ADE80;
        }
        body.dark .btn-grid-action.add:hover:not(:disabled) {
            background-color: #28a745;
            color: #fff;
        }
        
        /* Botão Remover (Dark) */
        body.dark .btn-grid-action.remove {
            background-color: rgba(248, 113, 113, 0.1);
            border-color: rgba(248, 113, 113, 0.3);
            color: #F87171;
        }
        body.dark .btn-grid-action.remove:hover:not(:disabled) {
            background-color: #E11D2E;
            color: #fff;
        }

        /* --- 4. Wrapper do Grid (para scroll) --- */
        .detalhes-grid-wrapper {
            flex-grow: 1; /* Ocupa o espaço restante */
            overflow: auto; /* Scroll horizontal e vertical */
            min-height: 200px; /* Garante altura mínima para o scroll */
        }
        
        /* --- 5. Estilos das Colunas Editáveis/Read-only --- */

        /* Coluna Checkbox */
        .modal-table th.th-checkbox, .modal-table td.td-checkbox {
            width: 50px;
            min-width: 50px;
            text-align: center;
        }
        
        /* Read-only (Padrão Cinza) */
        body.light .modal-table td.td-readonly,
        body.light .modal-table td.td-checkbox {
            background-color: var(--gcs-readonly-bg-light);
        }
        body.dark .modal-table td.td-readonly,
        body.dark .modal-table td.td-checkbox {
            background-color: var(--gcs-readonly-bg-dark);
        }
        
        /* Editável (Verde) */
        .modal-table th.th-editable {
            background-color: var(--gcs-green-dark) !important;
            border-color: var(--gcs-green-dark) !important;
            color: #fff !important;
        }
        
        body.light .modal-table td.td-editable {
            background-color: var(--gcs-editable-bg-light);
            font-weight: 500;
        }
        body.light .modal-table tbody tr:hover td.td-editable {
            background-color: #d8f3e2; /* Verde mais escuro no hover */
        }

        body.dark .modal-table td.td-editable {
            background-color: var(--gcs-editable-bg-dark);
            color: var(--gcs-dark-text-primary);
            font-weight: 500;
        }
        body.dark .modal-table tbody tr:hover td.td-editable {
            background-color: rgba(46, 139, 87, 0.4); /* Verde mais escuro no hover */
        }

        /* --- 6. Estilos Antd Checkbox (Dark) --- */
        body.dark .ant-checkbox-wrapper {
            color: var(--gcs-dark-text-primary);
        }
        body.dark .ant-checkbox-inner {
            background-color: var(--gcs-dark-bg-transparent);
            border-color: var(--gcs-dark-border-hover);
        }
        body.dark .ant-checkbox-checked .ant-checkbox-inner {
            background-color: var(--gcs-blue-sky);
            border-color: var(--gcs-blue-sky);
        }
        body.dark .ant-checkbox-indeterminate .ant-checkbox-inner {
            background-color: var(--gcs-dark-bg-transparent);
            border-color: var(--gcs-dark-border-hover);
        }
        body.dark .ant-checkbox-indeterminate .ant-checkbox-inner::after {
            background-color: var(--gcs-blue-sky);
        }
        
        /* --- === FIM DOS NOVOS ESTILOS === --- */
      `}</style>
      
      <div 
        className="modal-detalhes-backdrop"
        onClick={onClose} 
      />
      <div 
        ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="modal-title" tabIndex={-1}
        className="modal-detalhes-glass"
        style={{ top: `${position.y}px`, left: `${position.x}px` }}
      >
        <div 
            onMouseDown={handleMouseDown} 
            className="modal-detalhes-header"
        >
          <div>
            <h3 id="modal-title" style={{ margin: 0 }} className="modal-detalhes-title">
                Lançamentos do Caderno
            </h3>
            <p className="modal-detalhes-subtitle">
              Safra: {caderno?.nome} (v{caderno?.versao})
            </p>
          </div>
          <button type="button" onClick={onClose} className="modal-close-btn">
            <X size={24} />
          </button>
        </div>
        
        {/* === INÍCIO DO NOVO LAYOUT === */}
        <div className="modal-content-wrapper-flex">
          
          {/* --- ATUALIZADO: Passando o cadernoId --- */}
          <ListaCulturas
            cadernoId={caderno?.id || null}
            selectedCulturaId={selectedCulturaId}
            onSelectCultura={handleSelectCultura}
          />
          
          <DetalhesCultura 
            culturaId={selectedCulturaId} 
          />

        </div>
        {/* === FIM DO NOVO LAYOUT === */}

        <div className="modal-detalhes-footer">
          <Button onClick={onClose} size="large" className="btn-gcs-blue">Fechar</Button>
        </div>
      </div>
    </>
  );
};

export default ModalCaderno;