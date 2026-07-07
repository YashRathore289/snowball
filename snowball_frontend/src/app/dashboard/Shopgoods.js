'use client'
import { useState, useEffect, useCallback, useMemo } from 'react';
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
        shopownerid: '',
        shopownername: '',
        shopownerLocked: false,
        rows: [emptyRow()],
        commission: '',
        saving: false,
        saved: false,
        editMode: false,
        shopgoodsid: null,
        isUpdateMode: false,
        cardDate: '',
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

export default function ShopGoodsManagement({ cacheKey }) {
    const cachedData = cacheKey ? getCache(cacheKey) : null;

    const [date, setDate] = useState(cachedData?.date || new Date().toISOString().split('T')[0]);
    const [products, setProducts] = useState(cachedData?.products || []);
    const [cards, setCards] = useState([newCard(1)]);
    const [editCards, setEditCards] = useState([]);
    const [loadingLookups, setLoadingLookups] = useState(!cachedData);
    const [showRecords, setShowRecords] = useState(false);
    const [records, setRecords] = useState([]);
    const [filterType, setFilterType] = useState('date');
    const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
    const [filterYear, setFilterYear] = useState(new Date().getFullYear());
    const [loadingRecords, setLoadingRecords] = useState(false);
    const [shopOwners, setShopOwners] = useState(cachedData?.shopOwners || []);
    const [showOwners, setShowOwners] = useState(false);
    const [recordSearch, setRecordSearch] = useState('');

    const [savedCards, setSavedCards] = useState({});
    const [savedEditCards, setSavedEditCards] = useState({});

    // Shop Owner Modal States
    const [showOwnerModal, setShowOwnerModal] = useState(false);
    const [ownerFormData, setOwnerFormData] = useState({
        shopownerid: '',
        shopownername: '',
        shopname: '',
        mobileno: '',
        address: ''
    });
    const [isOwnerEditMode, setIsOwnerEditMode] = useState(false);
    const [loadingOwners, setLoadingOwners] = useState(false);

    // Toast and confirmation popup states
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
                saveCache(cacheKey, {
                    date,
                    products,
                    shopOwners,
                });
            }
        };
    }, [cacheKey, date, products, shopOwners]);

    // ---------- data fetching ----------

    const fetchProducts = useCallback(async () => {
        try {
            const result = await postData('product/retrieve-products', {});
            if (result?.status) setProducts(result.data || []);
        } catch (error) {
            console.error('Error fetching products:', error);
        }
    }, []);

    const fetchShopOwners = useCallback(async () => {
        try {
            const result = await postData('shopowner/retrieve-shop-owners', {});
            if (result?.status) setShopOwners(result.data || []);
        } catch (error) {
            console.error('Error fetching shop owners:', error);
        }
    }, []);

    const fetchAllLookups = useCallback(async () => {
        setLoadingLookups(true);
        try {
            if (products.length === 0) {
                await fetchProducts();
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            if (shopOwners.length === 0) {
                await fetchShopOwners();
            }
        } catch (error) {
            console.error('Error fetching lookups:', error);
        } finally {
            setLoadingLookups(false);
        }
    }, [fetchProducts, fetchShopOwners, products.length, shopOwners.length]);

    useEffect(() => {
        if (!cachedData || products.length === 0 || shopOwners.length === 0) {
            fetchAllLookups();
        }
    }, []);

    const fetchRecords = useCallback(async () => {
        setLoadingRecords(true);
        try {
            const payload = filterType === 'date' ? { date } : { month: filterMonth, year: filterYear };
            const result = await postData('shopgoods/retrieve-shop-goods', payload);
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

    // ---------- Shop Owner CRUD ----------

    const handleAddOwner = useCallback(() => {
        setOwnerFormData({ shopownerid: '', shopownername: '', shopname: '', mobileno: '', address: '' });
        setIsOwnerEditMode(false);
        setShowOwnerModal(true);
    }, []);

    const handleEditOwner = useCallback((owner) => {
        setOwnerFormData({
            shopownerid: owner.shopownerid,
            shopownername: owner.shopownername,
            shopname: owner.shopname || '',
            mobileno: owner.mobileno || '',
            address: owner.address || ''
        });
        setIsOwnerEditMode(true);
        setShowOwnerModal(true);
    }, []);

    const performDeleteOwner = useCallback(async (shopownerid) => {
        setLoadingOwners(true);
        try {
            const result = await postData('shopowner/delete-shop-owner', { shopownerid });
            if (result?.status) {
                clearCache(cacheKey);
                showToast('Shop owner deleted successfully!');
                await fetchShopOwners();
            } else {
                showToast(result?.message || 'Failed to delete');
            }
        } catch (error) {
            console.error('Error deleting shop owner:', error);
            showToast('Error deleting shop owner');
        } finally {
            setLoadingOwners(false);
        }
    }, [fetchShopOwners, showToast, cacheKey]);

    const handleDeleteOwner = useCallback((shopownerid) => {
        showConfirm('Are you sure you want to delete this shop owner?', () => performDeleteOwner(shopownerid));
    }, [showConfirm, performDeleteOwner]);

    const handleSaveOwner = useCallback(async () => {
        if (!ownerFormData.shopownername || !ownerFormData.shopname || !ownerFormData.mobileno) {
            showToast('Please fill in all required fields');
            return;
        }
        setLoadingOwners(true);
        try {
            let result;
            if (isOwnerEditMode) {
                result = await postData('shopowner/update-shop-owner', {
                    shopownerid: ownerFormData.shopownerid,
                    shopownername: ownerFormData.shopownername,
                    shopname: ownerFormData.shopname,
                    mobileno: ownerFormData.mobileno,
                    address: ownerFormData.address
                });
            } else {
                result = await postData('shopowner/insert-shop-owner', {
                    shopownername: ownerFormData.shopownername,
                    shopname: ownerFormData.shopname,
                    mobileno: ownerFormData.mobileno,
                    address: ownerFormData.address
                });
            }
            if (result?.status) {
                clearCache(cacheKey);
                showToast(isOwnerEditMode ? 'Shop owner updated successfully!' : 'Shop owner added successfully!');
                setShowOwnerModal(false);
                await fetchShopOwners();
            } else {
                showToast(result?.message || 'Failed to save shop owner');
            }
        } catch (error) {
            console.error('Error saving shop owner:', error);
            showToast('Error saving shop owner');
        } finally {
            setLoadingOwners(false);
        }
    }, [ownerFormData, isOwnerEditMode, fetchShopOwners, showToast, cacheKey]);

    // ---------- Records (edit/delete) ----------

    const handleEditRecord = useCallback((record) => {
        setEditCards([]);
        const newCardData = newCard(1);
        newCardData.shopownerid = record.shopownerid;
        newCardData.shopownername = record.shopownername || '';
        newCardData.shopownerLocked = true;
        newCardData.rows = record.details?.map(item => ({
            rowid: `row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            productid: item.productid || '',
            productname: item.productname || '',
            qty: item.qty || '',
            price: item.price || '',
            isAllBig: item.isAllBig || false,
            allBigExpr: item.allBigExpr || '',
        })) || [emptyRow()];
        newCardData.commission = String(record.commission || '');
        newCardData.editMode = true;
        newCardData.shopgoodsid = record.shopgoodsid;
        newCardData.cardDate = record.date;
        newCardData.saved = false;
        newCardData.isUpdateMode = true;
        setEditCards([newCardData]);
        setShowRecords(false);
    }, []);

    const performDeleteRecord = useCallback(async (shopgoodsid) => {
        try {
            const result = await postData('shopgoods/delete-shop-goods', { shopgoodsid });
            if (result?.status) {
                clearCache(cacheKey);
                showToast('Record deleted successfully!');
                await fetchShopOwners();
                if (showRecords) await fetchRecords();
                setCards(prev => prev.filter(c => c.shopgoodsid !== shopgoodsid));
                setEditCards(prev => prev.filter(c => c.shopgoodsid !== shopgoodsid));
            } else {
                showToast(result?.message || 'Failed to delete');
            }
        } catch (error) {
            console.error('Error deleting record:', error);
            showToast('Error deleting record');
        }
    }, [fetchRecords, fetchShopOwners, showToast, cacheKey, showRecords]);

    const handleDeleteRecord = useCallback((shopgoodsid) => {
        showConfirm('Are you sure you want to delete this record?', () => performDeleteRecord(shopgoodsid));
    }, [showConfirm, performDeleteRecord]);

    // ---------- card-level mutators ----------

    const updateCard = useCallback((cardid, patch, isEdit = false) => {
        const setter = isEdit ? setEditCards : setCards;
        setter(prev => prev.map(c => c.cardid === cardid ? { ...c, ...patch } : c));
    }, []);

    const updateRow = useCallback((cardid, rowid, patch, isEdit = false) => {
        const setter = isEdit ? setEditCards : setCards;
        setter(prev =>
            prev.map(c => {
                if (c.cardid !== cardid) return c;
                return { ...c, rows: c.rows.map(r => r.rowid === rowid ? { ...r, ...patch } : r), saved: false };
            })
        );
    }, []);

    const handleSelectShopOwner = useCallback((cardid, shopownerid, isEdit = false) => {
        const owner = shopOwners.find(o => String(o.shopownerid) === String(shopownerid));
        if (!owner && shopownerid) {
            showToast('Selected shop owner is no longer available. Please select another.');
            updateCard(cardid, { shopownerid: '', shopownername: '', shopownerLocked: false }, isEdit);
            return;
        }
        updateCard(cardid, {
            shopownerid,
            shopownername: owner ? owner.shopownername : '',
            shopownerLocked: !!shopownerid,
        }, isEdit);
    }, [shopOwners, updateCard, showToast]);

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
        setter(prev => prev.map(c => c.cardid === cardid ? { ...c, rows: [...c.rows, emptyRow()] } : c));
    }, []);

    const removeRow = useCallback((cardid, rowid, isEdit = false) => {
        const setter = isEdit ? setEditCards : setCards;
        setter(prev =>
            prev.map(c => {
                if (c.cardid !== cardid) return c;
                if (c.rows.length === 1) return c;
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
        fetchShopOwners();
    }, [editCards, showToast, fetchShopOwners]);

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

    const getCommissionAmount = useCallback((card) => {
        const itemsTotal = cardItemsTotal(card);
        const commissionPercent = parseFloat(card.commission) || 0;
        return (itemsTotal * commissionPercent) / 100;
    }, []);

    const getFinalAmount = useCallback((card) => {
        if (card.editMode) return null;

        const itemsTotal = cardItemsTotal(card);
        const commissionAmount = getCommissionAmount(card);
        if (card.commission === '' || card.commission === null || card.commission === undefined) return null;
        return Math.round((itemsTotal - commissionAmount) * 100) / 100;
    }, [getCommissionAmount]);

    const getFinalAmountForDB = useCallback((card) => {
        const itemsTotal = cardItemsTotal(card);
        const commissionAmount = getCommissionAmount(card);
        return Math.round((itemsTotal - commissionAmount) * 100) / 100;
    }, [getCommissionAmount]);

    // ---------- bill/receipt generation ----------
    const generateBillHTML = useCallback((card, recordDate) => {
        const items = card.rows.filter(r => (r.isAllBig ? r.allBigExpr && r.allBigExpr.trim() : (r.productid && r.qty && r.price)));
        const itemsTotal = cardItemsTotal(card);
        const commissionPercent = parseFloat(card.commission) || 0;
        const commissionAmount = getCommissionAmount(card);
        const finalAmt = getFinalAmountForDB(card);

        const rowsHtml = items.map(r => {
            let qty, desc, price, total;
            if (r.isAllBig) {
                const evaluated = evaluateExpression(r.allBigExpr) || 0;
                qty = evaluated.toFixed(0);
                desc = 'All Big';
                price = 10;
                total = (evaluated * 10).toFixed(0);
            } else {
                qty = String(r.qty);
                desc = String(r.productname || '');
                price = parseFloat(r.price || 0).toFixed(0);
                total = rowTotal(r).toFixed(0);
            }
            return `
        <tr>
          <td>${qty}</td>
          <td>${desc}</td>
          <td class="num">${price}</td>
          <td class="num">${total}</td>
        </tr>`;
        }).join('');

        return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<title>Bill - ${card.shopownername || 'Shop Owner'}</title>
<style>
  * { box-sizing: border-box; }
  body {
    font-family: 'Courier New', Courier, monospace;
    width: 300px;
    margin: 20px auto;
    color: #111;
    background: #fff;
  }
  .center { text-align: center; }
  h1 { font-size: 16px; margin: 0 0 2px; letter-spacing: 1px; }
  .sub { font-size: 11px; margin: 0 0 8px; color: #444; }
  hr { border: none; border-top: 1px dashed #999; margin: 6px 0; }
  .meta { font-size: 11px; margin: 2px 0; display: flex; justify-content: space-between; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 4px; }
  th { text-align: left; font-size: 10px; border-bottom: 1px dashed #999; padding-bottom: 4px; }
  td { padding: 3px 0; vertical-align: top; }
  .num { text-align: right; white-space: nowrap; }
  .totals-row { display: flex; justify-content: space-between; font-size: 12px; margin: 3px 0; }
  .final { font-weight: bold; font-size: 15px; margin-top: 6px; }
  .thankyou { text-align: center; margin-top: 14px; font-size: 12px; letter-spacing: 2px; }
  @media print {
    body { width: 80mm; margin: 0 auto; }
  }
</style>
</head>
<body style="border:0.01px solid #9b9b9b; padding:5px;">
  <div class="center">
    <h1>SNOW BALL ICE CREAM</h1>
    <p class="sub">Shop Distribution Receipt</p>
  </div>
  <hr />
  <div class="meta"><span>Shop Owner</span><span>${card.shopownername || 'N/A'}</span></div>
  <div class="meta"><span>Date</span><span>${recordDate || card.cardDate || date}</span></div>
  <div class="meta"><span>Time</span><span>${new Date().toLocaleTimeString()}</span></div>
  <hr />
  <table>
    <thead>
      <tr><th>QTY</th><th>DESC</th><th class="num">PRICE</th><th class="num">TOTAL</th></tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>
  <hr />
  <div class="totals-row"><span>Items Total</span><span>Rs ${itemsTotal.toFixed(0)}</span></div>
  <div class="totals-row"><span>Commission (${commissionPercent}%)</span><span>Rs ${commissionAmount.toFixed(0)}</span></div>
  <hr />
  <div class="totals-row final"><span>TOTAL</span><span>Rs ${finalAmt.toFixed(0)}</span></div>
  <p class="thankyou">* THANK YOU *</p>
</body>
</html>`;
    }, [date, getCommissionAmount, getFinalAmountForDB]);

    const handleOpenBill = useCallback((card, recordDate) => {
        const html = generateBillHTML(card, recordDate);
        const win = window.open('', '_blank');
        if (!win) {
            showToast('Please allow popups to view the bill');
            return;
        }
        win.document.open();
        win.document.write(html);
        win.document.close();
    }, [generateBillHTML, showToast]);

    const handleDownloadBill = useCallback((card, recordDate) => {
        const html = generateBillHTML(card, recordDate);
        const win = window.open('', '_blank');
        if (!win) {
            showToast('Please allow popups to download the bill');
            return;
        }
        win.document.open();
        win.document.write(html);
        win.document.close();
        win.onload = () => {
            win.focus();
            win.print();
        };
        setTimeout(() => {
            win.focus();
            win.print();
        }, 300);
    }, [generateBillHTML, showToast]);

    // ---------- save ----------

    const handleSave = useCallback(async (card, isEdit = false) => {
        if (!card.shopownerid) {
            showToast('Please select a shop owner first');
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
        const finalAmount = getFinalAmountForDB(card);
        const saveDate = card.shopgoodsid ? (card.cardDate || date) : date;

        const payload = {
            shopownerid: card.shopownerid,
            details: JSON.stringify(
                validRows.map(r => {
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
            ),
            date: saveDate,
            commission: parseFloat(card.commission) || 0,
        };

        if (card.commission !== '' && card.commission !== null && card.commission !== undefined) {
            payload.finalamount = finalAmount;
        }

        const isUpdate = card.shopgoodsid || card.isUpdateMode || card.editMode;
        if (isUpdate && card.shopgoodsid) payload.shopgoodsid = card.shopgoodsid;

        updateCard(card.cardid, { saving: true }, isEdit);
        try {
            const endpoint = isUpdate ? 'shopgoods/update-shop-goods' : 'shopgoods/insert-shop-goods';
            const result = await postData(endpoint, payload);
            if (result?.status) {
                clearCache(cacheKey);
                showToast(isUpdate ? 'Record updated successfully!' : 'Record saved successfully!');
                let newId = null;
                if (result.data) {
                    newId = result.data.shopgoodsid || result.data?.data?.shopgoodsid || result.data?.shopgoodsid;
                }
                updateCard(card.cardid, {
                    saving: false,
                    saved: true,
                    editMode: false,
                    isUpdateMode: true,
                    shopgoodsid: newId || card.shopgoodsid,
                    cardDate: saveDate,
                }, isEdit);
                await fetchShopOwners();
                if (showRecords) await fetchRecords();
            } else {
                showToast(result?.message || 'Failed to save record');
                updateCard(card.cardid, { saving: false }, isEdit);
            }
        } catch (error) {
            console.error('Error saving record:', error);
            showToast('Error saving record');
            updateCard(card.cardid, { saving: false }, isEdit);
        }
    }, [date, getFinalAmountForDB, updateCard, fetchRecords, fetchShopOwners, showRecords, showToast, cacheKey]);

    // ---------- render helpers ----------

    const inputBase = 'border border-gray-300 rounded-md px-2 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white';

    const renderOwnerModal = useCallback(() => {
        if (!showOwnerModal) return null;
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                    <div className={`px-6 py-4 flex justify-between items-center ${isOwnerEditMode ? 'bg-gradient-to-r from-blue-600 to-blue-700' : 'bg-gradient-to-r from-emerald-600 to-emerald-700'}`}>
                        <h2 className="text-xl font-semibold text-white">
                            {isOwnerEditMode ? 'Edit Shop Owner' : 'Add Shop Owner'}
                        </h2>
                        <button
                            onClick={() => setShowOwnerModal(false)}
                            className="text-white hover:text-gray-200 transition-colors cursor-pointer"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    <div className="p-6">
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700">Owner Name <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    value={ownerFormData.shopownername}
                                    onChange={(e) => setOwnerFormData(prev => ({ ...prev, shopownername: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                    placeholder="Enter owner name"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700">Shop Name <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    value={ownerFormData.shopname}
                                    onChange={(e) => setOwnerFormData(prev => ({ ...prev, shopname: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                    placeholder="Enter shop name"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700">Mobile Number <span className="text-red-500">*</span></label>
                                <div className="flex items-center">
                                    <span className="px-3 py-2 bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg text-sm text-gray-600">+91</span>
                                    <input
                                        type="text"
                                        value={ownerFormData.mobileno}
                                        onChange={(e) => {
                                            let value = e.target.value.replace(/\D/g, '');
                                            if (value.length > 10) value = value.slice(0, 10);
                                            setOwnerFormData(prev => ({ ...prev, mobileno: value }));
                                        }}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                        placeholder="Enter 10-digit number"
                                        maxLength={10}
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700">Address</label>
                                <textarea
                                    value={ownerFormData.address}
                                    onChange={(e) => setOwnerFormData(prev => ({ ...prev, address: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                    placeholder="Enter shop address"
                                    rows="3"
                                />
                            </div>
                        </div>
                    </div>
                    <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
                        <button
                            onClick={() => setShowOwnerModal(false)}
                            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSaveOwner}
                            disabled={loadingOwners}
                            className={`px-4 py-2 text-white rounded-lg transition-colors cursor-pointer ${isOwnerEditMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600 hover:bg-blue-700'} ${loadingOwners ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                            {loadingOwners ? 'Saving...' : (isOwnerEditMode ? 'Update' : 'Add')}
                        </button>
                    </div>
                </div>
            </div>
        );
    }, [showOwnerModal, isOwnerEditMode, ownerFormData, loadingOwners, handleSaveOwner]);

    const renderCard = useCallback((card, isEdit = false) => {
        const otherSelectedShopOwnerIds = new Set(
            [...cards, ...editCards]
                .filter(c => c.cardid !== card.cardid && c.shopownerid)
                .map(c => String(c.shopownerid))
        );
        const availableShopOwners = shopOwners.filter(o => !otherSelectedShopOwnerIds.has(String(o.shopownerid)));

        return (
            <div key={card.cardid} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 relative">
                {!isEdit && !card.editMode && (
                    <button
                        onClick={() => removeCard(card.cardid, isEdit)}
                        title="Remove card"
                        className="absolute -top-2 -right-2 w-6 h-6 rounded-full border border-gray-300 text-gray-500 text-xs flex items-center justify-center hover:bg-red-50 hover:border-red-400 hover:text-red-500 bg-white transition-colors cursor-pointer"
                    >
                        ×
                    </button>
                )}
                {isEdit && (
                    <button
                        onClick={() => showConfirm('Are you sure you want to cancel editing? All changes will be lost.', () => setEditCards([]))}
                        title="Close edit"
                        className="absolute -top-2 -right-2 w-6 h-6 rounded-full border border-gray-300 text-gray-500 text-xs flex items-center justify-center hover:bg-red-50 hover:border-red-400 hover:text-red-500 bg-white transition-colors cursor-pointer"
                    >
                        ×
                    </button>
                )}
                {card.editMode && (
                    <span className="absolute top-2 right-8 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                        Edit Mode
                    </span>
                )}
                {card.isUpdateMode && !card.editMode && card.shopgoodsid && card.saved && (
                    <span className="absolute top-2 right-8 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        ✓ Saved
                    </span>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                    <div className="bg-blue-50/50 border border-blue-200 rounded-lg p-3">
                        <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide block mb-2">Shop Owner</span>
                        <select
                            value={card.shopownerid || ''}
                            onChange={(e) => handleSelectShopOwner(card.cardid, e.target.value, isEdit)}
                            className={`${inputBase} w-full cursor-pointer`}
                        >
                            <option value="">Select shop owner</option>
                            {availableShopOwners.map(o => (
                                <option key={o.shopownerid} value={o.shopownerid}>{o.shopownername} - {o.shopname}</option>
                            ))}
                            {card.shopownerid && !shopOwners.find(o => String(o.shopownerid) === String(card.shopownerid)) && (
                                <option value={card.shopownerid} disabled>{card.shopownername || 'Unavailable'} (Not Available)</option>
                            )}
                        </select>
                    </div>

                    <div className="bg-green-50/50 border border-green-200 rounded-lg p-3">
                        <span className="text-xs font-semibold text-green-600 uppercase tracking-wide block mb-2">Date</span>
                        <div className={`${inputBase} w-full bg-gray-50 text-gray-700 font-medium`}>{card.cardDate || date}</div>
                    </div>
                </div>

                {card.shopownerLocked && (
                    <div className="space-y-3">
                        {card.rows.map((row, idx) => {
                            const isLastRow = idx === card.rows.length - 1;
                            return (
                                <div key={row.rowid} className="flex items-center gap-2">
                                    <select
                                        value={row.productid}
                                        onChange={(e) => handleSelectProduct(card.cardid, row.rowid, e.target.value, isEdit)}
                                        className={`${inputBase} flex-1 min-w-0 cursor-pointer`}
                                    >
                                        <option value="">Select Ice Cream</option>
                                        <option value="allbig" className="font-bold text-purple-600">🔹 All Big</option>
                                        <option disabled>──────────</option>
                                        {products.map(p => (
                                            <option key={p.productid} value={p.productid}>
                                                {p.productname} (₹{parseFloat(p.productprice || 0).toFixed(2)})
                                            </option>
                                        ))}
                                    </select>

                                    {row.isAllBig ? (
                                        <>
                                            <input type="text" placeholder="e.g. 10+23+45" value={row.allBigExpr}
                                                onChange={(e) => updateRow(card.cardid, row.rowid, { allBigExpr: e.target.value }, isEdit)}
                                                className={`${inputBase} flex-1 min-w-0`} />
                                            <div className={`${inputBase} w-20 text-end bg-gray-50 text-gray-700`}>
                                                ₹{((evaluateExpression(row.allBigExpr) || 0) * 10).toFixed(0)}
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <input
                                                type="text" inputMode="numeric" placeholder="Qty"
                                                value={row.qty}
                                                onChange={(e) => updateRow(card.cardid, row.rowid, { qty: e.target.value }, isEdit)}
                                                className={`${inputBase} w-14 text-center`}
                                            />
                                            <input
                                                type="text" inputMode="numeric" placeholder="Price"
                                                value={row.price} readOnly
                                                className={`${inputBase} w-14 text-center bg-gray-100 cursor-not-allowed`}
                                            />
                                            <div className={`${inputBase} w-20 text-end bg-gray-50 text-gray-700`}>
                                                ₹{rowTotal(row).toFixed(0)}
                                            </div>
                                        </>
                                    )}

                                    {isLastRow ? (
                                        <button
                                            onClick={() => addRow(card.cardid, isEdit)}
                                            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm hover:bg-gray-50 whitespace-nowrap text-gray-600 hover:text-gray-800 transition-colors cursor-pointer"
                                        >
                                            + Add
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => removeRow(card.cardid, row.rowid, isEdit)}
                                            title="Remove row"
                                            className="text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                                        >
                                            ×
                                        </button>
                                    )}
                                </div>
                            );
                        })}

                        <div className="flex items-center justify-end gap-2 pt-1 border-t border-gray-100 pr-17">
                            <span className="text-sm font-medium text-gray-700">Items Total:</span>
                            <div className={`${inputBase} w-20 text-end bg-gray-50 font-medium`}>
                                ₹{cardItemsTotal(card).toFixed(0)}
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pr-17">
                            <span className="text-sm font-medium text-gray-700">Commission (%):</span>
                            <input
                                type="text" inputMode="numeric"
                                value={card.commission}
                                onChange={(e) => updateCard(card.cardid, { commission: e.target.value, saved: false }, isEdit)}
                                className={`${inputBase} w-20 text-end`}
                            />
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-1 border-t border-gray-200 pr-17">
                            <span className="text-sm font-semibold text-gray-900">Final Amount:</span>
                            <div className={`${inputBase} w-24 text-end bg-blue-50 font-bold text-blue-700 text-base overflow-auto`}>
                                {getFinalAmount(card) !== null ? `₹${getFinalAmount(card).toFixed(0)}` : <span className="text-gray-400 text-sm">-</span>}
                            </div>
                        </div>

                        <div className="flex justify-end pt-2 pr-17">
                            <button
                                onClick={() => handleSave(card, isEdit)}
                                disabled={card.saving}
                                className={`px-6 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${card.saved
                                    ? 'bg-green-100 text-green-700 border border-green-300 cursor-default'
                                    : (card.editMode || card.isUpdateMode || card.shopgoodsid)
                                        ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                                    } ${card.saving ? 'opacity-60 cursor-not-allowed' : ''}`}
                            >
                                {card.saving ? 'Saving...' : card.saved ? '✓ Saved' : (card.editMode || card.isUpdateMode || card.shopgoodsid) ? 'Update Record' : 'Save Record'}
                            </button>

                            {card.saved && (
                                <>
                                    <button onClick={() => handleOpenBill(card)}
                                        className="ml-2 px-4 py-2 bg-gray-700 hover:bg-gray-800 text-white rounded-md text-sm font-medium transition-colors cursor-pointer">
                                        View Bill
                                    </button>
                                    <button onClick={() => handleDownloadBill(card)}
                                        className="ml-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-sm font-medium transition-colors cursor-pointer">
                                        Download Bill
                                    </button>
                                </>
                            )}

                            {card.editMode && card.saved && (
                                <button
                                    onClick={() => { setEditCards([]); if (showRecords) fetchRecords(); }}
                                    className="ml-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md text-sm transition-colors cursor-pointer"
                                >
                                    Close
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    }, [cards, editCards, shopOwners, products, date, handleSelectShopOwner, handleSelectProduct, updateRow, updateCard, addRow, removeRow, removeCard, handleSave, getFinalAmount, showConfirm, showRecords, fetchRecords, handleOpenBill, handleDownloadBill]);

    // Records table rendering
    const renderRecordsTable = useCallback(() => {
        if (loadingRecords) {
            return (
                <div className="flex justify-center items-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            );
        }
        const filteredRecords = recordSearch.trim()
            ? records.filter(r =>
                r.shopownername?.toLowerCase().includes(recordSearch.toLowerCase()) ||
                String(r.shopgoodsid).includes(recordSearch)
            )
            : records;
        if (filteredRecords.length === 0) {
            return (
                <div className="text-center py-8 text-gray-500">
                    No records found for the selected {filterType === 'date' ? 'date' : 'month'}
                </div>
            );
        }
        return (
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-bold text-black uppercase tracking-wider">ID</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-black uppercase tracking-wider">Shop Owner</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-black uppercase tracking-wider">Date</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-black uppercase tracking-wider">Items</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-black uppercase tracking-wider">Commission (%)</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-black uppercase tracking-wider">Final Amount</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-black uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredRecords.map(record => {
                            return (
                                <tr key={record.shopgoodsid} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3 text-sm text-gray-500">#{record.shopgoodsid}</td>
                                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{record.shopownername || 'Unknown'}</td>
                                    <td className="px-4 py-3 text-sm text-gray-500">{record.date}</td>
                                    <td className="px-4 py-3 text-sm text-gray-500">{(record.details || []).map((item, i) => (<div key={i} className="text-xs">{item.productname}: {item.isAllBig ? `₹${item.total}` : `${item.qty} × ₹${item.price} = ₹${item.total}`}</div>))}</td>
                                    <td className="px-4 py-3 text-sm text-gray-500">{parseFloat(record.commission || 0).toFixed(0)}%</td>
                                    <td className="px-4 py-3 text-sm font-semibold text-blue-600">₹{parseFloat(record.finalamount || 0).toFixed(0)}</td>
                                    <td className="px-4 py-3 text-sm">
                                        <div className="flex gap-2">
                                            <button onClick={() => handleEditRecord(record)} className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg transition-colors cursor-pointer">
                                                Edit
                                            </button>
                                            <button onClick={() => handleDeleteRecord(record.shopgoodsid)} className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded-lg transition-colors cursor-pointer">
                                                Delete
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const cardFromRecord = {
                                                        cardid: `record-${record.shopgoodsid}`,
                                                        shopownername: record.shopownername || '',
                                                        rows: (record.details || []).map(item => ({
                                                            rowid: `rec-row-${Math.random().toString(36).slice(2, 7)}`,
                                                            productid: item.productid || '',
                                                            productname: item.productname || '',
                                                            qty: item.qty || '',
                                                            price: item.price || '',
                                                            isAllBig: item.isAllBig || false,
                                                            allBigExpr: item.allBigExpr || '',
                                                        })),
                                                        commission: String(record.commission || ''),
                                                    };
                                                    handleDownloadBill(cardFromRecord, record.date);
                                                }}
                                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-lg transition-colors cursor-pointer">
                                                Bill
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        );
    }, [loadingRecords, recordSearch, records, filterType, handleEditRecord, handleDeleteRecord, handleDownloadBill]);

    // Shop owners table
    const renderShopOwnersTable = useCallback(() => (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-4">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h4 className="text-sm font-semibold text-gray-700">Shop Owners</h4>
                <button onClick={handleAddOwner} className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors flex items-center gap-1 cursor-pointer">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add Owner
                </button>
            </div>
            {showOwners && (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-2 text-left text-xs font-bold text-black uppercase tracking-wider">ID</th>
                                <th className="px-4 py-2 text-left text-xs font-bold text-black uppercase tracking-wider">Owner Name</th>
                                <th className="px-4 py-2 text-left text-xs font-bold text-black uppercase tracking-wider">Shop Name</th>
                                <th className="px-4 py-2 text-left text-xs font-bold text-black uppercase tracking-wider">Mobile</th>
                                <th className="px-4 py-2 text-left text-xs font-bold text-black uppercase tracking-wider">Address</th>
                                <th className="px-4 py-2 text-left text-xs font-bold text-black uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {shopOwners.length === 0 ? (
                                <tr><td colSpan="6" className="px-4 py-4 text-center text-sm text-gray-500">No shop owners found</td></tr>
                            ) : (
                                shopOwners.map(owner => (
                                    <tr key={owner.shopownerid} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-2 text-sm text-gray-500">#{owner.shopownerid}</td>
                                        <td className="px-4 py-2 text-sm font-medium text-gray-900">{owner.shopownername}</td>
                                        <td className="px-4 py-2 text-sm text-gray-700">{owner.shopname}</td>
                                        <td className="px-4 py-2 text-sm text-gray-500">{owner.mobileno}</td>
                                        <td className="px-4 py-2 text-sm text-gray-500">{owner.address || '-'}</td>
                                        <td className="px-4 py-2 text-sm">
                                            <div className="flex gap-2">
                                                <button onClick={() => handleEditOwner(owner)} className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg transition-colors cursor-pointer">Edit</button>
                                                <button onClick={() => handleDeleteOwner(owner.shopownerid)} className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded-lg transition-colors cursor-pointer">Delete</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    ), [showOwners, shopOwners, handleAddOwner, handleEditOwner, handleDeleteOwner]);

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
                            <button onClick={() => setConfirmVisible(false)} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition-colors text-sm font-medium cursor-pointer">
                                Cancel
                            </button>
                            <button onClick={() => { if (confirmAction) confirmAction(); setConfirmVisible(false); }} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-medium cursor-pointer">
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between mb-6">
                <div className={`${inputBase} flex items-center gap-2 font-medium`}>
                    <span className="text-black text-lg font-bold">Date:</span>
                    <input
                        type="date" value={date}
                        onChange={(e) => handleDateChange(e.target.value)}
                        className="border-none outline-none text-lg font-bold bg-transparent cursor-pointer"
                    />
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setShowOwners(!showOwners)}
                        className="px-4 py-2 bg-orange-300 hover:bg-orange-400 text-white rounded-md transition-colors text-sm font-medium cursor-pointer"
                    >
                        {showOwners ? 'Hide Owners' : 'View Owners'}
                    </button>
                    <button
                        onClick={() => { setShowRecords(!showRecords); if (!showRecords) fetchRecords(); }}
                        className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors text-sm font-medium cursor-pointer"
                    >
                        {showRecords ? 'Hide Records' : 'View Records'}
                    </button>
                    <button
                        onClick={addCard}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors flex items-center gap-2 text-sm font-medium cursor-pointer"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Add Shop Owner
                    </button>
                </div>
            </div>

            {loadingLookups && <p className="text-center text-sm text-gray-400 mb-4">Loading...</p>}

            {showOwners && renderShopOwnersTable()}

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
                                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="px-3 py-1.5 border border-gray-300 rounded-md text-sm cursor-pointer" />
                                ) : (
                                    <div className="flex gap-2">
                                        <select value={filterMonth} onChange={(e) => setFilterMonth(parseInt(e.target.value))} className="px-3 py-1.5 border border-gray-300 rounded-md text-sm cursor-pointer">
                                            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                                <option key={m} value={m}>{new Date(2000, m - 1).toLocaleString('default', { month: 'long' })}</option>
                                            ))}
                                        </select>
                                        <select value={filterYear} onChange={(e) => setFilterYear(parseInt(e.target.value))} className="px-3 py-1.5 border border-gray-300 rounded-md text-sm cursor-pointer">
                                            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                                                <option key={y} value={y}>{y}</option>
                                            ))}
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
                        <button
                            onClick={() => showConfirm('Are you sure you want to cancel editing? All changes will be lost.', () => setEditCards([]))}
                            className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md text-sm transition-colors cursor-pointer"
                        >
                            Cancel Edit
                        </button>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {editCards.map(card => renderCard(card, true))}
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {cards.map(card => renderCard(card, false))}
                </div>
            )}

            {renderOwnerModal()}
        </div>
    );
}