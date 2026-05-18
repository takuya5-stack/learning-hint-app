"use client";

type HintCardProps = {
  index: number;
  content: string;
  revealed: boolean;
  onReveal?: () => void;
};

const HINT_COLORS = [
  "border-blue-200 bg-blue-50",
  "border-orange-200 bg-orange-50",
  "border-purple-200 bg-purple-50",
];

const HINT_HEADER_COLORS = [
  "text-blue-700",
  "text-orange-700",
  "text-purple-700",
];

const HINT_BADGE_COLORS = [
  "bg-blue-600",
  "bg-orange-500",
  "bg-purple-600",
];

export default function HintCard({ index, content, revealed, onReveal }: HintCardProps) {
  const colorClass = HINT_COLORS[index - 1] ?? HINT_COLORS[0];
  const headerColor = HINT_HEADER_COLORS[index - 1] ?? HINT_HEADER_COLORS[0];
  const badgeColor = HINT_BADGE_COLORS[index - 1] ?? HINT_BADGE_COLORS[0];

  if (!revealed && onReveal) {
    return (
      <button
        onClick={onReveal}
        className="w-full border-2 border-dashed border-gray-300 text-gray-500 font-medium py-3 rounded-2xl hover:border-indigo-300 hover:text-indigo-500 transition text-sm"
      >
        💡 ヒント{index}を見る
      </button>
    );
  }

  if (!revealed) return null;

  return (
    <div className={`rounded-2xl border-2 p-4 ${colorClass}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={`text-xs font-bold text-white px-2 py-0.5 rounded-full ${badgeColor}`}>
          ヒント {index}
        </span>
        <span className={`text-xs font-medium ${headerColor}`}>
          {index === 1 && "まず考えてみよう"}
          {index === 2 && "もう少し具体的に"}
          {index === 3 && "ここまで考えたら..."}
        </span>
      </div>
      <p className="text-gray-800 text-sm leading-relaxed">{content}</p>
    </div>
  );
}
