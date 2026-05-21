"use client";

import { useRef, useState, useEffect } from "react";

type Rect = { x: number; y: number; w: number; h: number };

type Props = {
  src: string;
  onConfirm: (croppedDataUrl: string, croppedBase64: string, mimeType: string) => void;
  onUseWhole: () => void;
  onCancel: () => void;
};

export default function ImageCropper({ src, onConfirm, onUseWhole, onCancel }: Props) {
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<Rect | null>(null);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  // タッチイベントをpassive: falseで登録してスクロール干渉を防ぐ
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const pos = getTouchPos(e);
      setStartPos(pos);
      setDragging(true);
      setSelection(null);
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (!dragging) return;
      updateSelection(e);
    };

    const onTouchEnd = () => setDragging(false);

    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging, startPos]);

  function getContainerOffset() {
    const el = containerRef.current;
    if (!el) return { left: 0, top: 0 };
    const r = el.getBoundingClientRect();
    return { left: r.left, top: r.top };
  }

  function getTouchPos(e: TouchEvent): { x: number; y: number } {
    const { left, top } = getContainerOffset();
    return {
      x: e.touches[0].clientX - left,
      y: e.touches[0].clientY - top,
    };
  }

  function getMousePos(e: React.MouseEvent): { x: number; y: number } {
    const { left, top } = getContainerOffset();
    return { x: e.clientX - left, y: e.clientY - top };
  }

  function updateSelection(e: TouchEvent | React.MouseEvent) {
    if (!startPos) return;
    let curX: number, curY: number;

    if ("touches" in e) {
      const { left, top } = getContainerOffset();
      curX = e.touches[0].clientX - left;
      curY = e.touches[0].clientY - top;
    } else {
      const { left, top } = getContainerOffset();
      curX = (e as React.MouseEvent).clientX - left;
      curY = (e as React.MouseEvent).clientY - top;
    }

    const x = Math.min(startPos.x, curX);
    const y = Math.min(startPos.y, curY);
    const w = Math.abs(curX - startPos.x);
    const h = Math.abs(curY - startPos.y);
    setSelection({ x, y, w, h });
  }

  function handleMouseDown(e: React.MouseEvent) {
    const pos = getMousePos(e);
    setStartPos(pos);
    setDragging(true);
    setSelection(null);
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!dragging) return;
    updateSelection(e);
  }

  function handleMouseUp() {
    setDragging(false);
  }

  // 表示されている画像の実際の位置・サイズを計算（object-contain のレターボックス考慮）
  function getRenderedImageRect() {
    const img = imgRef.current;
    const container = containerRef.current;
    if (!img || !container || !imgLoaded) return null;

    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const naturalAspect = img.naturalWidth / img.naturalHeight;
    const containerAspect = cw / ch;

    let iw: number, ih: number, il: number, it: number;
    if (naturalAspect > containerAspect) {
      iw = cw;
      ih = cw / naturalAspect;
      il = 0;
      it = (ch - ih) / 2;
    } else {
      ih = ch;
      iw = ch * naturalAspect;
      il = (cw - iw) / 2;
      it = 0;
    }

    return { left: il, top: it, width: iw, height: ih };
  }

  function handleConfirm() {
    const img = imgRef.current;
    if (!img || !selection) return;

    const ir = getRenderedImageRect();
    if (!ir) return;

    // コンテナ座標 → 画像内相対座標
    const relX = Math.max(0, selection.x - ir.left);
    const relY = Math.max(0, selection.y - ir.top);
    const relW = Math.min(selection.w, ir.width - (selection.x - ir.left));
    const relH = Math.min(selection.h, ir.height - (selection.y - ir.top));

    if (relW <= 0 || relH <= 0) return;

    // 表示サイズ → 自然サイズにスケール
    const sx = img.naturalWidth / ir.width;
    const sy = img.naturalHeight / ir.height;

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(relW * sx);
    canvas.height = Math.round(relH * sy);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(
      img,
      relX * sx,
      relY * sy,
      relW * sx,
      relH * sy,
      0,
      0,
      canvas.width,
      canvas.height
    );

    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    const base64 = dataUrl.split(",")[1];
    onConfirm(dataUrl, base64, "image/jpeg");
  }

  const hasValidSelection = selection && selection.w > 10 && selection.h > 10;

  return (
    <div className="space-y-3">
      <p className="text-center text-sm font-medium text-indigo-700">
        📐 問題の範囲をドラッグして選んでください
      </p>

      <div
        ref={containerRef}
        className="relative bg-gray-800 rounded-xl overflow-hidden select-none"
        style={{ height: "min(58vh, 420px)", cursor: "crosshair", touchAction: "none" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={src}
          alt="問題の写真"
          className="w-full h-full object-contain pointer-events-none"
          draggable={false}
          onLoad={() => setImgLoaded(true)}
        />

        {/* 選択範囲オーバーレイ */}
        {hasValidSelection && (
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ overflow: "visible" }}
          >
            <defs>
              <mask id="imcrop-mask">
                <rect width="100%" height="100%" fill="white" />
                <rect
                  x={selection!.x}
                  y={selection!.y}
                  width={selection!.w}
                  height={selection!.h}
                  fill="black"
                />
              </mask>
            </defs>
            {/* 範囲外を暗くする */}
            <rect
              width="100%"
              height="100%"
              fill="rgba(0,0,0,0.55)"
              mask="url(#imcrop-mask)"
            />
            {/* 選択枠 */}
            <rect
              x={selection!.x}
              y={selection!.y}
              width={selection!.w}
              height={selection!.h}
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeDasharray="8 4"
            />
            {/* 四隅のハンドル */}
            {[
              [selection!.x, selection!.y],
              [selection!.x + selection!.w, selection!.y],
              [selection!.x, selection!.y + selection!.h],
              [selection!.x + selection!.w, selection!.y + selection!.h],
            ].map(([cx, cy], i) => (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r={6}
                fill="white"
                stroke="#6366f1"
                strokeWidth={2.5}
              />
            ))}
          </svg>
        )}

        {/* 操作ガイド（未選択時） */}
        {!hasValidSelection && imgLoaded && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-black/50 text-white text-xs px-3 py-1.5 rounded-full">
              ドラッグして範囲を選択
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition"
        >
          キャンセル
        </button>
        <button
          type="button"
          onClick={onUseWhole}
          className="flex-1 border border-indigo-300 text-indigo-600 py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-50 transition"
        >
          全体を使う
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!hasValidSelection}
          className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          確定
        </button>
      </div>
    </div>
  );
}
