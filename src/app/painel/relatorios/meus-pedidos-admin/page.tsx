"use client";

import { useEffect, useState } from "react";
import ModalDetalhes from "./ModalDetalhes";
import { Input, Button, Form, Row, Col } from "antd";
import { SearchOutlined } from "@ant-design/icons";

export default function MeusPedidos() {
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [filtro, setFiltro] = useState("");
  const [loading, setLoading] = useState(true);
  const [pedidoSelecionado, setPedidoSelecionado] = useState<any | null>(null);

  useEffect(() => {
    const carregarPedidos = async () => {
      try {
        const response = await fetch("/api/meus-pedidos-admin", { method: "POST" });
        const data = await response.json();
        setPedidos(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Erro ao carregar pedidos:", error);
      } finally {
        setLoading(false);
      }
    };
    carregarPedidos();
  }, []);

  const pedidosFiltrados = pedidos.filter((pedido) => {
    const termo = filtro.toLowerCase();
    return (
      !filtro ||
      pedido.id?.toString().includes(termo) ||
      pedido.cliente_nome?.toLowerCase().includes(termo) ||
      pedido.municipio?.toLowerCase().includes(termo) ||
      pedido.estado?.toLowerCase().includes(termo)
    );
  });

  return (
    <div style={{ padding: "2rem", backgroundColor: "#f9fbf7", maxWidth: 1200, margin: "0 auto" }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      ` }} />
      <h2 style={{
        textAlign: 'center',
        marginBottom: '2rem',
        fontSize: '2rem',
        fontWeight: 'bold',
        background: 'linear-gradient(90deg, #2b572d, #8dc891)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent'
      }}>
        Pedidos Gerais
      </h2>

      <Form layout="vertical">
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={20}>
            <Form.Item label="Digite código, nome, município ou estado">
              <Input
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                allowClear
              />
            </Form.Item>
          </Col>
          <Col span={4}>
            <Button
              type="primary"
              icon={<SearchOutlined />}
              style={{ marginTop: 30, width: '100%' }}
              onClick={() => setFiltro(filtro.trim())}
            >
              Buscar
            </Button>
          </Col>
        </Row>
      </Form>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem' }}>
  <div style={{
    width: '40px',
    height: '40px',
    border: '4px solid #a8d08d',
    borderTop: '4px solid #599c2f',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  }} />
  <div style={{ marginTop: '1rem', fontWeight: 'bold', color: '#599c2f' }}>
    Carregando pedidos...
  </div>
</div>
      ) : pedidosFiltrados.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#999', fontStyle: 'italic' }}>
          Nenhum pedido encontrado.
        </div>
      ) : (
        pedidosFiltrados.map((pedido) => (
          <div
            key={pedido.id}
            style={{
              backgroundColor: "#fff",
              padding: "1.5rem",
              marginBottom: "1.5rem",
              borderRadius: "12px",
              boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
              transition: "all 0.2s ease-in-out",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow =
                "0 6px 12px rgba(0,0,0,0.2)";
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow =
                "0 1px 4px rgba(0,0,0,0.1)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <div style={{ fontWeight: "bold", marginBottom: "0.5rem", fontSize: "16px" }}>
              #{pedido.id} - {pedido.cliente_nome.toUpperCase()} - {pedido.municipio}/{pedido.estado}
            </div>
            <div style={{ marginBottom: "0.5rem" }}>
              💰 <strong>Total do Pedido:</strong> R${" "}
              {(pedido.vl_primeira_parc + pedido.vl_segunda_parc).toLocaleString('pt-BR')}
            </div>
            <div style={{ marginBottom: "1rem", fontSize: "14px", color: "#555" }}>
              <span>🚛 {pedido.frete}</span> | <span>👤 {pedido.nome_vendedor?.trim?.()}</span> | <span>📅 {new Date(pedido.data_entrega).toLocaleDateString()}</span>
            </div>
            <button
              onClick={() => setPedidoSelecionado(pedido)}
              style={{
                backgroundColor: "#599c2f",
                color: "#fff",
                border: "none",
                padding: "8px 16px",
                borderRadius: "20px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "bold",
                maxWidth: "160px",
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "0 6px 12px rgba(0,0,0,0.2)";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.1)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              🔍 Ver Detalhes
            </button>
          </div>
        ))
      )}

      {pedidoSelecionado && (
        <ModalDetalhes
          pedido={pedidoSelecionado}
          onClose={() => setPedidoSelecionado(null)}
        />
      )}
    </div>
  );
}
