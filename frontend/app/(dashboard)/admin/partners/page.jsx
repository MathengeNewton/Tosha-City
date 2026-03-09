"use client";
import { useState, useEffect } from "react";
import { apiClient } from "../../../../lib/api";
import { toast } from "react-toastify";
import { useAuth } from "../../../../contexts/AuthContext";

export default function PartnersPage() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole("admin");
  const [activeTab, setActiveTab] = useState("partners"); // partners | stock-share

  // Partners state
  const [partners, setPartners] = useState([]);
  const [loadingPartners, setLoadingPartners] = useState(true);
  const [showPartnerModal, setShowPartnerModal] = useState(false);
  const [editingPartner, setEditingPartner] = useState(null);
  const [partnerForm, setPartnerForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
    isActive: true,
  });

  // Stock share state
  const [shares, setShares] = useState([]);
  const [loadingShares, setLoadingShares] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [currentSession, setCurrentSession] = useState(null);
  const [products, setProducts] = useState([]);
  const [shareForm, setShareForm] = useState({
    partnerId: "",
    productId: "",
    sessionId: "",
    quantity: "",
    unit: "kg",
    notes: "",
  });
  const [shareFilterPaid, setShareFilterPaid] = useState(""); // '' | 'true' | 'false'

  useEffect(() => {
    loadPartners();
  }, []);

  useEffect(() => {
    if (activeTab === "stock-share") {
      loadShares();
      loadShareFormData();
    }
  }, [activeTab, shareFilterPaid]);

  const loadPartners = async () => {
    try {
      setLoadingPartners(true);
      const res = await apiClient.partners.getAll({ activeOnly: false });
      setPartners(res.data || []);
    } catch (e) {
      toast.error("Failed to load partners");
    } finally {
      setLoadingPartners(false);
    }
  };

  const loadShares = async () => {
    try {
      setLoadingShares(true);
      const params = {};
      if (shareFilterPaid === "true") params.paid = true;
      if (shareFilterPaid === "false") params.paid = false;
      const res = await apiClient.stockShare.getAll(params);
      setShares(res.data || []);
    } catch (e) {
      toast.error("Failed to load stock shares");
    } finally {
      setLoadingShares(false);
    }
  };

  const loadShareFormData = async () => {
    try {
      const [sessionRes, productsRes] = await Promise.all([
        apiClient.stockSessions.getCurrent(),
        apiClient.products.getActive(),
      ]);
      setCurrentSession(sessionRes.data?.status === "OPEN" ? sessionRes.data : null);
      setProducts(productsRes.data || []);
    } catch (e) {
      // ignore
    }
  };

  const handleOpenPartnerModal = (partner = null) => {
    if (partner) {
      setEditingPartner(partner);
      setPartnerForm({
        name: partner.name || "",
        phone: partner.phone || "",
        email: partner.email || "",
        address: partner.address || "",
        notes: partner.notes || "",
        isActive: partner.isActive !== undefined ? partner.isActive : true,
      });
    } else {
      setEditingPartner(null);
      setPartnerForm({
        name: "",
        phone: "",
        email: "",
        address: "",
        notes: "",
        isActive: true,
      });
    }
    setShowPartnerModal(true);
  };

  const handlePartnerSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingPartner) {
        await apiClient.partners.update(editingPartner.id, partnerForm);
        toast.success("Partner updated");
      } else {
        await apiClient.partners.create(partnerForm);
        toast.success("Partner created");
      }
      setShowPartnerModal(false);
      loadPartners();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save partner");
    }
  };

  const handleDeletePartner = async (id) => {
    if (!confirm("Delete this partner?")) return;
    try {
      await apiClient.partners.delete(id);
      toast.success("Partner deleted");
      loadPartners();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete");
    }
  };

  const handleOpenShareModal = () => {
    setShareForm({
      partnerId: "",
      productId: "",
      sessionId: currentSession?.id?.toString() || "",
      quantity: "",
      unit: "kg",
      notes: "",
    });
    setShowShareModal(true);
  };

  const handleShareSubmit = async (e) => {
    e.preventDefault();
    const qty = parseFloat(shareForm.quantity);
    if (isNaN(qty) || qty <= 0) {
      toast.error("Enter a valid quantity");
      return;
    }
    const product = products.find((p) => p.id === parseInt(shareForm.productId));
    if (!product) {
      toast.error("Select a product");
      return;
    }
    try {
      await apiClient.stockShare.create({
        partnerId: parseInt(shareForm.partnerId),
        productId: parseInt(shareForm.productId),
        sessionId: shareForm.sessionId ? parseInt(shareForm.sessionId) : undefined,
        quantity: qty,
        unit: shareForm.unit || product.unit,
        notes: shareForm.notes || undefined,
      });
      toast.success("Stock share recorded");
      setShowShareModal(false);
      loadShares();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to record share");
    }
  };

  const handleMarkPaid = async (id) => {
    try {
      await apiClient.stockShare.markPaid(id);
      toast.success("Marked as paid");
      loadShares();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update");
    }
  };

  const activePartners = partners.filter((p) => p.isActive !== false);

  return (
    <div className="w-full lg:p-2 space-y-6 bg-gray-50 min-h-screen">
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Partners</h1>
        <p className="text-gray-600 mt-1 text-sm sm:text-base">
          People you share meat with – track what has been shared and what has been paid
        </p>
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex -mb-px">
          <button
            type="button"
            onClick={() => setActiveTab("partners")}
            className={`px-4 py-3 text-sm font-medium border-b-2 ${
              activeTab === "partners"
                ? "border-blue-900 text-blue-900"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Partners
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("stock-share")}
            className={`px-4 py-3 text-sm font-medium border-b-2 ${
              activeTab === "stock-share"
                ? "border-blue-900 text-blue-900"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Stock Share
          </button>
        </nav>
      </div>

      {activeTab === "partners" && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 flex justify-between items-center">
            <span className="text-gray-600">Manage partner contacts</span>
            <button
              type="button"
              onClick={() => handleOpenPartnerModal()}
              className="bg-blue-900 text-white px-4 py-2 rounded-md hover:bg-[#1e88b5] text-sm"
            >
              Add Partner
            </button>
          </div>
          {loadingPartners ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    {isAdmin && (
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {partners.length === 0 ? (
                    <tr>
                      <td colSpan={isAdmin ? 4 : 3} className="px-4 py-6 text-center text-gray-500">
                        No partners yet. Add one to start recording stock shares.
                      </td>
                    </tr>
                  ) : (
                    partners.map((p) => (
                      <tr key={p.id}>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{p.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{p.phone || p.email || "–"}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              p.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {p.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        {isAdmin && (
                          <td className="px-4 py-3 text-sm">
                            <button
                              type="button"
                              onClick={() => handleOpenPartnerModal(p)}
                              className="text-blue-600 hover:underline mr-3"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeletePartner(p.id)}
                              className="text-red-600 hover:underline"
                            >
                              Delete
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "stock-share" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex gap-2 items-center">
              <label className="text-sm text-gray-700">Filter:</label>
              <select
                value={shareFilterPaid}
                onChange={(e) => setShareFilterPaid(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="">All</option>
                <option value="false">Unpaid</option>
                <option value="true">Paid</option>
              </select>
            </div>
            <button
              type="button"
              onClick={handleOpenShareModal}
              className="bg-blue-900 text-white px-4 py-2 rounded-md hover:bg-[#1e88b5] text-sm"
            >
              Record Stock Share
            </button>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {loadingShares ? (
              <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Partner</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paid</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {shares.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-4 py-6 text-center text-gray-500">
                          No stock shares recorded yet.
                        </td>
                      </tr>
                    ) : (
                      shares.map((s) => (
                        <tr key={s.id}>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {s.recordedAt ? new Date(s.recordedAt).toLocaleDateString() : "–"}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">
                            {s.partner?.name || "–"}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">{s.product?.name || "–"}</td>
                          <td className="px-4 py-3 text-sm text-right tabular-nums">
                            {parseFloat(s.quantity).toFixed(2)} {s.unit}
                          </td>
                          <td className="px-4 py-3">
                            {s.paid ? (
                              <span className="text-green-600 text-sm font-medium">
                                Yes {s.paidAt ? new Date(s.paidAt).toLocaleDateString() : ""}
                              </span>
                            ) : (
                              <span className="text-amber-600 text-sm">Unpaid</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {!s.paid && (
                              <button
                                type="button"
                                onClick={() => handleMarkPaid(s.id)}
                                className="text-blue-600 hover:underline text-sm"
                              >
                                Mark paid
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Partner modal */}
      {showPartnerModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              {editingPartner ? "Edit Partner" : "Add Partner"}
            </h2>
            <form onSubmit={handlePartnerSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={partnerForm.name}
                  onChange={(e) => setPartnerForm({ ...partnerForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="text"
                  value={partnerForm.phone}
                  onChange={(e) => setPartnerForm({ ...partnerForm, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={partnerForm.email}
                  onChange={(e) => setPartnerForm({ ...partnerForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input
                  type="text"
                  value={partnerForm.address}
                  onChange={(e) => setPartnerForm({ ...partnerForm, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={partnerForm.notes}
                  onChange={(e) => setPartnerForm({ ...partnerForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={2}
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="partnerActive"
                  checked={partnerForm.isActive}
                  onChange={(e) => setPartnerForm({ ...partnerForm, isActive: e.target.checked })}
                  className="h-4 w-4 text-blue-600 rounded border-gray-300"
                />
                <label htmlFor="partnerActive" className="ml-2 text-sm text-gray-700">
                  Active
                </label>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPartnerModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button type="submit" className="flex-1 px-4 py-2 bg-blue-900 text-white rounded-md hover:bg-[#1e88b5]">
                  {editingPartner ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record share modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Record Stock Share</h2>
            {!currentSession && (
              <p className="text-amber-700 text-sm mb-4 bg-amber-50 p-2 rounded">
                No open stock session. You can still record the share; it will not deduct from session stock.
              </p>
            )}
            <form onSubmit={handleShareSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Partner *</label>
                <select
                  value={shareForm.partnerId}
                  onChange={(e) => setShareForm({ ...shareForm, partnerId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                >
                  <option value="">Select partner</option>
                  {activePartners.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product *</label>
                <select
                  value={shareForm.productId}
                  onChange={(e) => {
                    const p = products.find((x) => x.id === parseInt(e.target.value));
                    setShareForm({
                      ...shareForm,
                      productId: e.target.value,
                      unit: p?.unit || "kg",
                    });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                >
                  <option value="">Select product</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.unit})
                    </option>
                  ))}
                </select>
              </div>
              {currentSession && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Session (deduct from stock)</label>
                  <input
                    type="text"
                    value={currentSession.id}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50"
                  />
                  <input type="hidden" name="sessionId" value={shareForm.sessionId} />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={shareForm.quantity}
                    onChange={(e) => setShareForm({ ...shareForm, quantity: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                  <input
                    type="text"
                    value={shareForm.unit}
                    onChange={(e) => setShareForm({ ...shareForm, unit: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <input
                  type="text"
                  value={shareForm.notes}
                  onChange={(e) => setShareForm({ ...shareForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowShareModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button type="submit" className="flex-1 px-4 py-2 bg-blue-900 text-white rounded-md hover:bg-[#1e88b5]">
                  Record Share
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
