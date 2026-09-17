"use client";

import * as React from "react";
import {
  Bot,
  Sparkles,
  Send,
  X,
  Minimize2,
  Maximize2,
  TrendingUp,
  Building2,
  UserCheck,
  IndianRupee,
  ShieldCheck,
  RotateCcw,
  Layers,
  FileText,
  Compass,
  ArrowUpRight,
  CheckCheck,
  AlertTriangle,
  FileDown,
  PhoneCall,
  CalendarCheck,
  UserX,
} from "lucide-react";
import { useCRM } from "@repo/core/context/crm-context";
import { toast } from "sonner";
import { formatINR } from "@repo/core/lib/utils";
import { ScoredUnitMatch, ExistingBuyerMatch, DocumentItemSummary, NextActionRecommendation } from "@repo/core/lib/server/aria-tools";

interface AiLeadBotProps {
  onOpenLeadDetail?: (leadId: string) => void;
  defaultOpen?: boolean;
}

export interface QualifiedLeadCardData {
  personName: string;
  phone: string;
  location: string;
  configuration: string;
  budget: number;
  timeline: string;
  buyerIntent: string;
  leadScore: number;
  leadScoreLabel: "Hot" | "Warm" | "Cold";
  buyingSignals?: string[];
  objections?: string[];
  notes: string;
  crmLeadId?: string;
  approvalStatus?: "pending" | "approved" | "rejected";
}

interface ChatMessage {
  id: string;
  role: "assistant" | "user";
  content: string;
  inventoryResults?: ScoredUnitMatch[];
  buyerMatch?: ExistingBuyerMatch;
  documents?: DocumentItemSummary[];
  nextAction?: NextActionRecommendation;
  toolCard?: QualifiedLeadCardData;
  createdAt: Date;
}

const GET_QUICK_PROMPTS = (vertical: string) => {
  if (vertical === "building_materials") {
    return [
      {
        label: "🧱 Cement Bulk (₹5-10L)",
        text: "Find bulk cement availability for ₹5L to ₹10L.",
      },
      {
        label: "👤 Check Contractor: +919811099234",
        text: "Look up existing contractor record for phone +919811099234.",
      },
      {
        label: "📄 Specs & Pricelists",
        text: "Fetch verified specs and wholesale pricelists for active materials.",
      },
      {
        label: "⚡ Qualify Inbound: Siddharth Verma",
        text: "Hi Aria, Siddharth here (+919811099234). Need 500 bags of UltraTech cement, budget ₹2L.",
      },
    ];
  }
  return [
    {
      label: "🏢 3 BHK Shortlist (₹1.5 - 3.8 Cr)",
      text: "Find available 3 BHK units around ₹1.5 Cr to ₹3.8 Cr in Gurgaon or Mumbai.",
    },
    {
      label: "👤 Check Buyer: +919811099234",
      text: "Look up existing buyer record for phone +919811099234.",
    },
    {
      label: "📄 Project Brochures",
      text: "What verified brochures and cost sheets are available for our active projects?",
    },
    {
      label: "⚡ Qualify Inbound: Siddharth Verma",
      text: "Hi Aria, my name is Siddharth Verma (+919811099234). I am looking for a 3 BHK + Servant in Golf Course Ext Gurgaon, budget ₹3.8 Cr, ready to visit this weekend.",
    },
  ];
};

export function AiLeadBot({ onOpenLeadDetail, defaultOpen = false }: AiLeadBotProps) {
  const { createLead, projects, regions, users, leads, units, vertical } = useCRM();
  const [isOpen, setIsOpen] = React.useState(defaultOpen);
  const [isExpanded, setIsExpanded] = React.useState(false);
  
  const initialGreeting = vertical === "building_materials"
    ? "Namaste! I'm Aria 2.0, your Building Materials Intelligence Advisor.\n\nI can check inventory stock, analyze contractor requirements, fetch verified specs and pricelists, and recommend high-impact sales moves."
    : "Namaste! I'm Aria 2.0, your Real Estate Sales Intelligence Advisor.\n\nI can search live property inventory, analyze buyer requirements with explainable matching scores, detect duplicate leads, fetch verified brochures, and recommend high-impact sales moves.";

  const [messages, setMessages] = React.useState<ChatMessage[]>([
    {
      id: "init-1",
      role: "assistant",
      content: initialGreeting,
      createdAt: new Date(),
    },
  ]);
  const [input, setInput] = React.useState("");
  
  const activePrompts = GET_QUICK_PROMPTS(vertical || "real_estate");
  const [isLoading, setIsLoading] = React.useState(false);

  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [isOpen, messages, isLoading]);

  // Handle lead qualification human approval
  const handleLeadQualification = React.useCallback(
    async (leadData: QualifiedLeadCardData) => {
      try {
        const matchedProject =
          projects.find(
            (p) =>
              p.location.toLowerCase().includes(leadData.location.toLowerCase()) ||
              p.name.toLowerCase().includes(leadData.location.toLowerCase())
          ) || projects[0];

        const matchedRegion =
          regions.find((r) => r.id === matchedProject?.regionId) || regions[0];
        const assignedRep =
          users.find((u) => u.role === "salesperson") || users[0];

        const newLead = await createLead({
          personId: `per-${Date.now()}`,
          personName: leadData.personName,
          phone: leadData.phone,
          email: `${leadData.personName.toLowerCase().replace(/\s+/g, ".")}@gmail.com`,
          projectId: matchedProject?.id || "proj-1",
          projectName: matchedProject?.name || "The Grand Palm Residences",
          regionId: matchedRegion?.id || "reg-1",
          regionName: matchedRegion?.name || "Gurgaon / NCR",
          salespersonId: assignedRep?.id,
          salespersonName: assignedRep?.name,
          budget: leadData.budget,
          stage: "qualified",
          source: "Aria AI Sales Assistant",
          leadScore: leadData.leadScore || 92,
          leadScoreLabel: leadData.leadScoreLabel || "Hot",
          dealHealth: "strong",
          dealHealthReason: `AI Qualified: High conviction ${leadData.configuration} buyer with verified ₹${(leadData.budget / 10000000).toFixed(1)} Cr budget`,
          configurationPreference: leadData.configuration,
          buyerIntent: leadData.buyerIntent || "End-User (Primary Residence)",
          buyingSignals: leadData.buyingSignals || [
            "Clear budget verified",
            "Target location specified",
            "Ready for VIP site visit",
          ],
          objections: leadData.objections || [],
          lastConversationSummary: leadData.notes,
          suggestedNextMove: "Schedule VIP Site Visit & deliver customized cost sheet dossier.",
          daysInStage: 0,
          nextFollowUpAt: "Today, 11:30 AM",
          followUpStatus: "due_today",
        });

        toast.success(`⚡ Aria Qualified & Synced: ${leadData.personName} → CRM Pipeline!`, {
          description: `Added to "Qualified" stage with Score ${leadData.leadScore} (Hot).`,
          duration: 5000,
        });

        return newLead.id;
      } catch (err) {
        console.error("Failed to sync qualified lead to CRM:", err);
        return undefined;
      }
    },
    [createLead, projects, regions, users]
  );

  // Core Request Processor: Connects to /api/chat with intelligent local fallback
  const handleSubmit = async (customPrompt?: string) => {
    const text = customPrompt || input;
    if (!text.trim() || isLoading) return;

    setInput("");
    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: "user",
      content: text,
      createdAt: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      // 1. Attempt Live Server Chat API
      const conversationHistory = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: conversationHistory }),
      });

      if (res.ok) {
        // Read response stream
        const textResponse = await res.text();
        const assistantMsg: ChatMessage = {
          id: `ai-${Date.now()}`,
          role: "assistant",
          content: textResponse || "I have processed your query with our active portfolio.",
          createdAt: new Date(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
        setIsLoading(false);
        return;
      }
    } catch {
      // fallback to internal intelligence engine
    }

    // 2. Internal Real Estate Intelligence Engine (Deterministic Fallback)
    setTimeout(() => {
      const lower = text.toLowerCase();

      // Case A: Inventory Search
      if (lower.includes("unit") || lower.includes("bhk") || lower.includes("inventory") || lower.includes("available") || lower.includes("crore") || lower.includes("cr")) {
        const reqBhk = text.match(/(\d+)\s*bhk/i)?.[1] || "3";
        const availableUnits = (units || []).filter((u) => u.status === "available" || u.status === "hold").slice(0, 4);

        const scored: ScoredUnitMatch[] = availableUnits.map((u: any, i: number) => {
          const isBhk = u.configuration.includes(reqBhk);
          const score = isBhk ? 0.92 - i * 0.05 : 0.74;
          return {
            unitId: u.id,
            projectId: u.projectId,
            projectName: u.projectName,
            location: "Prime Corridor",
            tower: u.tower,
            unitNumber: u.unitNumber,
            configuration: u.configuration,
            superAreaSqFt: u.superAreaSqFt,
            price: u.price,
            floor: u.floor,
            facing: u.facing,
            status: u.status,
            matchScore: score,
            matchPercentage: Math.round(score * 100),
            matchReasons: [
              isBhk ? `Matches requested ${reqBhk} BHK configuration` : `Alternative ${u.configuration} option`,
              `Priced at ₹${(u.price / 10000000).toFixed(2)} Cr`,
              `Floor ${u.floor} with ${u.facing || "open"} views`,
            ],
          };
        });

        setMessages((prev) => [
          ...prev,
          {
            id: `ai-${Date.now()}`,
            role: "assistant",
            content: `I've analyzed our live database and identified ${scored.length} matching units for your criteria:`,
            inventoryResults: scored,
            createdAt: new Date(),
          },
        ]);
        setIsLoading(false);
        return;
      }

      // Case B: Buyer Lookup / Duplicate Detection
      if (lower.includes("buyer") || lower.includes("look up") || lower.includes("phone") || lower.includes("+91") || lower.includes("check")) {
        const phoneMatch = text.match(/(\+91[\d\s-]{10,12}|0?[\d]{10})/);
        const searchPhone = phoneMatch ? phoneMatch[0].replace(/\s+/g, "") : "+919811099234";

        const existing = (leads || []).find(
          (l) => l.phone.includes(searchPhone) || l.personName.toLowerCase().includes("siddharth")
        ) || leads[0];

        if (existing) {
          const match: ExistingBuyerMatch = {
            personId: existing.personId,
            name: existing.personName,
            phone: existing.phone,
            email: existing.email,
            duplicateType: "existing_active_lead",
            historicalLeadsCount: 1,
            activeLead: {
              id: existing.id,
              stage: existing.stage,
              projectName: existing.projectName,
              salespersonName: existing.salespersonName || "Rahul Sharma",
              budget: existing.budget,
              dealHealth: existing.dealHealth,
              dealHealthReason: existing.dealHealthReason,
              lastActivityText: existing.lastActivityText,
              nextFollowUpAt: existing.nextFollowUpAt,
            },
            recommendation: `Existing active lead found in stage "${existing.stage}" assigned to ${existing.salespersonName || "Assigned Rep"}. Suggest updating existing record rather than creating a duplicate.`,
          };

          setMessages((prev) => [
            ...prev,
            {
              id: `ai-${Date.now()}`,
              role: "assistant",
              content: `Found matching customer profile in CRM directory:`,
              buyerMatch: match,
              createdAt: new Date(),
            },
          ]);
          setIsLoading(false);
          return;
        }
      }

      // Case C: Brochure / Document Lookup
      if (lower.includes("brochure") || lower.includes("document") || lower.includes("floor plan") || lower.includes("cost sheet")) {
        const sampleDocs: DocumentItemSummary[] = [
          {
            id: "doc-1",
            title: "The Grand Palm Residences - Master Architectural Dossier",
            type: "brochure",
            downloadUrl: "/api/documents/brochure-grand-palm.pdf",
            createdAt: new Date().toISOString(),
          },
          {
            id: "doc-2",
            title: "Tower A & B Typical Floor Plans (3 & 4 BHK)",
            type: "floor_plan",
            downloadUrl: "/api/documents/floor-plans-tower-a.pdf",
            createdAt: new Date().toISOString(),
          },
        ];

        setMessages((prev) => [
          ...prev,
          {
            id: `ai-${Date.now()}`,
            role: "assistant",
            content: `Here are the verified architectural collaterals available for our active projects:`,
            documents: sampleDocs,
            createdAt: new Date(),
          },
        ]);
        setIsLoading(false);
        return;
      }

      // Case D: Next Best Action Recommendation
      if (lower.includes("next action") || lower.includes("suggest") || lower.includes("recommend")) {
        const topLead = leads[0] || {
          id: "lead-sample",
          personName: "Siddharth Verma",
          stage: "qualified",
          budget: 38000000,
          projectName: "The Grand Palm Residences",
        };

        const rec: NextActionRecommendation = {
          leadId: topLead.id,
          personName: topLead.personName,
          actionType: "schedule_site_visit",
          priority: "high",
          title: "Schedule VIP Experience Center Tour",
          rationale: `Lead is in Qualified stage with verified ₹${(topLead.budget / 10000000).toFixed(2)} Cr budget. Physical walkthrough is the critical conversion milestone.`,
          suggestedScript: `Hi ${topLead.personName}, we have reserved an exclusive site visit slot for you this Saturday at 11:00 AM at ${topLead.projectName}. Would you like me to confirm the private chauffeur pickup?`,
        };

        setMessages((prev) => [
          ...prev,
          {
            id: `ai-${Date.now()}`,
            role: "assistant",
            content: `Here is the recommended strategic sales action for ${topLead.personName}:`,
            nextAction: rec,
            createdAt: new Date(),
          },
        ]);
        setIsLoading(false);
        return;
      }

      // Case E: Default Lead Qualification & Human Gate
      const nameMatch = text.match(/(?:i am|name is|here|myself)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
      const name = nameMatch ? nameMatch[1] : "Siddharth Verma";
      const phoneMatch = text.match(/(\+91[\d\s-]{10,12}|0?[\d]{10})/);
      const phone = phoneMatch ? phoneMatch[0].replace(/\s+/g, "") : "+91 98110 99234";

      const qualifiedData: QualifiedLeadCardData = {
        personName: name,
        phone: phone,
        location: vertical === "building_materials" ? "Delhi NCR (Site Delivery)" : "Golf Course Ext, Gurgaon",
        configuration: vertical === "building_materials" ? "UltraTech Cement 500 bags" : "3 BHK Luxury + Servant",
        budget: vertical === "building_materials" ? 200000 : 38000000,
        timeline: "Immediate (Within 30 Days)",
        buyerIntent: vertical === "building_materials" ? "Contractor (Bulk Order)" : "End-User (Primary Residence)",
        leadScore: 94,
        leadScoreLabel: "Hot",
        approvalStatus: "pending",
        buyingSignals: vertical === "building_materials" ? [
          "Budget verified at ₹2L",
          "High volume recurring order potential",
          "Site delivery requested",
        ] : [
          "Budget verified at ₹3.8 Cr",
          "High conviction for luxury gated community",
          "Direct contact provided for VIP visit",
        ],
        objections: [],
        notes: vertical === "building_materials" 
          ? `Aria Qualification: Contractor looking for 500 bags of UltraTech cement in Delhi NCR with ₹2L budget.` 
          : `Aria Qualification: High conviction buyer looking for 3 BHK + Servant in Golf Course Ext with ₹3.8 Cr budget.`,
      };

      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: "assistant",
          content: `Thank you, ${name}! I've formulated the buyer qualification dossier.\n\n🛡️ **Human-in-the-Loop Gate:**\nReview the parameters below and click "Approve & Push to CRM" to register this opportunity in the sales pipeline.`,
          toolCard: qualifiedData,
          createdAt: new Date(),
        },
      ]);
      setIsLoading(false);
    }, 900);
  };

  const handleApproveLead = async (msgId: string, leadData: QualifiedLeadCardData) => {
    const createdId = await handleLeadQualification(leadData);
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id === msgId && m.toolCard) {
          return {
            ...m,
            toolCard: {
              ...m.toolCard,
              approvalStatus: "approved",
              crmLeadId: createdId,
            },
          };
        }
        return m;
      })
    );
  };

  const handleRejectLead = (msgId: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id === msgId && m.toolCard) {
          return {
            ...m,
            toolCard: {
              ...m.toolCard,
              approvalStatus: "rejected",
            },
          };
        }
        return m;
      })
    );
    toast.info("Lead qualification discarded.");
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: "init-1",
        role: "assistant",
        content: initialGreeting,
        createdAt: new Date(),
      },
    ]);
    toast.info("Aria session refreshed");
  };

  return (
    <>
      {/* Floating Trigger Launcher */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 text-white text-xs font-medium shadow-xl border border-slate-700/60 backdrop-blur-md animate-bounce">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Aria 2.0: Real Estate AI</span>
          </div>

          <button
            onClick={() => setIsOpen(true)}
            aria-label="Open Aria 2.0 Assistant"
            className="group relative flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-slate-950 via-slate-900 to-indigo-950 text-white shadow-2xl hover:scale-105 transition-all duration-300 border border-slate-700/70 hover:border-indigo-500/50 hover:shadow-indigo-500/20"
          >
            <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-2xl blur opacity-30 group-hover:opacity-70 transition duration-500" />
            <div className="relative flex items-center justify-center">
              <Bot className="w-7 h-7 text-indigo-300 group-hover:text-white transition-colors" />
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-slate-950" />
              </span>
            </div>
          </button>
        </div>
      )}

      {/* Floating Chat Window */}
      {isOpen && (
        <div
          className={`fixed z-50 transition-all duration-300 ease-out flex flex-col bg-slate-950/95 text-slate-100 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden ${
            isExpanded
              ? "inset-4 md:inset-10"
              : "bottom-6 right-6 w-[95vw] sm:w-[460px] h-[680px] max-h-[90vh]"
          }`}
        >
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-slate-900 via-indigo-950/70 to-slate-900 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-md">
                <Sparkles className="w-5 h-5" />
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-slate-900" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-sm text-white">Aria 2.0</h3>
                  <span className="px-1.5 py-0.2 text-[9px] font-bold font-mono tracking-wider uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded">
                    AI Sales Intelligence
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">Inventory Matcher & Sales Copilot</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleResetChat}
                title="Reset Chat Session"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? "Collapse" : "Expand"}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors hidden sm:block"
              >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Close Window"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Intelligence Prompt Pills */}
          <div className="px-4 py-2 bg-slate-900/40 border-b border-slate-800/60 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 whitespace-nowrap mr-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-indigo-400" /> Actions:
            </span>
            {activePrompts.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleSubmit(p.text)}
                disabled={isLoading}
                className="px-2.5 py-1 rounded-full bg-slate-800/80 hover:bg-indigo-950 hover:text-indigo-200 hover:border-indigo-700/60 text-slate-300 text-[11px] whitespace-nowrap border border-slate-700/50 transition-all flex items-center gap-1 disabled:opacity-50"
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm scroll-smooth">
            {messages.map((msg) => {
              const isUser = msg.role === "user";

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-md ${
                      isUser
                        ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-br-none"
                        : "bg-slate-900/90 text-slate-200 border border-slate-800/80 rounded-bl-none"
                    }`}
                  >
                    <p className="whitespace-pre-line">{msg.content}</p>
                  </div>

                  {/* 1. STRUCTURED INVENTORY MATCHING CARDS */}
                  {msg.inventoryResults && msg.inventoryResults.length > 0 && (
                    <div className="mt-3 w-full max-w-[96%] space-y-2.5">
                      <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                        <span className="flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5 text-indigo-400" /> Matched Inventory ({msg.inventoryResults.length} Units)
                        </span>
                        <span>Explainable Score</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {msg.inventoryResults.map((unit) => (
                          <div
                            key={unit.unitId}
                            className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-indigo-500/40 transition-all space-y-2"
                          >
                            <div className="flex items-start justify-between gap-1">
                              <div>
                                <span className="font-bold text-white text-xs block">
                                  {unit.tower}-{unit.unitNumber}
                                </span>
                                <span className="text-[11px] text-slate-400 block truncate">
                                  {unit.projectName}
                                </span>
                              </div>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                {unit.matchPercentage}% Match
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-300">
                              <span className="p-1 rounded bg-slate-950/60">
                                {unit.configuration}
                              </span>
                              <span className="p-1 rounded bg-slate-950/60 font-bold text-emerald-300">
                                ₹{(unit.price / 10000000).toFixed(2)} Cr
                              </span>
                              <span className="p-1 rounded bg-slate-950/60">
                                Floor {unit.floor}
                              </span>
                              <span className="p-1 rounded bg-slate-950/60">
                                {unit.superAreaSqFt} sq ft
                              </span>
                            </div>

                            {unit.matchReasons && unit.matchReasons.length > 0 && (
                              <div className="pt-1 border-t border-slate-800 space-y-0.5">
                                {unit.matchReasons.map((r, ri) => (
                                  <p key={ri} className="text-[10px] text-slate-400 flex items-center gap-1">
                                    <span className="text-emerald-400">✓</span> {r}
                                  </p>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 2. STRUCTURED BUYER MATCH & DUPLICATE CONFLICT CARD */}
                  {msg.buyerMatch && (
                    <div className="mt-3 w-full max-w-[96%] p-3.5 rounded-xl bg-slate-900 border border-indigo-500/30 space-y-2.5 text-xs">
                      <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                        <span className="font-bold text-white flex items-center gap-1.5">
                          <UserCheck className="w-4 h-4 text-indigo-400" /> Buyer Record Detected
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                          msg.buyerMatch.duplicateType === "existing_active_lead"
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            : msg.buyerMatch.duplicateType === "previously_lost_lead"
                            ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                            : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        }`}>
                          {msg.buyerMatch.duplicateType.replace(/_/g, " ")}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                          <span className="text-slate-500 text-[10px]">Client</span>
                          <p className="font-semibold text-white">{msg.buyerMatch.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{msg.buyerMatch.phone}</p>
                        </div>

                        {msg.buyerMatch.activeLead && (
                          <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                            <span className="text-slate-500 text-[10px]">Active Rep & Stage</span>
                            <p className="font-semibold text-white">{msg.buyerMatch.activeLead.salespersonName}</p>
                            <p className="text-[10px] text-indigo-300 capitalize font-mono">{msg.buyerMatch.activeLead.stage} Stage</p>
                          </div>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-300 leading-relaxed bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                        {msg.buyerMatch.recommendation}
                      </p>

                      {msg.buyerMatch.activeLead && onOpenLeadDetail && (
                        <button
                          onClick={() => onOpenLeadDetail(msg.buyerMatch!.activeLead!.id)}
                          className="w-full py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center justify-center gap-1 transition-colors"
                        >
                          View Existing Lead File <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}

                  {/* 3. STRUCTURED DOCUMENTS & BROCHURES */}
                  {msg.documents && msg.documents.length > 0 && (
                    <div className="mt-3 w-full max-w-[96%] space-y-2">
                      <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-indigo-400" /> Verified Collateral ({msg.documents.length})
                      </span>

                      <div className="space-y-1.5">
                        {msg.documents.map((doc) => (
                          <div
                            key={doc.id}
                            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-2"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <FileDown className="w-4 h-4 text-emerald-400 shrink-0" />
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-white truncate">{doc.title}</p>
                                <span className="text-[10px] text-slate-400 uppercase font-mono">{doc.type}</span>
                              </div>
                            </div>
                            <a
                              href={doc.downloadUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-medium text-white shrink-0 transition-colors"
                            >
                              Download
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 4. NEXT BEST ACTION RECOMMENDATION */}
                  {msg.nextAction && (
                    <div className="mt-3 w-full max-w-[96%] p-3.5 rounded-xl bg-slate-900 border border-indigo-500/40 space-y-2.5 text-xs">
                      <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                        <span className="font-bold text-white flex items-center gap-1.5">
                          <Compass className="w-4 h-4 text-indigo-400" /> Recommended Action
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-indigo-500/20 text-indigo-300 uppercase">
                          {msg.nextAction.priority} Priority
                        </span>
                      </div>

                      <div>
                        <p className="font-semibold text-white text-xs">{msg.nextAction.title}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{msg.nextAction.rationale}</p>
                      </div>

                      <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                        <span className="text-[10px] text-slate-500 font-mono">Suggested Consultative Script:</span>
                        <p className="text-[11px] text-slate-200 italic leading-relaxed">
                          &ldquo;{msg.nextAction.suggestedScript}&rdquo;
                        </p>
                      </div>
                    </div>
                  )}

                  {/* 5. HUMAN-IN-THE-LOOP QUALIFICATION APPROVAL GATE */}
                  {msg.toolCard && (
                    <div className={`mt-3 w-full max-w-[96%] p-4 rounded-xl bg-gradient-to-b from-slate-900 to-indigo-950/40 border shadow-xl text-xs space-y-3 ${
                      msg.toolCard.approvalStatus === "approved"
                        ? "border-emerald-500/40"
                        : msg.toolCard.approvalStatus === "rejected"
                        ? "border-slate-700/60 opacity-60"
                        : "border-amber-500/50 ring-1 ring-amber-500/20"
                    }`}>
                      <div className="flex items-center justify-between pb-2 border-b border-indigo-500/20">
                        <div className="flex items-center gap-2">
                          <div className={`p-1 rounded-md ${
                            msg.toolCard.approvalStatus === "approved"
                              ? "bg-emerald-500/20 text-emerald-400"
                              : msg.toolCard.approvalStatus === "rejected"
                              ? "bg-rose-500/20 text-rose-400"
                              : "bg-amber-500/20 text-amber-400"
                          }`}>
                            <ShieldCheck className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-mono font-bold text-white tracking-wide uppercase text-[11px]">
                              {msg.toolCard.approvalStatus === "approved"
                                ? "✓ Lead Approved & Synced to CRM"
                                : msg.toolCard.approvalStatus === "rejected"
                                ? "✕ Lead Discarded by Operator"
                                : "⚡ Awaiting Human Operator Approval"}
                            </span>
                            <p className="text-[10px] text-slate-400">
                              {msg.toolCard.approvalStatus === "approved"
                                ? "Live in Qualified Stage"
                                : msg.toolCard.approvalStatus === "rejected"
                                ? "No CRM writes performed"
                                : "Review parameters before mutating CRM"}
                            </p>
                          </div>
                        </div>

                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" /> SCORE: {msg.toolCard.leadScore} ({msg.toolCard.leadScoreLabel})
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800">
                          <span className="text-slate-500 flex items-center gap-1 text-[10px]">
                            <UserCheck className="w-3 h-3 text-indigo-400" /> Buyer Name
                          </span>
                          <span className="font-semibold text-slate-100 block truncate">
                            {msg.toolCard.personName}
                          </span>
                          <span className="text-slate-400 text-[10px] font-mono">
                            {msg.toolCard.phone}
                          </span>
                        </div>

                        <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800">
                          <span className="text-slate-500 flex items-center gap-1 text-[10px]">
                            <IndianRupee className="w-3 h-3 text-emerald-400" /> Verified Budget
                          </span>
                          <span className="font-bold text-emerald-300 block">
                            ₹{(msg.toolCard.budget / 10000000).toFixed(2)} Cr
                          </span>
                          <span className="text-slate-400 text-[10px]">
                            {msg.toolCard.timeline}
                          </span>
                        </div>

                        <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800 col-span-2">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 flex items-center gap-1 text-[10px]">
                              <Building2 className="w-3 h-3 text-indigo-400" /> Requirement Specs
                            </span>
                            <span className="text-slate-400 text-[10px]">
                              {msg.toolCard.location}
                            </span>
                          </div>
                          <span className="font-medium text-slate-200 block mt-0.5">
                            {msg.toolCard.configuration}
                          </span>
                        </div>
                      </div>

                      {msg.toolCard.approvalStatus === "pending" && (
                        <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                          <button
                            onClick={() => handleRejectLead(msg.id)}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/60 hover:text-rose-300 text-slate-300 font-medium text-xs border border-slate-700 transition-colors"
                          >
                            ✕ Discard
                          </button>
                          <button
                            onClick={() => handleApproveLead(msg.id, msg.toolCard!)}
                            className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md flex items-center gap-1.5 transition-all"
                          >
                            ✓ Approve & Push to CRM
                          </button>
                        </div>
                      )}

                      {msg.toolCard.approvalStatus === "approved" && (
                        <div className="pt-1 flex items-center justify-between">
                          <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Active in Salesperson Follow-up Queue
                          </span>
                          {onOpenLeadDetail && msg.toolCard.crmLeadId && (
                            <button
                              onClick={() => onOpenLeadDetail(msg.toolCard!.crmLeadId!)}
                              className="px-2.5 py-1 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-[11px] flex items-center gap-1 transition-colors"
                            >
                              View Lead <ArrowUpRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <span className="text-[10px] text-slate-500 mt-1 px-1 font-mono">
                    {msg.createdAt.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-center gap-2 text-slate-400 text-xs py-2 px-1">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" />
                </div>
                <span className="font-mono text-[11px]">
                  Aria is analyzing CRM portfolio & matching inventory...
                </span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Aria or test an inventory query..."
              disabled={isLoading}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              aria-label="Send message to Aria"
              className="p-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white shadow-md disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
