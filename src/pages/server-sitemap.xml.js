import { getServerSideSitemap } from 'next-sitemap';

export async function GET() {
  // Fetch dynamic URLs (e.g., from your database or API)
  const products = await fetch('https://your-api.com/products').then((res) => res.json());
  const fields = products.map((product) => ({
    loc: `https://www.vianclothinghub.com.ng/products/${product.slug}`,
    lastmod: new Date().toISOString(),
    changefreq: 'weekly',
    priority: 0.7,
  }));

  // Add static pages
  fields.push(
    { loc: 'https://www.vianclothinghub.com.ng/', lastmod: new Date().toISOString(), changefreq: 'daily', priority: 1.0 },
    { loc: 'https://www.vianclothinghub.com.ng/shop', lastmod: new Date().toISOString(), changefreq: 'weekly', priority: 0.8 },
    { loc: 'https://www.vianclothinghub.com.ng/about', lastmod: new Date().toISOString(), changefreq: 'monthly', priority: 0.6 }
  );

  return getServerSideSitemap(fields);
}