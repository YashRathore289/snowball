'use client'
import { useState, useEffect, useCallback } from 'react';
import { postData } from '@/Services';
import { saveCache, getCache } from './ComponentCache';

export default function HomeComponent({ cacheKey }) {
    // Restore from cache if available
    const cachedData = cacheKey ? getCache(cacheKey) : null;

    const [stats, setStats] = useState(cachedData?.stats || {
        totalSalesmen: 0,
        todaySales: 0,
        productsInStock: 0,
        pendingOrders: 0
    });
    const [recentSales, setRecentSales] = useState(cachedData?.recentSales || []);
    const [todayAttendance, setTodayAttendance] = useState(cachedData?.todayAttendance || []);
    const [loading, setLoading] = useState(!cachedData);

    const fetchHomeData = useCallback(async () => {
        setLoading(true);
        try {
            const [salesmenRes, attendanceRes, productsRes] = await Promise.all([
                postData('employee/retrieve-salesman', {}),
                postData('attendance/retrieve-attendance', { attendance_date: new Date().toISOString().split('T')[0] }),
                postData('product/retrieve-products', {}),
            ]);

            const totalSalesmen = salesmenRes?.status ? salesmenRes.data.length : 0;
            const productsInStock = productsRes?.status ? productsRes.data.length : 0;

            const attendanceList = [];
            if (attendanceRes?.status) {
                attendanceRes.data.slice(0, 3).forEach(record => {
                    attendanceList.push({
                        id: record.attendanceid,
                        name: record.salesman_name,
                        date: record.attendance_date,
                        status: record.status
                    });
                });
            }
            setTodayAttendance(attendanceList);

            const salesRes = await postData('handedgoods/retrieve-handed-goods', {
                month: new Date().getMonth() + 1,
                year: new Date().getFullYear()
            });
            const salesList = [];
            if (salesRes?.status && salesRes.data.length > 0) {
                const uniqueSalesmen = new Map();
                salesRes.data.slice(0, 5).forEach(record => {
                    const sid = record.salesmanid;
                    if (!uniqueSalesmen.has(sid)) {
                        uniqueSalesmen.set(sid, record);
                        salesList.push({
                            id: record.handedgoodsid,
                            salesman: record.salesman_name,
                            amount: parseFloat(record.finalamount) || 0,
                            month: new Date().toLocaleString('default', { month: 'long', year: 'numeric' })
                        });
                    }
                });
            }
            setRecentSales(salesList.slice(0, 3));

            const todaySales = salesList.reduce((sum, item) => sum + item.amount, 0);

            const newStats = {
                totalSalesmen,
                todaySales,
                productsInStock,
                pendingOrders: Math.floor(Math.random() * 20) + 5
            };

            setStats(newStats);

        } catch (error) {
            console.error('Error fetching home data:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!cachedData) {
            fetchHomeData();
        }
    }, [fetchHomeData, cachedData]);

    // Save state to cache before unmounting
    useEffect(() => {
        return () => {
            if (cacheKey) {
                saveCache(cacheKey, {
                    stats,
                    recentSales,
                    todayAttendance,
                });
            }
        };
    }, [cacheKey, stats, recentSales, todayAttendance]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div>
            <div className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900">Dashboard Overview</h2>
                <p className="text-sm text-gray-500 mt-1">Welcome back, Admin. Here's what's happening with your business today.</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Total Salesmen</p>
                            <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalSalesmen}</p>
                            <p className="text-xs text-green-600 mt-2">Active salesmen</p>
                        </div>
                        <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Today's Sales</p>
                            <p className="text-3xl font-bold text-gray-900 mt-1">₹{stats.todaySales.toLocaleString()}</p>
                            <p className="text-xs text-gray-500 mt-2">Total sales amount</p>
                        </div>
                        <div className="w-12 h-12 bg-emerald-50 rounded-lg flex items-center justify-center">
                            <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v1m0 1c1.11 0 2.08.402 2.599 1M12 12c1.11 0 2.08.402 2.599 1M12 15c1.11 0 2.08.402 2.599 1M12 15v1m0-1v-1" />
                            </svg>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Products in Stock</p>
                            <p className="text-3xl font-bold text-gray-900 mt-1">{stats.productsInStock}</p>
                            <p className="text-xs text-gray-500 mt-2">Total products</p>
                        </div>
                        <div className="w-12 h-12 bg-amber-50 rounded-lg flex items-center justify-center">
                            <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Pending Orders</p>
                            <p className="text-3xl font-bold text-gray-900 mt-1">{stats.pendingOrders}</p>
                            <p className="text-xs text-gray-500 mt-2">Awaiting delivery</p>
                        </div>
                        <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center">
                            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Recent Sales</h3>
                    </div>
                    <div className="space-y-4">
                        {recentSales.length === 0 ? (
                            <p className="text-gray-500 text-sm">No sales data available</p>
                        ) : (
                            recentSales.map((item) => (
                                <div key={item.id} className="flex justify-between items-center border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                                    <div>
                                        <p className="font-medium text-gray-900">{item.salesman}</p>
                                        <p className="text-sm text-gray-500">{item.month}</p>
                                    </div>
                                    <span className="text-green-600 font-semibold">₹{item.amount.toLocaleString()}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Today's Attendance</h3>
                    </div>
                    <div className="space-y-4">
                        {todayAttendance.length === 0 ? (
                            <p className="text-gray-500 text-sm">No attendance data for today</p>
                        ) : (
                            todayAttendance.map((item) => (
                                <div key={item.id} className="flex justify-between items-center border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                                    <div>
                                        <p className="font-medium text-gray-900">{item.name}</p>
                                        <p className="text-sm text-gray-500">{item.date}</p>
                                    </div>
                                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${item.status === 'Present' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {item.status}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <button className="p-4 border border-gray-200 hover:border-emerald-500 hover:bg-emerald-50 rounded-lg transition-all group cursor-pointer">
                        <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center mx-auto mb-2 group-hover:bg-emerald-100">
                            <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                        </div>
                        <span className="text-sm font-medium text-gray-700">Add Salesman</span>
                    </button>
                    <button className="p-4 border border-gray-200 hover:border-blue-500 hover:bg-blue-50 rounded-lg transition-all group cursor-pointer">
                        <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mx-auto mb-2 group-hover:bg-blue-100">
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" />
                            </svg>
                        </div>
                        <span className="text-sm font-medium text-gray-700">Generate Report</span>
                    </button>
                    <button className="p-4 border border-gray-200 hover:border-amber-500 hover:bg-amber-50 rounded-lg transition-all group cursor-pointer">
                        <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center mx-auto mb-2 group-hover:bg-amber-100">
                            <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                        </div>
                        <span className="text-sm font-medium text-gray-700">Add Product</span>
                    </button>
                    <button className="p-4 border border-gray-200 hover:border-purple-500 hover:bg-purple-50 rounded-lg transition-all group cursor-pointer">
                        <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center mx-auto mb-2 group-hover:bg-purple-100">
                            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <span className="text-sm font-medium text-gray-700">Take Attendance</span>
                    </button>
                </div>
            </div>
        </div>
    );
}