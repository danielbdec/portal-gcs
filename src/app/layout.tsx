import { Metadata } from "next";
import Providers from "./providers";
import SpinnerWrapper from "./SpinnerWrapper";
import AppWrapper from "./AppWrapper"; // ✅ novo import

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export const metadata: Metadata = {
  title: "Portal GCS",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <Providers>
          <SpinnerWrapper>
            <AppWrapper>{children}</AppWrapper> {/* ✅ uso seguro aqui */}
          </SpinnerWrapper>
        </Providers>
      </body>
    </html>
  );
}
