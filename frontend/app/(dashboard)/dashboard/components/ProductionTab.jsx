"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { apiClient } from "../../../../lib/api";

function recipeMatchesBranch(recipe, branchType) {
  if (!recipe) return false;
  if (recipe.branchScope === "ALL") return true;
  return recipe.branchScope === branchType;
}

export default function ProductionTab({ session, canManage, onRefresh, productionRuns = [] }) {
  const [loadingRecipes, setLoadingRecipes] = useState(false);
  const [recipes, setRecipes] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedRecipeId, setSelectedRecipeId] = useState("");
  const [actualOutputQuantity, setActualOutputQuantity] = useState("");
  const [wastedQuantity, setWastedQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [ingredientAdjustments, setIngredientAdjustments] = useState([]);

  const availableRecipes = useMemo(
    () => recipes.filter((recipe) => recipe.isActive !== false && recipeMatchesBranch(recipe, session?.branch?.type)),
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

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800">
        <p className="font-semibold text-slate-900">What production does</p>
        <p className="mt-1 text-slate-700">
          Each run <strong>deducts</strong> the ingredient quantities from stock and <strong>adds</strong> the finished
          output for this session. Recipes must use products marked as <strong>Production item</strong> in Admin →
          Products (otherwise saving a recipe will fail).
        </p>
      </div>
      <p className="text-gray-600 text-sm">
        Record mutura, soup, pork fry, and other prepared items from this branch&apos;s stock session.
      </p>

      {canManage && session?.status === "OPEN" && (
        <div className="space-y-4">
          {!showForm ? (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="bg-blue-900 text-white px-4 py-2 rounded-md hover:bg-[#1e88b5] text-sm"
            >
              Record production run
            </button>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
              <h4 className="font-medium text-gray-900">New production run</h4>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Recipe *</label>
                    <select
                      value={selectedRecipeId}
                      onChange={(e) => setSelectedRecipeId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    >
                      <option value="">Select recipe</option>
                      {availableRecipes.map((recipe) => (
                        <option key={recipe.id} value={recipe.id}>
                          {recipe.name} ({recipe.finishedProduct?.name})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Actual output *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={actualOutputQuantity}
                      onChange={(e) => setActualOutputQuantity(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Wastage</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={wastedQuantity}
                      onChange={(e) => setWastedQuantity(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>

                {selectedRecipe && (
                  <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                      <p className="text-sm font-medium text-gray-900">
                        Estimated ingredients for {selectedRecipe.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        Expected output: {parseFloat(selectedRecipe.expectedOutputQuantity || 0).toFixed(2)} {selectedRecipe.outputUnit}
                      </p>
                    </div>
                    <div className="divide-y divide-gray-200">
                      {ingredientAdjustments.map((ingredient, index) => (
                        <div key={ingredient.recipeIngredientId} className="grid grid-cols-1 md:grid-cols-4 gap-3 px-4 py-3">
                          <div className="text-sm text-gray-900">
                            <div className="font-medium">{ingredient.ingredientName}</div>
                            {ingredient.productName && (
                              <div className="text-xs text-gray-500">Linked product: {ingredient.productName}</div>
                            )}
                          </div>
                          <div className="text-sm text-gray-500">
                            Estimated: {parseFloat(selectedRecipe.ingredients?.[index]?.estimatedQuantity || 0).toFixed(2)} {ingredient.unit}
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-xs text-gray-600 mb-1">Actual quantity used</label>
                            <div className="flex gap-2">
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
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                              />
                              <span className="inline-flex items-center text-sm text-gray-500">{ingredient.unit}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    rows={3}
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-900 text-white rounded-md hover:bg-[#1e88b5]"
                  >
                    Save production run
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h4 className="font-medium text-gray-900">Production runs for this session</h4>
        </div>
        {loadingRecipes ? (
          <p className="px-4 py-6 text-gray-500">Loading...</p>
        ) : productionRuns.length === 0 ? (
          <p className="px-4 py-6 text-gray-500">No production runs recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recipe</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Finished Product</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Expected</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actual</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Wastage</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recorded</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {productionRuns.map((run) => (
                  <tr key={run.id}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{run.recipe?.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{run.finishedProduct?.name}</td>
                    <td className="px-4 py-3 text-sm text-right tabular-nums">
                      {parseFloat(run.expectedOutputQuantity || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right tabular-nums">
                      {parseFloat(run.actualOutputQuantity || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right tabular-nums text-red-600">
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
