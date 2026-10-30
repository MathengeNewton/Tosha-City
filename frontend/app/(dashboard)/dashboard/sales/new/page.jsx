"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "../../../../../lib/api";
import { toast } from "react-toastify";
import { useAuth } from "../../../../../contexts/AuthContext";
import { PageShell, PageHeader, PageLoading } from "../../../components/shell";
import ProductGrid from "../ProductGrid";
import SaleLineCard from "../SaleLineCard";
import {
  buildLine,
  changeLine,
  emptyLine,
  formatKes,
  lineCookingFee,
  lineToPayload,
  linesTotal,
  repriceLines,
  validateLines,
} from "../saleLines";
import { paymentLabel } from "../PaymentPicker";

const PAYMENT_METHODS = [
  { id: "CASH", label: "Cash" },
  { id: "MPESA", label: "M-Pesa" },
  { id: "PDQ", label: "Card" },
  { id: "CREDIT", label: "Credit" },
];

// The sale stays in the browser until the cashier confirms it on the review step.
const DRAFT_KEY = "laketown-sale-draft";

function readDraft() {
  try {
    const raw = window.sessionStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeDraft(draft) {
  try {
    if (draft) window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    else window.sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    // Storage can be unavailable in private mode; the draft then lives in memory only.
  }
}

function SaleOptions({
  paymentMethod,
  onPaymentMethodChange,
  customerId,
  onCustomerChange,
  customers,
  tableLabel,
  setTableLabel,
  tables,
  compact = false,
}) {
  const selectedCustomer = customerId ? customers.find((c) => c.id === parseInt(customerId, 10)) : null;
  const visibleCustomers =
    paymentMethod === "CREDIT" ? customers.filter((customer) => customer.type === "CREDIT") : customers;
  const selectClass = `w-full rounded-xl border border-gray-300 bg-white px-3 focus:border-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20 ${
    compact ? "min-h-[44px] py-2 text-sm" : "min-h-[48px] py-3 text-base"
  }`;

  return (
    <>
      <div className="grid grid-cols-4 gap-2 px-3 pt-3">
        {PAYMENT_METHODS.map((method) => (
          <button
            key={method.id}
            type="button"
            onClick={() => onPaymentMethodChange(method.id)}
            className={`${compact ? "min-h-[44px] rounded-lg" : "min-h-[48px] rounded-xl"} text-sm font-bold ${
              paymentMethod === method.id ? "bg-blue-900 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {method.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 px-3 pt-3">
        <select
          value={customerId}
          onChange={(e) => onCustomerChange(e.target.value)}
          required={paymentMethod === "CREDIT"}
          className={selectClass}
        >
          <option value="">{paymentMethod === "CREDIT" ? "Credit customer" : "Walk-in"}</option>
          {visibleCustomers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.name}
              {customer.type === "WHOLESALE" ? " · Wholesale" : ""}
              {customer.type === "CREDIT" && paymentMethod !== "CREDIT" ? " · Credit" : ""}
              {customer.type === "CREDIT" && paymentMethod === "CREDIT" && customer.outstandingBalance != null
                ? ` · owes ${formatKes(customer.outstandingBalance)}`
                : ""}
              {customer.type === "CREDIT" && paymentMethod === "CREDIT" && customer.creditLimit
                ? ` · limit ${formatKes(customer.creditLimit)}`
                : ""}
            </option>
          ))}
        </select>
        <select
          value={tableLabel}
          onChange={(e) => setTableLabel(e.target.value)}
          className={selectClass}
        >
          <option value="">No table</option>
          {tables.map((table) => (
            <option key={table} value={table}>
              Table {table}
            </option>
          ))}
        </select>
      </div>
      {paymentMethod === "CREDIT" && visibleCustomers.length === 0 && (
        <p className="mx-3 mt-2 text-xs font-semibold text-red-700">
          No credit customers yet. Set a customer&apos;s type to Credit under Customers.
        </p>
      )}
      {selectedCustomer?.type === "WHOLESALE" && (
        <p className="mx-3 mt-2 text-xs font-semibold text-green-800">Wholesale prices on new taps.</p>
      )}
    </>
  );
}

function CashierTill({
  branchName,
  branchPicker,
  products,
  customer,
  saleItems,
  addProduct,
  removeItem,
  updateItem,
  options,
  total,
  cookingFeePerKg,
  allowPriceEdit,
  onSubmit,
  onClear,
}) {
  return (
    <form onSubmit={onSubmit} className="flex h-full min-h-0 flex-col gap-2 lg:flex-row">
      <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white">
        {branchPicker}
        <ProductGrid products={products} customer={customer} onPick={addProduct} autoFocus className="flex-1" />
      </section>

      <aside className="flex max-h-[46%] min-h-0 w-full shrink-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white lg:max-h-none lg:w-[400px]">
        <div className="border-b border-gray-200 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{branchName}</p>
          <h1 className="text-xl font-bold text-gray-900">Current sale</h1>
        </div>

        {options}

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3">
          {saleItems.length === 0 ? (
            <div className="flex h-full min-h-[120px] items-center justify-center rounded-xl border-2 border-dashed border-gray-200 px-4 text-center text-sm text-gray-500">
              Tap a product to start the sale.
            </div>
          ) : (
            saleItems.map((item, index) => (
              <SaleLineCard
                key={`${index}-${item.productId || "x"}`}
                line={item}
                products={products}
                onChange={(field, value) => updateItem(index, field, value)}
                onRemove={() => removeItem(index)}
                cookingFeePerKg={cookingFeePerKg}
                allowPriceEdit={allowPriceEdit}
              />
            ))
          )}
        </div>

        <div className="border-t border-gray-200 p-3">
          <div className="mb-3 flex items-end justify-between">
            <span className="text-sm font-semibold text-gray-600">Total</span>
            <span className="text-3xl font-bold tabular-nums text-gray-900">{formatKes(total)}</span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClear}
              disabled={saleItems.length === 0}
              className="min-h-[60px] rounded-xl border border-gray-300 px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40"
            >
              Clear
            </button>
            <button
              type="submit"
              disabled={saleItems.length === 0}
              className="min-h-[60px] flex-1 rounded-xl bg-green-600 text-lg font-bold text-white hover:bg-green-700 active:bg-green-800 disabled:opacity-50"
            >
              Create Sale
            </button>
          </div>
        </div>
      </aside>
    </form>
  );
}

function ReviewSale({
  branchName,
  products,
  customer,
  saleItems,
  addProduct,
  removeItem,
  updateItem,
  options,
  total,
  cookingFeePerKg,
  allowPriceEdit,
  paymentMethod,
  tableLabel,
  submitting,
  onConfirm,
  onBack,
  onDiscard,
}) {
  const [showPicker, setShowPicker] = useState(false);
  const cookingTotal = saleItems.reduce((sum, item) => {
    const product = products.find((p) => p.id === parseInt(item.productId, 10));
    return sum + lineCookingFee(item, product, cookingFeePerKg);
  }, 0);

  return (
    <PageShell>
      <div className="space-y-3">
        <PageHeader title="Confirm sale" subtitle={`${branchName} · not saved yet. Add or remove items, then confirm.`} />

        <div className="grid grid-cols-3 divide-x divide-gray-200 rounded-xl border border-gray-200 bg-white">
          <div className="px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Total</p>
            <p className="text-xl font-bold tabular-nums text-gray-900">KES {formatKes(total)}</p>
            {cookingTotal > 0 && (
              <p className="text-xs text-orange-800">Incl. cooking KES {formatKes(cookingTotal)}</p>
            )}
          </div>
          <div className="px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Payment</p>
            <p className="text-base font-bold text-gray-900">{paymentLabel(paymentMethod)}</p>
            <p className="text-sm text-gray-600">{customer?.name || "Walk-in"}</p>
          </div>
          <div className="px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Table</p>
            <p className="text-base font-bold text-gray-900">{tableLabel || "—"}</p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white pb-3">{options}</div>

        <div className="space-y-2">
          {saleItems.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-500">
              No items. Add at least one item before confirming.
            </div>
          ) : (
            saleItems.map((item, index) => (
              <SaleLineCard
                key={`${index}-${item.productId || "x"}`}
                line={item}
                products={products}
                onChange={(field, value) => updateItem(index, field, value)}
                onRemove={() => removeItem(index)}
                cookingFeePerKg={cookingFeePerKg}
                allowPriceEdit={allowPriceEdit}
                compact
              />
            ))
          )}
        </div>

        {showPicker ? (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <div className="flex items-center justify-between border-b border-gray-200 px-3 py-1.5">
              <p className="text-sm font-bold text-gray-900">Add items</p>
              <button
                type="button"
                onClick={() => setShowPicker(false)}
                className="min-h-[36px] rounded-lg px-3 text-sm font-semibold text-gray-700 hover:bg-gray-100"
              >
                Done
              </button>
            </div>
            <ProductGrid products={products} customer={customer} onPick={addProduct} className="max-h-[60vh]" />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowPicker(true)}
            className="min-h-[52px] w-full rounded-xl border-2 border-dashed border-blue-900/40 text-base font-bold text-blue-900 hover:bg-blue-50"
          >
            + Add items
          </button>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onConfirm}
            disabled={submitting || saleItems.length === 0}
            className="min-h-[56px] flex-1 rounded-xl bg-green-600 px-6 text-lg font-bold text-white hover:bg-green-700 disabled:opacity-50"
          >
            {submitting ? "Saving…" : "Confirm sale"}
          </button>
          <button
            type="button"
            onClick={onBack}
            className="min-h-[56px] rounded-xl bg-gray-200 px-6 text-base font-semibold text-gray-800 hover:bg-gray-300"
          >
            Back to till
          </button>
          <button
            type="button"
            onClick={onDiscard}
            className="min-h-[56px] rounded-xl px-6 text-base font-semibold text-red-700 hover:bg-red-50"
          >
            Discard
          </button>
        </div>
      </div>
    </PageShell>
  );
}

export default function NewSalePage() {
  const router = useRouter();
  const { user, hasRole } = useAuth();
  const isAdmin = hasRole("admin");
  const [loading, setLoading] = useState(true);
  /** After branch picker fetch finishes (admin) or cashier branch resolved — avoids spinner forever when loadData never runs. */
  const [branchInitDone, setBranchInitDone] = useState(false);
  const [currentSession, setCurrentSession] = useState(null);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [settings, setSettings] = useState({ cookingFeePerKg: 100, tables: [] });
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [saleItems, setSaleItems] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [customerId, setCustomerId] = useState("");
  const [tableLabel, setTableLabel] = useState("");
  const [step, setStep] = useState("build");
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const draftRestoredFor = useRef(null);

  const selectedCustomer = customerId ? customers.find((c) => c.id === parseInt(customerId, 10)) : null;
  const cookingFeePerKg = Number(settings.cookingFeePerKg || 0);

  useEffect(() => {
    initializeBranchContext();
  }, [user?.branchId, isAdmin]);

  useEffect(() => {
    const branchId = isAdmin ? selectedBranchId : user?.branchId;
    if (branchId) {
      loadData();
    } else if (branchInitDone) {
      setLoading(false);
    }
  }, [selectedBranchId, user?.branchId, isAdmin, branchInitDone]);

  useEffect(() => {
    if (!currentSession || draftRestoredFor.current !== currentSession.id) return;
    const hasContent = saleItems.length > 0 || step === "review";
    writeDraft(
      hasContent
        ? { sessionId: currentSession.id, saleItems, paymentMethod, customerId, tableLabel, step }
        : null,
    );
  }, [currentSession, saleItems, paymentMethod, customerId, tableLabel, step]);

  const initializeBranchContext = async () => {
    try {
      if (isAdmin) {
        const branchesRes = await apiClient.branches.getAll({ activeOnly: true });
        const branchList = branchesRes.data || [];
        setBranches(branchList);
        if (!selectedBranchId && branchList.length > 0) {
          setSelectedBranchId(String(branchList[0].id));
        }
      } else if (user?.branchId) {
        setSelectedBranchId(String(user.branchId));
      }
    } catch (error) {
      console.error("Error loading branches:", error);
      toast.error("Failed to load branches");
    } finally {
      setBranchInitDone(true);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const branchId = isAdmin ? parseInt(selectedBranchId, 10) : user?.branchId;
      if (!branchId) {
        setCurrentSession(null);
        setLoading(false);
        return;
      }

      const sessionRes = await apiClient.stockSessions.getCurrent({ branchId });
      const session = sessionRes.data;

      if (!session || session.status !== "OPEN") {
        setCurrentSession(null);
        if (!isAdmin) {
          toast.error("No active stock session. Please open a session first.");
          router.push("/dashboard/stock");
        }
        return;
      }

      const [productsRes, customersRes, settingsRes, balancesRes] = await Promise.all([
        apiClient.sales.getTillAvailability({ sessionId: session.id }),
        apiClient.customers.getAll({ activeOnly: true }),
        apiClient.saleSettings.get().catch(() => ({ data: null })),
        apiClient.customers.getCreditWithBalances().catch(() => ({ data: [] })),
      ]);
      const productsList = Array.isArray(productsRes.data) ? productsRes.data : [];
      setProducts(productsList.filter((product) => Number(product.available) > 0));
      const balances = new Map(
        (balancesRes.data || []).map((customer) => [customer.id, Number(customer.outstandingBalance) || 0])
      );
      setCustomers(
        (customersRes.data || []).map((customer) =>
          balances.has(customer.id) ? { ...customer, outstandingBalance: balances.get(customer.id) } : customer
        )
      );
      if (settingsRes.data) {
        setSettings({
          cookingFeePerKg: Number(settingsRes.data.cookingFeePerKg ?? 100),
          tables: Array.isArray(settingsRes.data.tables) ? settingsRes.data.tables : [],
        });
      }

      const draft = readDraft();
      if (draft && draft.sessionId === session.id && draftRestoredFor.current !== session.id) {
        setSaleItems(Array.isArray(draft.saleItems) ? draft.saleItems : []);
        setPaymentMethod(draft.paymentMethod || "CASH");
        setCustomerId(draft.customerId || "");
        setTableLabel(draft.tableLabel || "");
        setStep(draft.step === "review" ? "review" : "build");
      }
      draftRestoredFor.current = session.id;
      setCurrentSession(session);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const addProduct = (product) => {
    setSaleItems((prev) => [...prev, buildLine(product, selectedCustomer)]);
  };

  const removeItem = (index) => {
    setSaleItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateItem = (index, field, value) => {
    setSaleItems((prev) =>
      prev.map((item, i) => (i === index ? changeLine(item, field, value, products, selectedCustomer) : item)),
    );
  };

  const handleCustomerChange = (newId) => {
    setCustomerId(newId);
    const customer = newId ? customers.find((c) => c.id === parseInt(newId, 10)) : null;
    setSaleItems((prev) => repriceLines(prev, products, customer));
  };

  const handlePaymentMethodChange = (method) => {
    setPaymentMethod(method);
    if (method === "CREDIT" && selectedCustomer && selectedCustomer.type !== "CREDIT") {
      handleCustomerChange("");
    }
  };

  const clearSale = () => {
    setSaleItems([]);
    setCustomerId("");
    setTableLabel("");
    setPaymentMethod("CASH");
    setStep("build");
  };

  const checkSale = () => {
    const problem = validateLines(saleItems);
    if (problem) {
      toast.error(problem);
      return false;
    }
    if (paymentMethod === "CREDIT" && !customerId) {
      toast.error("Please select a credit customer for credit sales");
      return false;
    }
    return true;
  };

  const handleCharge = (e) => {
    e.preventDefault();
    if (!checkSale()) return;
    setStep("review");
  };

  const handleConfirm = async () => {
    if (submittingRef.current || !checkSale()) return;
    try {
      submittingRef.current = true;
      setSubmitting(true);
      const saleData = {
        sessionId: currentSession.id,
        items: saleItems.map((item) =>
          lineToPayload(
            item,
            products.find((p) => p.id === parseInt(item.productId, 10)),
          ),
        ),
        paymentMethod,
        customerId: customerId ? parseInt(customerId, 10) : undefined,
        tableLabel: tableLabel || undefined,
      };
      const response = await apiClient.sales.create(saleData);
      writeDraft(null);
      draftRestoredFor.current = null;
      toast.success("Sale confirmed");
      router.push(`/dashboard/sales/${response.data.id}`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create sale");
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const handleDiscard = () => {
    if (!confirm("Discard this sale? Nothing has been saved yet.")) return;
    clearSale();
  };

  if (loading) {
    return (
      <PageShell>
        <PageLoading message="Loading…" />
      </PageShell>
    );
  }

  const branchSelect = isAdmin ? (
    <select
      value={selectedBranchId}
      onChange={(e) => {
        clearSale();
        setSelectedBranchId(e.target.value);
      }}
      className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-base min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <option value="">Select branch</option>
      {branches.map((branch) => (
        <option key={branch.id} value={branch.id}>
          {branch.name}
        </option>
      ))}
    </select>
  ) : null;

  if (!currentSession) {
    return (
      <PageShell className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">New Sale</h1>
            <p className="text-gray-600 mt-1">Select a branch with an open stock session to continue.</p>
          </div>
          {isAdmin && (
            <div className="max-w-sm">
              <label className="block text-sm font-medium text-gray-700 mb-1">Branch *</label>
              {branchSelect}
            </div>
          )}
          <button
            type="button"
            onClick={() => router.push("/dashboard/stock")}
            className="bg-blue-900 text-white px-4 py-2 rounded-md hover:bg-[#1e88b5] transition-colors"
          >
            Go to Stock Sessions
          </button>
        </div>
      </PageShell>
    );
  }

  const branchName = currentSession.branch?.name || user?.branch?.name || "This branch";
  const total = linesTotal(saleItems, products, cookingFeePerKg);
  const renderOptions = (compact = false) => (
    <SaleOptions
      paymentMethod={paymentMethod}
      onPaymentMethodChange={handlePaymentMethodChange}
      customerId={customerId}
      onCustomerChange={handleCustomerChange}
      customers={customers}
      tableLabel={tableLabel}
      setTableLabel={setTableLabel}
      tables={settings.tables}
      compact={compact}
    />
  );

  if (step === "review") {
    return (
      <div className="h-full overflow-y-auto">
        <ReviewSale
          branchName={branchName}
          products={products}
          customer={selectedCustomer}
          saleItems={saleItems}
          addProduct={addProduct}
          removeItem={removeItem}
          updateItem={updateItem}
          options={renderOptions(true)}
          total={total}
          cookingFeePerKg={cookingFeePerKg}
          allowPriceEdit={isAdmin}
          paymentMethod={paymentMethod}
          tableLabel={tableLabel}
          submitting={submitting}
          onConfirm={handleConfirm}
          onBack={() => setStep("build")}
          onDiscard={handleDiscard}
        />
      </div>
    );
  }

  const till = (
    <CashierTill
      branchName={branchName}
      branchPicker={
        isAdmin ? (
          <div className="flex items-center gap-3 border-b border-gray-200 px-3 py-2">
            <span className="text-sm font-semibold text-gray-600">Branch</span>
            <div className="max-w-xs flex-1">{branchSelect}</div>
            <button
              type="button"
              onClick={() => setSaleItems((prev) => [...prev, emptyLine()])}
              className="min-h-[44px] rounded-lg px-3 text-sm font-semibold text-blue-900 hover:bg-blue-50"
            >
              Add empty line
            </button>
          </div>
        ) : null
      }
      products={products}
      customer={selectedCustomer}
      saleItems={saleItems}
      addProduct={addProduct}
      removeItem={removeItem}
      updateItem={updateItem}
      options={renderOptions()}
      total={total}
      cookingFeePerKg={cookingFeePerKg}
      allowPriceEdit={isAdmin}
      onSubmit={handleCharge}
      onClear={clearSale}
    />
  );

  // Admins use the sidebar layout, which does not give the page a fixed height.
  return isAdmin ? <div className="h-[calc(100vh-11rem)] min-h-[560px]">{till}</div> : till;
}
