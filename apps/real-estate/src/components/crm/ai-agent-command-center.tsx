"use client";

import * as React from "react";
import { useCRM } from "@repo/core/context/crm-context";
import { Lead, PipelineStage } from "@repo/core/types/crm";
import {
  Bot,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  UserCheck,
  Building2,
  IndianRupee,
  Phone,
  Clock,
  ArrowRight,
  Send,
  RefreshCw,
  SlidersHorizontal,
  Flame,
  CheckCircle2,
  ArrowUpRight,
  Cpu,
  Radio,
  Share2,
} from "lucide-react";
import { formatCurrencyINR, formatPhone, formatINR } from "@repo/core/lib/utils";
import { Badge } from "@repo/ui/components/badge";
import { PipelineBadge, LeadScoreBadge, DealHealthBadge } from "@repo/ui/components/status-badge";
import { toast } from "sonner";

interface AiAgentCommandCenterProps {
  onSelectLead: (lead: Lead) => void;
}

const PRESET_BUYERS = [
  {
    id: "buyer-1",
    title: "⚡ HNI Luxury Buyer (Gurgaon)",
    name: "Siddharth Verma",
    phone: "+91 98110 99234",
    location: "Golf Course Ext Rd, Gurgaon",
    config: "3 BHK + Servant (2,800 sq.ft)",
    budget: 38000000,
    timeline: "Ready to Move (30 Days)",
    prompt:
      "Hi Aria, I'm Siddharth Verma (+91 98110 99234). Looking for an ultra-luxury 3 BHK + Servant on Golf Course Extension Road, Gurgaon. Budget is strictly ₹3.8 Cr. Need possession within 30-45 days for family relocation.",
  },
  {
    id: "buyer-2",
    title: "🌊 Sea-View Penthouse (South Mumbai)",
    name: "Ananya Singhania",
    phone: "+91 98200 11456",
    location: "Worli Sea Face, Mumbai",
    config: "4 BHK Duplex Sky Mansion",
    budget: 95000000,
    timeline: "Within 60 Days",
    prompt:
      "Hello Aria, Ananya Singhania here (+91 98200 11456). We are looking for a 4 BHK duplex with unobstructed Arabian sea views in Worli or Lower Parel. Budget allocated is ₹9.5 Crores. We are end-users wanting a site visit this weekend.",
  },
  {
    id: "buyer-3",
    title: "🌿 Bengaluru Tech Villa (Whitefield)",
    name: "Rajesh Nair",
    phone: "+91 98450 12398",
    location: "Whitefield, Bengaluru",
    config: "4 BHK Independent Gated Villa",
    budget: 45000000,
    timeline: "Ready to Move",
    prompt:
      "Namaste Aria, this is Rajesh Nair (+91 98450 12398). Looking for a 4 BHK independent luxury villa with private garden near Whitefield or Sarjapur, Bengaluru. Budget ₹4.5 Cr. Looking to lock the token advance this month.",
  },
  {
    id: "buyer-4",
    title: "🏙️ NRI High-Yield Investor (Mumbai)",
    name: "Vikramaditya Oberoi",
    phone: "+91 98710 44556",
    location: "Bandra Kurla Complex (BKC)",
    config: "Commercial / High-Yield Penthouse",
    budget: 65000000,
    timeline: "Immediate Capital Deployment",
    prompt:
      "Hi Aria, Vikramaditya Oberoi here (+91 98710 44556). NRI investor based in Dubai seeking prime 3/4 BHK or penthouse near BKC with 6.5%+ gross rental yield. Budget ₹6.5 Cr liquid funds ready.",
  },
];

export function AiAgentCommandCenter({ onSelectLead }: AiAgentCommandCenterProps) {
  const { filteredLeads, createLead, projects, regions, users, updateLeadStage } = useCRM();

  const [chatMessages, setChatMessages] = React.useState<
    Array<{
      id: string;
      role: "assistant" | "user";
      content: string;
      toolPayload?: any;
      timestamp: string;
    }>
  >([
    {
      id: "msg-0",
      role: "assistant",
      content:
        "Namaste! I am Aria, your autonomous property intake agent. I qualify buyers 24/7 across WhatsApp and web portals, extract key investment metrics, and stage them for your approval before registering into the Sales Pipeline.",
      timestamp: "Just now",
    },
  ]);

  const [inputMessage, setInputMessage] = React.useState("");
  const [isProcessing, setIsProcessing] = React.useState(false);
  // Human-in-the-loop gate: AI-proposed leads NEVER enter the CRM without
  // explicit operator approval.
  const [pendingQualification, setPendingQualification] = React.useState<any | null>(null);
  const [agentLogs, setAgentLogs] = React.useState<string[]>([
    "⚡ Aria Autonomous Daemon v2.4 initialized",
    "📡 Listening on Inbound WhatsApp Webhook channel",
    "🎯 NLP Parser loaded: Real Estate Domain Engine (INR, Cr, RERA, Vastu)",
    "🟢 Ready for inbound buyer qualification",
  ]);

  const chatEndRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isProcessing]);

  // Lead qualification processor
  const processQualification = async (promptText: string, preset?: (typeof PRESET_BUYERS)[0]) => {
    if (!promptText.trim() || isProcessing) return;

    setInputMessage("");
    const userTimestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // 1. Add User message
    setChatMessages((prev) => [
      ...prev,
      {
        id: `usr-${Date.now()}`,
        role: "user",
        content: promptText,
        timestamp: userTimestamp,
      },
    ]);

    setIsProcessing(true);
    setAgentLogs((prev) => [
      `📩 Inbound inquiry received from ${preset ? preset.name : "Prospective Buyer"}`,
      "🧠 Analyzing intent, budget parameters, and micro-market preference...",
      ...prev.slice(0, 8),
    ]);

    // 2. Simulate AI Processing & Tool Call
    setTimeout(async () => {
      let buyerName = preset?.name || "Kavita Rao";
      let phone = preset?.phone || "+91 98112 34567";
      let location = preset?.location || "Gurgaon Golf Course Road";
      let config = preset?.config || "3 BHK Luxury";
      let budget = preset?.budget || 35000000;
      let timeline = preset?.timeline || "Within 45 Days";

      // If user typed custom text, parse details
      if (!preset) {
        const lower = promptText.toLowerCase();
        if (lower.includes("mumbai") || lower.includes("worli") || lower.includes("bandra")) {
          location = "Worli / South Mumbai";
          budget = 85000000;
        } else if (lower.includes("bengaluru") || lower.includes("bangalore")) {
          location = "Whitefield, Bengaluru";
          budget = 42000000;
        }
      }

      setAgentLogs((prev) => [
        `⚡ Tool Execution: qualifyAndCreateLead({ name: "${buyerName}", budget: "₹${(budget / 10000000).toFixed(1)} Cr" })`,
        "📦 Qualification staged — CRM write pending operator approval...",
        ...prev.slice(0, 8),
      ]);

      // Match project
      const matchedProject =
        projects.find(
          (p) =>
            p.location.toLowerCase().includes(location.toLowerCase()) ||
            p.name.toLowerCase().includes(location.toLowerCase())
        ) || projects[0];

      const matchedRegion = regions.find((r) => r.id === matchedProject.regionId) || regions[0];
      const assignedRep = users.find((u) => u.role === "salesperson") || users[0];

      // HUMAN-IN-THE-LOOP: stage the proposal; nothing is written until an
      // operator explicitly approves it below.
      const proposal = {
        leadDraft: {
          personId: `per-agent-${Date.now()}`,
          personName: buyerName,
          phone: phone,
          email: `${buyerName.toLowerCase().replace(/\s+/g, ".")}@realtyinvest.in`,
          projectId: matchedProject.id,
          projectName: matchedProject.name,
          regionId: matchedRegion.id,
          regionName: matchedRegion.name,
          salespersonId: assignedRep.id,
          salespersonName: assignedRep.name,
          budget: budget,
          stage: "qualified",
          source: "Aria AI Agent (Human Approved)",
          leadScore: 94,
          leadScoreLabel: "Hot",
          dealHealth: "strong",
          dealHealthReason: `AI Qualified: High conviction buyer (${config}) with verified ₹${(budget / 10000000).toFixed(1)} Cr budget`,
          configurationPreference: config,
          buyerIntent: "End-User (Primary Residence)",
          buyingSignals: [
            "Budget strictly pre-verified",
            "Target micro-market specified",
            "VIP Site Visit slot requested",
          ],
          objections: [],
          lastConversationSummary: `Captured by Aria (approved by operator): Buyer interested in ${config} at ${location}. Budget ₹${formatINR(budget)}.`,
          suggestedNextMove: "Deliver curated architectural floor plans and confirm VIP site visit.",
          daysInStage: 0,
          nextFollowUpAt: "Today, 11:30 AM",
          followUpStatus: "due_today",
        },
        toolPayload: {
          personName: buyerName,
          phone: phone,
          location: location,
          configuration: config,
          budget: budget,
          timeline: timeline,
          leadScore: 94,
        },
      };

      setPendingQualification(proposal);
      setChatMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: "assistant" as const,
          content: `I've qualified this requirement for **${config}** in **${location}** (Budget: **₹${(budget / 10000000).toFixed(2)} Cr**). Awaiting your review to register ${buyerName} in the pipeline.`,
          toolPayload: proposal.toolPayload,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);

      setAgentLogs((prev) => [
        `⏸ QUALIFICATION STAGED: "${buyerName}" — awaiting human approval before CRM write`,
        ...prev.slice(0, 8),
      ]);

      setIsProcessing(false);
    }, 1400);
  };

  const approveQualification = async () => {
    if (!pendingQualification) return;
    const { leadDraft } = pendingQualification;

    let newLead;
    try {
      newLead = await createLead(leadDraft);
    } catch {
      // Live-path failure already toasted in the context; keep the proposal
      // staged so the operator can retry.
      return;
    }

    setAgentLogs((prev) => [
      `✅ APPROVED & SYNCED: Lead "${leadDraft.personName}" registered in CRM (ID: ${newLead.id})`,
      ...prev.slice(0, 8),
    ]);
    setPendingQualification(null);
    toast.success(`⚡ Approved & Synced: ${leadDraft.personName}!`);
  };

  const rejectQualification = () => {
    if (!pendingQualification) return;
    setAgentLogs((prev) => [
      `🚫 REJECTED: Qualification for "${pendingQualification.leadDraft.personName}" discarded — no CRM write occurred`,
      ...prev.slice(0, 8),
    ]);
    setPendingQualification(null);
    toast.info("Qualification rejected. Nothing was written to the pipeline.");
  };

  const handleReset = () => {
    setChatMessages([
      {
        id: "msg-0",
        role: "assistant",
        content:
          "Namaste! I am Aria, your autonomous property intake agent. I qualify buyers 24/7 across WhatsApp and web portals, extract key investment metrics, and stage them for your approval before registering into the Sales Pipeline.",
        timestamp: "Just now",
      },
    ]);
    setAgentLogs([
      "🔄 Session reset by operator",
      "🟢 Aria Autonomous Daemon ready for next test sequence",
    ]);
  };

  // Qualified leads list for live radar
  const recentAiLeads = filteredLeads.filter(
    (l) => l.source.includes("Aria") || l.source.includes("AI") || l.stage === "qualified"
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 border border-slate-800 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1.5">
              <Radio className="w-3 h-3 animate-pulse text-emerald-400" /> LIVE AGENT ONLINE
            </span>
            <span className="text-xs text-slate-400 font-mono">Gemini 2.5 Multi-Turn Loop</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-serif font-bold text-white tracking-wide flex items-center gap-2">
            Aria Autonomous Sales & Lead Qualification Engine
          </h1>
          <p className="text-xs text-slate-300 max-w-2xl">
            Simulate prospective buyers reaching out via WhatsApp or web widget. Aria converses naturally, extracts qualification parameters, and stages structured deals for your explicit approval before anything enters the Pipeline.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-right">
            <span className="text-[10px] text-slate-400 uppercase font-mono block">Avg Response Speed</span>
            <span className="text-base font-bold text-emerald-400 font-mono">⚡ 1.2s</span>
          </div>
          <button
            onClick={handleReset}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors flex items-center gap-1.5 text-xs"
            title="Reset simulation"
          >
            <RefreshCw className="w-4 h-4" /> Reset
          </button>
        </div>
      </div>

      {/* Dual Pane Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Pane: Interactive Chat & Simulation Controls (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Preset Inbound Triggers */}
          <div className="p-4 rounded-xl border border-border bg-card shadow-subtle space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" /> 1-Click Inbound Inquiries
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">Click to fire simulated buyer</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PRESET_BUYERS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => processQualification(preset.prompt, preset)}
                  disabled={isProcessing}
                  className="p-2.5 rounded-lg border border-border bg-secondary/40 hover:bg-indigo-50/50 hover:border-indigo-300 dark:hover:bg-indigo-950/30 text-left transition-all group disabled:opacity-50"
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-foreground group-hover:text-indigo-600">
                    <span className="truncate">{preset.title}</span>
                    <ArrowUpRight className="w-3 h-3 text-muted-foreground group-hover:text-indigo-600 shrink-0" />
                  </div>
                  <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                    {preset.name} &bull; ₹{(preset.budget / 10000000).toFixed(1)} Cr
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Live Chat Window */}
          <div className="rounded-2xl border border-border bg-card shadow-card flex flex-col h-[560px] overflow-hidden">
            {/* Chat Header */}
            <div className="p-3.5 border-b border-border bg-secondary/50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-600 text-white shadow-subtle">
                  <Bot className="w-4 h-4" />
                  <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-400 border border-slate-950" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-foreground">Aria Property Intake Bot</h3>
                  <span className="text-[10px] text-muted-foreground font-mono">Channel: Inbound WhatsApp / Web</span>
                </div>
              </div>

              <Badge variant="outline" className="text-[10px] font-mono gap-1 text-amber-600 border-amber-300">
                <ShieldCheck className="w-2.5 h-2.5" /> Approval-Gated Sync
              </Badge>
            </div>

            {/* Messages Feed */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
              {chatMessages.map((msg) => {
                const isUser = msg.role === "user";
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-xl px-3.5 py-2.5 leading-relaxed ${
                        isUser
                          ? "bg-primary text-primary-foreground rounded-br-none shadow-subtle"
                          : "bg-secondary text-foreground rounded-bl-none border border-border"
                      }`}
                    >
                      <p className="whitespace-pre-line">{msg.content}</p>
                    </div>

                    {/* Rich Tool Card inside message */}
                    {msg.toolPayload && (
                      <div className="mt-2 w-full max-w-[90%] p-3.5 rounded-xl bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 text-white border border-indigo-500/40 shadow-lg space-y-2.5 animate-in fade-in-50">
                        <div className="flex items-center justify-between pb-1.5 border-b border-indigo-500/20">
                          <div className="flex items-center gap-1.5">
                            <ShieldCheck className="w-4 h-4 text-emerald-400" />
                            <span className="font-mono font-bold text-[11px] text-white">
                              ⚡ LEAD QUALIFICATION STAGED
                            </span>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            SCORE {msg.toolPayload.leadScore} (HOT)
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                            <span className="text-slate-400 text-[10px] block">Buyer</span>
                            <span className="font-bold text-slate-100 truncate block">
                              {msg.toolPayload.personName}
                            </span>
                            <span className="text-slate-400 font-mono text-[10px]">
                              {msg.toolPayload.phone}
                            </span>
                          </div>

                          <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                            <span className="text-slate-400 text-[10px] block">Budget</span>
                            <span className="font-bold text-emerald-300 block">
                              ₹{(msg.toolPayload.budget / 10000000).toFixed(2)} Cr
                            </span>
                            <span className="text-slate-400 text-[10px]">
                              {msg.toolPayload.timeline}
                            </span>
                          </div>

                          <div className="p-2 rounded bg-slate-900/80 border border-slate-800 col-span-2">
                            <span className="text-slate-400 text-[10px] block">
                              Target Preference
                            </span>
                            <span className="font-medium text-slate-200 block">
                              {msg.toolPayload.configuration} &bull; {msg.toolPayload.location}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[10px] text-slate-400 font-mono">
                            Stage: <strong className="text-indigo-300">QUALIFIED</strong>
                          </span>
                          <button
                             onClick={() => {
                               const found = msg.toolPayload?.leadId
                                 ? filteredLeads.find((l) => l.id === msg.toolPayload.leadId)
                                 : undefined;
                               if (found) onSelectLead(found);
                             }}
                             disabled={!msg.toolPayload?.leadId}
                             className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-[10px] flex items-center gap-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                           >
                            Open in CRM <ArrowUpRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    )}

                    <span className="text-[9px] text-muted-foreground mt-1 px-1 font-mono">
                      {msg.timestamp}
                    </span>
                  </div>
                );
              })}

              {pendingQualification && (
                <div className="p-3.5 rounded-xl border border-amber-400/50 bg-amber-50 dark:bg-amber-950/40 shadow-subtle space-y-2.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-700 dark:text-amber-300">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    HUMAN APPROVAL REQUIRED — nothing has been written to the CRM yet
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-foreground">
                    <span><strong>{pendingQualification.leadDraft.personName}</strong></span>
                    <span className="font-mono">{pendingQualification.toolPayload.phone}</span>
                    <span className="text-muted-foreground">{pendingQualification.toolPayload.location}</span>
                    <span className="text-muted-foreground">{formatCurrencyINR(pendingQualification.toolPayload.budget)}</span>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={approveQualification}
                      disabled={isProcessing}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] flex items-center gap-1.5 transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Approve & Sync to CRM
                    </button>
                    <button
                      onClick={rejectQualification}
                      disabled={isProcessing}
                      className="px-3 py-1.5 rounded-lg bg-card border border-border hover:bg-secondary text-foreground font-semibold text-[11px] transition-colors"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              )}

              {isProcessing && (
                <div className="flex items-center gap-2 text-muted-foreground text-xs py-2 px-1">
                  <div className="flex space-x-1">
                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" />
                  </div>
                  <span className="font-mono text-[11px]">
                    Aria is extracting parameters & executing qualifyAndCreateLead()...
                  </span>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Custom Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                processQualification(inputMessage);
              }}
              className="p-3 border-t border-border bg-secondary/30 flex items-center gap-2"
            >
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Type a custom inquiry (e.g. 3 BHK in Gurgaon ₹3 Cr)..."
                disabled={isProcessing}
                className="flex-1 bg-card border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || isProcessing}
                className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>

        {/* Right Pane: Live Pipeline Radar & Agent Execution Logs (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Agent Terminal Logs */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 shadow-xl space-y-3 font-mono text-[11px]">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-bold text-slate-100 tracking-wider text-xs">
                  AGENT EXECUTION STREAM
                </span>
              </div>
              <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                POLLING ACTIVE
              </span>
            </div>

            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {agentLogs.map((log, idx) => (
                <div key={idx} className="flex items-start gap-1.5 text-slate-300">
                  <span className="text-slate-500 select-none">&gt;</span>
                  <span className="leading-snug">{log}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Qualified Leads Live Radar */}
          <div className="p-4 rounded-xl border border-border bg-card shadow-subtle space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-foreground">
                  Live Inbound Pipeline Feed
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Leads autonomously qualified by Aria
                </p>
              </div>
              <Badge variant="outline" className="text-xs font-mono font-bold">
                {recentAiLeads.length} Synced
              </Badge>
            </div>

            <div className="space-y-2 max-h-[340px] overflow-y-auto">
              {recentAiLeads.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground border border-dashed border-border rounded-lg">
                  No AI leads qualified yet. Click a preset inquiry on the left to test!
                </div>
              ) : (
                recentAiLeads.map((lead) => (
                  <div
                    key={lead.id}
                    onClick={() => onSelectLead(lead)}
                    className="p-3 rounded-lg border border-border bg-secondary/30 hover:bg-secondary hover:border-primary/40 cursor-pointer space-y-2 text-xs transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold text-foreground flex items-center gap-1.5">
                          <span>{lead.personName}</span>
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                            AI
                          </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {formatPhone(lead.phone)}
                        </span>
                      </div>

                      <span className="font-bold text-foreground font-mono">
                        {formatCurrencyINR(lead.budget)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <LeadScoreBadge score={lead.leadScore} label={lead.leadScoreLabel} />
                      <PipelineBadge stage={lead.stage} />
                    </div>

                    <div className="text-[10px] text-muted-foreground flex items-center justify-between pt-1 border-t border-border/50">
                      <span className="truncate">{lead.projectName}</span>
                      <span className="text-primary font-medium flex items-center gap-0.5">
                        Inspect <ArrowRight className="w-2.5 h-2.5" />
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
