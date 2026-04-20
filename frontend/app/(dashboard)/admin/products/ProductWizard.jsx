"use client";

import { useEffect, useMemo, useState } from "react";
import {
  applyKindToFormData,
  getKindOption,
  inferKindIdFromProduct,
  inferSegmentFromCategory,
  kindOptionsForSegment,
} from "./productKindMap";

const UNIT_PRESETS = ["kg", "g", "piece", "portion", "cup", "packet", "bottle"];

const SEGMENT_INTRO = {
  MEAT: "Meat counter — raw weight or piece.",
  PREPARED: "Prepared food — portions, cups, or cooked weight.",
  RETAIL: "Retail — drinks and packs for the till or table.",
  KITCHEN_SUPPLY: "Kitchen inputs — salt, oil, sauces (not on restaurant dish list).",
};

export default function ProductWizard({
  formData,
  setFormData,
  products,
  editingProduct,
  onSubmit,
  onCancel,
  lockedSegment = null,
}) {
  const [step, setStep] = useState(1);
  const [kindId, setKindId] = useState("RAW_WEIGHT");

  const isCreate = !editingProduct;
  const kindList = useMemo(() => kindOptionsForSegment(lockedSegment), [lockedSegment]);

  // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-init wizard when product or locked segment changes
  useEffect(() => {
    if (editingProduct) {
      setKindId(inferKindIdFromProduct(editingProduct));
      setStep(2);
      return;
    }
    const list = kindOptionsForSegment(lockedSegment);
    if (list.length === 1) {
      const id = list[0].id;
      setKindId(id);
      setFormData((prev) => applyKindToFormData(prev, id));
      setStep(2);
    } else {
      setKindId(list[0]?.id || "RAW_WEIGHT");
      setStep(1);
    }
  }, [editingProduct, lockedSegment]);

  const selectKind = (id) => {
    setKindId(id);
    setFormData((prev) => applyKindToFormData(prev, id));
  };

  const kind = getKindOption(kindId);

  const goNextFromKind = () => {
    setFormData((prev) => applyKindToFormData(prev, kindId));
    setStep(2);
  };

  const goToOptional = () => setStep(3);

  const goBack = () => {
    if (step === 2) {
      if (editingProduct) onCancel();
      else if (lockedSegment && kindList.length === 1) onCancel();
      else setStep(1);
    } else if (step === 3) {
      setStep(2);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {step === 1 && isCreate && (
        <div className="space-y-3">
          {lockedSegment ? (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
              {SEGMENT_INTRO[lockedSegment] || "Choose the product shape below."}
            </p>
          ) : null}
          <p className="text-sm font-medium text-slate-800">What kind of product is this?</p>
          <p className="text-xs text-slate-600">Pick one — prices and units are on the next screen.</p>
          <div className="grid gap-2 max-h-[50vh] overflow-y-auto pr-1">
            {kindList.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => selectKind(opt.id)}
                className={`text-left rounded-xl border-2 p-3 transition-colors min-h-[56px] ${
                  kindId === opt.id
                    ? "border-emerald-600 bg-emerald-50"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <span className="font-semibold text-slate-900 text-sm">{opt.title}</span>
                <span className="block text-xs text-slate-600 mt-1">{opt.description}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          {isCreate && !lockedSegment && (
            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-sm text-emerald-800 font-medium underline"
            >
              Change product type
            </button>
          )}
          <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-700">
            <span className="font-semibold">Type:</span> {kind?.title || "—"}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Product name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/30 text-base min-h-[44px]"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Unit *</label>
            <p className="text-xs text-slate-500 mb-2">Used at checkout (e.g. kg on the scale, or &quot;portion&quot;).</p>
            <div className="flex flex-wrap gap-2 mb-2">
              {UNIT_PRESETS.map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setFormData({ ...formData, unit: u })}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold border ${
                    formData.unit === u
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-base min-h-[44px]"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Retail price per unit (KES) *</label>
              <p className="text-xs text-slate-500 mb-1">What the customer pays for one unit.</p>
              <input
                type="number"
                step="0.01"
                value={formData.pricePerUnit}
                onChange={(e) => setFormData({ ...formData, pricePerUnit: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-base min-h-[44px]"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Wholesale price (KES)</label>
              <p className="text-xs text-slate-500 mb-1">Optional; if blank, retail price is used.</p>
              <input
                type="number"
                step="0.01"
                value={formData.wholesalePricePerUnit}
                onChange={(e) => setFormData({ ...formData, wholesalePricePerUnit: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-base min-h-[44px]"
                placeholder="Optional"
              />
            </div>
          </div>

          {!isCreate && (
            <>
              {(kind?.showParentByproduct || formData.category === "RAW_STOCK") && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Parent product (by-products)</label>
                  <p className="text-xs text-slate-500 mb-1">e.g. mince linked to main beef line.</p>
                  <select
                    value={formData.parentProductId}
                    onChange={(e) => setFormData({ ...formData, parentProductId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-base min-h-[44px]"
                  >
                    <option value="">None — main product</option>
                    {products
                      .filter((p) => p.isActive && (!editingProduct || p.id !== editingProduct.id))
                      .map((product) => (
                        <option key={product.id} value={product.id.toString()}>
                          {product.name}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {(kind?.suggestSalesPrompt ||
                formData.saleMode === "PORTION" ||
                formData.saleMode === "CUP") && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Till prompt (optional)</label>
                  <p className="text-xs text-slate-500 mb-1">Shown to cashier when selling.</p>
                  <input
                    type="text"
                    value={formData.salesPrompt}
                    onChange={(e) => setFormData({ ...formData, salesPrompt: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-base min-h-[44px]"
                    placeholder={kind?.salesPromptExample || "e.g. Number of portions"}
                  />
                </div>
              )}

              <div className="flex items-center min-h-[44px]">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="h-5 w-5 text-emerald-600 border-slate-300 rounded"
                />
                <label htmlFor="isActive" className="ml-2 text-sm text-slate-700">
                  Active (show on till and lists)
                </label>
              </div>

              <details className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                <summary className="cursor-pointer font-medium text-slate-800">Advanced: category &amp; sale mode</summary>
                <p className="text-xs text-slate-600 mt-2 mb-2">
                  Usually set from the product type. Change only if needed.
                </p>
                <div className="grid grid-cols-1 gap-2">
                  <select
                    value={formData.category}
                    onChange={(e) => {
                      const category = e.target.value;
                      setFormData({
                        ...formData,
                        category,
                        segment: inferSegmentFromCategory(category),
                      });
                    }}
                    className="border rounded-lg px-2 py-2"
                  >
                    <option value="RAW_STOCK">Raw stock</option>
                    <option value="PRODUCTION_ITEM">Production item</option>
                    <option value="CONSUMABLE">Consumable</option>
                  </select>
                  <select
                    value={formData.saleMode}
                    onChange={(e) => setFormData({ ...formData, saleMode: e.target.value })}
                    className="border rounded-lg px-2 py-2"
                  >
                    <option value="WEIGHT">Weight</option>
                    <option value="PORTION">Portion</option>
                    <option value="CUP">Cup</option>
                    <option value="PIECE">Piece</option>
                  </select>
                  {formData.category === "CONSUMABLE" && (
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">Segment (retail vs kitchen)</label>
                      <select
                        value={formData.segment || "RETAIL"}
                        onChange={(e) => setFormData({ ...formData, segment: e.target.value })}
                        className="w-full border rounded-lg px-2 py-2"
                      >
                        <option value="RETAIL">Retail — till / table</option>
                        <option value="KITCHEN_SUPPLY">Kitchen supply — stock only</option>
                      </select>
                    </div>
                  )}
                </div>
              </details>
            </>
          )}
        </div>
      )}

      {step === 3 && isCreate && (
        <div className="space-y-4">
          <p className="text-sm font-medium text-slate-800">Optional details</p>
          <p className="text-xs text-slate-600">Skip if not needed — you can edit the product later.</p>

          {kind?.showParentByproduct && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Parent product (by-products)</label>
              <p className="text-xs text-slate-500 mb-1">e.g. mince under a main beef line.</p>
              <select
                value={formData.parentProductId}
                onChange={(e) => setFormData({ ...formData, parentProductId: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-base min-h-[44px]"
              >
                <option value="">None — main product</option>
                {products
                  .filter((p) => p.isActive)
                  .map((product) => (
                    <option key={product.id} value={product.id.toString()}>
                      {product.name}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {(kind?.suggestSalesPrompt || formData.saleMode === "PORTION" || formData.saleMode === "CUP") && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Till prompt</label>
              <input
                type="text"
                value={formData.salesPrompt}
                onChange={(e) => setFormData({ ...formData, salesPrompt: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-base min-h-[44px]"
                placeholder={kind?.salesPromptExample || ""}
              />
            </div>
          )}

          <div className="flex items-center min-h-[44px]">
            <input
              type="checkbox"
              id="isActive3"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="h-5 w-5 text-emerald-600 border-slate-300 rounded"
            />
            <label htmlFor="isActive3" className="ml-2 text-sm text-slate-700">
              Active (show on till and lists)
            </label>
          </div>
        </div>
      )}

      <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2 border-t border-slate-100">
        <button
          type="button"
          onClick={() => {
            if (step === 1) onCancel();
            else goBack();
          }}
          className="flex-1 bg-slate-100 text-slate-800 px-4 py-3 rounded-xl hover:bg-slate-200 min-h-[44px] text-base font-medium"
        >
          {step === 1 || (step === 2 && isCreate && lockedSegment && kindList.length === 1)
            ? "Cancel"
            : "Back"}
        </button>

        {step === 1 && isCreate && (
          <button
            type="button"
            onClick={goNextFromKind}
            className="flex-1 bg-emerald-600 text-white px-4 py-3 rounded-xl hover:bg-emerald-700 min-h-[44px] text-base font-semibold"
          >
            Next
          </button>
        )}

        {step === 2 && isCreate && (
          <>
            <button
              type="button"
              onClick={goToOptional}
              className="flex-1 border-2 border-slate-300 text-slate-800 px-4 py-3 rounded-xl hover:bg-slate-50 min-h-[44px] text-base font-semibold"
            >
              More options
            </button>
            <button
              type="submit"
              className="flex-1 bg-slate-900 text-white px-4 py-3 rounded-xl hover:bg-slate-800 min-h-[44px] text-base font-semibold"
            >
              Create product
            </button>
          </>
        )}

        {step === 2 && !isCreate && (
          <button
            type="submit"
            className="flex-1 bg-slate-900 text-white px-4 py-3 rounded-xl hover:bg-slate-800 min-h-[44px] text-base font-semibold"
          >
            Save changes
          </button>
        )}

        {step === 3 && isCreate && (
          <button
            type="submit"
            className="flex-1 bg-slate-900 text-white px-4 py-3 rounded-xl hover:bg-slate-800 min-h-[44px] text-base font-semibold"
          >
            Create product
          </button>
        )}
      </div>
    </form>
  );
}
