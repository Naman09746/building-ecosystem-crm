import * as React from "react";
import Link from "next/link";
import { Building2, ShieldCheck, ArrowLeft } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full bg-background flex flex-col justify-between selection:bg-primary/10">
      {/* Top Navbar */}
      <header className="w-full border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2.5 group transition-transform active:scale-[0.99]"
        >
          <div className="h-9 w-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold shadow-sm">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-base tracking-tight text-foreground flex items-center gap-1.5">
              Ecosystem Realty
              <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                SaaS
              </span>
            </span>
            <span className="text-[11px] text-muted-foreground font-medium hidden sm:block">
              Sales Command Center for Indian Real Estate
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="hidden sm:flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span className="font-medium">256-bit Bank-grade Encrypted</span>
          </div>

          <Link
            href="/"
            className="flex items-center gap-1 font-medium hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Home</span>
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-10 my-auto">
        <div className="w-full max-w-4xl flex items-center justify-center">
          {children}
        </div>
      </main>

      {/* Bottom Footer */}
      <footer className="w-full border-t border-border py-4 px-6 text-center text-xs text-muted-foreground">
        <p>© 2026 Apex Realty Technologies. All rights reserved. • ISO 27001 Certified • RERA Compliant</p>
      </footer>
    </div>
  );
}
