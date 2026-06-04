import { cookies } from "next/headers";
import { getBestModel, getGenAI } from "@/lib/gemini";
import { SUBJECT_LABELS } from "@/app/api/hint/route";

export type ChatMessage = {
  role: "student" | "tutor";
  content: string;
  imagePreview?: string; // 表示用のみ（base64 data URL）
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

会話の進め方（3ステップ）：
1. 【受け止め】まず気持ちに共感し、「それは大変だったね」「よく話してくれたね」と受け止める
2. 【深掘り】共感したうえで、問題の本質を一緒に整理する問いかけをする
   - 「具体的にどんな場面で困ってる？」
   - 「それはいつ頃から？」
   - 「自分ではどうしたいと思ってる？」
   - 「一番しんどいのはどの部分？」
3. 【行動へ】問題が整理できたら、現実的に取れる行動を一緒に考える
   - 「じゃあまず明日できることを1つ考えてみよう」
   - 「AとBどっちが試しやすそう？」など選択肢を示す

注意点：
- 共感だけで終わらず、必ず「問題の核心」に近づく問いかけをする
- アドバイスは押しつけず「一緒に考えよう」スタンスを崩さない
- 深刻な悩み（いじめ・不登校・家庭問題）には、保護者や学校の先生への相談も自然に促す
- 学年に合った言葉づかい（小学生：やさしく、中高生：対等に）
- 1回の返答は短めに。次の問いかけで会話を続ける
- 返答は日本語のみ、マークダウンは使わない
- 最初の挨拶は「こんにちは！困っていることや悩んでいることがあったら、気軽に話してね🤝」`;

type ContentPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

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
    imageBase64,
    imageMimeType,
  } = await request.json() as {
    messages: ChatMessage[];
    subject?: string;
    grade: string;
    originalQuestion?: string;
    hints?: { hint1: string; hint2: string; hint3: string };
    mode?: "followup" | "standalone";
    chatType?: "study" | "consult";
    imageBase64?: string;
    imageMimeType?: string;
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

  const hasImage = typeof imageBase64 === "string" && imageBase64.length > 0;

  // 会話履歴テキスト（imagePreviewはAPIに不要なので無視）
  const conversationHistory = messages
    .map((m) => {
      const who = m.role === "student" ? "生徒" : "先生";
      const imgNote = m.imagePreview ? "（画像あり）" : "";
      return `${who}: ${m.content}${imgNote}`;
    })
    .join("\n");

  // プロンプト文字列を組み立て
  let promptText: string;

  if (mode === "standalone") {
    const systemPrompt = chatType === "consult" ? CONSULT_SYSTEM_PROMPT : STUDY_SYSTEM_PROMPT;
    promptText = `${systemPrompt}

【生徒情報】
学年: ${grade}

【会話履歴】
${conversationHistory}

先生:`;
  } else {
    const subjectLabel = SUBJECT_LABELS[subject ?? ""] ?? subject ?? "全般";
    promptText = `${FOLLOWUP_SYSTEM_PROMPT}

【授業のコンテキスト】
教科: ${subjectLabel}
学年: ${grade}
元の問題: ${originalQuestion || "（写真の問題）"}
提示済みのヒント1: ${hints?.hint1 ?? ""}
提示済みのヒント2: ${hints?.hint2 ?? ""}
提示済みのヒント3: ${hints?.hint3 ?? ""}

【会話履歴】
${conversationHistory}

先生:`;
  }

  // 画像があればコンテンツ配列形式で送る
  const contentParts: ContentPart[] = [{ text: promptText }];
  if (hasImage) {
    contentParts.push({
      inlineData: {
        mimeType: imageMimeType ?? "image/jpeg",
        data: imageBase64!,
      },
    });
  }

  try {
    const result = await model.generateContent(contentParts);
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
