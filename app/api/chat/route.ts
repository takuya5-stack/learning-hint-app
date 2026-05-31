import { cookies } from "next/headers";
import { getBestModel, getGenAI } from "@/lib/gemini";
import { SUBJECT_LABELS } from "@/app/api/hint/route";

export type ChatMessage = {
  role: "student" | "tutor";
  content: string;
};

// ヒントモードのフォローアップ用
const FOLLOWUP_SYSTEM_PROMPT = `あなたは日本の学習指導要領に準拠した家庭教師です。
生徒が問題に取り組んでおり、すでに3段階のヒントが提示されています。
生徒からの追加の質問に丁寧に答えてください。

指導方針：
- 直接答えを言わず、生徒が自分で気づけるよう問いかける形で応答する
- ただし生徒が本当に困っている場合は、段階的に考え方を教える
- 学年に合った言葉づかいをする（小学生：やさしい言葉、中高生：専門用語OK）
- 短くて分かりやすい返答を心がける（長文は避ける）
- 励ましの言葉を添える
- 返答は日本語のみ、マークダウンは使わない`;

// チャットモード：勉強
const STUDY_SYSTEM_PROMPT = `あなたは日本の学習指導要領に準拠した家庭教師です。
生徒がチャット形式で学習の質問をしてきます。

指導方針：
- 生徒の質問に対して、まず「どこでつまずいているか」を把握する
- いきなり答えを与えず、「どう思う？」「まずここを考えてみよう」と問いかける
- 生徒の考えを引き出しながら、一緒に考えるスタイルで進める
- どうしても理解できない場合は、概念や解き方の流れを丁寧に説明する
- 学年に合った言葉づかいをする（小学生：やさしく具体的、中学生：丁寧、高校生：専門用語OK）
- 1回の返答は簡潔に。長くなりそうなら段階的に分けて答える
- 返答は日本語のみ、マークダウンは使わない
- 最初の挨拶は「こんにちは！勉強で困っていることがあれば何でも聞いてね😊」`;

// チャットモード：相談
const CONSULT_SYSTEM_PROMPT = `あなたは生徒の話をよく聞く、信頼できる塾の先生です。
生徒が勉強・学校生活・進路・人間関係などの悩みを相談してきます。

対応方針：
- まず話をしっかり聞き、気持ちに寄り添う
- 共感の言葉を先に伝えてから、アドバイスや提案をする
- 「それはつらかったね」「よく話してくれたね」など受け止める言葉を大切に
- アドバイスは押しつけず「こういう方法もあるよ」と柔らかく提案する
- 深刻な悩み（いじめ・不登校など）には、保護者や学校の先生への相談も促す
- 学年に合った言葉づかいをする（小学生：やさしい言葉、中高生：対等な言葉）
- 短めの返答で安心感を与える。説教にならないよう注意する
- 返答は日本語のみ、マークダウンは使わない
- 最初の挨拶は「こんにちは！何か困っていることや悩んでいることがあったら、気軽に話してね🤝」`;

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const auth = cookieStore.get("auth_token");
  if (!auth || auth.value !== "authenticated") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const {
    messages,
    subject,
    grade,
    originalQuestion,
    hints,
    mode = "followup",
    chatType = "study",
  } = await request.json() as {
    messages: ChatMessage[];
    subject?: string;
    grade: string;
    originalQuestion?: string;
    hints?: { hint1: string; hint2: string; hint3: string };
    mode?: "followup" | "standalone";
    chatType?: "study" | "consult";
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

  const conversationHistory = messages
    .map((m) => `${m.role === "student" ? "生徒" : "先生"}: ${m.content}`)
    .join("\n");

  let fullPrompt: string;

  if (mode === "standalone") {
    const systemPrompt = chatType === "consult" ? CONSULT_SYSTEM_PROMPT : STUDY_SYSTEM_PROMPT;
    fullPrompt = `${systemPrompt}

【生徒情報】
学年: ${grade}

【会話履歴】
${conversationHistory}

先生:`;
  } else {
    // ヒントモードのフォローアップ
    const subjectLabel = SUBJECT_LABELS[subject ?? ""] ?? subject ?? "全般";
    const contextBlock = `【授業のコンテキスト】
教科: ${subjectLabel}
学年: ${grade}
元の問題: ${originalQuestion || "（写真の問題）"}
提示済みのヒント1: ${hints?.hint1 ?? ""}
提示済みのヒント2: ${hints?.hint2 ?? ""}
提示済みのヒント3: ${hints?.hint3 ?? ""}`;

    fullPrompt = `${FOLLOWUP_SYSTEM_PROMPT}

${contextBlock}

【会話履歴】
${conversationHistory}

先生:`;
  }

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
