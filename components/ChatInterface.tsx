"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import HintCard from "./HintCard";
import ImageCropper from "./ImageCropper";
import ChatBox from "./ChatBox";
import StandaloneChat from "./StandaloneChat";

type SchoolLevel = "elementary" | "middle" | "high";

type Subject = {
  value: string;
  label: string;
  emoji: string;
  school: SchoolLevel | "all";
};

type Grade = {
  value: string;
  label: string;
  school: SchoolLevel;
};

type HintResult = {
  grade_level: string;
  subject: string;
  hint1: string;
  hint2: string;
  hint3: string;
  answer: string;
  encouragement: string;
};

const SUBJECTS: Subject[] = [
  // 小学校
  { value: "arithmetic", label: "算数", emoji: "🔢", school: "elementary" },
  // 中学校
  { value: "math_middle", label: "数学", emoji: "📐", school: "middle" },
  // 高校
  { value: "math_high", label: "数学", emoji: "📐", school: "high" },
  { value: "physics", label: "物理", emoji: "⚡", school: "high" },
  { value: "chemistry", label: "化学", emoji: "🧪", school: "high" },
  { value: "biology", label: "生物", emoji: "🌿", school: "high" },
  { value: "earth_science", label: "地学", emoji: "🌏", school: "high" },
  { value: "j_lit", label: "現代文", emoji: "📰", school: "high" },
  { value: "classical", label: "古文・漢文", emoji: "📜", school: "high" },
  { value: "world_history", label: "世界史", emoji: "🏛️", school: "high" },
  { value: "jpn_history", label: "日本史", emoji: "⛩️", school: "high" },
  { value: "geography", label: "地理", emoji: "🗾", school: "high" },
  { value: "civics", label: "政治・経済・倫理", emoji: "⚖️", school: "high" },
  { value: "info", label: "情報", emoji: "💻", school: "high" },
  // 共通
  { value: "japanese", label: "国語", emoji: "📖", school: "all" },
  { value: "science", label: "理科", emoji: "🔬", school: "all" },
  { value: "social", label: "社会", emoji: "🌍", school: "all" },
  { value: "english", label: "英語", emoji: "🗣️", school: "all" },
  { value: "moral", label: "道徳", emoji: "🌱", school: "all" },
  { value: "music", label: "音楽", emoji: "🎵", school: "all" },
  { value: "art", label: "図画工作・美術", emoji: "🎨", school: "all" },
  { value: "pe", label: "体育・保健", emoji: "⚽", school: "all" },
  { value: "home", label: "家庭科・技術", emoji: "🍳", school: "all" },
];

const GRADES: Grade[] = [
  { value: "小学1年生", label: "小1", school: "elementary" },
  { value: "小学2年生", label: "小2", school: "elementary" },
  { value: "小学3年生", label: "小3", school: "elementary" },
  { value: "小学4年生", label: "小4", school: "elementary" },
  { value: "小学5年生", label: "小5", school: "elementary" },
  { value: "小学6年生", label: "小6", school: "elementary" },
  { value: "中学1年生", label: "中1", school: "middle" },
  { value: "中学2年生", label: "中2", school: "middle" },
  { value: "中学3年生", label: "中3", school: "middle" },
  { value: "高校1年生", label: "高1", school: "high" },
  { value: "高校2年生", label: "高2", school: "high" },
  { value: "高校3年生", label: "高3", school: "high" },
];

const DEFAULT_SUBJECT: Record<SchoolLevel, string> = {
  elementary: "arithmetic",
  middle: "math_middle",
  high: "math_high",
};

const DEFAULT_GRADE: Record<SchoolLevel, string> = {
  elementary: "小学4年生",
  middle: "中学1年生",
  high: "高校1年生",
};

export default function ChatInterface() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [schoolLevel, setSchoolLevel] = useState<SchoolLevel>("middle");
  const [grade, setGrade] = useState("中学1年生");
  const [subject, setSubject] = useState("math_middle");
  const [question, setQuestion] = useState("");
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageData, setImageData] = useState<{ base64: string; mimeType: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<HintResult | null>(null);
  const [error, setError] = useState("");
  const [revealedHints, setRevealedHints] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [submittedImage, setSubmittedImage] = useState<string | null>(null);

  const filteredSubjects = SUBJECTS.filter(
    (s) => s.school === schoolLevel || s.school === "all"
  );
  const filteredGrades = GRADES.filter((g) => g.school === schoolLevel);

  function handleSchoolChange(level: SchoolLevel) {
    setSchoolLevel(level);
    setGrade(DEFAULT_GRADE[level]);
    setSubject(DEFAULT_SUBJECT[level]);
    setResult(null);
    setRevealedHints(0);
    setShowAnswer(false);
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCropSrc(ev.target?.result as string);
      setImagePreview(null);
      setImageData(null);
    };
    reader.readAsDataURL(file);
  }

  function handleCropConfirm(croppedDataUrl: string, croppedBase64: string, mimeType: string) {
    setImagePreview(croppedDataUrl);
    setImageData({ base64: croppedBase64, mimeType });
    setCropSrc(null);
  }

  function handleCropUseWhole() {
    if (!cropSrc) return;
    const [meta, base64] = cropSrc.split(",");
    const mimeType = meta.match(/:(.*?);/)?.[1] ?? "image/jpeg";
    setImagePreview(cropSrc);
    setImageData({ base64, mimeType });
    setCropSrc(null);
  }

  function handleCropCancel() {
    setCropSrc(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeImage() {
    setImagePreview(null);
    setImageData(null);
    setCropSrc(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim() && !imageData) return;

    setLoading(true);
    setError("");
    setResult(null);
    setRevealedHints(0);
    setShowAnswer(false);

    const res = await fetch("/api/hint", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question,
        subject,
        grade,
        imageBase64: imageData?.base64 ?? null,
        imageMimeType: imageData?.mimeType ?? null,
      }),
    });

    setLoading(false);

    if (res.status === 401) { router.push("/"); return; }

    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "エラーが発生しました"); return; }

    setSubmittedImage(imagePreview);
    setResult(data);
    setRevealedHints(1);
  }

  async function handleLogout() {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/");
  }

  function reset() {
    setResult(null);
    setQuestion("");
    setImagePreview(null);
    setImageData(null);
    setSubmittedImage(null);
    setCropSrc(null);
    setRevealedHints(0);
    setShowAnswer(false);
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const canSubmit = !loading && (question.trim().length > 0 || imageData !== null);

  const SCHOOL_TABS: { level: SchoolLevel; label: string }[] = [
    { level: "elementary", label: "小学校" },
    { level: "middle", label: "中学校" },
    { level: "high", label: "高校" },
  ];

  type AppMode = "hint" | "chat";
  const [appMode, setAppMode] = useState<AppMode>("hint");

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-indigo-700 text-white px-4 py-3 flex items-center justify-between shadow">
        <div className="flex items-center gap-2">
          <span className="text-2xl">📚</span>
          <span className="font-bold text-lg">SSG質問アプリ</span>
        </div>
        <button
          onClick={handleLogout}
          className="text-xs bg-indigo-800 hover:bg-indigo-900 px-3 py-1.5 rounded-lg transition"
        >
          ログアウト
        </button>
      </header>

      {/* モード切り替えタブ */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-2xl mx-auto flex">
          <button
            onClick={() => setAppMode("hint")}
            className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-1.5 border-b-2 transition ${
              appMode === "hint"
                ? "border-indigo-600 text-indigo-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <span>💡</span> ヒントモード
          </button>
          <button
            onClick={() => setAppMode("chat")}
            className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-1.5 border-b-2 transition ${
              appMode === "chat"
                ? "border-indigo-600 text-indigo-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <span>💬</span> チャットモード
          </button>
        </div>
      </div>

      <main className="flex-1 max-w-2xl mx-auto w-full p-4 space-y-4">
        {/* チャットモード */}
        {appMode === "chat" && <StandaloneChat />}

        {/* ヒントモード */}
        {appMode === "hint" && cropSrc && (
          <div className="bg-white rounded-2xl shadow p-4">
            <ImageCropper
              src={cropSrc}
              onConfirm={handleCropConfirm}
              onUseWhole={handleCropUseWhole}
              onCancel={handleCropCancel}
            />
          </div>
        )}

        {appMode === "hint" && !cropSrc && !result ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-white rounded-2xl shadow p-4 space-y-3">
              {/* 学校区分タブ */}
              <div className="flex rounded-xl overflow-hidden border border-indigo-200">
                {SCHOOL_TABS.map(({ level, label }) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => handleSchoolChange(level)}
                    className={`flex-1 py-2 text-sm font-bold transition ${
                      schoolLevel === level
                        ? "bg-indigo-600 text-white"
                        : "text-indigo-600 hover:bg-indigo-50"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* 学年 */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">学年</label>
                <div className="flex flex-wrap gap-2">
                  {filteredGrades.map((g) => (
                    <button
                      key={g.value}
                      type="button"
                      onClick={() => setGrade(g.value)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
                        grade === g.value
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "border-gray-300 text-gray-600 hover:border-indigo-400"
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 教科 */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">教科</label>
                <div className="flex flex-wrap gap-2">
                  {filteredSubjects.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setSubject(s.value)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition flex items-center gap-1 ${
                        subject === s.value
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "border-gray-300 text-gray-600 hover:border-indigo-400"
                      }`}
                    >
                      <span>{s.emoji}</span>
                      <span>{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 質問入力 */}
            <div className="bg-white rounded-2xl shadow p-4 space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                問題を入力 または 写真を送る
              </label>

              {imagePreview && (
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imagePreview}
                    alt="問題の写真"
                    className="w-full max-h-64 object-contain rounded-xl border border-gray-200 bg-gray-50"
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm hover:bg-red-600 transition"
                  >
                    ✕
                  </button>
                </div>
              )}

              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder={
                  imagePreview
                    ? "写真についてメモを追加できます（任意）"
                    : "例：二次方程式の解き方がわからない\n例：光合成の仕組みを教えて"
                }
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 min-h-[80px]"
              />

              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleImageChange}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-indigo-300 text-indigo-600 font-medium py-3 rounded-xl hover:bg-indigo-50 transition text-sm"
                >
                  <span className="text-xl">📷</span>
                  {imagePreview ? "写真を撮り直す" : "問題を写真で送る"}
                </button>
              </div>

              {error && <p className="text-red-500 text-sm">{error}</p>}

              <button
                type="submit"
                disabled={!canSubmit}
                className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <><span className="animate-spin">⏳</span>ヒントを考え中...</>
                ) : (
                  <><span>💡</span>ヒントをもらう</>
                )}
              </button>
            </div>
          </form>
        ) : appMode === "hint" && !cropSrc && result ? (
          <div className="space-y-3">
            <div className="bg-white rounded-2xl shadow p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">❓</span>
                <p className="text-xs text-gray-500">{grade} · {result?.subject}</p>
              </div>
              {submittedImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={submittedImage}
                  alt="送った問題の写真"
                  className="w-full max-h-48 object-contain rounded-xl border border-gray-200 bg-gray-50"
                />
              )}
              {question && (
                <p className="text-gray-800 font-medium text-sm">{question}</p>
              )}
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-3 text-sm text-yellow-800 flex items-start gap-2">
              <span>✨</span>
              <span>{result?.encouragement}</span>
            </div>

            <HintCard index={1} content={result?.hint1 ?? ""} revealed={revealedHints >= 1} />
            {revealedHints >= 1 && (
              <HintCard
                index={2}
                content={result?.hint2 ?? ""}
                revealed={revealedHints >= 2}
                onReveal={revealedHints === 1 ? () => setRevealedHints(2) : undefined}
              />
            )}
            {revealedHints >= 2 && (
              <HintCard
                index={3}
                content={result?.hint3 ?? ""}
                revealed={revealedHints >= 3}
                onReveal={revealedHints === 2 ? () => setRevealedHints(3) : undefined}
              />
            )}

            {revealedHints >= 3 && !showAnswer && (
              <button
                onClick={() => setShowAnswer(true)}
                className="w-full border-2 border-dashed border-indigo-300 text-indigo-600 font-medium py-3 rounded-xl hover:bg-indigo-50 transition text-sm"
              >
                それでもわからなかったら答えを見る
              </button>
            )}

            {showAnswer && (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span>📝</span>
                  <span className="font-bold text-green-800">答え</span>
                </div>
                <p className="text-gray-800 text-sm leading-relaxed">{result?.answer}</p>
              </div>
            )}

            {/* チャット機能（ヒント1が表示されたら常に使える） */}
            <ChatBox
              subject={subject}
              grade={grade}
              originalQuestion={question}
              hints={{
                hint1: result?.hint1 ?? "",
                hint2: result?.hint2 ?? "",
                hint3: result?.hint3 ?? "",
              }}
            />

            <button
              onClick={reset}
              className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition"
            >
              別の問題を聞く
            </button>
          </div>
        ) : null}
      </main>
    </div>
  );
}
