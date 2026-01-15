"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "../../../../lib/api";
import { toast } from "react-toastify";

export default function StockManagementPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [currentSession, setCurrentSession] = useState(null);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [stockEntries, setStockEntries] = useState([]);
  const [activeTab, setActiveTab] = useState('overview'); // overview, opening, incoming, wastage, closing

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Get current session
      const sessionRes = await apiClient.stockSessions.getCurrent();
      const session = sessionRes.data;
      setCurrentSession(session);

      // Get products
      const productsRes = await apiClient.products.getActive();
      setProducts(productsRes.data || []);

      // Get suppliers
      const suppliersRes = await apiClient.suppliers.getAll({ activeOnly: true });
      setSuppliers(suppliersRes.data || []);

      // Get stock entries if session exists
      if (session) {
        const entriesRes = await apiClient.stockEntries.getAll({ sessionId: session.id });
        setStockEntries(entriesRes.data || []);
      }

    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSession = async () => {
    try {
      await apiClient.stockSessions.open({});
      toast.success("Stock session opened successfully");
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to open session");
    }
  };

  const handleCloseSession = async () => {
    if (!currentSession) return;
    
    if (!confirm("Are you sure you want to close this session? Make sure all sales are paid and closing stock is recorded.")) {
      return;
    }

    try {
      await apiClient.stockSessions.close(currentSession.id);
      toast.success("Stock session closed successfully");
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to close session");
    }
  };

  if (loading) {
    return (
      <div className="w-full lg:p-2 space-y-8 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="w-full lg:p-2 space-y-8 bg-gray-50 min-h-screen">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
            Stock Management
          </h1>
          <p className="text-gray-600 mt-1">Manage stock sessions and entries</p>
        </div>
        <div className="flex gap-2">
          {!currentSession ? (
            <button
              onClick={handleOpenSession}
              className="bg-blue-900 text-white px-4 py-2 rounded-md hover:bg-[#1e88b5] transition-colors text-sm"
            >
              Open Stock Session
            </button>
          ) : currentSession.status === 'OPEN' ? (
            <button
              onClick={handleCloseSession}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors text-sm"
            >
              Close Session
            </button>
          ) : null}
        </div>
      </div>

      {/* Session Status */}
      {currentSession && (
        <div className={`p-6 rounded-xl shadow-sm border-2 ${
          currentSession.status === 'OPEN' 
            ? 'bg-green-50 border-green-200' 
            : 'bg-gray-50 border-gray-200'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Current Session: {new Date(currentSession.sessionDate).toLocaleDateString()}
              </h3>
              <p className="text-sm text-gray-600">
                Status: <span className={`font-semibold ${
                  currentSession.status === 'OPEN' ? 'text-green-600' : 'text-gray-600'
                }`}>
                  {currentSession.status}
                </span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      {currentSession && currentSession.status === 'OPEN' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {['overview', 'opening', 'incoming', 'wastage', 'closing'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-4 text-sm font-medium border-b-2 ${
                    activeTab === tab
                      ? 'border-blue-900 text-blue-900'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab === 'wastage' ? 'Wastage' : tab.charAt(0).toUpperCase() + tab.slice(1) + ' Stock'}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <StockOverview 
                session={currentSession} 
                products={products} 
                stockEntries={stockEntries}
                onRefresh={loadData}
              />
            )}
            {activeTab === 'opening' && (
              <StockEntryForm 
                session={currentSession} 
                products={products} 
                type="OPENING"
                onSuccess={loadData}
              />
            )}
            {activeTab === 'incoming' && (
              <StockEntryForm 
                session={currentSession} 
                products={products}
                suppliers={suppliers}
                type="INCOMING"
                onSuccess={loadData}
              />
            )}
            {activeTab === 'wastage' && (
              <StockEntryForm 
                session={currentSession} 
                products={products} 
                type="WASTAGE"
                onSuccess={loadData}
              />
            )}
            {activeTab === 'closing' && (
              <StockEntryForm 
                session={currentSession} 
                products={products} 
                type="CLOSING"
                onSuccess={loadData}
              />
            )}
          </div>
        </div>
      )}

      {!currentSession && (
        <div className="bg-white p-12 rounded-xl shadow-sm border border-gray-200 text-center">
          <p className="text-gray-600 mb-4">No active stock session. Open a session to start managing stock.</p>
          <button
            onClick={handleOpenSession}
            className="bg-blue-900 text-white px-6 py-3 rounded-md hover:bg-[#1e88b5] transition-colors"
          >
            Open Stock Session
          </button>
        </div>
      )}
    </div>
  );
}

// Stock Overview Component
function StockOverview({ session, products, stockEntries, onRefresh }) {
  const openingEntries = stockEntries.filter(e => e.type === 'OPENING');
  const incomingEntries = stockEntries.filter(e => e.type === 'INCOMING');
  const closingEntries = stockEntries.filter(e => e.type === 'CLOSING');
  const wastageEntries = stockEntries.filter(e => e.type === 'WASTAGE');

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">Opening Stock</p>
          <p className="text-2xl font-bold text-gray-900">{openingEntries.length} entries</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">Incoming Stock</p>
          <p className="text-2xl font-bold text-gray-900">{incomingEntries.length} entries</p>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">Closing Stock</p>
          <p className="text-2xl font-bold text-gray-900">{closingEntries.length} entries</p>
        </div>
        <div className="bg-red-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">Wastage</p>
          <p className="text-2xl font-bold text-gray-900">{wastageEntries.length} entries</p>
        </div>
      </div>

      <div className="mt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Stock Entries</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stockEntries.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-4 text-center text-gray-500">
                    No stock entries yet
                  </td>
                </tr>
              ) : (
                stockEntries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {entry.product?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        entry.type === 'OPENING' ? 'bg-blue-100 text-blue-800' :
                        entry.type === 'INCOMING' ? 'bg-green-100 text-green-800' :
                        entry.type === 'CLOSING' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {entry.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {entry.quantity} {entry.unit}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(entry.recordedAt).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Stock Entry Form Component
function StockEntryForm({ session, products, suppliers = [], type, onSuccess }) {
  const [formData, setFormData] = useState({
    productId: '',
    supplierId: '',
    quantity: '',
    unit: 'kg',
    notes: '',
    photoUrl: null,
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.productId || !formData.quantity) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setSubmitting(true);
      
      let photoUrl = null;
      // Upload photo if provided (required for wastage, optional for closing)
      if (type === 'WASTAGE' && !selectedFile) {
        toast.error("Photo evidence is required for wastage entries");
        setSubmitting(false);
        return;
      }
      if (selectedFile) {
        const uploadRes = await apiClient.uploads.upload(selectedFile);
        // Store the filename (full path) in the database
        photoUrl = uploadRes.data.filename;
      }

      await apiClient.stockEntries.create({
        sessionId: session.id,
        productId: parseInt(formData.productId),
        supplierId: type === 'INCOMING' && formData.supplierId ? parseInt(formData.supplierId) : undefined,
        type: type,
        quantity: parseFloat(formData.quantity),
        unit: formData.unit,
        notes: formData.notes || null,
        photoUrl: photoUrl,
      });
      toast.success(`${type} stock entry recorded successfully`);
      setFormData({ productId: '', supplierId: '', quantity: '', unit: 'kg', notes: '', photoUrl: null });
      setSelectedFile(null);
      setPreviewUrl(null);
      onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to record stock entry");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Product *
        </label>
        <select
          value={formData.productId}
          onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        >
          <option value="">Select a product</option>
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name} ({product.unit})
            </option>
          ))}
        </select>
      </div>

      {type === 'INCOMING' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Supplier *
          </label>
          <select
            value={formData.supplierId}
            onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Select a supplier</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Quantity *
          </label>
          <input
            type="number"
            step="0.01"
            value={formData.quantity}
            onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Unit
          </label>
          <input
            type="text"
            value={formData.unit}
            onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="kg"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notes
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows="3"
        />
      </div>

      {type === 'WASTAGE' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Photo Evidence *
          </label>
          <p className="text-xs text-gray-500 mb-2">Wastage entries require photo evidence</p>
          <input
            type="file"
            accept="image/jpeg,image/jpg,image/png"
            onChange={handleFileChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          {previewUrl && (
            <div className="mt-2">
              <img src={previewUrl} alt="Preview" className="max-w-xs max-h-48 rounded-md border border-gray-300" />
            </div>
          )}
        </div>
      )}
      {type === 'CLOSING' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Photo Evidence (Optional)
          </label>
          <input
            type="file"
            accept="image/jpeg,image/jpg,image/png"
            onChange={handleFileChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {previewUrl && (
            <div className="mt-2">
              <img src={previewUrl} alt="Preview" className="max-w-xs max-h-48 rounded-md border border-gray-300" />
            </div>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-blue-900 text-white px-4 py-2 rounded-md hover:bg-[#1e88b5] transition-colors disabled:opacity-50"
      >
        {submitting ? 'Recording...' : `Record ${type} Stock`}
      </button>
    </form>
  );
}

