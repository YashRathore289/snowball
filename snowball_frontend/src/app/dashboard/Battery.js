'use client'
import { useState, useEffect } from 'react';
import { postData } from '@/Services';

export default function BatteryManagement() {
    const [batteries, setBatteries] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [isAddMode, setIsAddMode] = useState(false);
    const [formData, setFormData] = useState({
        batteryid: '',
        batteryname: ''
    });
    const [selectedBattery, setSelectedBattery] = useState(null);
    const [totalBatteries, setTotalBatteries] = useState(0);

    // Fetch all batteries
    const fetchBatteries = async () => {
        setLoading(true);
        try {
            const result = await postData('battery/retrieve-batteries', {});
            if (result && result.status) {
                setBatteries(result.data);
                setTotalBatteries(result.count || result.data.length);
            }
        } catch (error) {
            console.error('Error fetching batteries:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBatteries();
    }, []);

    // Handle Add button click
    const handleAddClick = () => {
        setFormData({
            batteryid: '',
            batteryname: ''
        });
        setIsAddMode(true);
        setIsEditMode(false);
        setSelectedBattery(null);
        setIsModalOpen(true);
    };

    // Handle Edit button click
    const handleEditClick = (battery) => {
        setSelectedBattery(battery);
        setFormData({
            batteryid: battery.batteryid,
            batteryname: battery.batteryname
        });
        setIsEditMode(true);
        setIsAddMode(false);
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
            if (isAddMode) {
                result = await postData('battery/insert-battery', {
                    batteryname: formData.batteryname
                });
                if (result && result.status) {
                    alert('Battery added successfully!');
                    setIsModalOpen(false);
                    fetchBatteries();
                } else {
                    alert(result?.message || 'Failed to add battery');
                }
            } else {
                result = await postData('battery/update-battery', {
                    batteryid: formData.batteryid,
                    batteryname: formData.batteryname
                });
                if (result && result.status) {
                    alert('Battery updated successfully!');
                    setIsModalOpen(false);
                    fetchBatteries();
                } else {
                    alert(result?.message || 'Failed to update battery');
                }
            }
        } catch (error) {
            console.error('Error saving battery:', error);
            alert('Error saving battery');
        }
    };

    // Handle Delete
    const handleDelete = async (batteryid) => {
        if (!confirm('Are you sure you want to delete this battery?')) return;

        try {
            const result = await postData('battery/delete-battery', { batteryid });
            if (result && result.status) {
                alert('Battery deleted successfully!');
                fetchBatteries();
            } else {
                alert(result?.message || 'Failed to delete');
            }
        } catch (error) {
            console.error('Error deleting battery:', error);
            alert('Error deleting battery');
        }
    };

    // Render Modal
    const renderModal = () => {
        if (!isModalOpen) return null;

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden">
                    {/* Modal Header */}
                    <div className={`px-6 py-4 flex justify-between items-center ${isAddMode ? 'bg-gradient-to-r from-emerald-600 to-emerald-700' : 'bg-gradient-to-r from-blue-600 to-blue-700'}`}>
                        <div>
                            <h2 className="text-xl font-semibold text-white">
                                {isAddMode ? 'Add New Battery' : 'Edit Battery'}
                            </h2>
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
                            {/* Battery Name */}
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
                            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className={`px-4 py-2 text-white rounded-lg transition-colors ${isAddMode ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'}`}
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
                                <th className=" py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">S.No</th>
                                <th className=" py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Battery Name</th>
                                <th className=" py-3 text-end pr-30 w-[40%] text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
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
                                                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg transition-colors"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(battery.batteryid)}
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
        );
    };

    return (
        <div className='flex items-center flex-col'>
            <div className="mb-8 w-full">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-semibold text-gray-900">Battery Management</h2>
                        <p className="text-sm text-gray-500 mt-1">Manage all batteries</p>
                    </div>
                    <button
                        onClick={handleAddClick}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Add Battery
                    </button>
                </div>
            </div>

            {renderBatteryTable()}

            {/* Render Modal */}
            {renderModal()}
        </div>
    );
}