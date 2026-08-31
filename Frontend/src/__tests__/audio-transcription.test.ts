import { describe, it, expect } from "vitest";

// Recreate parser function logic for isolated unit testing
function parseRealEstateVoiceTranscript(rawText: string) {
  let cleaned = rawText.trim();
  
  let extractedBudget: number | undefined;
  const crMatch = cleaned.match(/(\d+(?:\.\d+)?)\s*(?:cr|crore|crores)/i);
  if (crMatch) {
    extractedBudget = Math.round(parseFloat(crMatch[1]) * 10_000_000);
  } else {
    const lakhMatch = cleaned.match(/(\d+(?:\.\d+)?)\s*(?:lakh|lakhs|lac|lacs|l)/i);
    if (lakhMatch) {
      extractedBudget = Math.round(parseFloat(lakhMatch[1]) * 100_000);
    }
  }

  let extractedConfig: string | undefined;
  const bhkMatch = cleaned.match(/(\d+)\s*(?:bhk|bedroom|bed)/i);
  if (bhkMatch) {
    extractedConfig = `${bhkMatch[1]} BHK`;
    if (/servant|maid|domestic/i.test(cleaned)) {
      extractedConfig += " + Servant";
    } else if (/study|puja|pooja/i.test(cleaned)) {
      extractedConfig += " + Study";
    }
  }

  let sentiment: "bullish" | "cautious" | "hesitant" | "negative" = "cautious";
  if (/interested|ready to buy|token|cheque|cheque ready|finalise|finalize|loved the view|bullish/i.test(cleaned)) {
    sentiment = "bullish";
  } else if (/expensive|high price|overpriced|delay|possession issue|not convinced/i.test(cleaned)) {
    sentiment = "hesitant";
  } else if (/drop|not interested|rejected|budget issue/i.test(cleaned)) {
    sentiment = "negative";
  }

  const objections: string[] = [];
  if (/price|expensive|costly|budget|rate/i.test(cleaned)) objections.push("Price negotiation requested");
  if (/floor|low floor|high floor/i.test(cleaned)) objections.push("Floor preference constraint");
  if (/facing|vaastu|vastu|direction/i.test(cleaned)) objections.push("Vaastu / Facing compliance");
  if (/possession|delay|timeline/i.test(cleaned)) objections.push("Possession timeline concern");
  if (/bank|loan|subvention/i.test(cleaned)) objections.push("Bank loan / Financing dependency");

  const buyingSignals: string[] = [];
  if (/cheque|token|advance|booking/i.test(cleaned)) buyingSignals.push("Ready with booking token/cheque");
  if (/family|spouse|wife|husband|parents/i.test(cleaned)) buyingSignals.push("Family decision makers aligned");
  if (/site visit|visit again|revisit|walkthrough/i.test(cleaned)) buyingSignals.push("Follow-up site visit requested");
  if (/cost sheet|payment plan|payment schedule/i.test(cleaned)) buyingSignals.push("Requested official cost sheet & payment schedule");

  return {
    transcript: cleaned,
    extractedInfo: {
      budget: extractedBudget,
      configuration: extractedConfig,
      sentiment,
      objections,
      buyingSignals,
    },
  };
}

describe("Voice Note Audio Transcription & NLP Parsing", () => {
  it("extracts Crores budget, 4 BHK configuration, and bullish sentiment", () => {
    const rawNote =
      "Met Dr. Verma at The Camellias. Loved the 4 BHK 16th floor unit. Budget is around 42 Cr. He is ready with the booking token cheque for next Monday.";
    const result = parseRealEstateVoiceTranscript(rawNote);

    expect(result.extractedInfo.budget).toBe(420000000);
    expect(result.extractedInfo.configuration).toBe("4 BHK");
    expect(result.extractedInfo.sentiment).toBe("bullish");
    expect(result.extractedInfo.buyingSignals).toContain("Ready with booking token/cheque");
  });

  it("extracts Lakhs budget and detects price negotiation objection in Hinglish note", () => {
    const hinglishNote =
      "Client ko Sector 65 mein 3 BHK chahiye under 85 Lakhs. Bol rahe hain price bahut expensive hai aur discount chahiye.";
    const result = parseRealEstateVoiceTranscript(hinglishNote);

    expect(result.extractedInfo.budget).toBe(8500000);
    expect(result.extractedInfo.configuration).toBe("3 BHK");
    expect(result.extractedInfo.objections).toContain("Price negotiation requested");
    expect(result.extractedInfo.sentiment).toBe("hesitant");
  });

  it("detects family alignment and cost sheet request signals", () => {
    const note =
      "Buyer visited with wife and parents. They requested the official cost sheet and payment plan breakdown.";
    const result = parseRealEstateVoiceTranscript(note);

    expect(result.extractedInfo.buyingSignals).toContain("Family decision makers aligned");
    expect(result.extractedInfo.buyingSignals).toContain("Requested official cost sheet & payment schedule");
  });
});
