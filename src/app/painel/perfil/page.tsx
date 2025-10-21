"use client";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

export default function Perfil() {
  const { data: session, status } = useSession();
  const [perfil, setPerfil] = useState("Não definido");

  useEffect(() => {
    const fetchPerfil = async () => {
      if (session?.user?.email) {
        try {
          const res = await fetch("/api/usuarios");
          const lista = await res.json();
          const emailUsuario = session.user.email?.toLowerCase();
          const usuario = lista.find((u: any) => u.email?.toLowerCase() === emailUsuario);
          if (usuario) {
            setPerfil(usuario.perfil);
          }
        } catch (err) {
          console.error("Erro ao buscar perfil:", err);
        }
      }
    };

    if (status === "authenticated") {
      fetchPerfil();
    }
  }, [session, status]);

  if (status === "loading") return <p style={{ padding: "2rem" }}>Carregando...</p>;

  return (
    <div style={{ padding: "2rem" }}>
      <h2>Meu Perfil</h2>
      <p><strong>Nome:</strong> {session?.user?.name}</p>
      <p><strong>Email:</strong> {session?.user?.email}</p>
      <p><strong>Perfil:</strong> {perfil}</p>
    </div>
  );
}