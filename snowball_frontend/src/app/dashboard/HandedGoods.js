'use client'
import { useState, useEffect, useRef } from 'react';
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
        batteries: [],
        rows: [emptyRow()],
        returnExpr: '',
        commission: '',
        saving: false,
        saved: false,
        editMode: false,
        handedgoodsid: null,
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

export default function HandedGoodsManagement() {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [salesmen, setSalesmen] = useState([]);
    const [products, setProducts] = useState([]);
    const [batteryOptions, setBatteryOptions] = useState([]);
    const [cards, setCards] = useState([newCard(1)]);
    const [editCards, setEditCards] = useState([]);
    const [loadingLookups, setLoadingLookups] = useState(false);
    const [showRecords, setShowRecords] = useState(false);
    const [records, setRecords] = useState([]);
    const [filterType, setFilterType] = useState('date');
    const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
    const [filterYear, setFilterYear] = useState(new Date().getFullYear());
    const [loadingRecords, setLoadingRecords] = useState(false);
    const [assignedBatteries, setAssignedBatteries] = useState([]);

    // ---------- lookups ----------

    const fetchSalesmen = async () => {
        try {
            const result = await postData('employee/retrieve-salesmen-without-attendance', { date });
            if (result && result.status) {
                // Preserve current selections by keeping the old salesman data
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

    const fetchBatteries = async () => {
        try {
            const result = await postData('battery/retrieve-batteries', {});
            if (result && result.status) {
                const batteryNames = result.data.map(b => b.batteryname);
                setBatteryOptions(batteryNames);
            }
        } catch (error) {
            console.error('Error fetching batteries:', error);
        }
    };

    const fetchAssignedBatteries = async () => {
        try {
            const result = await postData('handedgoods/retrieve-handed-goods', {});
            if (result && result.status) {
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
    };

    // ---------- Fetch all lookups ----------
    const fetchAllLookups = async () => {
        setLoadingLookups(true);
        try {
            await Promise.all([fetchSalesmen(), fetchProducts(), fetchBatteries(), fetchAssignedBatteries()]);
        } catch (error) {
            console.error('Error fetching lookups:', error);
        } finally {
            setLoadingLookups(false);
        }
    };

    useEffect(() => {
        fetchAllLookups();
    }, [date]);

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

    useEffect(() => {
        if (showRecords) {
            fetchRecords();
        }
    }, [filterType, date, filterMonth, filterYear]);

    // ---------- Edit Record ----------
    const handleEditRecord = (record) => {
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
        })) || [emptyRow()];
        newCardData.returnExpr = String(record.returnamt || '');
        newCardData.commission = String(record.commission || '');
        newCardData.editMode = true;
        newCardData.handedgoodsid = record.handedgoodsid;
        newCardData.saved = false;
        newCardData.isUpdateMode = true;

        setEditCards([newCardData]);
        setShowRecords(false);
    };

    // ---------- Delete Record ----------

    const handleDeleteRecord = async (handedgoodsid) => {
        if (!confirm('Are you sure you want to delete this record?')) return;

        try {
            const result = await postData('handedgoods/delete-handed-goods', { handedgoodsid });
            if (result && result.status) {
                alert('Record deleted successfully!');
                await fetchRecords();
                await fetchAssignedBatteries();
                // Don't refetch salesmen here to preserve selections
            } else {
                alert(result?.message || 'Failed to delete');
            }
        } catch (error) {
            console.error('Error deleting record:', error);
            alert('Error deleting record');
        }
    };

    // ---------- card-level mutators ----------

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

        // If salesman not found and salesmanid is not empty, clear the selection
        if (!salesman && salesmanid) {
            alert('Selected salesman is no longer available. Please select another.');
            updateCard(cardid, {
                salesmanid: '',
                salesmanName: '',
                salesmanLocked: false,
            }, isEdit);
            return;
        }

        updateCard(cardid, {
            salesmanid,
            salesmanName: salesman ? salesman.fullname : '',
            salesmanLocked: !!salesmanid,
        }, isEdit);
    };

    const handleBatteryToggle = (cardid, battery, isEdit = false) => {
        const card = (isEdit ? editCards : cards).find(c => c.cardid === cardid);
        if (!card) return;

        let newBatteries = [...card.batteries];
        if (newBatteries.includes(battery)) {
            newBatteries = newBatteries.filter(b => b !== battery);
        } else {
            if (assignedBatteries.includes(battery)) {
                alert(`Battery ${battery} is already assigned to someone else!`);
                return;
            }
            newBatteries.push(battery);
        }

        updateCard(cardid, { batteries: newBatteries, saved: false }, isEdit);
    };

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
        if (editCards.length > 0) {
            alert('Please close the edit mode first');
            return;
        }
        setCards((prev) => [...prev, newCard(prev.length + 1)]);
        fetchSalesmen();
    };

    const removeCard = (cardid, isEdit = false) => {
        if (!confirm('Are you sure you want to remove this card? All unsaved data will be lost.')) {
            return;
        }

        if (isEdit) {
            setEditCards([]);
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

    const getFinalAmount = (card) => {
        const itemsTotal = cardItemsTotal(card);
        const returnVal = getReturnValue(card) || 0;
        const commissionVal = parseFloat(card.commission) || 0;
        const total = itemsTotal - returnVal;
        if (card.commission === '' || card.commission === null || card.commission === undefined) {
            return null;
        }
        return Math.round((total - commissionVal) * 100) / 100;
    };

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
            details: JSON.stringify({
                batteries: card.batteries || [],
                items: validRows.map((r) => ({
                    productid: r.productid,
                    productname: r.productname,
                    qty: parseFloat(r.qty),
                    price: parseFloat(r.price),
                    total: rowTotal(r),
                }))
            }),
            returnamt: returnVal,
            commission: parseFloat(card.commission) || 0,
            finalamount: finalAmount,
        };

        const isUpdate = card.handedgoodsid || card.isUpdateMode || card.editMode;

        if (isUpdate && card.handedgoodsid) {
            payload.handedgoodsid = card.handedgoodsid;
        }

        updateCard(card.cardid, { saving: true }, isEdit);
        try {
            const endpoint = isUpdate ? 'handedgoods/update-handed-goods' : 'handedgoods/insert-handed-goods';
            const result = await postData(endpoint, payload);
            if (result && result.status) {
                alert(isUpdate ? 'Record updated successfully!' : 'Record saved successfully!');

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
                }, isEdit);

                // Refresh only non-salesman data after save
                await Promise.all([
                    fetchAssignedBatteries(),
                    showRecords ? fetchRecords() : null
                ]);

                if (isEdit) {
                    setTimeout(() => {
                        setEditCards([]);
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

    // ---------- Battery Dropdown Component ----------
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
                    className="flex items-center justify-between bg-white border border-gray-300 rounded-md px-3 py-1.5 text-sm cursor-pointer hover:border-blue-500 transition-colors min-w-[200px]"
                >
                    <span className="text-gray-700">
                        {selectedCount > 0 ? (
                            <span className="flex items-center gap-1 flex-wrap">
                                {card.batteries.slice(0, 2).map((b, i) => (
                                    <span key={i} className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-xs">
                                        {b}
                                    </span>
                                ))}
                                {selectedCount > 2 && (
                                    <span className="text-xs text-gray-500">+{selectedCount - 2} more</span>
                                )}
                            </span>
                        ) : (
                            <span className="text-gray-400">Select batteries...</span>
                        )}
                    </span>
                    <svg
                        className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
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
                                    <div
                                        key={battery}
                                        onClick={() => {
                                            if (!isDisabled) {
                                                handleBatteryToggle(card.cardid, battery, isEdit);
                                            }
                                        }}
                                        className={`flex items-center px-3 py-2 cursor-pointer hover:bg-blue-50 transition-colors ${isSelected ? 'bg-blue-50' : ''
                                            } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            disabled={isDisabled}
                                            onChange={() => { }}
                                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                        />
                                        <span className={`ml-2 text-sm ${isSelected ? 'font-medium text-gray-900' : 'text-gray-700'}`}>
                                            {battery}
                                        </span>
                                        {isAssigned && !isSelected && (
                                            <span className="ml-2 text-xs text-red-500">(Assigned)</span>
                                        )}
                                        {isSelected && (
                                            <span className="ml-auto text-blue-600 text-xs">✓</span>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}
            </div>
        );
    };

    // ---------- Render Card ----------
    const renderCard = (card, isEdit = false) => {
        const cardList = isEdit ? editCards : cards;
        const otherSelectedSalesmanIds = new Set(
            [...cards, ...editCards]
                .filter((c) => c.cardid !== card.cardid && c.salesmanid)
                .map((c) => String(c.salesmanid))
        );

        const availableSalesmen = salesmen.filter(
            (s) => !otherSelectedSalesmanIds.has(String(s.salesmanid))
        );
        return (
            <div key={card.cardid} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 relative">
                {!isEdit && !card.editMode && (
                    <button
                        onClick={() => removeCard(card.cardid, isEdit)}
                        title="Remove card"
                        className="absolute -top-2 -right-2 w-6 h-6 rounded-full border border-gray-300 text-gray-500 text-xs flex items-center justify-center hover:bg-red-50 hover:border-red-400 hover:text-red-500 bg-white transition-colors"
                    >
                        ×
                    </button>
                )}

                {isEdit && (
                    <button
                        onClick={() => {
                            if (confirm('Are you sure you want to cancel editing? All changes will be lost.')) {
                                setEditCards([]);
                            }
                        }}
                        title="Close edit"
                        className="absolute -top-2 -right-2 w-6 h-6 rounded-full border border-gray-300 text-gray-500 text-xs flex items-center justify-center hover:bg-red-50 hover:border-red-400 hover:text-red-500 bg-white transition-colors"
                    >
                        ×
                    </button>
                )}

                {card.editMode && (
                    <span className="absolute top-2 right-8 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                        Edit Mode
                    </span>
                )}

                {card.isUpdateMode && !card.editMode && card.handedgoodsid && card.saved && (
                    <span className="absolute top-2 right-8 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        ✓ Saved
                    </span>
                )}

                <div className={`${inputBase} inline-block mb-3 font-medium bg-gray-50`}>
                    <div className="flex items-center gap-2">
                        <span className="text-gray-700">#{card.serial} -</span>
                        <select
                            value={card.salesmanid || ''}
                            onChange={(e) =>
                                handleSelectSalesman(card.cardid, e.target.value, isEdit)
                            }
                            className="border-none outline-none text-sm bg-transparent"
                        >
                            <option value="">Select salesman</option>
                            {availableSalesmen.map((s) => (
                                <option key={s.salesmanid} value={s.salesmanid}>
                                    {s.fullname}
                                </option>
                            ))}
                            {card.salesmanid && !salesmen.find(s => String(s.salesmanid) === String(card.salesmanid)) && (
                                <option value={card.salesmanid} disabled>
                                    {card.salesmanName || 'Unavailable'} (Not Available)
                                </option>
                            )}
                        </select>
                        {card.salesmanLocked && <><span className="text-sm font-medium text-gray-700">Batteries:</span>
                        <BatteryDropdown card={card} isEdit={isEdit} /></>}
                    </div>
                </div>

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

                        <div className="flex items-center justify-end gap-2 pt-1 border-t border-gray-100 pr-17">
                            <span className="text-sm font-medium text-gray-700">Items Total:</span>
                            <div className={`${inputBase} w-20 text-end bg-gray-50 font-medium`}>
                                ₹{cardItemsTotal(card).toFixed(0)}
                            </div>
                        </div>

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

                        <div className="flex items-center justify-end gap-2 pt-1 border-t border-gray-100 pr-17">
                            <span className="text-sm font-medium text-gray-700">Total:</span>
                            <div className={`${inputBase} w-20 text-end bg-gray-50 font-medium`}>
                                ₹{(cardItemsTotal(card) - (getReturnValue(card) || 0)).toFixed(0)}
                            </div>
                        </div>

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
                                    <span className="text-gray-400 text-sm">0</span>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end pt-2 pr-17">
                            <button
                                onClick={() => handleSave(card, isEdit)}
                                disabled={card.saving}
                                className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${card.saved
                                    ? 'bg-green-100 text-green-700 border border-green-300 cursor-default'
                                    : (card.editMode || card.isUpdateMode || card.handedgoodsid)
                                        ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                                    } ${card.saving ? 'opacity-60 cursor-not-allowed' : ''}`}
                            >
                                {card.saving
                                    ? 'Saving...'
                                    : card.saved
                                        ? '✓ Saved'
                                        : (card.editMode || card.isUpdateMode || card.handedgoodsid)
                                            ? 'Update Record'
                                            : 'Save Record'}
                            </button>
                            {card.editMode && card.saved && (
                                <button
                                    onClick={() => {
                                        setEditCards([]);
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
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Batteries</th>
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
                                    {record.details?.batteries?.length > 0 ? record.details.batteries.join(', ') : '-'}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-500">
                                    {record.details?.items?.length || 0} items
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
                            onClick={() => {
                                if (confirm('Are you sure you want to cancel editing? All changes will be lost.')) {
                                    setEditCards([]);
                                }
                            }}
                            className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md text-sm transition-colors"
                        >
                            Cancel Edit
                        </button>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {editCards.map((card) => renderCard(card, true))}
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {cards.map((card) => renderCard(card, false))}
                </div>
            )}
        </div>
    );
}