import type { Metadata } from "next";
import { AppProvider } from "@/components/app-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "PataMatch · Un hogar, una nueva historia",
  description: "Encuentra una mascota compatible con tu vida y acompaña cada paso de una adopción responsable.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es" data-scroll-behavior="smooth"><body><AppProvider>{children}</AppProvider></body></html>;
}
