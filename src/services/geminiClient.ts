import { GoogleGenAI, Type } from "@google/genai";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

let ai: GoogleGenAI | null = null;
if (GEMINI_API_KEY) {
  ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
}

export async function askGemini(prompt: string) {
  if (!ai) {
    console.warn("GEMINI_API_KEY is not set.");
    return "API Key missing. Keep up the good work!";
  }
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
  });
  return response.text || "Keep going!";
}

export async function askGeminiWithImage(prompt: string, base64Image: string, mimeType = 'image/jpeg') {
  if (!ai) {
    console.warn("GEMINI_API_KEY is not set.");
    return "API Key missing.";
  }
  const imagePart = {
    inlineData: {
      mimeType,
      data: base64Image,
    },
  };
  const textPart = { text: prompt };
  
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: { parts: [imagePart, textPart] },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          verified: { type: Type.BOOLEAN },
          confidence: { type: Type.INTEGER },
          reasoning: { type: Type.STRING }
        },
        required: ["verified", "confidence", "reasoning"]
      }
    }
  });
  return response.text;
}
