import { EcosystemVertical, VerticalProfile } from "../types/ecosystem";

export const ECOSYSTEM_VERTICALS: Record<EcosystemVertical, VerticalProfile> = {
  real_estate: {
    id: "real_estate",
    name: "Real Estate & Housing",
    tagline: "High-Ticket Property Sales, Inventory & Mandates",
    badge: "Developers & Brokers",
    color: "amber",
    iconName: "Building2",
    description: "Built for luxury developers, mandate desks, and channel partners managing societies, towers, units, gate passes, and statutory brokerage.",
    terms: {
      inventoryItem: "Flat / Unit",
      inventoryPlural: "Projects & Units",
      clientType: "Buyer / Investor",
      dealLabel: "Unit Booking",
      leadLabel: "Buyer Inquiry",
      activityLabel: "Site Visit",
    },
    primaryNav: [
      { id: "overview", label: "Executive Overview", href: "/", iconName: "LayoutDashboard" },
      { id: "leads", label: "Buyer Leads", href: "/leads", iconName: "Users" },
      { id: "pipeline", label: "Deal Pipeline", href: "/pipeline", iconName: "Kanban" },
      { id: "tasks", label: "Follow-up Queue", href: "/tasks", iconName: "ListTodo" },
    ],
    inventoryNav: {
      id: "projects",
      label: "Projects & Units",
      href: "/projects",
      iconName: "Building2",
    },
    quickActions: [
      { id: "schedule_visit", label: "Schedule Site Visit", description: "Generate digital Gate 2 PIN & briefing", actionType: "visit" },
      { id: "cost_sheet", label: "Generate Cost Sheet", description: "All-inclusive buyer breakdown with taxes", actionType: "cost_sheet" },
      { id: "bidding_room", label: "Open Negotiation Room", description: "Multi-round buyer vs seller ledger", actionType: "negotiation" },
    ],
  },

  building_materials: {
    id: "building_materials",
    name: "Building Materials & Supplies",
    tagline: "Bricks, Cement, Marble, Tiles, Sanitaryware & Steel",
    badge: "Suppliers & Distributors",
    color: "emerald",
    iconName: "Boxes",
    description: "Built for brick kilns, cement dealers, marble yards, and tile/sanitaryware suppliers tracking wholesale price tiers, MOQ, dispatch challans, and contractor credit.",
    terms: {
      inventoryItem: "Material SKU",
      inventoryPlural: "Material Catalog",
      clientType: "Contractor / Builder",
      dealLabel: "Supply Order",
      leadLabel: "Material Inquiry",
      activityLabel: "Sample Dispatch",
    },
    primaryNav: [
      { id: "overview", label: "Dispatch Overview", href: "/", iconName: "LayoutDashboard" },
      { id: "leads", label: "Wholesale Inquiries", href: "/leads", iconName: "Users" },
      { id: "footfall", label: "Walk-in Log", href: "/footfall", iconName: "Footprints" },
      { id: "scouting", label: "Site Scouting", href: "/scouting", iconName: "MapPin" },
      { id: "pipeline", label: "Supply Orders", href: "/pipeline", iconName: "Kanban" },
      { id: "khata", label: "Khata Ledger", href: "/khata", iconName: "IndianRupee" },
      { id: "rates", label: "Daily Rates", href: "/rates", iconName: "TrendingUp" },
      { id: "tasks", label: "Dispatch Queue", href: "/tasks", iconName: "ListTodo" },
    ],
    inventoryNav: {
      id: "projects",
      label: "Material Catalog",
      href: "/projects",
      iconName: "Boxes",
    },
    quickActions: [
      { id: "log_walkin", label: "Log Walk-in Customer", description: "Quick-capture footfall with mandatory conclusion note", actionType: "footfall" },
      { id: "scout_site", label: "Scout Construction Site", description: "Photo + GPS + immediate material needs", actionType: "scout" },
      { id: "record_payment", label: "Record Khata Payment", description: "Log contractor cash/UPI/cheque receipt", actionType: "payment" },
      { id: "send_quote", label: "Send WhatsApp Price List", description: "Tiered wholesale pricing based on volume", actionType: "quote" },
      { id: "create_challan", label: "Generate Delivery Challan", description: "Log truck dispatch, driver and e-way bill", actionType: "dispatch" },
    ],
  },

  interior_furniture: {
    id: "interior_furniture",
    name: "Interior & Modular Furniture",
    tagline: "Turnkey Fit-Outs, Modular Kitchens & Space Staging",
    badge: "Interior Studios",
    color: "violet",
    iconName: "Palette",
    description: "Engineered for interior designers and modular studios managing room-by-room design staging, moodboards, Bill of Quantities (BOQ), and vendor execution.",
    terms: {
      inventoryItem: "BOQ / Room Spec",
      inventoryPlural: "Room Staging & BOQs",
      clientType: "Homeowner / Client",
      dealLabel: "Fit-out Project",
      leadLabel: "Design Consultation",
      activityLabel: "Client Walkthrough",
    },
    primaryNav: [
      { id: "overview", label: "Studio Overview", href: "/", iconName: "LayoutDashboard" },
      { id: "leads", label: "Design Leads", href: "/leads", iconName: "Users" },
      { id: "pipeline", label: "Project Pipeline", href: "/pipeline", iconName: "Kanban" },
      { id: "tasks", label: "Vendor Tasks", href: "/tasks", iconName: "ListTodo" },
    ],
    inventoryNav: {
      id: "projects",
      label: "Room Staging & BOQs",
      href: "/projects",
      iconName: "Palette",
    },
    quickActions: [
      { id: "build_boq", label: "Draft Room BOQ", description: "Estimate woodwork, finishes, and hardware", actionType: "boq" },
      { id: "moodboard_share", label: "Share Design Moodboard", description: "WhatsApp approval link for client finishes", actionType: "moodboard" },
      { id: "artisan_assignment", label: "Assign Carpenter / Vendor", description: "Set punch-list milestone deadlines", actionType: "vendor" },
    ],
  },

  architecture_design: {
    id: "architecture_design",
    name: "Architecture & Engineering",
    tagline: "Design Blueprints, Specifications & Approvals",
    badge: "Architects & Consultants",
    color: "cyan",
    iconName: "Compass",
    description: "Built for architects, structural consultants, and MEP engineers managing drawings, client design reviews, material specifications, and site inspections.",
    terms: {
      inventoryItem: "Drawing / Spec",
      inventoryPlural: "Project Drawings & Specs",
      clientType: "Client / Developer",
      dealLabel: "Design Mandate",
      leadLabel: "Design Brief",
      activityLabel: "Site Inspection",
    },
    primaryNav: [
      { id: "overview", label: "Practice Overview", href: "/", iconName: "LayoutDashboard" },
      { id: "leads", label: "Project Briefs", href: "/leads", iconName: "Users" },
      { id: "pipeline", label: "Design Mandates", href: "/pipeline", iconName: "Kanban" },
      { id: "tasks", label: "Revision Deadlines", href: "/tasks", iconName: "ListTodo" },
    ],
    inventoryNav: {
      id: "projects",
      label: "Drawings & Specs",
      href: "/projects",
      iconName: "Compass",
    },
    quickActions: [
      { id: "log_gfc", label: "Release GFC Drawing", description: "Good For Construction revision log", actionType: "drawing" },
      { id: "site_inspection", label: "File Site Inspection Memo", description: "Check rebar, casting & MEP adherence", actionType: "inspection" },
      { id: "client_signoff", label: "Request Client Sign-off", description: "Formal design approval record", actionType: "approval" },
    ],
  },

  contractor_builder: {
    id: "contractor_builder",
    name: "Contracting & Civil Execution",
    tagline: "Site Progress, Labor Attendance & Materials",
    badge: "Civil Contractors",
    color: "orange",
    iconName: "HardHat",
    description: "Built for general contractors and civil subcontractors managing site milestones, daily site reports (DSR), crew attendance, and material consumption.",
    terms: {
      inventoryItem: "Site Milestone",
      inventoryPlural: "Site Progress & Work",
      clientType: "Principal Employer",
      dealLabel: "Work Contract",
      leadLabel: "Tender / Bid",
      activityLabel: "Daily Site Log",
    },
    primaryNav: [
      { id: "overview", label: "Site Operations", href: "/", iconName: "LayoutDashboard" },
      { id: "leads", label: "Tenders & Inquiries", href: "/leads", iconName: "Users" },
      { id: "pipeline", label: "Active Contracts", href: "/pipeline", iconName: "Kanban" },
      { id: "tasks", label: "Site Punch List", href: "/tasks", iconName: "ListTodo" },
    ],
    inventoryNav: {
      id: "projects",
      label: "Sites & Progress",
      href: "/projects",
      iconName: "HardHat",
    },
    quickActions: [
      { id: "log_dsr", label: "Log Daily Site Report (DSR)", description: "Record daily weather, labor & progress", actionType: "dsr" },
      { id: "material_request", label: "Request Cement/Steel Refill", description: "Send indentation to procurement", actionType: "material_req" },
      { id: "measurement_bill", label: "Submit Measurement Bill", description: "Progress percentage claim for payment", actionType: "bill" },
    ],
  },
};

export const DEFAULT_ECOSYSTEM_VERTICAL: EcosystemVertical = "real_estate";

export function getVerticalProfile(vertical?: string | null): VerticalProfile {
  if (vertical && vertical in ECOSYSTEM_VERTICALS) {
    return ECOSYSTEM_VERTICALS[vertical as EcosystemVertical];
  }
  return ECOSYSTEM_VERTICALS[DEFAULT_ECOSYSTEM_VERTICAL];
}
