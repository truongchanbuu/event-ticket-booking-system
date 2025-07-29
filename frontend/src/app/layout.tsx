import { metadata } from "./metadata";
export { metadata };

import AppFooter from "@/components/app-footer";
import "./globals.css";
import { AuthProvider } from "./providers/AuthProvider";
import { ClientProviders } from "./providers/ClientProvider";
import { RouteProgressBar } from "@/components/ui/route-progress-bar";
import { NavigationEvents } from "@/components/layout/navigation-events";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-gramm="false" data-gramm_editor="false">
      <body>
        <RouteProgressBar height={8} />
        <NavigationEvents />

        <AuthProvider>
          <ClientProviders>{children}</ClientProviders>
        </AuthProvider>
        <AppFooter />
      </body>
    </html>
  );
}
