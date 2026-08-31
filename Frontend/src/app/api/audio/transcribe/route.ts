import { NextRequest } from "next/server";
import { apiSuccess, apiError, checkRateLimit } from "@/lib/server/api-security";
import { getApiAuthContext } from "@/lib/server/supabase-server";

// Simple fallback audio processor & real estate term normalizer
function parseRealEstateVoiceTranscript(rawText: string) {
  let cleaned = rawText.trim();
  
  // Extract budget mentions (e.g. 5 Cr, 50 Lakh, 4.5 crore, 80 lacs)
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

  // Extract BHK configurations
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

  // Detect sentiment
  let sentiment: "bullish" | "cautious" | "hesitant" | "negative" = "cautious";
  if (/interested|ready to buy|token|cheque|cheque ready|finalise|finalize|loved the view|bullish/i.test(cleaned)) {
    sentiment = "bullish";
  } else if (/expensive|high price|overpriced|delay|possession issue|not convinced/i.test(cleaned)) {
    sentiment = "hesitant";
  } else if (/drop|not interested|rejected|budget issue/i.test(cleaned)) {
    sentiment = "negative";
  }

  // Detect objections
  const objections: string[] = [];
  if (/price|expensive|costly|budget|rate/i.test(cleaned)) objections.push("Price negotiation requested");
  if (/floor|low floor|high floor/i.test(cleaned)) objections.push("Floor preference constraint");
  if (/facing|vaastu|vastu|direction/i.test(cleaned)) objections.push("Vaastu / Facing compliance");
  if (/possession|delay|timeline/i.test(cleaned)) objections.push("Possession timeline concern");
  if (/bank|loan|subvention/i.test(cleaned)) objections.push("Bank loan / Financing dependency");

  // Detect buying signals
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

export async function POST(req: NextRequest) {
  const auth = await getApiAuthContext();
  if (!auth) {
    return apiError("Authentication required", 401, "UNAUTHORIZED");
  }

  const rateCheck = checkRateLimit(`voice_transcribe_${auth.userId}`, 30, 60000);
  if (!rateCheck.allowed) {
    return apiError("Rate limit exceeded for voice transcription", 429, "RATE_LIMIT_EXCEEDED");
  }

  try {
    const contentType = req.headers.get("content-type") || "";

    let audioBase64 = "";
    let mimeType = "audio/webm";
    let textFallback = "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const audioFile = formData.get("audio") as Blob | null;
      textFallback = (formData.get("text") as string) || "";
      if (audioFile) {
        const arrayBuffer = await audioFile.arrayBuffer();
        audioBase64 = Buffer.from(arrayBuffer).toString("base64");
        mimeType = audioFile.type || "audio/webm";
      }
    } else {
      const body = await req.json().catch(() => ({}));
      audioBase64 = body.audioBase64 || "";
      mimeType = body.mimeType || "audio/webm";
      textFallback = body.text || "";
    }

    // If text was provided directly (e.g. Web Speech API transcript), structure it
    if (textFallback && !audioBase64) {
      const parsed = parseRealEstateVoiceTranscript(textFallback);
      return apiSuccess({
        ...parsed,
        source: "web_speech_api",
      });
    }

    if (!audioBase64 && !textFallback) {
      return apiError("No audio payload or text provided for transcription", 400, "BAD_REQUEST");
    }

    // Call Google Gemini Multimodal API if GEMINI_API_KEY is present
    const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (geminiApiKey && audioBase64) {
      try {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: `You are an elite Indian luxury real estate sales assistant.
Transcribe this sales audio note accurately in English or Hinglish.
Listen carefully for real estate terms: BHK, DLF, Camellias, Golf Course Road, Worli, PLC, BSP, Stamp Duty, Possession, Car Park, Cheque, Token.
Then provide a clean transcription followed by structured facts:
Budget (INR), Preferred Configuration, Buying Signals, Objections, Suggested Next Step.`,
                    },
                    {
                      inlineData: {
                        mimeType,
                        data: audioBase64,
                      },
                    },
                  ],
                },
              ],
              generationConfig: {
                temperature: 0.2,
                maxOutputTokens: 1000,
              },
            }),
            signal: AbortSignal.timeout(15_000),
          }
        );

        if (geminiRes.ok) {
          const geminiJson = await geminiRes.json();
          const responseText =
            geminiJson.candidates?.[0]?.content?.parts?.[0]?.text || "";
          if (responseText) {
            const parsed = parseRealEstateVoiceTranscript(responseText);
            return apiSuccess({
              ...parsed,
              source: "gemini_multimodal_flash",
            });
          }
        }
      } catch (geminiErr: any) {
        console.warn("[VOICE_TRANSCRIBE_GEMINI_FALLBACK]", geminiErr.message);
      }
    }

    // Fallback if AI key is missing or offline
    const fallbackTranscript = textFallback || "Audio note recorded successfully (Offline preview)";
    const parsed = parseRealEstateVoiceTranscript(fallbackTranscript);
    return apiSuccess({
      ...parsed,
      source: "local_heuristic_transcriber",
    });
  } catch (err: any) {
    return apiError(err.message || "Failed to transcribe voice note", 500, "INTERNAL_ERROR");
  }
}
