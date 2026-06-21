'use client'
import { useState, useEffect, useCallback, useMemo } from 'react';
import { postData } from '@/Services';
import { saveCache, getCache } from './ComponentCache';

export default function CompanyProductManagement({ cacheKey }) {
  // Restore from cache if available
  const cachedData = cacheKey ? getCache(cacheKey) : null;

  const [products, setProducts] = useState(cachedData?.products || []);
  const [iceCreams, setIceCreams] = useState(cachedData?.iceCreams || []);
  const [loading, setLoading] = useState(!cachedData);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isAddMode, setIsAddMode] = useState(false);
  const [formData, setFormData] = useState({
    companyproductid: '',
    icecreamname: '',
    type: '',
    orderedqty: '',
    orderedamount: '',
    deliveredqty: '',
    deliveredamount: '',
    entry_date: new Date().toISOString().split('T')[0]
  });
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Multi-entry states
  const [entries, setEntries] = useState([
    {
      icecreamname: '',
      type: '',
      orderedqty: '',
      orderedamount: '',
      deliveredqty: '',
      deliveredamount: ''
    }
  ]);

  // Toast notification state
  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);

  // Confirmation popup state
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmAction, setConfirmAction] = useState(null);

  // Auto-dismiss toast after 5 seconds
  useEffect(() => {
    if (!toastVisible) return;
    const timer = setTimeout(() => setToastVisible(false), 5000);
    return () => clearTimeout(timer);
  }, [toastVisible]);

  const showToast = useCallback((msg) => {
    setToastMessage(msg);
    setToastVisible(true);
  }, []);

  const showConfirm = useCallback((msg, action) => {
    setConfirmMessage(msg);
    setConfirmAction(() => action);
    setConfirmVisible(true);
  }, []);

  // Fetch all company products
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const result = await postData('companyproduct/retrieve-company-products', {});
      if (result?.status) {
        setProducts(result.data);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch ice creams from products table
  const fetchIceCreams = useCallback(async () => {
    try {
      const result = await postData('product/retrieve-products', {});
      if (result?.status) {
        setIceCreams(result.data);
      }
    } catch (error) {
      console.error('Error fetching ice creams:', error);
    }
  }, []);

  useEffect(() => {
    if (!cachedData) {
      fetchProducts();
      fetchIceCreams();
    }
  }, [fetchProducts, fetchIceCreams, cachedData]);

  // Save state to cache before unmounting
  useEffect(() => {
    return () => {
      if (cacheKey) {
        saveCache(cacheKey, {
          products,
          iceCreams,
        });
      }
    };
  }, [cacheKey, products, iceCreams]);

  // Memoized summary from products
  const summary = useMemo(() => {
    let totalOrdered = 0;
    let totalDelivered = 0;
    let totalOrderedAmount = 0;
    let totalDeliveredAmount = 0;

    products.forEach(product => {
      totalOrdered += parseInt(product.orderedqty) || 0;
      totalDelivered += parseInt(product.deliveredqty) || 0;
      totalOrderedAmount += parseFloat(product.orderedamount) || 0;
      totalDeliveredAmount += parseFloat(product.deliveredamount) || 0;
    });

    return {
      totalProducts: products.length,
      totalOrdered,
      totalDelivered,
      totalRemaining: totalOrdered - totalDelivered,
      totalOrderedAmount,
      totalDeliveredAmount,
    };
  }, [products]);

  // Handle Add button click
  const handleAddClick = useCallback(() => {
    setFormData({
      companyproductid: '',
      icecreamname: '',
      type: '',
      orderedqty: '',
      orderedamount: '',
      deliveredqty: '',
      deliveredamount: '',
      entry_date: new Date().toISOString().split('T')[0]
    });
    setEntries([
      {
        icecreamname: '',
        type: '',
        orderedqty: '',
        orderedamount: '',
        deliveredqty: '',
        deliveredamount: ''
      }
    ]);
    setIsAddMode(true);
    setIsEditMode(false);
    setSelectedProduct(null);
    setIsModalOpen(true);
  }, []);

  // Handle Edit button click
  const handleEditClick = useCallback((product) => {
    setSelectedProduct(product);
    setFormData({
      companyproductid: product.companyproductid,
      icecreamname: product.icecreamname,
      type: product.type,
      orderedqty: product.orderedqty,
      orderedamount: product.orderedamount,
      deliveredqty: product.deliveredqty,
      deliveredamount: product.deliveredamount,
      entry_date: product.entry_date || new Date().toISOString().split('T')[0]
    });
    setIsEditMode(true);
    setIsAddMode(false);
    setIsModalOpen(true);
  }, []);

  // Handle form input change
  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  // Delete function (actual logic after confirmation)
  const performDelete = useCallback(async (companyproductid) => {
    try {
      const result = await postData('companyproduct/delete-company-product', { companyproductid });
      if (result?.status) {
        showToast('Product deleted successfully!');
        fetchProducts();
      } else {
        showToast(result?.message || 'Failed to delete');
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      showToast('Error deleting product');
    }
  }, [fetchProducts, showToast]);

  // Handle Delete click – opens confirmation popup
  const handleDelete = useCallback((companyproductid) => {
    showConfirm(
      'Are you sure you want to delete this product?',
      () => performDelete(companyproductid)
    );
  }, [showConfirm, performDelete]);

  // Multi-entry handlers
  const addEntryRow = useCallback(() => {
    setEntries(prev => [...prev, {
      icecreamname: '',
      type: '',
      orderedqty: '',
      orderedamount: '',
      deliveredqty: '',
      deliveredamount: ''
    }]);
  }, []);

  const removeEntryRow = useCallback((index) => {
    setEntries(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleEntryChange = useCallback((index, field, value) => {
    setEntries(prev => {
      const newEntries = [...prev];
      newEntries[index] = { ...newEntries[index], [field]: value };

      // Auto-calculate amount if product price is available
      if (field === 'orderedqty' || field === 'icecreamname') {
        const iceCream = iceCreams.find(ic => ic.productname === newEntries[index].icecreamname);
        if (iceCream) {
          const price = parseFloat(iceCream.productprice) || 0;
          const qty = parseFloat(newEntries[index].orderedqty) || 0;
          newEntries[index] = { ...newEntries[index], orderedamount: (price * qty).toFixed(2) };
        }
      }

      if (field === 'deliveredqty' || field === 'icecreamname') {
        const iceCream = iceCreams.find(ic => ic.productname === newEntries[index].icecreamname);
        if (iceCream) {
          const price = parseFloat(iceCream.productprice) || 0;
          const qty = parseFloat(newEntries[index].deliveredqty) || 0;
          newEntries[index] = { ...newEntries[index], deliveredamount: (price * qty).toFixed(2) };
        }
      }

      return newEntries;
    });
  }, [iceCreams]);

  // Handle Save - Single or Multiple
  const handleSave = useCallback(async () => {
    try {
      const hasMultipleEntries = entries.length > 1 || (entries.length === 1 && entries[0].icecreamname);

      if (hasMultipleEntries && isAddMode) {
        // Save multiple entries
        let successCount = 0;
        let failedCount = 0;

        for (const entry of entries) {
          if (entry.icecreamname && entry.type) {
            const result = await postData('companyproduct/insert-company-product', {
              icecreamname: entry.icecreamname,
              type: entry.type,
              orderedqty: entry.orderedqty || 0,
              orderedamount: entry.orderedamount || 0,
              deliveredqty: entry.deliveredqty || 0,
              deliveredamount: entry.deliveredamount || 0,
              entry_date: formData.entry_date
            });
            if (result?.status) {
              successCount++;
            } else {
              failedCount++;
            }
          }
        }

        if (successCount > 0 && failedCount === 0) {
          showToast(`${successCount} products added successfully!`);
        } else if (successCount > 0) {
          showToast(`${successCount} added, ${failedCount} failed.`);
        } else {
          showToast('Failed to add products. Please check your entries.');
        }
        setIsModalOpen(false);
        fetchProducts();
      } else {
        // Single entry (add or edit)
        let result;
        if (isAddMode) {
          result = await postData('companyproduct/insert-company-product', {
            icecreamname: formData.icecreamname,
            type: formData.type,
            orderedqty: formData.orderedqty || 0,
            orderedamount: formData.orderedamount || 0,
            deliveredqty: formData.deliveredqty || 0,
            deliveredamount: formData.deliveredamount || 0,
            entry_date: formData.entry_date
          });
          if (result?.status) {
            showToast('Product added successfully!');
            setIsModalOpen(false);
            fetchProducts();
          } else {
            showToast(result?.message || 'Failed to add product');
          }
        } else {
          result = await postData('companyproduct/update-company-product', {
            companyproductid: formData.companyproductid,
            icecreamname: formData.icecreamname,
            type: formData.type,
            orderedqty: formData.orderedqty,
            orderedamount: formData.orderedamount,
            deliveredqty: formData.deliveredqty,
            deliveredamount: formData.deliveredamount,
            entry_date: formData.entry_date
          });
          if (result?.status) {
            showToast('Product updated successfully!');
            setIsModalOpen(false);
            fetchProducts();
          } else {
            showToast(result?.message || 'Failed to update product');
          }
        }
      }
    } catch (error) {
      console.error('Error saving product:', error);
      showToast('Error saving product');
    }
  }, [entries, isAddMode, formData, iceCreams, fetchProducts, showToast]);

  // Stock status helper
  const getStockStatus = useCallback((remaining) => {
    if (remaining <= 0) return { label: 'Out of Stock', className: 'bg-red-100 text-red-700' };
    if (remaining <= 10) return { label: 'Low Stock', className: 'bg-orange-100 text-orange-700' };
    if (remaining <= 50) return { label: 'Medium Stock', className: 'bg-yellow-100 text-yellow-700' };
    return { label: 'In Stock', className: 'bg-green-100 text-green-700' };
  }, []);

  // Render Modal
  const renderModal = () => {
    if (!isModalOpen) return null;

    const hasMultipleEntries = entries.length > 1 || (entries.length === 1 && entries[0].icecreamname);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-[95%] max-h-[90vh] overflow-hidden">
          {/* Modal Header */}
          <div className={`px-6 py-4 flex justify-between items-center ${
            isAddMode && hasMultipleEntries
              ? 'bg-gradient-to-r from-purple-600 to-purple-700'
              : isAddMode
                ? 'bg-gradient-to-r from-emerald-600 to-emerald-700'
                : 'bg-gradient-to-r from-blue-600 to-blue-700'
          }`}>
            <div>
              <h2 className="text-xl font-semibold text-white">
                {isAddMode && hasMultipleEntries
                  ? 'Add Multiple Products'
                  : isAddMode
                    ? 'Add New Company Product'
                    : 'Edit Company Product'
                }
              </h2>
              {isAddMode && hasMultipleEntries && (
                <p className="text-sm text-white/80">Add multiple products in one entry</p>
              )}
            </div>
            <button
              onClick={() => setIsModalOpen(false)}
              className="text-white hover:text-gray-200 transition-colors cursor-pointer"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Modal Body */}
          <div className="overflow-y-auto p-6 max-h-[calc(90vh-120px)]">
            {/* Date Field */}
            <div className="mb-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Entry Date</label>
                <input
                  type="date"
                  name="entry_date"
                  value={formData.entry_date}
                  onChange={handleInputChange}
                  className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
            </div>

            {isAddMode ? (
              // Multiple Entries Form
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-6 gap-3 bg-gray-50 p-3 rounded-lg font-medium text-gray-600 text-sm">
                  <div>Ice Cream</div>
                  <div>Type</div>
                  <div>Ordered Qty</div>
                  <div>Ordered Amount</div>
                  <div>Delivered Qty</div>
                  <div>Delivered Amount</div>
                </div>

                {entries.map((entry, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-center border-b border-gray-100 pb-3">
                    <div>
                      <select
                        value={entry.icecreamname}
                        onChange={(e) => handleEntryChange(index, 'icecreamname', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select Ice Cream</option>
                        {iceCreams.map((ice) => (
                          <option key={ice.productid} value={ice.productname}>
                            {ice.productname} (₹{parseFloat(ice.productprice).toFixed(2)})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <input
                        type="text"
                        value={entry.type}
                        onChange={(e) => handleEntryChange(index, 'type', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Type (e.g., m-2)"
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        value={entry.orderedqty}
                        onChange={(e) => handleEntryChange(index, 'orderedqty', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Qty"
                        min="0"
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        value={entry.orderedamount}
                        onChange={(e) => handleEntryChange(index, 'orderedamount', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                        placeholder="Auto-calc"
                        readOnly
                        step="0.01"
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        value={entry.deliveredqty}
                        onChange={(e) => handleEntryChange(index, 'deliveredqty', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Qty"
                        min="0"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={entry.deliveredamount}
                        onChange={(e) => handleEntryChange(index, 'deliveredamount', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                        placeholder="Auto-calc"
                        readOnly
                        step="0.01"
                      />
                      <button
                        onClick={() => removeEntryRow(index)}
                        className="px-2 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm cursor-pointer"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}

                <button
                  onClick={addEntryRow}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm cursor-pointer"
                >
                  + Add More Product
                </button>
              </div>
            ) : (
              // Edit Mode - Single Entry Form
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Ice Cream Name</label>
                    <select
                      name="icecreamname"
                      value={formData.icecreamname}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    >
                      <option value="">Select Ice Cream</option>
                      {iceCreams.map((icecream) => (
                        <option key={icecream.productid} value={icecream.productname}>
                          {icecream.productname} (₹{parseFloat(icecream.productprice).toFixed(2)})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Type</label>
                    <input
                      type="text"
                      name="type"
                      value={formData.type}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      placeholder="Enter type (e.g., m-2, cup, cone)"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Ordered Quantity</label>
                    <input
                      type="number"
                      name="orderedqty"
                      value={formData.orderedqty}
                      onChange={(e) => {
                        const qty = e.target.value;
                        setFormData(prev => ({ ...prev, orderedqty: qty }));
                        const iceCream = iceCreams.find(ic => ic.productname === formData.icecreamname);
                        if (iceCream) {
                          const price = parseFloat(iceCream.productprice) || 0;
                          setFormData(prev => ({
                            ...prev,
                            orderedamount: (price * (parseFloat(qty) || 0)).toFixed(2)
                          }));
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      placeholder="Enter ordered quantity"
                      min="0"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Ordered Amount (₹)</label>
                    <input
                      type="number"
                      name="orderedamount"
                      value={formData.orderedamount}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-gray-50"
                      placeholder="Auto-calculated"
                      readOnly
                      step="0.01"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Delivered Quantity</label>
                    <input
                      type="number"
                      name="deliveredqty"
                      value={formData.deliveredqty}
                      onChange={(e) => {
                        const qty = e.target.value;
                        setFormData(prev => ({ ...prev, deliveredqty: qty }));
                        const iceCream = iceCreams.find(ic => ic.productname === formData.icecreamname);
                        if (iceCream) {
                          const price = parseFloat(iceCream.productprice) || 0;
                          setFormData(prev => ({
                            ...prev,
                            deliveredamount: (price * (parseFloat(qty) || 0)).toFixed(2)
                          }));
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      placeholder="Enter delivered quantity"
                      min="0"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Delivered Amount (₹)</label>
                    <input
                      type="number"
                      name="deliveredamount"
                      value={formData.deliveredamount}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-gray-50"
                      placeholder="Auto-calculated"
                      readOnly
                      step="0.01"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
            <button
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className={`px-4 py-2 text-white rounded-lg transition-colors cursor-pointer ${
                isAddMode && (entries.length > 1 || (entries.length === 1 && entries[0].icecreamname))
                  ? 'bg-purple-600 hover:bg-purple-700'
                  : isAddMode
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isAddMode && (entries.length > 1 || (entries.length === 1 && entries[0].icecreamname))
                ? 'Add All Products'
                : isAddMode
                  ? 'Add Product'
                  : 'Update Product'
              }
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render Product Table
  const renderProductTable = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    if (products.length === 0) {
      return (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-500">No company products found</p>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">S.No</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ice Cream</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ordered Qty</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ordered Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Delivered Qty</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Delivered Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {products.map((product, index) => {
                const remaining = parseInt(product.remainingqty) || 0;
                const status = getStockStatus(remaining);
                return (
                  <tr key={product.companyproductid} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product.entry_date ? product.entry_date.split('T')[0] : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{product.icecreamname}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded-full">
                        {product.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{product.orderedqty}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-blue-600">
                      ₹{parseFloat(product.orderedamount || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-semibold">{product.deliveredqty}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                      ₹{parseFloat(product.deliveredamount || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${status.className}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditClick(product)}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg transition-colors cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(product.companyproductid)}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded-lg transition-colors cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* Toast Notification */}
      {toastVisible && (
        <div className="fixed top-4 right-4 z-50 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3">
          <span>{toastMessage}</span>
          <button
            onClick={() => setToastVisible(false)}
            className="text-white hover:text-gray-200 font-bold text-lg leading-none cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {/* Confirmation Popup */}
      {confirmVisible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-96 max-w-[90%]">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm Action</h3>
            <p className="text-sm text-gray-600 mb-6">{confirmMessage}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmVisible(false)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition-colors text-sm font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (confirmAction) confirmAction();
                  setConfirmVisible(false);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-medium cursor-pointer"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-8">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Company Product Management</h2>
            <p className="text-sm text-gray-500 mt-1">Manage all company products and inventory</p>
          </div>
          <button
            onClick={handleAddClick}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Product
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 mt-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-gray-600">Total Products</p>
            <p className="text-xl font-bold text-blue-600">{summary.totalProducts}</p>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
            <p className="text-xs text-gray-600">Total Ordered Qty</p>
            <p className="text-xl font-bold text-purple-600">{summary.totalOrdered}</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-gray-600">Total Ordered Amount</p>
            <p className="text-xl font-bold text-blue-600">₹{summary.totalOrderedAmount.toFixed(2)}</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-xs text-gray-600">Total Delivered Qty</p>
            <p className="text-xl font-bold text-green-600">{summary.totalDelivered}</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-xs text-gray-600">Total Delivered Amount</p>
            <p className="text-xl font-bold text-green-600">₹{summary.totalDeliveredAmount.toFixed(2)}</p>
          </div>
          <div className={`border rounded-lg p-3 ${summary.totalRemaining > 0 ? 'bg-orange-50 border-orange-200' : 'bg-red-50 border-red-200'}`}>
            <p className="text-xs text-gray-600">Total Remaining</p>
            <p className={`text-xl font-bold ${summary.totalRemaining > 0 ? 'text-orange-600' : 'text-red-600'}`}>
              {summary.totalRemaining}
            </p>
          </div>
        </div>
      </div>

      {renderProductTable()}
      {renderModal()}
    </div>
  );
}