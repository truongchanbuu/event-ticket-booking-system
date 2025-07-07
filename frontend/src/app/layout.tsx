import AppFooter from "@/components/app-footer";
import "./globals.css";
import { AuthProvider } from "./providers/AuthProvider";
import { ClientProviders } from "./providers/ClientProvider";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <ClientProviders>{children}</ClientProviders>
        </AuthProvider>

        <AppFooter />
      </body>
    </html>
  );
}
