"use client";

import * as React from "react";
import { AppShell } from "@/components/layout/app-shell";
import { MaterialsFootfallView } from "@/components/verticals/materials/materials-footfall-view";

export default function FootfallPage() {
  return (
    <AppShell initialTab="footfall">
      <div className="p-4 sm:p-6">
        <MaterialsFootfallView />
      </div>
    </AppShell>
  );
}
