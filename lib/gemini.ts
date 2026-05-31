import { GoogleGenerativeAI } from "@google/generative-ai";

type GeminiModel = {
  name: string;
  supportedGenerationMethods?: string[];
};

const EXCLUDE_KEYWORDS = [
  "tts", "image", "robotics", "computer-use", "deep-research",
  "lyria", "gemma", "nano-banana", "clip", "customtools",
];

function extractVersion(name: string): number {
  const m = name.match(/gemini-(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : 0;
}

function selectBestModel(models: GeminiModel[]): string {
  const candidates = models.filter((m) => {
    const name = m.name.toLowerCase();
    if (!(m.supportedGenerationMethods ?? []).includes("generateContent")) return false;
    if (EXCLUDE_KEYWORDS.some((kw) => name.includes(kw))) return false;
    return true;
  });

  candidates.sort((a, b) => {
    const aName = a.name;
    const bName = b.name;
    const aIsPreview = aName.includes("preview") ? 1 : 0;
    const bIsPreview = bName.includes("preview") ? 1 : 0;
    if (aIsPreview !== bIsPreview) return aIsPreview - bIsPreview;
    const vDiff = extractVersion(bName) - extractVersion(aName);
    if (Math.abs(vDiff) > 0.001) return vDiff;
    const aFlash = aName.includes("flash") ? 0 : 1;
    const bFlash = bName.includes("flash") ? 0 : 1;
    if (aFlash !== bFlash) return aFlash - bFlash;
    const aLite = aName.includes("lite") ? 1 : 0;
    const bLite = bName.includes("lite") ? 1 : 0;
    return aLite - bLite;
  });

  if (candidates.length === 0) throw new Error("No suitable Gemini model found");
  return candidates[0].name.replace("models/", "");
}

let _cachedModel: string | null = null;
let _cacheExpiry = 0;

export async function getBestModel(apiKey: string): Promise<string> {
  if (_cachedModel && Date.now() < _cacheExpiry) return _cachedModel;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
    { next: { revalidate: 3600 } }
  );
  if (!res.ok) throw new Error(`Models API error: ${res.status}`);

  const data = await res.json();
  const model = selectBestModel(data.models ?? []);

  _cachedModel = model;
  _cacheExpiry = Date.now() + 60 * 60 * 1000;

  console.log(`[gemini] Selected model: ${model}`);
  return model;
}

export function getGenAI(apiKey: string) {
  return new GoogleGenerativeAI(apiKey);
}
