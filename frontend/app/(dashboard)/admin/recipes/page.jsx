"use client";

import { useEffect, useMemo, useState } from "react";
import { apiClient } from "../../../../lib/api";
import { toast } from "react-toastify";
import { useAuth } from "../../../../contexts/AuthContext";
import { isProductionItem, isRawStockProduct } from "../../../../lib/productCatalog";
import Link from "next/link";

const emptyIngredient = () => ({
  productId: "",
  ingredientName: "",
  estimatedQuantity: "",
  unit: "kg",
});

export default function RecipesPage() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole("admin");
  const [loading, setLoading] = useState(true);
  const [recipes, setRecipes] = useState([]);
  const [products, setProducts] = useState([]);
  const [productionProducts, setProductionProducts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    finishedProductId: "",
    expectedOutputQuantity: "",
    outputUnit: "portion",
    notes: "",
    isActive: true,
    ingredients: [emptyIngredient()],
  });

  const finishedProducts = useMemo(() => {
    const active = productionProducts.filter((p) => p.isActive !== false);
    if (editingRecipe?.finishedProductId) {
      const current = products.find((p) => p.id === editingRecipe.finishedProductId);
      if (current && !active.some((p) => p.id === current.id)) {
        return [...active, current].sort((a, b) => a.name.localeCompare(b.name));
      }
    }
    return active.sort((a, b) => a.name.localeCompare(b.name));
  }, [productionProducts, products, editingRecipe]);

  const stockProducts = useMemo(
    () => products.filter((p) => isRawStockProduct(p) && p.isActive !== false),
    [products]
  );

  useEffect(() => {
    if (!isAdmin) return;
    loadData();
  }, [isAdmin]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [recipesRes, productsRes, productionRes] = await Promise.all([
        apiClient.recipes.getAll(),
        apiClient.products.getAll(),
        apiClient.products.getProductionItems(),
      ]);
      setRecipes(recipesRes.data || []);
      const allProducts = productsRes.data || [];
      setProducts(allProducts);
      const fromApi = productionRes.data || [];
      const merged = [...fromApi];
      for (const p of allProducts) {
        if (isProductionItem(p) && !merged.some((m) => m.id === p.id)) {
          merged.push(p);
        }
      }
      setProductionProducts(merged);
    } catch {
      toast.error("Failed to load recipes");
    } finally {
      setLoading(false);
    }
  };

  const openModal = (recipe = null) => {
    if (recipe) {
      setEditingRecipe(recipe);
      setFormData({
        name: recipe.name || "",
        finishedProductId: String(recipe.finishedProductId || ""),
        expectedOutputQuantity: String(recipe.expectedOutputQuantity || ""),
        outputUnit: recipe.outputUnit || "portion",
        notes: recipe.notes || "",
        isActive: recipe.isActive !== false,
        ingredients: (recipe.ingredients || []).length
          ? recipe.ingredients.map((ing) => ({
              productId: ing.productId ? String(ing.productId) : "",
              ingredientName: ing.ingredientName || "",
              estimatedQuantity: String(ing.estimatedQuantity || ""),
              unit: ing.unit || "kg",
            }))
          : [emptyIngredient()],
      });
    } else {
      setEditingRecipe(null);
      setFormData({
        name: "",
        finishedProductId: "",
        expectedOutputQuantity: "",
        outputUnit: "portion",
        notes: "",
        isActive: true,
        ingredients: [emptyIngredient()],
      });
    }
    setShowModal(true);
  };

  const updateIngredient = (index, field, value) => {
    const next = [...formData.ingredients];
    const row = { ...next[index], [field]: value };
    if (field === "productId" && value) {
      const product = stockProducts.find((p) => p.id === parseInt(value, 10));
      if (product) {
        row.ingredientName = product.name;
        row.unit = product.unit || row.unit;
      }
    }
    next[index] = row;
    setFormData({ ...formData, ingredients: next });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;

    const payload = {
      name: formData.name.trim(),
      finishedProductId: parseInt(formData.finishedProductId, 10),
      expectedOutputQuantity: parseFloat(formData.expectedOutputQuantity),
      outputUnit: formData.outputUnit.trim(),
      notes: formData.notes.trim() || undefined,
      isActive: formData.isActive,
      ingredients: formData.ingredients
        .filter((ing) => ing.ingredientName.trim())
        .map((ing, index) => ({
          productId: ing.productId ? parseInt(ing.productId, 10) : undefined,
          ingredientName: ing.ingredientName.trim(),
          estimatedQuantity: parseFloat(ing.estimatedQuantity || 0),
          unit: ing.unit.trim(),
          sortOrder: index,
        })),
    };

    if (!payload.ingredients.length) {
      toast.error("Add at least one ingredient");
      return;
    }

    try {
      if (editingRecipe) {
        await apiClient.recipes.update(editingRecipe.id, payload);
        toast.success("Recipe updated");
      } else {
        await apiClient.recipes.create(payload);
        toast.success("Recipe created");
      }
      setShowModal(false);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save recipe");
    }
  };

  const handleDelete = async (recipe) => {
    if (!window.confirm(`Delete recipe "${recipe.name}"?`)) return;
    try {
      await apiClient.recipes.delete(recipe.id);
      toast.success("Recipe deleted");
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete recipe");
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-6 text-gray-600">
        Admin access required to manage recipes.
      </div>
    );
  }

  return (
    <div className="space-y-6 p-2 sm:p-4">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Recipes</h1>
          <p className="text-gray-600 text-sm mt-1">
            Define production templates (mutura, head-to-pieces, etc.) linked to finished products.
          </p>
        </div>
        <button
          type="button"
          onClick={() => openModal()}
          className="bg-blue-900 text-white px-4 py-2 rounded-md hover:bg-[#1e88b5] text-sm self-start"
        >
          New recipe
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Finished product</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Expected output</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {recipes.map((recipe) => (
                <tr key={recipe.id}>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{recipe.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{recipe.finishedProduct?.name}</td>
                  <td className="px-4 py-3 text-sm text-right tabular-nums">
                    {parseFloat(recipe.expectedOutputQuantity || 0).toFixed(2)} {recipe.outputUnit}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded text-xs ${
                        recipe.isActive !== false
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {recipe.isActive !== false ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-right space-x-2">
                    <button
                      type="button"
                      onClick={() => openModal(recipe)}
                      className="text-blue-900 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(recipe)}
                      className="text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {recipes.length === 0 && (
            <p className="px-4 py-8 text-center text-gray-500 text-sm">No recipes yet.</p>
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-lg font-semibold mb-4">
              {editingRecipe ? "Edit recipe" : "New recipe"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Name *</label>
                  <input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Finished product *</label>
                  <select
                    value={formData.finishedProductId}
                    onChange={(e) => {
                      const product = finishedProducts.find(
                        (p) => p.id === parseInt(e.target.value, 10)
                      );
                      setFormData({
                        ...formData,
                        finishedProductId: e.target.value,
                        outputUnit: product?.unit || formData.outputUnit,
                      });
                    }}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    required
                  >
                    <option value="">
                      {finishedProducts.length === 0
                        ? "No production items — create one first"
                        : "Select production item"}
                    </option>
                    {finishedProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.unit})
                      </option>
                    ))}
                  </select>
                  {finishedProducts.length === 0 ? (
                    <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-2 py-2 mt-2">
                      Add a product under{" "}
                      <Link href="/admin/products" className="font-medium underline">
                        Admin → Products
                      </Link>{" "}
                      and choose type <strong>Production item</strong> (e.g. Mutura, per piece).
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500 mt-1">
                      Only production items appear here (prepared goods you make on-site).
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Expected output *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={formData.expectedOutputQuantity}
                    onChange={(e) =>
                      setFormData({ ...formData, expectedOutputQuantity: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Output unit *</label>
                  <input
                    value={formData.outputUnit}
                    onChange={(e) => setFormData({ ...formData, outputUnit: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    required
                  />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="recipe-active"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  />
                  <label htmlFor="recipe-active" className="text-sm text-gray-700">
                    Active
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  rows={2}
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-gray-900">Ingredients</label>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        ingredients: [...formData.ingredients, emptyIngredient()],
                      })
                    }
                    className="text-sm text-blue-900 hover:underline"
                  >
                    + Add row
                  </button>
                </div>
                <div className="space-y-2">
                  {formData.ingredients.map((ing, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-1 sm:grid-cols-12 gap-2 border border-gray-100 rounded p-2"
                    >
                      <select
                        value={ing.productId}
                        onChange={(e) => updateIngredient(index, "productId", e.target.value)}
                        className="sm:col-span-4 border border-gray-300 rounded-md px-2 py-1.5 text-sm"
                      >
                        <option value="">Product (optional)</option>
                        {stockProducts.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                      <input
                        placeholder="Name"
                        value={ing.ingredientName}
                        onChange={(e) => updateIngredient(index, "ingredientName", e.target.value)}
                        className="sm:col-span-3 border border-gray-300 rounded-md px-2 py-1.5 text-sm"
                        required
                      />
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Qty"
                        value={ing.estimatedQuantity}
                        onChange={(e) =>
                          updateIngredient(index, "estimatedQuantity", e.target.value)
                        }
                        className="sm:col-span-2 border border-gray-300 rounded-md px-2 py-1.5 text-sm"
                        required
                      />
                      <input
                        placeholder="Unit"
                        value={ing.unit}
                        onChange={(e) => updateIngredient(index, "unit", e.target.value)}
                        className="sm:col-span-2 border border-gray-300 rounded-md px-2 py-1.5 text-sm"
                        required
                      />
                      {formData.ingredients.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setFormData({
                              ...formData,
                              ingredients: formData.ingredients.filter((_, i) => i !== index),
                            })
                          }
                          className="sm:col-span-1 text-red-600 text-xs"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-900 text-white rounded-md hover:bg-[#1e88b5]"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
