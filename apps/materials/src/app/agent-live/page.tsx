"use client";

import * as React from "react";
import { AppShell } from "@/components/layout/app-shell";

export default function AgentLivePage() {
  React.useEffect(() => {
    localStorage.setItem("ecosystemrealty_active_tab", "ai-agent");
  }, []);

  return <AppShell />;
}
