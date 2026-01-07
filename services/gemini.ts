
import { GoogleGenAI, Type } from "@google/genai";
import { BreakSuggestion } from "../types.ts";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export class GeminiCoach {
  static async getBreakSuggestion(currentActivity: string): Promise<BreakSuggestion> {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `The user has been working on "${currentActivity}" for over 20 minutes. Suggest a specific 20-second break activity following the 20-20-20 rule (Look 20 feet away for 20 seconds).`,
      config: {
        systemInstruction: "You are a health and ergonomic coach. Provide concise, friendly, and actionable break suggestions in JSON format.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            instruction: { type: Type.STRING },
            type: { 
              type: Type.STRING,
              description: "One of: eye, stretch, mindful"
            },
          },
          required: ["title", "instruction", "type"]
        }
      }
    });

    try {
      return JSON.parse(response.text.trim()) as BreakSuggestion;
    } catch (e) {
      return {
        title: "Standard Eye Break",
        instruction: "Look at something 20 feet away for at least 20 seconds to reduce eye strain.",
        type: "eye"
      };
    }
  }
}
