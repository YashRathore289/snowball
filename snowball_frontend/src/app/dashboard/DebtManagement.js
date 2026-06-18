'use client'
import { useState, useEffect } from 'react';
import { postData } from '@/Services';

export default function DebtManagement() {
    const [salesmen, setSalesmen] = useState([]);
    const [debts, setDebts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedSalesman, setSelectedSalesman] = useState(null);
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'detail'
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [formData, setFormData] = useState({
        debtid: '',
        type: 'give',
        amount: '',
        debt_date: new Date().toISOString().split('T')[0]
    });
    const [summary, setSummary] = useState({
        totalGiven: 0,
        totalReceived: 0,
        remaining: 0
    });
    const [salesmanDebtSummary, setSalesmanDebtSummary] = useState({});

    // Fetch all salesmen with their debt summary
    const fetchSalesmen = async () => {
        setLoading(true);
        try {
            const result = await postData('employee/retrieve-salesman', {});
            if (result && result.status) {
                setSalesmen(result.data);
                // Fetch debt summary for all salesmen
                await fetchAllSalesmenDebtSummary(result.data);
            }
        } catch (error) {
            console.error('Error fetching salesmen:', error);
        } finally {
            setLoading(false);
        }
    };

    // Fetch debt summary for all salesmen
    const fetchAllSalesmenDebtSummary = async (salesmenList) => {
        try {
            const summaryData = {};
            for (const salesman of salesmenList) {
                const result = await postData('debt/retrieve-debts', { salesmanid: salesman.salesmanid });
                if (result && result.status) {
                    let totalGiven = 0;
                    let totalReceived = 0;
                    result.data.forEach(debt => {
                        const amount = parseFloat(debt.amount);
                        if (debt.type === 'give') {
                            totalGiven += amount;
                        } else if (debt.type === 'receive') {
                            totalReceived += amount;
                        }
                    });
                    summaryData[salesman.salesmanid] = {
                        totalGiven,
                        totalReceived,
                        remaining: totalGiven - totalReceived,
                        hasDebt: result.data.length > 0
                    };
                }
            }
            setSalesmanDebtSummary(summaryData);
        } catch (error) {
            console.error('Error fetching debt summaries:', error);
        }
    };

    // Fetch debts for a specific salesman
    const fetchSalesmanDebts = async (salesmanid) => {
        setLoading(true);
        try {
            const result = await postData('debt/retrieve-debts', { salesmanid });
            if (result && result.status) {
                setDebts(result.data);
                calculateSummary(result.data);
            }
        } catch (error) {
            console.error('Error fetching debts:', error);
        } finally {
            setLoading(false);
        }
    };

    // Calculate summary
    const calculateSummary = (debtData) => {
        let totalGiven = 0;
        let totalReceived = 0;

        debtData.forEach(debt => {
            const amount = parseFloat(debt.amount);
            if (debt.type === 'give') {
                totalGiven += amount;
            } else if (debt.type === 'receive') {
                totalReceived += amount;
            }
        });

        setSummary({
            totalGiven: totalGiven,
            totalReceived: totalReceived,
            remaining: totalGiven - totalReceived
        });
    };

    useEffect(() => {
        fetchSalesmen();
    }, []);

    // Handle salesman click
    const handleSalesmanClick = (salesman) => {
        setSelectedSalesman(salesman);
        setViewMode('detail');
        fetchSalesmanDebts(salesman.salesmanid);
    };

    // Handle back to list
    const handleBackToList = () => {
        setViewMode('list');
        setSelectedSalesman(null);
        setDebts([]);
        // Refresh the summary when coming back
        fetchAllSalesmenDebtSummary(salesmen);
    };

    // Handle Add Debt
    const handleAddDebt = (type) => {
        setFormData({
            debtid: '',
            type: type,
            amount: '',
            debt_date: new Date().toISOString().split('T')[0]
        });
        setIsEditMode(false);
        setIsModalOpen(true);
    };

    // Handle Edit
    const handleEditClick = (debt) => {
        setFormData({
            debtid: debt.debtid,
            type: debt.type,
            amount: debt.amount,
            debt_date: debt.debt_date
        });
        setIsEditMode(true);
        setIsModalOpen(true);
    };

    // Handle form input change
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Handle Save/Update
    const handleSave = async () => {
        try {
            let result;
            if (isEditMode) {
                // Update existing debt
                result = await postData('debt/update-debt', {
                    debtid: formData.debtid,
                    salesmanid: selectedSalesman.salesmanid,
                    type: formData.type,
                    debt_date: formData.debt_date,
                    amount: formData.amount
                });
                if (result && result.status) {
                    alert('Debt record updated successfully!');
                    setIsModalOpen(false);
                    fetchSalesmanDebts(selectedSalesman.salesmanid);
                    // Update summary in list
                    fetchAllSalesmenDebtSummary(salesmen);
                } else {
                    alert(result?.message || 'Failed to update');
                }
            } else {
                // Add new debt
                result = await postData('debt/insert-debt', {
                    salesmanid: selectedSalesman.salesmanid,
                    type: formData.type,
                    debt_date: formData.debt_date,
                    amount: formData.amount
                });
                if (result && result.status) {
                    alert('Debt record added successfully!');
                    setIsModalOpen(false);
                    fetchSalesmanDebts(selectedSalesman.salesmanid);
                    // Update summary in list
                    fetchAllSalesmenDebtSummary(salesmen);
                } else {
                    alert(result?.message || 'Failed to add');
                }
            }
        } catch (error) {
            console.error('Error saving debt:', error);
            alert('Error saving debt record');
        }
    };

    // Handle Delete
    const handleDelete = async (debtid) => {
        if (!confirm('Are you sure you want to delete this debt record?')) return;

        try {
            const result = await postData('debt/delete-debt', { debtid });
            if (result && result.status) {
                alert('Debt record deleted successfully!');
                fetchSalesmanDebts(selectedSalesman.salesmanid);
                // Update summary in list
                fetchAllSalesmenDebtSummary(salesmen);
            } else {
                alert(result?.message || 'Failed to delete');
            }
        } catch (error) {
            console.error('Error deleting debt:', error);
            alert('Error deleting debt record');
        }
    };

    // Render Modal
    const renderModal = () => {
        if (!isModalOpen) return null;

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden">
                    {/* Modal Header */}
                    <div className={`px-6 py-4 flex justify-between items-center ${formData.type === 'give' ? 'bg-gradient-to-r from-red-600 to-red-700' : 'bg-gradient-to-r from-green-600 to-green-700'}`}>
                        <div>
                            <h2 className="text-xl font-semibold text-white">
                                {isEditMode ? 'Edit Debt Record' : (formData.type === 'give' ? 'Give Debt' : 'Receive Debt')}
                            </h2>
                            <p className="text-sm text-white/80">{selectedSalesman?.fullname}</p>
                        </div>
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="text-white hover:text-gray-200 transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Modal Body */}
                    <div className="p-6">
                        <div className="space-y-4">
                            {/* Type Selection */}
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700">Type</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, type: 'give' }))}
                                        className={`px-4 py-2 rounded-lg border-2 transition-all ${formData.type === 'give'
                                            ? 'border-red-600 bg-red-50 text-red-700'
                                            : 'border-gray-300 hover:border-gray-400'
                                            }`}
                                    >
                                        Give Debt
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, type: 'receive' }))}
                                        className={`px-4 py-2 rounded-lg border-2 transition-all ${formData.type === 'receive'
                                            ? 'border-green-600 bg-green-50 text-green-700'
                                            : 'border-gray-300 hover:border-gray-400'
                                            }`}
                                    >
                                        Receive Debt
                                    </button>
                                </div>
                            </div>

                            {/* Amount */}
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700">Amount (₹)</label>
                                <input
                                    type="number"
                                    name="amount"
                                    value={formData.amount}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                    placeholder="Enter amount"
                                    step="0.01"
                                    min="0"
                                />
                            </div>

                            {/* Debt Date */}
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700">Date</label>
                                <input
                                    type="date"
                                    name="debt_date"
                                    value={formData.debt_date}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Modal Footer */}
                    <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className={`px-4 py-2 text-white rounded-lg transition-colors ${formData.type === 'give'
                                ? 'bg-red-600 hover:bg-red-700'
                                : 'bg-green-600 hover:bg-green-700'
                                }`}
                        >
                            {isEditMode ? 'Update' : (formData.type === 'give' ? 'Give Debt' : 'Receive Debt')}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // Render Salesman List with Debt Summary
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
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Salesman ID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mobile</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remaining</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {salesmen.map((salesman, index) => {
                                const summary = salesmanDebtSummary[salesman.salesmanid] || { totalGiven: 0, totalReceived: 0, remaining: 0, hasDebt: false };
                                return (
                                    <tr key={salesman.salesmanid} className={`hover:bg-gray-50 transition-colors ${summary.hasDebt ? 'bg-blue-50/30' : ''}`}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">#{salesman.salesmanid}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{salesman.fullname}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{salesman.mobileno}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">
                                            <span className={'text-orange-600'}>
                                                ₹{Math.abs(summary.remaining).toFixed(0)}
                                                {summary.remaining < 0 && ' (Extra)'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <button
                                                onClick={() => handleSalesmanClick(salesman)}
                                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                                            >
                                                {summary.hasDebt ? 'View Details' : 'Add Debt'}
                                            </button>
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

    // Render Debt Details
    const renderDebtDetails = () => {
        if (loading) {
            return (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            );
        }

        return (
            <div>
                {/* Header with Summary */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h2 className="text-2xl font-semibold text-gray-900">{selectedSalesman?.fullname}</h2>
                            <p className="text-sm text-gray-500">Mobile: {selectedSalesman?.mobileno}</p>
                        </div>
                        <button
                            onClick={handleBackToList}
                            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Back
                        </button>
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <p className="text-sm text-gray-600">Total Given</p>
                            <p className="text-2xl font-bold text-red-600">₹{summary.totalGiven.toFixed(2)}</p>
                        </div>
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <p className="text-sm text-gray-600">Total Received</p>
                            <p className="text-2xl font-bold text-green-600">₹{summary.totalReceived.toFixed(2)}</p>
                        </div>
                        <div className={`border rounded-lg p-4 ${summary.remaining >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'}`}>
                            <p className="text-sm text-gray-600">Remaining</p>
                            <p className={`text-2xl font-bold ${summary.remaining >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                                ₹{Math.abs(summary.remaining).toFixed(2)}
                                {summary.remaining < 0 && ' (Extra Received)'}
                            </p>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 mt-4">
                        <button
                            onClick={() => handleAddDebt('give')}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            Give Debt
                        </button>
                        <button
                            onClick={() => handleAddDebt('receive')}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" />
                            </svg>
                            Receive Debt
                        </button>
                    </div>
                </div>

                {/* Debt Table */}
                {debts.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                        <p className="text-gray-500">No debt records found for this salesman</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">S.No</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Debt ID</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {debts.map((debt, index) => (
                                        <tr key={debt.debtid} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">#{debt.debtid}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{debt.debt_date}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${debt.type === 'give'
                                                    ? 'bg-red-100 text-red-700'
                                                    : 'bg-green-100 text-green-700'
                                                    }`}>
                                                    {debt.type === 'give' ? 'Given' : 'Received'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">
                                                <span className={debt.type === 'give' ? 'text-red-600' : 'text-green-600'}>
                                                    ₹{parseFloat(debt.amount).toFixed(2)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleEditClick(debt)}
                                                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg transition-colors"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(debt.debtid)}
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
                    </div>
                )}
            </div>
        );
    };

    return (
        <div>
            <div className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900">Debt Management</h2>
                <p className="text-sm text-gray-500 mt-1">
                    {viewMode === 'list' ? 'View all salesmen with their debt summary' : `Managing debts for ${selectedSalesman?.fullname}`}
                </p>
            </div>

            {viewMode === 'list' ? renderSalesmanList() : renderDebtDetails()}

            {/* Render Modal */}
            {renderModal()}
        </div>
    );
}