import { cookies } from "next/headers";
import { GoogleGenerativeAI } from "@google/generative-ai";

const SUBJECT_LABELS: Record<string, string> = {
  arithmetic: "算数",
  math: "数学",
  japanese: "国語",
  science: "理科",
  social: "社会",
  english: "英語",
  moral: "道徳",
  music: "音楽",
  art: "図画工作・美術",
  pe: "体育・保健体育",
  home: "家庭科・技術家庭",
};

const SYSTEM_PROMPT = `あなたは日本の学習指導要領に準拠した優しい家庭教師です。

ルール：
1. 小学校・中学校の学習指導要領に沿って指導する
2. 直接答えを教えず、3段階のヒントで子どもが自分で考えられるよう導く
3. ヒントは段階的に具体的になる（ヒント1が最も抽象的、ヒント3が最も具体的）
4. 子どもの発達段階に合った言葉を使う（小学生には平易な言葉、中学生にはやや専門的な言葉）
5. 励ましの言葉を含める

必ずJSON形式で以下の構造で回答すること：
{
  "grade_level": "小学校低学年 / 小学校中学年 / 小学校高学年 / 中学校",
  "subject": "教科名",
  "hint1": "最初のヒント（方向性を示す程度）",
  "hint2": "2つ目のヒント（考え方のポイントを示す）",
  "hint3": "3つ目のヒント（もう少し具体的に、答えに近いが直接は言わない）",
  "answer": "正答または模範解答",
  "encouragement": "取り組んでいる子どもへの励ましの一言"
}

JSONのみを返し、他のテキストは含めないこと。`;

// --- モデル動的選択 ---

type GeminiModel = {
  name: string;
  supportedGenerationMethods?: string[];
};

// 除外キーワード（テキスト生成に不向きな特殊モデル）
const EXCLUDE_KEYWORDS = [
  "tts", "image", "robotics", "computer-use", "deep-research",
  "lyria", "gemma", "nano-banana", "clip", "customtools",
];

// モデル名からメジャー+マイナーバージョンを抽出（例: gemini-2.5-flash → 2.5）
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

    // stable > preview (preview扱いはバージョン比較後に後回し)
    const aIsPreview = aName.includes("preview") ? 1 : 0;
    const bIsPreview = bName.includes("preview") ? 1 : 0;
    if (aIsPreview !== bIsPreview) return aIsPreview - bIsPreview;

    // バージョン番号が高い方を優先
    const vDiff = extractVersion(bName) - extractVersion(aName);
    if (Math.abs(vDiff) > 0.001) return vDiff;

    // flash > pro（速度・コスト優先）
    const aFlash = aName.includes("flash") ? 0 : 1;
    const bFlash = bName.includes("flash") ? 0 : 1;
    if (aFlash !== bFlash) return aFlash - bFlash;

    // lite は最後
    const aLite = aName.includes("lite") ? 1 : 0;
    const bLite = bName.includes("lite") ? 1 : 0;
    return aLite - bLite;
  });

  if (candidates.length === 0) throw new Error("No suitable Gemini model found");
  return candidates[0].name.replace("models/", "");
}

// モジュールレベルキャッシュ（1時間）
let _cachedModel: string | null = null;
let _cacheExpiry = 0;

async function getBestModel(apiKey: string): Promise<string> {
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

  console.log(`[hint] Selected Gemini model: ${model}`);
  return model;
}

// --- Route Handler ---

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const auth = cookieStore.get("auth_token");

  if (!auth || auth.value !== "authenticated") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { question, subject, grade } = await request.json();

  if (!question?.trim()) {
    return Response.json({ error: "質問を入力してください" }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "GEMINI_API_KEY が設定されていません" },
      { status: 500 }
    );
  }

  let modelName: string;
  try {
    modelName = await getBestModel(apiKey);
  } catch (err) {
    console.error("Model selection error:", err);
    return Response.json(
      { error: "利用可能なモデルの取得に失敗しました" },
      { status: 500 }
    );
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelName });

  const subjectLabel = SUBJECT_LABELS[subject] ?? subject ?? "全般";
  const userPrompt = `教科: ${subjectLabel}\n学年: ${grade ?? "未指定"}\n\n質問: ${question}`;

  try {
    const result = await model.generateContent([
      { text: SYSTEM_PROMPT },
      { text: userPrompt },
    ]);

    const text = result.response.text().trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Invalid JSON response from Gemini");

    const data = JSON.parse(jsonMatch[0]);
    return Response.json(data);
  } catch (err) {
    console.error(`Gemini error (model: ${modelName}):`, err);
    return Response.json(
      { error: "AIの応答に失敗しました。もう一度お試しください。" },
      { status: 500 }
    );
  }
}
