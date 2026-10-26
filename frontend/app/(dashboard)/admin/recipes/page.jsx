"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { apiClient } from "../../../../lib/api";
import { PageShell, PageHeader, PageLoading } from "../../components/shell";

const BRANCH_SCOPES = [
  { value: "GENERAL_BUTCHERY", label: "General butchery" },
  { value: "PORK_BUTCHERY", label: "Pork butchery" },
  { value: "ALL", label: "All branches" },
];

function emptyIngredient() {
  return {
    productId: "",
    ingredientName: "",
    estimatedQuantity: "",
    unit: "kg",
  };
}

export default function RecipesPage() {
  const [recipes, setRecipes] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    branchScope: "GENERAL_BUTCHERY",
    finishedProductId: "",
    expectedOutputQuantity: "",
    outputUnit: "portion",
    notes: "",
    isActive: true,
    ingredients: [emptyIngredient()],
  });

  const productionProducts = useMemo(
    () => products.filter((product) => product.category === "PRODUCTION_ITEM" && product.isActive !== false),
    [products]
  );

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [recipesRes, productsRes] = await Promise.all([
        apiClient.recipes.getAll(),
        apiClient.products.getAll(),
      ]);
      setRecipes(recipesRes.data || []);
      setProducts(productsRes.data || []);
    } catch (error) {
      console.error("Error loading recipes:", error);
      toast.error("Failed to load recipes");
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditingRecipe(null);
    setFormData({
      name: "",
      branchScope: "GENERAL_BUTCHERY",
      finishedProductId: "",
      expectedOutputQuantity: "",
      outputUnit: "portion",
      notes: "",
      isActive: true,
      ingredients: [emptyIngredient()],
    });
    setShowModal(true);
  };

  const openEdit = (recipe) => {
    setEditingRecipe(recipe);
    setFormData({
      name: recipe.name || "",
      branchScope: recipe.branchScope || "GENERAL_BUTCHERY",
      finishedProductId: recipe.finishedProductId ? String(recipe.finishedProductId) : "",
      expectedOutputQuantity: recipe.expectedOutputQuantity ? String(recipe.expectedOutputQuantity) : "",
      outputUnit: recipe.outputUnit || "portion",
      notes: recipe.notes || "",
      isActive: recipe.isActive !== false,
      ingredients: (recipe.ingredients || []).map((ingredient) => ({
        id: ingredient.id,
        productId: ingredient.productId ? String(ingredient.productId) : "",
        ingredientName: ingredient.ingredientName || "",
        estimatedQuantity: ingredient.estimatedQuantity ? String(ingredient.estimatedQuantity) : "",
        unit: ingredient.unit || "kg",
      })),
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingRecipe(null);
  };

  const updateIngredient = (index, field, value) => {
    setFormData((prev) => {
      const ingredients = [...prev.ingredients];
      ingredients[index] = { ...ingredients[index], [field]: value };
      if (field === "productId" && value) {
        const product = products.find((item) => item.id === parseInt(value, 10));
        if (product && !ingredients[index].ingredientName) {
          ingredients[index].ingredientName = product.name;
        }
        if (product && !ingredients[index].unit) {
          ingredients[index].unit = product.unit;
        }
      }
      return { ...prev, ingredients };
    });
  };

  const addIngredient = () => {
    setFormData((prev) => ({ ...prev, ingredients: [...prev.ingredients, emptyIngredient()] }));
  };

  const removeIngredient = (index) => {
    setFormData((prev) => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, ingredientIndex) => ingredientIndex !== index),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.finishedProductId) {
      toast.error("Select the finished product for this recipe");
      return;
    }
    if (formData.ingredients.length === 0) {
      toast.error("Add at least one ingredient");
      return;
    }

    try {
      const payload = {
        name: formData.name.trim(),
        branchScope: formData.branchScope,
        finishedProductId: parseInt(formData.finishedProductId, 10),
        expectedOutputQuantity: parseFloat(formData.expectedOutputQuantity || 0),
        outputUnit: formData.outputUnit.trim(),
        notes: formData.notes.trim() || undefined,
        isActive: formData.isActive,
        ingredients: formData.ingredients.map((ingredient, index) => ({
          id: ingredient.id ? Number(ingredient.id) : undefined,
          productId: ingredient.productId ? parseInt(ingredient.productId, 10) : undefined,
          ingredientName: ingredient.ingredientName.trim(),
          estimatedQuantity: parseFloat(ingredient.estimatedQuantity || 0),
          unit: ingredient.unit.trim(),
          sortOrder: index,
        })),
      };

      if (editingRecipe) {
        await apiClient.recipes.update(editingRecipe.id, payload);
        toast.success("Recipe updated successfully");
      } else {
        await apiClient.recipes.create(payload);
        toast.success("Recipe created successfully");
      }

      closeModal();
      loadData();
    } catch (error) {
      console.error("Error saving recipe:", error);
      toast.error(error.response?.data?.message || "Failed to save recipe");
    }
  };

  const handleDelete = async (recipeId) => {
    if (!confirm("Delete this recipe?")) return;
    try {
      await apiClient.recipes.delete(recipeId);
      toast.success("Recipe deleted successfully");
      loadData();
    } catch (error) {
      console.error("Error deleting recipe:", error);
      toast.error(error.response?.data?.message || "Failed to delete recipe");
    }
  };

  if (loading) {
    return (
      <PageShell>
        <PageLoading message="Loading recipes…" />
      </PageShell>
    );
  }

  return (
    <PageShell className="space-y-8">
      <PageHeader
        title="Recipes"
        subtitle="Define mutura, soup, pork, and other production recipes."
      >
        <button
          type="button"
          onClick={openCreate}
          className="bg-blue-900 text-white px-4 py-2 rounded-md hover:bg-[#1e88b5] transition-colors text-sm min-h-[44px]"
        >
          Add Recipe
        </button>
      </PageHeader>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recipe</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Finished Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branch Scope</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expected Output</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ingredients</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recipes.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                    No recipes found.
                  </td>
                </tr>
              ) : (
                recipes.map((recipe) => (
                  <tr key={recipe.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{recipe.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{recipe.finishedProduct?.name || "—"}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{recipe.branchScope?.replace(/_/g, " ")}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {parseFloat(recipe.expectedOutputQuantity || 0).toFixed(2)} {recipe.outputUnit}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{recipe.ingredients?.length || 0}</td>
                    <td className="px-6 py-4 text-sm font-medium space-x-3">
                      <button onClick={() => openEdit(recipe)} className="text-indigo-600 hover:text-indigo-900">
                        Edit
                      </button>
                      <button onClick={() => handleDelete(recipe.id)} className="text-red-600 hover:text-red-900">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-4xl p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {editingRecipe ? "Edit Recipe" : "Create Recipe"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Recipe Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Branch Scope *</label>
                  <select
                    value={formData.branchScope}
                    onChange={(e) => setFormData({ ...formData, branchScope: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {BRANCH_SCOPES.map((scope) => (
                      <option key={scope.value} value={scope.value}>
                        {scope.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Finished Product *</label>
                  <select
                    value={formData.finishedProductId}
                    onChange={(e) => {
                      const product = products.find((item) => item.id === parseInt(e.target.value, 10));
                      setFormData({
                        ...formData,
                        finishedProductId: e.target.value,
                        outputUnit: product?.unit || formData.outputUnit,
                      });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select finished product</option>
                    {productionProducts.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expected Output *</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      step="0.01"
                      value={formData.expectedOutputQuantity}
                      onChange={(e) => setFormData({ ...formData, expectedOutputQuantity: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    <input
                      type="text"
                      value={formData.outputUnit}
                      onChange={(e) => setFormData({ ...formData, outputUnit: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">Ingredients</h3>
                  <button
                    type="button"
                    onClick={addIngredient}
                    className="text-sm text-blue-700 hover:text-blue-900"
                  >
                    Add ingredient
                  </button>
                </div>
                <div className="space-y-3">
                  {formData.ingredients.map((ingredient, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-3 border border-gray-200 rounded-lg p-3">
                      <div className="md:col-span-4">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Linked Product</label>
                        <select
                          value={ingredient.productId}
                          onChange={(e) => updateIngredient(index, "productId", e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        >
                          <option value="">None (free text ingredient)</option>
                          {products.map((product) => (
                            <option key={product.id} value={product.id}>
                              {product.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="md:col-span-3">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Ingredient Name *</label>
                        <input
                          type="text"
                          value={ingredient.ingredientName}
                          onChange={(e) => updateIngredient(index, "ingredientName", e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          required
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Estimated Qty *</label>
                        <input
                          type="number"
                          step="0.01"
                          value={ingredient.estimatedQuantity}
                          onChange={(e) => updateIngredient(index, "estimatedQuantity", e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          required
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Unit *</label>
                        <input
                          type="text"
                          value={ingredient.unit}
                          onChange={(e) => updateIngredient(index, "unit", e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          required
                        />
                      </div>
                      <div className="md:col-span-1 flex items-end">
                        <button
                          type="button"
                          onClick={() => removeIngredient(index)}
                          disabled={formData.ingredients.length === 1}
                          className="text-red-600 hover:text-red-800 disabled:text-gray-300"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                />
                Active
              </label>

              <div className="flex justify-end gap-2">
                <button type="button" onClick={closeModal} className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" className="bg-blue-900 text-white px-4 py-2 rounded-md hover:bg-[#1e88b5]">
                  Save Recipe
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageShell>
  );
}
