'use client'
import { useState } from 'react';
import DebtManagement from './DebtManagement';
import SalesmanDetails from './SalesmanDetail';
import ProductManagement from './ProductManagement';
import CompanyProductManagement from './CompanyProduct';
import AttendanceManagement from './AttendanceManagement';
import HandedGoodsManagement from './HandedGoods';
import BatteryManagement from './Battery';
import TotalSales from './TotalSales';

export default function Dashboard() {
    const [activeTab, setActiveTab] = useState('home');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    // Sample data for demonstration
    const attendanceData = [
        { id: 1, name: 'Rajesh Kumar', date: '2026-06-16', status: 'Present' },
        { id: 2, name: 'Priya Sharma', date: '2026-06-16', status: 'Absent' },
        { id: 3, name: 'Amit Patel', date: '2026-06-16', status: 'Present' },
    ];

    const handedGoodsData = [
        { id: 1, salesman: 'Rajesh Kumar', product: 'Laptop', quantity: 5, date: '2026-06-15' },
        { id: 2, salesman: 'Priya Sharma', product: 'Mobile', quantity: 10, date: '2026-06-15' },
    ];

    const totalSalesData = [
        { id: 1, salesman: 'Rajesh Kumar', amount: 250000, month: 'June 2026' },
        { id: 2, salesman: 'Priya Sharma', amount: 180000, month: 'June 2026' },
    ];

    const transportedGoodsData = [
        { id: 1, product: 'Electronics', quantity: 50, from: 'Warehouse A', to: 'Store B', date: '2026-06-16' },
        { id: 2, product: 'Furniture', quantity: 20, from: 'Warehouse B', to: 'Store C', date: '2026-06-15' },
    ];

    const boughtProductsData = [
        { id: 1, product: 'Raw Materials', supplier: 'Supplier A', quantity: 100, cost: 50000, date: '2026-06-16' },
        { id: 2, product: 'Packaging', supplier: 'Supplier B', quantity: 200, cost: 25000, date: '2026-06-15' },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'home':
                return (
                    <div>
                        <div className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-900">Dashboard Overview</h2>
                            <p className="text-sm text-gray-500 mt-1">Welcome back, Admin. Here's what's happening with your business today.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-gray-500">Total Salesmen</p>
                                        <p className="text-3xl font-bold text-gray-900 mt-1">24</p>
                                        <p className="text-xs text-green-600 mt-2">↑ 12% from last month</p>
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
                                        <p className="text-3xl font-bold text-gray-900 mt-1">₹45,000</p>
                                        <p className="text-xs text-green-600 mt-2">↑ 8.5% from yesterday</p>
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
                                        <p className="text-3xl font-bold text-gray-900 mt-1">1,240</p>
                                        <p className="text-xs text-amber-600 mt-2">↓ 3% from last week</p>
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
                                        <p className="text-3xl font-bold text-gray-900 mt-1">18</p>
                                        <p className="text-xs text-red-600 mt-2">↑ 5 new today</p>
                                    </div>
                                    <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center">
                                        <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold text-gray-900">Recent Sales</h3>
                                    <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">View All</button>
                                </div>
                                <div className="space-y-4">
                                    {totalSalesData.slice(0, 3).map((item) => (
                                        <div key={item.id} className="flex justify-between items-center border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                                            <div>
                                                <p className="font-medium text-gray-900">{item.salesman}</p>
                                                <p className="text-sm text-gray-500">{item.month}</p>
                                            </div>
                                            <span className="text-green-600 font-semibold">₹{item.amount.toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold text-gray-900">Today's Attendance</h3>
                                    <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">View All</button>
                                </div>
                                <div className="space-y-4">
                                    {attendanceData.slice(0, 3).map((item) => (
                                        <div key={item.id} className="flex justify-between items-center border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                                            <div>
                                                <p className="font-medium text-gray-900">{item.name}</p>
                                                <p className="text-sm text-gray-500">{item.date}</p>
                                            </div>
                                            <span className={`px-3 py-1 text-xs font-medium rounded-full ${item.status === 'Present' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {item.status}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <button
                                    className="p-4 border border-gray-200 hover:border-emerald-500 hover:bg-emerald-50 rounded-lg transition-all group"
                                >
                                    <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center mx-auto mb-2 group-hover:bg-emerald-100">
                                        <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                        </svg>
                                    </div>
                                    <span className="text-sm font-medium text-gray-700">Add Salesman</span>
                                </button>
                                <button className="p-4 border border-gray-200 hover:border-blue-500 hover:bg-blue-50 rounded-lg transition-all group">
                                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mx-auto mb-2 group-hover:bg-blue-100">
                                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" />
                                        </svg>
                                    </div>
                                    <span className="text-sm font-medium text-gray-700">Generate Report</span>
                                </button>
                                <button className="p-4 border border-gray-200 hover:border-amber-500 hover:bg-amber-50 rounded-lg transition-all group">
                                    <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center mx-auto mb-2 group-hover:bg-amber-100">
                                        <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                        </svg>
                                    </div>
                                    <span className="text-sm font-medium text-gray-700">Add Product</span>
                                </button>
                                <button className="p-4 border border-gray-200 hover:border-purple-500 hover:bg-purple-50 rounded-lg transition-all group">
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
            case 'salesman-details':
                return <SalesmanDetails />;

            case 'products':
                return <ProductManagement />;

            case 'debts':
                return <DebtManagement />;

            case 'company-products':
                return <CompanyProductManagement />;

            case 'attendance':
                return <AttendanceManagement />;

            case 'handed-goods':
                return <HandedGoodsManagement />;

            case 'batteries':
                return <BatteryManagement />;

            case 'total-sales':
                return <TotalSales />;

            case 'transported-goods':
                return (
                    <div>
                        <div className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-900">Transported Goods</h2>
                            <p className="text-sm text-gray-500 mt-1">Track goods movement between locations</p>
                        </div>
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">From</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">To</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {transportedGoodsData.map((item) => (
                                            <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.id}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.product}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.quantity}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.from}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.to}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.date}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                );
            case 'bought-products':
                return (
                    <div>
                        <div className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-900">Bought Products</h2>
                            <p className="text-sm text-gray-500 mt-1">Track all product purchases and suppliers</p>
                        </div>
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {boughtProductsData.map((item) => (
                                            <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.id}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.product}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.supplier}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.quantity}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">₹{item.cost.toLocaleString()}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.date}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                );
            default:
                return <div>Select an option</div>;
        }
    };

    const menuItems = [
        { id: 'home', label: 'Home', icon: '🏠' },
        { id: 'salesman-details', label: 'Salesman Details', icon: '👤' },
        { id: 'attendance', label: 'Attendance Tracker', icon: '📋' },
        { id: 'handed-goods', label: 'Handed Goods', icon: '📦' },
        { id: 'debts', label: 'Debt Management', icon: '💰' },
        { id: 'company-products', label: 'Company Products', icon: '🏭' },
        { id: 'total-sales', label: 'Total Sales', icon: '💰' },
        { id: 'products', label: 'Products', icon: '📦' },
        { id: 'batteries', label: 'Battery', icon: '🔋' },
        { id: 'transported-goods', label: 'Transported Goods', icon: '🚚' },
        { id: 'bought-products', label: 'Bought Products', icon: '🛒' },
    ];

    return (
        <div className="flex h-screen bg-gray-50">
            {/* Sidebar */}
            <div className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-white border-r border-gray-200 transition-all duration-300 flex flex-col shadow-sm`}>
                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                    {isSidebarOpen ? (
                        <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                                <span className="text-white font-bold text-sm">A</span>
                            </div>
                            <h1 className="text-lg font-semibold text-gray-900">Admin Panel</h1>
                        </div>
                    ) : (
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mx-auto">
                            <span className="text-white font-bold text-sm">A</span>
                        </div>
                    )}
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="p-1 rounded hover:bg-gray-100 text-gray-500"
                    >
                        {isSidebarOpen ? '◀' : '▶'}
                    </button>
                </div>

                <nav className="flex-1 overflow-y-auto py-4 px-3">
                    {menuItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`w-full flex items-center px-3 py-2.5 text-sm rounded-lg transition-all ${activeTab === item.id
                                ? 'bg-blue-50 text-blue-700 font-medium'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                }`}
                        >
                            <span className="text-lg mr-3">{item.icon}</span>
                            {isSidebarOpen && <span>{item.label}</span>}
                        </button>
                    ))}
                </nav>

                <div className="p-4 border-t border-gray-200">
                    {isSidebarOpen ? (
                        <div className="flex items-center">
                            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                                <span className="text-sm font-medium text-gray-700">A</span>
                            </div>
                            <div className="ml-3">
                                <p className="text-sm font-medium text-gray-900">Admin</p>
                                <p className="text-xs text-gray-500">admin@example.com</p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex justify-center">
                            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                                <span className="text-sm font-medium text-gray-700">A</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto">
                <header className="bg-white border-b border-gray-200 p-4 flex justify-between items-center sticky top-0 z-10">
                    <h1 className="text-xl font-semibold text-gray-900">
                        {menuItems.find(item => item.id === activeTab)?.label || 'Dashboard'}
                    </h1>
                    <div className="flex items-center space-x-3">
                        <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 relative">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                        </button>
                        <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </button>
                        <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                        </button>
                    </div>
                </header>

                <main className="p-6">
                    {renderContent()}
                </main>
            </div>
        </div>
    );
}