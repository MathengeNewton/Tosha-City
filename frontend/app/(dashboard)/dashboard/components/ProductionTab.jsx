"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { apiClient } from "../../../../lib/api";

export default function ProductionTab({ session, canManage, onRefresh, productionRuns = [] }) {
  const [loadingRecipes, setLoadingRecipes] = useState(false);
  const [recipes, setRecipes] = useState([]);
  const [ingredientProducts, setIngredientProducts] = useState([]);
  const [ingredientStock, setIngredientStock] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [selectedRecipeId, setSelectedRecipeId] = useState("");
  const [actualOutputQuantity, setActualOutputQuantity] = useState("");
  const [wastedQuantity, setWastedQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [ingredientAdjustments, setIngredientAdjustments] = useState([]);
  const [adHocIngredients, setAdHocIngredients] = useState([]);
  const [adHocProductId, setAdHocProductId] = useState("");
  const [adHocQuantity, setAdHocQuantity] = useState("");
  const [expandedRunId, setExpandedRunId] = useState(null);

  const availableRecipes = useMemo(
    () => recipes.filter((recipe) => recipe.isActive !== false),
    [recipes]
  );

  const selectedRecipe = useMemo(
    () => availableRecipes.find((recipe) => recipe.id === parseInt(selectedRecipeId, 10)),
    [availableRecipes, selectedRecipeId]
  );

  const sellableQuantity = useMemo(() => {
    const output = parseFloat(actualOutputQuantity || 0);
    const waste = parseFloat(wastedQuantity || 0);
    return Math.max(0, output - waste);
  }, [actualOutputQuantity, wastedQuantity]);

  const adHocProductOptions = useMemo(
    () =>
      ingredientProducts.filter(
        (p) => p.isActive !== false && p.category !== "PRODUCTION_ITEM"
      ),
    [ingredientProducts]
  );

  const loadIngredientStock = useCallback(
    async (productIds) => {
      if (!session?.id || !productIds.length) return;
      const entries = await Promise.all(
        productIds.map(async (productId) => {
          try {
            const res = await apiClient.production.getIngredientStock({
              sessionId: session.id,
              productId,
            });
            const available = typeof res.data === "number" ? res.data : Number(res.data?.available ?? res.data ?? 0);
            return [productId, available];
          } catch {
            return [productId, 0];
          }
        })
      );
      setIngredientStock((prev) => {
        const next = { ...prev };
        entries.forEach(([productId, available]) => {
          next[productId] = available;
        });
        return next;
      });
    },
    [session?.id]
  );

  useEffect(() => {
    if (!session?.id) return;
    loadRecipes();
    loadIngredientProducts();
  }, [session?.id]);

  useEffect(() => {
    if (!selectedRecipe) {
      setIngredientAdjustments([]);
      return;
    }
    setActualOutputQuantity(String(selectedRecipe.expectedOutputQuantity || ""));
    setWastedQuantity("");
    setAdHocIngredients([]);
    setIngredientAdjustments(
      (selectedRecipe.ingredients || []).map((ingredient) => ({
        recipeIngredientId: ingredient.id,
        productId: ingredient.productId,
        ingredientName: ingredient.ingredientName,
        productName: ingredient.product?.name || "",
        actualQuantity: String(ingredient.estimatedQuantity || ""),
        unit: ingredient.unit,
      }))
    );
  }, [selectedRecipe]);

  useEffect(() => {
    const productIds = [
      ...ingredientAdjustments.map((i) => i.productId).filter(Boolean),
      ...adHocIngredients.map((i) => i.productId),
    ];
    const unique = [...new Set(productIds)];
    if (unique.length) loadIngredientStock(unique);
  }, [ingredientAdjustments, adHocIngredients, loadIngredientStock]);

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

  const loadIngredientProducts = async () => {
    try {
      const res = await apiClient.products.getActive();
      setIngredientProducts(res.data || []);
    } catch (error) {
      console.error("Error loading products:", error);
    }
  };

  const addAdHocIngredient = () => {
    const productId = parseInt(adHocProductId, 10);
    const qty = parseFloat(adHocQuantity);
    if (!productId || Number.isNaN(qty) || qty < 0) {
      toast.error("Select a product and enter a valid quantity");
      return;
    }
    const product = adHocProductOptions.find((p) => p.id === productId);
    if (!product) return;

    const templateLine = ingredientAdjustments.find((i) => i.productId === productId);
    if (templateLine) {
      const next = [...ingredientAdjustments];
      const index = next.findIndex((i) => i.productId === productId);
      const current = parseFloat(next[index].actualQuantity || 0);
      next[index] = {
        ...next[index],
        actualQuantity: String(current + qty),
      };
      setIngredientAdjustments(next);
    } else {
      const existing = adHocIngredients.find((i) => i.productId === productId);
      if (existing) {
        setAdHocIngredients(
          adHocIngredients.map((i) =>
            i.productId === productId
              ? { ...i, actualQuantity: i.actualQuantity + qty }
              : i
          )
        );
      } else {
        setAdHocIngredients([
          ...adHocIngredients,
          {
            productId,
            productName: product.name,
            unit: product.unit,
            actualQuantity: qty,
          },
        ]);
      }
    }
    setAdHocProductId("");
    setAdHocQuantity("");
  };

  const removeAdHocIngredient = (productId) => {
    setAdHocIngredients(adHocIngredients.filter((i) => i.productId !== productId));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRecipe) {
      toast.error("Select a recipe");
      return;
    }
    try {
      const adHocOnly = adHocIngredients.filter(
        (line) => !ingredientAdjustments.some((t) => t.productId === line.productId)
      );
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
        adHocIngredients: adHocOnly.map((line) => ({
          productId: line.productId,
          actualQuantity: line.actualQuantity,
        })),
      });
      toast.success("Production run recorded");
      setShowForm(false);
      setSelectedRecipeId("");
      setActualOutputQuantity("");
      setWastedQuantity("");
      setNotes("");
      setIngredientAdjustments([]);
      setAdHocIngredients([]);
      await onRefresh?.();
    } catch (error) {
      console.error("Error recording production run:", error);
      toast.error(error.response?.data?.message || "Failed to record production run");
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-gray-600 text-sm">
        Record mutura, cooked heads, soup, and other prepared items. Ingredients must be in opening or
        incoming stock for this session before you run production.
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
                    {selectedRecipe && (
                      <p className="text-xs text-gray-500 mt-1">Unit: {selectedRecipe.outputUnit}</p>
                    )}
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
                  <div className="rounded-md bg-blue-50 border border-blue-100 px-4 py-3 text-sm text-blue-900">
                    Sellable after this run:{" "}
                    <span className="font-semibold tabular-nums">
                      {sellableQuantity.toFixed(2)} {selectedRecipe.outputUnit}
                    </span>
                    <span className="text-blue-700 ml-2">
                      (output {parseFloat(actualOutputQuantity || 0).toFixed(2)} − waste{" "}
                      {parseFloat(wastedQuantity || 0).toFixed(2)})
                    </span>
                  </div>
                )}

                {selectedRecipe && (
                  <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                      <p className="text-sm font-medium text-gray-900">
                        Recipe ingredients — enter actual quantities used
                      </p>
                      <p className="text-xs text-gray-500">
                        Expected output: {parseFloat(selectedRecipe.expectedOutputQuantity || 0).toFixed(2)}{" "}
                        {selectedRecipe.outputUnit}
                      </p>
                    </div>
                    <div className="divide-y divide-gray-200">
                      {ingredientAdjustments.map((ingredient, index) => (
                        <div
                          key={ingredient.recipeIngredientId}
                          className="grid grid-cols-1 md:grid-cols-4 gap-3 px-4 py-3"
                        >
                          <div className="text-sm text-gray-900">
                            <div className="font-medium">{ingredient.ingredientName}</div>
                            {ingredient.productName && (
                              <div className="text-xs text-gray-500">Product: {ingredient.productName}</div>
                            )}
                          </div>
                          <div className="text-sm text-gray-500">
                            Template:{" "}
                            {parseFloat(selectedRecipe.ingredients?.[index]?.estimatedQuantity || 0).toFixed(2)}{" "}
                            {ingredient.unit}
                            {ingredient.productId && ingredientStock[ingredient.productId] !== undefined && (
                              <div className="text-xs text-emerald-700 mt-1">
                                In session: {Number(ingredientStock[ingredient.productId]).toFixed(2)}{" "}
                                {ingredient.unit}
                              </div>
                            )}
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

                {showForm && (
                  <div className="rounded-lg border border-dashed border-gray-300 p-4 space-y-3">
                    <p className="text-sm font-medium text-gray-900">Add extra ingredient (not on recipe)</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <select
                        value={adHocProductId}
                        onChange={(e) => setAdHocProductId(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md md:col-span-2"
                      >
                        <option value="">Select product from stock</option>
                        {adHocProductOptions.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name} ({product.unit})
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Quantity"
                        value={adHocQuantity}
                        onChange={(e) => setAdHocQuantity(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={addAdHocIngredient}
                      className="text-sm text-blue-900 hover:underline"
                    >
                      + Add ingredient line
                    </button>
                    {adHocIngredients.length > 0 && (
                      <ul className="text-sm divide-y divide-gray-100 border border-gray-200 rounded-md">
                        {adHocIngredients.map((line) => (
                          <li
                            key={line.productId}
                            className="flex justify-between items-center px-3 py-2"
                          >
                            <span>
                              {line.productName}: {line.actualQuantity} {line.unit}
                              {ingredientStock[line.productId] !== undefined && (
                                <span className="text-xs text-gray-500 ml-2">
                                  (session stock: {Number(ingredientStock[line.productId]).toFixed(2)})
                                </span>
                              )}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeAdHocIngredient(line.productId)}
                              className="text-red-600 text-xs hover:underline"
                            >
                              Remove
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-8" />
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recipe</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Finished Product</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actual</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Wastage</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Sellable</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recorded</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {productionRuns.map((run) => {
                  const sellable =
                    parseFloat(run.actualOutputQuantity || 0) - parseFloat(run.wastedQuantity || 0);
                  const isExpanded = expandedRunId === run.id;
                  return (
                    <Fragment key={run.id}>
                      <tr className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => setExpandedRunId(isExpanded ? null : run.id)}
                            className="text-gray-500 hover:text-gray-800 text-xs"
                            aria-label={isExpanded ? "Collapse" : "Expand"}
                          >
                            {isExpanded ? "▼" : "▶"}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{run.recipe?.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{run.finishedProduct?.name}</td>
                        <td className="px-4 py-3 text-sm text-right tabular-nums">
                          {parseFloat(run.actualOutputQuantity || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right tabular-nums text-red-600">
                          {parseFloat(run.wastedQuantity || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right tabular-nums text-emerald-700 font-medium">
                          {sellable.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {run.recordedAt ? new Date(run.recordedAt).toLocaleString() : "—"}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${run.id}-detail`}>
                          <td colSpan={7} className="px-4 py-3 bg-gray-50">
                            <p className="text-xs font-medium text-gray-700 mb-2">Ingredients used</p>
                            {(run.ingredients || []).length === 0 ? (
                              <p className="text-xs text-gray-500">No ingredient breakdown recorded.</p>
                            ) : (
                              <ul className="text-xs text-gray-700 space-y-1">
                                {run.ingredients.map((ing) => (
                                  <li key={ing.id}>
                                    {ing.ingredientName}
                                    {ing.recipeIngredientId == null && (
                                      <span className="ml-1 text-amber-700">(extra)</span>
                                    )}
                                    : {parseFloat(ing.actualQuantity || 0).toFixed(2)} {ing.unit}
                                    {ing.product?.name && (
                                      <span className="text-gray-500"> — {ing.product.name}</span>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
