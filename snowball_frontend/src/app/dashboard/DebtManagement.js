'use client'
import { useState, useEffect, useCallback, useMemo } from 'react';
import { postData } from '@/Services';
import { saveCache, getCache } from './ComponentCache';

export default function DebtManagement({ cacheKey }) {
  // Restore from cache if available
  const cachedData = cacheKey ? getCache(cacheKey) : null;

  const [salesmen, setSalesmen] = useState(cachedData?.salesmen || []);
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(!cachedData);
  const [selectedSalesman, setSelectedSalesman] = useState(null);
  const [viewMode, setViewMode] = useState('list');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState({
    debtid: '',
    type: 'give',
    amount: '',
    debt_date: new Date().toISOString().split('T')[0]
  });
  const [salesmanDebtSummary, setSalesmanDebtSummary] = useState(cachedData?.salesmanDebtSummary || {});

  // Toast & Confirmation popup states
  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmAction, setConfirmAction] = useState(null);

  // Auto-dismiss toast
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

  // Derived overall summary from salesmen debt data
  const overallSummary = useMemo(() => {
    let totalGiven = 0;
    let totalReceived = 0;
    Object.values(salesmanDebtSummary).forEach(sum => {
      totalGiven += sum.totalGiven || 0;
      totalReceived += sum.totalReceived || 0;
    });
    return {
      totalGiven,
      totalReceived,
      totalRemaining: totalGiven - totalReceived,
    };
  }, [salesmanDebtSummary]);

  // Derived summary for selected salesman's debts
  const summary = useMemo(() => {
    let totalGiven = 0;
    let totalReceived = 0;
    debts.forEach(debt => {
      const amount = parseFloat(debt.amount) || 0;
      if (debt.type === 'give') totalGiven += amount;
      else if (debt.type === 'receive') totalReceived += amount;
    });
    return {
      totalGiven,
      totalReceived,
      remaining: totalGiven - totalReceived,
    };
  }, [debts]);

  // Fetch all salesmen with their debt summary
  const fetchSalesmen = useCallback(async () => {
    setLoading(true);
    try {
      const result = await postData('employee/retrieve-salesman', {});
      if (result?.status) {
        setSalesmen(result.data);
        await fetchAllSalesmenDebtSummary(result.data);
      }
    } catch (error) {
      console.error('Error fetching salesmen:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAllSalesmenDebtSummary = async (salesmenList) => {
    try {
      const summaryData = {};
      for (const salesman of salesmenList) {
        const result = await postData('debt/retrieve-debts', { salesmanid: salesman.salesmanid });
        if (result?.status) {
          let given = 0;
          let received = 0;
          result.data.forEach(debt => {
            const amount = parseFloat(debt.amount) || 0;
            if (debt.type === 'give') given += amount;
            else if (debt.type === 'receive') received += amount;
          });
          summaryData[salesman.salesmanid] = {
            totalGiven: given,
            totalReceived: received,
            remaining: given - received,
            hasDebt: result.data.length > 0,
          };
        }
      }
      setSalesmanDebtSummary(summaryData);
    } catch (error) {
      console.error('Error fetching debt summaries:', error);
    }
  };

  // Fetch debts for a specific salesman
  const fetchSalesmanDebts = useCallback(async (salesmanid) => {
    setLoading(true);
    try {
      const result = await postData('debt/retrieve-debts', { salesmanid });
      if (result?.status) {
        setDebts(result.data);
      }
    } catch (error) {
      console.error('Error fetching debts:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!cachedData) {
      fetchSalesmen();
    }
  }, [fetchSalesmen, cachedData]);

  // Save state to cache before unmounting
  useEffect(() => {
    return () => {
      if (cacheKey) {
        saveCache(cacheKey, {
          salesmen,
          salesmanDebtSummary,
        });
      }
    };
  }, [cacheKey, salesmen, salesmanDebtSummary]);

  // Handlers
  const handleSalesmanClick = useCallback((salesman) => {
    setSelectedSalesman(salesman);
    setViewMode('detail');
    fetchSalesmanDebts(salesman.salesmanid);
  }, [fetchSalesmanDebts]);

  const handleBackToList = useCallback(() => {
    setViewMode('list');
    setSelectedSalesman(null);
    setDebts([]);
    fetchAllSalesmenDebtSummary(salesmen);
  }, [salesmen]);

  const handleAddDebt = useCallback((type) => {
    setFormData({
      debtid: '',
      type,
      amount: '',
      debt_date: new Date().toISOString().split('T')[0]
    });
    setIsEditMode(false);
    setIsModalOpen(true);
  }, []);

  const handleEditClick = useCallback((debt) => {
    setFormData({
      debtid: debt.debtid,
      type: debt.type,
      amount: debt.amount,
      debt_date: debt.debt_date
    });
    setIsEditMode(true);
    setIsModalOpen(true);
  }, []);

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleSave = useCallback(async () => {
    try {
      let result;
      if (isEditMode) {
        result = await postData('debt/update-debt', {
          debtid: formData.debtid,
          salesmanid: selectedSalesman.salesmanid,
          type: formData.type,
          debt_date: formData.debt_date,
          amount: formData.amount
        });
        if (result?.status) {
          showToast('Debt record updated successfully!');
          setIsModalOpen(false);
          fetchSalesmanDebts(selectedSalesman.salesmanid);
          fetchAllSalesmenDebtSummary(salesmen);
        } else {
          showToast(result?.message || 'Failed to update');
        }
      } else {
        result = await postData('debt/insert-debt', {
          salesmanid: selectedSalesman.salesmanid,
          type: formData.type,
          debt_date: formData.debt_date,
          amount: formData.amount
        });
        if (result?.status) {
          showToast('Debt record added successfully!');
          setIsModalOpen(false);
          fetchSalesmanDebts(selectedSalesman.salesmanid);
          fetchAllSalesmenDebtSummary(salesmen);
        } else {
          showToast(result?.message || 'Failed to add');
        }
      }
    } catch (error) {
      console.error('Error saving debt:', error);
      showToast('Error saving debt record');
    }
  }, [isEditMode, formData, selectedSalesman, salesmen, fetchSalesmanDebts, showToast]);

  // Delete function (actual delete after confirmation)
  const performDelete = useCallback(async (debtid) => {
    try {
      const result = await postData('debt/delete-debt', { debtid });
      if (result?.status) {
        showToast('Debt record deleted successfully!');
        fetchSalesmanDebts(selectedSalesman.salesmanid);
        fetchAllSalesmenDebtSummary(salesmen);
      } else {
        showToast(result?.message || 'Failed to delete');
      }
    } catch (error) {
      console.error('Error deleting debt:', error);
      showToast('Error deleting debt record');
    }
  }, [selectedSalesman, salesmen, fetchSalesmanDebts, showToast]);

  const handleDelete = useCallback((debtid) => {
    showConfirm('Are you sure you want to delete this debt record?', () => performDelete(debtid));
  }, [showConfirm, performDelete]);

  // ----- RENDER FUNCTIONS -----

  const renderModal = () => {
    if (!isModalOpen) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden">
          <div className={`px-6 py-4 flex justify-between items-center ${formData.type === 'give' ? 'bg-gradient-to-r from-red-600 to-red-700' : 'bg-gradient-to-r from-green-600 to-green-700'}`}>
            <div>
              <h2 className="text-xl font-semibold text-white">
                {isEditMode ? 'Edit Debt Record' : (formData.type === 'give' ? 'Give Debt' : 'Receive Debt')}
              </h2>
              <p className="text-sm text-white/80">{selectedSalesman?.fullname}</p>
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

          <div className="p-6">
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Type</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, type: 'give' }))}
                    className={`px-4 py-2 rounded-lg border-2 transition-all cursor-pointer ${formData.type === 'give'
                      ? 'border-red-600 bg-red-50 text-red-700'
                      : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    Give Debt
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, type: 'receive' }))}
                    className={`px-4 py-2 rounded-lg border-2 transition-all cursor-pointer ${formData.type === 'receive'
                      ? 'border-green-600 bg-green-50 text-green-700'
                      : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    Receive Debt
                  </button>
                </div>
              </div>

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

          <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
            <button
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className={`px-4 py-2 text-white rounded-lg transition-colors cursor-pointer ${formData.type === 'give'
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
      <div>
        {/* Overall Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-gray-600">Total Given (All Salesmen)</p>
            <p className="text-2xl font-bold text-red-600">₹{overallSummary.totalGiven.toFixed(0)}</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-gray-600">Total Received (All Salesmen)</p>
            <p className="text-2xl font-bold text-green-600">₹{overallSummary.totalReceived.toFixed(0)}</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-gray-600">Total Remaining (All Salesmen)</p>
            <p className="text-2xl font-bold text-blue-600">₹{overallSummary.totalRemaining.toFixed(0)}</p>
          </div>
        </div>

        {/* Salesman Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">S.No</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mobile</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Given</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Received</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remaining</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {salesmen.map((salesman, index) => {
                  const sum = salesmanDebtSummary[salesman.salesmanid] || { totalGiven: 0, totalReceived: 0, remaining: 0, hasDebt: false };
                  return (
                    <tr key={salesman.salesmanid} className={`hover:bg-gray-50 transition-colors ${sum.hasDebt ? 'bg-blue-50/30' : ''}`}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{salesman.fullname}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{salesman.mobileno}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-red-600">
                        ₹{sum.totalGiven.toFixed(0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                        ₹{sum.totalReceived.toFixed(0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">
                        <span className={sum.remaining >= 0 ? 'text-blue-600' : 'text-orange-600'}>
                          ₹{Math.abs(sum.remaining).toFixed(0)}
                          {sum.remaining < 0 && ' (Extra)'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => handleSalesmanClick(salesman)}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm cursor-pointer"
                        >
                          {sum.hasDebt ? 'View Details' : 'Add Debt'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

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
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">{selectedSalesman?.fullname}</h2>
              <p className="text-sm text-gray-500">Mobile: {selectedSalesman?.mobileno}</p>
            </div>
            <button
              onClick={handleBackToList}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back
            </button>
          </div>

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

          <div className="flex gap-3 mt-4">
            <button
              onClick={() => handleAddDebt('give')}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Give Debt
            </button>
            <button
              onClick={() => handleAddDebt('receive')}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" />
              </svg>
              Receive Debt
            </button>
          </div>
        </div>

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
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg transition-colors cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(debt.debtid)}
                            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded-lg transition-colors cursor-pointer"
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
        <h2 className="text-2xl font-semibold text-gray-900">Debt Management</h2>
        <p className="text-sm text-gray-500 mt-1">
          {viewMode === 'list' ? 'View all salesmen with their debt summary' : `Managing debts for ${selectedSalesman?.fullname}`}
        </p>
      </div>

      {viewMode === 'list' ? renderSalesmanList() : renderDebtDetails()}
      {renderModal()}
    </div>
  );
}