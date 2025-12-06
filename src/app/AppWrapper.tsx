"use client";

import { usePathname } from 'next/navigation';
import ClientLayout from "./client-layout";

export default function AppWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Defina aqui as rotas que NÃO devem ter o layout do painel (a barra lateral)
  const publicRoutes = ['/login', '/register', '/forgot-password'];

  // Se a rota atual for uma das rotas públicas, renderize apenas a página.
  // CORREÇÃO AQUI: Adicionado "|| ''" para garantir que seja sempre string
  if (publicRoutes.includes(pathname || '')) {
    return <>{children}</>;
  }

  // Para todas as outras rotas, aplique o layout do painel.
  return <ClientLayout>{children}</ClientLayout>;
}