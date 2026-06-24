'use client'
import { useState, useEffect, useCallback } from 'react';
import { postData } from '@/Services';
import { saveCache, getCache, clearCache } from './ComponentCache';

export default function ProductManagement({ cacheKey }) {
  // Restore from cache if available
  const cachedData = cacheKey ? getCache(cacheKey) : null;

  const [products, setProducts] = useState(cachedData?.products || []);
  const [loading, setLoading] = useState(!cachedData);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isAddMode, setIsAddMode] = useState(false);
  const [formData, setFormData] = useState({
    productid: '',
    productname: '',
    productprice: ''
  });
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Toast and confirmation popup states
  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
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

  // Fetch all products
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const result = await postData('product/retrieve-products', {});
      if (result?.status) {
        setProducts(result.data);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!cachedData) {
      fetchProducts();
    }
  }, [fetchProducts, cachedData]);

  // Save state to cache before unmounting
  useEffect(() => {
    return () => {
      if (cacheKey) {
        saveCache(cacheKey, {
          products,
        });
      }
    };
  }, [cacheKey, products]);

  // Handle Add button click
  const handleAddClick = useCallback(() => {
    setFormData({
      productid: '',
      productname: '',
      productprice: ''
    });
    setIsAddMode(true);
    setIsEditMode(false);
    setSelectedProduct(null);
    setIsModalOpen(true);
  }, []);

  // Handle Edit button click
  const handleEditClick = useCallback((product) => {
    setSelectedProduct(product);
    setFormData({
      productid: product.productid,
      productname: product.productname,
      productprice: product.productprice
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
      let result;
      if (isAddMode) {
        result = await postData('product/insert-product', {
          productname: formData.productname,
          productprice: formData.productprice
        });
        if (result?.status) {
          clearCache(cacheKey);
          showToast('Product added successfully!');
          setIsModalOpen(false);
          fetchProducts();
        } else {
          showToast(result?.message || 'Failed to add product');
        }
      } else {
        result = await postData('product/update-product', {
          productid: formData.productid,
          productname: formData.productname,
          productprice: formData.productprice
        });
        if (result?.status) {
          clearCache(cacheKey);
          showToast('Product updated successfully!');
          setIsModalOpen(false);
          fetchProducts();
        } else {
          showToast(result?.message || 'Failed to update product');
        }
      }
    } catch (error) {
      console.error('Error saving product:', error);
      showToast('Error saving product');
    }
  }, [isAddMode, formData, fetchProducts, showToast]);

  // Actual delete function
  const performDelete = useCallback(async (productid) => {
    try {
      const result = await postData('product/delete-product', { productid });
      if (result?.status) {
        clearCache(cacheKey);
        showToast('Product deleted successfully!');
        fetchProducts();
      } else {
        showToast(result?.message || 'Failed to delete');
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      showToast('Error deleting product');
    }
  }, [fetchProducts, showToast]);

  // Open confirmation popup for deletion
  const handleDelete = useCallback((productid) => {
    showConfirm('Are you sure you want to delete this product?', () => performDelete(productid));
  }, [showConfirm, performDelete]);

  // Render Modal
  const renderModal = () => {
    if (!isModalOpen) return null;

    return (
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4 bg-black bg-opacity-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden">
          {/* Modal Header */}
          <div className={`px-6 py-4 flex justify-between items-center ${isAddMode ? 'bg-gradient-to-r from-emerald-600 to-emerald-700' : 'bg-gradient-to-r from-blue-600 to-blue-700'}`}>
            <h2 className="text-xl font-semibold text-white">
              {isAddMode ? 'Add New Product' : 'Edit Product'}
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
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className={`px-4 py-2 text-white rounded-lg transition-colors cursor-pointer ${isAddMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600 hover:bg-blue-700'}`}
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
                <th className="px-6 py-3 text-left text-xs font-bold text-bold uppercase tracking-wider">S.No</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-bold uppercase tracking-wider">Product Name</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-bold uppercase tracking-wider">Price (₹)</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-bold uppercase tracking-wider">Actions</th>
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
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg transition-colors cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(product.productid)}
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

      <div className="mb-8 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Product Management</h2>
          <p className="text-sm text-gray-500 mt-1">Manage all products and their prices</p>
        </div>
        <button
          onClick={handleAddClick}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Product
        </button>
      </div>
      {renderProductTable()}
      {renderModal()}
    </div>
  );
}