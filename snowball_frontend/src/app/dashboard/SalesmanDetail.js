'use client'
import { useState, useEffect, useCallback } from 'react';
import { postData } from '@/Services';
import { saveCache, getCache, clearCache } from './ComponentCache';

const FIELDS = [
    { key: 'salesmanid', label: 'Salesman ID', editable: false, addMode: false },
    { key: 'fullname', label: 'Full Name', editable: true, addMode: true },
    { key: 'fathername', label: 'Father Name', editable: true, addMode: true },
    { key: 'mothername', label: 'Mother Name', editable: true, addMode: true },
    { key: 'dob', label: 'Date of Birth', editable: true, addMode: true, type: 'date' },
    { key: 'age', label: 'Age', editable: false, addMode: false },
    { key: 'married', label: 'Married', editable: true, addMode: true, type: 'select', options: ['Yes', 'No'] },
    { key: 'permanentaddress', label: 'Permanent Address', editable: true, addMode: true },
    { key: 'currentaddress', label: 'Current Address', editable: true, addMode: true },
    { key: 'mobileno', label: 'Mobile Number', editable: true, addMode: true },
    { key: 'emergencymobileno', label: 'Emergency Mobile', editable: true, addMode: true },
    { key: 'whatsappno', label: 'WhatsApp Number', editable: true, addMode: true },
    { key: 'bankname', label: 'Bank Name', editable: true, addMode: true },
    { key: 'accountno', label: 'Account Number', editable: true, addMode: true },
    { key: 'ifsccode', label: 'IFSC Code', editable: true, addMode: true },
    { key: 'aadharno', label: 'Aadhar Number', editable: true, addMode: true },
    { key: 'panno', label: 'PAN Number', editable: true, addMode: true },
    { key: 'licenseno', label: 'License Number', editable: true, addMode: true },
    { key: 'createdat', label: 'Created At', editable: false, addMode: false },
    { key: 'updatedat', label: 'Updated At', editable: false, addMode: false },
];

const CATEGORIES = [
    { name: 'Personal Information', fields: ['fullname', 'fathername', 'mothername', 'dob', 'age', 'married'] },
    { name: 'Address Details', fields: ['permanentaddress', 'currentaddress'] },
    { name: 'Contact Information', fields: ['mobileno', 'emergencymobileno', 'whatsappno'] },
    { name: 'Identity Documents', fields: ['aadharno', 'panno', 'licenseno'] },
    { name: 'Other', fields: ['salesmanid', 'createdat', 'updatedat'] },
];

// Helper functions
const calculateAge = (dob) => {
    if (!dob) return '';
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
};

const formatPhoneNumber = (value) => {
    if (!value) return '';
    let digits = value.replace(/\D/g, '');
    digits = digits.replace(/^91/, '');
    digits = digits.slice(0, 10);
    return digits ? `+91 ${digits}` : '+91 ';
};

const validateAadhar = (value) => {
    if (!value) return '';
    const digits = value.replace(/\D/g, '');
    if (digits.length > 0 && digits.length !== 12) {
        return 'Aadhar must be 12 digits';
    }
    return '';
};

export default function SalesmanDetails({ cacheKey }) {
    const cachedData = cacheKey ? getCache(cacheKey) : null;

    const [salesmen, setSalesmen] = useState(cachedData?.salesmen || []);
    const [loading, setLoading] = useState(!cachedData);
    const [selectedSalesman, setSelectedSalesman] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [isAddMode, setIsAddMode] = useState(false);
    const [formData, setFormData] = useState({});
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [formErrors, setFormErrors] = useState({});

    const [imageFiles, setImageFiles] = useState({
        photo: null, idproof: null, salesmansignature: null, ownersignature: null
    });
    const [imagePreviews, setImagePreviews] = useState({
        photo: null, idproof: null, salesmansignature: null, ownersignature: null
    });

    const [toastMessage, setToastMessage] = useState('');
    const [toastVisible, setToastVisible] = useState(false);
    const [confirmVisible, setConfirmVisible] = useState(false);
    const [confirmMessage, setConfirmMessage] = useState('');
    const [confirmAction, setConfirmAction] = useState(null);

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

    const fetchSalesmen = useCallback(async () => {
        setLoading(true);
        try {
            const result = await postData('employee/retrieve-salesman', {});
            if (result?.status) {
                setSalesmen(result.data);
            }
        } catch (error) {
            console.error('Error fetching salesmen:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!cachedData) {
            fetchSalesmen();
        }
    }, [fetchSalesmen, cachedData]);

    useEffect(() => {
        return () => {
            if (cacheKey) saveCache(cacheKey, { salesmen });
        };
    }, [cacheKey, salesmen]);

    const handleAddClick = useCallback(() => {
        setFormData({
            fullname: '', fathername: '', mothername: '', dob: '', age: '',
            married: 'No', permanentaddress: '', currentaddress: '',
            mobileno: '', emergencymobileno: '', whatsappno: '',
            bankname: '', accountno: '', ifsccode: '',
            aadharno: '', panno: '', licenseno: ''
        });
        setFormErrors({});
        setImageFiles({ photo: null, idproof: null, salesmansignature: null, ownersignature: null });
        setImagePreviews({ photo: null, idproof: null, salesmansignature: null, ownersignature: null });
        setIsAddMode(true);
        setIsEditMode(false);
        setSelectedSalesman(null);
        setIsModalOpen(true);
    }, []);

    const handleCardClick = useCallback((salesman) => {
        setSelectedSalesman(salesman);
        setFormData({
            ...salesman,
            // Ensure phone numbers always have +91 when displayed
            mobileno: salesman.mobileno ? (salesman.mobileno.startsWith('+91') ? salesman.mobileno : `+91 ${salesman.mobileno}`) : '',
            emergencymobileno: salesman.emergencymobileno ? (salesman.emergencymobileno.startsWith('+91') ? salesman.emergencymobileno : `+91 ${salesman.emergencymobileno}`) : '',
            whatsappno: salesman.whatsappno ? (salesman.whatsappno.startsWith('+91') ? salesman.whatsappno : `+91 ${salesman.whatsappno}`) : '',
        });
        setFormErrors({});
        setImageFiles({ photo: null, idproof: null, salesmansignature: null, ownersignature: null });
        setImagePreviews({
            photo: salesman.photo || null,
            idproof: salesman.idproof || null,
            salesmansignature: salesman.salesmansignature || null,
            ownersignature: salesman.ownersignature || null
        });
        setIsEditMode(false);
        setIsAddMode(false);
        setIsModalOpen(true);
    }, []);

    const handleEdit = useCallback(() => {
        setIsEditMode(true);
        setIsAddMode(false);
    }, []);

    const handleInputChange = useCallback((e) => {
        const { name, value } = e.target;

        // Auto-calculate age when DOB changes
        if (name === 'dob') {
            const age = calculateAge(value);
            setFormData(prev => ({ ...prev, dob: value, age: age }));
            return;
        }

        // Format phone numbers with +91
        if (name === 'mobileno' || name === 'emergencymobileno' || name === 'whatsappno') {
            const formatted = formatPhoneNumber(value);
            setFormData(prev => ({ ...prev, [name]: formatted }));
            // Clear error for this field
            setFormErrors(prev => ({ ...prev, [name]: '' }));
            return;
        }

        // Aadhar validation
        if (name === 'aadharno') {
            const digits = value.replace(/\D/g, '').slice(0, 12);
            setFormData(prev => ({ ...prev, [name]: digits }));
            setFormErrors(prev => ({ ...prev, aadharno: validateAadhar(digits) }));
            return;
        }

        setFormData(prev => ({ ...prev, [name]: value }));
    }, []);

    const validateForm = useCallback(() => {
        const errors = {};
        const phone = formData.mobileno?.replace(/\D/g, '').replace(/^91/, '') || '';
        const emergency = formData.emergencymobileno?.replace(/\D/g, '').replace(/^91/, '') || '';
        const whatsapp = formData.whatsappno?.replace(/\D/g, '').replace(/^91/, '') || '';
        const aadhar = formData.aadharno?.replace(/\D/g, '') || '';

        if (phone && phone.length !== 10) errors.mobileno = 'Mobile must be 10 digits';
        if (emergency && emergency.length !== 10) errors.emergencymobileno = 'Emergency mobile must be 10 digits';
        if (whatsapp && whatsapp.length !== 10) errors.whatsappno = 'WhatsApp must be 10 digits';
        if (aadhar && aadhar.length !== 12) errors.aadharno = 'Aadhar must be 12 digits';

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    }, [formData]);

    const handleImageChange = useCallback((e, fieldName) => {
        const file = e.target.files[0];
        if (file) {
            setImageFiles(prev => ({ ...prev, [fieldName]: file }));
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreviews(prev => ({ ...prev, [fieldName]: reader.result }));
            };
            reader.readAsDataURL(file);
        }
    }, []);

    const handleRemoveImage = useCallback((fieldName) => {
        setImageFiles(prev => ({ ...prev, [fieldName]: null }));
        setImagePreviews(prev => ({ ...prev, [fieldName]: null }));
    }, []);

    const handleSave = useCallback(async () => {
        if (!validateForm()) return;

        try {
            setSaving(true);
            const formDataWithImages = new FormData();
            Object.keys(formData).forEach(key => {
                if (formData[key] !== null && formData[key] !== '') {
                    formDataWithImages.append(key, formData[key]);
                }
            });
            if (imageFiles.photo) formDataWithImages.append('photo', imageFiles.photo);
            if (imageFiles.idproof) formDataWithImages.append('idproof', imageFiles.idproof);
            if (imageFiles.salesmansignature) formDataWithImages.append('salesmansignature', imageFiles.salesmansignature);
            if (imageFiles.ownersignature) formDataWithImages.append('ownersignature', imageFiles.ownersignature);

            let result;
            if (isAddMode) {
                result = await postData('employee/insert-salesman', formDataWithImages);
                if (result?.status) {
                    clearCache(cacheKey);
                    showToast('Salesman added successfully!');
                    setIsModalOpen(false);
                    fetchSalesmen();
                } else {
                    showToast(result?.message || 'Failed to add salesman');
                }
            } else {
                result = await postData('employee/update-salesman', formDataWithImages);
                if (result?.status) {
                    clearCache(cacheKey);
                    showToast('Salesman updated successfully!');
                    setIsEditMode(false);
                    fetchSalesmen();
                    const updated = await postData('employee/retrieve-salesman', { salesmanid: formData.salesmanid });
                    if (updated?.status) {
                        const updatedData = updated.data[0];
                        setSelectedSalesman(updatedData);
                        setFormData({
                            ...updatedData,
                            mobileno: updatedData.mobileno ? updatedData.mobileno.replace(/^\+91\s?/, '') : '',
                            emergencymobileno: updatedData.emergencymobileno ? updatedData.emergencymobileno.replace(/^\+91\s?/, '') : '',
                            whatsappno: updatedData.whatsappno ? updatedData.whatsappno.replace(/^\+91\s?/, '') : '',
                        });
                        setImagePreviews({
                            photo: updatedData.photo || null,
                            idproof: updatedData.idproof || null,
                            salesmansignature: updatedData.salesmansignature || null,
                            ownersignature: updatedData.ownersignature || null
                        });
                    }
                } else {
                    showToast(result?.message || 'Failed to update');
                }
            }
        } catch (error) {
            console.error('Error saving salesman:', error);
            showToast('Error saving salesman');
        } finally {
            setSaving(false);
        }
    }, [formData, imageFiles, isAddMode, cacheKey, showToast, fetchSalesmen, validateForm]);

    const performDelete = useCallback(async () => {
        try {
            setDeleting(true);
            const result = await postData('employee/delete-salesman', { salesmanid: selectedSalesman.salesmanid });
            if (result?.status) {
                clearCache(cacheKey);
                showToast('Salesman deleted successfully!');
                setIsModalOpen(false);
                fetchSalesmen();
            } else {
                showToast(result?.message || 'Failed to delete');
            }
        } catch (error) {
            console.error('Error deleting salesman:', error);
            showToast('Error deleting salesman');
        } finally {
            setDeleting(false);
        }
    }, [selectedSalesman, cacheKey, showToast, fetchSalesmen]);

    const handleDelete = useCallback(() => {
        showConfirm('Are you sure you want to delete this salesman?', performDelete);
    }, [showConfirm, performDelete]);

    const handleCancelEdit = useCallback(() => {
        setIsEditMode(false);
        setFormData({
            ...selectedSalesman,
            mobileno: selectedSalesman.mobileno ? (selectedSalesman.mobileno.startsWith('+91') ? selectedSalesman.mobileno : `+91 ${selectedSalesman.mobileno}`) : '',
            emergencymobileno: selectedSalesman.emergencymobileno ? (selectedSalesman.emergencymobileno.startsWith('+91') ? selectedSalesman.emergencymobileno : `+91 ${selectedSalesman.emergencymobileno}`) : '',
            whatsappno: selectedSalesman.whatsappno ? (selectedSalesman.whatsappno.startsWith('+91') ? selectedSalesman.whatsappno : `+91 ${selectedSalesman.whatsappno}`) : '',
        });
        setFormErrors({});
        setImagePreviews({
            photo: selectedSalesman.photo || null,
            idproof: selectedSalesman.idproof || null,
            salesmansignature: selectedSalesman.salesmansignature || null,
            ownersignature: selectedSalesman.ownersignature || null
        });
    }, [selectedSalesman]);

    // Render Modal
    const renderModal = useCallback(() => {
        if (!isModalOpen) return null;
        const isEditable = isEditMode || isAddMode;

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 p-4">
                <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                    <div className={`px-6 py-4 flex justify-between items-center flex-shrink-0 ${isAddMode ? 'bg-gradient-to-r from-emerald-600 to-emerald-700' : 'bg-gradient-to-r from-blue-600 to-blue-700'}`}>
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white text-xl font-bold">
                                {isAddMode ? '+' : (selectedSalesman?.fullname ? selectedSalesman.fullname.charAt(0).toUpperCase() : '?')}
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold text-white">
                                    {isAddMode ? 'Add New Salesman' : (isEditMode ? 'Edit Salesman' : 'Salesman Details')}
                                </h2>
                                {!isAddMode && <p className="text-sm text-blue-100">{selectedSalesman?.fullname}</p>}
                            </div>
                        </div>
                        <button onClick={() => setIsModalOpen(false)} className="text-white hover:text-gray-200 transition-colors cursor-pointer">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="overflow-y-auto p-6 flex-1" style={{ maxHeight: 'calc(90vh - 180px)' }}>
                        {CATEGORIES.map(category => {
                            const categoryFields = FIELDS.filter(f => category.fields.includes(f.key) && (!isAddMode || f.addMode));
                            if (categoryFields.length === 0) return null;

                            return (
                                <div key={category.name} className="mb-6">
                                    <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide border-b-2 border-black pb-2 mb-3">
                                        {category.name}
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {categoryFields.map(field => {
                                            const value = formData[field.key] || '';
                                            const isFieldEditable = isEditable && field.editable;
                                            const error = formErrors[field.key];

                                            return (
                                                <div key={field.key} className="space-y-1">
                                                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        {field.label}
                                                    </label>
                                                    {isFieldEditable ? (
                                                        <div>
                                                            {field.type === 'select' ? (
                                                                <select
                                                                    name={field.key}
                                                                    value={value}
                                                                    onChange={handleInputChange}
                                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm cursor-pointer"
                                                                >
                                                                    <option value="">Select</option>
                                                                    {field.options.map(opt => (
                                                                        <option key={opt} value={opt}>{opt}</option>
                                                                    ))}
                                                                </select>
                                                            ) : (
                                                                <input
                                                                    type={field.type || 'text'}
                                                                    name={field.key}
                                                                    value={value}
                                                                    onChange={handleInputChange}
                                                                    readOnly={field.key === 'age'}
                                                                    maxLength={
                                                                        field.key === 'aadharno' ? 12 :
                                                                            field.key === 'mobileno' || field.key === 'emergencymobileno' || field.key === 'whatsappno' ? 15 :
                                                                                undefined
                                                                    }
                                                                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${field.key === 'age' ? 'bg-gray-100 cursor-not-allowed' : 'border-gray-300'} ${error ? 'border-red-500' : ''}`}
                                                                />
                                                            )}
                                                            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
                                                        </div>
                                                    ) : (
                                                        <div className="px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-900">
                                                            {value || '-'}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}

                        {/* Image Upload / View */}
                        {(isAddMode || isEditMode) && (
                            <div className="mb-6">
                                <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide border-b border-gray-200 pb-2 mb-3">Picture Upload</h4>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    {['photo', 'idproof', 'salesmansignature', 'ownersignature'].map((field) => (
                                        <div key={field} className="space-y-2">
                                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                {field === 'photo' ? 'Photo' : field === 'idproof' ? 'ID Proof' : field === 'salesmansignature' ? 'Salesman Signature' : 'Owner Signature'}
                                            </label>
                                            {imagePreviews[field] ? (
                                                <div className="relative">
                                                    <img src={imagePreviews[field]} alt={field} className="w-full h-32 object-cover rounded-lg border border-gray-200" />
                                                    <button onClick={() => handleRemoveImage(field)} className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 cursor-pointer">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-500 transition-colors">
                                                    <input type="file" accept="image/*" onChange={(e) => handleImageChange(e, field)} className="hidden" id={`${field}-upload`} />
                                                    <label htmlFor={`${field}-upload`} className="cursor-pointer">
                                                        <svg className="w-8 h-8 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                        <p className="text-sm text-gray-500 mt-1">Click to upload</p>
                                                    </label>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* View Mode */}
                        {!isAddMode && !isEditMode && selectedSalesman && (
                            <div className="mb-6">
                                <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide border-b border-gray-200 pb-2 mb-3">Uploaded Images</h4>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    {['photo', 'idproof', 'salesmansignature', 'ownersignature'].map((field) => (
                                        selectedSalesman[field] && (
                                            <div key={field} className="space-y-1">
                                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    {field === 'photo' ? 'Photo' : field === 'idproof' ? 'ID Proof' : field === 'salesmansignature' ? 'Salesman Signature' : 'Owner Signature'}
                                                </label>
                                                <div className="px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-900">
                                                    <a href={selectedSalesman[field]} target="_blank" className="text-blue-600 hover:underline cursor-pointer">View</a>
                                                </div>
                                            </div>
                                        )
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="border-t-2 border-gray-200 px-6 py-5 flex justify-end gap-3 items-center bg-gray-50 flex-shrink-0">
                        {isAddMode ? (
                            <>
                                <button onClick={handleSave} disabled={saving} className={`px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors cursor-pointer ${saving ? 'opacity-60 cursor-not-allowed' : ''}`}>
                                    {saving ? 'Saving...' : 'Add Salesman'}
                                </button>
                                <button onClick={() => setIsModalOpen(false)} disabled={saving} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors cursor-pointer">Cancel</button>
                            </>
                        ) : (
                            <>
                                {!isEditMode ? (
                                    <>
                                        <button onClick={handleEdit} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors cursor-pointer">Edit</button>
                                        <button onClick={handleDelete} disabled={deleting} className={`px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors cursor-pointer ${deleting ? 'opacity-60 cursor-not-allowed' : ''}`}>
                                            {deleting ? 'Deleting...' : 'Delete'}
                                        </button>
                                        <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors cursor-pointer">Close</button>
                                    </>
                                ) : (
                                    <>
                                        <button onClick={handleSave} disabled={saving} className={`px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors cursor-pointer ${saving ? 'opacity-60 cursor-not-allowed' : ''}`}>
                                            {saving ? 'Saving...' : 'Save Changes'}
                                        </button>
                                        <button onClick={handleCancelEdit} disabled={saving} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors cursor-pointer">Cancel</button>
                                    </>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        );
    }, [isModalOpen, isAddMode, isEditMode, selectedSalesman, formData, formErrors, imagePreviews, saving, deleting, handleInputChange, handleImageChange, handleRemoveImage, handleSave, handleEdit, handleDelete, handleCancelEdit]);

    const renderSalesmanCards = useCallback(() => {
        if (loading) {
            return (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            );
        }
        if (salesmen.length === 0) {
            return (
                <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                    <p className="text-gray-500">No salesmen found</p>
                </div>
            );
        }
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                {salesmen.map(salesman => (
                    <div key={salesman.salesmanid} onClick={() => handleCardClick(salesman)} className="bg-white rounded-lg shadow-sm border border-gray-200 p-2 hover:shadow-md transition-all cursor-pointer hover:border-blue-400">
                        <div className="flex flex-col items-center">
                            <div className="w-30 h-30 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-3xl font-bold mb-3 overflow-hidden">
                                {salesman.photo ? (
                                    <img src={salesman.photo} alt={salesman.fullname} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.innerHTML = salesman.fullname ? salesman.fullname.charAt(0).toUpperCase() : '?'; }} />
                                ) : salesman.idproof ? (
                                    <img src={salesman.idproof} alt={salesman.fullname} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.innerHTML = salesman.fullname ? salesman.fullname.charAt(0).toUpperCase() : '?'; }} />
                                ) : (
                                    salesman.fullname ? salesman.fullname.charAt(0).toUpperCase() : '?'
                                )}
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 text-center">{salesman.fullname || 'N/A'}</h3>
                        </div>
                    </div>
                ))}
            </div>
        );
    }, [salesmen, loading, handleCardClick]);

    return (
        <div>
            {toastVisible && (
                <div className="fixed top-4 right-4 z-50 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3">
                    <span>{toastMessage}</span>
                    <button onClick={() => setToastVisible(false)} className="text-white hover:text-gray-200 font-bold text-lg leading-none cursor-pointer">×</button>
                </div>
            )}
            {confirmVisible && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-xl shadow-2xl p-6 w-96 max-w-[90%]">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm Action</h3>
                        <p className="text-sm text-gray-600 mb-6">{confirmMessage}</p>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setConfirmVisible(false)} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition-colors text-sm font-medium cursor-pointer">Cancel</button>
                            <button onClick={() => { if (confirmAction) confirmAction(); setConfirmVisible(false); }} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-medium cursor-pointer">Confirm</button>
                        </div>
                    </div>
                </div>
            )}
            <div className="mb-8 flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-semibold text-gray-900">Salesman Details</h2>
                    <p className="text-sm text-gray-500 mt-1">Manage and view all salesman information</p>
                </div>
                <button onClick={handleAddClick} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 cursor-pointer">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add Salesman
                </button>
            </div>
            {renderSalesmanCards()}
            {renderModal()}
        </div>
    );
}