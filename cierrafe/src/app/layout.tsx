import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Plus_Jakarta_Sans } from "next/font/google";
import { ThemeProvider } from "@/components/theme";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Cierra · Sueldos para estudios contables",
  description: "Sistema de liquidación de sueldos multiempresa y recibos web para estudios contables de Uruguay.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es-UY" className={`${jakarta.variable} h-full antialiased`}>
      <body className="min-h-full">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
