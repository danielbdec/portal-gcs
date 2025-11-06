"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Spin } from 'antd';
import { Trees, Plus, ChevronRight } from 'lucide-react';

// --- Importa o novo modal (com extensão .tsx para corrigir o resolver) ---
import ModalAddCultura from './ModalAddCultura.tsx';

// --- Interface da Cultura (o que esperamos da API) ---
interface Cultura {
  id: number;
  nome: string;
  sigla: string; // Ex: 'PI' ou 'BA'
  // Adicione outros campos se a API os retornar
}

// --- Props do Componente (ATUALIZADO) ---
interface ListaCulturasProps {
  cadernoId: number | null; // <-- ADICIONADO: ID do caderno pai
  selectedCulturaId: number | null;
  onSelectCultura: (id: number | null) => void; // <-- ATUALIZADO: para aceitar null
}

const ListaCulturas: React.FC<ListaCulturasProps> = ({ cadernoId, selectedCulturaId, onSelectCultura }) => {
  const [culturas, setCulturas] = useState<Cultura[]>([]); // <-- MOCK REMOVIDO
  const [loading, setLoading] = useState(false);

  // --- Estados para o novo modal ---
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // --- Estados para posicionamento ---
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const [buttonPosition, setButtonPosition] = useState<{ x: number, y: number } | null>(null);

  // --- NOVO: useEffect para buscar dados da API ---
  useEffect(() => {
    // Se o cadernoId não estiver definido, limpa a lista.
    if (cadernoId === null || cadernoId === undefined) {
      setCulturas([]);
      setLoading(false);
      onSelectCultura(null); // Garante que o pai saiba que nada está selecionado
      return;
    }

    const fetchCulturas = async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/caderno-agricola/caderno-agricola-cultura-consulta", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id_caderno: cadernoId }),
        });

        // 204 - Sem conteúdo (caderno vazio, sucesso)
        if (response.status === 204) {
          setCulturas([]);
          onSelectCultura(null); // Informa o pai que nada está selecionado
          return;
        }

        if (!response.ok) {
          console.error("Falha ao buscar culturas", response.statusText);
          throw new Error("Falha ao buscar culturas");
        }

        const data: Cultura[] = await response.json();
        setCulturas(data);

        // Auto-seleciona o primeiro item da lista se houver
        if (data.length > 0) {
          onSelectCultura(data[0].id);
        } else {
          // Se a API retornar 200 com array vazio (em vez de 204)
          onSelectCultura(null); // Informa o pai que nada está selecionado
        }
        
      } catch (error) {
        console.error("Erro ao buscar culturas:", error);
        setCulturas([]); // Limpa em caso de erro
        onSelectCultura(null); // Informa o pai que nada está selecionado
      } finally {
        setLoading(false);
      }
    };

    fetchCulturas();
    // A dependência 'onSelectCultura' foi omitida intencionalmente para evitar
    // re-fetches caso o componente pai não tenha usado useCallback.
    // A lógica só deve disparar quando o ID do CADERNO mudar.
  }, [cadernoId]);


  // --- Lógica de Abertura do Modal (Inalterada) ---
  const handleIncluirCultura = () => {
    if (addButtonRef.current) {
      const rect = addButtonRef.current.getBoundingClientRect();
      setButtonPosition({ x: rect.right, y: rect.top });
    }
  };

  useEffect(() => {
    if (buttonPosition !== null) {
      setIsAddModalOpen(true);
    }
  }, [buttonPosition]);

  const handleCloseModal = () => {
    setIsAddModalOpen(false);
    setButtonPosition(null); 
  };

  const handleSaveCultura = async (formData: any) => {
    console.log("Dados recebidos do modal para salvar:", formData); 
    setIsSaving(true);
    await new Promise(res => setTimeout(res, 1000)); 
    console.log("API de inclusão de cultura (simulada) OK");
    setIsSaving(false);
    handleCloseModal();
    
    // TODO: Chamar o fetchCulturas() novamente para atualizar a lista
    // (Talvez transformar fetchCulturas em uma função reutilizável fora do effect)
  };
  
  // --- Fim da Lógica de Abertura ---

  return (
    <>
      <div className="culturas-sidebar">
        <div className="culturas-header">
            <h3><Trees size={18} /> Culturas</h3>
            <button 
                ref={addButtonRef}
                className="btn-add-cultura" 
                title="Incluir Nova Cultura"
                onClick={handleIncluirCultura}
            >
                <Plus size={18} />
            </button>
        </div>
        
        <div className="culturas-list">
          {loading ? (
              <div style={{textAlign: 'center', padding: '2rem'}}>
                  <Spin />
              </div>
          // --- ATUALIZADO: Checa se tem culturas antes de mapear ---
          ) : culturas.length > 0 ? (
              culturas.map((cultura) => (
                  <button
                      key={cultura.id}
                      className="culturas-list-item"
                      aria-selected={selectedCulturaId === cultura.id}
                      onClick={() => onSelectCultura(cultura.id)}
                  >
                      <ChevronRight size={14} />
                      <span>{cultura.nome} {cultura.sigla}</span>
                  </button>
              ))
          // --- ADICIONADO: Fallback para lista vazia ---
          ) : (
             <div 
                className="culturas-list-fallback" // Classe para estilização de tema (no ModalCaderno.tsx)
                style={{
                    padding: '1rem', 
                    textAlign: 'center', 
                    fontStyle: 'italic', 
                    fontSize: '13px',
                    lineHeight: 1.4,
                    color: '#6c757d' // Cor base (será sobrescrita pelo tema escuro)
                }}>
                Clique em <Plus size={12} style={{display: 'inline-block', verticalAlign: 'middle', margin: '0 2px'}} /> para
                adicionar uma cultura a este caderno.
            </div>
          )}
        </div>
      </div>

      <ModalAddCultura
        visible={isAddModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveCultura}
        isSaving={isSaving}
        positionHint={buttonPosition}
      />
    </>
  );
};

export default ListaCulturas;