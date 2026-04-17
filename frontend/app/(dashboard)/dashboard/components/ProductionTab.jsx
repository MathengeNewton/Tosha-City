"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "react-toastify";
import { apiClient } from "../../../../lib/api";
import { useAuth } from "../../../../contexts/AuthContext";
import {
  BeakerIcon,
  CheckIcon,
  ClipboardDocumentListIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";

function recipeMatchesBranch(recipe, branchType) {
  if (!recipe) return false;
  if (recipe.branchScope === "ALL") return true;
  return recipe.branchScope === branchType;
}

const inputClass =
  "w-full min-h-[44px] rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-[#0D47A1] focus:outline-none focus:ring-2 focus:ring-[#0D47A1]/25";

/**
 * Production runs for a stock session — used on Morning production page and Stock session → Production tab.
 * @param {"page" | "embedded"} variant — "embedded" uses a tighter intro (inside session detail).
 */
export default function ProductionTab({
  session,
  canManage,
  onRefresh,
  productionRuns = [],
  variant = "page",
}) {
  const { hasRole } = useAuth();
  const isAdmin = hasRole("admin");
  const [loadingRecipes, setLoadingRecipes] = useState(false);
  const [recipes, setRecipes] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedRecipeId, setSelectedRecipeId] = useState("");
  const [actualOutputQuantity, setActualOutputQuantity] = useState("");
  const [wastedQuantity, setWastedQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [ingredientAdjustments, setIngredientAdjustments] = useState([]);

  const isEmbedded = variant === "embedded";

  const availableRecipes = useMemo(
    () =>
      recipes.filter(
        (recipe) => recipe.isActive !== false && recipeMatchesBranch(recipe, session?.branch?.type)
      ),
    [recipes, session?.branch?.type]
  );

  const selectedRecipe = useMemo(
    () => availableRecipes.find((recipe) => recipe.id === parseInt(selectedRecipeId, 10)),
    [availableRecipes, selectedRecipeId]
  );

  useEffect(() => {
    if (!session?.id) return;
    loadRecipes();
  }, [session?.id]);

  useEffect(() => {
    if (!selectedRecipe) {
      setIngredientAdjustments([]);
      return;
    }
    setActualOutputQuantity(String(selectedRecipe.expectedOutputQuantity || ""));
    setIngredientAdjustments(
      (selectedRecipe.ingredients || []).map((ingredient) => ({
        recipeIngredientId: ingredient.id,
        ingredientName: ingredient.ingredientName,
        productName: ingredient.product?.name || "",
        actualQuantity: String(ingredient.estimatedQuantity || ""),
        unit: ingredient.unit,
      }))
    );
  }, [selectedRecipe]);

  const loadRecipes = async () => {
    try {
      setLoadingRecipes(true);
      const recipesRes = await apiClient.recipes.getAll({ activeOnly: true });
      setRecipes(recipesRes.data || []);
    } catch (error) {
      console.error("Error loading production data:", error);
      toast.error("Failed to load production data");
    } finally {
      setLoadingRecipes(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRecipe) {
      toast.error("Select a recipe");
      return;
    }
    try {
      await apiClient.production.create({
        recipeId: selectedRecipe.id,
        sessionId: session.id,
        actualOutputQuantity: parseFloat(actualOutputQuantity || 0),
        wastedQuantity: parseFloat(wastedQuantity || 0) || 0,
        notes: notes.trim() || undefined,
        ingredientAdjustments: ingredientAdjustments.map((ingredient) => ({
          recipeIngredientId: ingredient.recipeIngredientId,
          actualQuantity: parseFloat(ingredient.actualQuantity || 0),
        })),
      });
      toast.success("Production run recorded");
      setShowForm(false);
      setSelectedRecipeId("");
      setActualOutputQuantity("");
      setWastedQuantity("");
      setNotes("");
      setIngredientAdjustments([]);
      await onRefresh?.();
    } catch (error) {
      console.error("Error recording production run:", error);
      toast.error(error.response?.data?.message || "Failed to record production run");
    }
  };

  const sessionOpen = session?.status === "OPEN";
  const canRecord = canManage && sessionOpen;

  const howItWorksBody = (
    <ul className="mt-3 list-none space-y-2 text-sm text-gray-700">
      <li className="flex gap-2">
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-50 text-xs font-bold text-red-800">
          −
        </span>
        <span>
          <strong className="text-gray-900">Stock out:</strong> each ingredient quantity you confirm is{" "}
          <strong>deducted</strong> from this session&apos;s stock.
        </span>
      </li>
      <li className="flex gap-2">
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-xs font-bold text-emerald-800">
          +
        </span>
        <span>
          <strong className="text-gray-900">Stock in:</strong> the recipe&apos;s <strong>finished product</strong>{" "}
          (prepared item) is <strong>added</strong> for this session so kitchen and tills can sell it.
        </span>
      </li>
      <li className="flex gap-2">
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0D47A1]/10 text-xs font-bold text-[#0D47A1]">
          i
        </span>
        <span>
          Recipes must use a finished product marked <strong>Production item</strong>
          {isAdmin ? (
            <>
              {" "}
              in{" "}
              <Link href="/admin/products" className="font-medium text-blue-900 underline hover:text-[#1e88b5]">
                Admin → Products
              </Link>
            </>
          ) : (
            <> in Admin → Products (ask an admin if recipes fail to save)</>
          )}
          . Raw items only won&apos;t save.
        </span>
      </li>
    </ul>
  );

  return (
    <div className="space-y-6">
      {/* How it works */}
      {isEmbedded ? (
        <details className="group rounded-xl border border-gray-200 bg-white shadow-sm">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-semibold text-gray-900 marker:hidden [&::-webkit-details-marker]:hidden">
            <InformationCircleIcon className="h-5 w-5 shrink-0 text-[#0D47A1]" aria-hidden />
            <span className="min-w-0 flex-1">How production updates stock</span>
            <span className="shrink-0 text-xs font-normal text-gray-500 group-open:hidden">Show</span>
            <span className="hidden shrink-0 text-xs font-normal text-gray-500 group-open:inline">Hide</span>
          </summary>
          <div className="border-t border-gray-100 px-4 pb-4 pt-0">{howItWorksBody}</div>
        </details>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-blue-50/80 to-white p-4 shadow-sm sm:p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
              <BeakerIcon className="h-6 w-6 text-[#0D47A1]" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-semibold text-gray-900">How production updates stock</h2>
              <p className="mt-1 text-sm text-gray-600">
                Use this after opening the day and recording <strong>incoming</strong> stock. Log each cook batch
                (mutura, soup, roasts, etc.) — <strong>one save per batch</strong>.
              </p>
              {howItWorksBody}
            </div>
          </div>
        </div>
      )}

      {/* Record a run */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-1 border-b border-gray-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Log a production run</h2>
            <p className="text-sm text-gray-600">
              Pick the recipe, enter how much you made, confirm ingredients — then save once per batch.
            </p>
          </div>
          {canRecord && !showForm && (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-md bg-blue-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#1e88b5] sm:mt-0 sm:w-auto"
            >
              <ClipboardDocumentListIcon className="h-5 w-5" aria-hidden />
              Start new run
            </button>
          )}
        </div>

        <div className="pt-4">
          {!sessionOpen && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              This session is <strong>not open</strong>. Production can only be recorded while the stock session status
              is <strong>Open</strong>.
            </div>
          )}

          {sessionOpen && !canManage && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
              You don&apos;t have permission to record production for this branch.
            </div>
          )}

          {canRecord && showForm && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <ol className="grid gap-4 sm:grid-cols-3">
                <li className="rounded-lg border border-gray-100 bg-gray-50/80 p-3 sm:col-span-1">
                  <span className="text-xs font-bold uppercase tracking-wide text-[#0D47A1]">Step 1</span>
                  <p className="mt-1 text-sm font-medium text-gray-900">Recipe</p>
                  <label className="mt-2 block text-xs text-gray-500">What did you cook?</label>
                  <select
                    value={selectedRecipeId}
                    onChange={(e) => setSelectedRecipeId(e.target.value)}
                    className={`${inputClass} mt-1`}
                    required
                  >
                    <option value="">Select recipe…</option>
                    {availableRecipes.map((recipe) => (
                      <option key={recipe.id} value={recipe.id}>
                        {recipe.name} — {recipe.finishedProduct?.name || "No product"}
                      </option>
                    ))}
                  </select>
                </li>
                <li className="rounded-lg border border-gray-100 bg-gray-50/80 p-3 sm:col-span-1">
                  <span className="text-xs font-bold uppercase tracking-wide text-[#0D47A1]">Step 2</span>
                  <p className="mt-1 text-sm font-medium text-gray-900">Output & wastage</p>
                  <label className="mt-2 block text-xs text-gray-500">
                    How much finished product did you get?
                    {selectedRecipe && (
                      <span className="mt-0.5 block font-medium text-gray-700">
                        Unit: <span className="tabular-nums">{selectedRecipe.outputUnit || "—"}</span>
                      </span>
                    )}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={actualOutputQuantity}
                    onChange={(e) => setActualOutputQuantity(e.target.value)}
                    className={`${inputClass} mt-1`}
                    placeholder="e.g. 12"
                    required
                  />
                  <label className="mt-3 block text-xs text-gray-500">Wastage (optional, same unit)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={wastedQuantity}
                    onChange={(e) => setWastedQuantity(e.target.value)}
                    className={`${inputClass} mt-1`}
                    placeholder="0"
                  />
                </li>
                <li className="rounded-lg border border-gray-100 bg-gray-50/80 p-3 sm:col-span-1">
                  <span className="text-xs font-bold uppercase tracking-wide text-[#0D47A1]">Step 3</span>
                  <p className="mt-1 text-sm font-medium text-gray-900">Notes (optional)</p>
                  <label className="mt-2 block text-xs text-gray-500">Anything the next shift should know?</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className={`${inputClass} mt-1 min-h-[120px] resize-y`}
                    rows={4}
                    placeholder="e.g. Second batch, slightly smaller portions"
                  />
                </li>
              </ol>

              {selectedRecipe && (
                <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm">
                  <div className="flex flex-col gap-1 border-b border-gray-200 bg-gray-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Ingredients taken from stock</p>
                      <p className="text-xs text-gray-600">
                        Expected for this recipe at{" "}
                        <span className="font-medium tabular-nums">
                          {parseFloat(selectedRecipe.expectedOutputQuantity || 0).toFixed(2)} {selectedRecipe.outputUnit}
                        </span>{" "}
                        output — adjust if you used more or less.
                      </p>
                    </div>
                  </div>
                  <div className="divide-y divide-gray-100 bg-white">
                    {ingredientAdjustments.map((ingredient, index) => (
                      <div
                        key={ingredient.recipeIngredientId}
                        className="grid grid-cols-1 gap-3 px-4 py-3 md:grid-cols-12 md:items-center"
                      >
                        <div className="md:col-span-5">
                          <p className="text-sm font-medium text-gray-900">{ingredient.ingredientName}</p>
                          {ingredient.productName && (
                            <p className="text-xs text-gray-500">Stock product: {ingredient.productName}</p>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 md:col-span-3">
                          Recipe estimate:{" "}
                          <span className="font-medium tabular-nums text-gray-900">
                            {parseFloat(selectedRecipe.ingredients?.[index]?.estimatedQuantity || 0).toFixed(2)}{" "}
                            {ingredient.unit}
                          </span>
                        </div>
                        <div className="md:col-span-4">
                          <label className="block text-xs font-medium text-gray-600">Actually used</label>
                          <div className="mt-1 flex gap-2">
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
                              className={inputClass}
                            />
                            <span className="inline-flex min-w-[2.5rem] items-center text-sm text-gray-500">
                              {ingredient.unit}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col-reverse gap-2 border-t border-gray-100 pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setSelectedRecipeId("");
                    setActualOutputQuantity("");
                    setWastedQuantity("");
                    setNotes("");
                    setIngredientAdjustments([]);
                  }}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-md bg-blue-900 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#1e88b5]"
                >
                  <CheckIcon className="h-4 w-4" aria-hidden />
                  Save production run
                </button>
              </div>
            </form>
          )}

          {canRecord && !showForm && (
            <p className="text-center text-sm text-gray-500 sm:text-left">
              When you&apos;re ready, tap <strong className="text-gray-700">Start new run</strong> above.
            </p>
          )}
        </div>
      </div>

      {/* History */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-1 border-b border-gray-200 bg-gray-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-semibold text-gray-900">Runs logged this session</h2>
          <p className="text-xs text-gray-500">Each row is one saved batch.</p>
        </div>
        {loadingRecipes ? (
          <p className="px-4 py-8 text-center text-sm text-gray-500">Loading recipes…</p>
        ) : productionRuns.length === 0 ? (
          <div className="mx-4 my-6 rounded-xl border border-dashed border-gray-200 bg-gray-50/50 px-4 py-8 text-center">
            <ClipboardDocumentListIcon className="mx-auto h-10 w-10 text-gray-300" aria-hidden />
            <p className="mt-2 text-sm font-medium text-gray-800">No production runs yet</p>
            <p className="mt-1 text-sm text-gray-600">
              {canRecord
                ? "When you save your first batch, it will show up here."
                : "Runs will appear here once staff record production for this session."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    Recipe
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    Finished product
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500">
                    Expected
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500">
                    Actual
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500">
                    Wastage
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    Recorded
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {productionRuns.map((run) => (
                  <tr key={run.id} className="hover:bg-gray-50/80">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{run.recipe?.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{run.finishedProduct?.name}</td>
                    <td className="px-4 py-3 text-right text-sm tabular-nums text-gray-700">
                      {parseFloat(run.expectedOutputQuantity || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium tabular-nums text-gray-900">
                      {parseFloat(run.actualOutputQuantity || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm tabular-nums text-red-600">
                      {parseFloat(run.wastedQuantity || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {run.recordedAt ? new Date(run.recordedAt).toLocaleString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
