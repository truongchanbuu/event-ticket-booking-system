import Header from "@/components/app-header";
import { ReactNode } from "react";
export default function OrganizerLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      <main>{children}</main>
    </>
  );
}
