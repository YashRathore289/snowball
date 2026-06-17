'use client'
import { useState, useEffect } from 'react';
import { postData } from '@/Services';

export default function AttendanceManagement() {
    const [salesmen, setSalesmen] = useState([]);
    const [attendance, setAttendance] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
    const [viewMode, setViewMode] = useState('daily');
    const [summary, setSummary] = useState({
        totalDays: 0,
        present: 0,
        absent: 0,
        leave: 0,
        attendancePercentage: 0
    });

    // Fetch all salesmen
    const fetchSalesmen = async () => {
        try {
            const result = await postData('employee/retrieve-salesman', {});
            if (result && result.status) {
                setSalesmen(result.data);
            }
        } catch (error) {
            console.error('Error fetching salesmen:', error);
        }
    };

    // Fetch attendance for all salesmen on selected date
    const fetchAttendance = async () => {
        setLoading(true);
        try {
            if (viewMode === 'daily') {
                // Get attendance for all salesmen on specific date
                const result = await postData('attendance/retrieve-attendance', {
                    attendance_date: selectedDate
                });
                if (result && result.status) {
                    setAttendance(result.data);
                }
            } else {
                // Get attendance for month
                const result = await postData('attendance/retrieve-attendance', {
                    month: currentMonth,
                    year: currentYear
                });
                if (result && result.status) {
                    setAttendance(result.data);
                }

                // Get summary
                const summaryResult = await postData('attendance/attendance-summary', {
                    month: currentMonth,
                    year: currentYear
                });
                if (summaryResult && summaryResult.status) {
                    setSummary(summaryResult.data);
                }
            }
        } catch (error) {
            console.error('Error fetching attendance:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSalesmen();
    }, []);

    useEffect(() => {
        fetchAttendance();
    }, [selectedDate, currentMonth, currentYear, viewMode]);

    // Mark attendance
    const markAttendance = async (salesmanid, status) => {
        try {
            const result = await postData('attendance/mark-attendance', {
                salesmanid: salesmanid,
                attendance_date: selectedDate,
                status: status
            });

            if (result && result.status) {
                fetchAttendance();
            } else {
                alert(result?.message || 'Failed to mark attendance');
            }
        } catch (error) {
            console.error('Error marking attendance:', error);
            alert('Error marking attendance');
        }
    };

    // Handle delete
    const handleDelete = async (attendanceid) => {
        if (!confirm('Are you sure you want to delete this attendance record?')) return;

        try {
            const result = await postData('attendance/delete-attendance', { attendanceid });
            if (result && result.status) {
                alert('Attendance record deleted successfully!');
                fetchAttendance();
            } else {
                alert(result?.message || 'Failed to delete');
            }
        } catch (error) {
            console.error('Error deleting attendance:', error);
            alert('Error deleting attendance record');
        }
    };

    // Get status badge color
    const getStatusBadge = (status) => {
        const colors = {
            'Present': 'bg-green-100 text-green-700',
            'Absent': 'bg-red-100 text-red-700',
            'Leave': 'bg-purple-100 text-purple-700'
        };
        return colors[status] || 'bg-gray-100 text-gray-700';
    };

    // Get days in month
    const getDaysInMonth = (month, year) => {
        return new Date(year, month, 0).getDate();
    };

    // Render Daily View
    const renderDailyView = () => {
        // Create a map of attendance by salesmanid
        const attendanceMap = {};
        attendance.forEach(record => {
            attendanceMap[record.salesmanid] = record;
        });

        return (
            <div>
                {/* Date Selector */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <div>
                            <label className="text-sm font-medium text-gray-700">Date</label>
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="ml-2 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            />
                        </div>
                        <div className="text-sm text-gray-500">
                            {new Date(selectedDate).toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            })}
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => {
                                // Mark all as Present
                                salesmen.forEach(salesman => {
                                    markAttendance(salesman.salesmanid, 'Present');
                                });
                            }}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium"
                        >
                            Mark All Present
                        </button>
                        <button
                            onClick={() => {
                                // Mark all as Absent
                                salesmen.forEach(salesman => {
                                    markAttendance(salesman.salesmanid, 'Absent');
                                });
                            }}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-medium"
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
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">S.No</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Salesman Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {salesmen.map((salesman, index) => {
                                    const record = attendanceMap[salesman.salesmanid];
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
                                                        className={`px-3 py-1 rounded-lg transition-colors text-xs font-medium ${status === 'Present'
                                                            ? 'bg-green-200 text-green-800 cursor-default'
                                                            : 'bg-green-600 hover:bg-green-700 text-white'
                                                            }`}
                                                        disabled={status === 'Present'}
                                                    >
                                                        Present
                                                    </button>
                                                    <button
                                                        onClick={() => markAttendance(salesman.salesmanid, 'Absent')}
                                                        className={`px-3 py-1 rounded-lg transition-colors text-xs font-medium ${status === 'Absent'
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
                                                            className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded-lg transition-colors"
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

                {/* Summary */}
                {attendance.length > 0 && (
                    <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-3">
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                            <p className="text-xs text-gray-500">Present</p>
                            <p className="text-xl font-bold text-green-600">
                                {attendance.filter(a => a.status === 'Present').length}
                            </p>
                        </div>
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                            <p className="text-xs text-gray-500">Absent</p>
                            <p className="text-xl font-bold text-red-600">
                                {attendance.filter(a => a.status === 'Absent').length}
                            </p>
                        </div>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                            <p className="text-xs text-gray-500">Total Marked</p>
                            <p className="text-xl font-bold text-blue-600">
                                {attendance.length}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // Render Monthly View
    const renderMonthlyView = () => {
        const daysInMonth = getDaysInMonth(currentMonth, currentYear);
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

        // Create attendance map with salesman names
        const attendanceMap = {};
        attendance.forEach(record => {
            const key = `${record.salesmanid}-${record.attendance_date}`;
            attendanceMap[key] = record.status;
        });

        const dayStatus = (salesmanid, day) => {
            const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const key = `${salesmanid}-${dateStr}`;
            return attendanceMap[key] || '';
        };

        return (
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
                                    setCurrentYear(currentYear - 1);
                                } else {
                                    setCurrentMonth(currentMonth - 1);
                                }
                            }}
                            className="px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors mr-2"
                        >
                            ◀
                        </button>
                        <button
                            onClick={() => {
                                if (currentMonth === 12) {
                                    setCurrentMonth(1);
                                    setCurrentYear(currentYear + 1);
                                } else {
                                    setCurrentMonth(currentMonth + 1);
                                }
                            }}
                            className="px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
                        >
                            ▶
                        </button>
                    </div>
                </div>

                {/* Calendar */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Salesman</th>
                                    {Array.from({ length: daysInMonth }).map((_, index) => (
                                        <th key={index} className="px-2 py-2 text-center text-xs font-medium text-gray-500">
                                            {index + 1}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {salesmen.map((salesman) => (
                                    <tr key={salesman.salesmanid} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-3 py-2 text-sm font-medium text-gray-900 whitespace-nowrap">
                                            {salesman.fullname}
                                        </td>
                                        {Array.from({ length: daysInMonth }).map((_, dayIndex) => {
                                            const day = dayIndex + 1;
                                            const status = dayStatus(salesman.salesmanid, day);
                                            const isToday = day === new Date().getDate() &&
                                                currentMonth === new Date().getMonth() + 1 &&
                                                currentYear === new Date().getFullYear();

                                            return (
                                                <td key={day} className={`px-1 py-2 text-center text-xs ${isToday ? 'bg-blue-50' : ''}`}>
                                                    {status && (
                                                        <span className={`px-1 py-0.5 text-xs font-medium rounded-full ${getStatusBadge(status)}`}>
                                                            {status === 'Present' ? 'P' : status === 'Absent' ? 'A' : 'L'}
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
        );
    };

    // Render View Toggle
    const renderViewToggle = () => {
        return (
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                    {viewMode === 'daily' ? 'Daily Attendance' : 'Monthly Attendance'}
                </h3>
                <div className="flex gap-2">
                    <button
                        onClick={() => setViewMode('daily')}
                        className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium ${viewMode === 'daily'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                    >
                        Daily View
                    </button>
                    <button
                        onClick={() => setViewMode('monthly')}
                        className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium ${viewMode === 'monthly'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                    >
                        Monthly View
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div>
            <div className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900">Attendance Management</h2>
                <p className="text-sm text-gray-500 mt-1">Mark and track daily attendance of salesmen</p>
            </div>

            {renderViewToggle()}

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            ) : (
                viewMode === 'daily' ? renderDailyView() : renderMonthlyView()
            )}
        </div>
    );
}