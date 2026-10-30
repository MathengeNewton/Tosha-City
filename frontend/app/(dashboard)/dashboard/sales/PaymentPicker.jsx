"use client";

// Payment is { method, mpesaChannel, reference }. M-Pesa needs till or paybill plus the code;
// a PDQ (card machine) slip reference is optional; cash needs nothing.

const METHODS = [
  { id: "CASH", label: "Cash" },
  { id: "MPESA", label: "M-Pesa" },
  { id: "PDQ", label: "Card (PDQ)" },
];

export function paymentLabel(method, mpesaChannel) {
  if (method === "MPESA") {
    if (mpesaChannel === "TILL") return "M-Pesa Till";
    if (mpesaChannel === "PAYBILL") return "M-Pesa Paybill";
    return "M-Pesa";
  }
  if (method === "PDQ") return "Card (PDQ)";
  if (method === "CREDIT") return "Credit";
  return "Cash";
}

export function emptyPayment(method) {
  const start = METHODS.some((m) => m.id === method) ? method : "CASH";
  return { method: start, mpesaChannel: start === "MPESA" ? "TILL" : "", reference: "" };
}

/** First problem with the payment, or null when it can be recorded. */
export function paymentProblem(payment) {
  if (payment.method === "MPESA") {
    if (!payment.mpesaChannel) return "Choose till or paybill";
    if (!payment.reference.trim()) return "Enter the M-Pesa code";
  }
  return null;
}

export function paymentPayload(payment) {
  const reference = payment.reference.trim();
  if (payment.method === "MPESA") {
    return { method: "MPESA", mpesaChannel: payment.mpesaChannel, reference: reference.toUpperCase() };
  }
  if (payment.method === "PDQ") return { method: "PDQ", reference: reference || undefined };
  return { method: payment.method };
}

function choiceClass(active) {
  return `min-h-[48px] rounded-xl px-3 text-sm font-bold ${
    active ? "bg-blue-900 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
  }`;
}

const inputClass =
  "w-full min-h-[48px] rounded-xl border border-gray-300 bg-white px-3 py-2 text-base focus:border-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20";

export default function PaymentPicker({ value, onChange, settings }) {
  const set = (patch) => onChange({ ...value, ...patch });
  const till = settings?.tillNumber;
  const paybill = settings?.paybillNumber;
  const account = settings?.paybillAccount;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {METHODS.map((method) => (
          <button
            key={method.id}
            type="button"
            onClick={() =>
              set({
                method: method.id,
                mpesaChannel: method.id === "MPESA" ? value.mpesaChannel || "TILL" : "",
                reference: method.id === value.method ? value.reference : "",
              })
            }
            className={choiceClass(value.method === method.id)}
          >
            {method.label}
          </button>
        ))}
      </div>

      {value.method === "MPESA" && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => set({ mpesaChannel: "TILL" })}
              className={`${choiceClass(value.mpesaChannel === "TILL")} py-2 text-left leading-tight`}
            >
              Till
              {till && <span className="block text-xs font-normal opacity-80">{till}</span>}
            </button>
            <button
              type="button"
              onClick={() => set({ mpesaChannel: "PAYBILL" })}
              className={`${choiceClass(value.mpesaChannel === "PAYBILL")} py-2 text-left leading-tight`}
            >
              Paybill
              {paybill && (
                <span className="block text-xs font-normal opacity-80">
                  {paybill}
                  {account ? ` · Acc ${account}` : ""}
                </span>
              )}
            </button>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">M-Pesa code *</label>
            <input
              type="text"
              value={value.reference}
              onChange={(e) => set({ reference: e.target.value.toUpperCase() })}
              placeholder="e.g. SJK3H2X9PL"
              autoCapitalize="characters"
              className={`${inputClass} uppercase tracking-wide`}
              required
            />
          </div>
        </>
      )}

      {value.method === "PDQ" && (
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">PDQ reference</label>
          <input
            type="text"
            value={value.reference}
            onChange={(e) => set({ reference: e.target.value })}
            placeholder="Slip or approval number"
            className={inputClass}
          />
        </div>
      )}
    </div>
  );
}
