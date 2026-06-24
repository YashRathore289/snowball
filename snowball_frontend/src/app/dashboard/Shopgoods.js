'use client'
import { useState, useEffect, useCallback, useMemo } from 'react';
import { postData } from '@/Services';
import { saveCache, getCache } from './ComponentCache';

// ---------- helpers ----------

function emptyRow() {
    return {
        rowid: `row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        productid: '',
        productname: '',
        qty: '',
        price: '',
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
    };
}

const rowTotal = (row) => {
    const q = parseFloat(row.qty);
    const p = parseFloat(row.price);
    if (isNaN(q) || isNaN(p)) return 0;
    return Math.round(q * p * 100) / 100;
};

const cardItemsTotal = (card) =>
    card.rows.reduce((sum, r) => sum + rowTotal(r), 0);

export default function ShopGoodsManagement({ cacheKey }) {
    // Restore from cache if available
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

    // Auto-dismiss toast after 5s
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

    // Save state to cache before unmounting
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
            if (result?.status) setRecords(result.data);
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
    }, [fetchShopOwners, showToast]);

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
                if (result?.status) clearCache(cacheKey); showToast('Shop owner updated successfully!');
            } else {
                result = await postData('shopowner/insert-shop-owner', {
                    shopownername: ownerFormData.shopownername,
                    shopname: ownerFormData.shopname,
                    mobileno: ownerFormData.mobileno,
                    address: ownerFormData.address
                });
                if (result?.status) clearCache(cacheKey); showToast('Shop owner added successfully!');
            }
            if (result?.status) {
                clearCache(cacheKey);
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
    }, [ownerFormData, isOwnerEditMode, fetchShopOwners, showToast]);

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
        })) || [emptyRow()];
        newCardData.commission = String(record.commission || '');
        newCardData.editMode = true;
        newCardData.shopgoodsid = record.shopgoodsid;
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
                if (showRecords) await fetchRecords();
            } else {
            showToast(result?.message || 'Failed to delete');
        }
    } catch (error) {
        console.error('Error deleting record:', error);
        showToast('Error deleting record');
    }
}, [fetchRecords, fetchShopOwners, showToast]);

const handleDeleteRecord = useCallback((shopgoodsid) => {
    showConfirm('Are you sure you want to delete this record?', () => performDeleteRecord(shopgoodsid));
}, [showConfirm, performDeleteRecord]);

// ---------- card-level mutators (memoized) ----------

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
    updateCard(cardid, {
        shopownerid,
        shopownername: owner ? owner.shopownername : '',
        shopownerLocked: !!shopownerid,
    }, isEdit);
}, [shopOwners, updateCard]);

const handleSelectProduct = useCallback((cardid, rowid, productid, isEdit = false) => {
    const product = products.find(p => String(p.productid) === String(productid));
    updateRow(cardid, rowid, {
        productid,
        productname: product ? product.productname : '',
        price: product ? product.productprice : '',
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
}, [editCards, showToast]);

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

// ---------- derived values (memoized) ----------

const getCommissionAmount = useCallback((card) => {
    const itemsTotal = cardItemsTotal(card);
    const commissionPercent = parseFloat(card.commission) || 0;
    return (itemsTotal * commissionPercent) / 100;
}, []);

const getFinalAmount = useCallback((card) => {
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

// ---------- save (memoized) ----------

const handleSave = useCallback(async (card, isEdit = false) => {
    if (!card.shopownerid) {
        showToast('Please select a shop owner first');
        return;
    }
    const validRows = card.rows.filter(r => r.productid && r.qty && r.price);
    if (validRows.length === 0) {
        showToast('Add at least one item with name, quantity and price');
        return;
    }
    const finalAmount = getFinalAmountForDB(card);

    const payload = {
        shopownerid: card.shopownerid,
        details: JSON.stringify(
            validRows.map(r => ({
                productid: r.productid,
                productname: r.productname,
                qty: parseFloat(r.qty),
                price: parseFloat(r.price),
                total: rowTotal(r),
            }))
        ),
        date,
        commission: parseFloat(card.commission) || 0,
        finalamount: finalAmount,
    };

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
            }, isEdit);
            if (showRecords) await fetchRecords();
            if (isEdit) {
                setTimeout(() => setEditCards([]), 1500);
            }
        } else {
            showToast(result?.message || 'Failed to save record');
            updateCard(card.cardid, { saving: false }, isEdit);
        }
    } catch (error) {
        console.error('Error saving record:', error);
        showToast('Error saving record');
        updateCard(card.cardid, { saving: false }, isEdit);
    }
}, [date, getFinalAmountForDB, updateCard, fetchRecords, fetchShopOwners, showRecords, showToast]);

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
                            <input
                                type="text"
                                value={ownerFormData.mobileno}
                                onChange={(e) => setOwnerFormData(prev => ({ ...prev, mobileno: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                placeholder="Enter mobile number"
                            />
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

            <div className={`${inputBase} inline-block mb-3 font-medium bg-gray-50`}>
                <div className="flex items-center gap-2">
                    <span className="text-gray-700">#{card.serial} -</span>
                    <select
                        value={card.shopownerid || ''}
                        onChange={(e) => handleSelectShopOwner(card.cardid, e.target.value, isEdit)}
                        className="border-none outline-none text-sm bg-transparent w-48 cursor-pointer"
                    >
                        <option value="">Select shop owner</option>
                        {shopOwners.map(owner => (
                            <option key={owner.shopownerid} value={owner.shopownerid}>
                                {owner.shopownername}
                            </option>
                        ))}
                    </select>
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
                                    {products.map(p => (
                                        <option key={p.productid} value={p.productid}>
                                            {p.productname} (₹{parseFloat(p.productprice || 0).toFixed(2)})
                                        </option>
                                    ))}
                                </select>
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
                                        className="w-15 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
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
                            ₹{getFinalAmount(card)?.toFixed(0) || 0}
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
}, [shopOwners, products, handleSelectShopOwner, handleSelectProduct, updateRow, updateCard, addRow, removeRow, removeCard, handleSave, getFinalAmount, showConfirm, showRecords, fetchRecords]);

// Records table rendering (memoized)
const renderRecordsTable = useCallback(() => {
    if (loadingRecords) {
        return (
            <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }
    if (records.length === 0) {
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
                    {records.map(record => {
                        const owner = shopOwners.find(o => o.shopownerid === record.shopownerid);
                        return (
                            <tr key={record.shopgoodsid} className="hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-3 text-sm text-gray-500">#{record.shopgoodsid}</td>
                                <td className="px-4 py-3 text-sm font-medium text-gray-900">{owner?.shopownername || 'Unknown'}</td>
                                <td className="px-4 py-3 text-sm text-gray-500">{record.date}</td>
                                <td className="px-4 py-3 text-sm text-gray-500">{record.details?.length || 0} items</td>
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
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}, [loadingRecords, records, filterType, shopOwners, handleEditRecord, handleDeleteRecord]);

// Shop owners table (memoized)
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
        {/* Toast Notification */}
        {toastVisible && (
            <div className="fixed top-4 right-4 z-50 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3">
                <span>{toastMessage}</span>
                <button onClick={() => setToastVisible(false)} className="text-white hover:text-gray-200 font-bold text-lg leading-none cursor-pointer">×</button>
            </div>
        )}

        {/* Confirmation Popup */}
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
                    onChange={(e) => setDate(e.target.value)}
                    className="border-none text-black outline-none bg-transparent font-bold text-lg cursor-pointer"
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