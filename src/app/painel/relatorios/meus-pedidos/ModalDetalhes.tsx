// MODAL DETALHES COMPLETO E RESPONSIVO

"use client";

interface Produto {
  produto_nome: string;
  tratamento?: string;
  quantidade: number;
  valor_unitario: number;
  status_produto?: string;
}

interface Pedido {
  ano?: number;
  tipo_pedido?: string;
  id: number;
  cliente_nome: string;
  cliente_codigo: string;
  frete: string;
  vl_primeira_parc: number;
  vl_segunda_parc: number;
  produtos: Produto[];
  obs_vendedor?: string;
  cnpj?: string;
  mes_primeiro_pgto?: number;
  mes_segundo_pgto?: number;
  status_ass_contrato?: number;
  status_fin_parc1?: string;
  status_fin_parc2?: string;
  num_protheus?: string;
}

interface Props {
  pedido: Pedido;
  onClose: () => void;
}

export default function ModalDetalhes({ pedido, onClose }: Props) {
  const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const total = (pedido.produtos || []).reduce((s, p) => s + p.valor_unitario * p.quantidade, 0);

  const formatarCnpjCpf = (valor?: string) => {
    if (!valor) return "";
    const cleaned = valor.replace(/\D/g, "");
    if (cleaned.length === 11) return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    if (cleaned.length === 14) return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
    return valor;
  };

  const badgeTexto = (texto: string, emoji: string, cor: string) => (
    <div style={{ display: "inline-flex", alignItems: "center", backgroundColor: cor, color: "white", padding: "4px 10px", borderRadius: "20px", fontSize: "0.85rem", fontWeight: "bold", gap: "6px", marginTop: "4px" }}>
      <span>{emoji}</span> {texto}
    </div>
  );

  const badgeStatusProduto = (status?: string) => {
    let corBg = "#ffeeba", corTexto = "#856404", texto = "⏳ Pendente";
    if (status === "aprovado") { corBg = "#d4edda"; corTexto = "#155724"; texto = "✅ Aprovado"; }
    else if (status === "reprovado") { corBg = "#f8d7da"; corTexto = "#721c24"; texto = "❌ Reprovado"; }
    return (
      <div style={{ display: "flex", justifyContent: "center" }}>
        <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", background: corBg, color: corTexto, padding: "6px 12px", borderRadius: "20px", fontSize: "0.8rem", fontWeight: "bold", whiteSpace: "nowrap" }}>{texto}</span>
      </div>
    );
  };

  const statusContratoBadge = () => {
    switch (String(pedido.status_ass_contrato)) {
      case "3": return badgeTexto("Contrato Assinado", "📄", "#28a745");
      case "1": return badgeTexto("Aguardando Envio", "📤", "#ffc107");
      case "2": return badgeTexto("Contrato Não Assinado", "❌", "#dc3545");
      default: return badgeTexto("Contrato Não Gerado", "⚠️", "#ff8c00");
    }
  };

  const statusParcelaBadge = (status: string | undefined) => {
    if (!status || status.trim() === "") {
      return badgeTexto("Sem Financeiro", "➖", "#6c757d"); // cinza
    }

    const texto = status;
    const statusLower = texto.toLowerCase();

    if (statusLower === "pago") return badgeTexto("Pago", "💸", "#28a745");
    if (statusLower === "vencido") return badgeTexto("Vencido", "⚠️", "#dc3545");
    return badgeTexto(texto, "💸", "#ff8c00");
  };

  return (
    <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
      <div style={{ backgroundColor: "#fff", borderRadius: "12px", width: "90%", maxWidth: "900px", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>
        <div style={{ background: "linear-gradient(to right, #1e4321, #47763b)", color: "white", padding: "1rem 1.5rem", borderTopLeftRadius: "12px", borderTopRightRadius: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h5 style={{ margin: 0 }}>Detalhes do Pedido</h5>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "1.5rem", color: "white", cursor: "pointer" }}>×</button>
        </div>

        <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>

          <div style={{ border: "1px solid #28a745", borderRadius: "10px", padding: "1rem", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <p><strong>👤 Cliente:</strong> {pedido.cliente_nome} ({pedido.cliente_codigo})</p>
              {pedido.cnpj && <p><strong>🧾 CNPJ/CPF:</strong> {formatarCnpjCpf(pedido.cnpj)}</p>}
              <p><strong>🚚 Frete:</strong> {pedido.frete}</p>
<p><strong>🧾 Tipo de Pedido:</strong> 
  <span style={{
    backgroundColor: pedido.tipo_pedido?.toLowerCase() === "bonificação" ? "#f0ad4e" : "#5cb85c",
    color: "#fff",
    padding: "2px 10px",
    borderRadius: "6px",
    fontWeight: "bold",
    fontSize: "0.85rem",
    textTransform: "uppercase",
    marginLeft: "6px"
  }}>
    {pedido.tipo_pedido || "NÃO INFORMADO"}
  </span>
</p>
            </div>
            <div style={{ alignSelf: "flex-start", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              <p style={{ margin: 0 }}><strong>📎 Contrato Digital:</strong></p>
              {statusContratoBadge()}
              <p style={{ margin: "4px 0 0 0" }}><strong>🖥️ Contrato Protheus:</strong></p>
              <div style={{ display: "inline-block", backgroundColor: pedido.num_protheus ? "#d4edda" : "#e0e0e0", color: pedido.num_protheus ? "#155724" : "#555", padding: "4px 12px", borderRadius: "20px", fontSize: "0.85rem", fontWeight: "bold", minWidth: "100px", textAlign: "center" }}>{pedido.num_protheus || "Não informado"}</div>
            </div>
          </div>

          <div style={{ border: "1px solid #28a745", borderRadius: "10px", padding: "1rem" }}>
            <p style={{ fontWeight: "bold", marginBottom: "1rem" }}>💰 Pagamento:</p>
            
<div style={{ display: "flex", gap: "2rem", flexWrap: "wrap" }}>
  {pedido.vl_primeira_parc > 0 && (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <div>
          <strong>1ª Parcela:</strong><br />
          {pedido.vl_primeira_parc.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} {pedido.mes_primeiro_pgto ? ` em ${meses[pedido.mes_primeiro_pgto - 1]} de ${pedido.ano}` : ""}
        </div>
        <div>
          <strong>Situação:</strong><br />
          {statusParcelaBadge(pedido.status_fin_parc1)}
        </div>
      </div>
    </>
  )}

  {pedido.vl_segunda_parc > 0 && (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <div>
          <strong>2ª Parcela:</strong><br />
          {pedido.vl_segunda_parc.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} {pedido.mes_segundo_pgto ? ` em ${meses[pedido.mes_segundo_pgto - 1]} de ${pedido.ano}` : ""}
        </div>
        <div>
          <strong>Situação:</strong><br />
          {statusParcelaBadge(pedido.status_fin_parc2)}
        </div>
      </div>
    </>
  )}
</div>

<p style={{ fontWeight: "bold", color: "#1e4321", marginTop: "1rem" }}>
              • 🟢 Total do Pedido: {total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </p>
          </div>

          <div style={{ border: "1px solid #28a745", borderRadius: "10px", padding: "1rem" }}>
            <p style={{ fontWeight: "bold", marginBottom: "0.5rem" }}>📦 Produtos:</p>
            <div className="produtos-desktop">
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead style={{ background: "linear-gradient(to right, #2f5a32, #1e4321)", color: "white" }}>
                  <tr>
                    <th style={{ padding: "10px", border: "1px solid #1e4321" }}>Produto</th>
                    <th style={{ padding: "10px", border: "1px solid #1e4321" }}>Qtd</th>
                    <th style={{ padding: "10px", border: "1px solid #1e4321" }}>Valor Unit</th>
                    <th style={{ padding: "10px", border: "1px solid #1e4321" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pedido.produtos.map((p, idx) => (
                    <tr key={idx}>
                      <td style={{ padding: "8px" }}>{p.produto_nome} {p.tratamento && (<span style={{ marginLeft: 6 }}>({p.tratamento})</span>)}</td>
                      <td style={{ padding: "8px" }}>{p.quantidade}</td>
                      <td style={{ padding: "8px" }}>{p.valor_unitario.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                      <td style={{ padding: "8px", textAlign: "center" }}>{badgeStatusProduto(p.status_produto)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="produtos-mobile">
              {pedido.produtos.map((p, idx) => (
                <div key={idx} style={{ border: "1px solid #ccc", borderRadius: "8px", padding: "0.75rem", marginBottom: "0.75rem" }}>
                  <p style={{ margin: 0, fontWeight: "bold" }}>📦 {p.produto_nome} {p.tratamento && `(${p.tratamento})`}</p>
                  <p style={{ margin: "4px 0" }}><strong>Qtd:</strong> {p.quantidade}</p>
                  <p style={{ margin: "4px 0" }}><strong>Valor Unit:</strong> {p.valor_unitario.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
                  <div style={{ marginTop: "6px" }}>{badgeStatusProduto(p.status_produto)}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ border: "1px solid #28a745", borderRadius: "10px", padding: "1rem" }}>
            <strong style={{ color: "#1e4321" }}>📝 Observação do Vendedor:</strong>
            <p style={{ marginTop: "0.5rem" }}>{pedido.obs_vendedor?.trim() || "Nenhuma observação registrada."}</p>
          </div>
        </div>

        <style>{`
          @media (max-width: 600px) {
            .produtos-desktop { display: none !important; }
            .produtos-mobile { display: block !important; }
          }
          @media (min-width: 601px) {
            .produtos-desktop { display: block !important; }
            .produtos-mobile { display: none !important; }
          }
        `}</style>
      </div>
    </div>
  );
}
