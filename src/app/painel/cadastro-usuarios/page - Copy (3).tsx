"use client";

import { Suspense, useEffect, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
// Importando ícones para a nova interface
import { Users, Save, UserCheck, UserX, Edit, ShieldCheck, Trash2, PlusCircle } from "lucide-react";

// --- INTERFACES ---
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


// --- COMPONENTE DE CADASTRO DE PERMISSÕES ---
function CadastroPermissoes({ funcoes, onPermissaoChange, isLoading }: { funcoes: Funcao[], onPermissaoChange: () => void, isLoading: boolean }) {
  const [nomeChave, setNomeChave] = useState("");
  const [modulo, setModulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [funcaoEditando, setFuncaoEditando] = useState<Funcao | null>(null);
  const [mensagem, setMensagem] = useState("");

  const limparFormularioPermissao = () => {
    setNomeChave("");
    setModulo("");
    setDescricao("");
    setFuncaoEditando(null);
  };

  const salvarFuncao = async () => {
    setMensagem("");
    const isEditing = !!funcaoEditando;
    // TODO: Criar estes endpoints na sua API
    const endpoint = isEditing ? "/api/portal/altera-funcao" : "/api/portal/cria-funcao";

    const dados = { nome_chave: nomeChave, modulo, descricao };
    if (isEditing) {
      (dados as any).id = funcaoEditando.id;
    }

    const res = await fetch(endpoint, {
      method: "POST", // ou PUT para alterar
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados),
    });

    if (res.ok) {
      setMensagem(`Permissão ${isEditing ? 'atualizada' : 'criada'} com sucesso.`);
      limparFormularioPermissao();
      onPermissaoChange(); // Avisa o componente pai para recarregar as funções
    } else {
      const erro = await res.json();
      setMensagem("Erro: " + (erro.error || "Ocorreu um problema."));
    }
  };

  const excluirFuncao = async (id: number) => {
    if (window.confirm("Tem certeza que deseja excluir esta permissão? Isso pode afetar usuários existentes.")) {
      // TODO: Criar este endpoint na sua API
      const res = await fetch("/api/portal/exclui-funcao", {
        method: "POST", // ou DELETE
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setMensagem("Permissão excluída com sucesso.");
        onPermissaoChange();
      } else {
        const erro = await res.json();
        setMensagem("Erro ao excluir: " + (erro.error || "Ocorreu um problema."));
      }
    }
  };

  const editarFuncao = (funcao: Funcao) => {
    setFuncaoEditando(funcao);
    setNomeChave(funcao.nome_chave);
    setModulo(funcao.modulo);
    setDescricao(funcao.descricao);
  };

  return (
    <div className="content-card">
      <h3 style={{ marginTop: 0, fontSize: '1.75rem', color: 'var(--gcs-blue)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <ShieldCheck size={28}/>
        Cadastro de Permissões
      </h3>
      
      {/* Formulário de Nova Permissão */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <input type="text" value={modulo} onChange={(e) => setModulo(e.target.value)} placeholder="Módulo (ex: NF Entrada)" className="form-input" style={{ marginBottom: 0 }}/>
        <input type="text" value={nomeChave} onChange={(e) => setNomeChave(e.target.value)} placeholder="Chave (ex: nfEntrada.ver)" className="form-input" style={{ marginBottom: 0 }}/>
        <input type="text" value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descrição amigável" className="form-input" style={{ marginBottom: 0 }}/>
        <button onClick={salvarFuncao} className="btn btn-green" style={{ whiteSpace: 'nowrap' }}>
          {funcaoEditando ? <Save size={18}/> : <PlusCircle size={18}/>}
          {funcaoEditando ? 'Atualizar' : 'Adicionar'}
        </button>
        {funcaoEditando && <button onClick={limparFormularioPermissao} className="btn btn-outline-gray">Cancelar</button>}
      </div>
      {mensagem && <p style={{ padding: '1rem', borderRadius: '8px', backgroundColor: mensagem.startsWith('Erro') ? '#f8d7da' : '#d4edda', color: mensagem.startsWith('Erro') ? '#721c24' : '#155724' }}>{mensagem}</p>}


      {/* Lista de Permissões Existentes */}
      {isLoading ? <p>A carregar permissões...</p> : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {funcoes.map(f => (
            <li key={f.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 0', borderBottom: '1px solid var(--gcs-border-color)' }}>
              <div>
                <strong style={{ display: 'block', color: '#333' }}>{f.descricao}</strong>
                <span style={{ fontSize: '0.9rem', color: 'var(--gcs-gray-dark)', fontFamily: 'monospace' }}>{f.modulo} / {f.nome_chave}</span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => editarFuncao(f)} className="btn btn-outline-gray" style={{ padding: '8px 16px' }}><Edit size={16}/></button>
                <button onClick={() => excluirFuncao(f.id)} className="btn btn-outline-gray" style={{ padding: '8px 16px' }}><Trash2 size={16}/></button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}


// --- COMPONENTE PRINCIPAL ---
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
      fetchData();
    }
  }, [status]);
  
  const fetchData = async () => {
    setIsLoading(true);
    await Promise.all([
      carregarUsuarios(),
      carregarFuncoes()
    ]);
    setIsLoading(false);
  };

  const carregarUsuarios = async () => {
    try {
      const res = await fetch("/api/portal/consulta-usuarios", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({})
      });
      if (!res.ok) {
        setUsuarios([]); return;
      }
      const data = await res.json();
      setUsuarios(Array.isArray(data) ? data : []);
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
        setTodasFuncoes([]); return;
      }
      const data = await res.json();
      setTodasFuncoes(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Falha ao carregar funções:", error);
      setTodasFuncoes([]);
    }
  };

  const salvar = async () => {
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

  const limparFormulario = () => {
    setEmail("");
    setStatusUsuario("ativo");
    setIsAdmin(false);
    setUsuarioEditando(null);
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

  return (
    <>
      <style>{`
        :root {
            --gcs-blue: #00314A;
            --gcs-green: #5FB246;
            --gcs-orange: #F58220;
            --gcs-gray-light: #f8f9fa;
            --gcs-gray-medium: #e9ecef;
            --gcs-gray-dark: #6c757d;
            --gcs-border-color: #dee2e6;
        }
        .btn { cursor: pointer; font-weight: 600; display: inline-flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s ease-in-out; border: 1px solid transparent; padding: 10px 20px; border-radius: 8px; }
        .btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .btn:disabled { cursor: not-allowed; opacity: 0.6; }
        .btn-green { background-color: var(--gcs-green); color: white; }
        .btn-green:hover:not(:disabled) { background-color: #4a9d3a; }
        .btn-outline-gray { background-color: #fff; color: var(--gcs-gray-dark); border-color: var(--gcs-border-color); }
        .btn-outline-gray:hover:not(:disabled) { border-color: var(--gcs-gray-dark); background-color: var(--gcs-gray-light); }
        .content-card {
            background-color: #fff;
            border-radius: 12px;
            padding: 2rem;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
            border: 1px solid var(--gcs-border-color);
        }
        .form-input, .form-select {
            display: block;
            width: 100%;
            padding: 12px 16px;
            font-size: 1rem;
            border-radius: 8px;
            border: 1px solid var(--gcs-border-color);
            margin-bottom: 1.5rem;
        }
        .permission-fieldset {
            border: 1px solid var(--gcs-border-color);
            padding: 1.5rem;
            margin-bottom: 1.5rem;
            border-radius: 8px;
        }
        .permission-fieldset legend {
            padding: 0 0.5rem;
            font-weight: 600;
            color: var(--gcs-blue);
        }
      `}</style>
      
      <div className="main-container" style={{ padding: "2rem", backgroundColor: "#E9ECEF", minHeight: "100vh" }}>
        {/* CARD DO FORMULÁRIO DE USUÁRIOS */}
        <div className="content-card" style={{ marginBottom: '2rem' }}>
          <h2 style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold', color: 'var(--gcs-blue)', display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
            <Users size={32} />
            <span>{usuarioEditando ? "Editar Usuário" : "Cadastro de Usuários"}</span>
          </h2>
          
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email do usuário" className="form-input" />
          
          <select value={statusUsuario} onChange={(e) => setStatusUsuario(e.target.value)} className="form-select">
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
          </select>
          
          <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center' }}>
            <input type="checkbox" id="is_admin" checked={isAdmin} onChange={(e) => setIsAdmin(e.target.checked)} style={{ width: '1.2em', height: '1.2em', cursor: 'pointer' }} />
            <label htmlFor="is_admin" style={{ marginLeft: '8px', fontWeight: 500, cursor: 'pointer' }}>É Administrador (Acesso Total)</label>
          </div>

          <hr style={{ margin: '2rem 0', border: 'none', borderTop: '1px solid var(--gcs-border-color)' }} />

          <h3>Permissões de Usuário</h3>
          
          {isLoading ? (
            <p>A carregar permissões...</p>
          ) : todasFuncoes.length > 0 ? (
            Object.entries(funcoesAgrupadas).map(([modulo, funcoes]) => (
              <fieldset key={modulo} className="permission-fieldset">
                <legend>{modulo}</legend>
                {funcoes.map(funcao => (
                  <div key={funcao.id} style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center' }}>
                    <input
                      type="checkbox"
                      id={`funcao-${funcao.id}`}
                      checked={funcoesSelecionadas.has(funcao.id)}
                      onChange={() => handleFuncaoChange(funcao.id)}
                      disabled={isAdmin}
                      style={{ width: '1.2em', height: '1.2em', cursor: 'pointer' }}
                    />
                    <label htmlFor={`funcao-${funcao.id}`} style={{ marginLeft: '8px', color: isAdmin ? '#999' : 'inherit', cursor: 'pointer' }}>
                      {funcao.descricao}
                    </label>
                  </div>
                ))}
              </fieldset>
            ))
          ) : (
            <p style={{ color: 'var(--gcs-gray-dark)' }}>Nenhuma permissão encontrada ou registada no sistema.</p>
          )}

          <button onClick={salvar} className="btn btn-green">
            <Save size={18} />
            {usuarioEditando ? "Atualizar" : "Salvar"}
          </button>
          
          {mensagem && <p style={{ marginTop: "1rem", padding: '1rem', borderRadius: '8px', backgroundColor: mensagem.startsWith('Erro') ? '#f8d7da' : '#d4edda', color: mensagem.startsWith('Erro') ? '#721c24' : '#155724' }}>{mensagem}</p>}
        </div>

        {/* CARD DA LISTA DE USUÁRIOS */}
        <div className="content-card" style={{ marginBottom: '2rem' }}>
          <h3 style={{ marginTop: 0, fontSize: '1.75rem', color: 'var(--gcs-blue)', marginBottom: '1.5rem' }}>Utilizadores Registados</h3>
          
          {isLoading ? (
            <p>A carregar utilizadores...</p>
          ) : usuarios.length > 0 ? (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {usuarios.map((u) => (
                <li key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 0', borderBottom: '1px solid var(--gcs-border-color)' }}>
                  <div>
                    <strong style={{ display: 'block', color: '#333' }}>{u.email}</strong>
                    <span style={{ fontSize: '0.9rem', color: 'var(--gcs-gray-dark)' }}>
                      {u.is_admin ? 'Admin' : 'Personalizado'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ padding: '4px 10px', borderRadius: '16px', color: '#fff', fontWeight: 500, fontSize: '12px', backgroundColor: u.status === 'ativo' ? 'var(--gcs-green)' : 'var(--gcs-gray-dark)' }}>
                      {u.status === 'ativo' ? <UserCheck size={14} style={{ marginRight: '4px' }}/> : <UserX size={14} style={{ marginRight: '4px' }} />}
                      {u.status}
                    </span>
                    <button onClick={() => editar(u)} className="btn btn-outline-gray" style={{ padding: '8px 16px' }}>
                      <Edit size={16} />
                      Editar
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ color: 'var(--gcs-gray-dark)' }}>Nenhum utilizador registado de momento.</p>
          )}
        </div>

        {/* NOVO CARD DE CADASTRO DE PERMISSÕES */}
        <CadastroPermissoes 
          funcoes={todasFuncoes} 
          onPermissaoChange={carregarFuncoes} 
          isLoading={isLoading}
        />

      </div>
    </>
  );
}

export default function CadastroUsuarios() {
  return (
    <Suspense fallback={<div>A carregar...</div>}>
      <CadastroUsuariosInner />
    </Suspense>
  );
}
