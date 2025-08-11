import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AddProductForm({ products, setProducts, categories, setCategories }) {
  const [productData, setProductData] = useState({
    name: "",
    price: "",
    description: "",
    category_id: "",
    imageFiles: [],
  });
  const [productPreviewUrl, setProductPreviewUrl] = useState(null);
  const [productUploading, setProductUploading] = useState(false);

   const handleProductChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "imageFiles") {
      const fileList = Array.from(files);
      if (fileList.length > 0) {
        setProductData((prev) => ({ ...prev, imageFiles: fileList }));
        setProductPreviewUrl(URL.createObjectURL(fileList[0]));
      }
    } else {
      setProductData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleProductSubmit = async (e) => {
      e.preventDefault();
      if (
        !productData.name ||
        !productData.price ||
        !productData.description ||
        productData.imageFiles.length === 0
      ) {
        alert(
          "Please fill in all required fields and upload at least one image."
        );
        return;
      }
  
      setProductUploading(true);
      try {
        let categoryId = productData.category_id;
  
        if (!categories.some((cat) => cat.id === parseInt(categoryId))) {
          const newCategoryName = productData.category_id.trim();
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
              throw new Error(
                "Failed to create new category: " + categoryError.message
              );
  
            categoryId = newCategory.id;
            setCategories((prev) => [...prev, newCategory]);
          } else {
            categoryId = null;
          }
        }
  
        const imageUrls = [];
  
        for (const file of productData.imageFiles) {
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
  
        const { data: productInsert, error: insertError } = await supabase
          .from("products")
          .insert({
            name: productData.name,
            price: parseFloat(productData.price),
            description: productData.description,
            category_id: categoryId || null,
            image_url: imageUrls[0] || "",
            is_on_sale: false,
            discount_percentage: 0,
            is_out_of_stock: false,
            is_new: false,
          })
          .select()
          .single();
  
        if (insertError) throw new Error("Insert failed: " + insertError.message);
  
        if (imageUrls.length > 1) {
          await supabase.from("product_images").insert(
            imageUrls.slice(1).map((url) => ({
              product_id: productInsert.id,
              image_url: url,
            }))
          );
        }
  
        setProductData({
          name: "",
          price: "",
          description: "",
          category_id: "",
          imageFiles: [],
        });
        setProductPreviewUrl(null);
        setProducts((prev) => [productInsert, ...prev]);
        alert("Product added successfully!");
      } catch (error) {
        alert(error.message);
      } finally {
        setProductUploading(false);
      }
    };

  return (
    <section className="bg-white rounded-2xl shadow-lg p-6 mb-6">
      <h2 className="text-xl font-semibold text-purple-800 mb-4">Add Product</h2>
      <form onSubmit={handleProductSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
          <input
            type="text"
            name="name"
            value={productData.name}
            onChange={handleProductChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
            placeholder="Enter product name"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Price (₦)</label>
          <input
            type="number"
            name="price"
            value={productData.price}
            onChange={handleProductChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
            placeholder="0"
            min="0"
            step="0.01"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            name="description"
            value={productData.description}
            onChange={handleProductChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
            placeholder="Enter product description"
            rows="4"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <input
            list="category-options"
            name="category_id"
            value={productData.category_id}
            onChange={handleProductChange}
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
          <p className="text-sm text-gray-500 mt-1">Type a new category name to create it.</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Images</label>
          <input
            type="file"
            name="imageFiles"
            accept="image/*"
            multiple
            onChange={handleProductChange}
            className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-colors"
            disabled={productUploading}
          />
          {productData.imageFiles.length > 0 && (
            <div className="mt-3 flex gap-2 flex-wrap">
              {Array.from(productData.imageFiles).map((file, index) => (
                <img
                  key={index}
                  src={URL.createObjectURL(file)}
                  alt={`Preview ${index + 1}`}
                  className="w-24 h-24 object-cover rounded-md border border-gray-200"
                />
              ))}
            </div>
          )}
        </div>
        <button
          type="submit"
          disabled={productUploading}
          className={`w-full py-2 rounded-md font-semibold text-white transition-colors ${
            productUploading ? "bg-gray-400 cursor-not-allowed" : "bg-purple-600 hover:bg-purple-700"
          }`}
          aria-label="Add product"
        >
          {productUploading ? "Adding..." : "Add Product"}
        </button>
      </form>
    </section>
  );
}