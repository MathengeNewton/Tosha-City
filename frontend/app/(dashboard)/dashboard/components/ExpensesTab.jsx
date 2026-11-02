"use client";

import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { BanknotesIcon, ClipboardDocumentListIcon } from "@heroicons/react/24/outline";
import { apiClient } from "../../../../lib/api";
import { formatDateTime } from "../../../../lib/time";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_PAYMENT_METHODS,
  expenseCategoryLabel,
  expensePaymentLabel,
  formatKes,
  sumExpenses,
} from "../../../../lib/expenses";

const inputClass =
  "w-full min-h-[44px] rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-[#0D47A1] focus:outline-none focus:ring-2 focus:ring-[#0D47A1]/25";

const emptyForm = {
  category: "",
  description: "",
  amount: "",
  paymentMethod: "CASH",
};

export default function ExpensesTab({ session, canManage, isAdmin, onChange }) {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [receiptFile, setReceiptFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const isOpen = session?.status === "OPEN";
  const canAdd = canManage && isOpen;
  const canChange = canManage && (isOpen || isAdmin);

  const loadExpenses = async () => {
    if (!session?.id) return;
    setLoading(true);
    try {
      const res = await apiClient.expenses.getAll({ sessionId: session.id });
      setExpenses(res.data || []);
    } catch {
      toast.error("Failed to load expenses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id]);

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    setReceiptFile(null);
  };

  const startEdit = (expense) => {
    setEditingId(expense.id);
    setForm({
      category: expense.category,
      description: expense.description,
      amount: String(parseFloat(expense.amount)),
      paymentMethod: expense.paymentMethod,
    });
    setReceiptFile(null);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    if (!form.category || !form.description.trim() || isNaN(amount) || amount <= 0) {
      toast.error("Choose a category, describe the expense, and enter an amount above 0.");
      return;
    }
    setSubmitting(true);
    try {
      let receiptUrl;
      if (receiptFile) {
        const uploadRes = await apiClient.uploads.upload(receiptFile);
        receiptUrl = uploadRes.data.filename;
      }
      const payload = {
        category: form.category,
        description: form.description.trim(),
        amount,
        paymentMethod: form.paymentMethod,
        ...(receiptUrl ? { receiptUrl } : {}),
      };
      if (editingId) {
        await apiClient.expenses.update(editingId, payload);
        toast.success("Expense updated");
      } else {
        await apiClient.expenses.create({ ...payload, sessionId: session.id });
        toast.success("Expense recorded");
      }
      resetForm();
      await loadExpenses();
      onChange?.();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save expense");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (expense) => {
    if (!confirm(`Delete expense "${expense.description}" (${formatKes(expense.amount)})?`)) return;
    try {
      await apiClient.expenses.delete(expense.id);
      toast.success("Expense deleted");
      if (editingId === expense.id) resetForm();
      await loadExpenses();
      onChange?.();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete expense");
    }
  };

  if (!session) return null;

  const total = sumExpenses(expenses);
  const cashTotal = sumExpenses(expenses, "CASH");
  const mpesaTotal = sumExpenses(expenses, "MPESA");

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-600">
        Record money spent during this session — transport, casual labour, packaging and so on. Cash expenses are
        paid out of the till, so they will be used when checking the day&apos;s cash against sales.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-600">Total expenses</p>
          <p className="text-2xl font-bold text-gray-900 tabular-nums">{formatKes(total)}</p>
          <p className="text-xs text-gray-500">{expenses.length} entries</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-600">Paid from till (cash)</p>
          <p className="text-2xl font-bold text-gray-900 tabular-nums">{formatKes(cashTotal)}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-600">Paid via M-Pesa</p>
          <p className="text-2xl font-bold text-gray-900 tabular-nums">{formatKes(mpesaTotal)}</p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-1 border-b border-gray-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0D47A1]/10">
              <BanknotesIcon className="h-6 w-6 text-[#0D47A1]" aria-hidden />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {editingId ? "Edit expense" : "Record expense"}
              </h2>
              <p className="text-sm text-gray-600">Log each payment as it happens, with a receipt photo if you have one.</p>
            </div>
          </div>
          {canAdd && !showForm && (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-md bg-blue-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#1e88b5] sm:mt-0 sm:w-auto"
            >
              <ClipboardDocumentListIcon className="h-5 w-5" aria-hidden />
              Add expense
            </button>
          )}
        </div>

        <div className="pt-4">
          {!isOpen && !showForm && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              This session is <strong>closed</strong>. New expenses can only be added while the session is open
              {isAdmin ? "; as an admin you can still correct existing ones below." : "."}
            </div>
          )}

          {isOpen && !canManage && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
              You don&apos;t have permission to record expenses.
            </div>
          )}

          {showForm && (
            <form onSubmit={handleSubmit} className="mx-auto max-w-xl space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Category <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className={inputClass}
                    required
                  >
                    <option value="">Select category</option>
                    {EXPENSE_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Amount (KES) <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className={inputClass}
                    placeholder="300"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Description <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  maxLength={255}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className={inputClass}
                  placeholder="Boda boda to collect meat from the slaughterhouse"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Paid from</label>
                <div className="grid grid-cols-2 gap-2">
                  {EXPENSE_PAYMENT_METHODS.map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => setForm({ ...form, paymentMethod: m.value })}
                      className={`min-h-[44px] rounded-md border px-3 py-2 text-sm font-medium ${
                        form.paymentMethod === m.value
                          ? "border-[#0D47A1] bg-[#0D47A1]/5 text-[#0D47A1]"
                          : "border-gray-300 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Receipt photo (optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:text-sm file:font-medium hover:file:bg-gray-200"
                />
                {editingId && !receiptFile && (
                  <p className="mt-1 text-xs text-gray-500">Leave empty to keep the current receipt.</p>
                )}
              </div>
              <div className="flex flex-col-reverse gap-2 border-t border-gray-100 pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={resetForm}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-md bg-blue-900 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#1e88b5] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? "Saving…" : editingId ? "Save changes" : "Record expense"}
                </button>
              </div>
            </form>
          )}

          {canAdd && !showForm && (
            <p className="text-center text-sm text-gray-500 sm:text-left">
              Tap <strong className="text-gray-700">Add expense</strong> each time money is paid out.
            </p>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
          <h2 className="text-base font-semibold text-gray-900">Expenses for this session</h2>
        </div>
        {loading ? (
          <p className="px-4 py-8 text-center text-sm text-gray-500">Loading…</p>
        ) : expenses.length === 0 ? (
          <div className="mx-4 my-6 rounded-xl border border-dashed border-gray-200 bg-gray-50/50 px-4 py-8 text-center">
            <BanknotesIcon className="mx-auto h-10 w-10 text-gray-300" aria-hidden />
            <p className="mt-2 text-sm font-medium text-gray-800">No expenses recorded</p>
            <p className="mt-1 text-sm text-gray-600">
              {canAdd ? "Expenses you add will appear here with a running total." : "Expenses for this session will show up here."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Time</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Paid from</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Recorded by</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Receipt</th>
                  {canChange && (
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {expenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-gray-50/80">
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">{formatDateTime(expense.recordedAt)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">{expenseCategoryLabel(expense.category)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{expense.description}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">{expensePaymentLabel(expense.paymentMethod)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-semibold tabular-nums text-gray-900">
                      {formatKes(expense.amount)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">{expense.recordedBy?.username || "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      {expense.receiptUrl?.startsWith("http") ? (
                        <a
                          href={expense.receiptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-blue-900 hover:underline"
                        >
                          View
                        </a>
                      ) : expense.receiptUrl ? (
                        <span className="text-gray-600">Attached</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    {canChange && (
                      <td className="whitespace-nowrap px-4 py-3 text-sm">
                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={() => startEdit(expense)}
                            className="font-medium text-blue-900 hover:text-[#1e88b5] hover:underline"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(expense)}
                            className="font-medium text-red-600 hover:text-red-700 hover:underline"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan={4} className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                    Total
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-bold tabular-nums text-gray-900">{formatKes(total)}</td>
                  <td colSpan={canChange ? 3 : 2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
