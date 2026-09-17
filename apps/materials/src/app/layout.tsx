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
  title: "Ecosystem Realty — Architectural Real Estate Sales Command Center",
  description: "High-velocity sales command center engineered for Indian luxury real estate developers and advisory desks.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "EcosystemRealty",
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
        <AuthProvider defaultIndustry="building_materials">
          <CRMProvider defaultVertical="building_materials">
            {children}
            <PWARegistrar />
          </CRMProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
