"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "back"];

function trimNumber(n, decimals) {
  return String(Number(n.toFixed(decimals)));
}

// Snaps to the step grid so 1.37 + 0.1 gives 1.4, not 1.47.
function nudgeValue(current, step, direction) {
  const units = Math.round(current * 1000) / 1000 / step;
  return direction > 0
    ? (Math.floor(units + 1e-6) + 1) * step
    : Math.max(0, (Math.ceil(units - 1e-6) - 1) * step);
}

/**
 * Touch keypad in a popup. Every key press updates the line straight away; the first
 * digit replaces the current value, like a selected input.
 */
export default function NumberPad({
  title,
  tabs = [],
  activeTab,
  onTabChange,
  value,
  onChange,
  presets = [],
  step,
  decimals = 2,
  unit,
  summary,
  onClose,
}) {
  const initial = parseFloat(value);
  const [text, setText] = useState(Number.isFinite(initial) && initial > 0 ? trimNumber(initial, decimals) : "");
  const [fresh, setFresh] = useState(true);
  const current = parseFloat(text) || 0;

  const commit = (next, replaceOnType) => {
    setText(next);
    setFresh(replaceOnType);
    onChange(next);
  };

  const setNumber = (n) => commit(n > 0 ? trimNumber(n, decimals) : "", true);

  const press = (key) => {
    if (key === "back") {
      commit(text.slice(0, -1), false);
      return;
    }
    const base = fresh ? "" : text;
    if (key === ".") {
      if (decimals === 0 || base.includes(".")) return;
      commit(`${base || "0"}.`, false);
      return;
    }
    const fraction = base.split(".")[1];
    if (fraction != null && fraction.length >= decimals) return;
    commit(base === "0" ? key : base + key, false);
  };

  useEffect(() => {
    const onKey = (e) => {
      if (/^[0-9]$/.test(e.key)) press(e.key);
      else if (e.key === "." || e.key === ",") press(".");
      else if (e.key === "Backspace") press("back");
      else if (e.key === "Enter" || e.key === "Escape") onClose();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const nudgeButton = (direction) => (
    <button
      type="button"
      onClick={() => setNumber(nudgeValue(current, step, direction))}
      disabled={direction < 0 && current <= 0}
      className={`h-14 w-16 shrink-0 select-none touch-manipulation rounded-xl text-lg font-bold active:scale-95 disabled:opacity-40 ${
        direction > 0 ? "bg-gray-900 text-white" : "border border-gray-300 bg-white text-gray-800"
      }`}
    >
      {direction > 0 ? "+" : "−"}
      {step}
    </button>
  );

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-sm select-none rounded-t-2xl bg-white p-3 shadow-xl sm:rounded-2xl">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="min-w-0 truncate text-base font-bold text-gray-900">{title}</p>
          {tabs.length > 1 && (
            <div className="flex shrink-0 rounded-lg bg-gray-100 p-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onTabChange(tab.id)}
                  className={`min-h-[40px] min-w-[56px] rounded-md px-3 text-sm font-bold touch-manipulation ${
                    activeTab === tab.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mb-3 flex items-center gap-2">
          {step ? nudgeButton(-1) : null}
          <div className="flex min-h-[56px] min-w-0 flex-1 items-baseline justify-center gap-1 rounded-xl bg-gray-100 px-3 py-2 tabular-nums">
            <span className={`truncate text-3xl font-bold ${text ? "text-gray-900" : "text-gray-400"}`}>
              {text || "0"}
            </span>
            {unit && <span className="text-base font-semibold text-gray-500">{unit}</span>}
          </div>
          {step ? nudgeButton(1) : null}
        </div>

        {presets.length > 0 && (
          <div className="mb-3 grid grid-cols-3 gap-2">
            {presets.map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() => setNumber(preset.value)}
                className={`min-h-[48px] rounded-xl border text-lg font-bold touch-manipulation active:scale-95 ${
                  Math.abs(current - preset.value) < 1e-9
                    ? "border-blue-900 bg-blue-900 text-white"
                    : "border-blue-200 bg-blue-50 text-blue-900"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-3 gap-2">
          {KEYS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => press(key)}
              disabled={key === "." && decimals === 0}
              aria-label={key === "back" ? "Delete" : key}
              className="min-h-[56px] rounded-xl border border-gray-200 bg-white text-2xl font-semibold text-gray-900 touch-manipulation active:scale-95 active:bg-gray-100 disabled:opacity-30"
            >
              {key === "back" ? "⌫" : key}
            </button>
          ))}
        </div>

        <div className="mt-3 flex items-center gap-2">
          {summary && <p className="min-w-0 flex-1 text-sm font-semibold tabular-nums text-gray-700">{summary}</p>}
          <button
            type="button"
            onClick={onClose}
            className={`min-h-[56px] rounded-xl bg-green-600 px-8 text-lg font-bold text-white touch-manipulation active:bg-green-800 ${
              summary ? "" : "flex-1"
            }`}
          >
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
