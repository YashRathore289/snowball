'use client'
import { useState, useEffect, useCallback, useMemo } from 'react';
import { postData } from '@/Services';
import { saveCache, getCache } from './ComponentCache';

export default function AccountManagement({ cacheKey }) {
    // Restore from cache if available
    const cachedData = cacheKey ? getCache(cacheKey) : null;

    const [salesmen, setSalesmen] = useState(cachedData?.salesmen || []);
    const [loading, setLoading] = useState(!cachedData);
    const [selectedSalesman, setSelectedSalesman] = useState(cachedData?.selectedSalesman || null);
    const [viewMode, setViewMode] = useState(cachedData?.viewMode || 'list');
    const [entries, setEntries] = useState(cachedData?.entries || []);
    const [returnAmount, setReturnAmount] = useState(cachedData?.returnAmount || '');
    const [commissionAmount, setCommissionAmount] = useState(cachedData?.commissionAmount || '');

    // Fetch all salesmen with summary
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
        if (!cachedData) {
            fetchSalesmen();
        }
    }, [fetchSalesmen, cachedData]);

    // Fetch salesman details (entries)
    const fetchSalesmanEntries = useCallback(async (salesmanid) => {
        setLoading(true);
        try {
            const result = await postData('handedgoods/retrieve-salesman-entries', { salesmanid });
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
        fetchSalesmanEntries(salesman.salesmanid);
    }, [fetchSalesmanEntries]);

    const handleBack = useCallback(() => {
        setViewMode('list');
        setSelectedSalesman(null);
        setEntries([]);
        fetchSalesmen();
    }, [fetchSalesmen]);

    // Save state to cache before unmounting
    useEffect(() => {
        return () => {
            if (cacheKey) {
                saveCache(cacheKey, {
                    salesmen,
                    loading: false,
                    selectedSalesman,
                    viewMode,
                    entries,
                    returnAmount,
                    commissionAmount,
                });
            }
        };
    }, [cacheKey, salesmen, loading, selectedSalesman, viewMode, entries, returnAmount, commissionAmount]);

    // Calculations
    const totals = useMemo(() => {
        let totalItemAmount = 0;
        let totalSubmitAmount = 0;
        let isCleared = false;

        entries.forEach(entry => {
            totalItemAmount += parseFloat(entry.item_total) || 0;
            totalSubmitAmount += parseFloat(entry.submit_amount) || 0;
            if (entry.clear_status === 1) isCleared = true;
        });

        return { totalItemAmount, totalSubmitAmount, isCleared };
    }, [entries]);

    const afterReturn = totals.totalItemAmount - (parseFloat(returnAmount) || 0);
    const afterCommission = afterReturn - (parseFloat(commissionAmount) || 0);
    const finalBalance = afterCommission - totals.totalSubmitAmount;

    // Save settlement to database
    const handleSaveSettlement = useCallback(async () => {
        if (!selectedSalesman) return;

        try {
            const result = await postData('handedgoods/save-settlement', {
                salesmanid: selectedSalesman.salesmanid,
                total_item_amount: totals.totalItemAmount,
                return_amount: parseFloat(returnAmount) || 0,
                after_return: afterReturn,
                commission_amount: parseFloat(commissionAmount) || 0,
                after_commission: afterCommission,
                final_balance: finalBalance
            });

            if (result?.status) {
                alert('Settlement saved successfully!');
            } else {
                alert(result?.message || 'Failed to save settlement');
            }
        } catch (error) {
            console.error('Error saving settlement:', error);
            alert('Error saving settlement');
        }
    }, [selectedSalesman, totals.totalItemAmount, returnAmount, afterReturn, commissionAmount, afterCommission, finalBalance]);

    // ---------- RENDER SALESMAN LIST ----------
    const renderSalesmanList = () => {
        if (loading) {
            return (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            );
        }

        if (salesmen.length === 0) {
            return (
                <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                    <p className="text-gray-500">No salesmen found</p>
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
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Salesman Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mobile</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Item Total</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Submit</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {salesmen.map((salesman, index) => (
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
                                        {salesman.has_cleared ? (
                                            <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">Cleared</span>
                                        ) : (
                                            <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded-full">Pending</span>
                                        )}
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
                {/* Back Button & Info */}
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

                {/* Entries Table */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Item Total</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Submit Amount</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Clear</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {entries.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="px-4 py-6 text-center text-sm text-gray-500">No entries found</td>
                                    </tr>
                                ) : (
                                    entries.map((entry, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50 transition-colors">
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
                            {/* Totals Row */}
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

                {/* Calculation Section - Only show if clear_status is 1 */}
                {totals.isCleared && (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Settlement Calculation</h3>

                        <div className="space-y-3 max-w-lg">
                            {/* Line 1: Total Item Amount */}
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <span className="text-sm font-medium text-gray-700">1. Total Item Amount</span>
                                <span className="text-lg font-bold text-blue-600">₹{totals.totalItemAmount.toFixed(0)}</span>
                            </div>

                            {/* Line 2: Return Amount Input */}
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <span className="text-sm font-medium text-gray-700">2. Return Amount</span>
                                <input
                                    type="text"
                                    inputMode='numeric'
                                    value={returnAmount}
                                    onChange={(e) => setReturnAmount(e.target.value)}
                                    placeholder="Enter return amount"
                                    className="w-40 px-3 py-2 border border-gray-300 rounded-lg text-sm placeholder:text-center text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            {/* Line 3: After Return */}
                            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                                <span className="text-sm font-medium text-gray-700">3. After Return</span>
                                <span className="text-lg font-bold text-blue-600">₹{afterReturn.toFixed(0)}</span>
                            </div>

                            {/* Line 4: Commission Input */}
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <span className="text-sm font-medium text-gray-700">4. Commission Amount</span>
                                <input
                                    type="text"
                                    inputMode='numeric'
                                    value={commissionAmount}
                                    onChange={(e) => setCommissionAmount(e.target.value)}
                                    placeholder="Enter commission"
                                    className="w-40 px-3 py-2 border border-gray-300 placeholder:text-center rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            {/* Line 5: After Commission */}
                            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                                <span className="text-sm font-medium text-gray-700">5. After Commission</span>
                                <span className="text-lg font-bold text-blue-600">₹{afterCommission.toFixed(0)}</span>
                            </div>

                            {/* Line 6: Final Balance */}
                            <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                                <span className="text-sm font-bold text-gray-700">6. Final Balance</span>
                                <span className={`text-xl font-bold ${finalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    ₹{finalBalance.toFixed(0)}
                                </span>
                            </div>

                            {/* Save Settlement Button */}
                            <div className="flex justify-end pt-4">
                                <button
                                    onClick={handleSaveSettlement}
                                    className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors text-sm font-medium cursor-pointer"
                                >
                                    Save Settlement
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div>
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