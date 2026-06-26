'use client'
import { useState, useEffect, useCallback, useMemo } from 'react';
import { postData } from '@/Services';
import { saveCache, getCache, clearCache } from './ComponentCache';

// Expression evaluator (same as HandedGoods)
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

export default function AccountManagement({ cacheKey }) {
    const cachedData = cacheKey ? getCache(cacheKey) : null;

    const [salesmen, setSalesmen] = useState(cachedData?.salesmen || []);
    const [loading, setLoading] = useState(!cachedData);
    const [selectedSalesman, setSelectedSalesman] = useState(cachedData?.selectedSalesman || null);
    const [viewMode, setViewMode] = useState(cachedData?.viewMode || 'list');
    const [entries, setEntries] = useState(cachedData?.entries || []);
    const [returnAmount, setReturnAmount] = useState(cachedData?.returnAmount || '');
    const [commissionAmount, setCommissionAmount] = useState(cachedData?.commissionAmount || '');
    const [saving, setSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState(''); // 👈 NEW

    // Date filter states
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

    // Toast state
    const [toastMessage, setToastMessage] = useState('');
    const [toastVisible, setToastVisible] = useState(false);

    useEffect(() => {
        if (!toastVisible) return;
        const timer = setTimeout(() => setToastVisible(false), 5000);
        return () => clearTimeout(timer);
    }, [toastVisible]);

    const showToast = useCallback((msg) => {
        setToastMessage(msg);
        setToastVisible(true);
    }, []);

    // 👈 NEW: Filtered salesmen - hide if cleared (total_items = 0 and has_cleared = 1)
    const filteredSalesmen = useMemo(() => {
        let filtered = salesmen;
        
        // Filter by search term
        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(s => 
                s.fullname?.toLowerCase().includes(term) || 
                s.mobileno?.includes(term)
            );
        }
        
        // Hide salesmen with no pending items (cleared and 0 total)
        filtered = filtered.filter(s => 
            !(parseFloat(s.total_items) === 0 && s.has_cleared === 1)
        );
        
        return filtered;
    }, [salesmen, searchTerm]);

    const fetchSalesmen = useCallback(async () => {
        setLoading(true);
        try {
            const result = await postData('handedgoods/retrieve-account-summary', {});
            if (result?.status) {
                setSalesmen(result.data);
            }
        } catch (error) {
            console.error('Error fetching salesmen:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (salesmen.length === 0 || !cachedData) {
            fetchSalesmen();
        }
    }, []);

    const fetchSalesmanEntries = useCallback(async (salesmanid, from_date = '', to_date = '') => {
        setLoading(true);
        try {
            const payload = { salesmanid };
            if (from_date && to_date) {
                payload.from_date = from_date;
                payload.to_date = to_date;
            }
            const result = await postData('handedgoods/retrieve-salesman-entries', payload);
            if (result?.status) {
                setEntries(result.data);
                setReturnAmount('');
                setCommissionAmount('');
            }
        } catch (error) {
            console.error('Error fetching entries:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleSalesmanClick = useCallback((salesman) => {
        setSelectedSalesman(salesman);
        setViewMode('detail');
        setFromDate('');
        setToDate('');
        fetchSalesmanEntries(salesman.salesmanid);
    }, [fetchSalesmanEntries]);

    const handleBack = useCallback(() => {
        setViewMode('list');
        setSelectedSalesman(null);
        setEntries([]);
        fetchSalesmen(); // 👈 Refresh list when going back
    }, [fetchSalesmen]);

    const handleDateFilter = useCallback(() => {
        if (selectedSalesman && fromDate && toDate) {
            fetchSalesmanEntries(selectedSalesman.salesmanid, fromDate, toDate);
        }
    }, [selectedSalesman, fromDate, toDate, fetchSalesmanEntries]);

    useEffect(() => {
        return () => {
            if (cacheKey) {
                saveCache(cacheKey, {
                    salesmen, selectedSalesman, viewMode, entries, returnAmount, commissionAmount,
                });
            }
        };
    }, [cacheKey, salesmen, selectedSalesman, viewMode, entries, returnAmount, commissionAmount]);

    const totals = useMemo(() => {
        let totalItemAmount = 0;
        let totalSubmitAmount = 0;
        let hasClearedEntry = false;

        entries.forEach(entry => {
            totalItemAmount += parseFloat(entry.item_total) || 0;
            totalSubmitAmount += parseFloat(entry.submit_amount) || 0;
            if (entry.clear_status === 1) hasClearedEntry = true;
        });

        return { totalItemAmount, totalSubmitAmount, hasClearedEntry };
    }, [entries]);

    // Evaluate return amount expression
    const returnValue = useMemo(() => {
        const val = evaluateExpression(returnAmount);
        return val !== null ? val : 0;
    }, [returnAmount]);

    const afterReturn = totals.totalItemAmount - returnValue;
    
    // 👈 CHANGED: Auto-calculate commission as 1% of afterReturn if not manually entered
    const commissionValue = useMemo(() => {
        if (commissionAmount !== '') {
            return parseFloat(commissionAmount) || 0;
        }
        // Auto-calculate 1% of afterReturn
        return Math.round(afterReturn * 1) / 100;
    }, [commissionAmount, afterReturn]);
    
    const afterCommission = afterReturn - commissionValue;
    const finalBalance = afterCommission - totals.totalSubmitAmount;

    const handleSaveSettlement = useCallback(async () => {
        if (!selectedSalesman) return;
        setSaving(true);
        try {
            const result = await postData('handedgoods/save-settlement', {
                salesmanid: selectedSalesman.salesmanid,
                total_item_amount: totals.totalItemAmount,
                return_amount: returnValue,
                after_return: afterReturn,
                commission_amount: commissionValue,
                after_commission: afterCommission,
                final_balance: finalBalance
            });

            if (result?.status) {
                clearCache(cacheKey);
                showToast('Settlement saved successfully!');
                fetchSalesmen();
                if (fromDate && toDate) {
                    fetchSalesmanEntries(selectedSalesman.salesmanid, fromDate, toDate);
                } else {
                    fetchSalesmanEntries(selectedSalesman.salesmanid);
                }
            } else {
                showToast(result?.message || 'Failed to save settlement');
            }
        } catch (error) {
            console.error('Error saving settlement:', error);
            showToast('Error saving settlement');
        } finally {
            setSaving(false);
        }
    }, [selectedSalesman, totals.totalItemAmount, returnValue, afterReturn, commissionValue, afterCommission, finalBalance, showToast, fetchSalesmen, fetchSalesmanEntries, fromDate, toDate]);

    // ---------- RENDER SALESMAN LIST ----------
    const renderSalesmanList = () => {
        if (loading) {
            return (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            );
        }

        return (
            <div>
                {/* 👈 NEW: Search Bar */}
                <div className="mb-4">
                    <input
                        type="text"
                        placeholder="Search salesman by name or mobile..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                {filteredSalesmen.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                        <p className="text-gray-500">{searchTerm ? 'No salesmen match your search' : 'No pending accounts found'}</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-black uppercase tracking-wider">S.No</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-black uppercase tracking-wider">Salesman Name</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-black uppercase tracking-wider">Mobile</th>
                                        <th className="px-6 py-3 text-right text-xs font-bold text-black uppercase tracking-wider">Item Total</th>
                                        <th className="px-6 py-3 text-right text-xs font-bold text-black uppercase tracking-wider">Total Submit</th>
                                        <th className="px-6 py-3 text-center text-xs font-bold text-black uppercase tracking-wider">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredSalesmen.map((salesman, index) => (
                                        <tr key={salesman.salesmanid} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{salesman.fullname}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{salesman.mobileno}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-blue-600 text-right">
                                                ₹{parseFloat(salesman.total_items || 0).toFixed(0)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600 text-right">
                                                ₹{parseFloat(salesman.total_submit || 0).toFixed(0)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                                                <button
                                                    onClick={() => handleSalesmanClick(salesman)}
                                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm cursor-pointer"
                                                >
                                                    View Details
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // ---------- RENDER SALESMAN DETAILS ----------
    const renderSalesmanDetails = () => {
        if (loading) {
            return (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            );
        }

        return (
            <div>
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-xl font-semibold text-gray-900">{selectedSalesman?.fullname}</h3>
                        <p className="text-sm text-gray-500">Mobile: {selectedSalesman?.mobileno}</p>
                    </div>
                    <button
                        onClick={handleBack}
                        className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                    >
                        ← Back
                    </button>
                </div>

                {/* Date Filter */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-700">Date Filter:</span>
                        <input
                            type="date"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm cursor-pointer"
                        />
                        <span className="text-sm text-gray-500">to</span>
                        <input
                            type="date"
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm cursor-pointer"
                        />
                        <button
                            onClick={handleDateFilter}
                            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm cursor-pointer"
                        >
                            Apply Filter
                        </button>
                    </div>
                </div>

                {/* Entries Table */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs text-black uppercase tracking-wider font-extrabold">Date</th>
                                    <th className="px-4 py-3 text-right text-xs text-black uppercase tracking-wider font-extrabold">Item Total</th>
                                    <th className="px-4 py-3 text-right text-xs text-black uppercase tracking-wider font-extrabold">Submit Amount</th>
                                    <th className="px-4 py-3 text-center text-xs text-black uppercase tracking-wider font-extrabold">Clear</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {entries.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="px-4 py-6 text-center text-sm text-gray-500">No entries found</td>
                                    </tr>
                                ) : (
                                    entries.map((entry, idx) => (
                                        <tr key={idx} className={`hover:bg-gray-50 transition-colors ${entry.clear_status === 1 ? 'opacity-50' : ''}`}>
                                            <td className="px-4 py-3 text-sm text-gray-900">{entry.date}</td>
                                            <td className="px-4 py-3 text-sm font-semibold text-blue-600 text-right">
                                                ₹{parseFloat(entry.item_total || 0).toFixed(0)}
                                            </td>
                                            <td className="px-4 py-3 text-sm font-semibold text-green-600 text-right">
                                                ₹{parseFloat(entry.submit_amount || 0).toFixed(0)}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-center">
                                                {entry.clear_status === 1 ? '✅' : '❌'}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                            {entries.length > 0 && (
                                <tfoot className="bg-gray-50 font-semibold">
                                    <tr>
                                        <td className="px-4 py-3 text-sm text-gray-900">Total</td>
                                        <td className="px-4 py-3 text-sm text-blue-700 text-right">
                                            ₹{totals.totalItemAmount.toFixed(0)}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-green-700 text-right">
                                            ₹{totals.totalSubmitAmount.toFixed(0)}
                                        </td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                </div>

                {/* Settlement Calculation - ALWAYS SHOW */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Settlement Calculation</h3>

                    <div className="space-y-3 max-w-lg">
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <span className="text-sm font-medium text-gray-700">1. Total Item Amount</span>
                            <span className="text-lg font-bold text-blue-600">₹{totals.totalItemAmount.toFixed(0)}</span>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <span className="text-sm font-medium text-gray-700">2. Return Amount</span>
                            <input
                                type="text"
                                value={returnAmount}
                                onChange={(e) => setReturnAmount(e.target.value)}
                                placeholder="e.g., 80+74+90"
                                className="w-40 px-3 py-2 border border-gray-300 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                            <span className="text-sm font-medium text-gray-700">3. After Return</span>
                            <span className="text-lg font-bold text-blue-600">₹{afterReturn.toFixed(0)}</span>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <span className="text-sm font-medium text-gray-700">4. Commission (1% auto)</span>
                            <input
                                type="text" inputMode='numeric'
                                value={commissionAmount}
                                onChange={(e) => setCommissionAmount(e.target.value)}
                                placeholder={Math.round(afterReturn * 1 / 100).toString()}
                                className="w-40 px-3 py-2 border border-gray-300 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                            <span className="text-sm font-medium text-gray-700">5. After Commission</span>
                            <span className="text-lg font-bold text-blue-600">₹{afterCommission.toFixed(0)}</span>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                            <span className="text-sm font-bold text-gray-700">6. Final Balance</span>
                            <span className={`text-xl font-bold ${finalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                ₹{finalBalance.toFixed(0)}
                            </span>
                        </div>

                        <div className="flex justify-end pt-4">
                            <button
                                onClick={handleSaveSettlement}
                                disabled={saving}
                                className={`px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors text-sm font-medium cursor-pointer ${saving ? 'opacity-60 cursor-not-allowed' : ''}`}
                            >
                                {saving ? 'Saving...' : 'Save Settlement'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div>
            {toastVisible && (
                <div className="fixed top-4 right-4 z-50 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3">
                    <span>{toastMessage}</span>
                    <button onClick={() => setToastVisible(false)} className="text-white hover:text-gray-200 font-bold text-lg leading-none cursor-pointer">×</button>
                </div>
            )}

            <div className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900">Account Management</h2>
                <p className="text-sm text-gray-500 mt-1">
                    {viewMode === 'list' ? 'View all salesmen accounts' : `Managing account for ${selectedSalesman?.fullname}`}
                </p>
            </div>

            {viewMode === 'list' ? renderSalesmanList() : renderSalesmanDetails()}
        </div>
    );
}