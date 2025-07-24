// pages/admin.js
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/router';
import Navbar from '@/components/Navbar';
import ProfileUploader from '@/components/ProfileUploader';
import DressLoader from '@/components/DressLoader';

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
    category_id: '', // Changed from category to category_id
    imageFiles: [],
  });
  const [productPreviewUrl, setProductPreviewUrl] = useState(null);
  const [productUploading, setProductUploading] = useState(false);
  const [currentProductPage, setCurrentProductPage] = useState(1);
  const [productsPerPage] = useState(5);
  const [orderPrices, setOrderPrices] = useState({});
  const [categories, setCategories] = useState([]);

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
        { data: orderData, error: orderError },
        { data: productData, error: productError },
        { data: categoryData, error: categoryError },
      ] = await Promise.all([
        supabase.from('custom_orders').select('*').order('created_at', { ascending: false }),
        supabase.from('products').select('*, categories(name)').order('created_at', { ascending: false }),
        supabase.from('categories').select('id, name'),
      ]);

      if (orderError) setError(orderError.message);
      else setOrders(orderData || []);

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
      INVOICEID: crypto.randomUUID(),
      ORDERID: order.id,
      FULLNAME: order.full_name,
      FABRIC: order.fabric,
      STYLE: order.style,
      ADDRESS: order.address,
      DEPOSIT: Number(order.deposit || 5000).toLocaleString(),
      BALANCE: Number(amount - (order.deposit || 5000)).toLocaleString(),
      AMOUNT: Number(amount).toLocaleString(),
      DATE: new Date().toLocaleDateString(),
    };

    const { data, error } = await supabase.functions.invoke('generate-pdf', {
      body: { type: 'invoice', data: invoiceData },
    });

    if (error) {
      throw new Error(`PDF generation failed: ${error.message}`);
    }

    return data.pdfUrl;
  };

  async function updateStatus(id, newStatus) {
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
        const pdfUrl = await generateInvoicePDF(order, price);
        const { error: invoiceError } = await supabase.from('invoices').insert([
          {
            id: invoiceData.INVOICEID,
            order_id: order.id,
            user_id: order.user_id,
            amount: parseFloat(price),
            pdf_url: pdfUrl,
          },
        ]);
        if (invoiceError) {
          console.error('Error creating invoice:', invoiceError.message);
        }
        const notificationText = `Your custom order (ID: ${order.id}) is now in progress! Please check the app to view your invoice and make payment: [Your App URL]`;
        await sendWhatsAppNotification(order.phone, notificationText);
        const emailBody = `
          <h2>Order Update</h2>
          <p>Your custom order (ID: ${order.id}) is now in progress.</p>
          <p><strong>Invoice</strong></p>
          <p>Order ID: ${order.id}</p>
          <p>Customer: ${order.full_name}</p>
          <p>Fabric: ${order.fabric}</p>
          <p>Style: ${order.style}</p>
          <p>Delivery Address: ${order.address}</p>
          <p>Deposit: ₦${Number(order.deposit || 5000).toLocaleString()}</p>
          <p>Balance: ₦${Number(price - (order.deposit || 5000)).toLocaleString()}</p>
          <p>Total Amount: ₦${Number(price).toLocaleString()}</p>
          <p>Date: ${new Date().toLocaleDateString()}</p>
          <p><a href="${pdfUrl}">View/Download Invoice</a></p>
          <p>Please check the app for more details: [Your App URL]</p>
        `;
        await sendEmailNotification(order.email, 'Order In Progress - Invoice', emailBody);
        await createInAppNotification(
          order.user_id,
          `Your order (ID: ${order.id}) is now in progress. Check your dashboard for the invoice.`
        );
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

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    if (!productData.name || !productData.price || !productData.description || productData.imageFiles.length === 0) {
      alert('Please fill in all required fields and upload at least one image.');
      return;
    }

    setProductUploading(true);
    try {
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
          category_id: productData.category_id || null, // Use category_id
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
      alert('Product added with multiple images!');
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

      set