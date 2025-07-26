import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/router';
import Navbar from '@/components/Navbar';
import ProfileUploader from '@/components/ProfileUploader';
import DressLoader from '@/components/DressLoader';

export default function AdminPage() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [productOrders, setProductOrders] = useState([]);
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
    category_id: '',
    imageFiles: [],
  });
  const [editProductData, setEditProductData] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [productPreviewUrl, setProductPreviewUrl] = useState(null);
  const [productUploading, setProductUploading] = useState(false);
  const [currentProductPage, setCurrentProductPage] = useState(1);
  const [currentCustomOrderPage, setCurrentCustomOrderPage] = useState(1);
  const [currentProductOrderPage, setCurrentProductOrderPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const [orderPrices, setOrderPrices] = useState({});
  const [categories, setCategories] = useState([]);
  const [discountInputs, setDiscountInputs] = useState({});

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
      const [
        { data: customOrderData, error: customOrderError },
        { data: productOrderData, error: productOrderError },
        { data: productData, error: productError },
        { data: categoryData, error: categoryError },
      ] = await Promise.all([
        supabase.from('custom_orders').select('*').order('created_at', { ascending: false }),
        supabase.from('orders').select('*, items').order('created_at', { ascending: false }),
        supabase.from('products').select('*, categories(name)').order('created_at', { ascending: false }),
        supabase.from('categories').select('id, name, slug'),
      ]);

      if (customOrderError) setError(customOrderError.message);
      else setOrders(customOrderData || []);

      if (productOrderError) setError(productOrderError.message);
      else setProductOrders(productOrderData || []);

      if (productError) setError(productError.message);
      else setProducts(productData || []);

      if (categoryError) setError(categoryError.message);
      else setCategories(categoryData || []);

      setLoading(false);
    }

    fetchProfile();
    fetchData();
  }, [user]);

  const sendWhatsAppNotification = async (phone, text) => {
    const apiKey = '7165245';
    const url = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encodeURIComponent(text)}&apikey=${apiKey}`;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.error('Failed to send WhatsApp notification:', response.statusText);
      }
    } catch (error) {
      console.error('Error sending WhatsApp notification:', error);
    }
  };

  const sendEmailNotification = async (email, subject, body) => {
    const { error } = await supabase.functions.invoke('send-email', {
      body: { to: email, subject, html: body },
    });
    if (error) {
      console.error('Error sending email:', error.message);
    }
  };

  const createInAppNotification = async (userId, message) => {
    const { error } = await supabase.from('notifications').insert([
      {
        user_id: userId,
        message,
        created_at: new Date().toISOString(),
        read: false,
      },
    ]);
    if (error) {
      console.error('Error creating in-app notification:', error.message);
    }
  };

  const generateInvoicePDF = async (order, amount) => {
    const invoiceData = {
      INVOICEID: crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).substring(2)}`,
      ORDERID: order.id,
      FULLNAME: order.full_name || 'N/A',
      FABRIC: order.fabric || 'N/A',
      STYLE: order.style || 'N/A',
      ADDRESS: order.address || 'N/A',
      DEPOSIT: Number(order.deposit || 0).toLocaleString('en-NG', { minimumFractionDigits: 0 }),
      BALANCE: Number(amount - (order.deposit || 0)).toLocaleString('en-NG', { minimumFractionDigits: 0 }),
      AMOUNT: Number(amount).toLocaleString('en-NG', { minimumFractionDigits: 0 }),
      DATE: new Date().toLocaleDateString('en-GB'),
      products: [
        {
          product_id: 'custom',
          name: `${order.fabric || 'Custom'} ${order.style || 'Item'}`,
          price: Number(amount),
          category: 'Custom Order',
        },
      ],
    };

    try {
      const { data, error } = await supabase.functions.invoke('generate-pdf', {
        body: { type: 'invoice', data: invoiceData },
        headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}` },
      });

      if (error) throw new Error(`PDF generation failed: ${error.message}`);
      return { pdfUrl: data.url, invoiceId: invoiceData.INVOICEID };
    } catch (error) {
      console.error('Error in generateInvoicePDF:', error);
      throw new Error(`PDF generation failed: ${error.message}`);
    }
  };

  async function updateCustomOrderStatus(id, newStatus) {
    const price = orderPrices[id] || 0;
    if (newStatus === 'in progress' && !price) {
      alert('Please set a price before marking as in progress.');
      return;
    }

    const updates = { status: newStatus };
    if (newStatus === 'in progress') {
      updates.price = parseFloat(price);
    }

    const { error, data } = await supabase
      .from('custom_orders')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      alert('Error updating status: ' + error.message);
    } else {
      setOrders((prev) =>
        prev.map((order) =>
          order.id === id ? { ...order, ...updates } : order
        )
      );
      if (newStatus === 'in progress') {
        const order = data;
        try {
          const { pdfUrl, invoiceId } = await generateInvoicePDF(order, price);
          const { error: invoiceError } = await supabase.from('invoices').insert([
            {
              id: invoiceId,
              order_id: order.id,
              user_id: order.user_id,
              amount: parseFloat(price),
              pdf_url: pdfUrl,
            },
          ]);
          if (invoiceError) {
            alert('Error creating invoice: ' + invoiceError.message);
          } else {
            const notificationText = `Your custom order (ID: ${order.id}) is now in progress! View your invoice: ${pdfUrl}`;
            await sendWhatsAppNotification(order.phone, notificationText);
            const emailBody = `
              <h2>Order Update</h2>
              <p>Your custom order (ID: ${order.id}) is now in progress.</p>
              <p><strong>Invoice</strong></p>
              <p>Order ID: ${order.id}</p>
              <p>Customer: ${order.full_name}</p>
              <p>Fabric: ${order.fabric || 'N/A'}</p>
              <p>Style: ${order.style || 'N/A'}</p>
              <p>Delivery Address: ${order.address || 'N/A'}</p>
              <p>Deposit: ₦${Number(order.deposit || 0).toLocaleString('en-NG')}</p>
              <p>Balance: ₦${Number(price - (order.deposit || 0)).toLocaleString('en-NG')}</p>
              <p>Total Amount: ₦${Number(price).toLocaleString('en-NG')}</p>
              <p>Date: ${new Date().toLocaleDateString('en-GB')}</p>
              <p><a href="${pdfUrl}">View/Download Invoice</a></p>
              <p>Please check the app for more details: [Your App URL]</p>
            `;
            await sendEmailNotification(order.email, 'Order In Progress - Invoice', emailBody);
            await createInAppNotification(
              order.user_id,
              `Your order (ID: ${order.id}) is now in progress. Check your dashboard for the invoice.`
            );
          }
        } catch (error) {
          alert('Error generating PDF: ' + error.message);
        }
      }
    }
  }

  async function updateProductOrderStatus(id, newStatus) {
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) {
      alert('Error updating status: ' + error.message);
    } else {
      setProductOrders((prev) =>
        prev.map((order) =>
          order.id === id ? { ...order, status: newStatus } : order
        )
      );
      const order = productOrders.find((o) => o.id === id);
      if (order) {
        const notificationText = `Your order (ID: ${id}) is now ${newStatus.replace('_', ' ')}. Check your dashboard for details.`;
        const { data: profile } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', order.user_id)
          .single();
        if (profile?.email) {
          await sendEmailNotification(
            profile.email,
            `Order Status Update - Order #${id}`,
            `
              <h2>Order Status Update</h2>
              <p>Your order (ID: ${id}) is now ${newStatus.replace('_', ' ')}.</p>
              <p>Please check the app for more details: [Your App URL]</p>
            `
          );
        }
        await createInAppNotification(order.user_id, notificationText);
      }
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
    if (name === 'imageFiles') {
      const fileList = Array.from(files);
      if (fileList.length > 0) {
        setProductData((prev) => ({ ...prev, imageFiles: fileList }));
        setProductPreviewUrl(URL.createObjectURL(fileList[0]));
      }
    } else {
      setProductData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleEditProductChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'imageFiles') {
      const fileList = Array.from(files);
      setEditProductData((prev) => ({
        ...prev,
        additionalImageFiles: fileList,
      }));
      setProductPreviewUrl(fileList.length > 0 ? URL.createObjectURL(fileList[0]) : null);
    } else {
      setEditProductData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    if (!productData.name || !productData.price || !productData.description || productData.imageFiles.length === 0) {
      alert('Please fill in all required fields and upload at least one image.');
      return;
    }

    setProductUploading(true);
    try {
      let categoryId = productData.category_id;

      if (!categories.some((cat) => cat.id === parseInt(categoryId))) {
        const newCategoryName = productData.category_id.trim();
        if (newCategoryName) {
          const slug = newCategoryName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');

          const { data: newCategory, error: categoryError } = await supabase
            .from('categories')
            .insert({
              name: newCategoryName,
              slug: slug,
              parent_id: null,
              created_at: new Date().toISOString(),
            })
            .select()
            .single();

          if (categoryError) throw new Error('Failed to create new category: ' + categoryError.message);

          categoryId = newCategory.id;
          setCategories((prev) => [...prev, newCategory]);
        } else {
          categoryId = null;
        }
      }

      const imageUrls = [];

      for (const file of productData.imageFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `products/${Date.now()}_${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('products').upload(fileName, file);
        if (uploadError) throw new Error('Upload failed: ' + uploadError.message);

        const { data: urlData } = supabase.storage.from('products').getPublicUrl(fileName);
        imageUrls.push(urlData.publicUrl);
      }

      const { data: productInsert, error: insertError } = await supabase
        .from('products')
        .insert({
          name: productData.name,
          price: parseFloat(productData.price),
          description: productData.description,
          category_id: categoryId || null,
          image_url: imageUrls[0] || '',
          is_on_sale: false,
          discount_percentage: 0,
          is_out_of_stock: false,
          is_new: false,
        })
        .select()
        .single();

      if (insertError) throw new Error('Insert failed: ' + insertError.message);

      if (imageUrls.length > 1) {
        await supabase.from('product_images').insert(
          imageUrls.slice(1).map((url) => ({
            product_id: productInsert.id,
            image_url: url,
          }))
        );
      }

      setProductData({ name: '', price: '', description: '', category_id: '', imageFiles: [] });
      setProductPreviewUrl(null);
      setProducts((prev) => [productInsert, ...prev]);
      alert('Product added successfully!');
    } catch (error) {
      alert(error.message);
    } finally {
      setProductUploading(false);
    }
  };

  const handleEditProductSubmit = async (e) => {
    e.preventDefault();
    if (!editProductData.name || !editProductData.price || !editProductData.description) {
      alert('Please fill in all required fields.');
      return;
    }

    setProductUploading(true);
    try {
      let categoryId = editProductData.category_id;

      if (!categories.some((cat) => cat.id === parseInt(categoryId))) {
        const newCategoryName = editProductData.category_id.trim();
        if (newCategoryName) {
          const slug = newCategoryName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');

          const { data: newCategory, error: categoryError } = await supabase
            .from('categories')
            .insert({
              name: newCategoryName,
              slug: slug,
              parent_id: null,
              created_at: new Date().toISOString(),
            })
            .select()
            .single();

          if (categoryError) throw new Error('Failed to create new category: ' + categoryError.message);

          categoryId = newCategory.id;
          setCategories((prev) => [...prev, newCategory]);
        } else {
          categoryId = null;
        }
      }

      const imageUrls = editProductData.additionalImageFiles?.length > 0 ? [] : null;

      if (imageUrls) {
        for (const file of editProductData.additionalImageFiles) {
          const fileExt = file.name.split('.').pop();
          const fileName = `products/${Date.now()}_${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
          const { error: uploadError } = await supabase.storage.from('products').upload(fileName, file);
          if (uploadError) throw new Error('Upload failed: ' + uploadError.message);

          const { data: urlData } = supabase.storage.from('products').getPublicUrl(fileName);
          imageUrls.push(urlData.publicUrl);
        }

        if (imageUrls.length > 0) {
          await supabase.from('product_images').insert(
            imageUrls.map((url) => ({
              product_id: editProductData.id,
              image_url: url,
            }))
          );
        }
      }

      const { error } = await supabase
        .from('products')
        .update({
          name: editProductData.name,
          price: parseFloat(editProductData.price),
          description: editProductData.description,
          category_id: categoryId || null,
        })
        .eq('id', editProductData.id);

      if (error) throw new Error('Update failed: ' + error.message);

      setProducts((prev) =>
        prev.map((product) =>
          product.id === editProductData.id
            ? {
              ...product,
              name: editProductData.name,
              price: parseFloat(editProductData.price),
              description: editProductData.description,
              category_id: categoryId,
              categories: categories.find((c) => c.id === categoryId) || null,
            }
            : product
        )
      );

      setIsEditModalOpen(false);
      setEditProductData(null);
      setProductPreviewUrl(null);
      alert('Product updated successfully!');
    } catch (error) {
      alert(error.message);
    } finally {
      setProductUploading(false);
    }
  };

  const openEditModal = (product) => {
    setEditProductData({
      id: product.id,
      name: product.name,
      price: product.price,
      description: product.description,
      category_id: product.category_id || 'none',
      additionalImageFiles: [],
    });
    setIsEditModalOpen(true);
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

  const totalProductPages = Math.ceil(products.length / itemsPerPage);
  const totalCustomOrderPages = Math.ceil(orders.length / itemsPerPage);
  const totalProductOrderPages = Math.ceil(productOrders.length / itemsPerPage);

  const indexOfLastProduct = currentProductPage * itemsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - itemsPerPage;
  const currentProducts = products.slice(indexOfFirstProduct, indexOfLastProduct);

  const indexOfLastCustomOrder = currentCustomOrderPage * itemsPerPage;
  const indexOfFirstCustomOrder = indexOfLastCustomOrder - itemsPerPage;
  const currentCustomOrders = orders.slice(indexOfFirstCustomOrder, indexOfLastCustomOrder);

  const indexOfLastProductOrder = currentProductOrderPage * itemsPerPage;
  const indexOfFirstProductOrder = indexOfLastProductOrder - itemsPerPage;
  const currentProductOrders = productOrders.slice(indexOfFirstProductOrder, indexOfLastProductOrder);

  useEffect(() => {
    if (currentProductPage > totalProductPages && totalProductPages > 0) {
      setCurrentProductPage(1);
    }
    if (currentCustomOrderPage > totalCustomOrderPages && totalCustomOrderPages > 0) {
      setCurrentCustomOrderPage(1);
    }
    if (currentProductOrderPage > totalProductOrderPages && totalProductOrderPages > 0) {
      setCurrentProductOrderPage(1);
    }
  }, [totalProductPages, totalCustomOrderPages, totalProductOrderPages, currentProductPage, currentCustomOrderPage, currentProductOrderPage]);

  if (!user) return <p className="p-6 text-center text-gray-600">Checking authentication...</p>;
  if (loading) return <DressLoader />;
  if (error) return <p className="p-6 text-center text-red-600">Error: {error}</p>;

  return (
    <main className="min-h-screen bg-gray-50" style={{ backgroundImage: "url('/african-fabric.jpg')", backgroundSize: 'cover' }}>
      <Navbar profile={profile} />
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <h1 className="text-3xl md:text-4xl font-bold text-purple-800 font-playfair-display mb-8 text-center">
          Admin Dashboard
        </h1>
        <p className="text-lg text-gray-700 text-center mb-8">Welcome, {profile?.email}</p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Profile and Product Form */}
          <div className="lg:col-span-1 space-y-6">
            {/* Profile Picture Section */}
            <section className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-semibold text-purple-800 font-playfair-display mb-4">Update Profile Picture</h2>
              <div className="flex flex-col items-center space-y-4">
                <div className="relative">
                  {previewUrl || profile?.avatar_url ? (
                    <img
                      src={previewUrl || profile.avatar_url}
                      alt="Avatar"
                      className="w-20 h-20 rounded-full object-cover border-2 border-purple-200"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-medium">
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
                  className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 transition-colors"
                  disabled={uploading}
                />
                <button
                  onClick={handleAvatarChange}
                  disabled={uploading || !avatarFile}
                  className={`w-full py-2 rounded-md font-semibold text-white transition-colors ${uploading || !avatarFile ? 'bg-gray-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700'}`}
                >
                  {uploading ? 'Uploading...' : 'Update Picture'}
                </button>
              </div>
            </section>

            {/* Add Product Section */}
            <section className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-semibold text-purple-800 font-playfair-display mb-4">Add New Product</h2>
              <form onSubmit={handleProductSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                  <input
                    type="text"
                    name="name"
                    value={productData.name}
                    onChange={handleProductChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                    placeholder="Enter product description"
                    rows="4"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <input
                    list="category-options"
                    name="category_id"
                    value={productData.category_id}
                    onChange={handleProductChange}
                    placeholder="Type or select a category"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                    required
                  />
                  <datalist id="category-options">
                    <option value="">Select a category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </datalist>
                  <p className="text-sm text-gray-500 mt-1">Type a new category name to create it.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product Images</label>
                  <input
                    type="file"
                    name="imageFiles"
                    accept="image/*"
                    multiple
                    onChange={handleProductChange}
                    className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 transition-colors"
                    disabled={productUploading}
                  />
                  {productData.imageFiles.length > 0 && (
                    <div className="mt-3 flex gap-2 flex-wrap">
                      {productData.imageFiles.map((file, index) => (
                        <img
                          key={index}
                          src={URL.createObjectURL(file)}
                          alt={`Preview ${index + 1}`}
                          className="w-24 h-24 object-cover rounded-md border border-gray-200"
                        />
                      ))}
                    </div>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={productUploading}
                  className={`w-full py-2 rounded-md font-semibold text-white transition-colors ${productUploading ? 'bg-gray-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700'}`}
                >
                  {productUploading ? 'Uploading...' : 'Add Product'}
                </button>
              </form>
            </section>
          </div>

          {/* Right Column: Products and Orders */}
          <div className="lg:col-span-2 space-y-6">
            {/* Manage Products Section */}
            <section className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-semibold text-purple-800 font-playfair-display mb-4">Manage Products</h2>
              {products.length === 0 ? (
                <p className="text-gray-500">No products available.</p>
              ) : (
                <>
                  <div className="space-y-4">
                    {currentProducts.map((product) => (
                      <div
                        key={product.id}
                        className="border border-gray-200 p-4 rounded-lg hover:shadow-md transition-shadow"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="w-16 h-16 object-cover rounded-md border border-gray-200"
                            />
                            <div>
                              <h3 className="font-medium text-gray-800">{product.name}</h3>
                              <p className="text-gray-600">
                                Price: ₦{Number(product.price).toLocaleString()}
                                {product.discount_percentage > 0 &&
                                  ` (Discounted: ₦${(product.price * (1 - product.discount_percentage / 100)).toLocaleString()})`}
                              </p>
                              <p className="text-gray-600">{product.description}</p>
                              <p className="text-gray-600">
                                Category: {product.categories?.name || 'None'}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2">
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() => openEditModal(product)}
                                className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() =>
                                  handleUpdateProductFlags(product.id, {
                                    is_on_sale: !product.is_on_sale,
                                  })
                                }
                                className={`px-3 py-1 rounded-md text-sm font-medium ${product.is_on_sale ? 'bg-red-600 text-white' : 'bg-purple-600 text-white hover:bg-purple-700'}`}
                              >
                                {product.is_on_sale ? 'Remove Sale' : 'Mark as On Sale'}
                              </button>
                              <button
                                onClick={() =>
                                  handleUpdateProductFlags(product.id, {
                                    is_out_of_stock: !product.is_out_of_stock,
                                  })
                                }
                                className={`px-3 py-1 rounded-md text-sm font-medium ${product.is_out_of_stock ? 'bg-red-600 text-white' : 'bg-purple-600 text-white hover:bg-purple-700'}`}
                              >
                                {product.is_out_of_stock ? 'Mark as In Stock' : 'Mark as Out of Stock'}
                              </button>
                              <button
                                onClick={() =>
                                  handleUpdateProductFlags(product.id, {
                                    is_new: !product.is_new,
                                  })
                                }
                                className={`px-3 py-1 rounded-md text-sm font-medium ${product.is_new ? 'bg-red-600 text-white' : 'bg-purple-600 text-white hover:bg-purple-700'}`}
                              >
                                {product.is_new ? 'Remove New' : 'Mark as New'}
                              </button>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="relative w-24">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  placeholder="Discount %"
                                  value={discountInputs[product.id] ?? product.discount_percentage ?? 0}
                                  onChange={(e) =>
                                    setDiscountInputs((prev) => ({
                                      ...prev,
                                      [product.id]: e.target.value,
                                    }))
                                  }
                                  className="w-full px-2 py-1 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                                />
                                <button
                                  onClick={() =>
                                    handleUpdateProductFlags(product.id, {
                                      discount_percentage: parseFloat(discountInputs[product.id]) || 0,
                                    })
                                  }
                                  className="absolute right-1 top-1/2 -translate-y-1/2 bg-purple-600 text-white text-xs px-2 py-0.5 rounded hover:bg-purple-700"
                                >
                                  Save
                                </button>
                              </div>


                              <button
                                onClick={() => handleDeleteProduct(product.id)}
                                className="px-3 py-1 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 flex justify-center gap-3 items-center">
                    <button
                      className="px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
                      onClick={() => setCurrentProductPage((prev) => Math.max(prev - 1, 1))}
                      disabled={currentProductPage === 1}
                      aria-label="Previous product page"
                    >
                      Previous
                    </button>
                    <span className="text-gray-600" aria-live="polite">
                      Page {currentProductPage} of {totalProductPages}
                    </span>
                    <button
                      className="px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
                      onClick={() => setCurrentProductPage((prev) => Math.min(prev + 1, totalProductPages))}
                      disabled={currentProductPage === totalProductPages}
                      aria-label="Next product page"
                    >
                      Next
                    </button>
                  </div>
                </>
              )}
            </section>

            {/* Manage Product Orders Section */}
            <section className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-semibold text-purple-800 font-playfair-display mb-4">Manage Product Orders</h2>
              {productOrders.length === 0 ? (
                <p className="text-gray-500">No product orders yet.</p>
              ) : (
                <>
                  <div className="space-y-4">
                    {currentProductOrders.map((order) => (
                      <div
                        key={order.id}
                        className="border border-gray-200 p-4 rounded-lg hover:shadow-md transition-shadow"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                          <div>
                            <h3 className="font-medium text-gray-800">Order #{order.id}</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-gray-600 mt-2">
                              <p><strong>Placed on:</strong> {new Date(order.created_at).toLocaleString()}</p>
                              <p><strong>Address:</strong> {order.address}</p>
                              <p><strong>Total:</strong> ₦{Number(order.total).toLocaleString()}</p>
                              <p><strong>Status:</strong> {order.status.replace('_', ' ').toUpperCase()}</p>
                            </div>
                            <div className="mt-2">
                              <p className="text-gray-600 font-medium">Items:</p>
                              <ul className="list-disc pl-5 text-gray-600">
                                {order.items.map((item) => (
                                  <li key={item.id}>
                                    {item.name} - Quantity: {item.quantity} - ₦
                                    {((item.discount_percentage > 0
                                      ? item.price * (1 - item.discount_percentage / 100)
                                      : item.price) * item.quantity).toLocaleString()}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 sm:items-end">
                            <select
                              value={order.status}
                              onChange={(e) => updateProductOrderStatus(order.id, e.target.value)}
                              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                            >
                              <option value="awaiting_payment">Awaiting Payment</option>
                              <option value="processing">Processing</option>
                              <option value="shipped">Shipped</option>
                              <option value="on_the_way">On the Way</option>
                              <option value="picked_up">Picked Up</option>
                              <option value="delivered">Delivered</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 flex justify-center gap-3 items-center">
                    <button
                      className="px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
                      onClick={() => setCurrentProductOrderPage((prev) => Math.max(prev - 1, 1))}
                      disabled={currentProductOrderPage === 1}
                      aria-label="Previous product order page"
                    >
                      Previous
                    </button>
                    <span className="text-gray-600" aria-live="polite">
                      Page {currentProductOrderPage} of {totalProductOrderPages}
                    </span>
                    <button
                      className="px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
                      onClick={() => setCurrentProductOrderPage((prev) => Math.min(prev + 1, totalProductOrderPages))}
                      disabled={currentProductOrderPage === totalProductOrderPages}
                      aria-label="Next product order page"
                    >
                      Next
                    </button>
                  </div>
                </>
              )}
            </section>

            {/* Manage Custom Orders Section */}
            <section className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-semibold text-purple-800 font-playfair-display mb-4">Manage Custom Orders</h2>
              {orders.length === 0 ? (
                <p className="text-gray-500">No custom orders yet.</p>
              ) : (
                <>
                  <div className="space-y-4">
                    {currentCustomOrders.map((order) => (
                      <div
                        key={order.id}
                        className="border border-gray-200 p-4 rounded-lg hover:shadow-md transition-shadow"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                          <div>
                            <h3 className="font-medium text-gray-800">{order.full_name}</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-gray-600 mt-2">
                              <p><strong>Phone:</strong> {order.phone}</p>
                              <p><strong>Email:</strong> {order.email || '—'}</p>
                              <p><strong>Fabric:</strong> {order.fabric}</p>
                              <p><strong>Style:</strong> {order.style}</p>
                              <p><strong>Measurements:</strong> {order.measurements || '—'}</p>
                              <p><strong>Notes:</strong> {order.additional_notes || '—'}</p>
                              <p className="sm:col-span-2"><strong>Address:</strong> {order.address}</p>
                              <p><strong>Deposit:</strong> ₦{Number(order.deposit || 0).toLocaleString()}</p>
                              <p><strong>Price:</strong> {order.price ? `₦${Number(order.price).toLocaleString()}` : 'Not set'}</p>
                            </div>
                            <p className="text-sm text-gray-500 mt-2">
                              Ordered on: {new Date(order.created_at).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex flex-col gap-2 sm:items-end">
                            <input
                              type="number"
                              placeholder="Set Price (₦)"
                              value={orderPrices[order.id] || ''}
                              onChange={(e) =>
                                setOrderPrices((prev) => ({
                                  ...prev,
                                  [order.id]: e.target.value,
                                }))
                              }
                              className="w-32 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                              min="0"
                              step="0.01"
                            />
                            <select
                              value={order.status}
                              onChange={(e) => updateCustomOrderStatus(order.id, e.target.value)}
                              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                            >
                              <option value="pending">Pending</option>
                              <option value="in progress">In Progress</option>
                              <option value="completed">Completed</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 flex justify-center gap-3 items-center">
                    <button
                      className="px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
                      onClick={() => setCurrentCustomOrderPage((prev) => Math.max(prev - 1, 1))}
                      disabled={currentCustomOrderPage === 1}
                      aria-label="Previous custom order page"
                    >
                      Previous
                    </button>
                    <span className="text-gray-600" aria-live="polite">
                      Page {currentCustomOrderPage} of {totalCustomOrderPages}
                    </span>
                    <button
                      className="px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
                      onClick={() => setCurrentCustomOrderPage((prev) => Math.min(prev + 1, totalCustomOrderPages))}
                      disabled={currentCustomOrderPage === totalCustomOrderPages}
                      aria-label="Next custom order page"
                    >
                      Next
                    </button>
                  </div>
                </>
              )}
            </section>
          </div>
        </div>

        {/* Edit Product Modal */}
        {isEditModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md relative">
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditProductData(null);
                  setProductPreviewUrl(null);
                }}
                className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
              <h2 className="text-xl font-semibold text-purple-800 mb-4">Edit Product</h2>
              <form onSubmit={handleEditProductSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                  <input
                    type="text"
                    name="name"
                    value={editProductData?.name || ''}
                    onChange={handleEditProductChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                    placeholder="Enter product name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price (₦)</label>
                  <input
                    type="number"
                    name="price"
                    value={editProductData?.price || ''}
                    onChange={handleEditProductChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                    placeholder="0"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    name="description"
                    value={editProductData?.description || ''}
                    onChange={handleEditProductChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                    placeholder="Enter product description"
                    rows="4"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <input
                    list="category-options"
                    name="category_id"
                    value={editProductData?.category_id || ''}
                    onChange={handleEditProductChange}
                    placeholder="Type or select a category"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                  />
                  <datalist id="category-options">
                    <option value="none">None</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </datalist>
                  <p className="text-sm text-gray-500 mt-1">Type a new category name to create it.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Additional Images</label>
                  <input
                    type="file"
                    name="imageFiles"
                    accept="image/*"
                    multiple
                    onChange={handleEditProductChange}
                    className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-colors"
                    disabled={productUploading}
                  />
                  {editProductData?.additionalImageFiles?.length > 0 && (
                    <div className="mt-3 flex gap-2 flex-wrap">
                      {editProductData.additionalImageFiles.map((file, index) => (
                        <img
                          key={index}
                          src={URL.createObjectURL(file)}
                          alt={`Preview ${index + 1}`}
                          className="w-24 h-24 object-cover rounded-md border border-gray-200"
                        />
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditModalOpen(false);
                      setEditProductData(null);
                      setProductPreviewUrl(null);
                    }}
                    className="w-full py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={productUploading}
                    className={`w-full py-2 rounded-md font-semibold text-white transition-colors ${productUploading ? 'bg-gray-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700'}`}
                  >
                    {productUploading ? 'Updating...' : 'Update Product'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="text-center mt-8">
          <button
            className="bg-red-600 text-white font-semibold py-2 px-6 rounded-md hover:bg-red-700 transition-colors"
            onClick={async () => {
              await supabase.auth.signOut();
              router.push('/login');
            }}
          >
            Log Out
          </button>
        </div>
      </div>
    </main>
  );
}