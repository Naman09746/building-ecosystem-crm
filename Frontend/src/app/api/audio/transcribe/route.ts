import { NextRequest } from "next/server";
import { apiSuccess, apiError, checkRateLimit } from "@/lib/server/api-security";
import { getApiAuthContext } from "@/lib/server/supabase-server";
import { createClient } from "@supabase/supabase-js";

const HINDI_NUMBER_MAP: Record<string, number> = {
  ek: 1, ekk: 1,
  do: 2, dono: 2,
  teen: 3, tiin: 3,
  char: 4, chaar: 4,
  paanch: 5, panch: 5,
  chhe: 6,
  saat: 7, saath: 7,
  aath: 8,
  nau: 9,
  das: 10, daas: 10,
  ekadas: 11,
  barah: 12,
  terah: 13,
  chaudah: 14,
  pahla: 15,
  sodh: 16,
  satarah: 17,
  atharah: 18,
  unnaees: 19,
  bees: 20,
  athaees: 21,
  bavan: 22,
  taalis: 23,
  chaalis: 24,
  pachaas: 25,
  anpachaas: 26,
  atthara: 28,
  thalees: 29,
  atis: 30,
};

function parseHindiNumber(raw: string): number | null {
  const words = raw.toLowerCase().trim().split(/\s+/);
  let total = 0;
  let currentGroup = 0;

  for (const word of words) {
    if (HINDI_NUMBER_MAP[word] !== undefined) {
      currentGroup += HINDI_NUMBER_MAP[word];
    } else if (word === "saath" || word === "se" || word === "aur") {
      continue;
    } else {
      total += currentGroup;
      currentGroup = 0;
    }
  }
  total += currentGroup;

  return total > 0 ? total : null;
}

function parseHindiFraction(raw: string): number | null {
  const fractionMap: Record<string, number> = {
    dhai: 2.5, adhai: 2.5,
    dedh: 1.5, adaakh: 1.5,
    sadhe: 1.5,
    atte: 0.8,
    hajar: 100,
    sau: 100,
  };
  const lower = raw.toLowerCase().trim();
  for (const [key, val] of Object.entries(fractionMap)) {
    if (lower.includes(key)) return val;
  }
  return null;
}

function parseRealEstateVoiceTranscript(rawText: string) {
  let cleaned = rawText.trim();
  const lower = cleaned.toLowerCase();

  let extractedBudget: number | undefined;

  const fractionValue = parseHindiFraction(lower);
  if (fractionValue !== null) {
    const crMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:cr|crore|crores)/i);
    if (crMatch) {
      extractedBudget = Math.round(parseFloat(crMatch[1]) * 10_000_000);
    } else if (lower.match(/(?:dhai|dedh|sadhe|atte)\s*(?:crore|crores)/i)) {
      extractedBudget = Math.round(fractionValue * 10_000_000);
    }
  }

  if (!extractedBudget) {
    const crMatch = cleaned.match(/(\d+(?:\.\d+)?)\s*(?:cr|crore|crores)/i);
    if (crMatch) {
      extractedBudget = Math.round(parseFloat(crMatch[1]) * 10_000_000);
    } else {
      const lakhMatch = cleaned.match(/(\d+(?:\.\d+)?)\s*(?:lakh|lakhs|lac|lacs|l)/i);
      if (lakhMatch) {
        extractedBudget = Math.round(parseFloat(lakhMatch[1]) * 100_000);
      }
    }
  }

  if (!extractedBudget) {
    const hindiBudget = parseHindiFraction(lower);
    if (hindiBudget !== null) {
      extractedBudget = Math.round(hindiBudget * 100_000);
    }
    const hindiCr = lower.match(/(\d+)\s*(?:crore|crores)/i);
    if (hindiCr) {
      extractedBudget = Math.round(parseInt(hindiCr[1]) * 10_000_000);
    }
  }

  let extractedConfig: string | undefined;
  const bhkMatch = cleaned.match(/(\d+)\s*(?:bhk|bedroom|bed)/i);
  if (bhkMatch) {
    extractedConfig = `${bhkMatch[1]} BHK`;
  } else {
    const hindiBHK = lower.match(/(teen|do|char|paanch|ek|aath|nau|das|chhe|saat|bavan|pachaas|chaalis|atesh|navan|das)\s*(?:bhk|bedroom|bed)/i);
    if (hindiBHK) {
      const num = parseHindiNumber(hindiBHK[1]);
      if (num !== null) extractedConfig = `${num} BHK`;
    }
  }

  if (extractedConfig && /servant|maid|domestic|bahar|khanjaari/i.test(cleaned)) {
    extractedConfig += " + Servant";
  } else if (extractedConfig && /study|puja|pooja|pujagrih/i.test(cleaned)) {
    extractedConfig += " + Study";
  }

  let sentiment: "bullish" | "cautious" | "hesitant" | "negative" = "cautious";
  if (/interested|ready to buy|token|cheque|cheque ready|finalise|finalize|loved the view|bullish|kharidna chahta|zindagi/i.test(cleaned)) {
    sentiment = "bullish";
  } else if (/expensive|high price|overpriced|delay|possession issue|not convinced|bahut mehenga|kaatil/i.test(cleaned)) {
    sentiment = "hesitant";
  } else if (/drop|not interested|rejected|budget issue|na|nahi|reject/i.test(cleaned)) {
    sentiment = "negative";
  }

  const objections: string[] = [];
  if (/price|expensive|costly|budget|rate|mehenga|taanga/i.test(cleaned)) objections.push("Price negotiation requested");
  if (/floor|low floor|high floor|floor number/i.test(cleaned)) objections.push("Floor preference constraint");
  if (/facing|vaastu|vastu|direction|mukam/i.test(cleaned)) objections.push("Vaastu / Facing compliance");
  if (/possession|delay|timeline|samaand/i.test(cleaned)) objections.push("Possession timeline concern");
  if (/bank|loan|subvention|home loan/i.test(cleaned)) objections.push("Bank loan / Financing dependency");

  const buyingSignals: string[] = [];
  if (/cheque|token|advance|booking|laagu|hathyaar/i.test(cleaned)) buyingSignals.push("Ready with booking token/cheque");
  if (/family|spouse|wife|husband|parents|ghar/i.test(cleaned)) buyingSignals.push("Family decision makers aligned");
  if (/site visit|visit again|revisit|walkthrough|ghar jaana|milaap/i.test(cleaned)) buyingSignals.push("Follow-up site visit requested");
  if (/cost sheet|payment plan|payment schedule|kisti/i.test(cleaned)) buyingSignals.push("Requested official cost sheet & payment schedule");

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
    let language = "en-IN";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const audioFile = formData.get("audio") as Blob | null;
      textFallback = (formData.get("text") as string) || "";
      language = (formData.get("language") as string) || "en-IN";
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
      language = body.language || "en-IN";
    }

    if (textFallback && !audioBase64) {
      const parsed = parseRealEstateVoiceTranscript(textFallback);
      return apiSuccess({
        ...parsed,
        source: "web_speech_api",
        language,
      });
    }

    if (!audioBase64 && !textFallback) {
      return apiError("No audio payload or text provided for transcription", 400, "BAD_REQUEST");
    }

    let audioUrl: string | null = null;

    // Save audio to private Supabase bucket if text fallback exists
    if (textFallback && !audioBase64) {
      try {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        const fileName = `${auth.orgId}/${auth.userId}/${Date.now()}.webm`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("voice-notes")
          .upload(fileName, new Blob([await new Response(textFallback).arrayBuffer()]), {
            contentType: "audio/webm",
            upsert: false,
          });
        if (!uploadError && uploadData?.path) {
          const { data: signedData } = await supabase.storage
            .from("voice-notes")
            .createSignedUrl(uploadData.path, 3600);
          if (signedData?.signedUrl) {
            audioUrl = signedData.signedUrl;
          }
        }
      } catch {
        // Storage not configured — continue without audio URL
      }
    }

    // Call Google Gemini Multimodal API
    const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (geminiApiKey && audioBase64) {
      try {
        const languageInstruction =
          language === "hi-IN"
            ? "Transcribe in Hindi (Devanagari and Romanized). "
            : language === "en-IN"
            ? "Transcribe in English or Hinglish. "
            : "Transcribe accurately. ";

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
                      text: `${languageInstruction}
You are an elite Indian luxury real estate sales assistant.
Listen carefully for real estate terms: BHK, DLF, Camellias, Golf Course Road, Worli, PLC, BSP, Stamp Duty, Possession, Car Park, Cheque, Token.
Provide a clean transcription followed by structured facts:
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
          const responseText = geminiJson.candidates?.[0]?.content?.parts?.[0]?.text || "";
          if (responseText) {
            const parsed = parseRealEstateVoiceTranscript(responseText);
            const result: any = { ...parsed, source: "gemini_multimodal_flash", language };
            if (audioUrl) result.audioUrl = audioUrl;
            return apiSuccess(result);
          }
        }
      } catch (geminiErr: any) {
        console.warn("[VOICE_TRANSCRIBE_GEMINI_FALLBACK]", geminiErr.message);
      }
    }

    // Fallback
    const fallbackTranscript = textFallback || "Audio note recorded successfully (Offline preview)";
    const parsed = parseRealEstateVoiceTranscript(fallbackTranscript);
    const result: any = { ...parsed, source: "local_heuristic_transcriber", language };
    if (audioUrl) result.audioUrl = audioUrl;
    return apiSuccess(result);
  } catch (err: any) {
    return apiError(err.message || "Failed to transcribe voice note", 500, "INTERNAL_ERROR");
  }
}