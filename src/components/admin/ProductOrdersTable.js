import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function ProductOrdersTable({ productOrders, setProductOrders, itemsPerPage, currentProductOrderPage, setCurrentProductOrderPage, updateProductOrderStatus }) {
  const indexOfLastProductOrder = currentProductOrderPage * itemsPerPage;
  const indexOfFirstProductOrder = indexOfLastProductOrder - itemsPerPage;
  const currentProductOrders = productOrders.slice(indexOfFirstProductOrder, indexOfLastProductOrder);
  const totalProductOrderPages = Math.ceil(productOrders.length / itemsPerPage);

  return (
    <section className="bg-white rounded-2xl shadow-lg p-6">
      <h2 className="text-xl font-semibold text-purple-800 mb-4">Product Orders</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total (₦)</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentProductOrders.map((order) => (
              <tr key={order.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.id}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.user_id}</td> {/* Assume user_id for customer */}
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