'use client'
import { useState, useEffect } from 'react';
import { postData } from '@/Services';

export default function ProductManagement() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [isAddMode, setIsAddMode] = useState(false);
    const [formData, setFormData] = useState({
        productid: '',
        productname: '',
        productprice: ''
    });
    const [selectedProduct, setSelectedProduct] = useState(null);

    // Fetch all products
    const fetchProducts = async () => {
        setLoading(true);
        try {
            const result = await postData('product/retrieve-products', {});
            if (result && result.status) {
                setProducts(result.data);
            }
        } catch (error) {
            console.error('Error fetching products:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    // Handle Add button click
    const handleAddClick = () => {
        setFormData({
            productid: '',
            productname: '',
            productprice: ''
        });
        setIsAddMode(true);
        setIsEditMode(false);
        setSelectedProduct(null);
        setIsModalOpen(true);
    };

    // Handle Edit button click
    const handleEditClick = (product) => {
        setSelectedProduct(product);
        setFormData({
            productid: product.productid,
            productname: product.productname,
            productprice: product.productprice
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
                // Add new product
                result = await postData('product/insert-product', {
                    productname: formData.productname,
                    productprice: formData.productprice
                });
                if (result && result.status) {
                    alert('Product added successfully!');
                    setIsModalOpen(false);
                    fetchProducts();
                } else {
                    alert(result?.message || 'Failed to add product');
                }
            } else {
                // Update existing product
                result = await postData('product/update-product', {
                    productid: formData.productid,
                    productname: formData.productname,
                    productprice: formData.productprice
                });
                if (result && result.status) {
                    alert('Product updated successfully!');
                    setIsModalOpen(false);
                    fetchProducts();
                } else {
                    alert(result?.message || 'Failed to update product');
                }
            }
        } catch (error) {
            console.error('Error saving product:', error);
            alert('Error saving product');
        }
    };

    // Handle Delete
    const handleDelete = async (productid) => {
        if (!confirm('Are you sure you want to delete this product?')) return;

        try {
            const result = await postData('product/delete-product', { productid });
            if (result && result.status) {
                alert('Product deleted successfully!');
                fetchProducts();
            } else {
                alert(result?.message || 'Failed to delete');
            }
        } catch (error) {
            console.error('Error deleting product:', error);
            alert('Error deleting product');
        }
    };

    // Render Modal
    const renderModal = () => {
        if (!isModalOpen) return null;

        return (
            <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden">
                    {/* Modal Header */}
                    <div className={`px-6 py-4 flex justify-between items-center ${isAddMode ? 'bg-gradient-to-r from-emerald-600 to-emerald-700' : 'bg-gradient-to-r from-blue-600 to-blue-700'}`}>
                        <div>
                            <h2 className="text-xl font-semibold text-white">
                                {isAddMode ? 'Add New Product' : 'Edit Product'}
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
                            {/* Product Name Field */}
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700">Product Name</label>
                                <input
                                    type="text"
                                    name="productname"
                                    value={formData.productname}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                    placeholder="Enter product name"
                                />
                            </div>

                            {/* Product Price Field */}
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700">Product Price (₹)</label>
                                <input
                                    type="number"
                                    name="productprice"
                                    value={formData.productprice}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                    placeholder="Enter product price"
                                    step="0.01"
                                    min="0"
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
                            {isAddMode ? 'Add Product' : 'Update Product'}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // Render Product Table
    const renderProductTable = () => {
        if (loading) {
            return (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            );
        }

        if (products.length === 0) {
            return (
                <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                    <p className="text-gray-500">No products found</p>
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
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price (₹)</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {products.map((product, index) => (
                                <tr key={product.productid} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{product.productname}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-emerald-600">₹{parseFloat(product.productprice).toFixed(2)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleEditClick(product)}
                                                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg transition-colors"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(product.productid)}
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
        <div>
            <div className="mb-8 flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-semibold text-gray-900">Product Management</h2>
                    <p className="text-sm text-gray-500 mt-1">Manage all products and their prices</p>
                </div>
                <button
                    onClick={handleAddClick}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add Product
                </button>
            </div>
            {renderProductTable()}
            
            {/* Render Modal */}
            {renderModal()}
        </div>
    );
}