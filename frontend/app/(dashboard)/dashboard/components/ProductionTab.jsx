"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "react-toastify";
import { apiClient } from "../../../../lib/api";
import { useAuth } from "../../../../contexts/AuthContext";
import { BeakerIcon, CheckIcon, InformationCircleIcon } from "@heroicons/react/24/outline";

function recipeMatchesBranch(recipe, branchType) {
  if (!recipe) return false;
  if (recipe.branchScope === "ALL") return true;
  return recipe.branchScope === branchType;
}

const inputClass =
  "w-full min-h-[44px] rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-[#0D47A1] focus:outline-none focus:ring-2 focus:ring-[#0D47A1]/25";

function fmt(value) {
  return Number(value || 0).toLocaleString("en-KE", { maximumFractionDigits: 2 });
}

function kes(value) {
  return `KES ${Number(value || 0).toLocaleString("en-KE", { maximumFractionDigits: 0 })}`;
}

function shelfStatus(row) {
  const left = Number(row.left || 0);
  const made = Number(row.made || 0);
  if (made <= 0 && left <= 0) return "notCooked";
  if (left <= 0) return "soldOut";
  if (made > 0 && (left <= 2 || left <= made * 0.25)) return "low";
  return "ok";
}

function timeOf(value) {
  return value ? new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "—";
}

/** One row per prepared item: made, sold, left, with its batches folded underneath. */
function Shelf({ rows, runsByProduct, loading, showValue }) {
  const cooked = rows.filter((row) => shelfStatus(row) !== "notCooked");
  const notCooked = rows.filter((row) => shelfStatus(row) === "notCooked");
  const valueLeft = cooked.reduce((sum, row) => sum + Math.max(0, Number(row.left || 0)) * Number(row.price || 0), 0);

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-baseline justify-between gap-2 border-b border-gray-100 px-4 py-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900">On the shelf now</h2>
          <p className="text-xs text-gray-500">Exactly what the till shows under &ldquo;From the kitchen&rdquo;.</p>
        </div>
        {showValue && cooked.length > 0 && (
          <span className="text-sm font-semibold tabular-nums text-gray-700">{kes(valueLeft)}</span>
        )}
      </div>
      <div className="space-y-3 p-4">
        {loading && cooked.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-500">Loading…</p>
        ) : cooked.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-600">
            Nothing cooked yet this session. Each batch you send appears here and on the till.
          </p>
        ) : (
          cooked.map((row) => {
            const status = shelfStatus(row);
            const made = Number(row.made || 0);
            const left = Math.max(0, Number(row.left || 0));
            const pct = made > 0 ? Math.min(100, (left / made) * 100) : 0;
            const runs = runsByProduct.get(row.productId) || [];
            return (
              <div
                key={row.productId}
                className={`rounded-lg border px-3 py-3 ${
                  status === "low" ? "border-amber-300 bg-amber-50/40" : status === "soldOut" ? "border-gray-200 bg-gray-50" : "border-gray-200"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900">{row.name}</span>
                  {status === "low" && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">Low · cook again</span>
                  )}
                  {status === "soldOut" && (
                    <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-semibold text-gray-700">Sold out</span>
                  )}
                  <span className="ml-auto text-sm font-bold tabular-nums text-gray-900">
                    {fmt(left)} {row.unit} left
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className={`h-full rounded-full ${status === "low" ? "bg-amber-500" : status === "soldOut" ? "bg-gray-300" : "bg-emerald-500"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <details className="group mt-2">
                  <summary className="flex cursor-pointer list-none items-center justify-between text-xs text-gray-500 marker:hidden [&::-webkit-details-marker]:hidden">
                    <span>
                      {fmt(made)} made · {fmt(row.sold)} sold
                      {Number(row.wasted) > 0 ? ` · ${fmt(row.wasted)} wasted` : ""}
                    </span>
                    <span className="font-medium text-blue-900">
                      {runs.length} {runs.length === 1 ? "batch" : "batches"}
                      <span className="group-open:hidden"> ▾</span>
                      <span className="hidden group-open:inline"> ▴</span>
                    </span>
                  </summary>
                  <ul className="mt-2 divide-y divide-gray-100 rounded-md border border-gray-100 bg-white text-xs">
                    {runs.map((run) => (
                      <li key={run.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
                        <span className="font-medium text-gray-800">{timeOf(run.recordedAt)}</span>
                        <span className="text-gray-600">{run.recipe?.name}</span>
                        <span className="ml-auto tabular-nums text-gray-800">
                          {fmt(run.actualOutputQuantity)} made
                          <span className="text-gray-400"> / {fmt(run.expectedOutputQuantity)} expected</span>
                        </span>
                        {Number(run.wastedQuantity) > 0 && (
                          <span className="tabular-nums text-red-600">{fmt(run.wastedQuantity)} wasted</span>
                        )}
                        {run.recordedBy?.username && <span className="text-gray-400">by {run.recordedBy.username}</span>}
                      </li>
                    ))}
                  </ul>
                </details>
              </div>
            );
          })
        )}
        {notCooked.length > 0 && (
          <p className="text-sm text-gray-500">Not cooked yet: {notCooked.map((row) => row.name).join(", ")}</p>
        )}
      </div>
    </div>
  );
}

/**
 * Kitchen view for a stock session — used on the Production page and Stock session → Kitchen tab.
 * Cook on the left (recipe → quantity → send), the shelf on the right.
 * @param {"page" | "embedded"} variant — "embedded" uses a tighter intro (inside session detail).
 */
export default function ProductionTab({
  session,
  canManage,
  onRefresh,
  productionRuns = [],
  variant = "page",
  showValue = false,
}) {
  const { hasRole } = useAuth();
  const isAdmin = hasRole("admin");
  const [recipes, setRecipes] = useState([]);
  const [dayFlow, setDayFlow] = useState(null);
  const [loadingShelf, setLoadingShelf] = useState(false);
  const [selectedRecipeId, setSelectedRecipeId] = useState("");
  const [actualOutputQuantity, setActualOutputQuantity] = useState("");
  const [wastedQuantity, setWastedQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [ingredientAdjustments, setIngredientAdjustments] = useState([]);
  const [editIngredients, setEditIngredients] = useState(false);
  const [showExtras, setShowExtras] = useState(false);
  const [saving, setSaving] = useState(false);

  const isEmbedded = variant === "embedded";

  const availableRecipes = useMemo(
    () => recipes.filter((recipe) => recipe.isActive !== false && recipeMatchesBranch(recipe, session?.branch?.type)),
    [recipes, session?.branch?.type]
  );

  const selectedRecipe = useMemo(
    () => availableRecipes.find((recipe) => recipe.id === parseInt(selectedRecipeId, 10)),
    [availableRecipes, selectedRecipeId]
  );

  const runsByProduct = useMemo(() => {
    const map = new Map();
    for (const run of productionRuns) {
      const id = run.finishedProduct?.id ?? run.finishedProductId;
      if (!map.has(id)) map.set(id, []);
      map.get(id).push(run);
    }
    return map;
  }, [productionRuns]);

  const shelfRows = useMemo(() => {
    if (dayFlow?.rows) return dayFlow.rows.filter((row) => row.lane === "KITCHEN");
    // Without the day-flow numbers, fall back to what was made from the runs alone.
    return [...runsByProduct.entries()].map(([productId, runs]) => {
      const made = runs.reduce((s, r) => s + Number(r.actualOutputQuantity || 0), 0);
      const wasted = runs.reduce((s, r) => s + Number(r.wastedQuantity || 0), 0);
      return {
        productId,
        name: runs[0]?.finishedProduct?.name || "Product",
        unit: runs[0]?.finishedProduct?.unit || "",
        price: Number(runs[0]?.finishedProduct?.defaultPrice || 0),
        made,
        wasted,
        sold: 0,
        left: made - wasted,
      };
    });
  }, [dayFlow, runsByProduct]);

  const leftByProduct = useMemo(() => new Map(shelfRows.map((row) => [row.productId, row])), [shelfRows]);

  useEffect(() => {
    if (!session?.id) return;
    apiClient.recipes
      .getAll({ activeOnly: true })
      .then((res) => setRecipes(res.data || []))
      .catch(() => toast.error("Failed to load recipes"));
  }, [session?.id]);

  const runsKey = productionRuns.map((run) => run.id).join(",");
  useEffect(() => {
    if (!session?.id) return;
    setLoadingShelf(true);
    apiClient.sales
      .getDayFlow({ sessionId: session.id })
      .then((res) => setDayFlow(res.data))
      .catch(() => setDayFlow(null))
      .finally(() => setLoadingShelf(false));
  }, [session?.id, runsKey]);

  useEffect(() => {
    if (!selectedRecipe) {
      setIngredientAdjustments([]);
      return;
    }
    setActualOutputQuantity(String(Number(selectedRecipe.expectedOutputQuantity || 0) || ""));
    setWastedQuantity("");
    setNotes("");
    setEditIngredients(false);
    setShowExtras(false);
    setIngredientAdjustments(
      (selectedRecipe.ingredients || []).map((ingredient) => ({
        recipeIngredientId: ingredient.id,
        ingredientName: ingredient.ingredientName,
        productName: ingredient.product?.name || "",
        estimatedQuantity: ingredient.estimatedQuantity,
        actualQuantity: String(Number(ingredient.estimatedQuantity || 0)),
        unit: ingredient.unit,
      }))
    );
  }, [selectedRecipe]);

  const resetForm = () => {
    setSelectedRecipeId("");
    setActualOutputQuantity("");
    setWastedQuantity("");
    setNotes("");
    setIngredientAdjustments([]);
  };

  const stepOutput = (delta) => {
    const next = Math.max(0, (parseFloat(actualOutputQuantity) || 0) + delta);
    setActualOutputQuantity(String(Math.round(next * 100) / 100));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRecipe || saving) return;
    const output = parseFloat(actualOutputQuantity || 0);
    if (!(output > 0)) {
      toast.error("Enter how much came out");
      return;
    }
    try {
      setSaving(true);
      await apiClient.production.create({
        recipeId: selectedRecipe.id,
        sessionId: session.id,
        actualOutputQuantity: output,
        wastedQuantity: parseFloat(wastedQuantity || 0) || 0,
        notes: notes.trim() || undefined,
        ingredientAdjustments: ingredientAdjustments.map((ingredient) => ({
          recipeIngredientId: ingredient.recipeIngredientId,
          actualQuantity: parseFloat(ingredient.actualQuantity || 0),
        })),
      });
      toast.success(`${fmt(output)} ${selectedRecipe.outputUnit || ""} ${selectedRecipe.finishedProduct?.name || ""} sent to the till`);
      resetForm();
      await onRefresh?.();
    } catch (error) {
      console.error("Error recording production run:", error);
      toast.error(error.response?.data?.message || "Failed to record production run");
    } finally {
      setSaving(false);
    }
  };

  const sessionEditable = session?.status === "OPEN" || isAdmin;

  const howItWorksBody = (
    <ul className="mt-3 list-none space-y-2 text-sm text-gray-700">
      <li className="flex gap-2">
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-50 text-xs font-bold text-red-800">
          −
        </span>
        <span>
          <strong className="text-gray-900">Ingredients out:</strong> what the batch used is taken from counter stock.
        </span>
      </li>
      <li className="flex gap-2">
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-xs font-bold text-emerald-800">
          +
        </span>
        <span>
          <strong className="text-gray-900">Food onto the shelf:</strong> what came out appears on the till under{" "}
          <strong>From the kitchen</strong> and counts down as it sells.
        </span>
      </li>
      <li className="flex gap-2">
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0D47A1]/10 text-xs font-bold text-[#0D47A1]">
          i
        </span>
        <span>
          A recipe&apos;s finished product must be marked <strong>Production item</strong>
          {isAdmin ? (
            <>
              {" "}
              in{" "}
              <Link href="/admin/products" className="font-medium text-blue-900 underline hover:text-[#1e88b5]">
                Admin → Products
              </Link>
            </>
          ) : (
            <> in Admin → Products</>
          )}
          , and needs an active recipe for this branch to show up here.
        </span>
      </li>
    </ul>
  );

  const ingredientSummary = ingredientAdjustments
    .map((i) => `${fmt(i.actualQuantity)} ${i.unit} ${i.productName || i.ingredientName}`)
    .join(", ");

  const cookPanel = (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-4 py-3">
        <h2 className="text-base font-semibold text-gray-900">Cook</h2>
        <p className="text-xs text-gray-500">Tap what you cooked, set how much came out, send it to the till.</p>
      </div>
      <div className="p-4">
        {!sessionEditable ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            This session is <strong>not open</strong>. Batches can only be logged while the session is open.
          </div>
        ) : !canManage ? (
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
            You don&apos;t have permission to log batches for this branch.
          </div>
        ) : availableRecipes.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-600">
            No active recipes for this branch yet.
            {isAdmin && (
              <>
                {" "}
                <Link href="/admin/recipes" className="font-medium text-blue-900 underline">
                  Add one in Recipes
                </Link>
                .
              </>
            )}
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {availableRecipes.map((recipe) => {
                const active = recipe.id === selectedRecipe?.id;
                const shelf = leftByProduct.get(recipe.finishedProductId ?? recipe.finishedProduct?.id);
                const status = shelf ? shelfStatus(shelf) : "notCooked";
                return (
                  <button
                    key={recipe.id}
                    type="button"
                    onClick={() => setSelectedRecipeId(active ? "" : String(recipe.id))}
                    className={`min-h-[72px] rounded-lg border-2 px-3 py-2 text-left transition ${
                      active ? "border-[#0D47A1] bg-blue-50" : "border-gray-200 hover:border-gray-400"
                    }`}
                  >
                    <span className="block font-semibold text-gray-900">{recipe.finishedProduct?.name || recipe.name}</span>
                    <span className="block text-xs text-gray-500">{recipe.name}</span>
                    <span
                      className={`mt-1 block text-xs font-medium ${
                        status === "low" ? "text-amber-700" : status === "soldOut" ? "text-red-700" : "text-gray-600"
                      }`}
                    >
                      {status === "notCooked"
                        ? "Not cooked today"
                        : status === "soldOut"
                          ? "Sold out"
                          : `${fmt(shelf.left)} ${shelf.unit} on till`}
                    </span>
                  </button>
                );
              })}
            </div>

            {selectedRecipe && (
              <div className="space-y-4 border-t border-gray-100 pt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-800">
                    How much {selectedRecipe.finishedProduct?.name || "came out"}?
                  </label>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => stepOutput(-1)}
                      className="h-12 w-12 rounded-lg border border-gray-300 text-xl font-bold text-gray-700 hover:bg-gray-50"
                      aria-label="Less"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={actualOutputQuantity}
                      onChange={(e) => setActualOutputQuantity(e.target.value)}
                      className="h-12 w-28 rounded-lg border border-gray-300 text-center text-xl font-bold tabular-nums focus:border-[#0D47A1] focus:outline-none focus:ring-2 focus:ring-[#0D47A1]/25"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => stepOutput(1)}
                      className="h-12 w-12 rounded-lg border border-gray-300 text-xl font-bold text-gray-700 hover:bg-gray-50"
                      aria-label="More"
                    >
                      +
                    </button>
                    <span className="text-sm text-gray-600">
                      {selectedRecipe.outputUnit}
                      <span className="block text-xs text-gray-400">
                        usually {fmt(selectedRecipe.expectedOutputQuantity)}
                      </span>
                    </span>
                  </div>
                </div>

                {ingredientAdjustments.length > 0 && (
                  <div className="rounded-lg bg-gray-50 px-3 py-2 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-gray-700">
                        <span className="font-medium text-gray-900">Takes from stock:</span> {ingredientSummary}
                      </p>
                      <button
                        type="button"
                        onClick={() => setEditIngredients((v) => !v)}
                        className="shrink-0 text-xs font-semibold text-blue-900 hover:underline"
                      >
                        {editIngredients ? "Done" : "Edit"}
                      </button>
                    </div>
                    {editIngredients && (
                      <div className="mt-3 space-y-2">
                        {ingredientAdjustments.map((ingredient, index) => (
                          <div key={ingredient.recipeIngredientId} className="flex items-center gap-2">
                            <span className="min-w-0 flex-1 truncate text-gray-800">
                              {ingredient.ingredientName}
                              <span className="block text-xs text-gray-500">
                                recipe says {fmt(ingredient.estimatedQuantity)} {ingredient.unit}
                              </span>
                            </span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={ingredient.actualQuantity}
                              onChange={(e) => {
                                const next = [...ingredientAdjustments];
                                next[index] = { ...next[index], actualQuantity: e.target.value };
                                setIngredientAdjustments(next);
                              }}
                              className={`${inputClass} w-24`}
                            />
                            <span className="w-10 text-xs text-gray-500">{ingredient.unit}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {showExtras ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block text-xs text-gray-600">
                      Spoilt in cooking ({selectedRecipe.outputUnit})
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={wastedQuantity}
                        onChange={(e) => setWastedQuantity(e.target.value)}
                        className={`${inputClass} mt-1`}
                        placeholder="0"
                      />
                    </label>
                    <label className="block text-xs text-gray-600">
                      Note for the next shift
                      <input
                        type="text"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className={`${inputClass} mt-1`}
                        placeholder="Optional"
                      />
                    </label>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowExtras(true)}
                    className="text-xs font-semibold text-blue-900 hover:underline"
                  >
                    + Spoilt or note
                  </button>
                )}

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-lg bg-blue-900 px-5 text-base font-semibold text-white hover:bg-[#1e88b5] disabled:opacity-60"
                  >
                    <CheckIcon className="h-5 w-5" aria-hidden />
                    {saving
                      ? "Sending…"
                      : `Send ${fmt(actualOutputQuantity)} ${selectedRecipe.outputUnit || ""} to till`}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="min-h-[48px] rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {isEmbedded ? (
        <details className="group rounded-xl border border-gray-200 bg-white shadow-sm">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-semibold text-gray-900 marker:hidden [&::-webkit-details-marker]:hidden">
            <InformationCircleIcon className="h-5 w-5 shrink-0 text-[#0D47A1]" aria-hidden />
            <span className="min-w-0 flex-1">How the kitchen feeds the till</span>
            <span className="shrink-0 text-xs font-normal text-gray-500 group-open:hidden">Show</span>
            <span className="hidden shrink-0 text-xs font-normal text-gray-500 group-open:inline">Hide</span>
          </summary>
          <div className="border-t border-gray-100 px-4 pb-4 pt-0">{howItWorksBody}</div>
        </details>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 ring-1 ring-gray-200">
              <BeakerIcon className="h-6 w-6 text-[#0D47A1]" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-semibold text-gray-900">How the kitchen feeds the till</h2>
              <p className="mt-1 text-sm text-gray-600">
                Log each batch as it comes off the fire — <strong>one send per batch</strong>.
              </p>
              {howItWorksBody}
            </div>
          </div>
        </div>
      )}

      <div className={`grid gap-6 ${isEmbedded ? "lg:grid-cols-2" : ""}`}>
        {cookPanel}
        <Shelf rows={shelfRows} runsByProduct={runsByProduct} loading={loadingShelf} showValue={showValue} />
      </div>
    </div>
  );
}
