'use client'
import { useState, useEffect, useCallback, useMemo } from 'react';
import { postData } from '@/Services';
import { saveCache, getCache, clearCache } from './ComponentCache';

export default function AttendanceManagement({ cacheKey }) {
    // Restore from cache if available
    const cachedData = cacheKey ? getCache(cacheKey) : null;

    const [salesmen, setSalesmen] = useState(cachedData?.salesmen || []);
    const [attendance, setAttendance] = useState(cachedData?.attendance || []);
    const [loading, setLoading] = useState(!cachedData);
    const [selectedDate, setSelectedDate] = useState(cachedData?.selectedDate || new Date().toISOString().split('T')[0]);
    const [currentMonth, setCurrentMonth] = useState(cachedData?.currentMonth || new Date().getMonth() + 1);
    const [currentYear, setCurrentYear] = useState(cachedData?.currentYear || new Date().getFullYear());
    const [viewMode, setViewMode] = useState(cachedData?.viewMode || 'daily');

    // ---- Toast state ----
    const [toastMessage, setToastMessage] = useState('');
    const [toastVisible, setToastVisible] = useState(false);

    // ---- Confirmation popup state ----
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

    // Fetch all salesmen
    const fetchSalesmen = useCallback(async () => {
        try {
            const result = await postData('employee/retrieve-salesman', {});
            if (result?.status) {
                setSalesmen(result.data);
            }
        } catch (error) {
            console.error('Error fetching salesmen:', error);
        }
    }, []);

    // Fetch attendance based on view mode
    const fetchAttendance = useCallback(async () => {
        setLoading(true);
        try {
            if (viewMode === 'daily') {
                const result = await postData('attendance/retrieve-attendance', {
                    attendance_date: selectedDate,
                });
                if (result?.status) {
                    setAttendance(result.data);
                }
            } else {
                const result = await postData('attendance/retrieve-attendance', {
                    month: currentMonth,
                    year: currentYear,
                });
                if (result?.status) {
                    setAttendance(result.data);
                }
            }
        } catch (error) {
            console.error('Error fetching attendance:', error);
        } finally {
            setLoading(false);
        }
    }, [selectedDate, currentMonth, currentYear, viewMode]);

    // Mark single attendance
    const markAttendance = useCallback(async (salesmanid, status) => {
        try {
            const result = await postData('attendance/mark-attendance', {
                salesmanid,
                attendance_date: selectedDate,
                status,
            });
            if (result?.status) {
                clearCache(cacheKey);
                // Directly fetch fresh data
                const freshResult = await postData('attendance/retrieve-attendance', {
                    attendance_date: selectedDate,
                });
                if (freshResult?.status) {
                    setAttendance(freshResult.data);
                }
            } else {
                showToast(result?.message || 'Failed to mark attendance');
            }
        } catch (error) {
            console.error('Error marking attendance:', error);
            showToast('Error marking attendance');
        }
    }, [selectedDate, showToast, cacheKey]);

    // Batch mark all salesmen
    const markAllAttendance = useCallback(async (status) => {
        const records = salesmen.map(s => ({
            salesmanid: s.salesmanid,
            status,
        }));
        try {
            const result = await postData('attendance/mark-attendance-batch', {
                records,
                attendance_date: selectedDate,
            });
            if (result?.status) {
                clearCache(cacheKey);
                showToast(`All marked as ${status} successfully!`);
                // Directly fetch fresh data instead of using the memoized fetchAttendance
                const freshResult = await postData('attendance/retrieve-attendance', {
                    attendance_date: selectedDate,
                });
                if (freshResult?.status) {
                    setAttendance(freshResult.data);
                }
            } else {
                showToast(result?.message || 'Failed to mark all');
            }
        } catch (error) {
            console.error('Error batch marking:', error);
            showToast('Error marking attendance');
        }
    }, [salesmen, selectedDate, showToast, cacheKey]);

    // Delete attendance record
    const performDelete = useCallback(async (attendanceid) => {
        try {
            const result = await postData('attendance/delete-attendance', { attendanceid });
            if (result?.status) {
                clearCache(cacheKey);
                showToast('Attendance record deleted successfully!');
                fetchAttendance();
            } else {
                showToast(result?.message || 'Failed to delete');
            }
        } catch (error) {
            console.error('Error deleting attendance:', error);
            showToast('Error deleting attendance record');
        }
    }, [fetchAttendance, showToast]);

    const handleDelete = useCallback((attendanceid) => {
        showConfirm(
            'Are you sure you want to delete this attendance record?',
            () => performDelete(attendanceid)
        );
    }, [showConfirm, performDelete]);

    useEffect(() => {
        if (!cachedData || salesmen.length === 0) {
            fetchSalesmen();
        }
    }, []);

    // ALWAYS fetch attendance (it changes daily)
    useEffect(() => {
        fetchAttendance();
    }, [selectedDate, currentMonth, currentYear, viewMode]);

    // Save state to cache before unmounting
    useEffect(() => {
        return () => {
            if (cacheKey) {
                saveCache(cacheKey, {
                    salesmen,
                    attendance,
                    selectedDate,
                    currentMonth,
                    currentYear,
                    viewMode,
                });
            }
        };
    }, [cacheKey, salesmen, attendance, selectedDate, currentMonth, currentYear, viewMode]);

    // Derived data (memoized)
    const dailyAttendanceMap = useMemo(() => {
        const map = {};
        attendance.forEach(record => {
            map[record.salesmanid] = record;
        });
        return map;
    }, [attendance]);

    const dailySummary = useMemo(() => ({
        present: attendance.filter(a => a.status === 'Present').length,
        absent: attendance.filter(a => a.status === 'Absent').length,
        totalMarked: attendance.length,
    }), [attendance]);

    const monthlyAttendanceMap = useMemo(() => {
        const map = {};
        attendance.forEach(record => {
            const key = `${record.salesmanid}-${record.attendance_date}`;
            map[key] = record.status;
        });
        return map;
    }, [attendance]);

    const daysInMonth = useMemo(
        () => new Date(currentYear, currentMonth, 0).getDate(),
        [currentMonth, currentYear]
    );

    const getStatusBadge = useCallback((status) => {
        const colors = {
            Present: 'bg-green-100 text-green-700',
            Absent: 'bg-red-100 text-red-700',
            Leave: 'bg-purple-100 text-purple-700',
        };
        return colors[status] || 'bg-gray-100 text-gray-700';
    }, []);

    const monthNames = useMemo(() => [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ], []);

    // ---------- RENDER FUNCTIONS ----------
    const renderDailyView = useCallback(() => (
        <div>
            {/* Daily Summary */}
            {attendance.length > 0 && (
                <div className="mt-6 mb-5 grid grid-cols-2 md:grid-cols-2 gap-3">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                        <p className="text-xs text-gray-500">Present</p>
                        <p className="text-xl font-bold text-green-600">{dailySummary.present}</p>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                        <p className="text-xs text-gray-500">Absent</p>
                        <p className="text-xl font-bold text-red-600">{dailySummary.absent}</p>
                    </div>
                </div>
            )}
            {/* Date Selector */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <div>
                        <label className="text-sm font-bold text-black">Date</label>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="ml-2 px-3 py-2 border border-gray-300 rounded-lg font-bold text-black focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                    </div>
                    <div className="text-sm font-bold text-black">
                        {new Date(selectedDate).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                        })}
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => markAllAttendance('Present')}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium cursor-pointer"
                    >
                        Mark All Present
                    </button>
                    <button
                        onClick={() => markAllAttendance('Absent')}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-medium cursor-pointer"
                    >
                        Mark All Absent
                    </button>
                </div>
            </div>

            {/* Salesman Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-bold text-black uppercase tracking-wider">S.No</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-black uppercase tracking-wider">Salesman Name</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-black uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-black uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {salesmen.map((salesman, index) => {
                                const record = dailyAttendanceMap[salesman.salesmanid];
                                const status = record?.status || 'Not Marked';
                                const attendanceId = record?.attendanceid;

                                return (
                                    <tr key={salesman.salesmanid} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{salesman.fullname}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(status)}`}>
                                                {status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => markAttendance(salesman.salesmanid, 'Present')}
                                                    className={`px-3 py-1 rounded-lg transition-colors text-xs font-medium cursor-pointer ${status === 'Present'
                                                        ? 'bg-green-200 text-green-800 cursor-default'
                                                        : 'bg-green-600 hover:bg-green-700 text-white'
                                                        }`}
                                                    disabled={status === 'Present'}
                                                >
                                                    Present
                                                </button>
                                                <button
                                                    onClick={() => markAttendance(salesman.salesmanid, 'Absent')}
                                                    className={`px-3 py-1 rounded-lg transition-colors text-xs font-medium cursor-pointer ${status === 'Absent'
                                                        ? 'bg-red-200 text-red-800 cursor-default'
                                                        : 'bg-red-600 hover:bg-red-700 text-white'
                                                        }`}
                                                    disabled={status === 'Absent'}
                                                >
                                                    Absent
                                                </button>
                                                {attendanceId && (
                                                    <button
                                                        onClick={() => handleDelete(attendanceId)}
                                                        className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded-lg transition-colors cursor-pointer"
                                                    >
                                                        Clear
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>


        </div>
    ), [selectedDate, markAllAttendance, salesmen, dailyAttendanceMap, getStatusBadge, markAttendance, handleDelete, attendance, dailySummary]);

    const renderMonthlyView = useCallback(() => (
        <div>
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">
                    {monthNames[currentMonth - 1]} {currentYear}
                </h3>
                <div>
                    <button
                        onClick={() => {
                            if (currentMonth === 1) {
                                setCurrentMonth(12);
                                setCurrentYear(y => y - 1);
                            } else {
                                setCurrentMonth(m => m - 1);
                            }
                        }}
                        className="px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors mr-2 cursor-pointer"
                    >
                        ◀
                    </button>
                    <button
                        onClick={() => {
                            if (currentMonth === 12) {
                                setCurrentMonth(1);
                                setCurrentYear(y => y + 1);
                            } else {
                                setCurrentMonth(m => m + 1);
                            }
                        }}
                        className="px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors cursor-pointer"
                    >
                        ▶
                    </button>
                </div>
            </div>

            {/* Calendar */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-white">
                            <tr>
                                <th className="px-3 py-2 text-left text-md font-bold text-black uppercase tracking-wider">Salesman</th>
                                {Array.from({ length: daysInMonth }).map((_, index) => (
                                    <th key={index} className="px-2 py-2 text-center text-md font-bold text-black">
                                        {index + 1}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {salesmen.map(salesman => (
                                <tr key={salesman.salesmanid} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-3 py-2 text-sm font-medium text-gray-900 whitespace-nowrap">
                                        {salesman.fullname}
                                    </td>
                                    {Array.from({ length: daysInMonth }).map((_, dayIndex) => {
                                        const day = dayIndex + 1;
                                        const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                        const key = `${salesman.salesmanid}-${dateStr}`;
                                        const status = monthlyAttendanceMap[key] || '';
                                        const isToday =
                                            day === new Date().getDate() &&
                                            currentMonth === new Date().getMonth() + 1 &&
                                            currentYear === new Date().getFullYear();

                                        return (
                                            <td key={day} className={`px-1 py-2 text-center font-bold text-xs ${isToday ? 'bg-blue-50' : ''}`}>
                                                {status && (
                                                    <span className={`inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold rounded-full ${getStatusBadge(status)}`}>
                                                        {status === 'Present' ? 'P' : 'A'}
                                                    </span>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    ), [currentMonth, currentYear, monthNames, daysInMonth, salesmen, monthlyAttendanceMap, getStatusBadge]);

    // ---------- MAIN RETURN ----------
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
                <h2 className="text-2xl font-semibold text-gray-900">Attendance Management</h2>
                <p className="text-sm text-gray-500 mt-1">Mark and track daily attendance of salesmen</p>
            </div>

            {/* View Toggle */}
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                    {viewMode === 'daily' ? 'Daily Attendance' : 'Monthly Attendance'}
                </h3>
                <div className="flex gap-2">
                    <button
                        onClick={() => setViewMode('daily')}
                        className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium cursor-pointer ${viewMode === 'daily'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                    >
                        Daily View
                    </button>
                    <button
                        onClick={() => setViewMode('monthly')}
                        className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium cursor-pointer ${viewMode === 'monthly'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                    >
                        Monthly View
                    </button>
                </div>
            </div>

            {/* Thin loading bar – never hides content */}
            {loading && (
                <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden mb-4">
                    <div className="h-full bg-blue-600 animate-pulse rounded-full" style={{ width: '60%' }}></div>
                </div>
            )}

            {/* Always render the view – just update data */}
            {viewMode === 'daily' ? renderDailyView() : renderMonthlyView()}
        </div>
    );
}