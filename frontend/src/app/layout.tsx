import Header from "@/components/app-header";
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
          <ClientProviders>
            <Header />
            {children}
          </ClientProviders>
        </AuthProvider>
      </body>
    </html>
  );
}
