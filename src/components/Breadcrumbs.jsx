// components/Breadcrumbs.jsx
import Link from 'next/link';

export default function Breadcrumbs({ category, product }) {
  const crumbs = [
    { name: 'Home', href: '/' },
    { name: 'Shop', href: '/shop' },
  ];

  if (category) {
    crumbs.push({ name: category.name, href: `/category/${category.slug}` });
  }
  if (product) {
    crumbs.push({ name: product.name, href: null });
  }

  return (
    <nav className="flex mb-6" aria-label="Breadcrumb">
      <ol className="flex space-x-2 text-gray-600 font-playfair-display">
        {crumbs.map((crumb, i) => (
          <li key={i} className="flex items-center">
            {crumb.href ? (
              <Link href={crumb.href}>
                <a className="text-purple-600 hover:text-purple-800">{crumb.name}</a>
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