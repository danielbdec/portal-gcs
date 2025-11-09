"use client";

import React, { useState, useEffect, useRef } from 'react'; // <-- Importa useRef e useEffect
import { Spin } from 'antd';
import { Trees, Plus, ChevronRight } from 'lucide-react';

// --- Importa o novo modal ---
import ModalAddCultura from './ModalAddCultura';

// --- Interfaces e Dados Simulados (ATUALIZADO) ---
interface Cultura {
  id: number;
  nome: string;
  sigla: string; // Ex: 'PI' ou 'BA'
}

const MOCK_CULTURAS: Cultura[] = [
  { id: 1, nome: 'Soja', sigla: 'PI' },
  { id: 2, nome: 'Milho', sigla: 'PI' },
  { id: 3, nome: 'Algodao', sigla: 'BA' },
];
// --- Fim da Atualização ---

// --- Props do Componente ---
interface ListaCulturasProps {
  selectedCulturaId: number | null;
  onSelectCultura: (id: number) => void;
}

const ListaCulturas: React.FC<ListaCulturasProps> = ({ selectedCulturaId, onSelectCultura }) => {
  const [culturas, setCulturas] = useState<Cultura[]>(MOCK_CULTURAS);
  const [loading, setLoading] = useState(false);

  // --- Estados para o novo modal ---
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // --- Estados para posicionamento ---
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const [buttonPosition, setButtonPosition] = useState<{ x: number, y: number } | null>(null);

  // TODO: Implementar fetch para buscar culturas reais
  // useEffect(() => {
  //   setLoading(true);
  //   fetch('/api/caderno-agricola/culturas')
  //     .then(res => res.json())
  //     .then(data => setCulturas(data))
  //     .finally(() => setLoading(false));
  // }, []);


  // --- Lógica de Abertura do Modal (Corrigida) ---

  const handleIncluirCultura = () => {
    // 1. Apenas captura a posição do botão e salva no estado
    if (addButtonRef.current) {
      const rect = addButtonRef.current.getBoundingClientRect();
      setButtonPosition({ x: rect.right, y: rect.top });
      // NÃO abre o modal aqui
    }
  };

  // 2. Este useEffect "escuta" a mudança no buttonPosition
  useEffect(() => {
    // 3. SE a posição foi definida (não é null), ENTÃO abre o modal
    if (buttonPosition !== null) {
      setIsAddModalOpen(true);
    }
  }, [buttonPosition]); // Dependência: buttonPosition

  const handleCloseModal = () => {
    // 4. Reseta ambos os estados ao fechar
    setIsAddModalOpen(false);
    setButtonPosition(null); 
  };

  const handleSaveCultura = async (formData: any) => {
    console.log("Dados recebidos do modal para salvar:", formData); 
    
    setIsSaving(true);
    
    // TODO: Implementar chamada de API real aqui
    
    await new Promise(res => setTimeout(res, 1000)); 
    
    console.log("API de inclusão de cultura (simulada) OK");
    
    setIsSaving(false);
    handleCloseModal(); // Usa a nova função de fechar (que reseta ambos)
    
    // TODO: Chamar o fetchCulturas() para atualizar a lista
  };
  
  // --- Fim da Lógica de Abertura ---

  return (
    <>
      <div className="culturas-sidebar">
        <div className="culturas-header">
            <h3><Trees size={18} /> Culturas</h3>
            <button 
                ref={addButtonRef} // <-- Adiciona a ref ao botão
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
          ) : (
              culturas.map((cultura) => (
                  <button
                      key={cultura.id}
                      className="culturas-list-item"
                      aria-selected={selectedCulturaId === cultura.id}
                      onClick={() => onSelectCultura(cultura.id)}
                  >
                      <ChevronRight size={14} />
                      {/* --- ATUALIZADO AQUI --- */}
                      <span>{cultura.nome} {cultura.sigla}</span>
                  </button>
              ))
          )}
        </div>
      </div>

      {/* --- Renderiza o novo modal (ele fica oculto até ser chamado) --- */}
      <ModalAddCultura
        visible={isAddModalOpen}
        onClose={handleCloseModal} // <-- Usa a nova função de fechar
        onSave={handleSaveCultura}
        isSaving={isSaving}
        positionHint={buttonPosition} // <-- Passa a posição como prop
      />
    </>
  );
};

export default ListaCulturas;