'use client'
import { useState, useCallback, useMemo, useEffect } from 'react';
import DebtManagement from './DebtManagement';
import SalesmanDetails from './SalesmanDetail';
import ProductManagement from './ProductManagement';
import CompanyProductManagement from './CompanyProduct';
import AttendanceManagement from './AttendanceManagement';
import HandedGoodsManagement from './HandedGoods';
import BatteryManagement from './Battery';
import TotalSales from './TotalSales';
import ShopGoods from './Shopgoods';
import AccountManagement from './AccountManagement';
import Calculators from './Calculator';
import HomeComponent from './Home';

import {
    Home,
    Users,
    ClipboardCheck,
    PackageCheck,
    HandCoins,
    Factory,
    TrendingUp,
    Package,
    BatteryFull,
    Truck,
    Calculator
} from 'lucide-react';

const menuItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'salesman-details', label: 'Salesman Details', icon: Users },
    { id: 'attendance', label: 'Attendance Tracker', icon: ClipboardCheck },
    { id: 'handed-goods', label: 'Handed Goods', icon: PackageCheck },
    { id: 'debts', label: 'Debt Management', icon: HandCoins },
    { id: 'company-products', label: 'Company Products', icon: Factory },
    { id: 'total-sales', label: 'Total Sales', icon: TrendingUp },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'batteries', label: 'Battery', icon: BatteryFull },
    { id: 'shop-goods', label: 'Shop Goods', icon: Truck },
    { id: 'account', label: 'Salesman Account', icon: Calculator },
];

export default function Dashboard() {
    const [activeTab, setActiveTab] = useState('home');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [user, setUser] = useState(null);

    useEffect(() => {
        const storedUser = sessionStorage.getItem("user");
        if (!storedUser) {
            // window.location.href = '/login'
        }
        setUser(JSON.parse(storedUser));
    }, []);

    const toggleSidebar = useCallback(() => {
        setIsSidebarOpen(prev => !prev);
    }, []);

    const handleTabChange = useCallback((tabId) => {
        setActiveTab(tabId);
    }, []);

    const activeLabel = useMemo(
        () => menuItems.find(item => item.id === activeTab)?.label || 'Dashboard',
        [activeTab]
    );

    return (
        <div className="flex h-screen bg-gray-50">
            {/* Sidebar */}
            <div className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-white border-r border-gray-200 transition-all duration-300 flex flex-col shadow-sm`}>
                <div className="px-4 py-1 border-b border-gray-200 flex items-center justify-between">
                    {isSidebarOpen ? (
                        <div className="flex items-center space-x-2">
                            <div className="w-14 h-14 rounded-lg flex items-center justify-center">
                                <span className="text-white font-bold text-sm"><img src='snowball.png' /></span>
                            </div>
                            <h1 className="text-xl font-semibold text-gray-900">Snow Ball</h1>
                        </div>
                    ) : (
                        <div className="w-14 h-14 rounded-lg flex items-center justify-center mx-auto">
                            <span className="text-white font-bold text-sm"><img src='snowball.png' /></span>
                        </div>
                    )}
                    <button
                        onClick={toggleSidebar}
                        className="p-1 rounded hover:bg-gray-100 text-gray-500 cursor-pointer"
                    >
                        {isSidebarOpen ? '◀' : '▶'}
                    </button>
                </div>

                <nav className="flex-1 overflow-y-auto py-4 px-3">
                    {menuItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => handleTabChange(item.id)}
                            className={`w-full flex items-center px-3 py-2.5 text-sm rounded-lg transition-all cursor-pointer ${activeTab === item.id
                                ? 'bg-blue-50 text-blue-700 font-medium'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                }`}
                        >
                            <item.icon className={`${isSidebarOpen ? 'w-6 h-6 mr-5' : 'w-5 h-5'} `} />
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
                                <p className="text-sm font-medium text-gray-900">{user?.username}</p>
                                <p className="text-xs text-gray-500">{user?.email}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex justify-center">
                            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                                <span className="text-sm font-medium text-gray-700">{user?.username?.[0]?.toUpperCase()}</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto">
                <header className="bg-white border-b border-gray-200 p-4 flex justify-between items-center sticky top-0 z-10">
                    <h1 className="text-xl font-semibold text-gray-900">{activeLabel}</h1>
                    <div className="flex items-center space-x-3">
                        <Calculators />
                        <button onClick={() => { sessionStorage.removeItem('user'); window.location.href = '/login' }} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 cursor-pointer">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                        </button>
                    </div>
                </header>

                <main className="p-6">
                    <div className={activeTab === 'home' ? '' : 'hidden'}><HomeComponent cacheKey="home" /></div>
                    <div className={activeTab === 'salesman-details' ? '' : 'hidden'}><SalesmanDetails cacheKey="salesman-details" /></div>
                    <div className={activeTab === 'products' ? '' : 'hidden'}><ProductManagement cacheKey="products" /></div>
                    <div className={activeTab === 'debts' ? '' : 'hidden'}><DebtManagement cacheKey="debts" /></div>
                    <div className={activeTab === 'company-products' ? '' : 'hidden'}><CompanyProductManagement cacheKey="company-products" /></div>
                    <div className={activeTab === 'attendance' ? '' : 'hidden'}><AttendanceManagement cacheKey="attendance" /></div>
                    <div className={activeTab === 'handed-goods' ? '' : 'hidden'}><HandedGoodsManagement cacheKey="handed-goods" /></div>
                    <div className={activeTab === 'batteries' ? '' : 'hidden'}><BatteryManagement cacheKey="batteries" /></div>
                    <div className={activeTab === 'total-sales' ? '' : 'hidden'}><TotalSales cacheKey="total-sales" /></div>
                    <div className={activeTab === 'shop-goods' ? '' : 'hidden'}><ShopGoods cacheKey="shop-goods" /></div>
                    <div className={activeTab === 'account' ? '' : 'hidden'}><AccountManagement cacheKey="account" /></div>
                </main>
            </div>
        </div>
    );
}