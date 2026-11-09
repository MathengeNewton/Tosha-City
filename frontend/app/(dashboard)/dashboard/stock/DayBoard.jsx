"use client";

import { useMemo } from "react";

function fmt(value) {
  return Number(value || 0).toLocaleString("en-KE", { maximumFractionDigits: 2 });
}

function kes(value) {
  return `KES ${Number(value || 0).toLocaleString("en-KE", { maximumFractionDigits: 0 })}`;
}

/** Session tabs grouped by the stage of the day they belong to. */
export function stageTabs(isAdmin) {
  return [
    { stage: null, tabs: [{ id: "overview", label: "Overview" }] },
    {
      stage: "Morning",
      tabs: [
        { id: "opening", label: "Opening" },
        { id: "incoming", label: "Incoming" },
      ],
    },
    {
      stage: "Kitchen",
      tabs: [
        { id: "production", label: "Batches & shelf" },
        { id: "kitchen", label: "Kitchen supplies" },
      ],
    },
    {
      stage: "Selling",
      tabs: [
        { id: "sales", label: "Sales" },
        { id: "stock-share", label: "Stock share" },
      ],
    },
    {
      stage: "Close",
      tabs: [
        { id: "closing", label: "Closing count" },
        { id: "wastages", label: "Wastage" },
        ...(isAdmin ? [{ id: "adjustments", label: "Adjustments" }] : []),
      ],
    },
  ];
}

export function StageTabNav({ activeTab, onSelect, isAdmin }) {
  return (
    <nav className="flex overflow-x-auto px-2" aria-label="Session sections">
      {stageTabs(isAdmin).map((group, gi) => (
        <div key={group.stage || "overview"} className={`flex shrink-0 flex-col ${gi > 0 ? "ml-3 border-l border-gray-200 pl-3" : ""}`}>
          <span className="h-5 px-3 pt-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
            {group.stage || "\u00a0"}
          </span>
          <div className="flex">
            {group.tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelect(tab.id)}
                className={`-mb-px whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium ${
                  activeTab === tab.id
                    ? "border-blue-900 text-blue-900"
                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

/** The four stages of a day with live status; each card jumps to its tab. */
export function DayStages({ session, flow, activeTab, onSelect }) {
  const s = flow?.summary;
  const closed = session?.status !== "OPEN";
  const stages = [
    {
      key: "morning",
      name: "Morning",
      tab: "opening",
      tabs: ["opening", "incoming"],
      state: s?.openingLines > 0 ? "done" : closed ? "done" : "todo",
      line: s ? `${s.openingLines} opening lines · ${s.incomingLines} deliveries` : "—",
    },
    {
      key: "kitchen",
      name: "Kitchen",
      tab: "production",
      tabs: ["production", "kitchen"],
      state: closed ? "done" : s?.batches > 0 ? "live" : "todo",
      line: s
        ? s.batches > 0
          ? `${s.batches} ${s.batches === 1 ? "batch" : "batches"} · ${kes(s.kitchenValueLeft)} on till`
          : "Nothing cooked yet"
        : "—",
      alert: s?.lowCount > 0 ? `${s.lowCount} running low` : s?.soldOutCount > 0 ? `${s.soldOutCount} sold out` : null,
    },
    {
      key: "selling",
      name: "Selling",
      tab: "sales",
      tabs: ["sales", "stock-share"],
      state: closed ? "done" : s?.salesCount > 0 ? "live" : "todo",
      line: s ? (s.revenue !== undefined ? `${s.salesCount} sales · ${kes(s.revenue)}` : `${s.salesCount} sales`) : "—",
      alert: s?.unpaid > 0 ? `${kes(s.unpaid)} unpaid (${s.unpaidCount})` : null,
    },
    {
      key: "close",
      name: "Close",
      tab: "closing",
      tabs: ["closing", "wastages", "adjustments"],
      state: closed ? "done" : s?.closingLines > 0 ? "live" : "todo",
      line: closed ? "Day closed" : s?.closingLines > 0 ? `${s.closingLines} items counted` : "Not started",
      alert: s?.wastageLines > 0 ? `${s.wastageLines} wastage entries` : null,
    },
  ];

  const dot = { done: "bg-emerald-500", live: "bg-blue-600", todo: "bg-gray-300" };
  const label = { done: "Done", live: "Live", todo: "" };

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {stages.map((stage, i) => {
        const active = stage.tabs.includes(activeTab);
        return (
          <button
            key={stage.key}
            type="button"
            onClick={() => onSelect(stage.tab)}
            className={`rounded-xl border-2 bg-white px-4 py-3 text-left transition ${
              active ? "border-blue-900" : "border-gray-200 hover:border-gray-400"
            }`}
          >
            <span className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${dot[stage.state]}`} />
              <span className="text-xs text-gray-400">{i + 1}</span>
              <span className="font-semibold text-gray-900">{stage.name}</span>
              <span className="ml-auto text-xs font-medium text-gray-500">{label[stage.state]}</span>
            </span>
            <span className="mt-1 block text-sm text-gray-700">{stage.line}</span>
            {stage.alert && <span className="mt-0.5 block text-xs font-semibold text-amber-700">{stage.alert}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** Stacked bar: how a row's starting quantity split up. */
function FlowBar({ parts, total }) {
  if (!(total > 0)) return <div className="h-2 w-full rounded-full bg-gray-100" />;
  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full bg-gray-100" role="img" aria-label="Where it went">
      {parts
        .filter((p) => p.value > 0)
        .map((p) => (
          <div
            key={p.key}
            className={p.className}
            style={{ width: `${Math.min(100, (p.value / total) * 100)}%` }}
            title={`${p.label}: ${fmt(p.value)}`}
          />
        ))}
    </div>
  );
}

const LEGEND = [
  { label: "Sold", className: "bg-blue-600" },
  { label: "Into kitchen", className: "bg-indigo-300" },
  { label: "Shared", className: "bg-slate-400" },
  { label: "Wasted", className: "bg-red-400" },
  { label: "Left", className: "bg-emerald-500" },
];

function cell(value, unit) {
  if (value === null || value === undefined) return <span className="text-gray-300">—</span>;
  if (Number(value) === 0) return <span className="text-gray-300">0</span>;
  return (
    <span>
      {fmt(value)}
      {unit ? <span className="ml-0.5 text-xs text-gray-400">{unit}</span> : null}
    </span>
  );
}

/**
 * Every product in this session, one row each in its own unit.
 * Read left to right: what came in, where it went, what is left.
 */
export function ProductFlow({ flow, productionRuns = [] }) {
  const { madeFrom, wentInto } = useMemo(() => {
    const from = new Map();
    const into = new Map();
    for (const run of productionRuns) {
      const outId = run.finishedProduct?.id ?? run.finishedProductId;
      const outName = run.finishedProduct?.name;
      for (const ing of run.ingredients || []) {
        if (!ing.productId && !ing.product?.id) continue;
        const inId = ing.product?.id ?? ing.productId;
        const inName = ing.product?.name || ing.ingredientName;
        const fromMap = from.get(outId) || new Map();
        const prev = fromMap.get(inId) || { name: inName, unit: ing.unit, qty: 0 };
        prev.qty += Number(ing.actualQuantity || 0);
        fromMap.set(inId, prev);
        from.set(outId, fromMap);
        if (outName) {
          const set = into.get(inId) || new Set();
          set.add(outName);
          into.set(inId, set);
        }
      }
    }
    return { madeFrom: from, wentInto: into };
  }, [productionRuns]);

  if (!flow?.rows) return null;

  const kitchen = flow.rows.filter((r) => r.lane === "KITCHEN" && (Number(r.made) > 0 || Number(r.sold) > 0));
  const notCooked = flow.rows.filter((r) => r.lane === "KITCHEN" && !(Number(r.made) > 0 || Number(r.sold) > 0));
  const counter = flow.rows.filter(
    (r) =>
      r.lane === "COUNTER" &&
      [r.start, r.toKitchen, r.sold, r.shared, r.wasted, r.adjusted].some((v) => Number(v) !== 0)
  );

  const header = (
    <tr className="text-left text-xs font-medium uppercase tracking-wide text-gray-500">
      <th className="px-3 py-2">Product</th>
      <th className="px-3 py-2 text-right">Start</th>
      <th className="px-3 py-2 text-right">To kitchen</th>
      <th className="px-3 py-2 text-right">Made</th>
      <th className="px-3 py-2 text-right">Sold</th>
      <th className="px-3 py-2 text-right">Shared</th>
      <th className="px-3 py-2 text-right">Wasted</th>
      <th className="px-3 py-2 text-right">Left</th>
      <th className="w-40 px-3 py-2">Where it went</th>
      <th className="px-3 py-2 text-right">Revenue</th>
    </tr>
  );

  const groupRow = (title, hint) => (
    <tr className="bg-gray-50">
      <td colSpan={10} className="px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-gray-700">
        {title} <span className="ml-1 font-normal normal-case tracking-normal text-gray-500">{hint}</span>
      </td>
    </tr>
  );

  const kitchenRow = (r) => {
    const made = Number(r.made || 0);
    const left = Math.max(0, Number(r.left || 0));
    const low = left > 0 && made > 0 && (left <= 2 || left <= made * 0.25);
    const from = [...(madeFrom.get(r.productId)?.values() || [])];
    return (
      <tr key={r.productId} className="align-top">
        <td className="px-3 py-2">
          <span className="font-medium text-gray-900">{r.name}</span>
          {from.length > 0 && (
            <span className="block text-xs text-gray-500">
              from {from.map((f) => `${fmt(f.qty)} ${f.unit} ${f.name}`).join(", ")}
            </span>
          )}
        </td>
        <td className="px-3 py-2 text-right text-gray-300">—</td>
        <td className="px-3 py-2 text-right text-gray-300">—</td>
        <td className="px-3 py-2 text-right tabular-nums text-gray-900">{cell(made, r.unit)}</td>
        <td className="px-3 py-2 text-right tabular-nums text-gray-700">{cell(r.sold)}</td>
        <td className="px-3 py-2 text-right text-gray-300">—</td>
        <td className="px-3 py-2 text-right tabular-nums text-gray-700">{cell(r.wasted)}</td>
        <td className={`px-3 py-2 text-right font-semibold tabular-nums ${low ? "text-amber-700" : left <= 0 ? "text-red-700" : "text-gray-900"}`}>
          {left <= 0 ? "Sold out" : fmt(left)}
        </td>
        <td className="px-3 py-2 pt-3">
          <FlowBar
            total={made + Number(r.adjusted || 0)}
            parts={[
              { key: "sold", label: "Sold", value: Number(r.sold || 0), className: "bg-blue-600" },
              { key: "wasted", label: "Wasted", value: Number(r.wasted || 0), className: "bg-red-400" },
              { key: "left", label: "Left", value: left, className: "bg-emerald-500" },
            ]}
          />
        </td>
        <td className="px-3 py-2 text-right tabular-nums text-gray-700">{Number(r.revenue) > 0 ? kes(r.revenue) : ""}</td>
      </tr>
    );
  };

  const counterRow = (r) => {
    const start = Number(r.start || 0) + Math.max(0, Number(r.adjusted || 0));
    const into = [...(wentInto.get(r.productId) || [])];
    const byproduct = r.left === null;
    return (
      <tr key={r.productId} className="align-top">
        <td className="px-3 py-2">
          <span className="font-medium text-gray-900">{r.name}</span>
          {into.length > 0 && <span className="block text-xs text-indigo-700">into {into.join(", ")}</span>}
          {byproduct && <span className="block text-xs text-gray-500">sold from its parent&apos;s stock</span>}
          {r.sharedPool && !byproduct && <span className="block text-xs text-gray-400">all-branch stock</span>}
        </td>
        <td className="px-3 py-2 text-right tabular-nums text-gray-900">{cell(r.start, r.unit)}</td>
        <td className="px-3 py-2 text-right tabular-nums text-indigo-700">{cell(r.toKitchen)}</td>
        <td className="px-3 py-2 text-right text-gray-300">—</td>
        <td className="px-3 py-2 text-right tabular-nums text-gray-700">{cell(r.sold)}</td>
        <td className="px-3 py-2 text-right tabular-nums text-gray-700">{cell(r.shared)}</td>
        <td className="px-3 py-2 text-right tabular-nums text-gray-700">{cell(r.wasted)}</td>
        <td className={`px-3 py-2 text-right font-semibold tabular-nums ${Number(r.left) < 0 ? "text-red-700" : "text-gray-900"}`}>
          {byproduct ? <span className="text-gray-300">—</span> : fmt(r.left)}
        </td>
        <td className="px-3 py-2 pt-3">
          {!byproduct && (
            <FlowBar
              total={start}
              parts={[
                { key: "sold", label: "Sold", value: Number(r.sold || 0), className: "bg-blue-600" },
                { key: "kitchen", label: "Into kitchen", value: Number(r.toKitchen || 0), className: "bg-indigo-300" },
                { key: "shared", label: "Shared", value: Number(r.shared || 0), className: "bg-slate-400" },
                { key: "wasted", label: "Wasted", value: Number(r.wasted || 0), className: "bg-red-400" },
                { key: "left", label: "Left", value: Math.max(0, Number(r.left || 0)), className: "bg-emerald-500" },
              ]}
            />
          )}
        </td>
        <td className="px-3 py-2 text-right tabular-nums text-gray-700">{Number(r.revenue) > 0 ? kes(r.revenue) : ""}</td>
      </tr>
    );
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-col gap-2 border-b border-gray-100 px-4 py-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Where today&apos;s stock went</h3>
          <p className="text-xs text-gray-500">
            One row per product, in its own unit. Counter stock comes in, some goes into the kitchen, the kitchen&apos;s
            output is what the till sells.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-gray-600">
          {LEGEND.map((l) => (
            <span key={l.label} className="inline-flex items-center gap-1">
              <span className={`h-2 w-3 rounded-sm ${l.className}`} />
              {l.label}
            </span>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-100 text-sm">
          <thead>{header}</thead>
          <tbody className="divide-y divide-gray-100">
            {kitchen.length > 0 && groupRow("From the kitchen", "made / sold / left — the till's top lane")}
            {kitchen.map(kitchenRow)}
            {notCooked.length > 0 && (
              <tr>
                <td colSpan={10} className="px-3 py-2 text-xs text-gray-500">
                  Not cooked yet: {notCooked.map((r) => r.name).join(", ")}
                </td>
              </tr>
            )}
            {counter.length > 0 && groupRow("Counter", "opening + deliveries, and where they went")}
            {counter.map(counterRow)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
