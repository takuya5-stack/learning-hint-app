"use client";

import { useState, useRef, useEffect } from "react";
import type { ChatMessage } from "@/app/api/chat/route";
import ImageCropper from "./ImageCropper";

type SchoolLevel = "elementary" | "middle" | "high";
type ChatType    = "study" | "consult";

type Grade = { value: string; label: string; school: SchoolLevel };

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

const SCHOOL_TABS: { level: SchoolLevel; label: string }[] = [
  { level: "elementary", label: "小学校" },
  { level: "middle",     label: "中学校" },
  { level: "high",       label: "高校" },
];

const DEFAULT_GRADE: Record<SchoolLevel, string> = {
  elementary: "小学4年生",
  middle:     "中学1年生",
  high:       "高校1年生",
};

const CHAT_TYPE_OPTIONS: { type: ChatType; emoji: string; label: string; desc: string }[] = [
  { type: "study",   emoji: "📚", label: "勉強",  desc: "わからないことを先生に聞く" },
  { type: "consult", emoji: "🤝", label: "相談",  desc: "悩みや困ったことを話す" },
];

export default function StandaloneChat() {
  const [schoolLevel, setSchoolLevel] = useState<SchoolLevel>("elementary");
  const [grade,       setGrade]       = useState("小学4年生");
  const [chatType,    setChatType]    = useState<ChatType>("study");
  const [started,     setStarted]     = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input,    setInput]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  // 画像関連
  const [cropSrc,      setCropSrc]      = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageData,    setImageData]    = useState<{ base64: string; mimeType: string } | null>(null);

  const bottomRef   = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function handleSchoolChange(level: SchoolLevel) {
    setSchoolLevel(level);
    setGrade(DEFAULT_GRADE[level]);
  }

  // ---- 画像処理 ----
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCropSrc(ev.target?.result as string);
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

  // ---- チャット開始 ----
  async function handleStart() {
    setStarted(true);
    setLoading(true);

    const greetingMessages: ChatMessage[] = [{ role: "student", content: "はじめまして" }];
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: greetingMessages, grade, chatType, mode: "standalone" }),
    });

    setLoading(false);
    if (res.ok) {
      const data = await res.json();
      setMessages([{ role: "tutor", content: data.reply }]);
    }
  }

  // ---- メッセージ送信 ----
  async function handleSend() {
    const text = input.trim();
    if ((!text && !imageData) || loading) return;

    // 表示用メッセージ（imagePreviewを含む）
    const newMessage: ChatMessage = {
      role: "student",
      content: text || "（画像を送りました）",
      imagePreview: imagePreview ?? undefined,
    };
    const newMessages: ChatMessage[] = [...messages, newMessage];
    setMessages(newMessages);
    setInput("");
    setError("");
    setLoading(true);
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    // 送信後に画像をクリア
    const sentImageData = imageData;
    setImagePreview(null);
    setImageData(null);
    if (fileInputRef.current) fileInputRef.current.value = "";

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        // APIに渡すmessages: imagePreviewは除外してサイズを減らす
        messages: newMessages.map(({ role, content }) => ({ role, content })),
        grade,
        chatType,
        mode: "standalone",
        imageBase64:  sentImageData?.base64 ?? null,
        imageMimeType: sentImageData?.mimeType ?? null,
      }),
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
    setImagePreview(null);
    setImageData(null);
    setCropSrc(null);
  }

  const filteredGrades  = GRADES.filter((g) => g.school === schoolLevel);
  const currentType     = CHAT_TYPE_OPTIONS.find((o) => o.type === chatType)!;
  const canSend         = !loading && (input.trim().length > 0 || imageData !== null);

  // ---- クロッパー表示中 ----
  if (cropSrc) {
    return (
      <div className="bg-white rounded-2xl shadow p-4">
        <ImageCropper
          src={cropSrc}
          onConfirm={handleCropConfirm}
          onUseWhole={handleCropUseWhole}
          onCancel={handleCropCancel}
        />
      </div>
    );
  }

  // ---- 開始前の設定画面 ----
  if (!started) {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-2xl shadow p-5 space-y-4">
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">何について話しますか？</p>
            <div className="grid grid-cols-2 gap-3">
              {CHAT_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.type}
                  type="button"
                  onClick={() => setChatType(opt.type)}
                  className={`flex flex-col items-center gap-1.5 py-4 rounded-2xl border-2 transition ${
                    chatType === opt.type
                      ? "border-indigo-500 bg-indigo-50"
                      : "border-gray-200 hover:border-indigo-200"
                  }`}
                >
                  <span className="text-3xl">{opt.emoji}</span>
                  <span className={`font-bold text-base ${chatType === opt.type ? "text-indigo-700" : "text-gray-700"}`}>
                    {opt.label}
                  </span>
                  <span className="text-xs text-gray-400">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">学年</p>
            <div className="flex rounded-xl overflow-hidden border border-indigo-200 mb-2">
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

          <button
            onClick={handleStart}
            className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition flex items-center justify-center gap-2"
          >
            <span>{currentType.emoji}</span>
            {currentType.label}を始める
          </button>
        </div>
      </div>
    );
  }

  // ---- チャット画面 ----
  return (
    <div className="flex flex-col" style={{ height: "calc(100dvh - 130px)" }}>
      {/* バッジ＋変更ボタン */}
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-2">
          <span className="text-xs bg-indigo-100 text-indigo-700 font-medium px-2 py-1 rounded-full">
            {grade}
          </span>
          <span className="text-xs bg-indigo-100 text-indigo-700 font-medium px-2 py-1 rounded-full">
            {currentType.emoji} {currentType.label}
          </span>
        </div>
        <button
          onClick={handleReset}
          className="text-xs text-gray-400 hover:text-gray-600 transition"
        >
          最初に戻る
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
                  : chatType === "consult"
                  ? "bg-green-100 text-green-700"
                  : "bg-yellow-100 text-yellow-700"
              }`}
            >
              {msg.role === "student" ? "👤" : chatType === "consult" ? "🤝" : "👩‍🏫"}
            </div>
            <div className={`max-w-[78%] space-y-1 ${msg.role === "student" ? "items-end flex flex-col" : ""}`}>
              {/* 画像 */}
              {msg.imagePreview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={msg.imagePreview}
                  alt="送った画像"
                  className="max-w-full max-h-48 rounded-xl border border-gray-200 object-contain bg-gray-50"
                />
              )}
              {/* テキストバブル */}
              {msg.content && (
                <div
                  className={`px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === "student"
                      ? "bg-indigo-600 text-white rounded-tr-sm"
                      : "bg-gray-100 text-gray-800 rounded-tl-sm"
                  }`}
                >
                  {msg.content}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${
              chatType === "consult" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
            }`}>
              {chatType === "consult" ? "🤝" : "👩‍🏫"}
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
      <div className="mt-2 bg-white rounded-2xl shadow p-3 space-y-2">
        {/* 画像プレビュー */}
        {imagePreview && (
          <div className="relative inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imagePreview}
              alt="添付画像"
              className="h-20 rounded-xl border border-gray-200 object-contain bg-gray-50"
            />
            <button
              onClick={removeImage}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600"
            >
              ✕
            </button>
          </div>
        )}

        <div className="flex gap-2 items-end">
          {/* 画像ボタン */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex-shrink-0 w-10 h-10 border border-gray-300 text-gray-500 rounded-xl flex items-center justify-center hover:bg-gray-50 transition text-lg"
            title="画像を送る"
          >
            📷
          </button>

          {/* テキスト入力 */}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleTextareaInput}
            onKeyDown={handleKeyDown}
            placeholder={chatType === "study" ? "質問を入力（Enterで送信）" : "話したいことを入力（Enterで送信）"}
            rows={1}
            disabled={loading}
            className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 overflow-hidden"
            style={{ minHeight: "38px" }}
          />

          {/* 送信ボタン */}
          <button
            onClick={handleSend}
            disabled={!canSend}
            className="flex-shrink-0 w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center hover:bg-indigo-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
