"use client";

import { useState, useRef, useEffect } from "react";
import type { ChatMessage } from "@/app/api/chat/route";

type SchoolLevel = "elementary" | "middle" | "high";

type Subject = { value: string; label: string; emoji: string; school: SchoolLevel | "all" };
type Grade   = { value: string; label: string; school: SchoolLevel };

const SUBJECTS: Subject[] = [
  { value: "arithmetic",   label: "算数",          emoji: "🔢", school: "elementary" },
  { value: "math_middle",  label: "数学",          emoji: "📐", school: "middle" },
  { value: "math_high",    label: "数学",          emoji: "📐", school: "high" },
  { value: "physics",      label: "物理",          emoji: "⚡", school: "high" },
  { value: "chemistry",    label: "化学",          emoji: "🧪", school: "high" },
  { value: "biology",      label: "生物",          emoji: "🌿", school: "high" },
  { value: "earth_science",label: "地学",          emoji: "🌏", school: "high" },
  { value: "j_lit",        label: "現代文",        emoji: "📰", school: "high" },
  { value: "classical",    label: "古文・漢文",    emoji: "📜", school: "high" },
  { value: "world_history",label: "世界史",        emoji: "🏛️", school: "high" },
  { value: "jpn_history",  label: "日本史",        emoji: "⛩️", school: "high" },
  { value: "geography",    label: "地理",          emoji: "🗾", school: "high" },
  { value: "civics",       label: "政治・経済・倫理", emoji: "⚖️", school: "high" },
  { value: "info",         label: "情報",          emoji: "💻", school: "high" },
  { value: "japanese",     label: "国語",          emoji: "📖", school: "all" },
  { value: "science",      label: "理科",          emoji: "🔬", school: "all" },
  { value: "social",       label: "社会",          emoji: "🌍", school: "all" },
  { value: "english",      label: "英語",          emoji: "🗣️", school: "all" },
  { value: "moral",        label: "道徳",          emoji: "🌱", school: "all" },
  { value: "music",        label: "音楽",          emoji: "🎵", school: "all" },
  { value: "art",          label: "図画工作・美術", emoji: "🎨", school: "all" },
  { value: "pe",           label: "体育・保健",    emoji: "⚽", school: "all" },
  { value: "home",         label: "家庭科・技術",  emoji: "🍳", school: "all" },
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

const SCHOOL_TABS: { level: SchoolLevel; label: string }[] = [
  { level: "elementary", label: "小学校" },
  { level: "middle",     label: "中学校" },
  { level: "high",       label: "高校" },
];

export default function StandaloneChat() {
  const [schoolLevel, setSchoolLevel] = useState<SchoolLevel>("elementary");
  const [grade,   setGrade]   = useState("小学4年生");
  const [subject, setSubject] = useState("arithmetic");
  const [settingsOpen, setSettingsOpen] = useState(true);
  const [started, setStarted] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input,   setInput]   = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const bottomRef   = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function handleSchoolChange(level: SchoolLevel) {
    setSchoolLevel(level);
    setGrade(DEFAULT_GRADE[level]);
    setSubject(DEFAULT_SUBJECT[level]);
  }

  // チャット開始：先生のあいさつを取得
  async function handleStart() {
    setSettingsOpen(false);
    setStarted(true);
    setLoading(true);

    const greetingMessages: ChatMessage[] = [{ role: "student", content: "はじめまして" }];

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: greetingMessages, subject, grade, mode: "standalone" }),
    });

    setLoading(false);
    if (res.ok) {
      const data = await res.json();
      setMessages([{ role: "tutor", content: data.reply }]);
    }
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    const newMessages: ChatMessage[] = [...messages, { role: "student", content: text }];
    setMessages(newMessages);
    setInput("");
    setError("");
    setLoading(true);
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: newMessages, subject, grade, mode: "standalone" }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "エラーが発生しました");
      return;
    }

    const data = await res.json();
    setMessages([...newMessages, { role: "tutor", content: data.reply }]);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleTextareaInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  }

  function handleReset() {
    setMessages([]);
    setInput("");
    setError("");
    setStarted(false);
    setSettingsOpen(true);
  }

  const filteredSubjects = SUBJECTS.filter(
    (s) => s.school === schoolLevel || s.school === "all"
  );
  const filteredGrades = GRADES.filter((g) => g.school === schoolLevel);

  // ---- 設定パネル ----
  if (!started) {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-2xl shadow p-4 space-y-3">
          <p className="text-sm font-medium text-gray-700">学年・教科を選んでチャットを始めよう</p>

          {/* 学校区分 */}
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

          <button
            onClick={handleStart}
            className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition flex items-center justify-center gap-2"
          >
            <span>💬</span>
            先生とチャットを始める
          </button>
        </div>
      </div>
    );
  }

  // ---- チャット画面 ----
  return (
    <div className="flex flex-col" style={{ height: "calc(100dvh - 120px)" }}>
      {/* 教科バッジ＋リセット */}
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-2">
          <span className="text-xs bg-indigo-100 text-indigo-700 font-medium px-2 py-1 rounded-full">
            {grade}
          </span>
          <span className="text-xs bg-indigo-100 text-indigo-700 font-medium px-2 py-1 rounded-full">
            {SUBJECTS.find((s) => s.value === subject)?.emoji}{" "}
            {SUBJECTS.find((s) => s.value === subject)?.label}
          </span>
        </div>
        <button
          onClick={handleReset}
          className="text-xs text-gray-400 hover:text-gray-600 transition"
        >
          学年・教科を変える
        </button>
      </div>

      {/* メッセージ一覧 */}
      <div className="flex-1 overflow-y-auto bg-white rounded-2xl shadow p-3 space-y-3">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-2 ${msg.role === "student" ? "flex-row-reverse" : "flex-row"}`}
          >
            <div
              className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                msg.role === "student"
                  ? "bg-indigo-100 text-indigo-700"
                  : "bg-yellow-100 text-yellow-700"
              }`}
            >
              {msg.role === "student" ? "👤" : "👩‍🏫"}
            </div>
            <div
              className={`max-w-[78%] px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === "student"
                  ? "bg-indigo-600 text-white rounded-tr-sm"
                  : "bg-gray-100 text-gray-800 rounded-tl-sm"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-2">
            <div className="w-8 h-8 rounded-full bg-yellow-100 text-yellow-700 flex items-center justify-center text-sm flex-shrink-0">
              👩‍🏫
            </div>
            <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3">
              <span className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </span>
            </div>
          </div>
        )}

        {error && <p className="text-center text-xs text-red-500">{error}</p>}

        <div ref={bottomRef} />
      </div>

      {/* 入力エリア */}
      <div className="mt-2 bg-white rounded-2xl shadow flex gap-2 items-end p-3">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleTextareaInput}
          onKeyDown={handleKeyDown}
          placeholder="質問を入力（Enterで送信 / Shift+Enterで改行）"
          rows={1}
          disabled={loading}
          className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 overflow-hidden"
          style={{ minHeight: "38px" }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || loading}
          className="flex-shrink-0 w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center hover:bg-indigo-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
