import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function CustomOrdersTable({ orders, setOrders, itemsPerPage, currentCustomOrderPage, setCurrentCustomOrderPage, updateCustomOrderStatus, updateCustomOrderDeliveryStatus, orderPrices, setOrderPrices }) {
  const [searchTerm, setSearchTerm] = useState("");

  // Filter orders based on search term
  const filteredOrders = orders.filter((order) => {
    const term = searchTerm.toLowerCase();
    return (
      order.id.toString().includes(term) || // ID
      (order.customer?.full_name?.toLowerCase() || "").includes(term) || // Customer name
      (order.customer?.phone?.toLowerCase() || "").includes(term) || // Customer phone
      (order.customer?.email?.toLowerCase() || "").includes(term) || // Customer email
      (order.customer?.address?.toLowerCase() || "").includes(term) || // Customer address
      (order.fabric?.toLowerCase() || "").includes(term) || // Fabric
      (order.style?.toLowerCase() || "").includes(term) || // Style
      (order.status?.toLowerCase() || "").includes(term) || // Status
      (order.delivery_status?.toLowerCase() || "").includes(term) || // Delivery status
      (orderPrices[order.id]?.toString() || order.price?.toString() || "").includes(term) // Price
    );
  });

  const indexOfLastCustomOrder = currentCustomOrderPage * itemsPerPage;
  const indexOfFirstCustomOrder = indexOfLastCustomOrder - itemsPerPage;
  const currentCustomOrders = filteredOrders.slice(indexOfFirstCustomOrder, indexOfLastCustomOrder);
  const totalCustomOrderPages = Math.ceil(filteredOrders.length / itemsPerPage);

  return (
    <section className="bg-white rounded-2xl shadow-lg p-6 mb-6">
      <h2 className="text-xl font-semibold text-purple-800 mb-4">Custom Orders</h2>
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by ID, customer name, phone, email, address, fabric/style, status, etc."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentCustomOrderPage(1); // Reset to page 1 on search
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
        />
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fabric/Style</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price (₦)</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Delivery Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentCustomOrders.map((order) => (
              <tr key={order.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.id}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.customer?.full_name || "N/A"}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.customer?.phone || "N/A"}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.customer?.email || "N/A"}</td>
                <td className="px-6 py-4 whitespace-wrap text-sm text-gray-500">{order.customer?.address || "N/A"}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {order.fabric} / {order.style}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <input
                    type="number"
                    value={orderPrices[order.id] || order.price || ""}
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
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
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
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <select
                    value={order.delivery_status}
                    onChange={(e) => updateCustomOrderDeliveryStatus(order.id, e.target.value)}
                    disabled={order.status !== "in progress" && order.status !== "completed"}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 disabled:opacity-50"
                  >
                    <option value="not_started">Not Started</option>
                    <option value="in_progress">In Progress</option>
                    <option value="delivered">Delivered</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-6 flex justify-center gap-3 items-center">
        <button
          className="px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
          onClick={() => setCurrentCustomOrderPage((prev) => Math.max(prev - 1, 1))}
          disabled={currentCustomOrderPage === 1}
        >
          Previous
        </button>
        <span className="text-gray-600">Page {currentCustomOrderPage} of {totalCustomOrderPages}</span>
        <button
          className="px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
          onClick={() => setCurrentCustomOrderPage((prev) => Math.min(prev + 1, totalCustomOrderPages))}
          disabled={currentCustomOrderPage === totalCustomOrderPages}
        >
          Next
        </button>
      </div>
    </section>
  );
}