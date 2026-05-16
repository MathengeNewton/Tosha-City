"use client";

import { emptyLine, sumLines } from "../../../../lib/splitPayment";

export default function SplitPaymentFields({ lines, onChange, saleTotal }) {
  const total = Number(saleTotal) || 0;
  const sum = sumLines(lines);
  const remaining = total - sum;

  const updateLine = (index, patch) => {
    const next = lines.map((l, i) => (i === index ? { ...l, ...patch } : l));
    onChange(next);
  };

  const addLine = () => onChange([...lines, emptyLine()]);

  const removeLine = (index) => {
    if (lines.length <= 1) return;
    onChange(lines.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      {lines.map((line, index) => (
        <div key={index} className="border border-gray-200 rounded-lg p-3 space-y-2 bg-gray-50/50">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Payment {index + 1}</span>
            {lines.length > 1 && (
              <button
                type="button"
                onClick={() => removeLine(index)}
                className="text-xs text-red-600 hover:text-red-800"
              >
                Remove
              </button>
            )}
          </div>
          <select
            value={line.method}
            onChange={(e) =>
              updateLine(index, {
                method: e.target.value,
                mpesaReference: e.target.value === "CASH" ? "" : line.mpesaReference,
              })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-base min-h-[44px]"
          >
            <option value="CASH">Cash</option>
            <option value="MPESA">M-Pesa</option>
          </select>
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="Amount"
            value={line.amount}
            onChange={(e) => updateLine(index, { amount: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-base min-h-[44px]"
          />
          {line.method === "MPESA" && (
            <input
              type="text"
              placeholder="M-Pesa reference"
              value={line.mpesaReference}
              onChange={(e) => updateLine(index, { mpesaReference: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-base min-h-[44px]"
            />
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={addLine}
        className="text-sm text-blue-700 hover:text-blue-900 font-medium"
      >
        + Add payment line
      </button>
      <p
        className={`text-sm font-medium ${
          Math.abs(remaining) < 0.01 ? "text-green-700" : "text-amber-700"
        }`}
      >
        Total due: KES {total.toFixed(2)} · Entered: KES {sum.toFixed(2)}
        {Math.abs(remaining) >= 0.01 && ` · Remaining: KES ${remaining.toFixed(2)}`}
      </p>
    </div>
  );
}
