import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function AdminPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch orders from Supabase
  useEffect(() => {
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
  }, []);

  // Update order status handler
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

  if (loading) return <p className="p-6 text-center">Loading orders...</p>;
  if (error) return <p className="p-6 text-center text-red-600">Error: {error}</p>;

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold mb-6 text-purple-700 text-center">Admin Dashboard</h1>

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
