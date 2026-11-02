import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Naeratav Hammas – suuhoolduse assistent",
  description: "Abiline hambaharja valimiseks ja suuhoolduse nõuanneteks.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="et">
      <body className="flex h-dvh flex-col antialiased">
        <div className="min-h-0 flex-1">{children}</div>
        <footer className="border-t border-slate-200 bg-white px-4 py-2 text-center text-xs text-slate-500">
          © 2026 Naeratav Hammas. Built with Claude Code
        </footer>
      </body>
    </html>
  );
}
