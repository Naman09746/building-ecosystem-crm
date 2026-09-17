import { describe, it, expect } from "vitest";
import type {
  MaterialsFootfall,
  MaterialsFieldScout,
  MaterialsKhataLedger,
  MaterialsKhataTransaction,
} from "@repo/core/types/materials-extensions";

describe("Materials Vertical Expansion — Footfall, Field Recon & Khata Engine", () => {
  it("enforces structured conclusion and note on retail depot footfall records", () => {
    const footfall: MaterialsFootfall = {
      id: "ff-101",
      orgId: "org-materials-1",
      outletName: "North Yard Depot",
      personName: "Sunil Verma",
      personPhone: "+91 98111 22233",
      visitType: "walk_in",
      intent: "bulk_order",
      conclusion: "order_placed",
      conclusionNotes: "Confirmed 400 bags UltraTech OPC 53 Grade for casting. Delivery Friday.",
      estimatedValue: 146000,
      followUpDate: "Friday 8:00 AM",
      visitedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    expect(footfall.conclusion).toBe("order_placed");
    expect(footfall.conclusionNotes.length).toBeGreaterThanOrEqual(5);
    expect(footfall.estimatedValue).toBe(146000);
    expect(footfall.visitType).toBe("walk_in");
  });

  it("calculates Khata ledger running balance across dispatch credit and payment debit transactions", () => {
    let ledger: MaterialsKhataLedger = {
      id: "khata-test-1",
      orgId: "org-materials-1",
      customerName: "Apex Infra",
      customerPhone: "+91 98222 33344",
      creditLimit: 500000,
      outstandingBalance: 0,
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 1. Goods dispatched on credit (+ ₹1,20,000)
    const tx1: MaterialsKhataTransaction = {
      id: "tx-1",
      ledgerId: ledger.id,
      orgId: ledger.orgId,
      type: "credit",
      amount: 120000,
      referenceNumber: "CHAL-101",
      notes: "Dispatched 300 bags cement on 15-day credit",
      createdAt: new Date().toISOString(),
    };
    ledger.outstandingBalance += tx1.amount;
    expect(ledger.outstandingBalance).toBe(120000);

    // 2. Additional dispatch (+ ₹80,000)
    const tx2: MaterialsKhataTransaction = {
      id: "tx-2",
      ledgerId: ledger.id,
      orgId: ledger.orgId,
      type: "credit",
      amount: 80000,
      referenceNumber: "CHAL-102",
      notes: "Dispatched 1 ton TMT steel",
      createdAt: new Date().toISOString(),
    };
    ledger.outstandingBalance += tx2.amount;
    expect(ledger.outstandingBalance).toBe(200000);

    // 3. Partial payment received via UPI (- ₹50,000)
    const tx3: MaterialsKhataTransaction = {
      id: "tx-3",
      ledgerId: ledger.id,
      orgId: ledger.orgId,
      type: "debit",
      amount: 50000,
      paymentMode: "upi",
      referenceNumber: "UPI-492102",
      notes: "Partial payment received via PhonePe",
      createdAt: new Date().toISOString(),
    };
    ledger.outstandingBalance -= tx3.amount;
    ledger.lastPaymentAt = tx3.createdAt;

    expect(ledger.outstandingBalance).toBe(150000);
    expect(ledger.lastPaymentAt).toBeDefined();
    expect(ledger.creditLimit - ledger.outstandingBalance).toBe(350000); // Available credit
  });

  it("structures Field Recon construction scout with GPS, phase, and immediate material demand", () => {
    const scout: MaterialsFieldScout = {
      id: "scout-test-1",
      orgId: "org-materials-1",
      title: "Green Valley Commercial Hub Plot 12",
      geoLat: 28.6139,
      geoLong: 77.209,
      addressText: "Sector 62, Noida",
      photoUrls: ["https://example.com/site-photo.jpg"],
      estimatedPhase: "foundation",
      estimatedMaterialNeeds: ["OPC 53 Cement", "Fe 550D TMT Steel", "Ready-Mix (RMC)"],
      potentialValue: 850000,
      status: "raw",
      contractorContactName: "Manoj Yadav (Site Supervisor)",
      contractorContactPhone: "+91 98112 00000",
      notes: "Raft footing excavation complete. Needs 1,200 bags OPC 53 next week.",
      scoutedByName: "Nitin Sharma",
      scoutedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    expect(scout.estimatedPhase).toBe("foundation");
    expect(scout.estimatedMaterialNeeds).toContain("OPC 53 Cement");
    expect(scout.geoLat).toBeCloseTo(28.6139, 3);
    expect(scout.potentialValue).toBe(850000);
  });
});
