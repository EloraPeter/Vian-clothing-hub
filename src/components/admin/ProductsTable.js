import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import VariantsModal from "./VariantsModal"; // Assuming VariantsModal.js is in the same directory
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function ProductsTable({ products, setProducts, categories, setCategories, variants, setVariants, itemsPerPage, currentProductPage, setCurrentProductPage }) {
    const [editProductData, setEditProductData] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [productPreviewUrl, setProductPreviewUrl] = useState(null);
    const [productUploading, setProductUploading] = useState(false);
    const [discountInputs, setDiscountInputs] = useState({});
    // New state for search term
    const [searchTerm, setSearchTerm] = useState("");

    const handleEditProductChange = (e) => {
        const { name, value, files, type, checked } = e.target;
        if (name === "imageFiles") {
            const fileList = Array.from(files);
            setEditProductData((prev) => ({
                ...prev,
                additionalImageFiles: fileList,
            }));
            setProductPreviewUrl(
                fileList.length > 0 ? URL.createObjectURL(fileList[0]) : null
            );
        } else if (type === "checkbox") {
            setEditProductData((prev) => ({ ...prev, [name]: checked }));
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
        if (
            !editProductData.name ||
            !editProductData.price ||
            !editProductData.description
        ) {
            toast.warning("Please fill in all required fields.");
            return;
        }

        setProductUploading(true);
        try {
            let categoryId = editProductData.category_id;

            if (!categories.some((cat) => cat.id === parseInt(categoryId))) {
                const newCategoryName = editProductData.category_id.trim();
                if (newCategoryName) {
                    const slug = newCategoryName
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, "-")
                        .replace(/(^-|-$)/g, "");

                    const { data: newCategory, error: categoryError } = await supabase
                        .from("categories")
                        .insert({
                            name: newCategoryName,
                            slug: slug,
                            parent_id: null,
                            created_at: new Date().toISOString(),
                        })
                        .select()
                        .single();

                    if (categoryError)
                        throw new Error("Failed to create new category: " + categoryError.message);

                    categoryId = newCategory.id;
                    setCategories((prev) => [...prev, newCategory]);
                } else {
                    categoryId = null;
                }
            }

            const imageUrls =
                editProductData.additionalImageFiles?.length > 0 ? [] : null;

            if (imageUrls) {
                for (const file of editProductData.additionalImageFiles) {
                    const fileExt = file.name.split(".").pop();
                    const fileName = `products/${Date.now()}_${Math.random()
                        .toString(36)
                        .substring(2, 15)}.${fileExt}`;
                    const { error: uploadError } = await supabase.storage
                        .from("products")
                        .upload(fileName, file);
                    if (uploadError)
                        throw new Error("Upload failed: " + uploadError.message);

                    const { data: urlData } = supabase.storage
                        .from("products")
                        .getPublicUrl(fileName);
                    imageUrls.push(urlData.publicUrl);
                }

                if (imageUrls.length > 0) {
                    await supabase.from("product_images").insert(
                        imageUrls.map((url) => ({
                            product_id: editProductData.id,
                            image_url: url,
                        }))
                    );
                }
            }

            const { error } = await supabase
                .from("products")
                .update({
                    name: editProductData.name,
                    price: parseFloat(editProductData.price),
                    description: editProductData.description,
                    category_id: categoryId || null,
                    is_new: editProductData.is_new,
                    is_out_of_stock: editProductData.is_out_of_stock,
                    is_on_sale: editProductData.is_on_sale,
                })
                .eq("id", editProductData.id);

            if (error) throw new Error("Update failed: " + error.message);

            setProducts((prev) =>
                prev.map((product) =>
                    product.id === editProductData.id
                        ? {
                            ...product,
                            name: editProductData.name,
                            price: parseFloat(editProductData.price),
                            description: editProductData.description,
                            category_id: categoryId,
                            categories: categories.find((c) => c.id === categoryId) || null,
                            is_new: editProductData.is_new,
                            is_out_of_stock: editProductData.is_out_of_stock,
                            is_on_sale: editProductData.is_on_sale,
                        }
                        : product
                )
            );

            setIsEditModalOpen(false);
            setEditProductData(null);
            setProductPreviewUrl(null);
            toast.success("Product updated successfully!");
        } catch (error) {
            toast.error(error.message);
        } finally {
            setProductUploading(false);
        }
    };

    const handleDeleteProduct = async (id) => {
        if (!confirm("Are you sure you want to delete this product?")) return;

        const { error } = await supabase.from("products").delete().eq("id", id);
        if (error) {
            console.error("Error deleting product:", error.message);
            toast.error("Error deleting product: " + error.message);
            return;
        }

        setProducts((prev) => prev.filter((p) => p.id !== id));
        delete variants[id];
        setVariants({ ...variants });

        toast.success("Product deleted successfully.");

    };

    const handleDiscountChange = (id, value) => {
        setDiscountInputs((prev) => ({ ...prev, [id]: value }));
    };

    const handleApplyDiscount = async (id) => {
        const discount = parseInt(discountInputs[id], 10);
        if (isNaN(discount) || discount < 0 || discount > 100) {
            toast.warning("Please enter a valid discount percentage (0-100).");
            return;
        }

        const { error } = await supabase
            .from("products")
            .update({ discount_percentage: discount })
            .eq("id", id);

        if (error) {
            console.error("Error applying discount:", error.message);
            toast.error("Error applying discount: " + error.message);
            return;
        }

        setProducts((prev) =>
            prev.map((p) => (p.id === id ? { ...p, discount_percentage: discount } : p))
        );
        setDiscountInputs((prev) => ({ ...prev, [id]: "" }));
        toast.success("Discount applied successfully!");
    };

    // Filter products based on search term (case-insensitive, checks multiple fields)
    const filteredProducts = products.filter((product) => {
      const term = searchTerm.toLowerCase();
      const tags = [];
      if (product.is_new) tags.push("new");
      if (product.is_out_of_stock) tags.push("out of stock");
      if (product.is_on_sale) tags.push("on sale");

      return (
        (product.name?.toLowerCase() || "").includes(term) || // Name
        product.price?.toString().includes(term) || // Price
        (product.categories?.name?.toLowerCase() || "").includes(term) || // Category
        product.discount_percentage?.toString().includes(term) || // Discount
        tags.some((tag) => tag.includes(term)) // Tags
        // Add ID if available, e.g.: product.id.toString().includes(term)
        // Add date if available, e.g.: new Date(product.created_at).toLocaleString().toLowerCase().includes(term)
      );
    });

    // Use filteredProducts for pagination instead of original products
    const indexOfLastProduct = currentProductPage * itemsPerPage;
    const indexOfFirstProduct = indexOfLastProduct - itemsPerPage;
    const currentProducts = filteredProducts.slice(indexOfFirstProduct, indexOfLastProduct);
    const totalProductPages = Math.ceil(filteredProducts.length / itemsPerPage);

    return (
        <>
            <ToastContainer />

            <section className="bg-white rounded-2xl shadow-lg p-6 mb-6">
                <h2 className="text-xl font-semibold text-purple-800 mb-4">Manage Products</h2>
                {/* New search bar */}
                <div className="mb-4">
                    <input
                        type="text"
                        placeholder="Search by name, category, price, discount, tags, etc."
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setCurrentProductPage(1); // Reset to page 1 on search
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                    />
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Image</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Discount (%)</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tags</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Variants</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {currentProducts.map((product) => (
                                <tr key={product.id}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {product.image_url ? (
                                            <img
                                                src={product.image_url}
                                                alt={product.name}
                                                className="w-16 h-16 object-cover rounded-md"
                                            />
                                        ) : (
                                            <span className="text-sm text-gray-500">No Image</span>
                                        )}
                                    </td>
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
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <div className="flex flex-wrap gap-2">
                                            {product.is_new && (
                                                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                                                    New
                                                </span>
                                            )}
                                            {product.is_out_of_stock && (
                                                <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
                                                    Out of Stock
                                                </span>
                                            )}
                                            {product.is_on_sale && (
                                                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                                                    On Sale
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        <VariantsModal product={product} variants={variants} setVariants={setVariants} />
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
                                        Product Tags
                                    </label>
                                    <div className="flex flex-col gap-2">
                                        <label className="flex items-center">
                                            <input
                                                type="checkbox"
                                                name="is_new"
                                                checked={editProductData?.is_new || false}
                                                onChange={handleEditProductChange}
                                                className="mr-2 h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                                            />
                                            <span className="text-sm text-gray-700">New</span>
                                        </label>
                                        <label className="flex items-center">
                                            <input
                                                type="checkbox"
                                                name="is_out_of_stock"
                                                checked={editProductData?.is_out_of_stock || false}
                                                onChange={handleEditProductChange}
                                                className="mr-2 h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                                            />
                                            <span className="text-sm text-gray-700">Out of Stock</span>
                                        </label>
                                        <label className="flex items-center">
                                            <input
                                                type="checkbox"
                                                name="is_on_sale"
                                                checked={editProductData?.is_on_sale || false}
                                                onChange={handleEditProductChange}
                                                className="mr-2 h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                                            />
                                            <span className="text-sm text-gray-700">On Sale</span>
                                        </label>
                                    </div>
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
                                        className={`w-full py-2 rounded-md font-semibold text-white transition-colors ${productUploading ? "bg-gray-400 cursor-not-allowed" : "bg-purple-600 hover:bg-purple-700"}`}
                                    >
                                        {productUploading ? "Updating..." : "Update Product"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </section>
        </>
    );
}