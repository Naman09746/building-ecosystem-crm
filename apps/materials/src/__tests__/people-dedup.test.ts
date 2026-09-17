import { describe, it, expect } from "vitest";

// Normalized phone helper matching server route logic
function normalizeIndianPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.slice(-10);
}

// In-memory people deduplication matcher
interface PersonRecord {
  id: string;
  fullName: string;
  primaryPhone: string;
  email?: string;
  panNumber?: string;
}

function findDuplicatePerson(
  candidate: { fullName: string; primaryPhone: string; email?: string; panNumber?: string },
  existingPeople: PersonRecord[]
): { isDuplicate: boolean; matchReason?: string; matchedPerson?: PersonRecord } {
  const normalizedCandidatePhone = normalizeIndianPhone(candidate.primaryPhone);

  for (const person of existingPeople) {
    if (normalizeIndianPhone(person.primaryPhone) === normalizedCandidatePhone) {
      return { isDuplicate: true, matchReason: "primary_phone", matchedPerson: person };
    }
    if (candidate.email && person.email && candidate.email.toLowerCase() === person.email.toLowerCase()) {
      return { isDuplicate: true, matchReason: "email", matchedPerson: person };
    }
    if (candidate.panNumber && person.panNumber && candidate.panNumber.toUpperCase() === person.panNumber.toUpperCase()) {
      return { isDuplicate: true, matchReason: "pan_number", matchedPerson: person };
    }
  }

  return { isDuplicate: false };
}

describe("People Registry & Multi-Variable Deduplication Engine", () => {
  const existingPeople: PersonRecord[] = [
    {
      id: "p-1",
      fullName: "Rahul Sharma",
      primaryPhone: "9810123456",
      email: "rahul.sharma@example.com",
      panNumber: "ABCDE1234F",
    },
    {
      id: "p-2",
      fullName: "Amitabh Verma",
      primaryPhone: "9876543210",
      email: "verma.amit@example.com",
      panNumber: "VWXYZ9876K",
    },
  ];

  it("normalizes diverse Indian phone number formats (+91, spaces, dashes) to 10 digits", () => {
    expect(normalizeIndianPhone("+91 98101 23456")).toBe("9810123456");
    expect(normalizeIndianPhone("098101-23456")).toBe("9810123456");
    expect(normalizeIndianPhone("+91-9810123456")).toBe("9810123456");
    expect(normalizeIndianPhone("9810123456")).toBe("9810123456");
  });

  it("detects existing person by phone number regardless of formatting", () => {
    const candidate = {
      fullName: "R. Sharma",
      primaryPhone: "+91-98101-23456",
      email: "rsharma_new@example.com",
    };
    const result = findDuplicatePerson(candidate, existingPeople);

    expect(result.isDuplicate).toBe(true);
    expect(result.matchReason).toBe("primary_phone");
    expect(result.matchedPerson?.id).toBe("p-1");
  });

  it("detects existing person by PAN number even if alternate phone is provided", () => {
    const candidate = {
      fullName: "Rahul S.",
      primaryPhone: "9999988888",
      panNumber: "abcde1234f", // lowercase PAN
    };
    const result = findDuplicatePerson(candidate, existingPeople);

    expect(result.isDuplicate).toBe(true);
    expect(result.matchReason).toBe("pan_number");
    expect(result.matchedPerson?.id).toBe("p-1");
  });

  it("permits genuinely new person record without false positive flags", () => {
    const candidate = {
      fullName: "Vikram Singhania",
      primaryPhone: "+91 91234 56789",
      email: "vikram@singhania.in",
      panNumber: "ZZZZZ9999Z",
    };
    const result = findDuplicatePerson(candidate, existingPeople);

    expect(result.isDuplicate).toBe(false);
    expect(result.matchedPerson).toBeUndefined();
  });
});
