import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "react-toastify";

export default function AddPromotionForm({ promotions, setPromotions, categories }) {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [discountPercentage, setDiscountPercentage] = useState("");
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [active, setActive] = useState(false);
    const [selectedCategoryIds, setSelectedCategoryIds] = useState([]);
    const [isUploading, setIsUploading] = useState(false);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                toast.error("Please select an image file");
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                toast.error("Image size must be less than 5MB");
                return;
            }
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsUploading(true);

        const discount = parseInt(discountPercentage, 10);
        if (isNaN(discount) || discount < 0 || discount > 100) {
            toast.error("Discount percentage must be an integer between 0 and 100");
            setIsUploading(false);
            return;
        }

        let imageUrl = "";
        if (imageFile) {
            const fileExt = imageFile.name.split('.').pop();
            const fileName = `${Date.now()}.${fileExt}`;
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('promotions')
                .upload(`images/${fileName}`, imageFile);

            if (uploadError) {
                toast.error("Error uploading image: " + uploadError.message);
                setIsUploading(false);
                return;
            }

            const { data: publicUrlData } = supabase.storage
                .from('promotions')
                .getPublicUrl(`images/${fileName}`);
            imageUrl = publicUrlData.publicUrl;
        }

        const { data: promoData, error: promoError } = await supabase.from("promotions").insert([
            {
                title,
                description,
                discount_percentage: discount,
                image_url: imageUrl,
                start_date: startDate,
                end_date: endDate,
                active,
            },
        ]).select();

        if (promoError) {
            toast.error("Error adding promotion: " + promoError.message);
            setIsUploading(false);
            return;
        }

        const newPromo = promoData[0];
        let categoryInsertError = null;

        if (selectedCategoryIds.length > 0) {
            const categoryInserts = selectedCategoryIds.map(category_id => ({
                promotion_id: newPromo.id,
                category_id,
            }));

            const { error: insertError } = await supabase.from("promotion_categories").insert(categoryInserts);

            if (insertError) {
                categoryInsertError = insertError;
                toast.error("Error adding promotion categories: " + insertError.message);
                // Optionally, delete the promotion if categories fail to insert
                await supabase.from("promotions").delete().eq("id", newPromo.id);
                setIsUploading(false);
                return;
            }
        }

        // Manually add category_ids to the new promo object for local state
        newPromo.category_ids = selectedCategoryIds;

        setPromotions([newPromo, ...promotions]);
        toast.success("Promotion added successfully.");

        // Reset form
        setTitle("");
        setDescription("");
        setDiscountPercentage("");
        setImageFile(null);
        setImagePreview(null);
        setStartDate("");
        setEndDate("");
        setActive(false);
        setSelectedCategoryIds([]);

        setIsUploading(false);
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-md mb-6">
            <h2 className="text-xl font-semibold text-purple-800 mb-6">Add New Promotion</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                        Promotion Title
                    </label>
                    <input
                        id="title"
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Enter promotion title"
                        className="w-full p-3 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 placeholder-gray-400"
                        required
                    />
                </div>

                <div className="space-y-2">
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                        Description
                    </label>
                    <input
                        id="description"
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Enter promotion description"
                        className="w-full text-black p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 placeholder-gray-400"
                    />
                </div>

                <div className="space-y-2">
                    <label htmlFor="discount" className="block text-sm font-medium text-gray-700">
                        Discount Percentage
                    </label>
                    <input
                        id="discount"
                        type="number"
                        value={discountPercentage}
                        onChange={(e) => setDiscountPercentage(e.target.value)}
                        placeholder="Enter discount percentage (e.g., 20)"
                        className="w-full p-3 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 placeholder-gray-400"
                        required
                        min="0"
                        max="100"
                        step="1"
                    />
                </div>

                <div className="space-y-2">
                    <label htmlFor="image" className="block text-sm font-medium text-gray-700">
                        Promotion Image
                    </label>
                    <input
                        id="image"
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="w-full text-black p-3 border border-gray-300 rounded-lg file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-purple-100 file:text-purple-800 hover:file:bg-purple-200"
                        required
                    />
                    {imagePreview && (
                        <div className="mt-2">
                            <img src={imagePreview} alt="Preview" className="h-32 w-auto rounded-lg object-cover" />
                        </div>
                    )}
                </div>

                <div className="space-y-2">
                    <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
                        Start Date
                    </label>
                    <input
                        id="startDate"
                        type="datetime-local"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full p-3 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 placeholder-gray-400"
                        required
                    />
                </div>

                <div className="space-y-2">
                    <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
                        End Date
                    </label>
                    <input
                        id="endDate"
                        type="datetime-local"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full text-black p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 placeholder-gray-400"
                        required
                    />
                </div>

                <div className="space-y-2">
                    <label className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={active}
                            onChange={(e) => setActive(e.target.checked)}
                            className="h-4 w-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                        />
                        <span className="text-sm font-medium text-gray-700">Active Promotion</span>
                    </label>
                </div>

                <div className="space-y-2">
                    <label
                        htmlFor="categories"
                        className="block text-sm font-medium text-gray-700"
                    >
                        Categories
                    </label>
                    <select
                        id="categories"
                        multiple
                        value={selectedCategoryIds}
                        onChange={(e) => {
                            const selectedValues = Array.from(
                                e.target.selectedOptions,
                                (option) => option.value
                            );

                            if (selectedValues.includes("all")) {
                                // Select all category IDs
                                setSelectedCategoryIds(categories.map((cat) => cat.id));
                            } else {
                                // Only selected categories
                                setSelectedCategoryIds(selectedValues.map((val) => parseInt(val)));
                            }
                        }}
                        className="w-full text-black p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    >
                        <option value="all">All</option>
                        {categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                                {cat.name}
                            </option>
                        ))}
                    </select>
                    <p className="text-xs text-gray-800">
                        Hold Ctrl/Cmd to select multiple categories
                    </p>
                </div>

            </div>

            <button
                type="submit"
                disabled={isUploading}
                className={`mt-6 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                {isUploading ? 'Uploading...' : 'Add Promotion'}
            </button>
        </form>
    );
}