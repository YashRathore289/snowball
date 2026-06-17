'use client'
import { useState, useEffect } from 'react';
import { postData } from '@/Services';

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
    };
}

function newCard(serial) {
    return {
        cardid: `card-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        serial,
        salesmanid: '',
        salesmanName: '',
        salesmanLocked: false,
        rows: [emptyRow()],
        returnExpr: '',
        commission: '',
        saving: false,
        saved: false,
        editMode: false,
        handedgoodsid: null,
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

export default function HandedGoodsManagement() {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [salesmen, setSalesmen] = useState([]);
    const [products, setProducts] = useState([]);
    const [cards, setCards] = useState([newCard(1)]);
    const [editCards, setEditCards] = useState([]); // Separate state for edit cards
    const [loadingLookups, setLoadingLookups] = useState(false);
    const [showRecords, setShowRecords] = useState(false);
    const [records, setRecords] = useState([]);
    const [filterType, setFilterType] = useState('date');
    const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
    const [filterYear, setFilterYear] = useState(new Date().getFullYear());
    const [loadingRecords, setLoadingRecords] = useState(false);

    // ---------- lookups ----------

    const fetchSalesmen = async () => {
        try {
            const result = await postData('employee/retrieve-salesman', {});
            if (result && result.status) {
                setSalesmen(result.data || []);
            }
        } catch (error) {
            console.error('Error fetching salesmen:', error);
        }
    };

    const fetchProducts = async () => {
        try {
            const result = await postData('product/retrieve-products', {});
            if (result && result.status) {
                setProducts(result.data || []);
            }
        } catch (error) {
            console.error('Error fetching products:', error);
        }
    };

    useEffect(() => {
        const loadLookups = async () => {
            setLoadingLookups(true);
            await Promise.all([fetchSalesmen(), fetchProducts()]);
            setLoadingLookups(false);
        };
        loadLookups();
    }, []);

    // ---------- Fetch Records ----------

    const fetchRecords = async () => {
        setLoadingRecords(true);
        try {
            let payload = {};
            if (filterType === 'date') {
                payload = { date: date };
            } else {
                payload = { month: filterMonth, year: filterYear };
            }
            
            const result = await postData('handedgoods/retrieve-handed-goods', payload);
            if (result && result.status) {
                const parsedRecords = result.data.map(record => ({
                    ...record,
                    details: typeof record.details === 'string' ? JSON.parse(record.details) : record.details
                }));
                setRecords(parsedRecords);
            }
        } catch (error) {
            console.error('Error fetching records:', error);
        } finally {
            setLoadingRecords(false);
        }
    };

    // ---------- Edit Record ----------
    const handleEditRecord = (record) => {
        const newCardData = newCard(editCards.length + 1);
        newCardData.salesmanid = record.salesmanid;
        newCardData.salesmanName = record.salesman_name;
        newCardData.salesmanLocked = true;
        newCardData.rows = record.details.map(item => ({
            rowid: `row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            productid: item.productid || '',
            productname: item.productname || '',
            qty: item.qty || '',
            price: item.price || '',
        }));
        newCardData.returnExpr = String(record.returnamt || '');
        newCardData.commission = String(record.commission || '');
        newCardData.editMode = true;
        newCardData.handedgoodsid = record.handedgoodsid;
        newCardData.saved = false;
        
        setEditCards([...editCards, newCardData]);
        setShowRecords(false);
    };

    // ---------- Delete Record ----------

    const handleDeleteRecord = async (handedgoodsid) => {
        if (!confirm('Are you sure you want to delete this record?')) return;
        
        try {
            const result = await postData('handedgoods/delete-handed-goods', { handedgoodsid });
            if (result && result.status) {
                alert('Record deleted successfully!');
                fetchRecords();
            } else {
                alert(result?.message || 'Failed to delete');
            }
        } catch (error) {
            console.error('Error deleting record:', error);
            alert('Error deleting record');
        }
    };

    // ---------- card-level mutators ----------

    // Update card (for both cards and editCards)
    const updateCard = (cardid, patch, isEdit = false) => {
        const setter = isEdit ? setEditCards : setCards;
        setter((prev) =>
            prev.map((c) => (c.cardid === cardid ? { ...c, ...patch } : c))
        );
    };

    const updateRow = (cardid, rowid, patch, isEdit = false) => {
        const setter = isEdit ? setEditCards : setCards;
        setter((prev) =>
            prev.map((c) => {
                if (c.cardid !== cardid) return c;
                return {
                    ...c,
                    rows: c.rows.map((r) => (r.rowid === rowid ? { ...r, ...patch } : r)),
                    saved: false,
                };
            })
        );
    };

    const handleSelectSalesman = (cardid, salesmanid, isEdit = false) => {
        const salesman = salesmen.find(
            (s) => String(s.salesmanid) === String(salesmanid)
        );
        updateCard(cardid, {
            salesmanid,
            salesmanName: salesman ? salesman.fullname : '',
            salesmanLocked: !!salesmanid,
        }, isEdit);
    };

    // ========== Auto-fill price when product is selected ==========
    const handleSelectProduct = (cardid, rowid, productid, isEdit = false) => {
        const product = products.find(
            (p) => String(p.productid) === String(productid)
        );
        updateRow(cardid, rowid, {
            productid,
            productname: product ? product.productname : '',
            price: product ? product.productprice : '',
        }, isEdit);
    };

    const addRow = (cardid, isEdit = false) => {
        const setter = isEdit ? setEditCards : setCards;
        setter((prev) =>
            prev.map((c) =>
                c.cardid === cardid ? { ...c, rows: [...c.rows, emptyRow()] } : c
            )
        );
    };

    const removeRow = (cardid, rowid, isEdit = false) => {
        const setter = isEdit ? setEditCards : setCards;
        setter((prev) =>
            prev.map((c) => {
                if (c.cardid !== cardid) return c;
                if (c.rows.length === 1) return c;
                return { ...c, rows: c.rows.filter((r) => r.rowid !== rowid) };
            })
        );
    };

    const addCard = () => {
        setCards((prev) => [...prev, newCard(prev.length + 1)]);
    };

    const removeCard = (cardid, isEdit = false) => {
        if (isEdit) {
            setEditCards((prev) =>
                prev
                    .filter((c) => c.cardid !== cardid)
                    .map((c, idx) => ({ ...c, serial: idx + 1 }))
            );
        } else {
            setCards((prev) =>
                prev
                    .filter((c) => c.cardid !== cardid)
                    .map((c, idx) => ({ ...c, serial: idx + 1 }))
            );
        }
    };

    // ---------- derived values ----------

    const getReturnValue = (card) => {
        const evaluated = evaluateExpression(card.returnExpr);
        return evaluated;
    };

    // ========== FIXED: Final amount calculation ==========
    const getFinalAmount = (card) => {
        const itemsTotal = cardItemsTotal(card);
        const returnVal = getReturnValue(card) || 0;
        const commissionVal = parseFloat(card.commission) || 0;
        const total = itemsTotal - returnVal;
        // Only show final amount if commission is entered
        if (card.commission === '' || card.commission === null || card.commission === undefined) {
            return null;
        }
        return Math.round((total - commissionVal) * 100) / 100;
    };

    // ========== FIXED: Final amount for database ==========
    const getFinalAmountForDB = (card) => {
        const itemsTotal = cardItemsTotal(card);
        const returnVal = getReturnValue(card) || 0;
        const commissionVal = parseFloat(card.commission) || 0;
        const total = itemsTotal - returnVal;
        return Math.round((total - commissionVal) * 100) / 100;
    };

    // ---------- save ----------

    const handleSave = async (card, isEdit = false) => {
        if (!card.salesmanid) {
            alert('Please select a salesman first');
            return;
        }

        const validRows = card.rows.filter((r) => r.productid && r.qty && r.price);
        if (validRows.length === 0) {
            alert('Add at least one item with name, quantity and price');
            return;
        }

        const returnVal = getReturnValue(card);
        if (returnVal === null) {
            alert('Return amount expression is invalid');
            return;
        }

        const finalAmount = getFinalAmountForDB(card);

        const payload = {
            salesmanid: card.salesmanid,
            date: date,
            details: JSON.stringify(
                validRows.map((r) => ({
                    productid: r.productid,
                    productname: r.productname,
                    qty: parseFloat(r.qty),
                    price: parseFloat(r.price),
                    total: rowTotal(r),
                }))
            ),
            returnamt: returnVal,
            commission: parseFloat(card.commission) || 0,
            finalamount: finalAmount,
        };

        if (card.editMode && card.handedgoodsid) {
            payload.handedgoodsid = card.handedgoodsid;
        }

        updateCard(card.cardid, { saving: true }, isEdit);
        try {
            const endpoint = card.editMode ? 'handedgoods/update-handed-goods' : 'handedgoods/insert-handed-goods';
            const result = await postData(endpoint, payload);
            if (result && result.status) {
                alert(card.editMode ? 'Record updated successfully!' : 'Record saved successfully!');
                updateCard(card.cardid, { saving: false, saved: true, editMode: false }, isEdit);
                if (showRecords) fetchRecords();
                // Remove edit card after save
                if (isEdit) {
                    setTimeout(() => {
                        setEditCards(prev => prev.filter(c => c.cardid !== card.cardid));
                    }, 1500);
                }
            } else {
                alert(result?.message || 'Failed to save record');
                updateCard(card.cardid, { saving: false }, isEdit);
            }
        } catch (error) {
            console.error('Error saving handed goods:', error);
            alert('Error saving record');
            updateCard(card.cardid, { saving: false }, isEdit);
        }
    };

    // ---------- render ----------

    const inputBase =
        'border border-gray-300 rounded-md px-2 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white';

    // ---------- Render Card ----------
    const renderCard = (card, isEdit = false) => {
        const cardList = isEdit ? editCards : cards;
        const setCardList = isEdit ? setEditCards : setCards;

        return (
            <div key={card.cardid} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 relative">
                {cardList.length > 1 && !card.editMode && (
                    <button
                        onClick={() => removeCard(card.cardid, isEdit)}
                        title="Remove card"
                        className="absolute -top-2 -right-2 w-6 h-6 rounded-full border border-gray-300 text-gray-500 text-xs flex items-center justify-center hover:bg-red-50 hover:border-red-400 hover:text-red-500 bg-white transition-colors"
                    >
                        ×
                    </button>
                )}

                {/* Edit Mode Badge */}
                {card.editMode && (
                    <span className="absolute top-2 right-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                        Edit Mode
                    </span>
                )}

                {/* Salesman header box */}
                <div className={`${inputBase} inline-block mb-3 font-medium bg-gray-50`}>
                    {!card.salesmanLocked ? (
                        <div className="flex items-center gap-2">
                            <span className="text-gray-700">#{card.serial} -</span>
                            <select
                                value={card.salesmanid}
                                onChange={(e) =>
                                    handleSelectSalesman(card.cardid, e.target.value, isEdit)
                                }
                                className="border-none outline-none text-sm bg-transparent"
                            >
                                <option value="">Select salesman</option>
                                {salesmen.map((s) => (
                                    <option key={s.salesmanid} value={s.salesmanid}>
                                        {s.fullname}
                                    </option>
                                ))}
                            </select>
                        </div>
                    ) : (
                        <span className="text-gray-800">
                            #{card.serial} - {card.salesmanName}
                        </span>
                    )}
                </div>

                {/* Rest of card only shows once salesman is picked */}
                {card.salesmanLocked && (
                    <div className="space-y-3">
                        {card.rows.map((row, idx) => {
                            const isLastRow = idx === card.rows.length - 1;
                            return (
                                <div
                                    key={row.rowid}
                                    className="flex items-center gap-2"
                                >
                                    <select
                                        value={row.productid}
                                        onChange={(e) =>
                                            handleSelectProduct(
                                                card.cardid,
                                                row.rowid,
                                                e.target.value,
                                                isEdit
                                            )
                                        }
                                        className={`${inputBase} flex-1 min-w-0`}
                                    >
                                        <option value="">Select Ice Cream</option>
                                        {products.map((p) => (
                                            <option key={p.productid} value={p.productid}>
                                                {p.productname} (₹{parseFloat(p.productprice || 0).toFixed(2)})
                                            </option>
                                        ))}
                                    </select>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        placeholder="Qty"
                                        value={row.qty}
                                        onChange={(e) =>
                                            updateRow(card.cardid, row.rowid, {
                                                qty: e.target.value,
                                            }, isEdit)
                                        }
                                        className={`${inputBase} w-14 text-center`}
                                    />
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        placeholder="Price"
                                        value={row.price}
                                        readOnly
                                        className={`${inputBase} w-14 text-center bg-gray-100 cursor-not-allowed`}
                                    />
                                    <div
                                        className={`${inputBase} w-20 text-end bg-gray-50 text-gray-700`}
                                    >
                                        ₹{rowTotal(row).toFixed(0)}
                                    </div>

                                    {isLastRow ? (
                                        <button
                                            onClick={() => addRow(card.cardid, isEdit)}
                                            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm hover:bg-gray-50 whitespace-nowrap text-gray-600 hover:text-gray-800 transition-colors"
                                        >
                                            + Add
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => removeRow(card.cardid, row.rowid, isEdit)}
                                            title="Remove row"
                                            className="w-15 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors"
                                        >
                                            ×
                                        </button>
                                    )}
                                </div>
                            );
                        })}

                        {/* Total of items */}
                        <div className="flex items-center justify-end gap-2 pt-1 border-t border-gray-100 pr-17">
                            <span className="text-sm font-medium text-gray-700">Items Total:</span>
                            <div className={`${inputBase} w-20 text-end bg-gray-50 font-medium`}>
                                ₹{cardItemsTotal(card).toFixed(0)}
                            </div>
                        </div>

                        {/* Return expression */}
                        <div className="flex items-center justify-end gap-2 pr-17">
                            <span className="text-sm font-medium text-gray-700">Return:</span>
                            <input
                                type="text"
                                placeholder="e.g. 40 + 512 + 8"
                                value={card.returnExpr}
                                onChange={(e) =>
                                    updateCard(card.cardid, {
                                        returnExpr: e.target.value,
                                        saved: false,
                                    }, isEdit)
                                }
                                className={`${inputBase} w-40`}
                            />
                            <div
                                className={`${inputBase} w-20 text-end bg-gray-50 font-medium ${getReturnValue(card) === null ? 'text-red-500' : 'text-gray-700'
                                    }`}
                            >
                                ₹{getReturnValue(card) === null ? '?' : getReturnValue(card).toFixed(0)}
                            </div>
                        </div>

                        {/* Total */}
                        <div className="flex items-center justify-end gap-2 pt-1 border-t border-gray-100 pr-17">
                            <span className="text-sm font-medium text-gray-700">Total:</span>
                            <div className={`${inputBase} w-20 text-end bg-gray-50 font-medium`}>
                                ₹{(cardItemsTotal(card) - (getReturnValue(card) || 0)).toFixed(0)}
                            </div>
                        </div>

                        {/* Commission */}
                        <div className="flex items-center justify-end gap-2 pr-17">
                            <span className="text-sm font-medium text-gray-700">Commission:</span>
                            <input
                                type="text"
                                inputMode="numeric"
                                placeholder="Commission"
                                value={card.commission}
                                onChange={(e) =>
                                    updateCard(card.cardid, {
                                        commission: e.target.value,
                                        saved: false,
                                    }, isEdit)
                                }
                                className={`${inputBase} w-20 text-end`}
                            />
                        </div>

                        {/* ========== UPDATED: Final amount - only show when commission is entered ========== */}
                        <div className="flex items-center justify-end gap-2 pt-1 border-t border-gray-200 pr-17">
                            <span className="text-sm font-semibold text-gray-900">
                                Final Amount:
                            </span>
                            <div
                                className={`${inputBase} w-24 text-end bg-blue-50 font-bold text-blue-700 text-base overflow-auto`}
                            >
                                {getFinalAmount(card) !== null ? (
                                    `₹${getFinalAmount(card).toFixed(0)}`
                                ) : (
                                    <span className="text-gray-400 text-sm">Enter commission</span>
                                )}
                            </div>
                        </div>

                        {/* Save button */}
                        <div className="flex justify-end pt-2 pr-17">
                            <button
                                onClick={() => handleSave(card, isEdit)}
                                disabled={card.saving}
                                className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${card.saved
                                    ? 'bg-green-100 text-green-700 border border-green-300 cursor-default'
                                    : card.editMode
                                        ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                                    } ${card.saving ? 'opacity-60 cursor-not-allowed' : ''}`}
                            >
                                {card.saving
                                    ? 'Saving...'
                                    : card.saved
                                        ? '✓ Saved'
                                        : card.editMode
                                            ? 'Update Record'
                                            : 'Save Record'}
                            </button>
                            {card.editMode && card.saved && (
                                <button
                                    onClick={() => {
                                        setEditCards(prev => prev.filter(c => c.cardid !== card.cardid));
                                        if (showRecords) fetchRecords();
                                    }}
                                    className="ml-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md text-sm transition-colors"
                                >
                                    Close
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // ---------- Render Records Table ----------

    const renderRecordsTable = () => {
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
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Salesman</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Return</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Commission</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Final Amount</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {records.map((record) => (
                            <tr key={record.handedgoodsid} className="hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-3 text-sm text-gray-500">#{record.handedgoodsid}</td>
                                <td className="px-4 py-3 text-sm font-medium text-gray-900">{record.salesman_name}</td>
                                <td className="px-4 py-3 text-sm text-gray-500">{record.date}</td>
                                <td className="px-4 py-3 text-sm text-gray-500">
                                    {Array.isArray(record.details) ? record.details.length : 0} items
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-500">₹{parseFloat(record.returnamt || 0).toFixed(0)}</td>
                                <td className="px-4 py-3 text-sm text-gray-500">₹{parseFloat(record.commission || 0).toFixed(0)}</td>
                                <td className="px-4 py-3 text-sm font-semibold text-blue-600">₹{parseFloat(record.finalamount || 0).toFixed(0)}</td>
                                <td className="px-4 py-3 text-sm">
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleEditRecord(record)}
                                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg transition-colors"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDeleteRecord(record.handedgoodsid)}
                                            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded-lg transition-colors"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className="max-w-7xl mx-auto px-4 py-6">
            {/* Header: Date + Add card button */}
            <div className="flex items-center justify-between mb-6">
                <div className={`${inputBase} flex items-center gap-2 font-medium`}>
                    <span className="text-gray-700">Date:</span>
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="border-none outline-none text-sm bg-transparent"
                    />
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => {
                            setShowRecords(!showRecords);
                            if (!showRecords) fetchRecords();
                        }}
                        className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors text-sm font-medium"
                    >
                        {showRecords ? 'Hide Records' : 'View Records'}
                    </button>
                    <button
                        onClick={addCard}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors flex items-center gap-2 text-sm font-medium"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Add Salesman
                    </button>
                </div>
            </div>

            {loadingLookups && (
                <p className="text-center text-sm text-gray-400 mb-4">Loading...</p>
            )}

            {/* Records Display Section */}
            {showRecords && (
                <div className="mb-6">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">Saved Records</h3>
                            <div className="flex items-center gap-3">
                                <select
                                    value={filterType}
                                    onChange={(e) => setFilterType(e.target.value)}
                                    className="px-3 py-1.5 border border-gray-300 rounded-md text-sm"
                                >
                                    <option value="date">By Date</option>
                                    <option value="month">By Month</option>
                                </select>
                                {filterType === 'date' ? (
                                    <input
                                        type="date"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        className="px-3 py-1.5 border border-gray-300 rounded-md text-sm"
                                    />
                                ) : (
                                    <div className="flex gap-2">
                                        <select
                                            value={filterMonth}
                                            onChange={(e) => setFilterMonth(parseInt(e.target.value))}
                                            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm"
                                        >
                                            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                                <option key={m} value={m}>
                                                    {new Date(2000, m - 1).toLocaleString('default', { month: 'long' })}
                                                </option>
                                            ))}
                                        </select>
                                        <select
                                            value={filterYear}
                                            onChange={(e) => setFilterYear(parseInt(e.target.value))}
                                            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm"
                                        >
                                            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                                                <option key={y} value={y}>{y}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                <button
                                    onClick={fetchRecords}
                                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors"
                                >
                                    Filter
                                </button>
                            </div>
                        </div>
                        {renderRecordsTable()}
                    </div>
                </div>
            )}

            {/* ========== UPDATED: Edit Cards Section (separate from insert) ========== */}
            {editCards.length > 0 && (
                <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Editing Records</h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {editCards.map((card) => renderCard(card, true))}
                    </div>
                </div>
            )}

            {/* Insert Cards grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {cards.map((card) => renderCard(card, false))}
            </div>
        </div>
    );
}