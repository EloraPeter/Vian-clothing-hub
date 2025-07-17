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
        // Check user session
        const session = supabase.auth.getSession().then(({ data }) => {
            if (!data.session) {
                router.push('/login');
            } else {
                setUser(data.session.user);
            }
        });
    }, [router]);

    // Fetch orders once user is set
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

    // fetch profile data
    useEffect(() => {
        if (!user) return;

        async function fetchProfile() {
            const { data, error } = await supabase
                .from('profiles')
                .select('email, avatar_url')
                .eq('id', user.id)
                .single();

            if (error) {
                setError(error.message);
            } else {
                setProfile(data);
            }
        }

        fetchProfile();
    }, [user]);


    // Update status handler (same as before)
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

    if (!user) return <p className="p-6 text-center">Checking authentication...</p>;
    if (loading) return <p className="p-6 text-center">Loading orders...</p>;
    if (error) return <p className="p-6 text-center text-red-600">Error: {error}</p>;

    return (
        <main className="min-h-screen bg-gray-100 p-6">
            <Navbar profile={profile} />
            <h1 className="text-3xl font-bold mb-6 text-purple-700 text-center">Admin Dashboard</h1>
            <p>Welcome, {user.email}</p>

            <div className="mb-8 bg-white p-6 rounded-xl shadow-md max-w-xl mx-auto">
                {/* Profile Update Form */}
                <h2 className="text-2xl font-bold text-purple-700 mb-4">Update Profile</h2>
                <div className="flex items-center space-x-4 mb-4">
                    {previewUrl || profile?.avatar_url ? (
                        <img
                            src={previewUrl || profile.avatar_url || '/default-avatar.png'}
                            alt="Avatar"
                            className="w-16 h-16 rounded-full object-cover border"
                        />
                    ) : (
                        <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                            No Pic
                        </div>
                    )}
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
                        className="text-sm"
                        disabled={uploading}

                    />
                </div>

                <form
                    onSubmit={async (e) => {
                        e.preventDefault();
                        let avatar_url = profile.avatar_url;

                        if (avatarFile) {
                            setUploading(true);
                            const fileExt = avatarFile.name.split('.').pop();
                            const fileName = `${user.id}.${fileExt}`;
                            const filePath = `avatars/${fileName}`;

                            const { error: uploadError } = await supabase.storage
                                .from('avatars')
                                .upload(filePath, avatarFile, { upsert: true });

                            if (uploadError) {
                                alert('Upload failed: ' + uploadError.message);
                                setUploading(false);
                                return;
                            }

                            const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
                            avatar_url = data.publicUrl;
                            setUploading(false);
                        }

                        const { error } = await supabase
                            .from('profiles')
                            .update({ email: profile.email, avatar_url })
                            .eq('id', user.id);


                        if (!error) {
                            setProfile((prev) => ({ ...prev, email: profile.email, avatar_url }));
                            alert('Profile updated successfully');
                        }

                    }}
                    className="space-y-6"
                >
                    <button
                        type="submit"
                        disabled={uploading}
                        className={`w-full py-2 rounded-md font-semibold transition ${uploading
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-purple-600 hover:bg-purple-700 text-white'
                            }`}
                    >
                        {uploading ? 'Uploading...' : 'Save Changes'}
                    </button>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
                        <input
                            type="email"
                            value={profile?.email || ''}
                            onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-purple-600 text-white font-semibold py-2 rounded-md hover:bg-purple-700 transition"
                    >
                        Save Changes
                    </button>
                </form>
            </div>

            <button
                className="mb-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                onClick={async () => {
                    await supabase.auth.signOut();
                    router.push('/login');
                }}
            >
                Log Out
            </button>

            {orders.length === 0 && (
                <p className="text-center text-gray-600">No orders yet.</p>
            )}

            <div className="max-w-6xl mx-auto space-y-6">
                {orders.map((order) => (
                    <div key={order.id} className="bg-white p-4 rounded shadow-md">
                        <div className="flex justify-between items-center mb-2">
                            <h2 className="font-semibold text-lg">{order.full_name}</h2>
                            <select
                                value={order.status}
                                onChange={(e) => updateStatus(order.id, e.target.value)}
                                className="border rounded px-2 py-1"
                            >
                                <option value="pending">Pending</option>
                                <option value="in progress">In Progress</option>
                                <option value="completed">Completed</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                        </div>
                        <p><strong>Phone:</strong> {order.phone}</p>
                        <p><strong>Email:</strong> {order.email || '—'}</p>
                        <p><strong>Fabric:</strong> {order.fabric}</p>
                        <p><strong>Style:</strong> {order.style}</p>
                        <p><strong>Measurements:</strong> {order.measurements || '—'}</p>
                        <p><strong>Notes:</strong> {order.additional_notes || '—'}</p>
                        <p><strong>Address:</strong> {order.address}</p>
                        <p className="text-sm text-gray-500 mt-2">
                            Ordered on: {new Date(order.created_at).toLocaleString()}
                        </p>
                    </div>
                ))}
            </div>
        </main>
    );
}
