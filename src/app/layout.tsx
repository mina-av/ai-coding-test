import type { Metadata } from "next";
import "./globals.css";
import { LVProvider } from "@/contexts/lv-context";

export const metadata: Metadata = {
  title: "BKI Angebots-Tool",
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
        <LVProvider>
          {children}
        </LVProvider>
      </body>
    </html>
  );
}
