import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function ProductsTable({ products, setProducts, categories, setCategories, variants, setVariants, itemsPerPage, currentProductPage, setCurrentProductPage }) {
    const [editProductData, setEditProductData] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [productPreviewUrl, setProductPreviewUrl] = useState(null);
    const [productUploading, setProductUploading] = useState(false);
    const [discountInputs, setDiscountInputs] = useState({});

    const handleEditProductChange = (e) => {
        const { name, value, files } = e.target;
        if (name === "imageFiles") {
            setEditProductData((prev) => ({ ...prev, additionalImageFiles: Array.from(files) }));
            if (files[0]) {
                setProductPreviewUrl(URL.createObjectURL(files[0]));
            }
        } else {
            setEditProductData((prev) => ({ ...prev, [name]: value }));
        }
    };

    const handleEditProduct = (product) => {
        setEditProductData({ ...product, additionalImageFiles: [] });
        setIsEditModalOpen(true);
    };

    const handleEditProductSubmit = async (e) => {
        e.preventDefault();
        setProductUploading(true);

        let categoryId = editProductData.category_id;
        if (!categories.some((cat) => cat.id === categoryId || cat.name.toLowerCase() === categoryId.toLowerCase())) {
            const { data: newCategory, error: categoryError } = await supabase
                .from("categories")
                .insert([{ name: categoryId, slug: categoryId.toLowerCase().replace(/\s+/g, "-") }])
                .select()
                .single();

            if (categoryError) {
                console.error("Error creating category:", categoryError.message);
                alert("Error creating category: " + categoryError.message);
                setProductUploading(false);
                return;
            }
            categoryId = newCategory.id;
            setCategories((prev) => [...prev, newCategory]);
        } else if (!categories.some((cat) => cat.id === categoryId)) {
            const existingCategory = categories.find((cat) => cat.name.toLowerCase() === categoryId.toLowerCase());
            categoryId = existingCategory.id;
        }

        const { error: updateError } = await supabase
            .from("products")
            .update({
                name: editProductData.name,
                price: parseFloat(editProductData.price),
                description: editProductData.description,
                category_id: categoryId === "none" ? null : categoryId,
            })
            .eq("id", editProductData.id);

        if (updateError) {
            console.error("Error updating product:", updateError.message);
            alert("Error updating product: " + updateError.message);
            setProductUploading(false);
            return;
        }

        if (editProductData.additionalImageFiles?.length > 0) {
            for (let i = 0; i < editProductData.additionalImageFiles.length; i++) {
                const file = editProductData.additionalImageFiles[i];
                const fileExt = file.name.split(".").pop();
                const fileName = `${editProductData.id}-${Date.now()}-${i}.${fileExt}`;
                const filePath = `${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from("product_images")
                    .upload(filePath, file);

                if (uploadError) {
                    console.error("Error uploading additional image:", uploadError.message);
                    continue;
                }

                const { data: { publicUrl } } = supabase.storage
                    .from("product_images")
                    .getPublicUrl(filePath);

                const { error: insertError } = await supabase
                    .from("product_images")
                    .insert([{ product_id: editProductData.id, image_url: publicUrl }]);

                if (insertError) {
                    console.error("Error inserting additional image URL:", insertError.message);
                }
            }
        }

        setProducts((prev) =>
            prev.map((p) =>
                p.id === editProductData.id ? { ...p, ...editProductData } : p
            )
        );
        setIsEditModalOpen(false);
        setEditProductData(null);
        setProductPreviewUrl(null);
        setProductUploading(false);
        alert("Product updated successfully!");
    };

    const handleDeleteProduct = async (id) => {
        if (!confirm("Are you sure you want to delete this product?")) return;

        const { error } = await supabase.from("products").delete().eq("id", id);
        if (error) {
            console.error("Error deleting product:", error.message);
            alert("Error deleting product: " + error.message);
            return;
        }

        setProducts((prev) => prev.filter((p) => p.id !== id));
        delete variants[id];
        setVariants({ ...variants });
    };

    const handleDiscountChange = (id, value) => {
        setDiscountInputs((prev) => ({ ...prev, [id]: value }));
    };

    const handleApplyDiscount = async (id) => {
        const discount = parseInt(discountInputs[id], 10);
        if (isNaN(discount) || discount < 0 || discount > 100) {
            alert("Please enter a valid discount percentage (0-100).");
            return;
        }

        const { error } = await supabase
            .from("products")
            .update({ discount_percentage: discount })
            .eq("id", id);

        if (error) {
            console.error("Error applying discount:", error.message);
            alert("Error applying discount: " + error.message);
            return;
        }

        setProducts((prev) =>
            prev.map((p) => (p.id === id ? { ...p, discount_percentage: discount } : p))
        );
        setDiscountInputs((prev) => ({ ...prev, [id]: "" }));
        alert("Discount applied successfully!");
    };

    const indexOfLastProduct = currentProductPage * itemsPerPage;
    const indexOfFirstProduct = indexOfLastProduct - itemsPerPage;
    const currentProducts = products.slice(indexOfFirstProduct, indexOfLastProduct);
    const totalProductPages = Math.ceil(products.length / itemsPerPage);

    return (
        <section className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-purple-800 mb-4">Manage Products</h2>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Discount (%)</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {currentProducts.map((product) => (
                            <tr key={product.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{product.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">₦{Number(product.price).toLocaleString()}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {product.categories?.name || "None"}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="number"
                                            value={discountInputs[product.id] || ""}
                                            onChange={(e) => handleDiscountChange(product.id, e.target.value)}
                                            className="w-20 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                                            placeholder="0-100"
                                            min="0"
                                            max="100"
                                        />
                                        <button
                                            onClick={() => handleApplyDiscount(product.id)}
                                            className="px-2 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                                        >
                                            Apply
                                        </button>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1">Current: {product.discount_percentage || 0}%</p>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                    <button
                                        onClick={() => handleEditProduct(product)}
                                        className="text-blue-600 hover:text-blue-800 mr-4"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDeleteProduct(product.id)}
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
            <div className="mt-6 flex justify-center gap-3 items-center">
                <button
                    className="px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
                    onClick={() => setCurrentProductPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentProductPage === 1}
                >
                    Previous
                </button>
                <span className="text-gray-600">Page {currentProductPage} of {totalProductPages}</span>
                <button
                    className="px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
                    onClick={() => setCurrentProductPage((prev) => Math.min(prev + 1, totalProductPages))}
                    disabled={currentProductPage === totalProductPages}
                >
                    Next
                </button>
            </div>

            {isEditModalOpen && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md relative">
                        <button
                            onClick={() => {
                                setIsEditModalOpen(false);
                                setEditProductData(null);
                                setProductPreviewUrl(null);
                            }}
                            className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
                        >
                            ✕
                        </button>
                        <h2 className="text-xl font-semibold text-purple-800 mb-4">Edit Product</h2>
                        <form onSubmit={handleEditProductSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Product Name
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    value={editProductData?.name || ""}
                                    onChange={handleEditProductChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                                    placeholder="Enter product name"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Price (₦)
                                </label>
                                <input
                                    type="number"
                                    name="price"
                                    value={editProductData?.price || ""}
                                    onChange={handleEditProductChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                                    placeholder="0"
                                    min="0"
                                    step="0.01"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Description
                                </label>
                                <textarea
                                    name="description"
                                    value={editProductData?.description || ""}
                                    onChange={handleEditProductChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                                    placeholder="Enter product description"
                                    rows="4"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Category
                                </label>
                                <input
                                    list="category-options"
                                    name="category_id"
                                    value={editProductData?.category_id || ""}
                                    onChange={handleEditProductChange}
                                    placeholder="Type or select a category"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                                />
                                <datalist id="category-options">
                                    <option value="none">None</option>
                                    {categories.map((cat) => (
                                        <option key={cat.id} value={cat.id}>
                                            {cat.name}
                                        </option>
                                    ))}
                                </datalist>
                                <p className="text-sm text-gray-500 mt-1">
                                    Type a new category name to create it.
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Additional Images
                                </label>
                                <input
                                    type="file"
                                    name="imageFiles"
                                    accept="image/*"
                                    multiple
                                    onChange={handleEditProductChange}
                                    className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-colors"
                                    disabled={productUploading}
                                />
                                {editProductData?.additionalImageFiles?.length > 0 && (
                                    <div className="mt-3 flex gap-2 flex-wrap">
                                        {editProductData.additionalImageFiles.map(
                                            (file, index) => (
                                                <img
                                                    key={index}
                                                    src={URL.createObjectURL(file)}
                                                    alt={`Preview ${index + 1}`}
                                                    className="w-24 h-24 object-cover rounded-md border border-gray-200"
                                                />
                                            )
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="flex justify-between gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsEditModalOpen(false);
                                        setEditProductData(null);
                                        setProductPreviewUrl(null);
                                    }}
                                    className="w-full py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 font-semibold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={productUploading}
                                    className={`w-full py-2 rounded-md font-semibold text-white transition-colors ${productUploading ? "bg-gray-400 cursor-not-allowed" : "bg-purple-600 hover:bg-purple-700"
                                        }`}
                                >
                                    {productUploading ? "Updating..." : "Update Product"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </section>
    );
}