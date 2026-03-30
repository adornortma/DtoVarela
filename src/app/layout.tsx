import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "KPI Varela - Operaciones",
  description: "Visualización de KPIs operativos de técnicos de campo",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <div style={{ display: 'flex', minHeight: '100vh' }}>
           <Sidebar />
           <main style={{ flex: 1, backgroundColor: 'var(--background)' }}>
              {children}
           </main>
        </div>
      </body>
    </html>
  );
}
