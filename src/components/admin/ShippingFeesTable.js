import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function ShippingFeesTable({ shippingFees, setShippingFees }) {
  const [shippingFeeData, setShippingFeeData] = useState({ state_name: '', shipping_fee: '' });
  const [editShippingFeeData, setEditShippingFeeData] = useState(null);
  const [isShippingFeeModalOpen, setIsShippingFeeModalOpen] = useState(false);

  const handleShippingFeeChange = (e) => {
    const { name, value } = e.target;
    setShippingFeeData((prev) => ({ ...prev, [name]: value }));
  };

  const handleShippingFeeSubmit = async (e) => {
    e.preventDefault();
    const { data, error } = await supabase
      .from("shipping_fees")
      .insert([shippingFeeData])
      .select()
      .single();

    if (error) {
      console.error("Error adding shipping fee:", error.message);
      alert("Error adding shipping fee: " + error.message);
      return;
    }

    setShippingFees((prev) => [...prev, data]);
    setShippingFeeData({ state_name: '', shipping_fee: '' });
    setIsShippingFeeModalOpen(false);
  };

  const handleEditShippingFee = (fee) => {
    setEditShippingFeeData(fee);
    setIsShippingFeeModalOpen(true);
  };

  const handleEditShippingFeeChange = (e) => {
    const { name, value } = e.target;
    setEditShippingFeeData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditShippingFeeSubmit = async (e) => {
    e.preventDefault();
    const { error } = await supabase
      .from("shipping_fees")
      .update(editShippingFeeData)
      .eq("id", editShippingFeeData.id);

    if (error) {
      console.error("Error updating shipping fee:", error.message);
      alert("Error updating shipping fee: " + error.message);
      return;
    }

    setShippingFees((prev) =>
      prev.map((f) => (f.id === editShippingFeeData.id ? editShippingFeeData : f))
    );
    setIsShippingFeeModalOpen(false);
    setEditShippingFeeData(null);
  };

  const handleDeleteShippingFee = async (id) => {
    if (!confirm("Are you sure you want to delete this shipping fee?")) return;

    const { error } = await supabase.from("shipping_fees").delete().eq("id", id);
    if (error) {
      console.error("Error deleting shipping fee:", error.message);
      alert("Error deleting shipping fee: " + error.message);
      return;
    }

    setShippingFees((prev) => prev.filter((f) => f.id !== id));
  };

  return (
    <section className="bg-white rounded-2xl shadow-lg p-6 mb-6">
      <h2 className="text-xl font-semibold text-purple-800 mb-4">Manage Shipping Fees</h2>
      <button
        onClick={() => setIsShippingFeeModalOpen(true)}
        className="mb-4 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
      >
        Add Shipping Fee
      </button>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">State</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fee (₦)</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {shippingFees.map((fee) => (
              <tr key={fee.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{fee.state_name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">₦{Number(fee.shipping_fee).toLocaleString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => handleEditShippingFee(fee)}
                    className="text-blue-600 hover:text-blue-800 mr-4"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteShippingFee(fee.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isShippingFeeModalOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md relative">
            <button
              onClick={() => {
                setIsShippingFeeModalOpen(false);
                setEditShippingFeeData(null);
              }}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
            <h2 className="text-xl font-semibold text-purple-800 mb-4">
              {editShippingFeeData ? "Edit Shipping Fee" : "Add Shipping Fee"}
            </h2>
            <form
              onSubmit={editShippingFeeData ? handleEditShippingFeeSubmit : handleShippingFeeSubmit}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                <input
                  type="text"
                  name="state_name"
                  value={editShippingFeeData ? editShippingFeeData.state_name : shippingFeeData.state_name}
                  onChange={editShippingFeeData ? handleEditShippingFeeChange : handleShippingFeeChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                  placeholder="e.g., Delta"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fee (₦)</label>
                <input
                  type="number"
                  name="shipping_fee"
                  value={editShippingFeeData ? editShippingFeeData.shipping_fee : shippingFeeData.shipping_fee}
                  onChange={editShippingFeeData ? handleEditShippingFeeChange : handleShippingFeeChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                  placeholder="Enter shipping fee"
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              <div className="flex justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsShippingFeeModalOpen(false);
                    setEditShippingFeeData(null);
                  }}
                  className="w-full py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 font-semibold"
                >
                  {editShippingFeeData ? "Update Shipping Fee" : "Add Shipping Fee"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}