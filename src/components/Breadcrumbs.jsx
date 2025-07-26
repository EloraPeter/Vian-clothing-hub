// components/Breadcrumbs.jsx
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function Breadcrumbs({ category, product }) {
  const [parentCategory, setParentCategory] = useState(null);
  const crumbs = [
    { name: 'Home', href: '/' },
    { name: 'Shop', href: '/shop' },
  ];

  // Fetch parent category if category has a parent_id
  useEffect(() => {
    async function fetchParentCategory() {
      if (category && category.parent_id && category.parent_id !== category.id) {
        const { data, error } = await supabase
          .from('categories')
          .select('id, name, slug')
          .eq('id', category.parent_id)
          .single();
        if (!error) {
          setParentCategory(data);
        }
      } else {
        setParentCategory(null); // Reset if no valid parent_id
      }
    }
    fetchParentCategory();
  }, [category]);

  // Add parent category to crumbs if it exists
  if (parentCategory) {
    crumbs.push({
      name: parentCategory.name,
      href: `/category/${parentCategory.slug}`,
    });
  }

  // Add current category
  if (category) {
    crumbs.push({ name: category.name, href: `/category/${category.slug}` });
  }

  // Add product if provided
  if (product) {
    crumbs.push({ name: product.name, href: null });
  }

  return (
    <nav className="flex mb-6" aria-label="Breadcrumb">
      <ol className="flex space-x-2 text-gray-600 font-playfair-display">
        {crumbs.map((crumb, i) => (
          <li key={i} className="flex items-center">
            {crumb.href ? (
              <Link href={crumb.href} className="text-purple-600 hover:text-purple-800">
                {crumb.name}
              </Link>
            ) : (
              <span className="text-gray-900">{crumb.name}</span>
            )}
            {i < crumbs.length - 1 && <span className="mx-2">&gt;</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}