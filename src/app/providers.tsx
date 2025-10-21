"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode, useState } from "react";
import { Refine } from "@refinedev/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import routerProvider from "@refinedev/nextjs-router";

export default function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <Refine routerProvider={routerProvider}>
          {children}
        </Refine>
      </SessionProvider>
    </QueryClientProvider>
  );
}
