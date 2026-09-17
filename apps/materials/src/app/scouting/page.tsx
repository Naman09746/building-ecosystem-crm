"use client";

import * as React from "react";
import { AppShell } from "@/components/layout/app-shell";
import { MaterialsScoutingView } from "@/components/verticals/materials/materials-scouting-view";

export default function ScoutingPage() {
  return (
    <AppShell initialTab="scouting">
      <div className="p-4 sm:p-6">
        <MaterialsScoutingView />
      </div>
    </AppShell>
  );
}
