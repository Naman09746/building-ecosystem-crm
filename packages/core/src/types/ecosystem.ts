export type EcosystemVertical =
  | "real_estate"          // Developers, Mandate Agents, Channel Partners, Brokers
  | "building_materials"    // Bricks, Cement, Marble, Tiles, Sanitaryware, Glass, Steel
  | "interior_furniture"   // Interior Designers, Modular Studios, Turnkey Fit-outs
  | "architecture_design"   // Architects, Structural/MEP Consultants
  | "contractor_builder";   // Civil Contractors, Subcontractors, Site Supervisors

export type ComplexityMode = "simple" | "deep";

export interface VerticalTerms {
  inventoryItem: string;     // e.g. "Flat / Unit" vs "Material SKU" vs "BOQ Item" vs "Design Spec" vs "Site Milestone"
  inventoryPlural: string;   // e.g. "Properties & Units" vs "Material Catalog" vs "Room Staging" vs "Project Drawings" vs "Site Progress"
  clientType: string;        // e.g. "Buyer / Investor" vs "Contractor / Buyer" vs "Homeowner" vs "Client" vs "Principal Employer"
  dealLabel: string;         // e.g. "Booking" vs "Order / Supply" vs "Fit-out Project" vs "Consulting Mandate" vs "Work Contract"
  leadLabel: string;         // e.g. "Buyer Inquiry" vs "Material Inquiry" vs "Design Consultation" vs "Design Brief" vs "Tender / Bid"
  activityLabel: string;     // e.g. "Site Visit" vs "Sample Dispatch" vs "Client Walkthrough" vs "Site Inspection" vs "Daily Site Log"
}

export interface NavItemConfig {
  id: string;
  label: string;
  href: string;
  iconName: string;
  badge?: string;
  requiresDeep?: boolean;
}

export interface VerticalProfile {
  id: EcosystemVertical;
  name: string;
  tagline: string;
  badge: string;
  color: string;
  iconName: string;
  description: string;
  terms: VerticalTerms;
  primaryNav: NavItemConfig[];
  inventoryNav: NavItemConfig;
  quickActions: Array<{
    id: string;
    label: string;
    description: string;
    actionType: string;
  }>;
}
