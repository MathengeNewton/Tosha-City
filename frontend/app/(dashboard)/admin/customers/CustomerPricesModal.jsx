"use client";
import { useEffect, useState } from "react";
import { apiClient } from "../../../../lib/api";
import { toast } from "react-toastify";

const formatKes = (value) =>
  value != null && value !== ""
    ? parseFloat(value).toLocaleString("en-KE", { minimumFractionDigits: 2 })
    : "—";

/** Special per-product prices for one wholesale customer. Blank = use the product's wholesale price. */
export default function CustomerPricesModal({ customer, onClose }) {
  const [products, setProducts] = useState([]);
  const [saved, setSaved] = useState({}); // productId -> price string currently stored
  const [drafts, setDrafts] = useState({}); // productId -> price string being edited
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [productsRes, pricesRes] = await Promise.all([
          apiClient.products.getActive(),
          apiClient.customers.getPrices(customer.id),
        ]);
        if (cancelled) return;
        const stored = {};
        (pricesRes.data || []).forEach((p) => {
          stored[p.productId] = String(parseFloat(p.price));
        });
        setProducts(productsRes.data || []);
        setSaved(stored);
        setDrafts(stored);
      } catch (e) {
        if (!cancelled) toast.error("Failed to load prices");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [customer.id]);

  const handleSave = async (product) => {
    const price = parseFloat(drafts[product.id]);
    if (!Number.isFinite(price) || price <= 0) {
      toast.error("Enter a price greater than 0");
      return;
    }
    setBusyId(product.id);
    try {
      await apiClient.customers.setPrice(customer.id, product.id, price);
      setSaved({ ...saved, [product.id]: String(price) });
      setDrafts({ ...drafts, [product.id]: String(price) });
      toast.success(`${product.name}: KES ${formatKes(price)} for ${customer.name}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save price");
    } finally {
      setBusyId(null);
    }
  };

  const handleRemove = async (product) => {
    setBusyId(product.id);
    try {
      await apiClient.customers.removePrice(customer.id, product.id);
      const nextSaved = { ...saved };
      delete nextSaved[product.id];
      const nextDrafts = { ...drafts };
      delete nextDrafts[product.id];
      setSaved(nextSaved);
      setDrafts(nextDrafts);
      toast.success(`${product.name}: back to standard wholesale price`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to remove price");
    } finally {
      setBusyId(null);
    }
  };

  const visibleProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.trim().toLowerCase()),
  );
  const specialCount = Object.keys(saved).length;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-gray-900">Prices for {customer.name}</h2>
          <p className="text-sm text-gray-500 mt-1">
            Set a special price for any product this customer buys. Leave it blank to use the product&apos;s standard
            wholesale price. Past sales keep the price they were sold at.
          </p>
        </div>

        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products"
          className="mb-3 w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
        />

        <div className="flex-1 overflow-y-auto border border-gray-200 rounded-lg">
          {loading ? (
            <p className="p-6 text-center text-gray-500">Loading prices…</p>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Retail</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Std wholesale</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Special price (KES)
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {visibleProducts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                      No products found
                    </td>
                  </tr>
                ) : (
                  visibleProducts.map((product) => {
                    const hasSaved = saved[product.id] != null;
                    const draft = drafts[product.id] ?? "";
                    const dirty = draft !== (saved[product.id] ?? "");
                    const busy = busyId === product.id;
                    return (
                      <tr key={product.id} className={hasSaved ? "bg-purple-50/40" : undefined}>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          <span className="font-medium">{product.name}</span>
                          <span className="text-gray-500"> / {product.unit}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-right tabular-nums text-gray-600">
                          {formatKes(product.defaultPrice)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right tabular-nums text-gray-600">
                          {formatKes(product.wholesalePrice ?? product.defaultPrice)}
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={draft}
                            onChange={(e) => setDrafts({ ...drafts, [product.id]: e.target.value })}
                            placeholder="Standard"
                            className="w-32 px-2 py-1.5 border border-gray-300 rounded-md text-sm tabular-nums"
                          />
                        </td>
                        <td className="px-4 py-3 text-sm whitespace-nowrap text-right">
                          {dirty && draft !== "" && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => handleSave(product)}
                              className="text-blue-600 hover:text-blue-800 font-medium mr-3 disabled:opacity-50"
                            >
                              Save
                            </button>
                          )}
                          {hasSaved && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => handleRemove(product)}
                              className="text-red-600 hover:text-red-800 disabled:opacity-50"
                            >
                              Remove
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex items-center justify-between pt-4">
          <span className="text-sm text-gray-500">
            {specialCount} special price{specialCount === 1 ? "" : "s"}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
