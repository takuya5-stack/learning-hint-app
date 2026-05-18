"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import HintCard from "./HintCard";

type Subject = {
  value: string;
  label: string;
  emoji: string;
  school: "elementary" | "middle" | "both";
};

type Grade = {
  value: string;
  label: string;
  school: "elementary" | "middle";
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
  { value: "arithmetic", label: "算数", emoji: "🔢", school: "elementary" },
  { value: "math", label: "数学", emoji: "📐", school: "middle" },
  { value: "japanese", label: "国語", emoji: "📖", school: "both" },
  { value: "science", label: "理科", emoji: "🔬", school: "both" },
  { value: "social", label: "社会", emoji: "🌍", school: "both" },
  { value: "english", label: "英語", emoji: "🗣️", school: "both" },
  { value: "moral", label: "道徳", emoji: "🌱", school: "both" },
  { value: "music", label: "音楽", emoji: "🎵", school: "both" },
  { value: "art", label: "図画工作・美術", emoji: "🎨", school: "both" },
  { value: "pe", label: "体育・保健体育", emoji: "⚽", school: "both" },
  { value: "home", label: "家庭科・技術家庭", emoji: "🍳", school: "both" },
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
];

export default function ChatInterface() {
  const router = useRouter();
  const [schoolLevel, setSchoolLevel] = useState<"elementary" | "middle">("elementary");
  const [grade, setGrade] = useState("小学4年生");
  const [subject, setSubject] = useState("arithmetic");
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<HintResult | null>(null);
  const [error, setError] = useState("");
  const [revealedHints, setRevealedHints] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  const filteredSubjects = SUBJECTS.filter(
    (s) => s.school === schoolLevel || s.school === "both"
  );

  const filteredGrades = GRADES.filter((g) => g.school === schoolLevel);

  function handleSchoolChange(level: "elementary" | "middle") {
    setSchoolLevel(level);
    setGrade(level === "elementary" ? "小学4年生" : "中学1年生");
    setSubject(level === "elementary" ? "arithmetic" : "math");
    setResult(null);
    setRevealedHints(0);
    setShowAnswer(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;

    setLoading(true);
    setError("");
    setResult(null);
    setRevealedHints(0);
    setShowAnswer(false);

    const res = await fetch("/api/hint", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, subject, grade }),
    });

    setLoading(false);

    if (res.status === 401) {
      router.push("/");
      return;
    }

    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "エラーが発生しました");
      return;
    }

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
    setRevealedHints(0);
    setShowAnswer(false);
    setError("");
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-indigo-700 text-white px-4 py-3 flex items-center justify-between shadow">
        <div className="flex items-center gap-2">
          <span className="text-2xl">📚</span>
          <span className="font-bold text-lg">まなびヒントくん</span>
        </div>
        <button
          onClick={handleLogout}
          className="text-xs bg-indigo-800 hover:bg-indigo-900 px-3 py-1.5 rounded-lg transition"
        >
          ログアウト
        </button>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full p-4 space-y-4">
        {!result ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* School level tabs */}
            <div className="bg-white rounded-2xl shadow p-4 space-y-3">
              <div className="flex rounded-xl overflow-hidden border border-indigo-200">
                <button
                  type="button"
                  onClick={() => handleSchoolChange("elementary")}
                  className={`flex-1 py-2 text-sm font-bold transition ${
                    schoolLevel === "elementary"
                      ? "bg-indigo-600 text-white"
                      : "text-indigo-600 hover:bg-indigo-50"
                  }`}
                >
                  小学校
                </button>
                <button
                  type="button"
                  onClick={() => handleSchoolChange("middle")}
                  className={`flex-1 py-2 text-sm font-bold transition ${
                    schoolLevel === "middle"
                      ? "bg-indigo-600 text-white"
                      : "text-indigo-600 hover:bg-indigo-50"
                  }`}
                >
                  中学校
                </button>
              </div>

              {/* Grade select */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  学年
                </label>
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

              {/* Subject select */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  教科
                </label>
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

            {/* Question input */}
            <div className="bg-white rounded-2xl shadow p-4 space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                わからないことを入力してください
              </label>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="例：分数のたし算のやり方がわからない&#10;例：光合成とはなんですか？"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 min-h-[100px]"
              />

              {error && (
                <p className="text-red-500 text-sm">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || !question.trim()}
                className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    ヒントを考え中...
                  </>
                ) : (
                  <>
                    <span>💡</span>
                    ヒントをもらう
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-3">
            {/* Question recap */}
            <div className="bg-white rounded-2xl shadow p-4">
              <div className="flex items-start gap-2">
                <span className="text-xl">❓</span>
                <div>
                  <p className="text-xs text-gray-500 mb-1">
                    {grade} · {result.subject}
                  </p>
                  <p className="text-gray-800 font-medium">{question}</p>
                </div>
              </div>
            </div>

            {/* Encouragement */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-3 text-sm text-yellow-800 flex items-start gap-2">
              <span>✨</span>
              <span>{result.encouragement}</span>
            </div>

            {/* Hints */}
            <HintCard
              index={1}
              content={result.hint1}
              revealed={revealedHints >= 1}
            />
            {revealedHints >= 1 && (
              <HintCard
                index={2}
                content={result.hint2}
                revealed={revealedHints >= 2}
                onReveal={revealedHints === 1 ? () => setRevealedHints(2) : undefined}
              />
            )}
            {revealedHints >= 2 && (
              <HintCard
                index={3}
                content={result.hint3}
                revealed={revealedHints >= 3}
                onReveal={revealedHints === 2 ? () => setRevealedHints(3) : undefined}
              />
            )}

            {/* Show answer */}
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
                <p className="text-gray-800 text-sm leading-relaxed">
                  {result.answer}
                </p>
              </div>
            )}

            {/* New question button */}
            <button
              onClick={reset}
              className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition"
            >
              別の問題を聞く
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
