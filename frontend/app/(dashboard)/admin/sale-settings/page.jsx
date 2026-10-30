"use client";

import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { apiClient } from "../../../../lib/api";
import { PageShell, PageHeader, PageLoading } from "../../components/shell";

const inputClass =
  "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base min-h-[44px]";

export default function SaleSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    cookingFeePerKg: "",
    tables: [],
    receiptLocation: "",
    receiptPhone: "",
    tillNumber: "",
    paybillNumber: "",
    paybillAccount: "",
  });
  const [newTable, setNewTable] = useState("");

  useEffect(() => {
    apiClient.saleSettings
      .get()
      .then((res) => {
        const data = res.data || {};
        setForm({
          cookingFeePerKg: String(data.cookingFeePerKg ?? ""),
          tables: Array.isArray(data.tables) ? data.tables : [],
          receiptLocation: data.receiptLocation || "",
          receiptPhone: data.receiptPhone || "",
          tillNumber: data.tillNumber || "",
          paybillNumber: data.paybillNumber || "",
          paybillAccount: data.paybillAccount || "",
        });
      })
      .catch((error) => toast.error(error.response?.data?.message || "Failed to load sale configuration"))
      .finally(() => setLoading(false));
  }, []);

  const addTable = () => {
    const label = newTable.trim();
    if (!label) return;
    if (form.tables.some((t) => t.toLowerCase() === label.toLowerCase())) {
      toast.error(`${label} is already in the list`);
      return;
    }
    setForm({ ...form, tables: [...form.tables, label] });
    setNewTable("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fee = parseFloat(form.cookingFeePerKg);
    if (!Number.isFinite(fee) || fee < 0) {
      toast.error("Enter a valid cooking fee per kg");
      return;
    }
    try {
      setSaving(true);
      await apiClient.saleSettings.update({
        cookingFeePerKg: fee,
        tables: form.tables,
        receiptLocation: form.receiptLocation.trim(),
        receiptPhone: form.receiptPhone.trim(),
        tillNumber: form.tillNumber.trim(),
        paybillNumber: form.paybillNumber.trim(),
        paybillAccount: form.paybillAccount.trim(),
      });
      toast.success("Sale configuration saved");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <PageShell>
        <PageLoading message="Loading sale configuration…" />
      </PageShell>
    );
  }

  return (
    <PageShell className="space-y-6">
      <PageHeader title="Sale configuration" subtitle="Tables, kitchen cooking fee and receipt details" />

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6 space-y-3">
          <h2 className="text-lg font-bold text-gray-900">Kitchen cooking fee</h2>
          <p className="text-sm text-gray-600">
            Charged per kg when a customer asks the kitchen to cook meat bought at the butchery. Example at 100/kg:
            4.5 kg adds 450 to the bill. Anything under ½ kg is cooked for a flat KES 50.
          </p>
          <div className="max-w-xs">
            <label className="block text-sm font-medium text-gray-700 mb-1">KES per kg *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.cookingFeePerKg}
              onChange={(e) => setForm({ ...form, cookingFeePerKg: e.target.value })}
              className={inputClass}
              required
            />
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6 space-y-3">
          <h2 className="text-lg font-bold text-gray-900">Tables</h2>
          <p className="text-sm text-gray-600">Offered on the till and printed on both receipts.</p>
          <div className="flex flex-wrap gap-2">
            {form.tables.length === 0 && <p className="text-sm text-gray-500">No tables yet.</p>}
            {form.tables.map((table) => (
              <span
                key={table}
                className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-900"
              >
                {table}
                <button
                  type="button"
                  onClick={() => setForm({ ...form, tables: form.tables.filter((t) => t !== table) })}
                  className="text-blue-900/60 hover:text-red-700"
                  aria-label={`Remove ${table}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="flex max-w-md gap-2">
            <input
              type="text"
              value={newTable}
              onChange={(e) => setNewTable(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTable();
                }
              }}
              placeholder="e.g. Hall 5"
              className={inputClass}
            />
            <button
              type="button"
              onClick={addTable}
              className="min-h-[44px] rounded-md bg-gray-700 px-4 text-sm font-semibold text-white hover:bg-gray-800"
            >
              Add
            </button>
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6 space-y-4">
          <h2 className="text-lg font-bold text-gray-900">Customer receipt</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input
                type="text"
                value={form.receiptLocation}
                onChange={(e) => setForm({ ...form, receiptLocation: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mobile number</label>
              <input
                type="text"
                value={form.receiptPhone}
                onChange={(e) => setForm({ ...form, receiptPhone: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">M-Pesa till number</label>
              <input
                type="text"
                value={form.tillNumber}
                onChange={(e) => setForm({ ...form, tillNumber: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Paybill</label>
              <input
                type="text"
                value={form.paybillNumber}
                onChange={(e) => setForm({ ...form, paybillNumber: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Account No.</label>
              <input
                type="text"
                value={form.paybillAccount}
                onChange={(e) => setForm({ ...form, paybillAccount: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>
        </section>

        <button
          type="submit"
          disabled={saving}
          className="min-h-[48px] rounded-md bg-blue-900 px-6 text-base font-semibold text-white hover:bg-[#1e88b5] disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </form>
    </PageShell>
  );
}
