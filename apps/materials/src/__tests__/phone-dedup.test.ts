import { describe, it, expect } from "vitest";
import { normalizePhone, formatCurrencyINR } from "@repo/core/lib/utils";

describe("Real Estate CRM Phone Normalization & Deduplication", () => {
  it("should normalize 10-digit Indian mobile number to E.164 (+91)", () => {
    expect(normalizePhone("9810123456")).toBe("+919810123456");
    expect(normalizePhone("98110 99234")).toBe("+919811099234");
    expect(normalizePhone("+91 98110-99234")).toBe("+919811099234");
    expect(normalizePhone("09811099234")).toBe("+919811099234");
  });

  it("should handle already normalized international numbers", () => {
    expect(normalizePhone("+14155552671")).toBe("+14155552671");
    expect(normalizePhone("+447911123456")).toBe("+447911123456");
  });

  it("should correctly identify deduplication match across different formats of same buyer", () => {
    const inputA = "+91 98200-11456";
    const inputB = "9820011456";
    const inputC = "09820011456";

    expect(normalizePhone(inputA)).toBe(normalizePhone(inputB));
    expect(normalizePhone(inputB)).toBe(normalizePhone(inputC));
  });
});

describe("Indian Currency Formatter (Crore & Lakhs)", () => {
  it("should format values >= 1 Crore into Cr notation", () => {
    expect(formatCurrencyINR(38000000)).toBe("₹3.80 Cr");
    expect(formatCurrencyINR(125000000)).toBe("₹12.50 Cr");
    expect(formatCurrencyINR(10000000)).toBe("₹1.00 Cr");
  });

  it("should format values < 1 Crore into Lakh notation", () => {
    expect(formatCurrencyINR(8500000)).toBe("₹85.00 L");
    expect(formatCurrencyINR(4500000)).toBe("₹45.00 L");
    expect(formatCurrencyINR(750000)).toBe("₹7.50 L");
  });
});
