import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/router';
import Navbar from '@/components/Navbar';
import ProfileUploader from '@/components/ProfileUploader';

export default function AdminPage() {
    const router = useRouter();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [avatarFile, setAvatarFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [uploading, setUploading] = useState(false);

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

        fetchProfile();
    }, [user]);

    useEffect(() => {
        if (!user) return;

        async function fetchOrders() {
            const { data, error } = await supabase
                .from('custom_orders')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) {
                setError(error.message);
            } else {
                setOrders(data);
            }
            setLoading(false);
        }

        fetchOrders();
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
            const filePath = `avatars/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, avatarFile, { upsert: true });

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

    if (!user) return <p className="p-6 text-center text-gray-600">Checking authentication...</p>;
    if (loading) return <p className="p-6 text-center text-gray-600">Loading orders...</p>;
    if (error) return <p className="p-6 text-center text-red-600">Error: {error}</p>;

    return (
        <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
            <Navbar profile={profile} />
            <div className="max-w-7xl mx-auto">
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
                                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full">
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
                        <div key={order.id} className="bg-white p-6 rounded-2xl shadow-md hover:shadow-lg transition-shadow duration-300">
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
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-gray-700">
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