import { cookies } from "next/headers";
import { getBestModel, getGenAI } from "@/lib/gemini";
import { SUBJECT_LABELS } from "@/app/api/hint/route";

export type ChatMessage = {
  role: "student" | "tutor";
  content: string;
};

const CHAT_SYSTEM_PROMPT = `あなたは日本の学習指導要領に準拠した家庭教師です。
生徒が問題に取り組んでおり、すでに3段階のヒントが提示されています。
生徒からの追加の質問に丁寧に答えてください。

指導方針：
- 直接答えを言わず、生徒が自分で気づけるよう問いかける形で応答する
- ただし生徒が本当に困っている場合は、段階的に考え方を教える
- 学年に合った言葉づかいをする（小学生：やさしい言葉、中高生：専門用語OK）
- 短くて分かりやすい返答を心がける（長文は避ける）
- 励ましの言葉を添える
- 返答は日本語のみ、マークダウンは使わない`;

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const auth = cookieStore.get("auth_token");
  if (!auth || auth.value !== "authenticated") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { messages, subject, grade, originalQuestion, hints } = await request.json() as {
    messages: ChatMessage[];
    subject: string;
    grade: string;
    originalQuestion: string;
    hints: { hint1: string; hint2: string; hint3: string };
  };

  if (!messages?.length) {
    return Response.json({ error: "メッセージがありません" }, { status: 400 });
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

  // コンテキスト情報（元の問題とヒント）
  const contextBlock = `
【授業のコンテキスト】
教科: ${subjectLabel}
学年: ${grade}
元の問題: ${originalQuestion || "（写真の問題）"}
提示済みのヒント1: ${hints?.hint1 ?? ""}
提示済みのヒント2: ${hints?.hint2 ?? ""}
提示済みのヒント3: ${hints?.hint3 ?? ""}
`.trim();

  // 会話履歴をテキストに変換
  const conversationHistory = messages
    .map((m) => `${m.role === "student" ? "生徒" : "先生"}: ${m.content}`)
    .join("\n");

  const fullPrompt = `${CHAT_SYSTEM_PROMPT}

${contextBlock}

【会話履歴】
${conversationHistory}

先生:`;

  try {
    const result = await model.generateContent(fullPrompt);
    const reply = result.response.text().trim();
    return Response.json({ reply });
  } catch (err) {
    console.error(`Chat Gemini error (model: ${modelName}):`, err);
    return Response.json(
      { error: "AIの応答に失敗しました。もう一度お試しください。" },
      { status: 500 }
    );
  }
}
