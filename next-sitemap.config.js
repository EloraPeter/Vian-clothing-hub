/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: 'https://www.vianclothinghub.com.ng',
  generateRobotsTxt: true, // Also generates robots.txt
  changefreq: 'daily',
  priority: 0.7,
  sitemapSize: 5000, // Split sitemap if >5000 URLs
  exclude: ['/server-sitemap.xml'], // Optional: exclude specific pages
  // Optional: Transform to customize entries
  transform: async (config, path) => {
    return {
      loc: path,
      changefreq: config.changefreq,
      priority: config.priority,
      lastmod: new Date().toISOString(),
    };
  },
};