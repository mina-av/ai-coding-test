import type { Metadata } from "next";
import "./globals.css";
import { ProjekteProvider } from "@/contexts/projekte-context";
import { LVProvider } from "@/contexts/lv-context";

export const metadata: Metadata = {
  title: "BKI Kalkulation",
  description: "Leistungsverzeichnisse automatisch auslesen und Angebote erstellen",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className="antialiased">
        <ProjekteProvider>
          <LVProvider>
            {children}
          </LVProvider>
        </ProjekteProvider>
      </body>
    </html>
  );
}
