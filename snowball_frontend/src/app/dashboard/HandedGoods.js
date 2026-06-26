'use client'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { postData } from '@/Services';
import { saveCache, getCache, clearCache } from './ComponentCache';

// ---------- helpers ----------
function evaluateExpression(expr) {
  if (!expr || typeof expr !== 'string') return 0;
  const trimmed = expr.trim();
  if (trimmed === '') return 0;
  const isSafe = /^[0-9+\-*/().\s]+$/.test(trimmed);
  if (!isSafe) return null;
  try {
    const result = Function(`"use strict"; return (${trimmed})`)();
    if (typeof result !== 'number' || !isFinite(result)) return null;
    return Math.round(result * 100) / 100;
  } catch (e) {
    return null;
  }
}

function emptyRow() {
  return {
    rowid: `row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    productid: '',
    productname: '',
    qty: '',
    price: '',
    isAllBig: false,
    allBigExpr: '',
  };
}

function newCard(serial) {
  return {
    cardid: `card-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    serial,
    salesmanid: '',
    salesmanName: '',
    salesmanLocked: false,
    batteries: [],
    rows: [emptyRow()],
    returnExpr: '',
    commission: '',
    clearStatus: false,
    submitAmount: '',
    saving: false,
    saved: false,
    editMode: false,
    handedgoodsid: null,
    isUpdateMode: false,
  };
}

const rowTotal = (row) => {
  if (row.isAllBig) {
    return (evaluateExpression(row.allBigExpr) || 0) * 10;
  }
  const q = parseFloat(row.qty);
  const p = parseFloat(row.price);
  if (isNaN(q) || isNaN(p)) return 0;
  return Math.round(q * p * 100) / 100;
};

const cardItemsTotal = (card) =>
  card.rows.reduce((sum, r) => sum + rowTotal(r), 0);

// ---------- component ----------
export default function HandedGoodsManagement({ cacheKey }) {
  const cachedData = cacheKey ? getCache(cacheKey) : null;

  const [date, setDate] = useState(cachedData?.date || new Date().toISOString().split('T')[0]);
  const [salesmen, setSalesmen] = useState(cachedData?.salesmen || []);
  const [products, setProducts] = useState(cachedData?.products || []);
  const [batteryOptions, setBatteryOptions] = useState(cachedData?.batteryOptions || []);
  const [cards, setCards] = useState([newCard(1)]);
  const [editCards, setEditCards] = useState([]);
  const [loadingLookups, setLoadingLookups] = useState(!cachedData);
  const [showRecords, setShowRecords] = useState(false);
  const [records, setRecords] = useState([]);
  const [filterType, setFilterType] = useState('month');
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [assignedBatteries, setAssignedBatteries] = useState([]);
  const [recordSearch, setRecordSearch] = useState('');
  const [salesmanSearch, setSalesmanSearch] = useState('');

  const [savedCards, setSavedCards] = useState({});
  const [savedEditCards, setSavedEditCards] = useState({});

  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmAction, setConfirmAction] = useState(null);

  useEffect(() => {
    if (!toastVisible) return;
    const t = setTimeout(() => setToastVisible(false), 5000);
    return () => clearTimeout(t);
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

  const handleDateChange = useCallback((newDate) => {
    setSavedCards(prev => ({ ...prev, [date]: cards }));
    setSavedEditCards(prev => ({ ...prev, [date]: editCards }));
    setDate(newDate);
  }, [date, cards, editCards]);

  useEffect(() => {
    return () => {
      if (cacheKey) {
        saveCache(cacheKey, { date, salesmen, products, batteryOptions });
      }
    };
  }, [cacheKey, date, salesmen, products, batteryOptions]);

  // ---------- data fetching ----------
  const fetchSalesmen = useCallback(async (fetchDate) => {
    try {
      const result = await postData('employee/retrieve-salesmen-without-attendance', { date: fetchDate || date });
      if (result?.status) setSalesmen(result.data || []);
    } catch (error) {
      console.error('Error fetching salesmen:', error);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      const result = await postData('product/retrieve-products', {});
      if (result?.status) setProducts(result.data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  }, []);

  const fetchBatteries = useCallback(async () => {
    try {
      const result = await postData('battery/retrieve-batteries', {});
      if (result?.status) setBatteryOptions(result.data.map(b => b.batteryname));
    } catch (error) {
      console.error('Error fetching batteries:', error);
    }
  }, []);

  const fetchAssignedBatteries = useCallback(async () => {
    try {
      const result = await postData('handedgoods/retrieve-handed-goods', {});
      if (result?.status) {
        const assigned = [];
        result.data.forEach(record => {
          if (record.details) {
            const details = typeof record.details === 'string' ? JSON.parse(record.details) : record.details;
            if (details.batteries && Array.isArray(details.batteries)) {
              assigned.push(...details.batteries);
            }
          }
        });
        setAssignedBatteries(assigned);
      }
    } catch (error) {
      console.error('Error fetching assigned batteries:', error);
    }
  }, []);

  const fetchAllLookups = useCallback(async () => {
    setLoadingLookups(true);
    try {
      if (products.length === 0) {
        await fetchProducts();
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      if (batteryOptions.length === 0) {
        await fetchBatteries();
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      await fetchSalesmen(date);
      await new Promise(resolve => setTimeout(resolve, 100));
      await fetchAssignedBatteries();
    } catch (error) {
      console.error('Error fetching lookups:', error);
    } finally {
      setLoadingLookups(false);
    }
  }, [fetchSalesmen, fetchProducts, fetchBatteries, fetchAssignedBatteries, products.length, batteryOptions.length]);

  useEffect(() => {
    if (products.length === 0 || batteryOptions.length === 0 || salesmen.length === 0) {
      fetchAllLookups();
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await postData('employee/retrieve-salesmen-without-attendance', { date });
        if (result?.status) setSalesmen(result.data || []);
      } catch (error) {
        console.error('Error fetching salesmen:', error);
      }
    };
    fetchData();
  }, [date]);

  const fetchRecords = useCallback(async () => {
    setLoadingRecords(true);
    try {
      let payload = {};
      if (filterType === 'date') {
        payload = { date };
      } else {
        payload = { month: filterMonth, year: filterYear };
      }
      const result = await postData('handedgoods/retrieve-handed-goods', payload);
      if (result?.status) {
        setRecords(result.data.map(record => ({
          ...record,
          details: typeof record.details === 'string' ? JSON.parse(record.details) : record.details
        })));
      }
    } catch (error) {
      console.error('Error fetching records:', error);
    } finally {
      setLoadingRecords(false);
    }
  }, [filterType, date, filterMonth, filterYear]);

  useEffect(() => {
    if (showRecords) fetchRecords();
  }, [showRecords, fetchRecords]);

  // 👈 NEW: Filtered salesmen based on search
  const filteredSalesmen = useMemo(() => {
    if (!salesmanSearch.trim()) return salesmen;
    const term = salesmanSearch.toLowerCase();
    return salesmen.filter(s => s.fullname?.toLowerCase().includes(term));
  }, [salesmen, salesmanSearch]);

  // ---------- card/row mutators ----------
  const updateCard = useCallback((cardid, patch, isEdit = false) => {
    const setter = isEdit ? setEditCards : setCards;
    setter(prev => prev.map(c => c.cardid === cardid ? { ...c, ...patch } : c));
  }, []);

  const updateRow = useCallback((cardid, rowid, patch, isEdit = false) => {
    const setter = isEdit ? setEditCards : setCards;
    setter(prev =>
      prev.map(c => {
        if (c.cardid !== cardid) return c;
        return {
          ...c,
          rows: c.rows.map(r => r.rowid === rowid ? { ...r, ...patch } : r),
          saved: false
        };
      })
    );
  }, []);

  const handleSelectSalesman = useCallback((cardid, salesmanid, isEdit = false) => {
    const salesman = salesmen.find(s => String(s.salesmanid) === String(salesmanid));
    if (!salesman && salesmanid) {
      showToast('Selected salesman is no longer available. Please select another.');
      updateCard(cardid, { salesmanid: '', salesmanName: '', salesmanLocked: false }, isEdit);
      return;
    }
    updateCard(cardid, {
      salesmanid,
      salesmanName: salesman ? salesman.fullname : '',
      salesmanLocked: !!salesmanid,
    }, isEdit);
  }, [salesmen, updateCard, showToast]);

  const handleBatteryToggle = useCallback((cardid, battery, isEdit = false) => {
    const card = (isEdit ? editCards : cards).find(c => c.cardid === cardid);
    if (!card) return;
    let newBatteries = [...card.batteries];
    if (newBatteries.includes(battery)) {
      newBatteries = newBatteries.filter(b => b !== battery);
    } else {
      if (assignedBatteries.includes(battery)) {
        showToast(`Battery ${battery} is already assigned to someone else!`);
        return;
      }
      newBatteries.push(battery);
    }
    updateCard(cardid, { batteries: newBatteries, saved: false }, isEdit);
  }, [cards, editCards, assignedBatteries, updateCard, showToast]);

  const handleSelectProduct = useCallback((cardid, rowid, productid, isEdit = false) => {
    if (productid === 'allbig') {
      updateRow(cardid, rowid, {
        productid: 'allbig',
        productname: 'All Big',
        isAllBig: true,
        qty: '',
        price: '',
        allBigExpr: '',
      }, isEdit);
      return;
    }
    const product = products.find(p => String(p.productid) === String(productid));
    updateRow(cardid, rowid, {
      productid,
      productname: product ? product.productname : '',
      price: product ? product.productprice : '',
      isAllBig: false,
      allBigExpr: '',
    }, isEdit);
  }, [products, updateRow]);

  const addRow = useCallback((cardid, isEdit = false) => {
    const setter = isEdit ? setEditCards : setCards;
    setter(prev =>
      prev.map(c => c.cardid === cardid ? { ...c, rows: [...c.rows, emptyRow()] } : c)
    );
  }, []);

  const removeRow = useCallback((cardid, rowid, isEdit = false) => {
    const setter = isEdit ? setEditCards : setCards;
    setter(prev =>
      prev.map(c => {
        if (c.cardid !== cardid || c.rows.length === 1) return c;
        return { ...c, rows: c.rows.filter(r => r.rowid !== rowid) };
      })
    );
  }, []);

  const addCard = useCallback(() => {
    if (editCards.length > 0) {
      showToast('Please close the edit mode first');
      return;
    }
    setCards(prev => [...prev, newCard(prev.length + 1)]);
    fetchSalesmen(date);
  }, [editCards, showToast, fetchSalesmen]);

  const removeCard = useCallback((cardid, isEdit = false) => {
    if (isEdit) {
      setEditCards([]);
      return;
    }
    showConfirm('Are you sure you want to remove this card? All unsaved data will be lost.', () => {
      setCards(prev =>
        prev.filter(c => c.cardid !== cardid).map((c, idx) => ({ ...c, serial: idx + 1 }))
      );
    });
  }, [showConfirm]);

  // ---------- derived values ----------
  const getReturnValue = useCallback((card) => evaluateExpression(card.returnExpr), []);

  const getFinalAmount = useCallback((card) => {
    const itemsTotal = cardItemsTotal(card);
    const returnVal = getReturnValue(card) || 0;
    const commissionVal = parseFloat(card.commission) || 0;
    const total = itemsTotal - returnVal;
    if (card.commission === '' || card.commission === null || card.commission === undefined) return null;
    return Math.round((total - commissionVal) * 100) / 100;
  }, [getReturnValue]);

  const getFinalAmountForDB = useCallback((card) => {
    const itemsTotal = cardItemsTotal(card);
    const returnVal = getReturnValue(card) || 0;
    const commissionVal = parseFloat(card.commission) || 0;
    const total = itemsTotal - returnVal;
    return Math.round((total - commissionVal) * 100) / 100;
  }, [getReturnValue]);

  // ---------- save ----------
  const handleSave = useCallback(async (card, isEdit = false) => {
    if (!card.salesmanid) {
      showToast('Please select a salesman first');
      return;
    }

    const validRows = card.rows.filter(r => {
      if (r.isAllBig) return r.allBigExpr && r.allBigExpr.trim();
      return r.productid && r.qty && r.price;
    });

    if (validRows.length === 0) {
      showToast('Add at least one item with name, quantity and price');
      return;
    }
    const returnVal = getReturnValue(card);
    if (returnVal === null) {
      showToast('Return amount expression is invalid');
      return;
    }
    const finalAmount = getFinalAmountForDB(card);
    const saveDate = card.handedgoodsid ? (card.cardDate || date) : date;

    const payload = {
      salesmanid: card.salesmanid,
      date: saveDate,
      details: JSON.stringify({
        batteries: card.batteries || [],
        items: validRows.map(r => {
          if (r.isAllBig) {
            const evaluatedValue = evaluateExpression(r.allBigExpr) || 0;
            const multipliedValue = evaluatedValue * 10;
            return {
              productid: 'allbig',
              productname: 'All Big',
              qty: multipliedValue,
              price: 1,
              total: multipliedValue,
              isAllBig: true,
              allBigExpr: r.allBigExpr,
            };
          }
          return {
            productid: r.productid,
            productname: r.productname,
            qty: parseFloat(r.qty),
            price: parseFloat(r.price),
            total: rowTotal(r),
          };
        })
      }),
      returnamt: returnVal,
      commission: parseFloat(card.commission) || 0,
      clear_status: card.clearStatus ? 1 : 0,
      submit_amount: parseFloat(card.submitAmount) || 0,
    };

    if (card.commission !== '' && card.commission !== null && card.commission !== undefined) {
      payload.finalamount = finalAmount;
    }

    const isUpdate = card.handedgoodsid || card.isUpdateMode || card.editMode;
    if (isUpdate && card.handedgoodsid) {
      payload.handedgoodsid = card.handedgoodsid;
    }

    updateCard(card.cardid, { saving: true }, isEdit);
    try {
      const endpoint = isUpdate ? 'handedgoods/update-handed-goods' : 'handedgoods/insert-handed-goods';
      const result = await postData(endpoint, payload);
      if (result?.status) {
        clearCache(cacheKey);
        showToast(isUpdate ? 'Record updated successfully!' : 'Record saved successfully!');
        let newId = null;
        if (result.data) {
          newId = result.data.handedgoodsid || result.data?.data?.handedgoodsid || result.data?.handedgoodsid;
        }
        updateCard(card.cardid, {
          saving: false,
          saved: true,
          editMode: false,
          isUpdateMode: true,
          handedgoodsid: newId || card.handedgoodsid,
          cardDate: saveDate,
        }, isEdit);

        await fetchAssignedBatteries();
        if (showRecords) await fetchRecords();

        if (isEdit) {
          setTimeout(() => setEditCards([]), 1500);
        }
      } else {
        showToast(result?.message || 'Failed to save record');
        updateCard(card.cardid, { saving: false }, isEdit);
      }
    } catch (error) {
      console.error('Error saving handed goods:', error);
      showToast('Error saving record');
      updateCard(card.cardid, { saving: false }, isEdit);
    }
  }, [date, getReturnValue, getFinalAmountForDB, updateCard, fetchAssignedBatteries, fetchRecords, showRecords, showToast, cacheKey]);

  // ---------- edit / delete record ----------
  const handleEditRecord = useCallback((record) => {
    setEditCards([]);
    const newCardData = newCard(1);
    newCardData.salesmanid = record.salesmanid;
    newCardData.salesmanName = record.salesman_name;
    newCardData.salesmanLocked = true;
    newCardData.batteries = record.details?.batteries || [];
    newCardData.rows = record.details?.items?.map(item => ({
      rowid: `row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      productid: item.productid || '',
      productname: item.productname || '',
      qty: item.qty || '',
      price: item.price || '',
      isAllBig: item.isAllBig || false,
      allBigExpr: item.allBigExpr || '',
    })) || [emptyRow()];
    newCardData.returnExpr = String(record.returnamt || '');
    newCardData.commission = String(record.commission || '');
    newCardData.clearStatus = record.clear_status === 1;
    newCardData.submitAmount = String(record.submit_amount || '');
    newCardData.editMode = true;
    newCardData.handedgoodsid = record.handedgoodsid;
    newCardData.cardDate = record.date;
    newCardData.saved = false;
    newCardData.isUpdateMode = true;
    setEditCards([newCardData]);
    setShowRecords(false);
  }, []);

  const performDelete = useCallback(async (handedgoodsid) => {
    try {
      const result = await postData('handedgoods/delete-handed-goods', { handedgoodsid });
      if (result?.status) {
        clearCache(cacheKey);
        showToast('Record deleted successfully!');
        await fetchAssignedBatteries();
        await fetchSalesmen(date);
        if (showRecords) await fetchRecords();
        setCards(prev => prev.filter(c => c.handedgoodsid !== handedgoodsid));
        setEditCards(prev => prev.filter(c => c.handedgoodsid !== handedgoodsid));
      } else {
        showToast(result?.message || 'Failed to delete');
      }
    } catch (error) {
      console.error('Error deleting record:', error);
      showToast('Error deleting record');
    }
  }, [fetchRecords, fetchAssignedBatteries, fetchSalesmen, showToast, cacheKey, date, showRecords]);

  const handleDeleteRecord = useCallback((handedgoodsid) => {
    showConfirm('Are you sure you want to delete this record?', () => performDelete(handedgoodsid));
  }, [showConfirm, performDelete]);

  // ---------- render helpers ----------
  const inputBase = 'border border-gray-300 rounded-md px-2 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white';

  const BatteryDropdown = ({ card, isEdit }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
      const handleClickOutside = (event) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
          setIsOpen(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedCount = card.batteries?.length || 0;

    return (
      <div className="relative" ref={dropdownRef}>
        <div
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center justify-between bg-white border border-gray-300 rounded-md px-3 py-1.5 text-sm cursor-pointer hover:border-blue-500 transition-colors min-w-[160px]"
        >
          <span className="text-gray-700">
            {selectedCount > 0 ? (
              <span className="flex items-center gap-1 flex-wrap">
                {card.batteries.slice(0, 2).map((b, i) => (
                  <span key={i} className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-xs">{b}</span>
                ))}
                {selectedCount > 2 && (
                  <span className="text-xs text-gray-500">+{selectedCount - 2} more</span>
                )}
              </span>
            ) : (
              <span className="text-gray-400">Select batteries...</span>
            )}
          </span>
          <svg className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {isOpen && (
          <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
            {batteryOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">Loading batteries...</div>
            ) : (
              batteryOptions.map((battery) => {
                const isAssigned = assignedBatteries.includes(battery);
                const isSelected = card.batteries?.includes(battery);
                const isDisabled = isAssigned && !isSelected;

                return (
                  <div key={battery} onClick={() => { if (!isDisabled) handleBatteryToggle(card.cardid, battery, isEdit); }}
                    className={`flex items-center px-3 py-2 cursor-pointer hover:bg-blue-50 transition-colors ${isSelected ? 'bg-blue-50' : ''} ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <input type="checkbox" checked={isSelected} disabled={isDisabled} onChange={() => { }} className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                    <span className={`ml-2 text-sm ${isSelected ? 'font-medium text-gray-900' : 'text-gray-700'}`}>{battery}</span>
                    {isAssigned && !isSelected && <span className="ml-2 text-xs text-red-500">(Assigned)</span>}
                    {isSelected && <span className="ml-auto text-blue-600 text-xs">✓</span>}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    );
  };

  // ---------- card rendering ----------
  const renderCard = useCallback((card, isEdit = false) => {
    const otherSelectedSalesmanIds = new Set(
      [...cards, ...editCards]
        .filter(c => c.cardid !== card.cardid && c.salesmanid)
        .map(c => String(c.salesmanid))
    );
    const availableSalesmen = filteredSalesmen.filter(s => !otherSelectedSalesmanIds.has(String(s.salesmanid))); // 👈 CHANGED: use filteredSalesmen

    return (
      <div key={card.cardid} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 relative">
        {!isEdit && !card.editMode && (
          <button onClick={() => removeCard(card.cardid, isEdit)} title="Remove card"
            className="absolute -top-2 -right-2 w-6 h-6 rounded-full border border-gray-300 text-gray-500 text-xs flex items-center justify-center hover:bg-red-50 hover:border-red-400 hover:text-red-500 bg-white transition-colors cursor-pointer">×</button>
        )}

        {isEdit && (
          <button onClick={() => { showConfirm('Are you sure you want to cancel editing? All changes will be lost.', () => { setEditCards([]); }); }} title="Close edit"
            className="absolute -top-2 -right-2 w-6 h-6 rounded-full border border-gray-300 text-gray-500 text-xs flex items-center justify-center hover:bg-red-50 hover:border-red-400 hover:text-red-500 bg-white transition-colors cursor-pointer">×</button>
        )}

        {card.editMode && <span className="absolute top-2 right-8 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">Edit Mode</span>}
        {card.isUpdateMode && !card.editMode && card.handedgoodsid && card.saved && <span className="absolute top-2 right-8 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">✓ Saved</span>}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <div className="bg-blue-50/50 border border-blue-200 rounded-lg p-3">
            <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide block mb-2">Salesman</span>
            <select value={card.salesmanid || ''} onChange={(e) => handleSelectSalesman(card.cardid, e.target.value, isEdit)} className={`${inputBase} w-full cursor-pointer`}>
              <option value="">Select salesman</option>
              {availableSalesmen.map(s => (
                <option key={s.salesmanid} value={s.salesmanid}>{s.fullname}</option>
              ))}
              {card.salesmanid && !salesmen.find(s => String(s.salesmanid) === String(card.salesmanid)) && (
                <option value={card.salesmanid} disabled>{card.salesmanName || 'Unavailable'} (Not Available)</option>
              )}
            </select>
          </div>

          <div className="bg-purple-50/50 border border-purple-200 rounded-lg p-3">
            <span className="text-xs font-semibold text-purple-600 uppercase tracking-wide block mb-2">Batteries</span>
            <BatteryDropdown card={card} isEdit={isEdit} />
          </div>

          <div className="bg-green-50/50 border border-green-200 rounded-lg p-3">
            <span className="text-xs font-semibold text-green-600 uppercase tracking-wide block mb-2">Date</span>
            <div className={`${inputBase} w-full bg-gray-50 text-gray-700 font-medium`}>{card.cardDate || date}</div>
          </div>
        </div>

        {card.salesmanLocked && (
          <div className="space-y-3">
            {card.rows.map((row, idx) => {
              const isLastRow = idx === card.rows.length - 1;
              return (
                <div key={row.rowid} className="flex items-center gap-2">
                  <select value={row.productid} onChange={(e) => handleSelectProduct(card.cardid, row.rowid, e.target.value, isEdit)} className={`${inputBase} flex-1 min-w-0 cursor-pointer`}>
                    <option value="">Select Ice Cream</option>
                    <option value="allbig" className="font-bold text-purple-600">🔹 All Big</option>
                    <option disabled>──────────</option>
                    {products.map(p => (
                      <option key={p.productid} value={p.productid}>{p.productname} (₹{parseFloat(p.productprice || 0).toFixed(2)})</option>
                    ))}
                  </select>

                  {row.isAllBig ? (
                    <>
                      <input type="text" placeholder="e.g. 10+23+45" value={row.allBigExpr}
                        onChange={(e) => updateRow(card.cardid, row.rowid, { allBigExpr: e.target.value }, isEdit)} className={`${inputBase} flex-1 min-w-0`} />
                      <div className={`${inputBase} w-20 text-end bg-gray-50 text-gray-700`}>₹{((evaluateExpression(row.allBigExpr) || 0) * 10).toFixed(0)}</div>
                    </>
                  ) : (
                    <>
                      <input type="text" inputMode="numeric" placeholder="Qty" value={row.qty}
                        onChange={(e) => updateRow(card.cardid, row.rowid, { qty: e.target.value }, isEdit)} className={`${inputBase} w-14 text-center`} />
                      <input type="text" inputMode="numeric" placeholder="Price" value={row.price} readOnly className={`${inputBase} w-14 text-center bg-gray-100 cursor-not-allowed`} />
                      <div className={`${inputBase} w-20 text-end bg-gray-50 text-gray-700`}>₹{rowTotal(row).toFixed(0)}</div>
                    </>
                  )}

                  {isLastRow ? (
                    <button onClick={() => addRow(card.cardid, isEdit)} className="px-3 py-1.5 border border-gray-300 rounded-md text-sm hover:bg-gray-50 whitespace-nowrap text-gray-600 hover:text-gray-800 transition-colors cursor-pointer">+ Add</button>
                  ) : (
                    <button onClick={() => removeRow(card.cardid, row.rowid, isEdit)} title="Remove row" className="text-gray-400 hover:text-red-500 transition-colors cursor-pointer">×</button>
                  )}
                </div>
              );
            })}

            <div className="flex items-center justify-end gap-2 pt-1 border-t border-gray-100 pr-17">
              <span className="text-sm font-medium text-gray-700">Items Total:</span>
              <div className={`${inputBase} w-20 text-end bg-gray-50 font-medium`}>₹{cardItemsTotal(card).toFixed(0)}</div>
            </div>

            <div className="flex items-center justify-end gap-2 pr-17">
              <span className="text-sm font-medium text-gray-700">Return:</span>
              <input type="text" placeholder="e.g. 40 + 512 + 8" value={card.returnExpr}
                onChange={(e) => updateCard(card.cardid, { returnExpr: e.target.value, saved: false }, isEdit)} className={`${inputBase} w-40`} />
              <div className={`${inputBase} w-20 text-end bg-gray-50 font-medium ${getReturnValue(card) === null ? 'text-red-500' : 'text-gray-700'}`}>₹{getReturnValue(card) === null ? '?' : getReturnValue(card).toFixed(0)}</div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1 border-t border-gray-100 pr-17">
              <span className="text-sm font-medium text-gray-700">Total:</span>
              <div className={`${inputBase} w-20 text-end bg-gray-50 font-medium`}>₹{(cardItemsTotal(card) - (getReturnValue(card) || 0)).toFixed(0)}</div>
            </div>

            <div className="flex items-center justify-end gap-2 pr-17">
              <span className="text-sm font-medium text-gray-700">Commission:</span>
              <input type="text" inputMode="numeric" placeholder="Commission" value={card.commission}
                onChange={(e) => updateCard(card.cardid, { commission: e.target.value, saved: false }, isEdit)} className={`${inputBase} w-20 text-end`} />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1 border-t border-gray-200 pr-17">
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-sm font-medium text-gray-700">Clear:</span>
                <input type="checkbox" checked={card.clearStatus}
                  onChange={(e) => updateCard(card.cardid, { clearStatus: e.target.checked, saved: false }, isEdit)} className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
              </label>

              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">Submit Amount:</span>
                <input type="text" inputMode="numeric" placeholder="0" value={card.submitAmount}
                  onChange={(e) => updateCard(card.cardid, { submitAmount: e.target.value, saved: false }, isEdit)} className={`${inputBase} w-24 text-end`} />
              </div>
              <span className="text-sm font-semibold text-gray-900">Final Amount:</span>
              <div className={`${inputBase} w-24 text-end bg-blue-50 font-bold text-blue-700 text-base overflow-auto`}>
                {getFinalAmount(card) !== null ? `₹${getFinalAmount(card).toFixed(0)}` : <span className="text-gray-400 text-sm">-</span>}
              </div>
            </div>

            <div className="flex justify-end pt-2 pr-17">
              <button onClick={() => handleSave(card, isEdit)} disabled={card.saving}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${card.saved ? 'bg-green-100 text-green-700 border border-green-300 cursor-default' : (card.editMode || card.isUpdateMode || card.handedgoodsid) ? 'bg-yellow-600 hover:bg-yellow-700 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700'} ${card.saving ? 'opacity-60 cursor-not-allowed' : ''}`}>
                {card.saving ? 'Saving...' : card.saved ? '✓ Saved' : (card.editMode || card.isUpdateMode || card.handedgoodsid) ? 'Update Record' : 'Save Record'}
              </button>
              {card.editMode && card.saved && (
                <button onClick={() => { setEditCards([]); if (showRecords) fetchRecords(); }} className="ml-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md text-sm transition-colors cursor-pointer">Close</button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }, [cards, editCards, salesmen, filteredSalesmen, products, assignedBatteries, date, handleSelectSalesman, handleSelectProduct, updateRow, updateCard, addRow, removeRow, removeCard, handleSave, getReturnValue, getFinalAmount, showConfirm, showRecords, fetchRecords]);

  // ---------- records table ----------
  const renderRecordsTable = useCallback(() => {
    if (loadingRecords) {
      return <div className="flex justify-center items-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
    }
    const filteredRecords = recordSearch.trim()
      ? records.filter(r =>
        r.salesman_name?.toLowerCase().includes(recordSearch.toLowerCase()) ||
        String(r.handedgoodsid).includes(recordSearch)
      )
      : records;
    if (filteredRecords.length === 0) {
      return <div className="text-center py-8 text-gray-500">No records found for the selected {filterType === 'date' ? 'date' : 'month'}</div>;
    }
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-bold text-black uppercase tracking-wider">ID</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-black uppercase tracking-wider">Salesman</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-black uppercase tracking-wider">Date</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-black uppercase tracking-wider">Batteries</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-black uppercase tracking-wider">Items</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-black uppercase tracking-wider">Return</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-black uppercase tracking-wider">Commission</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-black uppercase tracking-wider">Final Amount</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-black uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredRecords.map(record => (
              <tr key={record.handedgoodsid} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-sm text-gray-500">#{record.handedgoodsid}</td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{record.salesman_name}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{record.date}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{record.details?.batteries?.length > 0 ? record.details.batteries.join(', ') : '-'}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{record.details?.items?.map((item, i) => (<div key={i} className="text-xs">{item.productname}: {item.isAllBig ? `₹${item.total}` : `${item.qty} × ₹${item.price} = ₹${item.total}`}</div>))}</td>
                <td className="px-4 py-3 text-sm text-gray-500">₹{parseFloat(record.returnamt || 0).toFixed(0)}</td>
                <td className="px-4 py-3 text-sm text-gray-500">₹{parseFloat(record.commission || 0).toFixed(0)}</td>
                <td className="px-4 py-3 text-sm font-semibold text-blue-600">₹{parseFloat(record.finalamount || 0).toFixed(0)}</td>
                <td className="px-4 py-3 text-sm">
                  <div className="flex gap-2">
                    <button onClick={() => handleEditRecord(record)} className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg transition-colors cursor-pointer">Edit</button>
                    <button onClick={() => handleDeleteRecord(record.handedgoodsid)} className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded-lg transition-colors cursor-pointer">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }, [loadingRecords, recordSearch, records, filterType, handleEditRecord, handleDeleteRecord]);

  // ---------- main return ----------
  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {toastVisible && (
        <div className="fixed top-4 right-4 z-50 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3">
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

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className={`${inputBase} flex items-center gap-2 font-medium`}>
          <span className="text-black text-lg font-bold">Date:</span>
          <input type="date" value={date} onChange={(e) => handleDateChange(e.target.value)} className="border-none outline-none text-lg font-bold bg-transparent cursor-pointer" />
        </div>
        <div className="flex gap-3">
          <button onClick={() => { setShowRecords(!showRecords); if (!showRecords) fetchRecords(); else setRecordSearch(''); }} className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors text-sm font-medium cursor-pointer">
            {showRecords ? 'Hide Records' : 'View Records'}
          </button>
          <button onClick={addCard} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors flex items-center gap-2 text-sm font-medium cursor-pointer">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
            Add Salesman
          </button>
        </div>
      </div>

      {loadingLookups && <p className="text-center text-sm text-gray-400 mb-4">Loading...</p>}

      {showRecords && (
        <div className="mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Saved Records</h3>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder="Search records..."
                  value={recordSearch}
                  onChange={(e) => setRecordSearch(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-40"
                />
                <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="px-3 py-1.5 border border-gray-300 rounded-md text-sm cursor-pointer">
                  <option value="date">By Date</option>
                  <option value="month">By Month</option>
                </select>
                {filterType === 'date' ? (
                  <input type="date" value={date} onChange={(e) => { setDate(e.target.value) }} className="px-3 py-1.5 border border-gray-300 rounded-md text-sm cursor-pointer" />
                ) : (
                  <div className="flex gap-2">
                    <select value={filterMonth} onChange={(e) => setFilterMonth(parseInt(e.target.value))} className="px-3 py-1.5 border border-gray-300 rounded-md text-sm cursor-pointer">
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (<option key={m} value={m}>{new Date(2000, m - 1).toLocaleString('default', { month: 'long' })}</option>))}
                    </select>
                    <select value={filterYear} onChange={(e) => setFilterYear(parseInt(e.target.value))} className="px-3 py-1.5 border border-gray-300 rounded-md text-sm cursor-pointer">
                      {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (<option key={y} value={y}>{y}</option>))}
                    </select>
                  </div>
                )}
              </div>
            </div>
            {renderRecordsTable()}
          </div>
        </div>
      )}

      {editCards.length > 0 ? (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-yellow-600">Editing Record</h3>
            <button onClick={() => { showConfirm('Are you sure you want to cancel editing? All changes will be lost.', () => { setEditCards([]); }); }} className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md text-sm transition-colors cursor-pointer">Cancel Edit</button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">{editCards.map(card => renderCard(card, true))}</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">{cards.map(card => renderCard(card, false))}</div>
      )}
    </div>
  );
}