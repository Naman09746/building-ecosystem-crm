import { EcosystemVertical, ComplexityMode } from "../types/ecosystem";

export interface PipelineStagePreset {
  id: string;
  name: string;
  desc: string;
  color?: string;
}

export const VERTICAL_PIPELINE_PRESETS: Record<
  EcosystemVertical,
  Record<ComplexityMode, PipelineStagePreset[]>
> = {
  real_estate: {
    simple: [
      { id: "new", name: "New Buyer Inquiry", desc: "Fresh buyer leads" },
      { id: "visit_scheduled", name: "Site Visit Scheduled", desc: "Visit booked with gate pass" },
      { id: "negotiation", name: "Token / Offer", desc: "Price negotiation & token" },
      { id: "won", name: "Closed / Booked", desc: "Booking won & registered" },
      { id: "lost", name: "Lost", desc: "Budget or location mismatch" },
    ],
    deep: [
      { id: "new", name: "New Inbound", desc: "Fresh verified buyer inquiries" },
      { id: "contacted", name: "Contacted (10s SLA)", desc: "First outreach completed" },
      { id: "qualified", name: "Qualified & Profiled", desc: "Budget, configuration & facing verified" },
      { id: "site_visit", name: "Site Visit Scheduled", desc: "Gate 2 PIN & briefing dispatched" },
      { id: "negotiation", name: "Unit Negotiation Room", desc: "Multi-round buyer vs seller ledger" },
      { id: "won", name: "Booking Won", desc: "Token advance received, deal closed" },
      { id: "lost", name: "Archived / Lost", desc: "Dormant with resurrection eligibility" },
    ],
  },

  building_materials: {
    simple: [
      { id: "inquiry", name: "Material Inquiry", desc: "Contractor or builder requirement" },
      { id: "quoted", name: "WhatsApp Quote Sent", desc: "Wholesale tiered pricing shared" },
      { id: "dispatched", name: "Truck Dispatched", desc: "In transit with delivery challan" },
      { id: "paid", name: "Delivered & Paid", desc: "Received at site & payment cleared" },
      { id: "lost", name: "Cancelled", desc: "Price or stock mismatch" },
    ],
    deep: [
      { id: "inquiry", name: "Inbound RFQ", desc: "Contractor inquiry / bill of materials" },
      { id: "sample", name: "Sample Approval", desc: "Stone/tile sample delivered for sign-off" },
      { id: "quoted", name: "Wholesale Quotation", desc: "Tax invoice estimate with credit terms" },
      { id: "confirmed", name: "Purchase Order Received", desc: "Advance or credit line approved" },
      { id: "dispatching", name: "Loading & E-way Bill", desc: "Warehouse staging & transport dispatch" },
      { id: "delivered", name: "Site Delivery Verified", desc: "Receiver signature on delivery challan" },
      { id: "settled", name: "Ledger Settled", desc: "Payment received in full" },
    ],
  },

  interior_furniture: {
    simple: [
      { id: "lead", name: "New Client Lead", desc: "Apartment or villa fit-out inquiry" },
      { id: "estimate", name: "Design Concept & BOQ", desc: "Space layout and initial estimate" },
      { id: "execution", name: "Execution / Carpentry", desc: "Work in progress at client site" },
      { id: "handed_over", name: "Handover & Settled", desc: "Final styling and client sign-off" },
      { id: "lost", name: "Dropped", desc: "Client postponed or hired alternative" },
    ],
    deep: [
      { id: "inquiry", name: "Initial Consultation", desc: "Lifestyle brief & floor plan collection" },
      { id: "concept", name: "Concept & Moodboard", desc: "3D visual renders & theme proposal" },
      { id: "boq", name: "Detailed BOQ & Quotation", desc: "Itemized carpentry, finishes & electricals" },
      { id: "signoff", name: "Client Agreement & Advance", desc: "Formal sign-off & procurement kickoff" },
      { id: "factory_prod", name: "Modular Factory Production", desc: "Carcass & shutter manufacturing" },
      { id: "site_install", name: "Site Installation & Staging", desc: "On-site assembly, painting & styling" },
      { id: "handover", name: "Snag-list Clear & Handover", desc: "Warranty documentation & final payment" },
    ],
  },

  architecture_design: {
    simple: [
      { id: "brief", name: "Design Brief", desc: "New architectural mandate inquiry" },
      { id: "proposal", name: "Fee Proposal Sent", desc: "Scope of work & milestones submitted" },
      { id: "drafting", name: "Drawings in Progress", desc: "Schematics & structural drafting" },
      { id: "delivered", name: "GFC Drawings Delivered", desc: "Good For Construction set released" },
      { id: "lost", name: "Lost", desc: "Project shelved or competitor chosen" },
    ],
    deep: [
      { id: "inquiry", name: "Client Brief & Site Visit", desc: "Contour survey & requirement intake" },
      { id: "concept_schematic", name: "Schematic Concept Design", desc: "Zoning, massing & floor plan options" },
      { id: "municipal_approval", name: "Sanction / Authority Drawing", desc: "Municipal & bylaws compliance submission" },
      { id: "working_gfc", name: "GFC & Structural Details", desc: "Detailed architectural & structural package" },
      { id: "tender_spec", name: "Contractor Tender Package", desc: "Material specs & BOQ for civil bidding" },
      { id: "site_supervision", name: "Construction Supervision", desc: "Site inspections & quality sign-offs" },
      { id: "completed", name: "Completion & Occupancy", desc: "As-built drawings & occupancy certificate" },
    ],
  },

  contractor_builder: {
    simple: [
      { id: "lead", name: "Work Inquiry", desc: "Contracting job or tender opportunity" },
      { id: "quoted", name: "Rate Quote Submitted", desc: "Per-sqft or itemized quotation" },
      { id: "running", name: "Work Underway", desc: "Active site execution" },
      { id: "billed", name: "Work Completed & Billed", desc: "Final measurement certified and paid" },
      { id: "lost", name: "Bid Rejected", desc: "Quote not selected" },
    ],
    deep: [
      { id: "tender", name: "Tender / RFQ Received", desc: "Drawings & site scope review" },
      { id: "estimate", name: "Cost Estimation & Bid", desc: "Labor, equipment & material calculation" },
      { id: "awarded", name: "Contract Awarded", desc: "Work order received & mobilization advance" },
      { id: "substructure", name: "Substructure / Foundation", desc: "Excavation, footings & plinth beam" },
      { id: "superstructure", name: "Superstructure / RCC Slabs", desc: "Columns, slab casting & masonry" },
      { id: "finishing", name: "Finishing & MEP Fixes", desc: "Plaster, plumbing, wiring & flooring" },
      { id: "retention_clear", name: "Handover & Retention Clear", desc: "Defect liability period & retention release" },
    ],
  },
};

export function getPipelineStages(
  vertical: EcosystemVertical = "real_estate",
  mode: ComplexityMode = "deep"
): PipelineStagePreset[] {
  const vert = VERTICAL_PIPELINE_PRESETS[vertical] || VERTICAL_PIPELINE_PRESETS.real_estate;
  return vert[mode] || vert.deep;
}
