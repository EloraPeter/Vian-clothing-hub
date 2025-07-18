
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/router';
import Navbar from '@/components/Navbar';
import ProfileUploader from '@/components/ProfileUploader';

export default function AdminPage() {
    const router = useRouter();
    const [orders, setOrders] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [avatarFile, setAvatarFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [productData, setProductData] = useState({
        name: '',
        price: '',
        description: '',
        category: '',
        imageFile: null,
    });
    const [productPreviewUrl, setProductPreviewUrl] = useState(null);
    const [productUploading, setProductUploading] = useState(false);

    useEffect(() => {
        const { data: authListener } = supabase.auth.onAuthStateChange((_, session) => {
            if (!session) {
                router.push('/login');
            } else {
                setUser(session.user);
            }
        });
        return () => authListener.subscription?.unsubscribe();
    }, [router]);

    useEffect(() => {
        if (!user) return;

        async function fetchProfile() {
            const { data, error } = await supabase
                .from('profiles')
                .select('email, avatar_url')
                .eq('id', user.id)
                .maybeSingle();

            if (error) {
                setError(error.message);
            } else {
                setProfile(data || { email: user.email, avatar_url: null });
            }
        }

        async function fetchData() {
            setLoading(true);
            const [{ data: orderData, error: orderError }, { data: productData, error: productError }] = await Promise.all([
                supabase.from('custom_orders').select('*').order('created_at', { ascending: false }),
                supabase.from('products').select('*').order('created_at', { ascending: false }),
            ]);

            if (orderError) setError(orderError.message);
            else setOrders(orderData || []);

            if (productError) setError(productError.message);
            else setProducts(productData || []);

            setLoading(false);
        }

        fetchProfile();
        fetchData();
    }, [user]);

    async function updateStatus(id, newStatus) {
        const { error } = await supabase
            .from('custom_orders')
            .update({ status: newStatus })
            .eq('id', id);
        if (error) {
            alert('Error updating status: ' + error.message);
        } else {
            setOrders((prev) =>
                prev.map((order) =>
                    order.id === id ? { ...order, status: newStatus } : order
                )
            );
        }
    }

    const handleAvatarChange = async () => {
        if (!avatarFile) return;

        setUploading(true);
        try {
            const fileExt = avatarFile.name.split('.').pop();
            const fileName = `${user.id}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage.from('avatars').update(filePath, avatarFile);

            if (uploadError && uploadError.message.includes('The resource was not found')) {
                const { error: firstUploadError } = await supabase.storage.from('avatars').upload(filePath, avatarFile);
                if (firstUploadError) throw new Error('Upload failed: ' + firstUploadError.message);
            }

            if (uploadError) {
                throw new Error('Upload failed: ' + uploadError.message);
            }

            const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
            const avatar_url = data.publicUrl;

            const { error } = await supabase
                .from('profiles')
                .upsert({ id: user.id, email: profile.email, avatar_url });

            if (error) {
                throw new Error('Profile update failed: ' + error.message);
            }

            setProfile((prev) => ({ ...prev, avatar_url }));
            setPreviewUrl(null);
            setAvatarFile(null);
            alert('Profile picture updated successfully');
        } catch (error) {
            alert(error.message);
        } finally {
            setUploading(false);
        }
    };

    const handleProductChange = (e) => {
        const { name, value, files } = e.target;
        if (name === 'imageFile') {
            const file = files[0];
            if (file) {
                setProductData((prev) => ({ ...prev, imageFile: file }));
                setProductPreviewUrl(URL.createObjectURL(file));
            }
        } else {
            setProductData((prev) => ({ ...prev, [name]: value }));
        }
    };

    const handleProductSubmit = async (e) => {
        e.preventDefault();
        if (!productData.name || !productData.price || !productData.description || !productData.imageFile) {
            alert('Please fill in all required fields and select an image.');
            return;
        }

        setProductUploading(true);
        try {
            const fileExt = productData.imageFile.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
            const filePath = `products/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('products')
                .upload(filePath, productData.imageFile);

            if (uploadError) {
                throw new Error('Image upload failed: ' + uploadError.message);
            }

            const { data: urlData } = supabase.storage.from('products').getPublicUrl(filePath);
            const image_url = urlData.publicUrl;

            const { error: insertError } = await supabase.from('products').insert({
                name: productData.name,
                price: parseFloat(productData.price),
                description: productData.description,
                category: productData.category || null,
                image_url,
                is_on_sale: false,
                discount_percentage: 0,
                is_out_of_stock: false,
                is_new: false,
            });

            if (insertError) {
                throw new Error('Product insert failed: ' + insertError.message);
            }

            setProductData({ name: '', price: '', description: '', category: '', imageFile: null });
            setProductPreviewUrl(null);
            setProducts((prev) => [
                {
                    name: productData.name,
                    price: parseFloat(productData.price),
                    description: productData.description,
                    category: productData.category || null,
                    image_url,
                    is_on_sale: false,
                    discount_percentage: 0,
                    is_out_of_stock: false,
                    is_new: false,
                },
                ...prev,
            ]);
            alert('Product added successfully!');
        } catch (error) {
            alert(error.message);
        } finally {
            setProductUploading(false);
        }
    };

    const handleDeleteProduct = async (id) => {
        if (!confirm(`Are you sure you want to delete product ID ${id}?`)) return;

        try {
            const { error } = await supabase.from('products').delete().eq('id', id);
            if (error) throw new Error('Delete failed: ' + error.message);

            setProducts((prev) => prev.filter((product) => product.id !== id));
            alert('Product deleted successfully!');
        } catch (error) {
            alert(error.message);
        }
    };

    const handleUpdateProductFlags = async (id, updates) => {
        try {
            const { error } = await supabase.from('products').update(updates).eq('id', id);
            if (error) throw new Error('Update failed: ' + error.message);

            setProducts((prev) =>
                prev.map((product) =>
                    product.id === id ? { ...product, ...updates } : product
                )
            );
            alert('Product updated successfully!');
        } catch (error) {
            alert(error.message);
        }
    };

    if (!user) return <p className="p-6 text-center text-gray-600">Checking authentication...</p>;
    if (loading) return <p className="p-6 text-center text-gray-600">Loading data...</p>;
    if (error) return <p className="p-6 text-center text-red-600">Error: {error}</p>;

    return (
        <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            <Navbar profile={profile} />
            <div className="max-w-7xl mx-auto px-4 py-12">
                <h1 className="text-4xl font-extrabold mb-8 text-purple-800 text-center tracking-tight">
                    Admin Dashboard
                </h1>
                <p className="text-lg text-gray-700 text-center mb-8">Welcome, {profile?.email}</p>

                <div className="mb-12 bg-white p-8 rounded-2xl shadow-xl max-w-lg mx-auto transform hover:scale-[1.02] transition-transform duration-300">
                    <h2 className="text-2xl font-bold text-purple-800 mb-6">Update Profile Picture</h2>
                    <div className="flex flex-col items-center space-y-6">
                        <div className="relative">
                            {previewUrl || profile?.avatar_url ? (
                                <img
                                    src={previewUrl || profile.avatar_url}
                                    alt="Avatar"
                                    className="w-24 h-24 rounded-full object-cover border-4 border-purple-200 shadow-md"
                                />
                            ) : (
                                <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-sm font-medium shadow-md">
                                    No Picture
                                </div>
                            )}
                            {uploading && (
                                <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50 rounded-full">
                                    <svg className="animate-spin h-6 w-6 text-white" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                    </svg>
                                </div>
                            )}
                        </div>
                        <label className="w-full max-w-xs">
                            <span className="block text-sm font-medium text-gray-700 mb-2">Choose New Picture</span>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                    const file = e.target.files[0];
                                    if (file) {
                                        setAvatarFile(file);
                                        setPreviewUrl(URL.createObjectURL(file));
                                    }
                                }}
                                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 transition-colors"
                                disabled={uploading}
                            />
                        </label>
                        <button
                            onClick={handleAvatarChange}
                            disabled={uploading || !avatarFile}
                            className={`w-full max-w-xs py-3 rounded-lg font-semibold text-white transition-all duration-300 ${
                                uploading || !avatarFile
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-purple-600 hover:bg-purple-700 shadow-lg hover:shadow-xl'
                            }`}
                        >
                            {uploading ? 'Uploading...' : 'Update Picture'}
                        </button>
                    </div>
                </div>

                <div className="mb-12 bg-white p-8 rounded-2xl shadow-xl max-w-lg mx-auto transform hover:scale-[1.02] transition-transform duration-300">
                    <h2 className="text-2xl font-bold text-purple-800 mb-6">Add New Product</h2>
                    <div className="flex flex-col space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                            <input
                                type="text"
                                name="name"
                                value={productData.name}
                                onChange={handleProductChange}
                                className="w-full p-2 border border-gray-300 rounded-lg text-gray-700 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                                placeholder="Enter product name"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Price (₦)</label>
                            <input
                                type="number"
                                name="price"
                                value={productData.price}
                                onChange={handleProductChange}
                                className="w-full p-2 border border-gray-300 rounded-lg text-gray-700 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                                placeholder="Enter price"
                                min="0"
                                step="0.01"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <textarea
                                name="description"
                                value={productData.description}
                                onChange={handleProductChange}
                                className="w-full p-2 border border-gray-300 rounded-lg text-gray-700 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                                placeholder="Enter product description"
                                rows="4"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                            <select
                                name="category"
                                value={productData.category}
                                onChange={handleProductChange}
                                className="w-full p-2 border border-gray-300 rounded-lg text-gray-700 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                            >
                                <option value="">Select a category (optional)</option>
                                <option value="dresses">Dresses</option>
                                <option value="tops">Tops</option>
                                <option value="shirts">Shirts</option>
                                <option value="accessories">Accessories</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Product Image</label>
                            <input
                                type="file"
                                name="imageFile"
                                accept="image/*"
                                onChange={handleProductChange}
                                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 transition-colors"
                                disabled={productUploading}
                            />
                            {productPreviewUrl && (
                                <img
                                    src={productPreviewUrl}
                                    alt="Product Preview"
                                    className="mt-4 w-24 h-24 object-cover rounded-lg border-2 border-gray-300"
                                />
                            )}
                        </div>
                        <button
                            onClick={handleProductSubmit}
                            disabled={productUploading}
                            className={`w-full py-3 rounded-lg font-semibold text-white transition-all duration-300 ${
                                productUploading
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-purple-600 hover:bg-purple-700 shadow-lg hover:shadow-xl'
                            }`}
                        >
                            {productUploading ? 'Uploading...' : 'Add Product'}
                        </button>
                    </div>
                </div>

                <div className="mb-12 bg-white p-8 rounded-2xl shadow-xl max-w-6xl mx-auto">
                    <h2 className="text-2xl font-bold text-purple-800 mb-6">Manage Products</h2>
                    {products.length === 0 ? (
                        <p className="text-center text-gray-600 text-lg">No products available.</p>
                    ) : (
                        <div className="space-y-6">
                            {products.map((product) => (
                                <div
                                    key={product.id}
                                    className="bg-white p-6 rounded-2xl shadow-md hover:shadow-lg transition-shadow duration-300 border border-gray-300"
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                                        <div className="flex items-center space-x-4">
                                            <img
                                                src={product.image_url}
                                                alt={product.name}
                                                className="w-16 h-16 object-cover rounded-lg border-2 border-gray-300"
                                            />
                                            <div>
                                                <h3 className="font-semibold text-lg text-purple-800">{product.name}</h3>
                                                <p className="text-gray-600">
                                                    Price: ₦{Number(product.price).toLocaleString()}
                                                    {product.discount_percentage > 0 &&
                                                        ` (Discounted: ₦${(
                                                            product.price *
                                                            (1 - product.discount_percentage / 100)
                                                        ).toLocaleString()})`}
                                                </p>
                                                <p className="text-gray-600">{product.description}</p>
                                                <p className="text-gray-600">
                                                    Category: {product.category || 'None'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col space-y-2 mt-4 sm:mt-0">
                                            <div className="flex flex-wrap gap-2">
                                                <button
                                                    onClick={() =>
                                                        handleUpdateProductFlags(product.id, {
                                                            is_on_sale: !product.is_on_sale,
                                                        })
                                                    }
                                                    className={`px-3 py-1 rounded-lg text-sm font-semibold ${
                                                        product.is_on_sale
                                                            ? 'bg-red-600 text-white'
                                                            : 'bg-purple-600 text-white hover:bg-purple-700'
                                                    }`}
                                                >
                                                    {product.is_on_sale ? 'Remove Sale' : 'Mark as On Sale'}
                                                </button>
                                                <button
                                                    onClick={() =>
                                                        handleUpdateProductFlags(product.id, {
                                                            is_out_of_stock: !product.is_out_of_stock,
                                                        })
                                                    }
                                                    className={`px-3 py-1 rounded-lg text-sm font-semibold ${
                                                        product.is_out_of_stock
                                                            ? 'bg-red-600 text-white'
                                                            : 'bg-purple-600 text-white hover:bg-purple-700'
                                                    }`}
                                                >
                                                    {product.is_out_of_stock
                                                        ? 'Mark as In Stock'
                                                        : 'Mark as Out of Stock'}
                                                </button>
                                                <button
                                                    onClick={() =>
                                                        handleUpdateProductFlags(product.id, {
                                                            is_new: !product.is_new,
                                                        })
                                                    }
                                                    className={`px-3 py-1 rounded-lg text-sm font-semibold ${
                                                        product.is_new
                                                            ? 'bg-red-600 text-white'
                                                            : 'bg-purple-600 text-white hover:bg-purple-700'
                                                    }`}
                                                >
                                                    {product.is_new ? 'Remove New' : 'Mark as New'}
                                                </button>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    placeholder="Discount %"
                                                    value={product.discount_percentage || 0}
                                                    onChange={(e) =>
                                                        handleUpdateProductFlags(product.id, {
                                                            discount_percentage: parseFloat(e.target.value) || 0,
                                                        })
                                                    }
                                                    className="w-24 p-1 border border-gray-300 rounded-lg text-gray-700 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                                                />
                                                <button
                                                    onClick={() => handleDeleteProduct(product.id)}
                                                    className="px-3 py-1 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <button
                    className="mb-8 bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors shadow-md"
                    onClick={async () => {
                        await supabase.auth.signOut();
                        router.push('/login');
                    }}
                >
                    Log Out
                </button>

                {orders.length === 0 && (
                    <p className="text-center text-gray-600 text-lg">No orders yet.</p>
                )}

                <div className="max-w-6xl mx-auto space-y-6">
                    {orders.map((order) => (
                        <div
                            key={order.id}
                            className="bg-white p-6 rounded-2xl shadow-md hover:shadow-lg transition-shadow duration-300"
                        >
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="font-semibold text-xl text-gray-800">{order.full_name}</h2>
                                <select
                                    value={order.status}
                                    onChange={(e) => updateStatus(order.id, e.target.value)}
                                    className="border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-700 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                                >
                                    <option value="pending">Pending</option>
                                    <option value="in progress">In Progress</option>
                                    <option value="completed">Completed</option>
                                    <option value="cancelled">Cancelled</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-gray-600">
                                <p><strong>Phone:</strong> {order.phone}</p>
                                <p><strong>Email:</strong> {order.email || '—'}</p>
                                <p><strong>Fabric:</strong> {order.fabric}</p>
                                <p><strong>Style:</strong> {order.style}</p>
                                <p><strong>Measurements:</strong> {order.measurements || '—'}</p>
                                <p><strong>Notes:</strong> {order.additional_notes || '—'}</p>
                                <p className="sm:col-span-2"><strong>Address:</strong> {order.address}</p>
                            </div>
                            <p className="text-sm text-gray-500 mt-4">
                                Ordered on: {new Date(order.created_at).toLocaleString()}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </main>
    );
}
