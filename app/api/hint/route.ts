import { cookies } from "next/headers";
import { getBestModel, getGenAI } from "@/lib/gemini";

export const SUBJECT_LABELS: Record<string, string> = {
  arithmetic: "算数",
  math_middle: "数学",
  math_high: "数学",
  physics: "物理",
  chemistry: "化学",
  biology: "生物",
  earth_science: "地学",
  j_lit: "現代文",
  classical: "古文・漢文",
  world_history: "世界史",
  jpn_history: "日本史",
  geography: "地理",
  civics: "政治・経済・倫理",
  info: "情報",
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

const SYSTEM_PROMPT = `あなたは日本の学習指導要領に準拠した家庭教師です。

ルール：
1. 小学校・中学校・高校の学習指導要領に沿って指導する
2. 直接答えを教えず、3段階のヒントで生徒が自分で考えられるよう導く
3. ヒントは段階的に具体的になる（ヒント1が最も抽象的、ヒント3が最も具体的）
4. 学年に合った言葉と説明レベルを使う：
   - 小学生：平易な言葉、具体的なたとえ
   - 中学生：やや専門的な用語を使いながら丁寧に
   - 高校生：教科書・受験レベルの専門用語を使い、論理的・体系的に説明する
5. 高校生には公式・定理の活用方法や証明の考え方も含めて良い
6. 励ましの言葉を含める

必ずJSON形式で以下の構造で回答すること：
{
  "grade_level": "小学校低学年 / 小学校中学年 / 小学校高学年 / 中学校 / 高校",
  "subject": "教科名",
  "hint1": "最初のヒント（方向性を示す程度）",
  "hint2": "2つ目のヒント（考え方のポイントを示す）",
  "hint3": "3つ目のヒント（もう少し具体的に、答えに近いが直接は言わない）",
  "answer": "正答または模範解答（高校生には途中式や証明も含める）",
  "encouragement": "取り組んでいる生徒への励ましの一言"
}

JSONのみを返し、他のテキストは含めないこと。`;

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const auth = cookieStore.get("auth_token");
  if (!auth || auth.value !== "authenticated") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { question, subject, grade, imageBase64, imageMimeType } = await request.json();

  const hasText = typeof question === "string" && question.trim().length > 0;
  const hasImage = typeof imageBase64 === "string" && imageBase64.length > 0;

  if (!hasText && !hasImage) {
    return Response.json(
      { error: "質問を入力するか、写真を送ってください" },
      { status: 400 }
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "GEMINI_API_KEY が設定されていません" }, { status: 500 });
  }

  let modelName: string;
  try {
    modelName = await getBestModel(apiKey);
  } catch (err) {
    console.error("Model selection error:", err);
    return Response.json({ error: "利用可能なモデルの取得に失敗しました" }, { status: 500 });
  }

  const genAI = getGenAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelName });

  const subjectLabel = SUBJECT_LABELS[subject] ?? subject ?? "全般";
  const questionText = hasText ? question.trim() : "（写真の問題を解いてください）";
  const userPrompt = `教科: ${subjectLabel}\n学年: ${grade ?? "未指定"}\n\n質問: ${questionText}`;

  type ContentPart =
    | { text: string }
    | { inlineData: { mimeType: string; data: string } };

  const contentParts: ContentPart[] = [{ text: SYSTEM_PROMPT }, { text: userPrompt }];
  if (hasImage) {
    contentParts.push({ inlineData: { mimeType: imageMimeType ?? "image/jpeg", data: imageBase64 } });
  }

  try {
    const result = await model.generateContent(contentParts);
    const text = result.response.text().trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Invalid JSON response from Gemini");
    return Response.json(JSON.parse(jsonMatch[0]));
  } catch (err) {
    console.error(`Gemini error (model: ${modelName}):`, err);
    return Response.json(
      { error: "AIの応答に失敗しました。もう一度お試しください。" },
      { status: 500 }
    );
  }
}
