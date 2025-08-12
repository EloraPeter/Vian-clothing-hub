import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { colorMap } from "@/lib/colorMap";

export default function VariantsModal({ product, variants, setVariants }) {
    const [variantData, setVariantData] = useState({
        product_id: product.id,
        size: "",
        color: "",
        stock_quantity: "",
        additional_price: "",
    });
    const [editVariantData, setEditVariantData] = useState(null);
    const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);

    const handleVariantChange = (e) => {
        const { name, value } = e.target;
        setVariantData((prev) => ({ ...prev, [name]: value }));
    };

    const handleVariantSubmit = async (e) => {
        e.preventDefault();

        // Validation
        if (!variantData.stock_quantity) {
            alert("Stock quantity is required.");
            return;
        }
        if (!variantData.size && !variantData.color) {
            alert("Provide at least one of size or color for variant uniqueness.");
            return;
        }

        // Prepare data with proper types
        const preparedData = {
            product_id: product.id,
            size: variantData.size || null,
            color: variantData.color || null,
            stock_quantity: Number(variantData.stock_quantity),
            additional_price: Number(variantData.additional_price) || 0,
        };

        const { error } = await supabase.from("product_variants").insert([preparedData]);

        if (error) {
            console.error("Error adding variant:", error.message);
            alert("Error adding variant: " + error.message);
            return;
        }

        setVariants((prev) => ({
            ...prev,
            [product.id]: [...(prev[product.id] || []), { ...preparedData, id: /* Fetch actual ID if needed */ }],
        }));
        setVariantData({
            product_id: product.id,
            size: "",
            color: "",
            stock_quantity: "",
            additional_price: "",
        });
        setIsVariantModalOpen(false);
    };

    const handleEditVariant = (variant) => {
        setEditVariantData(variant);
        setIsVariantModalOpen(true);
    };

    const handleEditVariantChange = (e) => {
        const { name, value } = e.target;
        setEditVariantData((prev) => ({ ...prev, [name]: value }));
    };

    const handleEditVariantSubmit = async (e) => {
        e.preventDefault();

        // Validation (optional for edit, but consistent)
        if (!editVariantData.stock_quantity) {
            alert("Stock quantity is required.");
            return;
        }
        if (!editVariantData.size && !editVariantData.color) {
            alert("Provide at least one of size or color for variant uniqueness.");
            return;
        }

        // Prepare data with proper types
        const preparedData = {
            ...editVariantData,
            size: editVariantData.size || null,
            color: editVariantData.color || null,
            stock_quantity: Number(editVariantData.stock_quantity),
            additional_price: Number(editVariantData.additional_price) || 0,
        };

        const { error } = await supabase
            .from("product_variants")
            .update(preparedData)
            .eq("id", editVariantData.id);

        if (error) {
            console.error("Error updating variant:", error.message);
            alert("Error updating variant: " + error.message);
            return;
        }

        setVariants((prev) => ({
            ...prev,
            [product.id]: prev[product.id].map((v) =>
                v.id === editVariantData.id ? preparedData : v
            ),
        }));
        setIsVariantModalOpen(false);
        setEditVariantData(null);
    };

    const handleDeleteVariant = async (id) => {
        if (!confirm("Are you sure you want to delete this variant?")) return;

        const { error } = await supabase.from("product_variants").delete().eq("id", id);
        if (error) {
            console.error("Error deleting variant:", error.message);
            alert("Error deleting variant: " + error.message);
            return;
        }

        setVariants((prev) => ({
            ...prev,
            [product.id]: prev[product.id].filter((v) => v.id !== id),
        }));
    };

    return (
        <>
            <button
                onClick={() => setIsVariantModalOpen(true)}
                className="text-green-600 hover:text-green-800 mr-4"
            >
                Add Variant
            </button>
            {variants[product.id]?.map((variant) => (
                <div key={variant.id} className="flex items-center space-x-2 mt-2">
                    <span className="text-sm text-gray-600">
                        {variant.size || "N/A"} / {variant.color || "N/A"} - Stock: {variant.stock_quantity} - +₦{variant.additional_price || 0}
                    </span>
                    <button
                        onClick={() => handleEditVariant(variant)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                        Edit
                    </button>
                    <button
                        onClick={() => handleDeleteVariant(variant.id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                    >
                        Delete
                    </button>
                </div>
            ))}

            {isVariantModalOpen && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md relative">
                        <button
                            onClick={() => {
                                setIsVariantModalOpen(false);
                                setEditVariantData(null);
                            }}
                            className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
                        >
                            ✕
                        </button>
                        <h2 className="text-xl font-semibold text-purple-800 mb-4">
                            {editVariantData ? "Edit Variant" : "Add Variant"}
                        </h2>
                        <form
                            onSubmit={editVariantData ? handleEditVariantSubmit : handleVariantSubmit}
                            className="space-y-4"
                        >
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Size (Optional)
                                </label>
                                <input
                                    type="text"
                                    name="size"
                                    value={
                                        editVariantData
                                            ? editVariantData.size || ""
                                            : variantData.size
                                    }
                                    onChange={
                                        editVariantData
                                            ? handleEditVariantChange
                                            : handleVariantChange
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                                    placeholder="e.g., S, M, L"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Color (Optional)
                                </label>
                                <select
                                    name="color"
                                    value={
                                        editVariantData
                                            ? editVariantData.color || ""
                                            : variantData.color
                                    }
                                    onChange={
                                        editVariantData
                                            ? handleEditVariantChange
                                            : handleVariantChange
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                                >
                                    <option value="">None</option>
                                    {Object.keys(colorMap).map((color) => (
                                        <option key={color} value={color}>
                                            {color}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Stock Quantity
                                </label>
                                <input
                                    type="number"
                                    name="stock_quantity"
                                    value={
                                        editVariantData
                                            ? editVariantData.stock_quantity
                                            : variantData.stock_quantity
                                    }
                                    onChange={
                                        editVariantData
                                            ? handleEditVariantChange
                                            : handleVariantChange
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                                    placeholder="Enter stock quantity"
                                    min="0"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Additional Price (₦)
                                </label>
                                <input
                                    type="number"
                                    name="additional_price"
                                    value={
                                        editVariantData
                                            ? editVariantData.additional_price
                                            : variantData.additional_price
                                    }
                                    onChange={
                                        editVariantData
                                            ? handleEditVariantChange
                                            : handleVariantChange
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                                    placeholder="0"
                                    min="0"
                                    step="0.01"
                                />
                            </div>
                            <p className="text-sm text-gray-500">
                                Provide at least one of size or color for variant uniqueness.
                            </p>
                            <div className="flex justify-between gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsVariantModalOpen(false);
                                        setEditVariantData(null);
                                    }}
                                    className="w-full py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 font-semibold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="w-full py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 font-semibold"
                                >
                                    {editVariantData ? "Update Variant" : "Add Variant"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}