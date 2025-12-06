"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Spin } from 'antd';
import { Trees, Plus, ChevronRight } from 'lucide-react';

// --- Importa o novo modal ---
import ModalAddCultura from './ModalAddCultura'; 

// --- Interface da Cultura ---
interface Cultura {
  id: number;
  nome: string;
  sigla: string;
}

// --- Props do Componente ---
interface ListaCulturasProps {
  cadernoId: number | null;
  selectedCulturaId: number | null;
  onSelectCultura: (id: number | null) => void;
}

const ListaCulturas: React.FC<ListaCulturasProps> = ({ cadernoId, selectedCulturaId, onSelectCultura }) => {
  const [culturas, setCulturas] = useState<Cultura[]>([]);
  const [loading, setLoading] = useState(false);

  // --- Estados para o novo modal ---
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // --- Estados para posicionamento ---
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const [buttonPosition, setButtonPosition] = useState<{ x: number, y: number } | null>(null);

  // --- useEffect para buscar dados da API ---
  useEffect(() => {
    // Se o cadernoId não estiver definido, limpa a lista.
    if (cadernoId === null || cadernoId === undefined) {
      setCulturas([]);
      setLoading(false);
      onSelectCultura(null);
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
          onSelectCultura(null);
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
          onSelectCultura(null);
        }
        
      } catch (error) {
        console.error("Erro ao buscar culturas:", error);
        setCulturas([]);
        onSelectCultura(null);
      } finally {
        setLoading(false);
      }
    };

    fetchCulturas();
    // Dependência 'onSelectCultura' adicionada para corrigir warning do React Hook
  }, [cadernoId, onSelectCultura]);


  // --- Lógica de Abertura do Modal ---
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
    // Simulação de delay de rede
    await new Promise(res => setTimeout(res, 1000)); 
    console.log("API de inclusão de cultura (simulada) OK");
    setIsSaving(false);
    handleCloseModal();
    
    // TODO: Aqui você deve implementar a recarga da lista (fetchCulturas)
    // Para isso, seria ideal extrair a função fetchCulturas para fora do useEffect ou usar um trigger state.
  };
  
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
          ) : culturas.length > 0 ? (
              culturas.map((cultura) => {
                  const isSelected = selectedCulturaId === cultura.id;
                  return (
                    <button
                        key={cultura.id}
                        // Adiciona classe 'active' se selecionado
                        className={`culturas-list-item ${isSelected ? 'active' : ''}`}
                        // Usa data-active em vez de aria-selected para evitar erro de acessibilidade em botões
                        data-active={isSelected}
                        onClick={() => onSelectCultura(cultura.id)}
                    >
                        <ChevronRight size={14} />
                        <span>{cultura.nome} {cultura.sigla}</span>
                    </button>
                  );
              })
          ) : (
             <div 
                className="culturas-list-fallback"
                style={{
                    padding: '1rem', 
                    textAlign: 'center', 
                    fontStyle: 'italic', 
                    fontSize: '13px',
                    lineHeight: 1.4,
                    color: '#6c757d'
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