/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: 'https://www.vianclothinghub.com.ng',
  generateRobotsTxt: true,
  sitemapSize: 5000,
  exclude: ['/server-sitemap.xml', '/admin', '/login'], // Exclude dynamic sitemap and admin page
  robotsTxtOptions: {
    additionalSitemaps: [
      'https://www.vianclothinghub.com.ng/server-sitemap.xml', // Include dynamic sitemap
    ],
  },
  transform: async (config, path) => {
    return {
      loc: path,
      lastmod: new Date().toISOString(),
      changefreq: path === '/' ? 'daily' : 'weekly',
      priority: path === '/' ? 1.0 : 0.7,
    };
  },
};