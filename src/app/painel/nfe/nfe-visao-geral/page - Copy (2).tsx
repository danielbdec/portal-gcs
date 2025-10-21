
"use client";

import { Card, Table, Tag } from "antd";
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from "recharts";

const coresStatus = {
  importadas: "#5FB246",
  pendentes: "#F58220",
  "com erro": "#00314A"
};

const labelStatus = {
  importadas: "Importada",
  pendentes: "Pendente",
  "com erro": "Com Erro"
};

const dadosPorStatus = [
  { name: "Importadas", value: 320 },
  { name: "Pendentes", value: 120 },
  { name: "Com Erro", value: 60 },
];

const dadosPorMes = [
  { mes: "Jan", total: 80 },
  { mes: "Fev", total: 100 },
  { mes: "Mar", total: 90 },
  { mes: "Abr", total: 150 },
  { mes: "Mai", total: 180 },
  { mes: "Jun", total: 200 },
];

const ultimasNotas = [
  {
    key: "1",
    numero: "NF-78931",
    status: "importadas",
    descricao: "Nota importada do Protheus",
    data: "2024-07-14 08:22",
  },
  {
    key: "2",
    numero: "NF-78928",
    status: "pendentes",
    descricao: "Nota aguardando classificação do compras",
    data: "2024-07-14 07:10",
  },
  {
    key: "3",
    numero: "NF-78921",
    status: "com erro",
    descricao: "Nota não lançada por erro no pedido",
    data: "2024-07-13 17:42",
  },
  {
    key: "4",
    numero: "NF-78918",
    status: "importadas",
    descricao: "Nota importada do Protheus",
    data: "2024-07-13 15:05",
  },
];

export default function StatusOverview() {
  const totalNotas = dadosPorStatus.reduce((acc, item) => acc + item.value, 0);

  const columns = [
    {
      title: "",
      dataIndex: "status",
      key: "status",
      render: (status: string) => (
        <span
          style={{
            display: "inline-block",
            width: 10,
            height: 10,
            borderRadius: "50%",
            backgroundColor: coresStatus[status],
            marginRight: 8,
          }}
        />
      ),
    },
    {
      title: "Número",
      dataIndex: "numero",
      key: "numero",
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: string) => (
        <Tag color={coresStatus[status]} style={{ color: "#fff", fontWeight: "bold" }}>
          {labelStatus[status]}
        </Tag>
      ),
    },
    {
      title: "Descrição",
      dataIndex: "descricao",
      key: "descricao",
    },
    {
      title: "Data",
      dataIndex: "data",
      key: "data",
    },
  ];

  return (
    <div style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
      <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", marginBottom: "2rem" }}>
        <Card className="kpi-card">
          <h3 style={{ margin: 0, color: "#888", textAlign: "center" }}>Notas Processadas</h3>
          <h2 style={{ margin: 0, fontSize: "2rem", color: "#00314A", textAlign: "center" }}>{totalNotas}</h2>
        </Card>

        <Card className="kpi-card">
          <h3 style={{ margin: 0, color: "#888", textAlign: "center" }}>Notas Enviadas da Fazenda</h3>
          <h2 style={{ margin: 0, fontSize: "2rem", color: "#5FB246", textAlign: "center" }}>297</h2>
        </Card>

        <Card className="kpi-card">
          <h3 style={{ margin: 0, color: "#888", textAlign: "center" }}>Pendentes de Classificação</h3>
          <h2 style={{ margin: 0, fontSize: "2rem", color: "#F58220", textAlign: "center" }}>88</h2>
        </Card>

        <Card className="kpi-card">
          <h3 style={{ margin: 0, color: "#888", textAlign: "center" }}>Notas no Transmite</h3>
          <h2 style={{ margin: 0, fontSize: "2rem", color: "#00314A", textAlign: "center" }}>221</h2>
        </Card>
      </div>

      <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
        <Card title="Notas por Status" className="kpi-card">
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dadosPorStatus}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  {dadosPorStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={coresStatus[entry.name.toLowerCase() as keyof typeof coresStatus]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Notas Processadas por Mês" className="kpi-card">
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dadosPorMes}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="total" fill="#5FB246" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card title="Últimas Notas" className="kpi-card" style={{ marginTop: "2rem" }}>
        <Table columns={columns} dataSource={ultimasNotas} pagination={false} />
      </Card>

      <style jsx global>{`
        .kpi-card {
          transition: all 0.3s ease;
          cursor: pointer;
        }
        .kpi-card:hover {
          transform: scale(1.05);
          box-shadow: 0 16px 32px rgba(0, 0, 0, 0.25);
        }
      `}</style>
    </div>
  );
}
