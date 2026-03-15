import { GoogleGenAI } from "@google/genai";
import { GEMINI_API_KEY } from "@/env";

export const gemini = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
export const GEMINI_MODEL_PRO = "gemini-2.5-pro";
export const GEMINI_MODEL_FLASH = "gemini-2.5-flash";
