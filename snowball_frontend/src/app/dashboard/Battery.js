'use client'
import { useState, useEffect, useCallback } from 'react';
import { postData } from '@/Services';
import { saveCache, getCache, clearCache } from './ComponentCache';

export default function BatteryManagement({ cacheKey }) {
  // Restore from cache if available
  const cachedData = cacheKey ? getCache(cacheKey) : null;

  const [batteries, setBatteries] = useState(cachedData?.batteries || []);
  const [loading, setLoading] = useState(!cachedData);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isAddMode, setIsAddMode] = useState(false);
  const [formData, setFormData] = useState({
    batteryid: '',
    batteryname: ''
  });
  const [selectedBattery, setSelectedBattery] = useState(null);
  const [totalBatteries, setTotalBatteries] = useState(cachedData?.totalBatteries || 0);

  // Toast notification state
  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);

  // Confirmation popup state
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmAction, setConfirmAction] = useState(null);

  // Auto-dismiss toast after 5 seconds
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

  // Fetch all batteries
  const fetchBatteries = useCallback(async () => {
    setLoading(true);
    try {
      const result = await postData('battery/retrieve-batteries', {});
      if (result?.status) {
        setBatteries(result.data);
        setTotalBatteries(result.count || result.data.length);
      }
    } catch (error) {
      console.error('Error fetching batteries:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!cachedData) {
      fetchBatteries();
    }
  }, [fetchBatteries, cachedData]);

  // Save state to cache before unmounting
  useEffect(() => {
    return () => {
      if (cacheKey) {
        saveCache(cacheKey, {
          batteries,
          totalBatteries,
        });
      }
    };
  }, [cacheKey, batteries, totalBatteries]);

  // Handle Add button click
  const handleAddClick = useCallback(() => {
    setFormData({ batteryid: '', batteryname: '' });
    setIsAddMode(true);
    setIsEditMode(false);
    setSelectedBattery(null);
    setIsModalOpen(true);
  }, []);

  // Handle Edit button click
  const handleEditClick = useCallback((battery) => {
    setSelectedBattery(battery);
    setFormData({
      batteryid: battery.batteryid,
      batteryname: battery.batteryname
    });
    setIsEditMode(true);
    setIsAddMode(false);
    setIsModalOpen(true);
  }, []);

  // Handle form input change
  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  // Handle Save/Update
  const handleSave = useCallback(async () => {
    try {
      if (isAddMode) {
        const result = await postData('battery/insert-battery', {
          batteryname: formData.batteryname
        });
        if (result?.status) {
          clearCache(cacheKey);
          showToast('Battery added successfully!');
          setIsModalOpen(false);
          fetchBatteries();
        } else {
          showToast(result?.message || 'Failed to add battery');
        }
      } else {
        const result = await postData('battery/update-battery', {
          batteryid: formData.batteryid,
          batteryname: formData.batteryname
        });
        if (result?.status) {
          clearCache(cacheKey);
          showToast('Battery updated successfully!');
          setIsModalOpen(false);
          fetchBatteries();
        } else {
          showToast(result?.message || 'Failed to update battery');
        }
      }
    } catch (error) {
      console.error('Error saving battery:', error);
      showToast('Error saving battery');
    }
  }, [isAddMode, formData, fetchBatteries, showToast]);

  // Delete function (actual logic after confirmation)
  const performDelete = useCallback(async (batteryid) => {
    try {
      const result = await postData('battery/delete-battery', { batteryid });
      if (result?.status) {
        clearCache(cacheKey);
        showToast('Battery deleted successfully!');
        fetchBatteries();
      } else {
        showToast(result?.message || 'Failed to delete');
      }
    } catch (error) {
      console.error('Error deleting battery:', error);
      showToast('Error deleting battery');
    }
  }, [fetchBatteries, showToast]);

  // Handle Delete click – opens confirmation popup
  const handleDelete = useCallback((batteryid) => {
    showConfirm(
      'Are you sure you want to delete this battery?',
      () => performDelete(batteryid)
    );
  }, [showConfirm, performDelete]);

  // Render Modal
  const renderModal = () => {
    if (!isModalOpen) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden">
          {/* Modal Header */}
          <div className={`px-6 py-4 flex justify-between items-center ${isAddMode ? 'bg-gradient-to-r from-emerald-600 to-emerald-700' : 'bg-gradient-to-r from-blue-600 to-blue-700'}`}>
            <h2 className="text-xl font-semibold text-white">
              {isAddMode ? 'Add New Battery' : 'Edit Battery'}
            </h2>
            <button
              onClick={() => setIsModalOpen(false)}
              className="text-white hover:text-gray-200 transition-colors cursor-pointer"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-6">
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Battery Name</label>
                <input
                  type="text"
                  name="batteryname"
                  value={formData.batteryname}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="Enter battery name (e.g., BAT-001)"
                />
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
            <button
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className={`px-4 py-2 text-white rounded-lg transition-colors cursor-pointer ${isAddMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              {isAddMode ? 'Add Battery' : 'Update Battery'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render Battery Table
  const renderBatteryTable = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    if (batteries.length === 0) {
      return (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-500">No batteries found</p>
        </div>
      );
    }

    return (
      <div className="bg-white w-[50%] rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="py-3 text-center text-xs font-bold text-black uppercase tracking-wider">S.No</th>
                <th className="py-3 text-center text-xs font-bold text-black uppercase tracking-wider">Battery Name</th>
                <th className="py-3 text-end pr-30 w-[40%] text-xs font-bold text-black uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {batteries.map((battery, index) => (
                <tr key={battery.batteryid} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 text-sm w-20 text-center text-gray-500">{index + 1}</td>
                  <td className="py-3 text-sm w-20 text-center font-medium text-gray-900">{battery.batteryname}</td>
                  <td className="py-3 text-sm w-20 text-center">
                    <div className="flex gap-2 w-[65%] justify-end">
                      <button
                        onClick={() => handleEditClick(battery)}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg transition-colors cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(battery.batteryid)}
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
    );
  };

  return (
    <div className='flex items-center flex-col'>
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

      <div className="mb-8 w-full">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Battery Management</h2>
            <p className="text-sm text-gray-500 mt-1">Manage all batteries</p>
          </div>
          <button
            onClick={handleAddClick}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Battery
          </button>
        </div>
      </div>

      {renderBatteryTable()}
      {renderModal()}
    </div>
  );
}