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
      setProductData((prev) => ({ ...prev, [name]: Array.from(files) }));
      if (files[0]) {
        setProductPreviewUrl(URL.createObjectURL(files[0]));
      }
    } else {
      setProductData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    setProductUploading(true);

    let categoryId = productData.category_id;
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

    const { data: product, error: productError } = await supabase
      .from("products")
      .insert([
        {
          name: productData.name,
          price: parseFloat(productData.price),
          description: productData.description,
          category_id: categoryId === "none" ? null : categoryId,
        },
      ])
      .select()
      .single();

    if (productError) {
      console.error("Error adding product:", productError.message);
      alert("Error adding product: " + productError.message);
      setProductUploading(false);
      return;
    }

    const imageUrls = [];
    for (let i = 0; i < productData.imageFiles.length; i++) {
      const file = productData.imageFiles[i];
      const fileExt = file.name.split(".").pop();
      const fileName = `${product.id}-${i}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("product_images")
        .upload(filePath, file);

      if (uploadError) {
        console.error("Error uploading image:", uploadError.message);
        alert("Error uploading image: " + uploadError.message);
        continue;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("product_images")
        .getPublicUrl(filePath);

      const { error: insertError } = await supabase
        .from("product_images")
        .insert([{ product_id: product.id, image_url: publicUrl }]);

      if (insertError) {
        console.error("Error inserting image URL:", insertError.message);
      } else {
        imageUrls.push(publicUrl);
      }
    }

    setProducts((prev) => [{ ...product, imageUrls }, ...prev]);
    setProductData({
      name: "",
      price: "",
      description: "",
      category_id: "",
      imageFiles: [],
    });
    setProductPreviewUrl(null);
    setProductUploading(false);
    alert("Product added successfully!");
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