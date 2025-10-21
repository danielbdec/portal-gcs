"use client";
import { Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface Usuario {
  email: string;
  perfil: string;
  status: string;
}

function CadastroUsuariosInner() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [perfil, setPerfil] = useState("vendedor");
  const [statusUsuario, setStatusUsuario] = useState("ativo");
  const [mensagem, setMensagem] = useState("");
  const [usuarios, setUsuarios] = useState([]);
  const [usuarioEditando, setUsuarioEditando] = useState<Usuario | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    carregarUsuarios();
  }, [session, status]);

  const carregarUsuarios = async () => {
    const res = await fetch("/api/usuarios");
    const json = await res.json();
    setUsuarios(json);
  };

  const salvar = async () => {
    const dados = { email, perfil, status: statusUsuario };
    let res;
    if (usuarioEditando) {
      res = await fetch("/api/usuarios", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...dados, emailAntigo: usuarioEditando.email }),
      });
    } else {
      res = await fetch("/api/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados),
      });
    }

    if (res.ok) {
      setMensagem("Usuário salvo com sucesso.");
      setEmail("");
      setStatusUsuario("ativo");
      setUsuarioEditando(null);
      carregarUsuarios();
    } else {
      const erro = await res.json();
      setMensagem("Erro: " + erro.error);
    }
  };

  const excluir = async (email: string) => {
    await fetch("/api/usuarios", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    carregarUsuarios();
  };

  const editar = (usuario: any) => {
    setEmail(usuario.email);
    setPerfil(usuario.perfil);
    setStatusUsuario(usuario.status);
    setUsuarioEditando(usuario);
  };

  if (status === "loading") {
    return <p style={{ padding: "2rem" }}>Verificando permissões...</p>;
  }

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h2 style={{
        textAlign: 'center',
        marginBottom: '2rem',
        fontSize: '2rem',
        fontWeight: 'bold',
        background: 'linear-gradient(90deg, #2b572d, #8dc891)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent'
      }}>
        {usuarioEditando ? "Editar Usuário" : "Cadastro de Usuários"}
      </h2>
      <input
        type="email"
        placeholder="Email do usuário"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{
          padding: "8px",
          width: "300px",
          marginBottom: "1rem",
          display: "block",
        }}
      />
      <select
        value={perfil}
        onChange={(e) => setPerfil(e.target.value)}
        style={{
          padding: "8px",
          width: "300px",
          marginBottom: "1rem",
          display: "block",
        }}
      >
        <option value="admin">Admin</option>
        <option value="vendedor">Vendedor</option>
        <option value="aprovador">Aprovador</option>
	<option value="credito">Credito</option>
      </select>
      <select
        value={statusUsuario}
        onChange={(e) => setStatusUsuario(e.target.value)}
        style={{
          padding: "8px",
          width: "300px",
          marginBottom: "1rem",
          display: "block",
        }}
      >
        <option value="ativo">Ativo</option>
        <option value="inativo">Inativo</option>
      </select>
      <button onClick={salvar} style={{ padding: "8px 16px" }}>
        {usuarioEditando ? "Atualizar" : "Salvar"}
      </button>
      {mensagem && <p style={{ marginTop: "1rem" }}>{mensagem}</p>}

      <h3 style={{ marginTop: "2rem" }}>Usuários Cadastrados</h3>
      <ul>
        {usuarios.map((u: any) => (
          <li key={u.email} style={{ marginBottom: "0.5rem" }}>
            <strong>{u.email}</strong> ({u.perfil}) - {u.status}{" "}
            <button
              onClick={() => editar(u)}
              style={{ marginLeft: "1rem" }}
            >
              Editar
            </button>
            <button
              onClick={() => excluir(u.email)}
              style={{ marginLeft: "1rem" }}
            >
              Excluir
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function CadastroUsuarios() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <CadastroUsuariosInner />
    </Suspense>
  );
}
