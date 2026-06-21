'use client'
import { useState, useEffect, useCallback, useMemo } from 'react';
import { postData } from '@/Services';
import { saveCache, getCache } from './ComponentCache';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function TotalSales({ cacheKey }) {
  // Restore from cache if available
  const cachedData = cacheKey ? getCache(cacheKey) : null;

  const [reportData, setReportData] = useState(cachedData?.reportData || null);
  const [loading, setLoading] = useState(!cachedData);
  const [selectedMonth, setSelectedMonth] = useState(cachedData?.selectedMonth || new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(cachedData?.selectedYear || new Date().getFullYear());

  // Fetch report data (memoized callback)
  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const result = await postData('handedgoods/monthly-sales-report', {
        month: selectedMonth,
        year: selectedYear
      });
      if (result?.status) {
        setReportData(result.data);
      } else {
        setReportData(null);
      }
    } catch (error) {
      console.error('Error fetching report:', error);
      setReportData(null);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    if (!cachedData) {
      fetchReport();
    }
  }, [fetchReport, cachedData]);

  // Save state to cache before unmounting
  useEffect(() => {
    return () => {
      if (cacheKey) {
        saveCache(cacheKey, {
          reportData,
          selectedMonth,
          selectedYear,
        });
      }
    };
  }, [cacheKey, reportData, selectedMonth, selectedYear]);

  // Formatting helpers (memoized)
  const formatCurrency = useCallback((amount) => {
    return `₹${parseFloat(amount || 0).toFixed(0)}`;
  }, []);

  const formatDateDisplay = useCallback((dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }, []);

  // Derived data: daily totals (memoized)
  const dailyTotals = useMemo(() => {
    if (!reportData) return [];
    const { dates, salesmen } = reportData;
    return dates.map(date => ({
      date,
      total: salesmen.reduce((sum, s) => sum + (s.entries[date] || 0), 0)
    }));
  }, [reportData]);

  // Render the report table
  const renderReportTable = useCallback(() => {
    if (loading) {
      return (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    if (!reportData || reportData.salesmen.length === 0) {
      return (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-500">No data found for {MONTH_NAMES[selectedMonth - 1]} {selectedYear}</p>
        </div>
      );
    }

    const { dates, salesmen, grandTotal } = reportData;

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-slate-600">
              <tr>
                <th className="px-4 py-3 text-left text-lg font-bold text-white uppercase tracking-wider sticky left-0 z-10 min-w-[120px]">
                  Date
                </th>
                {salesmen.map((salesman) => (
                  <th key={salesman.salesmanid} className="px-4 py-3 text-right text-lg font-bold text-white uppercase tracking-wider min-w-[100px]">
                    {salesman.salesman_name}
                  </th>
                ))}
                <th className="px-4 py-3 text-right text-lg font-bold text-white uppercase tracking-wider sticky right-0 z-10 min-w-[100px]">
                  Daily Total
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {dates.map((date) => {
                const dayTotal = dailyTotals.find(d => d.date === date)?.total || 0;
                const hasData = salesmen.some(s => s.entries[date] && s.entries[date] > 0);

                return (
                  <tr key={date} className={`hover:bg-gray-50 transition-colors ${!hasData ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 sticky left-0 bg-white z-10">
                      {formatDateDisplay(date)}
                    </td>
                    {salesmen.map((salesman) => (
                      <td key={salesman.salesmanid} className="px-4 py-3 text-sm text-right text-gray-700">
                        {salesman.entries[date] ? (
                          <span className="font-semibold text-blue-600">
                            {formatCurrency(salesman.entries[date])}
                          </span>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-sm font-semibold text-right text-blue-700 sticky right-0 bg-white z-10">
                      {dayTotal > 0 ? formatCurrency(dayTotal) : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr className="bg-green-200">
                <td className="px-4 py-3 text-xl font-bold text-gray-900 sticky left-0 z-10">
                  Grand Total
                </td>
                {salesmen.map((salesman) => (
                  <td key={salesman.salesmanid} className="px-4 py-3 text-xl font-bold text-right text-black">
                    {formatCurrency(salesman.total)}
                  </td>
                ))}
                <td className="px-4 py-3 text-xl font-bold text-right text-black sticky right-0 z-10">
                  {formatCurrency(grandTotal)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    );
  }, [loading, reportData, selectedMonth, selectedYear, dailyTotals, formatCurrency, formatDateDisplay]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Monthly Sales Report</h2>
            <p className="text-sm text-gray-500 mt-1">View all salesman sales by month</p>
          </div>
          <div className="flex gap-3 items-center">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm cursor-pointer"
            >
              {MONTH_NAMES.map((name, index) => (
                <option key={index + 1} value={index + 1}>
                  {name}
                </option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm cursor-pointer"
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <button
              onClick={fetchReport}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium cursor-pointer"
            >
              Generate
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        {reportData && reportData.salesmen.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-gray-600">Total Salesmen</p>
              <p className="text-2xl font-bold text-blue-600">{reportData.salesmen.length}</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-gray-600">Total Sales</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(reportData.grandTotal)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Report Table */}
      {renderReportTable()}
    </div>
  );
}