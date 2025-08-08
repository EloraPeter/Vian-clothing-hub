import { getServerSideSitemap } from 'next-sitemap';

export async function GET() {
  // Static pages
  const staticPages = [
    {
      loc: 'https://www.vianclothinghub.com.ng/',
      lastmod: new Date().toISOString(),
      changefreq: 'daily',
      priority: 1.0,
    },
    {
      loc: 'https://www.vianclothinghub.com.ng/shop',
      lastmod: new Date().toISOString(),
      changefreq: 'weekly',
      priority: 0.8,
    },
    {
      loc: 'https://www.vianclothinghub.com.ng/about',
      lastmod: new Date().toISOString(),
      changefreq: 'monthly',
      priority: 0.6,
    },
    {
      loc: 'https://www.vianclothinghub.com.ng/auth',
      lastmod: new Date().toISOString(),
      changefreq: 'monthly',
      priority: 0.4,
    },
    {
      loc: 'https://www.vianclothinghub.com.ng/checkout',
      lastmod: new Date().toISOString(),
      changefreq: 'weekly',
      priority: 0.7,
    },
    {
      loc: 'https://www.vianclothinghub.com.ng/dashboard',
      lastmod: new Date().toISOString(),
      changefreq: 'weekly',
      priority: 0.6,
    },
    {
      loc: 'https://www.vianclothinghub.com.ng/orders',
      lastmod: new Date().toISOString(),
      changefreq: 'weekly',
      priority: 0.6,
    },
  ];

  // Dynamic pages (replace with your API or data source)
  let productFields = [];
  let orderFields = [];
  try {
    // Example: Fetch products and orders from your API
    const products = await fetch('https://your-api.com/products').then((res) => res.json()).catch(() => []);
    const orders = await fetch('https://your-api.com/orders').then((res) => res.json()).catch(() => []);

    productFields = products.map((product) => ({
      loc: `https://www.vianclothinghub.com.ng/products/${product.slug || product.id}`,
      lastmod: new Date().toISOString(),
      changefreq: 'weekly',
      priority: 0.7,
    }));

    orderFields = orders.map((order) => ({
      loc: `https://www.vianclothinghub.com.ng/order/${order.id}`,
      lastmod: new Date().toISOString(),
      changefreq: 'weekly',
      priority: 0.5,
    }));
  } catch (error) {
    console.error('Failed to fetch dynamic routes:', error);
  }

  // Combine static and dynamic pages
  const fields = [...staticPages, ...productFields, ...orderFields];

  return getServerSideSitemap(fields);
}