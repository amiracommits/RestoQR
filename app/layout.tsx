import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Zanate Food - Pedidos",
  description: "Sistema de pedidos por QR",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}