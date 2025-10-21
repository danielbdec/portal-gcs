"use client";

import { Suspense, useEffect, useState, useMemo } from "react";
import { useSession } from "next-auth/react";

// Interfaces alinhadas com o banco de dados
interface Funcao {
  id: number;
  nome_chave: string;
  modulo: string;
  descricao: string;
}

interface Usuario {
  id: number;
  email: string;
  status: string;
  is_admin: boolean;
  funcoes: number[];
}

interface FuncoesAgrupadas {
  [modulo: string]: Funcao[];
}

function CadastroUsuariosInner() {
  const { status } = useSession();

  // Estados do formulário
  const [email, setEmail] = useState("");
  const [statusUsuario, setStatusUsuario] = useState("ativo");
  const [isAdmin, setIsAdmin] = useState(false);
  const [mensagem, setMensagem] = useState("");

  // Estados de dados
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [usuarioEditando, setUsuarioEditando] = useState<Usuario | null>(null);
  const [todasFuncoes, setTodasFuncoes] = useState<Funcao[]>([]);
  const [funcoesSelecionadas, setFuncoesSelecionadas] = useState<Set<number>>(new Set());
  
  // Estado para controlar o carregamento dos dados
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === "authenticated") {
      const fetchData = async () => {
        setIsLoading(true);
        await Promise.all([
          carregarUsuarios(),
          carregarFuncoes()
        ]);
        setIsLoading(false);
      };
      fetchData();
    }
  }, [status]);

  // --- FUNÇÕES DE API COM FALLBACK ---

  const carregarUsuarios = async () => {
    try {
      const res = await fetch("/api/portal/consulta-usuarios", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({})
      });
      if (!res.ok) {
        console.error("API de consulta de usuários respondeu com erro:", res.status);
        setUsuarios([]);
        return;
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        setUsuarios(data);
      } else {
        setUsuarios([]);
      }
    } catch (error) {
      console.error("Falha ao carregar usuários:", error);
      setUsuarios([]);
    }
  };

  const carregarFuncoes = async () => {
    try {
      const res = await fetch("/api/portal/consulta-funcoes", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({})
      });
      if (!res.ok) {
        console.error("API de consulta de funções respondeu com erro:", res.status);
        setTodasFuncoes([]);
        return;
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        setTodasFuncoes(data);
      } else {
        setTodasFuncoes([]);
      }
    } catch (error) {
      console.error("Falha ao carregar funções:", error);
      setTodasFuncoes([]);
    }
  };

  const salvar = async () => {
    // Limpa a mensagem anterior antes de uma nova tentativa
    setMensagem(""); 
    
    const isEditing = !!usuarioEditando;
    const endpoint = isEditing ? "/api/portal/altera-usuarios" : "/api/portal/cria-usuarios";
    
    const dados: any = {
      email,
      status: statusUsuario,
      is_admin: isAdmin,
      funcao_ids: Array.from(funcoesSelecionadas),
    };

    if (isEditing) {
      dados.id = usuarioEditando.id;
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados),
    });

    if (res.ok) {
      setMensagem(`Usuário ${isEditing ? 'atualizado' : 'criado'} com sucesso.`);
      limparFormulario();
      carregarUsuarios();
    } else {
      const erro = await res.json();
      setMensagem("Erro: " + (erro.error || "Ocorreu um problema na operação."));
    }
  };

  // --- Funções auxiliares do formulário ---
  const limparFormulario = () => {
    setEmail("");
    setStatusUsuario("ativo");
    setIsAdmin(false);
    setUsuarioEditando(null);
    // setMensagem(""); // A mensagem não é limpa aqui para que o usuário possa vê-la
    setFuncoesSelecionadas(new Set());
  };

  const handleFuncaoChange = (funcaoId: number) => {
    const novasFuncoes = new Set(funcoesSelecionadas);
    if (novasFuncoes.has(funcaoId)) {
      novasFuncoes.delete(funcaoId);
    } else {
      novasFuncoes.add(funcaoId);
    }
    setFuncoesSelecionadas(novasFuncoes);
  };

  const editar = (usuario: Usuario) => {
    // Limpa a mensagem ao iniciar uma edição
    setMensagem("");
    setUsuarioEditando(usuario);
    setEmail(usuario.email);
    setStatusUsuario(usuario.status);
    setIsAdmin(usuario.is_admin);
    setFuncoesSelecionadas(new Set(usuario.funcoes));
    window.scrollTo(0, 0);
  };

  const funcoesAgrupadas = useMemo(() => {
    return todasFuncoes.reduce((acc, funcao) => {
      const modulo = funcao.modulo;
      if (!acc[modulo]) { acc[modulo] = []; }
      acc[modulo].push(funcao);
      return acc;
    }, {} as FuncoesAgrupadas);
  }, [todasFuncoes]);


  if (status === "loading") {
    return <p style={{ padding: "2rem" }}>A verificar permissões...</p>;
  }

  // --- RENDERIZAÇÃO DO COMPONENTE ---
  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h2>{usuarioEditando ? "Editar Utilizador" : "Registo de Utilizadores"}</h2>
      
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email do utilizador" style={{ display: 'block', marginBottom: '1rem', width: '300px' }} />
      <select value={statusUsuario} onChange={(e) => setStatusUsuario(e.target.value)} style={{ display: 'block', marginBottom: '1rem', width: '300px' }}>
        <option value="ativo">Ativo</option>
        <option value="inativo">Inativo</option>
      </select>
      <div>
        <input type="checkbox" id="is_admin" checked={isAdmin} onChange={(e) => setIsAdmin(e.target.checked)} />
        <label htmlFor="is_admin" style={{ marginLeft: '8px' }}>É Administrador (Acesso Total)</label>
      </div>

      <hr style={{ margin: '2rem 0' }} />

      <h3>Permissões</h3>
      
      {isLoading ? (
        <p>A carregar permissões...</p>
      ) : todasFuncoes.length > 0 ? (
        Object.entries(funcoesAgrupadas).map(([modulo, funcoes]) => (
          <fieldset key={modulo} style={{ border: '1px solid #ccc', padding: '1rem', marginBottom: '1rem', borderRadius: '8px', maxWidth: '500px' }}>
            <legend style={{ padding: '0 0.5rem' }}>{modulo}</legend>
            {funcoes.map(funcao => (
              <div key={funcao.id}>
                <input
                  type="checkbox"
                  id={`funcao-${funcao.id}`}
                  checked={funcoesSelecionadas.has(funcao.id)}
                  onChange={() => handleFuncaoChange(funcao.id)}
                  disabled={isAdmin}
                />
                <label htmlFor={`funcao-${funcao.id}`} style={{ marginLeft: '8px', color: isAdmin ? '#999' : 'inherit' }}>
                  {funcao.descricao}
                </label>
              </div>
            ))}
          </fieldset>
        ))
      ) : (
        <p>Nenhuma permissão encontrada ou registada no sistema.</p>
      )}

      <button onClick={salvar} style={{ padding: "8px 16px", marginTop: '1rem' }}>
        {usuarioEditando ? "Atualizar" : "Salvar"}
      </button>
      {mensagem && <p style={{ marginTop: "1rem", color: mensagem.startsWith('Erro') ? 'red' : 'green' }}>{mensagem}</p>}

      <h3 style={{ marginTop: "2rem" }}>Utilizadores Registados</h3>
      
      {isLoading ? (
        <p>A carregar utilizadores...</p>
      ) : usuarios.length > 0 ? (
        <ul>
          {usuarios.map((u) => (
            <li key={u.id}>
              <strong>{u.email}</strong> ({u.is_admin ? 'Admin' : 'Personalizado'}) - {u.status}
              <button onClick={() => editar(u)} style={{ marginLeft: "1rem" }}>Editar</button>
            </li>
          ))}
        </ul>
      ) : (
        <p>Nenhum utilizador registado de momento.</p>
      )}
    </div>
  );
}

export default function CadastroUsuarios() {
  return (
    <Suspense fallback={<div>A carregar...</div>}>
      <CadastroUsuariosInner />
    </Suspense>
  );
}
