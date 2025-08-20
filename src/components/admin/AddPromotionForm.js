import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "react-toastify";

export default function AddPromotionForm({ promotions, setPromotions, categories }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [discountPercentage, setDiscountPercentage] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [active, setActive] = useState(false);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState([]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { data, error } = await supabase.from("promotions").insert([
      {
        title,
        description,
        discount_percentage: parseFloat(discountPercentage),
        image_url: imageUrl,
        start_date: startDate,
        end_date: endDate,
        active,
        category_ids: selectedCategoryIds,
      },
    ]).select();

    if (error) {
      toast.error("Error adding promotion: " + error.message);
    } else {
      setPromotions([data[0], ...promotions]);
      toast.success("Promotion added successfully.");
      // Reset form
      setTitle("");
      setDescription("");
      setDiscountPercentage("");
      setImageUrl("");
      setStartDate("");
      setEndDate("");
      setActive(false);
      setSelectedCategoryIds([]);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-md mb-6">
      <h2 className="text-xl font-semibold text-purple-800 mb-4">Add New Promotion</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          className="p-2 text-black border border-gray-200 rounded-lg"
          required
        />
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description"
          className="p-2 border border-gray-200 rounded-lg"
        />
        <input
          type="number"
          value={discountPercentage}
          onChange={(e) => setDiscountPercentage(e.target.value)}
          placeholder="Discount Percentage"
          className="p-2 border border-gray-200 rounded-lg"
          required
        />
        <input
          type="text"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="Image URL"
          className="p-2 border border-gray-200 rounded-lg"
          required
        />
        <input
          type="datetime-local"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="p-2 border border-gray-200 rounded-lg"
          required
        />
        <input
          type="datetime-local"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="p-2 border border-gray-200 rounded-lg"
          required
        />
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="h-4 w-4 text-purple-600"
          />
          <label>Active</label>
        </div>
        <select
          multiple
          value={selectedCategoryIds}
          onChange={(e) => setSelectedCategoryIds(Array.from(e.target.selectedOptions, option => parseInt(option.value)))}
          className="p-2 border border-gray-200 rounded-lg"
        >
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </div>
      <button type="submit" className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
        Add Promotion
      </button>
    </form>
  );
}