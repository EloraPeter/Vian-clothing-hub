import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function ProductOrdersTable({ productOrders, setProductOrders, itemsPerPage, currentProductOrderPage, setCurrentProductOrderPage, updateProductOrderStatus }) {
  const [searchTerm, setSearchTerm] = useState("");

  // Filter productOrders based on search term
  const filteredProductOrders = productOrders.filter((order) => {
    const term = searchTerm.toLowerCase();
    return (
      order.id.toString().includes(term) || // ID
      (order.customer?.full_name?.toLowerCase() || "").includes(term) || // Customer name
      (order.customer?.phone?.toLowerCase() || "").includes(term) || // Customer phone
      (order.customer?.email?.toLowerCase() || "").includes(term) || // Customer email
      (order.customer?.address?.toLowerCase() || "").includes(term) || // Customer address
      order.items?.some((item) => // Items
        (item.name?.toLowerCase() || "").includes(term) ||
        item.quantity?.toString().includes(term)
      ) ||
      order.total?.toString().includes(term) || // Total
      (order.status?.toLowerCase() || "").includes(term) // Status
    );
  });

  const indexOfLastProductOrder = currentProductOrderPage * itemsPerPage;
  const indexOfFirstProductOrder = indexOfLastProductOrder - itemsPerPage;
  const currentProductOrders = filteredProductOrders.slice(indexOfFirstProductOrder, indexOfLastProductOrder);
  const totalProductOrderPages = Math.ceil(filteredProductOrders.length / itemsPerPage);

  return (
    <section className="bg-white rounded-2xl shadow-lg p-6">
      <h2 className="text-xl font-semibold text-purple-800 mb-4">Product Orders</h2>
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by ID, customer name, phone, email, address, item name, status, etc."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentProductOrderPage(1); // Reset to page 1 on search
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total (₦)</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentProductOrders.map((order) => (
              <tr key={order.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.id}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.customer?.full_name || "N/A"}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.customer?.phone || "N/A"}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.customer?.email || "N/A"}</td>
                <td className="px-6 py-4 whitespace-wrap text-sm text-gray-500">{order.customer?.address || "N/A"}</td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {order.items?.map((item) => (
                    <div key={item.id}>{item.name} x {item.quantity}</div>
                  ))}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">₦{Number(order.total).toLocaleString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <select
                    value={order.status}
                    onChange={(e) => updateProductOrderStatus(order.id, e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                  >
                    <option value="awaiting_payment">Awaiting Payment</option>
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
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
          onClick={() => setCurrentProductOrderPage((prev) => Math.max(prev - 1, 1))}
          disabled={currentProductOrderPage === 1}
        >
          Previous
        </button>
        <span className="text-gray-600">Page {currentProductOrderPage} of {totalProductOrderPages}</span>
        <button
          className="px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
          onClick={() => setCurrentProductOrderPage((prev) => Math.min(prev + 1, totalProductOrderPages))}
          disabled={currentProductOrderPage === totalProductOrderPages}
        >
          Next
        </button>
      </div>
    </section>
  );
}