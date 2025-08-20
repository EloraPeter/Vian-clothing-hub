import { supabase } from "@/lib/supabaseClient";
import { toast } from "react-toastify";

export default function PromotionsTable({ promotions, setPromotions, categories }) {
    const handleDelete = async (id) => {
        const { error } = await supabase.from("promotions").delete().eq("id", id);
        if (error) {
            toast.error("Error deleting promotion: " + error.message);
        } else {
            setPromotions(promotions.filter((p) => p.id !== id));
            toast.success("Promotion deleted successfully.");
        }
    };

    const handleToggleActive = async (id, currentActive) => {
        const { error } = await supabase.from("promotions").update({ active: !currentActive }).eq("id", id);
        if (error) {
            toast.error("Error updating promotion: " + error.message);
        } else {
            setPromotions(promotions.map((p) => p.id === id ? { ...p, active: !currentActive } : p));
            toast.success("Promotion updated successfully.");
        }
    };

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200">
                <thead>
                    <tr className="bg-purple-100">
                        <th className="py-2 px-4 border-b text-left text-purple-800">ID</th>
                        <th className="py-2 px-4 border-b text-left text-purple-800">Title</th>
                        <th className="py-2 px-4 border-b text-left text-purple-800">Discount %</th>
                        <th className="py-2 px-4 border-b text-left text-purple-800">Start Date</th>
                        <th className="py-2 px-4 border-b text-left text-purple-800">End Date</th>
                        <th className="py-2 px-4 border-b text-left text-purple-800">Active</th>
                        <th className="py-2 px-4 border-b text-left text-purple-800">Categories</th>
                        <th className="py-2 px-4 border-b text-left text-purple-800">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {promotions.map((promo) => (
                        <tr key={promo.id} className="hover:bg-purple-50">
                            <td className="py-2 px-4 border-b text-gray-700">{promo.id}</td>
                            <td className="py-2 px-4 border-b text-gray-700">{promo.title}</td>
                            <td className="py-2 px-4 border-b text-gray-700">{promo.discount_percentage}</td>
                            <td className="py-2 px-4 border-b text-gray-700">{new Date(promo.start_date).toLocaleString()}</td>
                            <td className="py-2 px-4 border-b text-gray-700">{new Date(promo.end_date).toLocaleString()}</td>
                            <td className="py-2 px-4 border-b text-gray-700">
                                <button onClick={() => handleToggleActive(promo.id, promo.active)} className={`px-2 py-1 rounded ${promo.active ? "bg-green-500 text-white" : "bg-red-500 text-white"}`}>
                                    {promo.active ? "Active" : "Inactive"}
                                </button>
                            </td>
                            <td className="py-2 px-4 border-b text-gray-700">
                                {promo.category_ids?.map(id => categories.find(c => c.id === id)?.name).join(", ") || "All"}
                            </td>
                            <td className="py-2 px-4 border-b text-gray-700">
                                <button onClick={() => handleDelete(promo.id)} className="text-red-600 hover:text-red-800">
                                    Delete
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}