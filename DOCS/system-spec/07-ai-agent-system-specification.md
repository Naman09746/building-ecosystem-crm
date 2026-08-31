# 07. AI Agent & Automation System Specification — Apex Realty CallCRM

**Document Version:** 1.0.0 (Production Release)  
**AI Framework:** Vercel AI SDK 5 (`streamText`, `tool`, `inputSchema`)  
**Underlying Foundation Model:** Google Gemini 2.5 Flash (`gemini-2.5-flash`)  
**Safety Protocol:** Human-in-the-Loop Confirmation Gate

---

## 1. Agent Architecture & Role Definitions

Apex Realty CallCRM utilizes a two-tier agentic architecture:
1. **Aria (Inbound Qualification & Intake Agent):** Front-facing conversational intelligence for high-ticket real estate buyer intake.
2. **Resurrection Engine (Autonomous Lost-Lead Cross-Matcher):** Background intelligence scanning dormant buyer opportunities and matching them against available high-ticket inventory.

```
                     ┌───────────────────────────────────────────────┐
                     │          INBOUND PROSPECT / BUYER             │
                     └──────────────────────┬────────────────────────┘
                                            │
                                            ▼
                     ┌───────────────────────────────────────────────┐
                     │       ARIA INTAKE AGENT (Gemini 2.5 Flash)    │
                     │  - Multi-Turn Consultative NLP                │
                     │  - Parameter Extraction: Budget, Loc, Config  │
                     │  - Structured Lead Scoring & Intent Label     │
                     └──────────────────────┬────────────────────────┘
                                            │ Tool Call (qualifyAndCreateLead)
                                            ▼
                     ┌───────────────────────────────────────────────┐
                     │          HUMAN APPROVAL GATE (UI)             │
                     │   [✓ Approve & Push to CRM]   [✕ Discard]     │
                     └──────────────────────┬────────────────────────┘
                                            │ Approved
                                            ▼
                     ┌───────────────────────────────────────────────┐
                     │            CRM PIPELINE INGESTION             │
                     │  - Auto-Linked to Master Person (Phone Dedup) │
                     │  - Stage: Qualified (Score: 92+ Hot)          │
                     │  - Prioritized SLA Follow-up Task Scheduled   │
                     └───────────────────────────────────────────────┘
```

---

## 2. Aria Agent System Prompt & Directives

```markdown
You are Aria, an elite Senior AI Property Advisor and Autonomous Sales Agent for luxury Indian real estate (covering Delhi NCR, Mumbai, Bengaluru, Hyderabad, and Pune).

Your primary objective is to warmly greet prospective homebuyers/investors, answer their queries with domain authority, and autonomously QUALIFY the lead through natural consultative dialogue.

To fully qualify a lead, you must naturally collect or clarify:
1. Full Name of the buyer/client
2. Phone or WhatsApp number (+91 format preferred)
3. Target City & Micro-market (e.g., Golf Course Extension Gurgaon, Bandra West Mumbai, Whitefield Bengaluru)
4. Preferred Configuration (e.g., 3 BHK + Servant, 4 BHK Duplex, Luxury Villa, Sky Penthouse)
5. Investment / Budget Range (e.g., ₹2.5 Cr - ₹4.5 Cr, ₹8 Cr+, etc.)
6. Purchase Timeline & Intent (e.g., Immediate / 30-60 days; End-user residence vs Rental yield investment)

GUIDELINES:
- Be warm, sophisticated, concise, and highly professional.
- Speak in polished English, with natural Indian real estate fluency (understanding Cr, Lakhs, Carpet area, RERA, Vastu, Possession timelines).
- Do not overwhelm the user with a questionnaire all at once. Ask 1-2 engaging questions per turn.
- If the user provides multiple details in one message, acknowledge them smartly and only ask for what is missing.
- AS SOON as you have collected the core details (Name, Phone, Location, Configuration, Budget), you MUST immediately execute the `qualifyAndCreateLead` tool.
- After calling the tool, summarize what you've logged and reassure the buyer that a senior property director from the desk is preparing an exclusive floor-plan dossier and VIP site visit slot for them.
```

---

## 3. Server Tools Suite & Zod Schemas (`aria-tools.ts`)

Aria 2.0 exposes a comprehensive suite of strictly tenant-scoped server tools:

| Tool Name | Scope & Purpose | Key Input Parameters |
| :--- | :--- | :--- |
| `generatePropertyBriefing` | Property 360° sales & access dossier briefing | `unitId`, `unitNumber`, `tower`, `projectId` |
| `matchBuyersForUnit` | Active qualified buyer lead matching for a specific unit | `unitId`, `maxMatches` |
| `searchAvailableInventory` | Explainable multi-criteria inventory search | `bhk`, `minimumBudget`, `maximumBudget`, `preferredFloor`, `facing`, `region` |
| `lookupExistingBuyer` | Master contact search & duplicate check (+91 E.164) | `phone`, `email`, `name` |
| `calculateCostSheet` | On-demand Indian real estate cost sheet calculation | `baseRate`, `superArea`, `floorNumber`, `plc`, `parkingCost`, `gstRate` |
| `scheduleSiteVisit` | Generate digital site visit pass proposal | `leadId`, `unitId`, `scheduledDate`, `vehicleNumber` |
| `lookupDocuments` | Verified architectural brochures & floor plans | `projectId`, `leadId`, `documentType`, `search` |
| `getCustomerDossier` | Complete buyer journey & activity ledger briefing | `leadId`, `phone` |
| `recommendNextAction` | Next sales action recommendation with consultative scripts | `leadId` |
| `qualifyAndCreateLead` | Human-gated lead qualification card | `personName`, `phone`, `location`, `configuration`, `budget`, `leadScore` |

### `qualifyAndCreateLead` Tool Schema
```typescript
z.object({
  personName: z.string().describe("Full name of the prospect/buyer"),
  phone: z.string().describe("Contact phone or WhatsApp number"),
  location: z.string().describe("Preferred city/micro-market"),
  configuration: z.string().describe("Unit configuration (e.g., 3 BHK + Servant, 4 BHK Villa)"),
  budget: z.number().describe("Budget in INR (e.g., 38000000 for 3.8 Cr)"),
  timeline: z.string().describe("Purchase timeframe (e.g., Ready to move / 30-60 days)"),
  buyerIntent: z.string().describe("End-User (Primary Residence) or High-yield Investor"),
  leadScore: z.number().min(0).max(100).describe("Readiness score from 0 to 100"),
  leadScoreLabel: z.enum(["Hot", "Warm", "Cold"]).describe("Score badge"),
  buyingSignals: z.array(z.string()).describe("Key buying signals observed"),
  objections: z.array(z.string()).describe("Any concerns noted"),
  notes: z.string().describe("Comprehensive executive summary of requirements"),
})
```

---

## 4. Grounded Triad Architecture & Safety Contract

To ensure enterprise credibility and prevent hallucinated state mutations, every AI-assisted surface strictly separates information into three distinct tiers:

```
+------------------------------------------------------------------------------------------------------+
| [ 🛡️ VERIFIED FACT ]        Source: Registry Deed / Signed Lease / Property Knowledge Base           |
| DLF The Camellias · Unit A-1402 · Carpet Area: 3,450 sq ft · Owner: Rajesh Sharma (Since Mar 2022)   |
+------------------------------------------------------------------------------------------------------+
| [ ⚡ AI INFERENCE ]          Source: Synthesized Pattern / 3 Recorded Signals                        |
| "Available records indicate tenancy concludes in 48 days with no renewal agreement registered."     |
+------------------------------------------------------------------------------------------------------+
| [ 🎯 RECOMMENDED ACTION ]    Source: Sales Heuristic / SLA Engine                                    |
| "Call Rajesh Sharma (Recommended Rep: Amit Sharma · 4 prior touchpoints) to verify resale intent."   |
+------------------------------------------------------------------------------------------------------+
```

### Safety Rules:
1. **Zero Autonomous Writes**: AI tools are strictly read-only and emit proposal cards.
2. **Explicit Human Confirmation**: Action proposals render an interactive review card requiring explicit human operator confirmation before committing database mutations.
3. **Structured Logging**: All executions are recorded in `public.ai_agent_executions` capturing `session_id`, `agent_name`, `tool_invoked`, `latency_ms`, and status.

---

## 5. Voice Note Dictation & Transcription Structurer

- **Audio Capture**: Uses standard browser Web Audio API with visual waveform meter.
- **Speech-to-Text**: Employs Web Speech API for low-latency client-side transcription in English and Hinglish.
- **Structuring Engine**: Converts unformatted dictation into structured activity notes, extracts buying signals and customer objections, and recommends follow-up timeline.
- **Human-in-the-Loop Gate**: Rep reviews and edits the transcribed text before clicking `✓ Save Activity`.

---

## 6. Lost-Lead Resurrection Engine

- **Trigger:** Automated background scan or manual invocation via `AiResurrectionModal`.
- **Query Strategy:** Queries leads in `stage = 'lost'` OR `days_in_stage >= 14` with `stage != 'won'`.
- **100-Point Scoring Algorithm:** Evaluates project match (40 pts), budget fit (30 pts), configuration fit (20 pts), floor category (5 pts), and facing preference (5 pts) against active available inventory.
- **Reactivation RPC:** `public.execute_lead_resurrection` atomically updates lead status to `contacted`, creates a high-priority follow-up task, logs an audit trail, and emits an in-app notification to the assigned salesperson.
