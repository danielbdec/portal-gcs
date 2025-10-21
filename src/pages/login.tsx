import { signIn } from "next-auth/react";
import { useEffect } from "react";

export default function LoginPage() {
  useEffect(() => {
    signIn("azure-ad", { callbackUrl: "/painel" });
  }, []);

  return (
    <div style={{
      height: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "sans-serif",
      fontSize: "1.2rem"
    }}>
      Redirecionando para login da Microsoft...
    </div>
  );
}
