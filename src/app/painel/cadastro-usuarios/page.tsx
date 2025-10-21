"use client";

import { Suspense, useEffect, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Users, Save, UserCheck, UserX, Edit, ShieldCheck, Trash2, PlusCircle, KeyRound, Cog, UserRoundCheck, UserRoundX, Lock } from "lucide-react";

// --- INTERFACES ---
interface Funcao {
  id: number;
  nome_chave: string;
  modulo: string;
  descricao: string;
}

interface FuncaoDoUsuario {
  funcao_id: number;
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

// --- COMPONENTES AUXILIARES ---

const LoadingSpinner = ({ text }: { text: string }) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
        <div style={{ width: '40px', height: '40px', border: '4px solid var(--gcs-gray-medium)', borderTop: '4px solid var(--gcs-blue)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <div style={{ marginTop: '1rem', fontWeight: 'bold', color: 'var(--gcs-blue)' }}>
            {text}
        </div>
    </div>
);

const AcessoNegado = () => {
  const router = useRouter();
  return (
    <div className="content-card" style={{ textAlign: 'center', padding: '3rem', maxWidth: '600px', margin: 'auto' }}>
      <Lock size={48} color="var(--gcs-orange)" />
      <h2 style={{ marginTop: '1.5rem', color: 'var(--gcs-blue)' }}>Acesso Negado</h2>
      <p style={{ color: 'var(--gcs-gray-dark)', maxWidth: '400px', margin: '1rem auto' }}>
        Você não tem as permissões necessárias para visualizar esta página. Por favor, contacte um administrador se acredita que isto é um erro.
      </p>
      <button onClick={() => router.push('/painel')} className="btn btn-green" style={{ marginTop: '1rem' }}>
        Voltar ao Painel
      </button>
    </div>
  );
};

// --- COMPONENTE DE CADASTRO DE FUNÇÕES ---
function CadastroFuncoes({ funcoes, onFuncaoChange, isLoading }: { funcoes: Funcao[], onFuncaoChange: () => void, isLoading: boolean }) {
  const [nomeChave, setNomeChave] = useState("");
  const [modulo, setModulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [funcaoEditando, setFuncaoEditando] = useState<Funcao | null>(null);
  const [mensagem, setMensagem] = useState("");

  const limparFormularioFuncao = () => {
    setNomeChave("");
    setModulo("");
    setDescricao("");
    setFuncaoEditando(null);
  };

  const salvarFuncao = async () => {
    setMensagem("");
    const isEditing = !!funcaoEditando;
    const endpoint = isEditing ? "/api/portal/altera-funcao" : "/api/portal/cria-funcao";

    const dados = { nome_chave: nomeChave, modulo, descricao };
    if (isEditing) {
      (dados as any).id = funcaoEditando!.id;
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados),
    });

    if (res.ok) {
      setMensagem(`Função ${isEditing ? 'atualizada' : 'criada'} com sucesso.`);
      limparFormularioFuncao();
      onFuncaoChange();
    } else {
      const erro = await res.json();
      setMensagem("Erro: " + (erro.error || "Ocorreu um problema."));
    }
  };

  const excluirFuncao = async (id: number) => {
    if (window.confirm("Tem certeza que deseja excluir esta função? Isso pode afetar usuários existentes.")) {
      const res = await fetch("/api/portal/exclui-funcao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setMensagem("Função excluída com sucesso.");
        onFuncaoChange();
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
        <PlusCircle size={28}/>
        Adicionar/Editar Função
      </h3>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <input type="text" value={modulo} onChange={(e) => setModulo(e.target.value)} placeholder="Módulo (ex: NF Entrada)" className="form-input" style={{ marginBottom: 0, flex: '1 1 150px' }}/>
        <input type="text" value={nomeChave} onChange={(e) => setNomeChave(e.target.value)} placeholder="Chave (ex: nfEntrada.ver)" className="form-input" style={{ marginBottom: 0, flex: '1 1 150px' }}/>
        <input type="text" value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descrição amigável" className="form-input" style={{ marginBottom: 0, flex: '2 1 300px' }}/>
        <button onClick={salvarFuncao} className="btn btn-green" style={{ whiteSpace: 'nowrap' }}>
          {funcaoEditando ? <Save size={18}/> : <PlusCircle size={18}/>}
          {funcaoEditando ? 'Atualizar' : 'Adicionar'}
        </button>
        {funcaoEditando && <button onClick={limparFormularioFuncao} className="btn btn-outline-gray">Cancelar</button>}
      </div>
      {mensagem && <p style={{ padding: '1rem', borderRadius: '8px', backgroundColor: mensagem.startsWith('Erro') ? '#f8d7da' : '#d4edda', color: mensagem.startsWith('Erro') ? '#721c24' : '#155724' }}>{mensagem}</p>}
      <hr style={{ margin: '2rem 0', border: 'none', borderTop: '1px solid var(--gcs-border-color)' }} />
      <h4 style={{ marginTop: 0, fontSize: '1.25rem', color: 'var(--gcs-blue)', marginBottom: '1.5rem' }}>
        Funções Cadastradas
      </h4>
      {isLoading ? <LoadingSpinner text="Carregando funções..." /> : funcoes.length > 0 ? (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
            <thead style={{ backgroundColor: 'var(--gcs-gray-light)', textAlign: 'left' }}>
              <tr>
                {/* INÍCIO DA ALTERAÇÃO */}
                <th style={{ padding: '12px', borderBottom: '2px solid var(--gcs-border-color)', width: '80px' }}>ID</th>
                {/* FIM DA ALTERAÇÃO */}
                <th style={{ padding: '12px', borderBottom: '2px solid var(--gcs-border-color)' }}>Módulo</th>
                <th style={{ padding: '12px', borderBottom: '2px solid var(--gcs-border-color)' }}>Chave</th>
                <th style={{ padding: '12px', borderBottom: '2px solid var(--gcs-border-color)' }}>Descrição</th>
                <th style={{ padding: '12px', borderBottom: '2px solid var(--gcs-border-color)', textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {funcoes.map(f => (
                <tr key={f.id}>
                  {/* INÍCIO DA ALTERAÇÃO */}
                  <td style={{ padding: '12px', borderBottom: '1px solid var(--gcs-border-color)', fontFamily: 'monospace', color: 'var(--gcs-gray-dark)' }}>{f.id}</td>
                  {/* FIM DA ALTERAÇÃO */}
                  <td style={{ padding: '12px', borderBottom: '1px solid var(--gcs-border-color)' }}>{f.modulo}</td>
                  <td style={{ padding: '12px', borderBottom: '1px solid var(--gcs-border-color)', fontFamily: 'monospace' }}>{f.nome_chave}</td>
                  <td style={{ padding: '12px', borderBottom: '1px solid var(--gcs-border-color)' }}>{f.descricao}</td>
                  <td style={{ padding: '12px', borderBottom: '1px solid var(--gcs-border-color)', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button onClick={() => editarFuncao(f)} className="btn btn-outline-gray" style={{ padding: '8px' }} title="Editar"><Edit size={16}/></button>
                      <button onClick={() => excluirFuncao(f.id)} className="btn btn-outline-gray" style={{ padding: '8px' }} title="Excluir"><Trash2 size={16}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p>Nenhuma função cadastrada.</p>
      )}
    </div>
  );
}

// --- MODAL DE GERENCIAMENTO DE USUÁRIO ---
function GerenciamentoUsuarioModal({ 
    isOpen, 
    onClose, 
    user, 
    todasFuncoes, 
    onSave,
    funcoesAgrupadas
}: { 
    isOpen: boolean, 
    onClose: () => void, 
    user: Usuario | null, 
    todasFuncoes: Funcao[],
    onSave: (data: any) => Promise<void>,
    funcoesAgrupadas: FuncoesAgrupadas
}) {
    const [activeModalTab, setActiveModalTab] = useState<'dados' | 'permissoes'>('dados');
    const [email, setEmail] = useState("");
    const [statusUsuario, setStatusUsuario] = useState("ativo");
    const [isAdmin, setIsAdmin] = useState(false);
    const [funcoesSelecionadas, setFuncoesSelecionadas] = useState<Set<number>>(new Set());

    useEffect(() => {
        if (isOpen && user) {
            setEmail(user.email || "");
            setStatusUsuario(user.status || "ativo");
            setIsAdmin(user.is_admin || false);
            setFuncoesSelecionadas(new Set(user.funcoes || []));
            setActiveModalTab('dados');
        }
    }, [isOpen, user]);

    if (!isOpen) return null;

    const handleSave = () => {
        const dados: any = {
            email,
            status: statusUsuario,
            is_admin: isAdmin,
            funcoes: Array.from(funcoesSelecionadas),
        };
        if (user) {
            dados.id = user.id;
        }
        onSave(dados).then(() => {
            onClose();
        });
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

    return (
        <>
            <div onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000 }}></div>
            <div className="content-card" style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 1001, width: '90%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto' }}>
                <h2 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--gcs-blue)', display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
                    <Users size={28} />
                    <span>{user ? "Gerenciar Usuário" : "Adicionar Novo Usuário"}</span>
                </h2>
                <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--gcs-border-color)', marginBottom: '2rem' }}>
                    <button className={`tab-button ${activeModalTab === 'dados' ? 'active' : ''}`} onClick={() => setActiveModalTab('dados')}>Dados do Usuário</button>
                    <button className={`tab-button ${activeModalTab === 'permissoes' ? 'active' : ''}`} onClick={() => setActiveModalTab('permissoes')}>Permissões</button>
                </div>
                {activeModalTab === 'dados' && (
                    <div>
                        <label className="form-label">Email</label>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email do usuário" className="form-input" />
                        <label className="form-label">Status</label>
                        <select value={statusUsuario} onChange={(e) => setStatusUsuario(e.target.value)} className="form-select">
                            <option value="ativo">Ativo</option>
                            <option value="inativo">Inativo</option>
                        </select>
                        <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center' }}>
                            <input type="checkbox" id="is_admin_modal" checked={isAdmin} onChange={(e) => setIsAdmin(e.target.checked)} style={{ width: '1.2em', height: '1.2em', cursor: 'pointer' }} />
                            <label htmlFor="is_admin_modal" style={{ marginLeft: '8px', fontWeight: 500, cursor: 'pointer' }}>É Administrador (Acesso Total)</label>
                        </div>
                    </div>
                )}
                {activeModalTab === 'permissoes' && (
                    <div>
                        {todasFuncoes.length > 0 ? (
                            Object.entries(funcoesAgrupadas).map(([modulo, funcoes]) => (
                            <fieldset key={modulo} className="permission-fieldset">
                                <legend>{modulo}</legend>
                                {funcoes.map(funcao => (
                                <div key={funcao.id} style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center' }}>
                                    <input type="checkbox" id={`modal-funcao-${funcao.id}`} checked={funcoesSelecionadas.has(funcao.id)} onChange={() => handleFuncaoChange(funcao.id)} disabled={isAdmin} style={{ width: '1.2em', height: '1.2em', cursor: 'pointer' }}/>
                                    <label htmlFor={`modal-funcao-${funcao.id}`} style={{ marginLeft: '8px', color: isAdmin ? '#999' : 'inherit', cursor: 'pointer' }}>{funcao.descricao}</label>
                                </div>
                                ))}
                            </fieldset>
                            ))
                        ) : <p style={{ color: 'var(--gcs-gray-dark)' }}>Nenhuma permissão encontrada. Cadastre funções na aba "Funções do Portal".</p>}
                    </div>
                )}
                <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                    <button onClick={onClose} className="btn btn-outline-gray">Cancelar</button>
                    <button onClick={handleSave} className="btn btn-green">
                        <Save size={18} />
                        {user ? "Atualizar Usuário" : "Salvar Usuário"}
                    </button>
                </div>
            </div>
        </>
    );
}

// --- COMPONENTE PRINCIPAL ---
function CadastroUsuariosInner() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [authStatus, setAuthStatus] = useState<'loading' | 'authorized' | 'unauthorized'>('loading');
  const [activeTab, setActiveTab] = useState<'usuarios' | 'funcoes'>('usuarios');
  const [mensagem, setMensagem] = useState("");
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [todasFuncoes, setTodasFuncoes] = useState<Funcao[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [managingUser, setManagingUser] = useState<Usuario | null>(null);

  useEffect(() => {
    if (status === 'loading') {
      setAuthStatus('loading');
      return;
    }
    if (status === 'authenticated') {
      const user = session.user as any;
      const hasAccess = user?.is_admin === true || (Array.isArray(user?.funcoes) && user.funcoes.includes('admin.gerenciarUsuarios'));
      if (hasAccess) {
        setAuthStatus('authorized');
        fetchData();
      } else {
        setAuthStatus('unauthorized');
      }
    } else {
        router.push('/login');
    }
  }, [status, session, router]);
  
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
      if (!res.ok) { setUsuarios([]); return; }
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
      if (!res.ok) { setTodasFuncoes([]); return; }
      const data = await res.json();
      setTodasFuncoes(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Falha ao carregar funções:", error);
      setTodasFuncoes([]);
    }
  };

  const salvarUsuario = async (dados: any) => {
    setMensagem(""); 
    const isEditing = !!dados.id;
    const endpoint = isEditing ? "/api/portal/altera-usuarios" : "/api/portal/cria-usuarios";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados),
    });

    if (res.ok) {
      setMensagem(`Usuário ${isEditing ? 'atualizado' : 'criado'} com sucesso.`);
      carregarUsuarios();
    } else {
      const erro = await res.json();
      setMensagem("Erro: " + (erro.error || "Ocorreu um problema na operação."));
    }
  };
  
  const openModalForNew = () => {
    const newUserTemplate: Usuario = {
      id: 0,
      email: '',
      status: 'ativo',
      is_admin: false,
      funcoes: [],
    };
    setManagingUser(newUserTemplate);
    setIsModalOpen(true);
  };

  const openModalForEdit = async (user: Usuario) => {
    try {
      const res = await fetch('/api/portal/consulta-usuarios-funcoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id }),
      });

      if (!res.ok) {
        throw new Error('Falha ao buscar funções do usuário.');
      }

      const funcoesDoUsuario: FuncaoDoUsuario[] = await res.json();
      const funcoesIds = funcoesDoUsuario.map(f => f.funcao_id);

      const completeUser = {
        ...user,
        funcoes: funcoesIds,
      };

      setManagingUser(completeUser);
      setIsModalOpen(true);

    } catch (error) {
      console.error("Erro ao buscar detalhes do usuário:", error);
      setMensagem("Erro: Não foi possível carregar as permissões deste usuário.");
    }
  };

  const funcoesAgrupadas = useMemo(() => {
    return todasFuncoes.reduce((acc, funcao) => {
      const modulo = funcao.modulo;
      if (!acc[modulo]) { acc[modulo] = []; }
      acc[modulo].push(funcao);
      return acc;
    }, {} as FuncoesAgrupadas);
  }, [todasFuncoes]);

  if (authStatus === 'loading') {
    return (
        <div className="main-container" style={{ padding: "2rem", backgroundColor: "#E9ECEF", minHeight: "100vh" }}>
            <LoadingSpinner text="A verificar permissões..." />
        </div>
    );
  }

  if (authStatus === 'unauthorized') {
    return (
        <div className="main-container" style={{ padding: "2rem", backgroundColor: "#E9ECEF", minHeight: "100vh" }}>
            <AcessoNegado />
        </div>
    );
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
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
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
            margin-bottom: 1rem;
        }
        .form-label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: 600;
            color: var(--gcs-blue);
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
        .tab-button {
            background: none; border: none; cursor: pointer; padding: 12px 20px; font-size: 1.1rem; font-weight: 600; color: var(--gcs-gray-dark);
            border-bottom: 3px solid transparent; transition: all 0.2s ease-in-out;
        }
        .tab-button.active {
            color: var(--gcs-blue);
            border-bottom-color: var(--gcs-orange);
        }
      `}</style>
      
      <div className="main-container" style={{ padding: "2rem", backgroundColor: "#E9ECEF", minHeight: "100vh" }}>
        <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ margin: 0, fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--gcs-blue)' }}>
                Controle de Usuários e Acessos
            </h1>
            <p style={{ marginTop: '0.5rem', fontSize: '1.1rem', color: 'var(--gcs-gray-dark)'}}>
                Gerencie os usuários do sistema e as funções que cada um pode acessar.
            </p>
        </div>
        <div className="tabs-card" style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '0.5rem 2rem', marginBottom: '2rem', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)', border: '1px solid var(--gcs-border-color)' }}>
            <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--gcs-border-color)' }}>
                <button className={`tab-button ${activeTab === 'usuarios' ? 'active' : ''}`} onClick={() => setActiveTab('usuarios')}>
                    Usuários
                </button>
                <button className={`tab-button ${activeTab === 'funcoes' ? 'active' : ''}`} onClick={() => setActiveTab('funcoes')}>
                    Funções do Portal
                </button>
            </div>
        </div>
        {activeTab === 'usuarios' && (
            <div className="content-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ marginTop: 0, fontSize: '1.75rem', color: 'var(--gcs-blue)'}}>Utilizadores Registados</h3>
                    <button onClick={openModalForNew} className="btn btn-green">
                        <PlusCircle size={18}/>
                        Adicionar Usuário
                    </button>
                </div>
                {mensagem && <p style={{ marginBottom: "1rem", padding: '1rem', borderRadius: '8px', backgroundColor: mensagem.startsWith('Erro') ? '#f8d7da' : '#d4edda', color: mensagem.startsWith('Erro') ? '#721c24' : '#155724' }}>{mensagem}</p>}
                {isLoading ? <LoadingSpinner text="Carregando usuários..." /> : usuarios.length > 0 ? (
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {usuarios.map((u) => (
                        <li key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 0', borderBottom: '1px solid var(--gcs-border-color)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{
                                width: '40px', height: '40px', borderRadius: '50%', backgroundColor: u.status === 'ativo' ? 'var(--gcs-green)' : 'var(--gcs-gray-dark)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white'
                            }}>
                                {u.status === 'ativo' ? <UserRoundCheck size={20} /> : <UserRoundX size={20} />}
                            </div>
                            <div>
                                <strong style={{ display: 'block', color: '#333' }}>{u.email}</strong>
                                {u.is_admin ? (
                                    <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--gcs-orange)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                        <ShieldCheck size={14} />
                                        Administrador
                                    </span>
                                ) : (
                                    <span style={{ fontSize: '0.9rem', color: 'var(--gcs-gray-dark)' }}>
                                        Personalizado
                                    </span>
                                )}
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <button onClick={() => openModalForEdit(u)} className="btn btn-outline-gray" style={{ padding: '8px 16px' }}>
                                <Cog size={16} />
                                Gerenciar
                            </button>
                        </div>
                        </li>
                    ))}
                    </ul>
                ) : <p style={{ color: 'var(--gcs-gray-dark)' }}>Nenhum utilizador registado de momento.</p>}
            </div>
        )}
        {activeTab === 'funcoes' && (
            <CadastroFuncoes 
                funcoes={todasFuncoes} 
                onFuncaoChange={carregarFuncoes} 
                isLoading={isLoading}
            />
        )}
      </div>
      <GerenciamentoUsuarioModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        user={managingUser}
        todasFuncoes={todasFuncoes}
        onSave={salvarUsuario}
        funcoesAgrupadas={funcoesAgrupadas}
      />
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
