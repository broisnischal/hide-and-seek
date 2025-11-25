import { GoogleGenAI } from "@google/genai";
import { Player, ChatMessage } from '../types';

let genAI: GoogleGenAI | null = null;

try {
  // Safe check for process.env to avoid ReferenceError in browser-only environments
  if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
    genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
} catch (error) {
  console.error("Failed to initialize Gemini:", error);
}

export const generateCommentary = async (
  players: Player[],
  recentChats: ChatMessage[]
): Promise<string> => {
  if (!genAI) return "AI Commentator is offline (No API Key).";

  const gameStateDescription = players.map(p => 
    `${p.name} is at height ${Math.round(p.y)}% and is ${p.isTalking ? 'speaking' : 'silent'}.`
  ).join('\n');

  const chatTranscript = recentChats.map(c => `${c.senderName}: "${c.text}"`).join('\n');

  const prompt = `
    You are an energetic e-sports commentator for a game called "Neon Vertical".
    
    Current Game State:
    ${gameStateDescription}

    Recent Chat Log:
    ${chatTranscript}

    Generate a single, short, snappy sentence (max 15 words) of commentary about the current situation. 
    Focus on who is highest, who is talking, or react to the chat. Be funny.
  `;

  try {
    const response = await genAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "Tracking game state...";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "";
  }
};