import AppFooter from "@/components/app-footer";
import "./globals.css";
import { AuthProvider } from "./providers/AuthProvider";
import { ClientProviders } from "./providers/ClientProvider";
import GlobalLoading from "@/components/global-loading";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <GlobalLoading />
        <AuthProvider>
          <ClientProviders>{children}</ClientProviders>
        </AuthProvider>
        <AppFooter />
      </body>
    </html>
  );
}
