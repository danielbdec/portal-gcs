"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Spin, Checkbox } from 'antd'; // <-- Importado Checkbox
import type { CheckboxChangeEvent } from 'antd/es/checkbox'; // <-- Tipo para o evento
import { ClipboardList, Plus, Trash2 } from 'lucide-react';

// --- Interfaces e Dados Simulados (Baseado no Excel) ---

// 1. Interface para os INSUMOS (a tabela grande)
interface InsumoDetalhe {
  id: number; // <-- ID é crucial para a seleção
  culturaId: number; // Para filtrar o mock
  unidade: string;
  cultura: string;
  grupo: string; 
  cod: string;
  item: string;
  un_med: string;
  percentual_a: number; // %A
  area: number;
  n_aplic: number;
  qt_un_ha: number;
  alvo_objetivo: string;
  dae: number;
  estoque: number;
  qtd_total: number;
  custo_ha: number;
  vl_uni_un: number;
  r_total: number;
  dt_dae: string; // Formato YYYY-MM-DD
  mes: string;
  ano: number;
  moeda: string;
  preco_usd: number;
  valor_usd: number;
  ptax_conversao: number;
  valor_brl: number;
}

// 2. Interface para o CABEÇALHO (os 12 campos de info)
interface CulturaInfo {
  filial: string;
  culturaNome: string;
  areaHa: number;
  prodHa: number;
  vlVdOrcado: number;
  fatBruto: number;
  budgetHa: number;
  difBudgetHa: number;
  safra: string;
  dataPlantio: string; // Formato YYYY-MM-DD
  mcLavoura: number;
  mcPercent: number;
}

// --- DADOS MOCKADOS ---

const MOCK_INFO_CULTURAS: Record<number, CulturaInfo> = {
  // Info para Cultura ID 1 (SOJA)
  1: {
    filial: '0401',
    culturaNome: 'SOJA',
    areaHa: 470.5,
    prodHa: 65,
    vlVdOrcado: 130.00,
    fatBruto: 8450.00,
    budgetHa: 5000.00,
    difBudgetHa: -458.11, // Exemplo
    safra: '25/26',
    dataPlantio: '2025-10-15',
    mcLavoura: 2991.89, // Exemplo
    mcPercent: 35 // Exemplo 35%
  },
  // Info para Cultura ID 2 (MILHO)
  2: {
    filial: '0401',
    culturaNome: 'MILHO SAFRINHA',
    areaHa: 300.0,
    prodHa: 120,
    vlVdOrcado: 60.00,
    fatBruto: 7200.00,
    budgetHa: 4500.00,
    difBudgetHa: 13.33, // Exemplo
    safra: '25/26',
    dataPlantio: '2026-02-10',
    mcLavoura: 2686.67, // Exemplo
    mcPercent: 37 // Exemplo 37%
  },
  // Info para Cultura ID 3 (ALGODÃO)
  3: {
    filial: '0402',
    culturaNome: 'ALGODÃO',
    areaHa: 100.0,
    prodHa: 300,
    vlVdOrcado: 150.00,
    fatBruto: 45000.00,
    budgetHa: 12000.00,
    difBudgetHa: -1000.00, // Exemplo
    safra: '25/26',
    dataPlantio: '2025-11-20',
    mcLavoura: 34000.00, // Exemplo
    mcPercent: 75 // Exemplo 75%
  },
};

const MOCK_DETALHES_INSUMOS: InsumoDetalhe[] = [
  // --- DADOS PARA CULTURA ID 1 (SOJA) ---
  {
    id: 101, culturaId: 1, unidade: '0401', cultura: 'SOJA', grupo: 'Defensivos', cod: 'HERB001',
    item: 'GLIFOSATO', un_med: 'L', percentual_a: 100, area: 470.5, n_aplic: 2,
    qt_un_ha: 2.5, alvo_objetivo: 'Controle Pós-emergente', dae: 15, estoque: 5000,
    qtd_total: 2352.5, custo_ha: 87.50, vl_uni_un: 35.00, r_total: 82337.50,
    dt_dae: '2025-10-30', mes: 'OUT', ano: 2025, moeda: 'USD', preco_usd: 7.00,
    valor_usd: 16467.50, ptax_conversao: 5.00, valor_brl: 82337.50
  },
  {
    id: 102, culturaId: 1, unidade: '0401', cultura: 'SOJA', grupo: 'Defensivos', cod: 'FUNG005',
    item: 'MANCOZEB', un_med: 'KG', percentual_a: 100, area: 470.5, n_aplic: 1,
    qt_un_ha: 2.0, alvo_objetivo: 'Ferrugem Asiática', dae: 45, estoque: 2000,
    qtd_total: 941.0, custo_ha: 120.00, vl_uni_un: 60.00, r_total: 56460.00,
    dt_dae: '2025-11-29', mes: 'NOV', ano: 2025, moeda: 'USD', preco_usd: 12.00,
    valor_usd: 11292.00, ptax_conversao: 5.00, valor_brl: 56460.00
  },
  {
    id: 103, culturaId: 1, unidade: '0401', cultura: 'SOJA', grupo: 'Sementes', cod: 'SEM002',
    item: 'SOJA TMG 7062', un_med: 'SC', percentual_a: 100, area: 470.5, n_aplic: 1,
    qt_un_ha: 1.0, alvo_objetivo: 'Plantio', dae: 0, estoque: 500,
    qtd_total: 470.5, custo_ha: 250.00, vl_uni_un: 250.00, r_total: 117625.00,
    dt_dae: '2025-10-15', mes: 'OUT', ano: 2025, moeda: 'BRL', preco_usd: 0.00,
    valor_usd: 0.00, ptax_conversao: 0.00, valor_brl: 117625.00
  },
  {
    id: 104, culturaId: 1, unidade: '0401', cultura: 'SOJA', grupo: 'Fertilizantes', cod: 'FERT001',
    item: 'MAP', un_med: 'T', percentual_a: 100, area: 470.5, n_aplic: 1,
    qt_un_ha: 0.15, alvo_objetivo: 'Fósforo', dae: 0, estoque: 100,
    qtd_total: 70.575, custo_ha: 375.00, vl_uni_un: 2500.00, r_total: 176437.50,
    dt_dae: '2025-10-15', mes: 'OUT', ano: 2025, moeda: 'USD', preco_usd: 500.00,
    valor_usd: 35287.50, ptax_conversao: 5.00, valor_brl: 176437.50
  },
  {
    id: 105, culturaId: 1, unidade: '0401', cultura: 'SOJA', grupo: 'Operação', cod: 'OP001',
    item: 'COLHEITA', un_med: 'HA', percentual_a: 100, area: 470.5, n_aplic: 1,
    qt_un_ha: 1.0, alvo_objetivo: 'Colheita', dae: 150, estoque: 0,
    qtd_total: 470.5, custo_ha: 350.00, vl_uni_un: 350.00, r_total: 164675.00,
    dt_dae: '2026-03-14', mes: 'MAR', ano: 2026, moeda: 'BRL', preco_usd: 0.00,
    valor_usd: 0.00, ptax_conversao: 0.00, valor_brl: 164675.00
  },
  
  // --- DADOS PARA CULTURA ID 2 (MILHO) ---
   {
    id: 201, culturaId: 2, unidade: '0401', cultura: 'MILHO SAFRINHA', grupo: 'Defensivos', cod: 'HERB002',
    item: 'ATRAZINA', un_med: 'L', percentual_a: 100, area: 300.0, n_aplic: 1,
    qt_un_ha: 3.0, alvo_objetivo: 'Controle Pré-emergente', dae: 2, estoque: 1000,
    qtd_total: 900.0, custo_ha: 60.00, vl_uni_un: 20.00, r_total: 18000.00,
    dt_dae: '2026-02-12', mes: 'FEV', ano: 2026, moeda: 'USD', preco_usd: 4.00,
    valor_usd: 3600.00, ptax_conversao: 5.00, valor_brl: 18000.00
  },
  {
    id: 202, culturaId: 2, unidade: '0401', cultura: 'MILHO SAFRINHA', grupo: 'Sementes', cod: 'SEM010',
    item: 'MILHO K9606', un_med: 'SC', percentual_a: 100, area: 300.0, n_aplic: 1,
    qt_un_ha: 0.8, alvo_objetivo: 'Plantio', dae: 0, estoque: 300,
    qtd_total: 240.0, custo_ha: 400.00, vl_uni_un: 500.00, r_total: 120000.00,
    dt_dae: '2026-02-10', mes: 'FEV', ano: 2026, moeda: 'BRL', preco_usd: 0.00,
    valor_usd: 0.00, ptax_conversao: 0.00, valor_brl: 120000.00
  },
  {
    id: 203, culturaId: 2, unidade: '0401', cultura: 'MILHO SAFRINHA', grupo: 'Operação', cod: 'OP002',
    item: 'PLANTIO', un_med: 'HA', percentual_a: 100, area: 300.0, n_aplic: 1,
    qt_un_ha: 1.0, alvo_objetivo: 'Plantio', dae: 0, estoque: 0,
    qtd_total: 300.0, custo_ha: 180.00, vl_uni_un: 180.00, r_total: 54000.00,
    dt_dae: '2026-02-10', mes: 'FEV', ano: 2026, moeda: 'BRL', preco_usd: 0.00,
    valor_usd: 0.00, ptax_conversao: 0.00, valor_brl: 54000.00
  },
  {
    id: 204, culturaId: 2, unidade: '0401', cultura: 'MILHO SAFRINHA', grupo: 'Fertilizantes', cod: 'FERT004',
    item: 'UREIA', un_med: 'T', percentual_a: 100, area: 300.0, n_aplic: 1,
    qt_un_ha: 0.2, alvo_objetivo: 'Cobertura', dae: 30, estoque: 100,
    qtd_total: 60.0, custo_ha: 500.00, vl_uni_un: 2500.00, r_total: 150000.00,
    dt_dae: '2026-03-12', mes: 'MAR', ano: 2026, moeda: 'USD', preco_usd: 500.00,
    valor_usd: 30000.00, ptax_conversao: 5.00, valor_brl: 150000.00
  },
];
// --- Fim dos Mocks ---

// --- Props do Componente ---
interface DetalhesCulturaProps {
  culturaId: number | null;
}

// --- Helpers de Formatação ---
const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        // Adiciona 1 dia (para corrigir fuso UTC do YYYY-MM-DD)
        date.setUTCDate(date.getUTCDate() + 1); 
        return new Intl.DateTimeFormat('pt-BR').format(date);
    } catch (e) {
        return 'Data Inválida';
    }
};
const formatCurrency = (value: number | null | undefined, showSymbol = true) => {
    if (value === null || value === undefined) return showSymbol ? 'R$ 0,00' : '0,00';
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(value);
};
const formatCurrencyUSD = (value: number | null | undefined) => {
    if (value === null || value === undefined) return '$ 0.00';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(value);
};
const formatPercent = (value: number | null | undefined) => {
    if (value === null || value === undefined) return '0,00%';
    return new Intl.NumberFormat('pt-BR', {
        style: 'percent',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value); // Assume que o valor já é 0-1
};
const formatNumber = (value: number | null | undefined, decimals = 2) => {
    if (value === null || value === undefined) return '0,00';
    return new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(value);
};
// --- Fim dos Helpers ---


const DetalhesCultura: React.FC<DetalhesCulturaProps> = ({ culturaId }) => {
  const [insumos, setInsumos] = useState<InsumoDetalhe[]>([]);
  const [infoCultura, setInfoCultura] = useState<CulturaInfo | null>(null);
  const [loading, setLoading] = useState(false);

  // --- NOVO ESTADO: Para seleção de linhas ---
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  // Simula o fetch de detalhes quando o ID da cultura muda
  useEffect(() => {
    if (culturaId === null) {
      setInsumos([]);
      setInfoCultura(null);
      return;
    }
    
    setLoading(true);
    setSelectedRowKeys([]); // Limpa a seleção ao trocar de cultura
    // TODO: Substituir por: 
    // fetch(`/api/caderno-agricola/info?culturaId=${culturaId}`)
    // fetch(`/api/caderno-agricola/insumos?culturaId=${culturaId}`)
    setTimeout(() => {
      // Filtramos o MOCK
      setInsumos(MOCK_DETALHES_INSUMOS.filter(d => d.culturaId === culturaId));
      setInfoCultura(MOCK_INFO_CULTURAS[culturaId] || null);
      setLoading(false);
    }, 300); // Simula atraso da rede
    
  }, [culturaId]);

  // --- Cálculos das Tabelas de Resumo (Grupo) ---
  const groupSummaries = useMemo(() => {
    const grupos = ['Corretivos', 'Defensivos', 'Fertilizantes', 'Sementes', 'Operação'];
    const summary = new Map<string, { r_ha: number, r_total: number, brl: number, usd: number }>();

    // Inicializa o mapa
    grupos.forEach(g => summary.set(g, { r_ha: 0, r_total: 0, brl: 0, usd: 0 }));

    // Acumula valores
    insumos.forEach(item => {
      const grupo = summary.get(item.grupo);
      if (grupo) {
        grupo.r_ha += item.custo_ha;
        grupo.r_total += item.r_total;
        grupo.brl += item.valor_brl;
        grupo.usd += item.valor_usd;
      }
    });

    // Calcula o total para o percentual
    const CustoTotalHa = Array.from(summary.values()).reduce((acc, g) => acc + g.r_ha, 0);
    const RTotal = Array.from(summary.values()).reduce((acc, g) => acc + g.r_total, 0);
    const TotalBRL = Array.from(summary.values()).reduce((acc, g) => acc + g.brl, 0);
    const TotalUSD = Array.from(summary.values()).reduce((acc, g) => acc + g.usd, 0);

    return {
      summary,
      CustoTotalHa,
      RTotal,
      TotalBRL,
      TotalUSD,
    };
  }, [insumos]);

  // --- LÓGICA DE SELEÇÃO DE LINHA ---
  const onSelectChange = (id: React.Key, checked: boolean) => {
    setSelectedRowKeys(prev => 
      checked ? [...prev, id] : prev.filter(key => key !== id)
    );
  };

  const onSelectAllChange = (e: CheckboxChangeEvent) => {
    if (e.target.checked) {
      setSelectedRowKeys(insumos.map(item => item.id));
    } else {
      setSelectedRowKeys([]);
    }
  };

  const isAllSelected = insumos.length > 0 && selectedRowKeys.length === insumos.length;
  const isIndeterminate = selectedRowKeys.length > 0 && selectedRowKeys.length < insumos.length;
  // --- FIM DA LÓGICA DE SELEÇÃO ---


  const handleAddRow = () => {
    console.log("Ação: Adicionar Linha");
    // TODO: Implementar lógica de adicionar linha (provavelmente em um modal)
  };
  
  const handleRemoveRow = () => {
    console.log("Ação: Remover Linhas", selectedRowKeys);
    // TODO: Implementar lógica de remoção
    // Ex: await fetch('/api/remover-insumos', { body: JSON.stringify(selectedRowKeys) })
    // Após remover, limpar a seleção
    setSelectedRowKeys([]);
  };

  return (
    <div className="detalhes-content">
      {/* 1. Header Fixo (Título) */}
      <div className="detalhes-header">
          <h3><ClipboardList size={18} /> Detalhes do Custeio</h3>
      </div>
      
      {/* 2. Conteúdo Rolável (Totalizadores + Grid) */}
      <div className="detalhes-scrollable">
        
        {loading ? (
            <div className="tab-spinner-container">
                <div className="modal-tab-spinner"></div>
                <div className="modal-tab-spinner-text">Carregando Detalhes...</div>
            </div>
        ) : !infoCultura ? (
            <div style={{textAlign: 'center', padding: '2rem', fontStyle: 'italic'}}>
                {culturaId ? 'Nenhum detalhe encontrado para esta cultura.' : 'Selecione uma cultura à esquerda.'}
            </div>
        ) : (
          <>
            {/* --- INÍCIO DO NOVO LAYOUT PARALELO --- */}
            <div className="detalhes-top-summary-container">
            
                {/* Bloco 1: Cabeçalho de Informações */}
                <div className="detalhes-info-header">
                    <div className="info-grid-item">
                        <span className="label">Filial:</span>
                        <span className="value">{infoCultura.filial}</span>
                    </div>
                    <div className="info-grid-item">
                        <span className="label">Budget/ha:</span>
                        <span className="value">{formatCurrency(infoCultura.budgetHa)}</span>
                    </div>
                    <div className="info-grid-item">
                        <span className="label">Cultura:</span>
                        <span className="value">{infoCultura.culturaNome}</span>
                    </div>
                    <div className="info-grid-item">
                        <span className="label">Dif Budget/ha:</span>
                        <span className="value" style={{color: infoCultura.difBudgetHa < 0 ? 'var(--gcs-brand-red)' : 'var(--gcs-green)'}}>
                        {formatCurrency(infoCultura.difBudgetHa)}
                        </span>
                    </div>
                    <div className="info-grid-item">
                        <span className="label">Area há.:</span>
                        <span className="value">{formatNumber(infoCultura.areaHa, 2)}</span>
                    </div>
                    <div className="info-grid-item">
                        <span className="label">SAFRA:</span>
                        <span className="value">{infoCultura.safra}</span>
                    </div>
                    <div className="info-grid-item">
                        <span className="label">Prod/há:</span>
                        <span className="value">{formatNumber(infoCultura.prodHa, 0)}</span>
                    </div>
                    <div className="info-grid-item">
                        <span className="label">Data Plantio:</span>
                        <span className="value">{formatDate(infoCultura.dataPlantio)}</span>
                    </div>
                    <div className="info-grid-item">
                        <span className="label">VL VD Orçado</span>
                        <span className="value">{formatCurrency(infoCultura.vlVdOrcado)}</span>
                    </div>
                    <div className="info-grid-item">
                        <span className="label">MC LAVOURA</span>
                        <span className="value">{formatCurrency(infoCultura.mcLavoura, false)}</span>
                    </div>
                    <div className="info-grid-item">
                        <span className="label">Fat Bruto</span>
                        <span className="value">{formatCurrency(infoCultura.fatBruto, false)}</span>
                    </div>
                    <div className="info-grid-item">
                        <span className="label">MC %</span>
                        <span className="value">{formatPercent(infoCultura.mcPercent / 100)}</span>
                    </div>
                </div>

                {/* Bloco 2: Tabela Resumo 1 */}
                <table className="summary-table">
                    <thead>
                        <tr>
                            <th>Grupo</th>
                            <th>R$/ha</th>
                            <th>R$ Total</th>
                            <th>%</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Array.from(groupSummaries.summary.entries()).map(([grupo, data]) => (
                            <tr key={grupo}>
                                <td>{grupo}</td>
                                <td>{formatCurrency(data.r_ha, false)}</td>
                                <td>{formatCurrency(data.r_total, false)}</td>
                                <td>{formatPercent(groupSummaries.RTotal > 0 ? (data.r_total / groupSummaries.RTotal) : 0)}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td>Custo / há</td>
                            <td>{formatCurrency(groupSummaries.CustoTotalHa, false)}</td>
                            <td>{formatCurrency(groupSummaries.RTotal, false)}</td>
                            <td>{formatPercent(1)}</td>
                        </tr>
                    </tfoot>
                </table>

                {/* Bloco 3: Tabela Resumo 2 */}
                <table className="summary-table">
                    <thead>
                        <tr>
                            <th>Grupo</th>
                            <th>BRL</th>
                            <th>USD</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Array.from(groupSummaries.summary.entries()).map(([grupo, data]) => (
                            <tr key={grupo}>
                                <td>{grupo}</td>
                                <td>{formatCurrency(data.brl, false)}</td>
                                <td>{formatCurrencyUSD(data.usd)}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td>Custo / há</td>
                            <td>{formatCurrency(groupSummaries.TotalBRL, false)}</td>
                            <td>{formatCurrencyUSD(groupSummaries.TotalUSD)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            {/* --- FIM DO NOVO LAYOUT PARALELO --- */}
            
            {/* 2.3. Barra de Ferramentas (Superior) */}
            <div className="detalhes-toolbar">
                <button className="btn-grid-action add" onClick={handleAddRow}>
                    <Plus size={14} /> Adicionar Linha
                </button>
                <button 
                  className="btn-grid-action remove" 
                  onClick={handleRemoveRow}
                  disabled={selectedRowKeys.length === 0} // <-- Desabilitado se nada selecionado
                >
                    <Trash2 size={14} /> Remover Linha ({selectedRowKeys.length})
                </button>
            </div>

            {/* 2.4. Wrapper do Grid (para scroll) */}
            <div className="detalhes-grid-wrapper">
                <table className="modal-table">
                    <thead>
                        <tr>
                            {/* --- NOVA COLUNA DE CHECKBOX --- */}
                            <th className="th-checkbox">
                                <Checkbox
                                  indeterminate={isIndeterminate}
                                  onChange={onSelectAllChange}
                                  checked={isAllSelected}
                                />
                            </th>
                            
                            {/* Colunas Read-only (Cinza) */}
                            <th className="th-readonly">Grupo</th>
                            <th className="th-readonly">Cod</th>
                            <th className="th-readonly">Item</th>
                            <th className="th-readonly">Un Med</th>
                            <th className="th-readonly">%A</th>
                            <th className="th-readonly">Área</th>
                            <th className="th-readonly">Nº Aplic</th>
                            
                            {/* Colunas Editáveis (Verde) */}
                            <th className="th-editable">Qt/Un/Ha</th>
                            
                            {/* Read-only */}
                            <th className="th-readonly">Alvo/Objetivo</th>

                            {/* Editável */}
                            <th className="th-editable">DAE</th>
                            
                            {/* Read-only */}
                            <th className="th-readonly">Estoque</th>
                            <th className="th-readonly">Qtd Total</th>
                            <th className="th-readonly">Custo/Há</th>

                            {/* Editável */}
                            <th className="th-editable">Vl Uni/Un</th>
                            
                            {/* Read-only */}
                            <th className="th-readonly">R$ Total</th>
                            <th className="th-readonly">Dt DAE</th>
                            <th className="th-readonly">Mês</th>
                            <th className="th-readonly">Ano</th>
                            <th className="th-readonly">Moeda</th>

                            {/* Editável */}
                            <th className="th-editable">Preço USD</th>
                            
                            {/* Read-only */}
                            <th className="th-readonly">Valor USD</th>
                            
                            {/* Editável */}
                            <th className="th-editable">Ptax Conversão</th>
                            
                            {/* Read-only */}
                            <th className="th-readonly">Valor BRL</th>
                        </tr>
                    </thead>
                    <tbody>
                        {insumos.map((detalhe) => (
                            <tr key={detalhe.id}>
                                {/* --- NOVA CÉLULA DE CHECKBOX --- */}
                                <td className="td-checkbox">
                                    <Checkbox
                                      onChange={(e) => onSelectChange(detalhe.id, e.target.checked)}
                                      checked={selectedRowKeys.includes(detalhe.id)}
                                    />
                                </td>

                                {/* Read-only */}
                                <td className="td-readonly">{detalhe.grupo}</td>
                                <td className="td-readonly">{detalhe.cod}</td>
                                <td className="td-readonly">{detalhe.item}</td>
                                <td className="td-readonly" style={{textAlign: 'center'}}>{detalhe.un_med}</td>
                                <td className="td-readonly" style={{textAlign: 'right'}}>{formatPercent(detalhe.percentual_a / 100)}</td>
                                <td className="td-readonly" style={{textAlign: 'right'}}>{formatNumber(detalhe.area, 2)}</td>
                                <td className="td-readonly" style={{textAlign: 'right'}}>{formatNumber(detalhe.n_aplic, 0)}</td>
                                
                                {/* Editável */}
                                <td className="td-editable" style={{textAlign: 'right'}}>{formatNumber(detalhe.qt_un_ha, 2)}</td>
                                
                                {/* Read-only */}
                                <td className="td-readonly">{detalhe.alvo_objetivo}</td>

                                {/* Editável */}
                                <td className="td-editable" style={{textAlign: 'right'}}>{formatNumber(detalhe.dae, 0)}</td>
                                
                                {/* Read-only */}
                                <td className="td-readonly" style={{textAlign: 'right'}}>{formatNumber(detalhe.estoque, 0)}</td>
                                <td className="td-readonly" style={{textAlign: 'right'}}>{formatNumber(detalhe.qtd_total, 2)}</td>
                                <td className="td-readonly" style={{textAlign: 'right'}}>{formatCurrency(detalhe.custo_ha)}</td>

                                {/* Editável */}
                                <td className="td-editable" style={{textAlign: 'right'}}>{formatCurrency(detalhe.vl_uni_un)}</td>
                                
                                {/* Read-only */}
                                <td className="td-readonly" style={{textAlign: 'right'}}>{formatCurrency(detalhe.r_total)}</td>
                                <td className="td-readonly" style={{textAlign: 'center'}}>{formatDate(detalhe.dt_dae)}</td>
                                <td className="td-readonly" style={{textAlign: 'center'}}>{detalhe.mes}</td>
                                <td className="td-readonly" style={{textAlign: 'center'}}>{detalhe.ano}</td>
                                <td className="td-readonly" style={{textAlign: 'center'}}>{detalhe.moeda}</td>

                                {/* Editável */}
                                <td className="td-editable" style={{textAlign: 'right'}}>{formatCurrencyUSD(detalhe.preco_usd)}</td>
                                
                                {/* Read-only */}
                                <td className="td-readonly" style={{textAlign: 'right'}}>{formatCurrencyUSD(detalhe.valor_usd)}</td>
                                
                                {/* Editável */}
                                <td className="td-editable" style={{textAlign: 'right'}}>{formatNumber(detalhe.ptax_conversao, 2)}</td>
                                
                                {/* Read-only */}
                                <td className="td-readonly" style={{textAlign: 'right'}}>{formatCurrency(detalhe.valor_brl)}</td>
                            </tr>
                        ))}
                         {insumos.length === 0 && (
                            <tr>
                                {/* Colspan atualizado para 24 (23 colunas + 1 checkbox) */}
                                <td colSpan={24} style={{textAlign: 'center', fontStyle: 'italic'}}>
                                    {culturaId ? 'Nenhum detalhe encontrado para esta cultura.' : 'Selecione uma cultura à esquerda.'}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* --- BOTÃO ADICIONAR LINHA (INFERIOR) --- */}
            <div className="detalhes-toolbar" style={{marginTop: '1rem'}}>
                <button className="btn-grid-action add" onClick={handleAddRow}>
                    <Plus size={14} /> Adicionar Linha
                </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DetalhesCultura;