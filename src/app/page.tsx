
"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { Button, Spin } from "antd";
import { LoadingOutlined } from "@ant-design/icons";
import { useEffect, useState } from "react";

export default function HomePage() {
  const { data: session, status } = useSession();
  const [loadingLogout, setLoadingLogout] = useState(false);

  const orangeColor = "#f97316"; // usado só no spinner
  const blueGradient = "linear-gradient(90deg, #1e3a8a, #60a5fa)";

  const gradientStyle = {
    background: blueGradient,
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    display: "inline-block"
  };

  const spinner = <LoadingOutlined style={{ fontSize: 48, color: orangeColor }} spin />;

  useEffect(() => {
    if (status === "unauthenticated") {
      signIn("microsoft", { callbackUrl: "/" });
    }
  }, [status]);

  if (status === "loading" || loadingLogout) {
    return (
      <div style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 9999,
        background: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}>
        <Spin tip={loadingLogout ? "Saindo..." : "Carregando..."} indicator={spinner} />
      </div>
    );
  }

  return (
    <div style={{
      background: "#fff",
      padding: "2rem",
      borderRadius: "12px",
      boxShadow: "0 6px 18px rgba(0,0,0,0.12)",
      maxWidth: "700px",
      margin: "2rem auto",
      textAlign: "center"
    }}>
      <h1 style={{ fontSize: "2rem", fontWeight: "bold", margin: 0 }}>
        🏠 <span style={gradientStyle}>Bem-vindo, {session?.user?.name}</span>
      </h1>

      <p style={{ marginTop: "1.5rem", fontSize: "1rem", color: "#333" }}>
        <span style={{
          display: "inline-block",
          padding: "0.25rem 0.75rem",
          backgroundColor: "#f0f0f0",
          borderRadius: "1rem",
          fontSize: "0.875rem"
        }}>
          E-mail: {session?.user?.email}
        </span>
      </p>

      <div style={{ marginTop: "2rem" }}>
        <Button
          className="btn-laranja"
          onClick={() => {
            setLoadingLogout(true);
            signOut({ callbackUrl: "/" });
          }}
        >
          Sair
        </Button>
      </div>
    </div>
  );
}
