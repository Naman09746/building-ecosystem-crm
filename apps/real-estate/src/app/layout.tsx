import type { Metadata, Viewport } from "next";
import { Inter, Fraunces, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@repo/core/context/auth-context";
import { CRMProvider } from "@repo/core/context/crm-context";
import { PWARegistrar } from "@/components/layout/pwa-registrar";

export const dynamic = "force-dynamic";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#13161c",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: "Ecosystem Realty — Unified Operating System for Real Estate & Construction",
  description: "The unified operations and sales operating system for Real Estate, Building Materials, Furniture, Interior Design, and Turnkey Contracting.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Ecosystem Realty",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${fraunces.variable} ${ibmPlexMono.variable} h-full scroll-smooth`}
    >
      <body className="min-h-full bg-background font-sans text-foreground antialiased flex flex-col">
        <AuthProvider defaultIndustry="real_estate">
          <CRMProvider defaultVertical="real_estate">
            {children}
            <PWARegistrar />
          </CRMProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
