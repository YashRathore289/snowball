'use client'
import { useState, useEffect, useCallback, useMemo } from 'react';
import { postData } from '@/Services';
import { saveCache, getCache, clearCache } from './ComponentCache';
import { Calendar, Pencil, Trash2, Filter, X, Eye } from 'lucide-react';

export default function CompanyProductManagement({ cacheKey }) {
  const cachedData = cacheKey ? getCache(cacheKey) : null;

  const [products, setProducts] = useState(cachedData?.products || []);
  const [iceCreams, setIceCreams] = useState(cachedData?.iceCreams || []);
  const [loading, setLoading] = useState(!cachedData);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isAddMode, setIsAddMode] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false); // 👈 NEW
  const [formData, setFormData] = useState({
    companyproductid: '',
    entry_date: new Date().toISOString().split('T')[0]
  });
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Filter states
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedDate, setSelectedDate] = useState(''); // 👈 NEW: date filter
  const [isFiltered, setIsFiltered] = useState(false);

  const currentYear = new Date().getFullYear();
  const yearRange = useMemo(() => {
    const years = [];
    for (let i = currentYear + 2; i >= currentYear - 2; i--) {
      years.push(i);
    }
    return years;
  }, []);

  const months = useMemo(() => [
    { value: '01', label: 'January' }, { value: '02', label: 'February' },
    { value: '03', label: 'March' }, { value: '04', label: 'April' },
    { value: '05', label: 'May' }, { value: '06', label: 'June' },
    { value: '07', label: 'July' }, { value: '08', label: 'August' },
    { value: '09', label: 'September' }, { value: '10', label: 'October' },
    { value: '11', label: 'November' }, { value: '12', label: 'December' },
  ], []);

  const [entries, setEntries] = useState([
    { IceCream: '', Type: '', OrderedQty: '', OrderedAmount: '', DeliveredQty: '', DeliveredAmount: '' }
  ]);

  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmAction, setConfirmAction] = useState(null);

  useEffect(() => {
    if (!toastVisible) return;
    const timer = setTimeout(() => setToastVisible(false), 5000);
    return () => clearTimeout(timer);
  }, [toastVisible]);

  const showToast = useCallback((msg) => { setToastMessage(msg); setToastVisible(true); }, []);
  const showConfirm = useCallback((msg, action) => { setConfirmMessage(msg); setConfirmAction(() => action); setConfirmVisible(true); }, []);

  const fetchProducts = useCallback(async (month = '', year = '') => {
    setLoading(true);
    try {
      let result;
      if (month || year) {
        result = await postData('companyproduct/retrieve-company-products-by-month', { month, year });
      } else {
        result = await postData('companyproduct/retrieve-company-products', {});
      }
      if (result?.status) setProducts(result.data);
    } catch (error) { console.error('Error fetching products:', error); }
    finally { setLoading(false); }
  }, []);

  const fetchIceCreams = useCallback(async () => {
    try {
      const result = await postData('product/retrieve-products', {});
      if (result?.status) setIceCreams(result.data);
    } catch (error) { console.error('Error fetching ice creams:', error); }
  }, []);

  useEffect(() => {
    if (!cachedData) { fetchProducts(); fetchIceCreams(); }
  }, [fetchProducts, fetchIceCreams, cachedData]);

  useEffect(() => {
    return () => { if (cacheKey) saveCache(cacheKey, { products, iceCreams }); };
  }, [cacheKey, products, iceCreams]);

  // 👈 UPDATED: Handle filter apply with date
  const handleApplyFilter = useCallback(() => {
    const hasFilter = !!(selectedMonth || selectedYear || selectedDate);
    setIsFiltered(hasFilter);
    if (selectedMonth || selectedYear) {
      fetchProducts(selectedMonth, selectedYear);
    } else {
      fetchProducts();
    }
  }, [selectedMonth, selectedYear, selectedDate, fetchProducts]);

  const handleClearFilter = useCallback(() => {
    setSelectedMonth(''); setSelectedYear(''); setSelectedDate(''); // 👈 clear date too
    setIsFiltered(false);
    fetchProducts('', '');
  }, [fetchProducts]);

  // 👈 NEW: Filter products by date on frontend
  const filteredProducts = useMemo(() => {
    if (!selectedDate) return products;
    return products.filter(p => p.entry_date?.startsWith(selectedDate));
  }, [products, selectedDate]);

  const summary = useMemo(() => {
    let totalOrdered = 0, totalDelivered = 0, totalOrderedAmount = 0, totalDeliveredAmount = 0;
    products.forEach(product => {
      const details = product.details;
      if (!details) return;
      const items = Array.isArray(details) ? details : (details.items || []);
      items.forEach(item => {
        totalOrdered += parseFloat(item.OrderedQty || item.qty) || 0;
        totalDelivered += parseFloat(item.DeliveredQty || 0) || 0;
        totalOrderedAmount += parseFloat(item.OrderedAmount || item.total) || 0;
        totalDeliveredAmount += parseFloat(item.DeliveredAmount || 0) || 0;
      });
    });
    return { totalProducts: products.length, totalOrdered, totalDelivered, totalRemaining: totalOrdered - totalDelivered, totalOrderedAmount, totalDeliveredAmount };
  }, [products]);

  // 👈 NEW: View handler
  const handleViewClick = useCallback((product) => {
    setSelectedProduct(product);
    setIsViewMode(true);
    setIsEditMode(false);
    setIsAddMode(false);
    setIsModalOpen(true);
  }, []);

  const handleAddClick = useCallback(() => {
    setFormData({ companyproductid: '', entry_date: new Date().toISOString().split('T')[0] });
    setEntries([{ IceCream: '', Type: '', OrderedQty: '', OrderedAmount: '', DeliveredQty: '', DeliveredAmount: '' }]);
    setIsAddMode(true); setIsEditMode(false); setIsViewMode(false); // 👈 reset view mode
    setSelectedProduct(null); setIsModalOpen(true);
  }, []);

  const handleEditClick = useCallback((product) => {
    setSelectedProduct(product);
    setFormData({ companyproductid: product.companyproductid, entry_date: product.entry_date ? product.entry_date.split('T')[0] : new Date().toISOString().split('T')[0] });
    const details = product.details;
    let items = [];
    if (Array.isArray(details)) items = details;
    else if (details?.items) items = details.items;
    setEntries(items.map(item => ({
      IceCream: item.IceCream || item.productname || '', Type: item.Type || '',
      OrderedQty: item.OrderedQty || item.qty || '', OrderedAmount: item.OrderedAmount || item.total || '',
      DeliveredQty: item.DeliveredQty || '', DeliveredAmount: item.DeliveredAmount || ''
    })));
    setIsEditMode(true); setIsAddMode(false); setIsViewMode(false); // 👈 reset view mode
    setIsModalOpen(true);
  }, []);

  const handleInputChange = useCallback((e) => { const { name, value } = e.target; setFormData(prev => ({ ...prev, [name]: value })); }, []);

  const performDelete = useCallback(async (companyproductid) => {
    try {
      const result = await postData('companyproduct/delete-company-product', { companyproductid });
      if (result?.status) {
        clearCache(cacheKey); showToast('Product deleted successfully!');
        fetchProducts(isFiltered ? selectedMonth : '', isFiltered ? selectedYear : '');
      } else { showToast(result?.message || 'Failed to delete'); }
    } catch (error) { console.error('Error deleting product:', error); showToast('Error deleting product'); }
  }, [fetchProducts, showToast, isFiltered, selectedMonth, selectedYear]);

  const handleDelete = useCallback((companyproductid) => {
    showConfirm('Are you sure you want to delete this product?', () => performDelete(companyproductid));
  }, [showConfirm, performDelete]);

  const addEntryRow = useCallback(() => {
    setEntries(prev => [...prev, { IceCream: '', Type: '', OrderedQty: '', OrderedAmount: '', DeliveredQty: '', DeliveredAmount: '' }]);
  }, []);
  const removeEntryRow = useCallback((index) => { setEntries(prev => prev.filter((_, i) => i !== index)); }, []);

  const handleEntryChange = useCallback((index, field, value) => {
    setEntries(prev => {
      const newEntries = [...prev];
      newEntries[index] = { ...newEntries[index], [field]: value };
      if (field === 'OrderedQty' || field === 'IceCream') {
        const iceCream = iceCreams.find(ic => ic.productname === newEntries[index].IceCream);
        if (iceCream) { const price = parseFloat(iceCream.productprice) || 0; const qty = parseFloat(newEntries[index].OrderedQty) || 0; newEntries[index] = { ...newEntries[index], OrderedAmount: (price * qty).toFixed(2) }; }
      }
      if (field === 'DeliveredQty' || field === 'IceCream') {
        const iceCream = iceCreams.find(ic => ic.productname === newEntries[index].IceCream);
        if (iceCream) { const price = parseFloat(iceCream.productprice) || 0; const qty = parseFloat(newEntries[index].DeliveredQty) || 0; newEntries[index] = { ...newEntries[index], DeliveredAmount: (price * qty).toFixed(2) }; }
      }
      return newEntries;
    });
  }, [iceCreams]);

  const handleSave = useCallback(async () => {
    try {
      const validEntries = entries.filter(entry => entry.IceCream);
      if (validEntries.length === 0) { showToast('Please fill at least one product'); return; }
      const details = validEntries.map(entry => ({
        IceCream: entry.IceCream, Type: entry.Type || '',
        OrderedQty: parseFloat(entry.OrderedQty) || 0, OrderedAmount: parseFloat(entry.OrderedAmount) || 0,
        DeliveredQty: parseFloat(entry.DeliveredQty) || 0, DeliveredAmount: parseFloat(entry.DeliveredAmount) || 0
      }));
      if (isAddMode) {
        const result = await postData('companyproduct/insert-company-product', { entry_date: formData.entry_date, details });
        if (result?.status) { showToast('Product added successfully!'); setIsModalOpen(false); clearCache(cacheKey); fetchProducts(isFiltered ? selectedMonth : '', isFiltered ? selectedYear : ''); }
        else { showToast(result?.message || 'Failed to add product'); }
      } else {
        const result = await postData('companyproduct/update-company-product', { companyproductid: formData.companyproductid, entry_date: formData.entry_date, details });
        if (result?.status) { showToast('Product updated successfully!'); setIsModalOpen(false); clearCache(cacheKey); fetchProducts(isFiltered ? selectedMonth : '', isFiltered ? selectedYear : ''); }
        else { showToast(result?.message || 'Failed to update product'); }
      }
    } catch (error) { console.error('Error saving product:', error); showToast('Error saving product'); }
  }, [entries, isAddMode, formData, fetchProducts, showToast, cacheKey, isFiltered, selectedMonth, selectedYear]);

  const renderDetails = useCallback((details) => {
    if (!details) return <span className="text-gray-400 italic text-xs">No items</span>;
    let items = Array.isArray(details) ? details : (details.items || []);
    if (items.length === 0) return <span className="text-gray-400 italic text-xs">No items</span>;
    return (
      <div className="space-y-2 py-1 min-w-[340px]">
        {items.map((item, idx) => {
          const ordered = parseFloat(item.OrderedQty || item.qty) || 0;
          const delivered = parseFloat(item.DeliveredQty) || 0;
          const orderedAmt = parseFloat(item.OrderedAmount || item.total) || 0;
          const deliveredAmt = parseFloat(item.DeliveredAmount) || 0;
          const remaining = ordered - delivered;
          const isComplete = remaining <= 0;
          return (
            <div key={idx} className="bg-gray-50 hover:bg-gray-100 border border-gray-100 rounded-lg px-3 py-2 transition-colors">
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-semibold text-gray-800 text-sm truncate">{item.IceCream || item.productname}</span>
                  {item.Type && <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 whitespace-nowrap">{item.Type}</span>}
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0 ${isComplete ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{isComplete ? 'Done' : `${remaining} left`}</span>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className="font-mono">Ord: <span className="text-gray-700 font-medium">{ordered}</span><span className="text-gray-400"> (₹{orderedAmt.toFixed(2)})</span></span>
                <span className="font-mono">Del: <span className="text-gray-700 font-medium">{delivered}</span><span className="text-gray-400"> (₹{deliveredAmt.toFixed(2)})</span></span>
              </div>
            </div>
          );
        })}
      </div>
    );
  }, []);

  // 👈 UPDATED: Modal for view/edit/add
  const renderModal = () => {
    if (!isModalOpen) return null;

    // View Mode
    if (isViewMode && selectedProduct) {
      return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-[95%] max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 flex justify-between items-center bg-gradient-to-r from-teal-600 to-teal-700">
              <div>
                <h2 className="text-xl font-semibold text-white">View Company Product</h2>
                <p className="text-sm text-white/80">Date: {selectedProduct.entry_date?.split('T')[0]}</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-white hover:text-gray-200 transition-colors cursor-pointer">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="overflow-y-auto p-6 max-h-[calc(90vh-120px)]">
              {renderDetails(selectedProduct.details)}
            </div>
          </div>
        </div>
      );
    }

    // Add/Edit Mode
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-[95%] max-h-[90vh] overflow-hidden">
          <div className={`px-6 py-4 flex justify-between items-center bg-gradient-to-r from-blue-600 to-blue-700`}>
            <div><h2 className="text-xl font-semibold text-white">{isEditMode ? 'Edit Company Product' : 'Add New Company Product'}</h2></div>
            <button onClick={() => setIsModalOpen(false)} className="text-white hover:text-gray-200 transition-colors cursor-pointer">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="overflow-y-auto p-6 max-h-[calc(90vh-120px)]">
            <div className="mb-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Entry Date</label>
                <input type="date" name="entry_date" value={formData.entry_date} onChange={handleInputChange}
                  className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm" />
              </div>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-6 gap-3 bg-gray-50 p-3 rounded-lg font-medium text-gray-600 text-sm">
                <div>Ice Cream</div><div>Type</div><div>Ordered Qty</div><div>Ordered Amount</div><div>Delivered Qty</div><div>Delivered Amount</div>
              </div>
              {entries.map((entry, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-center border-b border-gray-100 pb-3">
                  <div>
                    <select value={entry.IceCream} onChange={(e) => handleEntryChange(index, 'IceCream', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">Select Ice Cream</option>
                      {iceCreams.map((ice) => (<option key={ice.productid} value={ice.productname}>{ice.productname} (₹{parseFloat(ice.productprice).toFixed(2)})</option>))}
                    </select>
                  </div>
                  <div><input type="text" value={entry.Type} onChange={(e) => handleEntryChange(index, 'Type', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Type" /></div>
                  <div><input type="number" value={entry.OrderedQty} onChange={(e) => handleEntryChange(index, 'OrderedQty', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Qty" min="0" /></div>
                  <div><input type="number" value={entry.OrderedAmount} readOnly className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50" step="0.01" /></div>
                  <div><input type="number" value={entry.DeliveredQty} onChange={(e) => handleEntryChange(index, 'DeliveredQty', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Qty" min="0" /></div>
                  <div className="flex items-center gap-2">
                    <input type="number" value={entry.DeliveredAmount} readOnly className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50" step="0.01" />
                    <button onClick={() => removeEntryRow(index)} className="px-2 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm cursor-pointer">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                </div>
              ))}
              <button onClick={addEntryRow} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm cursor-pointer">+ Add More Product</button>
            </div>
          </div>
          <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
            <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors cursor-pointer">Cancel</button>
            <button onClick={handleSave} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors cursor-pointer">{isEditMode ? 'Update Product' : 'Submit Product'}</button>
          </div>
        </div>
      </div>
    );
  };

  // 👈 UPDATED: Filter with date
  const renderFilter = () => (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Filter className="w-5 h-5 text-gray-500" />
        <span className="text-sm font-medium text-gray-700">Filter by:</span>
        <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          <option value="">All Months</option>
          {months.map((m) => (<option key={m.value} value={m.value}>{m.label}</option>))}
        </select>
        <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          <option value="">All Years</option>
          {yearRange.map((year) => (<option key={year} value={year}>{year}</option>))}
        </select>
        {/* 👈 NEW: Date filter */}
        <input type="date" value={selectedDate} onChange={(e) => { setSelectedDate(e.target.value); setIsFiltered(true); }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer" />
        <button onClick={handleApplyFilter}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors cursor-pointer flex items-center gap-1.5">
          <Filter className="w-4 h-4" /> Apply
        </button>
        {isFiltered && (
          <button onClick={handleClearFilter}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm rounded-lg transition-colors cursor-pointer flex items-center gap-1.5">
            <X className="w-4 h-4" /> Clear
          </button>
        )}
        {isFiltered && (
          <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full font-medium">
            {selectedMonth ? months.find(m => m.value === selectedMonth)?.label : ''}
            {selectedMonth && selectedYear ? ' ' : ''}{selectedYear || ''}
            {selectedDate ? ` | ${selectedDate}` : ''}
          </span>
        )}
      </div>
    </div>
  );

  const renderProductTable = () => {
    if (loading) {
      return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
    }

    // 👈 Use filteredProducts instead of products
    const displayProducts = selectedDate ? filteredProducts : products;

    if (displayProducts.length === 0) {
      return <div className="text-center py-12 bg-white rounded-lg border border-gray-200"><p className="text-gray-500">{isFiltered ? 'No products found for the selected filter' : 'No company products found'}</p></div>;
    }

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">S.No</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                {/* 👈 NEW: Order Amount column */}
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Order Amt</th>
                {/* 👈 NEW: Delivered Amount column */}
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Delivered Amt</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {displayProducts.map((product, index) => {
                const details = product.details;
                let items = Array.isArray(details) ? details : (details?.items || []);
                let totalOrdered = 0, totalDelivered = 0, totalOrderedAmt = 0, totalDeliveredAmt = 0;
                items.forEach(item => {
                  totalOrdered += parseFloat(item.OrderedQty || item.qty) || 0;
                  totalDelivered += parseFloat(item.DeliveredQty || 0) || 0;
                  totalOrderedAmt += parseFloat(item.OrderedAmount || item.total) || 0;
                  totalDeliveredAmt += parseFloat(item.DeliveredAmount || 0) || 0;
                });
                return (
                  <tr key={product.companyproductid} className="hover:bg-blue-50/50 transition-colors duration-150">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 text-xs font-semibold text-gray-700">{index + 1}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-gray-400" />{product.entry_date ? product.entry_date.split('T')[0] : '-'}</div>
                    </td>
                    {/* 👈 NEW: Order Amount */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-blue-600 text-right">₹{totalOrderedAmt.toFixed(0)}</td>
                    {/* 👈 NEW: Delivered Amount */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600 text-right">₹{totalDeliveredAmt.toFixed(0)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex justify-end gap-2">
                        {/* 👈 NEW: View button */}
                        <button onClick={() => handleViewClick(product)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium rounded-lg shadow-sm hover:shadow transition-all duration-150 cursor-pointer">
                          <Eye className="w-3.5 h-3.5" /> View
                        </button>
                        <button onClick={() => handleEditClick(product)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg shadow-sm hover:shadow transition-all duration-150 cursor-pointer">
                          <Pencil className="w-3.5 h-3.5" /> Edit
                        </button>
                        <button onClick={() => handleDelete(product.companyproductid)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg shadow-sm hover:shadow transition-all duration-150 cursor-pointer">
                          <Trash2 className="w-3.5 h-3.5" /> Delete
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
      {toastVisible && (
        <div className="fixed top-4 right-4 z-60 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3">
          <span>{toastMessage}</span>
          <button onClick={() => setToastVisible(false)} className="text-white hover:text-gray-200 font-bold text-lg leading-none cursor-pointer">×</button>
        </div>
      )}
      {confirmVisible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-96 max-w-[90%]">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm Action</h3>
            <p className="text-sm text-gray-600 mb-6">{confirmMessage}</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmVisible(false)} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition-colors text-sm font-medium cursor-pointer">Cancel</button>
              <button onClick={() => { if (confirmAction) confirmAction(); setConfirmVisible(false); }} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-medium cursor-pointer">Confirm</button>
            </div>
          </div>
        </div>
      )}
      <div className="mb-8">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <div><h2 className="text-2xl font-semibold text-gray-900">Company Product Management</h2><p className="text-sm text-gray-500 mt-1">Manage all company products and inventory</p></div>
          <button onClick={handleAddClick} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 cursor-pointer">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg> Add Product
          </button>
        </div>
      </div>
      {renderFilter()}
      {renderProductTable()}
      {renderModal()}
    </div>
  );
}