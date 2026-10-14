import { getGeminiApiKey } from "@/lib/ai/gemini";

export interface OcrResult {
  text: string;
  sourceImageUrl?: string;
  confidence?: "high" | "medium" | "low";
  error?: string;
}

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

/**
 * Extracts text from an image flyer, poster, or document using Gemini Multimodal Vision.
 * Supports image URLs or direct base64 strings.
 */
export async function extractTextFromImage({
  imageUrl,
  imageBase64,
  mimeType = "image/jpeg",
}: {
  imageUrl?: string;
  imageBase64?: string;
  mimeType?: string;
}): Promise<OcrResult> {
  const apiKey = getGeminiApiKey();

  if (!apiKey) {
    return {
      text: "",
      error:
        "Gemini API key is not configured. Please add GEMINI_API_KEY to .env.local to enable OCR image extraction.",
    };
  }

  let finalBase64 = imageBase64;
  let finalMimeType = mimeType;

  // If image URL is provided, download image and convert to Base64
  if (!finalBase64 && imageUrl) {
    try {
      const res = await fetch(imageUrl, {
        headers: {
          "User-Agent": "OpportunityHub-OCR/1.0",
        },
      });

      if (!res.ok) {
        return {
          text: "",
          error: `Failed to download image from URL (${res.status} ${res.statusText})`,
        };
      }

      const contentType = res.headers.get("content-type");
      if (contentType && contentType.startsWith("image/")) {
        finalMimeType = contentType.split(";")[0].trim();
      }

      const arrayBuffer = await res.arrayBuffer();
      finalBase64 = Buffer.from(arrayBuffer).toString("base64");
    } catch (err) {
      return {
        text: "",
        error: `Could not fetch image at ${imageUrl}: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  if (!finalBase64) {
    return {
      text: "",
      error: "No image URL or base64 data provided for OCR.",
    };
  }

  // Remove data URI prefix if present (e.g. data:image/png;base64,...)
  if (finalBase64.includes(",")) {
    const parts = finalBase64.split(",");
    const metaPart = parts[0];
    finalBase64 = parts[1];
    const mimeMatch = metaPart.match(/data:([^;]+);/);
    if (mimeMatch) {
      finalMimeType = mimeMatch[1];
    }
  }

  const prompt = `You are a high-precision OCR and document analysis engine for OpportunityHub.
Analyze this image (which may be an event poster, academic competition notice, scholarship announcement, or hackathon flyer).

Extract and transcribe all text and key details verbatim:
1. Title / Event / Program Name
2. Organizing Institution / Company / Association
3. Key Dates (Registration Deadline, Submission Deadline, Event Dates)
4. Eligibility Criteria (Target Grade, Age Bracket, Country, Majors)
5. Registration URL / Application Link / Website
6. Participation Fee / Free Entry
7. Prizes / Awards / Benefits
8. Application Guidelines or Steps
9. Contact Details (Email, phone, social handles)

Output the extracted text clearly and completely with preserved section headings.`;

  const models = [
    "gemini-flash-latest",
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-flash-lite-latest",
    "gemini-3.5-flash-lite",
  ];

  for (const model of models) {
    try {
      const url = `${GEMINI_API_BASE}/models/${model}:generateContent?key=${apiKey}`;
      const payload = {
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType: finalMimeType,
                  data: finalBase64,
                },
              },
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 2048,
        },
      };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.warn(`[OCR ${model} error]`, res.status, errText);
        continue; // Try next model
      }

      const json = await res.json();
      const extractedText =
        json.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

      if (extractedText) {
        return {
          text: extractedText,
          sourceImageUrl: imageUrl,
          confidence: "high",
        };
      }
    } catch (err) {
      console.warn(`[OCR ${model} fetch exception]`, err);
    }
  }

  return {
    text: "",
    error: "OCR extraction failed across all Gemini models. Check your API key and image clarity.",
  };
}
